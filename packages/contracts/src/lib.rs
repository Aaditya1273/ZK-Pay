// ZK-PAY: Privacy Pool on Stellar
// 
// Module entry point — replaces Solidity's contract layout.
// Each module corresponds to a Solidity file:
//   lib.rs          → file structure (new)
//   PrivacyPool.rs  → PrivacyPool.sol + Entrypoint.sol + State.sol
//   proof_lib.rs    → ProofLib.sol
//   constants.rs    → Constants.sol
//   verifiers/      → WithdrawalVerifier.sol + CommitmentVerifier.sol

pub mod constants;
pub mod proof_lib;
pub mod privacy_pool;
pub mod verifiers;
