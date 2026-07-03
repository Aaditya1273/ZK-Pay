//! ZK-PAY: Privacy Pool on Stellar
//! 
//! Migration: Constants.sol → Constants.rs
//! 
//! SNARK scalar field for BN254 curve — used for all field element validation
//! on both Stellar (via Protocol 25 host functions) and Ethereum.
//! 
//! USDC on Stellar uses 7 decimals (stroops). All amounts are in stroops.
//! 1 USDC = 1_000_000 stroops

/// BN254 SNARK scalar field modulus: 
/// 21888242871839275222246405745257275088548364400416034343698204186575808495617
pub const SNARK_SCALAR_FIELD: u128 = 21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617;

/// Native asset address on Ethereum (0xEeeE...)
/// On Stellar, this is NOT used — we use Soroban TokenClient for all assets.
/// Retained for cross-reference compatibility.
pub const NATIVE_ASSET_ETH: [u8; 20] = [0xEe; 20];

/// Maximum tree depth for Merkle inclusion proofs.
/// Determines circuit constraint count at compile time (R1CS).
/// Identical to Solidity MAX_TREE_DEPTH = 32
pub const MAX_TREE_DEPTH: u32 = 32;

/// Root history buffer size — sliding window for state root validation.
/// Identical to Solidity ROOT_HISTORY_SIZE = 64
pub const ROOT_HISTORY_SIZE: u32 = 64;

/// Maximum basis points (100% = 10_000 BPS)
pub const MAX_BPS: u32 = 10_000;

/// USDC decimal conversion: Stellar uses 7 decimals (stroops)
pub const STROOPS_PER_USDC: i128 = 1_000_000;
