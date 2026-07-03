//! ZK-PAY: Privacy Pool on Stellar
//! 
//! MIGRATION: ProofLib.sol → ProofLib.rs
//! 
//! Groth16 proof structures for withdrawal and ragequit verification.
//! 
//! Public signal layout (identical to Solidity ProofLib.sol + circuit patch):
//!   WithdrawProof (10 signals):
//!     [0] newCommitmentHash: Hash of new commitment
//!     [1] existingNullifierHash: Hash of nullifier being spent
//!     [2] withdrawnValue: Amount being withdrawn
//!     [3] stateRoot: Current state root
//!     [4] stateTreeDepth: Current tree depth
//!     [5] ASPRoot: Latest ASP root
//!     [6] ASPTreeDepth: ASP tree depth
//!     [7] context: keccak256(withdrawal, scope) % SNARK_SCALAR_FIELD
//!     [8] allowlistRoot: UPGRADE A - compliance allowlist root
//!     [9] ciphertext: UPGRADE B - view key encrypted amount
//! 
//!   RagequitProof (4 signals):
//!     [0] commitmentHash: Hash of commitment being ragequit
//!     [1] nullifierHash: Nullifier hash
//!     [2] value: Commitment value
//!     [3] label: Commitment label
//! 
//! The Solidity memory layout used [pA, pB, pC, pubSignals].
//! The Rust layout uses the same structure for 1:1 compatibility.

use soroban_sdk::{BytesN, Env};

/// Groth16 proof structure — BN254 elliptic curve points
/// Identical to Solidity's [uint256[2] pA, uint256[2][2] pB, uint256[2] pC]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Groth16Proof {
    /// π_A: G1 point (2 field elements × 32 bytes)
    pub pi_a: [BytesN<32>; 2],
    /// π_B: G2 point (2×2 field elements × 32 bytes each)
    pub pi_b: [[BytesN<32>; 2]; 2],
    /// π_C: G1 point (2 field elements × 32 bytes)
    pub pi_c: [BytesN<32>; 2],
}

/// Withdrawal proof with 10 public signals.
/// Expanded from Solidity's 8 signals (UPGRADES A + B add 2 more).
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawProof {
    pub proof: Groth16Proof,
    pub pub_signals: [BytesN<32>; 10],
}

impl WithdrawProof {
    // Accessor methods — identical to Solidity ProofLib functions
    // Solidity: function newCommitmentHash(WithdrawProof memory _p) → pubSignals[0]
    pub fn new_commitment_hash(&self) -> &BytesN<32> { &self.pub_signals[0] }
    pub fn existing_nullifier_hash(&self) -> &BytesN<32> { &self.pub_signals[1] }
    pub fn withdrawn_value(&self) -> &BytesN<32> { &self.pub_signals[2] }
    pub fn state_root(&self) -> &BytesN<32> { &self.pub_signals[3] }
    pub fn state_tree_depth(&self) -> &BytesN<32> { &self.pub_signals[4] }
    pub fn asp_root(&self) -> &BytesN<32> { &self.pub_signals[5] }
    pub fn asp_tree_depth(&self) -> &BytesN<32> { &self.pub_signals[6] }
    pub fn context(&self) -> &BytesN<32> { &self.pub_signals[7] }
    pub fn allowlist_root(&self) -> &BytesN<32> { &self.pub_signals[8] }  // UPGRADE A
    pub fn ciphertext(&self) -> &BytesN<32> { &self.pub_signals[9] }       // UPGRADE B
}

/// Ragequit proof with 4 public signals.
/// Identical to Solidity RagequitProof struct.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RagequitProof {
    pub proof: Groth16Proof,
    pub pub_signals: [BytesN<32>; 4],
}

impl RagequitProof {
    // Solidity: function commitmentHash(RagequitProof memory _p) → pubSignals[0]
    pub fn commitment_hash(&self) -> &BytesN<32> { &self.pub_signals[0] }
    pub fn nullifier_hash(&self) -> &BytesN<32> { &self.pub_signals[1] }
    pub fn value(&self) -> &BytesN<32> { &self.pub_signals[2] }
    pub fn label(&self) -> &BytesN<32> { &self.pub_signals[3] }
}

/// Convert proof bytes from the circuit output into Soroban-compatible format.
/// This handles the big-endian to Soroban ScVal conversion.
pub fn proof_from_circuit(
    pi_a: &[u8; 64],
    pi_b: &[u8; 128],
    pi_c: &[u8; 64],
    pub_signals: &[u8; 320],   // 10 signals × 32 bytes
) -> WithdrawProof {
    let to_bytesn = |bytes: &[u8]| -> BytesN<32> {
        BytesN::from_array(&Env::default(), &std::array::TryFrom::try_from(bytes).unwrap())
    };
    
    WithdrawProof {
        proof: Groth16Proof {
            pi_a: [to_bytesn(&pi_a[0..32]), to_bytesn(&pi_a[32..64])],
            pi_b: [
                [to_bytesn(&pi_b[0..32]), to_bytesn(&pi_b[32..64])],
                [to_bytesn(&pi_b[64..96]), to_bytesn(&pi_b[96..128])],
            ],
            pi_c: [to_bytesn(&pi_c[0..32]), to_bytesn(&pi_c[32..64])],
        },
        pub_signals: {
            let mut signals: [BytesN<32>; 10] = Default::default();
            for i in 0..10 {
                signals[i] = to_bytesn(&pub_signals[i*32..(i+1)*32]);
            }
            signals
        },
    }
}
