// contractConfig.js
// Configuration for 0G Newton Testnet (Galileo)

export const CHAIN_ID = `0x${parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "16602").toString(16)}`;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai";

// Contracts (Deployed on 0G Newton Testnet)
export const FOGCOIN_ADDRESS = process.env.NEXT_PUBLIC_FOGCOIN_ADDRESS || "0x6e768F3779e5B6082468719056E379b6535f51C599";
export const USER_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS || "0x43195F579aE215d5A90A2811A379B6535f51C599";

export const FOGCOIN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

export const USER_REGISTRY_ABI = [
  "function latestDialogueRootHash(address user) view returns (string)",
  "function isUserRegistered(address user) view returns (bool)",
  "function registerUser() external",
  "function updateDialogueRoot(string memory _rootHash) external"
];
