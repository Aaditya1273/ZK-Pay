//! ZK-PAY: Privacy Pool on Stellar
//! 
//! MIGRATION: Entrypoint.sol + PrivacyPool.sol + State.sol → PrivacyPool.rs
//! 
//! On Stellar, we consolidate three Solidity contracts into one Soroban contract
//! because Soroban contracts call TokenClient directly (no Entrypoint abstraction).
//! 
//! CRYPTO (CAP-0059 — BLS12-381 available today on Stellar):
//!   env.crypto().bls12_381() — Groth16 verification
//!   env.crypto().sha256()    — SHA256 for scope/nonce/compute
//! 
//! Note: BN254 (CAP-0074) and Poseidon2 (CAP-0075) are NOT yet on Stellar.
//!       Merkle tree membership is proven INSIDE the SNARK, not on-chain.
//!       The contract only stores & compares state roots and nullifiers.
//!
//! Proof types are flattened into Soroban-compatible byte arrays:
//!   - G1 point = BytesN<96>   (uncompressed BLS12-381 G1)
//!   - G2 point = BytesN<192>  (uncompressed BLS12-381 G2)
//!   - Fr/field = BytesN<32>   (scalar field element)
//! 
//! The Verification Key is stored at deploy time and used in the full
//! Groth16 pairing check:
//!   e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) = 1
//!   where vk_x = IC[0] + Σ(pub_signals[i] · IC[i+1])

use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype,
    crypto::bls12_381::{Bls12381Fr, Bls12381G1Affine, Bls12381G2Affine},
    token::Client as TokenClient,
    xdr::ToXdr,
    vec, Address, Bytes, BytesN, Env, String, Vec,
};

use crate::constants::*;

// ─── Storage Keys ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    // === Immutable config (instance storage) ===
    Asset,
    Owner,
    Postman,
    Scope,
    // VK components stored as flat byte arrays
    VkAlpha,       // G1: BytesN<96>
    VkBeta,        // G2: BytesN<192>
    VkGamma,       // G2: BytesN<192>
    VkDelta,       // G2: BytesN<192>
    VkIcLen,       // u32: number of IC points
    VkIc(u32),     // G1: BytesN<96> each
    
    // === State (instance + persistent) ===
    Nonce,
    Dead,
    CurrentRootIndex,
    TreeDepth,
    TreeSize,
    
    // Root history (persistent, circular buffer)
    RootHistory(u32),
    
    // Precommitment dedup
    UsedPrecommitment(BytesN<32>),
    
    // Nullifier registry
    NullifierSpent(BytesN<32>),
    
    // Depositor label -> address
    Depositor(BytesN<32>),
    
    // ASP roots
    AssociationSets,
    
    // Allowlist root (UPGRADE A)
    AllowlistRoot,
    
    // Ciphertext for auditor view key (UPGRADE B)
    Ciphertext(BytesN<32>),
}

// ─── Types ──────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdrawal {
    pub processooor: Address,
    pub data: BytesN<64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssociationSetData {
    pub root: BytesN<32>,
    pub ipfs_cid: String,
    pub timestamp: u64,
}

/// Flattened Groth16 proof — byte arrays compatible with Soroban storage.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FlatGroth16Proof {
    pub a: BytesN<96>,      // G1
    pub b: BytesN<192>,     // G2
    pub c: BytesN<96>,      // G1
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FlatWithdrawProof {
    pub proof: FlatGroth16Proof,
    pub pub_signals: Vec<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FlatRagequitProof {
    pub proof: FlatGroth16Proof,
    pub pub_signals: Vec<BytesN<32>>,
}

/// Verification Key stored at deploy time (flat byte arrays)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FlatVerificationKey {
    pub alpha: BytesN<96>,     // G1
    pub beta: BytesN<192>,     // G2
    pub gamma: BytesN<192>,    // G2
    pub delta: BytesN<192>,    // G2
    pub ic: Vec<BytesN<96>>,   // G1 points
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PrivacyPoolError {
    InvalidProof = 1,
    InvalidCommitment = 2,
    InvalidProcessooor = 3,
    InvalidTreeDepth = 4,
    UnknownStateRoot = 5,
    IncorrectASPRoot = 6,
    NullifierAlreadySpent = 7,
    PoolNotFound = 8,
    PoolIsDead = 9,
    OnlyOriginalDepositor = 10,
    InvalidDepositValue = 11,
    PrecommitmentAlreadyUsed = 12,
    ZeroAddress = 13,
    ContextMismatch = 14,
    OnlyOwner = 15,
    OnlyPostman = 16,
    InvalidWithdrawalAmount = 17,
    MinimumDepositAmount = 18,
    RelayFeeGreaterThanMax = 19,
    InvalidFeeBPS = 20,
    EmptyRoot = 21,
    InvalidIPFSCIDLength = 22,
    NativeAssetNotAccepted = 23,
    AllowlistMismatch = 24,
    InvalidPubSignalCount = 25,
    MalformedVerifyingKey = 26,
    VkNotSet = 27,
}

// ─── Contract ───────────────────────────────────────────────────

#[contract]
pub struct PrivacyPool;

#[contractimpl]
impl PrivacyPool {
    
    // ══════════════════════════════════════════════════════════════
    //  INITIALIZATION
    // ══════════════════════════════════════════════════════════════
    
    pub fn __constructor(
        env: Env,
        asset: Address,
        vk: FlatVerificationKey,
        owner: Address,
        postman: Address,
    ) {
        // Compute SCOPE: SHA256(contract_id || network_id || asset)
        let contract_id = env.current_contract_address();
        let mut scope_input = Bytes::new(&env);
        scope_input.append(&contract_id.to_xdr(&env));
        scope_input.append(&env.ledger().network_id().to_xdr(&env));
        scope_input.append(&asset.clone().to_xdr(&env));
        let scope_hash: BytesN<32> = env.crypto().sha256(&scope_input).into();
        
        // Store config in instance storage
        env.storage().instance().set(&DataKey::Asset, &asset);
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Postman, &postman);
        env.storage().instance().set(&DataKey::Scope, &scope_hash);
        
        // Store Verification Key
        Self::_store_vk(&env, &vk);
        
        // Initialize state
        env.storage().instance().set(&DataKey::Nonce, &0u64);
        env.storage().instance().set(&DataKey::Dead, &false);
        env.storage().instance().set(&DataKey::CurrentRootIndex, &0u32);
        env.storage().instance().set(&DataKey::TreeDepth, &0u32);
        env.storage().instance().set(&DataKey::TreeSize, &0u64);
        
        env.storage().instance().extend_ttl(100, 518400);
    }
    
    // ══════════════════════════════════════════════════════════════
    //  DEPOSIT
    // ══════════════════════════════════════════════════════════════
    
    pub fn deposit(
        env: Env,
        depositor: Address,
        value: i128,
        precommitment: BytesN<32>,
    ) -> BytesN<32> {
        if env.storage().instance().get::<_, bool>(&DataKey::Dead).unwrap_or(false) {
            panic!("Pool is dead");
        }
        if value <= 0 {
            panic!("Invalid deposit value");
        }
        
        // Precommitment dedup
        if env.storage().persistent().has(&DataKey::UsedPrecommitment(precommitment.clone())) {
            panic!("Precommitment already used");
        }
        env.storage().persistent().set(&DataKey::UsedPrecommitment(precommitment.clone()), &true);
        env.storage().persistent().extend_ttl(&DataKey::UsedPrecommitment(precommitment.clone()), 100, 518400);
        
        // Pull USDC from depositor
        let asset: Address = env.storage().instance().get(&DataKey::Asset).unwrap();
        depositor.require_auth();
        let token = TokenClient::new(&env, &asset);
        token.transfer(&depositor, &env.current_contract_address(), &value);
        
        // Compute label: SHA256(scope || nonce)
        let nonce: u64 = env.storage().instance().get(&DataKey::Nonce).unwrap_or(0);
        let scope: BytesN<32> = env.storage().instance().get(&DataKey::Scope).unwrap();
        let mut label_input = Bytes::new(&env);
        label_input.append(&Bytes::from_array(&env, &scope.to_array()));
        label_input.append(&Bytes::from_array(&env, &nonce.to_be_bytes()));
        let label_hash: BytesN<32> = env.crypto().sha256(&label_input).into();
        
        // Compute commitment hash: SHA256(value || label || precommitment)
        let mut commit_input = Bytes::new(&env);
        commit_input.append(&Bytes::from_array(&env, &value.to_be_bytes()));
        commit_input.append(&Bytes::from_array(&env, &label_hash.to_array()));
        commit_input.append(&Bytes::from_array(&env, &precommitment.to_array()));
        let commitment_hash: BytesN<32> = env.crypto().sha256(&commit_input).into();
        
        // Store commitment (off-chain relayer will set the Poseidon-based root)
        Self::_store_commitment(&env, &commitment_hash);
        
        // Increment nonce
        env.storage().instance().set(&DataKey::Nonce, &(nonce + 1));
        
        // Store depositor mapping for ragequit
        env.storage().persistent().set(&DataKey::Depositor(label_hash.clone()), &depositor);
        env.storage().persistent().extend_ttl(&DataKey::Depositor(label_hash.clone()), 100, 518400);
        
        env.storage().instance().extend_ttl(100, 518400);
        
        // Emit event
        env.events().publish(("Deposited", depositor), (commitment_hash.clone(), label_hash, value));
        
        commitment_hash
    }
    
    // ══════════════════════════════════════════════════════════════
    //  WITHDRAW (ZK-private)
    // ══════════════════════════════════════════════════════════════
    
    pub fn withdraw(
        env: Env,
        withdrawal: Withdrawal,
        proof: FlatWithdrawProof,
    ) -> Result<(), PrivacyPoolError> {
        if proof.pub_signals.len() != 10 {
            return Err(PrivacyPoolError::InvalidPubSignalCount);
        }
        
        withdrawal.processooor.require_auth();
        
        // Validate context
        let scope: BytesN<32> = env.storage().instance().get(&DataKey::Scope).unwrap();
        let context = Self::_compute_context(&env, &withdrawal, &scope);
        if context != proof.pub_signals.get(7).unwrap() {
            return Err(PrivacyPoolError::ContextMismatch);
        }
        
        // Check tree depth bounds
        let state_tree_depth = Self::_bytes32_to_u32(&proof.pub_signals.get(4).unwrap());
        let asp_tree_depth = Self::_bytes32_to_u32(&proof.pub_signals.get(6).unwrap());
        if state_tree_depth > MAX_TREE_DEPTH || asp_tree_depth > MAX_TREE_DEPTH {
            return Err(PrivacyPoolError::InvalidTreeDepth);
        }
        
        // Check state root is known
        if !Self::_is_known_root(&env, &proof.pub_signals.get(3).unwrap()) {
            return Err(PrivacyPoolError::UnknownStateRoot);
        }
        
        // Check ASP root matches latest
        if proof.pub_signals.get(5).unwrap() != Self::_latest_asp_root_bytes(&env) {
            return Err(PrivacyPoolError::IncorrectASPRoot);
        }
        
        // Check allowlist root
        let stored_allowlist: BytesN<32> = env.storage()
            .instance()
            .get(&DataKey::AllowlistRoot)
            .unwrap_or(BytesN::from_array(&env, &[0u8; 32]));
        if proof.pub_signals.get(8).unwrap() != stored_allowlist {
            return Err(PrivacyPoolError::AllowlistMismatch);
        }
        
        // Full Groth16 verification with VK (first 8 signals from circuit)
        let mut circuit_signals: Vec<BytesN<32>> = Vec::new(&env);
        for i in 0..8 {
            circuit_signals.push_back(proof.pub_signals.get(i).unwrap());
        }
        if !Self::_verify_groth16_full(&env, &proof.proof, &circuit_signals) {
            return Err(PrivacyPoolError::InvalidProof);
        }
        
        // Mark nullifier as spent
        let nullifier_hash = proof.pub_signals.get(1).unwrap();
        if env.storage().persistent().has(&DataKey::NullifierSpent(nullifier_hash.clone())) {
            return Err(PrivacyPoolError::NullifierAlreadySpent);
        }
        env.storage().persistent().set(&DataKey::NullifierSpent(nullifier_hash.clone()), &true);
        env.storage().persistent().extend_ttl(&DataKey::NullifierSpent(nullifier_hash.clone()), 100, 518400);
        
        // Store new commitment (root already proven via SNARK, relayer will set next root)
        let new_commitment = proof.pub_signals.get(0).unwrap();
        Self::_store_commitment(&env, &new_commitment);
        
        // Transfer USDC
        let withdrawn_value = Self::_bytes32_to_u128(&proof.pub_signals.get(2).unwrap());
        if withdrawn_value == 0 {
            return Err(PrivacyPoolError::InvalidWithdrawalAmount);
        }
        let asset: Address = env.storage().instance().get(&DataKey::Asset).unwrap();
        TokenClient::new(&env, &asset).transfer(
            &env.current_contract_address(),
            &withdrawal.processooor,
            &(withdrawn_value as i128),
        );
        
        // Store ciphertext for auditor
        env.storage().persistent().set(
            &DataKey::Ciphertext(nullifier_hash.clone()),
            &proof.pub_signals.get(9).unwrap(),
        );
        
        env.storage().instance().extend_ttl(100, 518400);
        
        env.events().publish(("Withdrawn", withdrawal.processooor), withdrawn_value);
        
        Ok(())
    }
    
    // ══════════════════════════════════════════════════════════════
    //  RAGEQUIT
    // ══════════════════════════════════════════════════════════════
    
    pub fn ragequit(
        env: Env,
        proof: FlatRagequitProof,
    ) -> Result<(), PrivacyPoolError> {
        if proof.pub_signals.len() != 4 {
            return Err(PrivacyPoolError::InvalidPubSignalCount);
        }
        
        let label = proof.pub_signals.get(3).unwrap();
        let depositor: Address = env.storage()
            .persistent()
            .get(&DataKey::Depositor(label.clone()))
            .ok_or(PrivacyPoolError::OnlyOriginalDepositor)?;
        depositor.require_auth();
        
        // Full Groth16 verification with VK
        if !Self::_verify_groth16_full(&env, &proof.proof, &proof.pub_signals) {
            return Err(PrivacyPoolError::InvalidProof);
        }
        
        let nullifier_hash = proof.pub_signals.get(1).unwrap();
        if env.storage().persistent().has(&DataKey::NullifierSpent(nullifier_hash.clone())) {
            return Err(PrivacyPoolError::NullifierAlreadySpent);
        }
        env.storage().persistent().set(&DataKey::NullifierSpent(nullifier_hash.clone()), &true);
        env.storage().persistent().extend_ttl(&DataKey::NullifierSpent(nullifier_hash), 100, 518400);
        
        let value = Self::_bytes32_to_u128(&proof.pub_signals.get(2).unwrap());
        let asset: Address = env.storage().instance().get(&DataKey::Asset).unwrap();
        TokenClient::new(&env, &asset).transfer(&env.current_contract_address(), &depositor, &(value as i128));
        
        env.storage().instance().extend_ttl(100, 518400);
        env.events().publish(("Ragequit", depositor), value);
        
        Ok(())
    }
    
    // ══════════════════════════════════════════════════════════════
    //  ASP ROOT MANAGEMENT
    // ══════════════════════════════════════════════════════════════
    
    pub fn update_root(
        env: Env,
        root: BytesN<32>,
        ipfs_cid: String,
    ) -> Result<u32, PrivacyPoolError> {
        let postman: Address = env.storage().instance().get(&DataKey::Postman).unwrap();
        postman.require_auth();
        
        if root == BytesN::from_array(&env, &[0u8; 32]) {
            return Err(PrivacyPoolError::EmptyRoot);
        }
        let cid_len = ipfs_cid.len() as u32;
        if cid_len < 32 || cid_len > 64 {
            return Err(PrivacyPoolError::InvalidIPFSCIDLength);
        }
        
        let mut sets: Vec<AssociationSetData> = env.storage()
            .persistent()
            .get(&DataKey::AssociationSets)
            .unwrap_or(Vec::new(&env));
        
        sets.push_back(AssociationSetData {
            root: root.clone(),
            ipfs_cid,
            timestamp: env.ledger().timestamp(),
        });
        
        env.storage().persistent().set(&DataKey::AssociationSets, &sets);
        env.storage().persistent().extend_ttl(&DataKey::AssociationSets, 100, 518400);
        let index = sets.len() as u32 - 1;
        env.events().publish(("RootUpdated",), (root, env.ledger().timestamp()));
        
        Ok(index)
    }
    
    pub fn update_allowlist_root(env: Env, root: BytesN<32>) -> Result<(), PrivacyPoolError> {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        env.storage().instance().set(&DataKey::AllowlistRoot, &root);
        env.storage().instance().extend_ttl(100, 518400);
        Ok(())
    }
    
    // ══════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════
    
    pub fn latest_root(env: Env) -> BytesN<32> {
        let root_index: u32 = env.storage().instance().get(&DataKey::CurrentRootIndex).unwrap_or(0);
        if root_index == 0 { return BytesN::from_array(&env, &[0u8; 32]); }
        env.storage().persistent()
            .get(&DataKey::RootHistory(root_index))
            .unwrap_or(BytesN::from_array(&env, &[0u8; 32]))
    }
    
    pub fn current_tree_depth(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TreeDepth).unwrap_or(0)
    }
    
    pub fn current_tree_size(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TreeSize).unwrap_or(0)
    }
    
    pub fn is_nullifier_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::NullifierSpent(nullifier_hash))
    }
    
    pub fn scope(env: Env) -> BytesN<32> {
        env.storage().instance().get(&DataKey::Scope).unwrap()
    }
    
    pub fn asset(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Asset).unwrap()
    }
    
    // ══════════════════════════════════════════════════════════════
    //  INTERNAL: State Management
    // ══════════════════════════════════════════════════════════════
    //
    // CRITICAL: On-chain storage uses SHA256, but the ZK circuit uses Poseidon.
    // We cannot compute Merkle roots on-chain because they won't match the circuit.
    // Instead:
    //   1. _store_commitment stores the leaf commitment (no root computation)
    //   2. set_root is called by the off-chain relayer to register the Poseidon-based root
    //   3. _is_known_root checks roots that were set via set_root
    
    fn _store_commitment(env: &Env, leaf: &BytesN<32>) {
        let size: u64 = env.storage().instance().get(&DataKey::TreeSize).unwrap_or(0);
        let depth: u32 = env.storage().instance().get(&DataKey::TreeDepth).unwrap_or(0);
        
        // Update depth based on new size
        if size > 0 {
            let new_depth = (64 - (size + 1).leading_zeros()).max(1);
            if new_depth > depth {
                env.storage().instance().set(&DataKey::TreeDepth, &new_depth);
            }
        } else {
            env.storage().instance().set(&DataKey::TreeDepth, &1u32);
        }
        
        env.storage().instance().set(&DataKey::TreeSize, &(size + 1));
        env.storage().instance().extend_ttl(100, 518400);
        
        // The Merkle root is NOT computed on-chain (SHA256 vs Poseidon mismatch).
        // The off-chain relayer computes the correct Poseidon-based root
        // and registers it via set_root().
        env.events().publish(("LeafStored",), (size + 1, leaf.clone()));
    }
    
    /// Register a Poseidon-based Merkle root (called by off-chain relayer after computing it).
    /// This is the root that the ZK circuit proves membership against.
    pub fn set_root(env: Env, root: BytesN<32>) -> Result<(), PrivacyPoolError> {
        // Only postman can set roots
        let postman: Address = env.storage().instance().get(&DataKey::Postman).unwrap();
        postman.require_auth();
        
        if root == BytesN::from_array(&env, &[0u8; 32]) {
            return Err(PrivacyPoolError::EmptyRoot);
        }
        
        // Store in root history circular buffer
        let root_index: u32 = env.storage().instance().get(&DataKey::CurrentRootIndex).unwrap_or(0);
        let next_index = (root_index + 1) % ROOT_HISTORY_SIZE;
        env.storage().persistent().set(&DataKey::RootHistory(next_index), &root);
        env.storage().persistent().extend_ttl(&DataKey::RootHistory(next_index), 100, 518400);
        env.storage().instance().set(&DataKey::CurrentRootIndex, &next_index);
        
        env.storage().instance().extend_ttl(100, 518400);
        env.events().publish(("RootSet",), (root,));
        
        Ok(())
    }
    
    fn _is_known_root(env: &Env, root: &BytesN<32>) -> bool {
        let root_index: u32 = env.storage().instance().get(&DataKey::CurrentRootIndex).unwrap_or(0);
        for i in 0..ROOT_HISTORY_SIZE {
            let idx = (root_index + ROOT_HISTORY_SIZE - i) % ROOT_HISTORY_SIZE;
            if let Some(stored) = env.storage().persistent().get::<_, BytesN<32>>(&DataKey::RootHistory(idx)) {
                if &stored == root { return true; }
            }
        }
        false
    }
    
    fn _latest_asp_root_bytes(env: &Env) -> BytesN<32> {
        let sets: Vec<AssociationSetData> = env.storage()
            .persistent()
            .get(&DataKey::AssociationSets)
            .unwrap_or(Vec::new(env));
        if sets.is_empty() { return BytesN::from_array(env, &[0u8; 32]); }
        sets.get(sets.len() - 1).unwrap().root
    }
    
    fn _compute_context(env: &Env, withdrawal: &Withdrawal, scope: &BytesN<32>) -> BytesN<32> {
        // SHA256(data || scope)
        let mut input = Bytes::new(env);
        input.append(&Bytes::from_array(env, &withdrawal.data.to_array()));
        input.append(&Bytes::from_array(env, &scope.to_array()));
        let hash: BytesN<32> = env.crypto().sha256(&input).into();
        // Reduce modulo BLS12-381 scalar field so that it fits as a circuit field element
        let r: BytesN<32> = BytesN::from_array(env, &[
            0x73, 0xed, 0xa7, 0x53, 0x29, 0x9d, 0x7d, 0x48,
            0x33, 0x39, 0xd8, 0x08, 0x09, 0xa1, 0xd8, 0x05,
            0x53, 0xbd, 0xa4, 0x02, 0xff, 0xfe, 0x5b, 0xfe,
            0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01,
        ]);
        Self::_reduce_bls_field(env, hash, r)
    }
    
    fn _reduce_bls_field(env: &Env, a: BytesN<32>, r: BytesN<32>) -> BytesN<32> {
        // Compare a >= r by iterating bytes
        let a_arr = a.to_array();
        let r_arr = r.to_array();
        for i in 0..32 {
            if a_arr[i] > r_arr[i] {
                return Self::_bytes_sub(env, a_arr, r_arr);
            }
            if a_arr[i] < r_arr[i] { return a; }
        }
        BytesN::from_array(env, &[0u8; 32])
    }
    
    fn _bytes_sub(env: &Env, a: [u8; 32], b: [u8; 32]) -> BytesN<32> {
        let mut result = [0u8; 32];
        let mut borrow: i32 = 0;
        for i in (0..32).rev() {
            let diff: i32 = a[i] as i32 - b[i] as i32 - borrow;
            if diff < 0 {
                result[i] = (diff + 256) as u8;
                borrow = 1;
            } else {
                result[i] = diff as u8;
                borrow = 0;
            }
        }
        BytesN::from_array(env, &result)
    }
    
    // ══════════════════════════════════════════════════════════════
    //  VK STORAGE
    // ══════════════════════════════════════════════════════════════
    
    fn _store_vk(env: &Env, vk: &FlatVerificationKey) {
        env.storage().instance().set(&DataKey::VkAlpha, &vk.alpha);
        env.storage().instance().set(&DataKey::VkBeta, &vk.beta);
        env.storage().instance().set(&DataKey::VkGamma, &vk.gamma);
        env.storage().instance().set(&DataKey::VkDelta, &vk.delta);
        env.storage().instance().set(&DataKey::VkIcLen, &(vk.ic.len() as u32));
        for (i, ic_point) in vk.ic.iter().enumerate() {
            env.storage().instance().set(&DataKey::VkIc(i as u32), &ic_point);
        }
    }
    
    fn _load_vk_ic(env: &Env, index: u32) -> Option<BytesN<96>> {
        env.storage().instance().get(&DataKey::VkIc(index))
    }
    
    // ══════════════════════════════════════════════════════════════
    //  FULL Groth16 Verification (BLS12-381)
    // ══════════════════════════════════════════════════════════════
    //
    //  Equation: e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) = 1
    //  where vk_x = IC[0] + Σ(pub_signals[i] * IC[i+1])
    //
    //  This is the STANDARD Groth16 verification equation.
    //  The VK is loaded from storage where it was set at deploy time.
    
    fn _verify_groth16_full(
        env: &Env,
        proof: &FlatGroth16Proof,
        pub_signals: &Vec<BytesN<32>>,
    ) -> bool {
        // Load VK components
        let vk_alpha: BytesN<96> = match env.storage().instance().get(&DataKey::VkAlpha) {
            Some(v) => v,
            None => return false,
        };
        let vk_beta: BytesN<192> = match env.storage().instance().get(&DataKey::VkBeta) {
            Some(v) => v,
            None => return false,
        };
        let vk_gamma: BytesN<192> = match env.storage().instance().get(&DataKey::VkGamma) {
            Some(v) => v,
            None => return false,
        };
        let vk_delta: BytesN<192> = match env.storage().instance().get(&DataKey::VkDelta) {
            Some(v) => v,
            None => return false,
        };
        let vk_ic_len: u32 = env.storage().instance().get(&DataKey::VkIcLen).unwrap_or(0);
        
        // Validate pub_signals count matches VK
        // VK needs IC[0..n] where n = pub_signals.len()
        if vk_ic_len != pub_signals.len() as u32 + 1 {
            return false;
        }
        
        // Load IC[0]
        let ic0: BytesN<96> = match Self::_load_vk_ic(env, 0) {
            Some(v) => v,
            None => return false,
        };
        
        // Reconstruct BLS12-381 types from flat byte arrays
        let a = Bls12381G1Affine::from_bytes(proof.a.clone());
        let b = Bls12381G2Affine::from_bytes(proof.b.clone());
        let c = Bls12381G1Affine::from_bytes(proof.c.clone());
        let alpha = Bls12381G1Affine::from_bytes(vk_alpha);
        let beta = Bls12381G2Affine::from_bytes(vk_beta);
        let gamma = Bls12381G2Affine::from_bytes(vk_gamma);
        let delta = Bls12381G2Affine::from_bytes(vk_delta);
        
        let bls = env.crypto().bls12_381();
        
        // Compute vk_x = IC[0] + Σ(pub_signals[i] * IC[i+1])
        let mut vk_x = Bls12381G1Affine::from_bytes(ic0);
        
        for i in 0..pub_signals.len() {
            let ic_point = match Self::_load_vk_ic(env, i as u32 + 1) {
                Some(v) => v,
                None => return false,
            };
            let signal_bn = pub_signals.get(i).unwrap();
            let fr = Bls12381Fr::from_bytes(signal_bn);
            let ic_g1 = Bls12381G1Affine::from_bytes(ic_point);
            let prod = bls.g1_mul(&ic_g1, &fr);
            vk_x = bls.g1_add(&vk_x, &prod);
        }
        
        // Full pairing check:
        // e(-A, B) · e(α, β) · e(vk_x, γ) · e(C, δ) = 1
        let neg_a = -a;
        let vp1 = vec![env, neg_a, alpha, vk_x, c];
        let vp2 = vec![env, b, beta, gamma, delta];
        
        bls.pairing_check(vp1, vp2)
    }
    
    // ══════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════
    
    fn _bytes32_to_u128(bytes: &BytesN<32>) -> u128 {
        let arr = bytes.to_array();
        let mut buf = [0u8; 16];
        buf.copy_from_slice(&arr[16..32]);
        u128::from_be_bytes(buf)
    }
    
    fn _bytes32_to_u32(bytes: &BytesN<32>) -> u32 {
        let arr = bytes.to_array();
        let mut buf = [0u8; 4];
        buf.copy_from_slice(&arr[28..32]);
        u32::from_be_bytes(buf)
    }
}

// ════════════════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::StellarAssetClient,
        vec, Address, BytesN, Env, String,
    };
    
    fn make_empty_vk(env: &Env) -> FlatVerificationKey {
        FlatVerificationKey {
            alpha: BytesN::from_array(env, &[0u8; 96]),
            beta: BytesN::from_array(env, &[0u8; 192]),
            gamma: BytesN::from_array(env, &[0u8; 192]),
            delta: BytesN::from_array(env, &[0u8; 192]),
            ic: vec![env, BytesN::from_array(env, &[0u8; 96])],
        }
    }
    
    fn setup_test_env() -> (Env, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        
        // Register a Stellar Asset Contract
        let admin = Address::generate(&env);
        let asset = env.register_stellar_asset_contract(admin);
        
        let owner = Address::generate(&env);
        let postman = Address::generate(&env);
        let vk = make_empty_vk(&env);
        
        let contract_id = env.register(
            PrivacyPool,
            (asset.clone(), vk, owner, postman),
        );
        
        (env, contract_id, asset)
    }
    
    /// Helper to mint tokens to a user via StellarAssetClient
    fn mint_tokens(env: &Env, asset: &Address, to: &Address, amount: i128) {
        let sac = StellarAssetClient::new(env, asset);
        sac.mint(to, &amount);
    }
    
    #[test]
    fn test_constructor() {
        let (env, contract_id, _asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        assert_eq!(client.current_tree_depth(), 0);
        assert_eq!(client.current_tree_size(), 0);
    }
    
    #[test]
    fn test_deposit_basic() {
        let (env, contract_id, asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        let depositor = Address::generate(&env);
        let precommitment = BytesN::from_array(&env, &[1u8; 32]);
        
        mint_tokens(&env, &asset, &depositor, 100_000_000);
        client.deposit(&depositor, &100_000_000, &precommitment);
        
        assert_eq!(client.current_tree_size(), 1);
        assert_eq!(client.current_tree_depth(), 1);
    }
    
    #[test]
    fn test_deposit_rejects_zero_value() {
        let (env, contract_id, _asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        let depositor = Address::generate(&env);
        
        // Use try_deposit to catch the expected panic
        let result = client.try_deposit(&depositor, &0, &BytesN::from_array(&env, &[1u8; 32]));
        assert!(result.is_err());
    }
    
    #[test]
    fn test_deposit_rejects_duplicate_precommitment() {
        let (env, contract_id, asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        let depositor = Address::generate(&env);
        let precommitment = BytesN::from_array(&env, &[1u8; 32]);
        
        mint_tokens(&env, &asset, &depositor, 200_000_000);
        
        client.deposit(&depositor, &100_000_000, &precommitment);
        
        // Use try_deposit to catch the expected panic
        let result = client.try_deposit(&depositor, &50_000_000, &precommitment);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_update_root() {
        let (env, contract_id, _asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        
        let root = BytesN::from_array(&env, &[2u8; 32]);
        let cid = String::from_str(&env, "QmTest1234567890123456789012345678901234567890");
        let index = client.update_root(&root, &cid);
        assert_eq!(index, 0);
    }
    
    #[test]
    fn test_is_nullifier_spent() {
        let (env, contract_id, _asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        let nullifier = BytesN::from_array(&env, &[4u8; 32]);
        assert!(!client.is_nullifier_spent(&nullifier));
    }
    
    #[test]
    fn test_set_root_after_deposit() {
        let (env, contract_id, asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        let depositor = Address::generate(&env);
        
        mint_tokens(&env, &asset, &depositor, 100_000_000);
        client.deposit(&depositor, &100_000_000, &BytesN::from_array(&env, &[5u8; 32]));
        
        // After deposit, the relayer computes the Poseidon root off-chain
        // and registers it via set_root()
        let computed_root = BytesN::from_array(&env, &[42u8; 32]);
        client.set_root(&computed_root);
        
        assert_eq!(client.latest_root(), computed_root);
        assert_eq!(client.current_tree_size(), 1);
    }
    
    #[test]
    fn test_withdraw_rejects_invalid_pub_signal_count() {
        let (env, contract_id, _asset) = setup_test_env();
        let client = PrivacyPoolClient::new(&env, &contract_id);
        
        let processooor = Address::generate(&env);
        let withdrawal = Withdrawal {
            processooor,
            data: BytesN::from_array(&env, &[0u8; 64]),
        };
        let proof = FlatWithdrawProof {
            proof: FlatGroth16Proof {
                a: BytesN::from_array(&env, &[0u8; 96]),
                b: BytesN::from_array(&env, &[0u8; 192]),
                c: BytesN::from_array(&env, &[0u8; 96]),
            },
            pub_signals: Vec::new(&env),
        };
        
        let result = client.try_withdraw(&withdrawal, &proof);
        assert!(result.is_err());
    }
}
