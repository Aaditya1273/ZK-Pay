import { generateMasterKeys, generateDepositSecrets, getCommitment, generateMerkleProof, hashPrecommitment, bigintToHash } from "../dist/crypto.js";
import { calculateContextStellar } from "../dist/core/stellar-contracts.service.js";
import { createHash } from "crypto";

const CONTRACT_ID = "CDCVWBO245VZVYX45TZNTMOHZOIYUCURQM5SDZT2JA6L46T7NBUNFICN";
const ASSET_ADDR = "CAEPLVCK4VMA6HJDKYWBIAV7DE7EBQ6ZWUCEHQ22DEJHEPMNLFNX2YQ6";
const DEPLOYER = "GDA3OLN4HZETWCSIJV6OMOXDWDTMIUZWHKGSHSYNW36WDAHPVCHJ47LL";
const USER = "GATFXD3G53E5YNX3SJLXMXHSTE4QY2XHMOIC52YVZQVQICDTYUYUUQ55";

// Step 1: Get scope from contract
// Run: stellar contract invoke --id CDCVWBO245VZVYX45TZNTMOHZOIYUCURQM5SDZT2JA6L46T7NBUNFICN --source zkpay-deployer --network testnet -- scope
// The scope is printed by the CLI

// Step 2: Generate pool account
const mnemonic = "caught sort point canal ladder pitch fog essay glory regular panel resource deer border arctic recycle crisp horn pigeon certain photo century drop curious";
const keys = generateMasterKeys(mnemonic);
console.log("=== POOL ACCOUNT ===");
console.log("Master nullifier:", keys.masterNullifier.toString());
console.log("Master secret:", keys.masterSecret.toString());

// Step 3: Get scope from CLI output - we need to compute it
const CONTRACT_ID_BYTES = CONTRACT_ID.replace(/^C/, ""); // Remove C prefix
// Actually, scope = SHA256(contract_id_xdr || network_id_xdr || asset_xdr)
// Let's compute it using the same method as the contract
// contract_id in XDR is the hash prefix with contract type
const networkId = createHash("sha256").update("Test SDF Network ; September 2015").digest("hex");

// For now, just get scope from CLI
console.log("\n=== RUN THIS FIRST ===");
console.log(`stellar contract invoke --id ${CONTRACT_ID} --source zkpay-deployer --network testnet -- scope`);
console.log("Then paste the scope hex below and re-run this script\n");

// We'll use a placeholder scope - user must paste from CLI
let SCOPE_HEX = process.argv[2] || "";
if (!SCOPE_HEX) {
  console.error("Usage: node stellar-e2e.mjs <SCOPE_HEX>");
  process.exit(1);
}
SCOPE_HEX = SCOPE_HEX.replace(/"/g, "");
const scope = BigInt("0x" + SCOPE_HEX);
console.log("Scope:", scope.toString());

// Step 4: Generate deposit secrets (index=0 for first deposit)
const secrets = generateDepositSecrets(keys, scope, 0n);
console.log("\n=== DEPOSIT SECRETS ===");
console.log("Nullifier:", secrets.nullifier.toString());
console.log("Secret:", secrets.secret.toString());

// Step 5: Compute precommitment hash (Poseidon(nullifier, secret))
const precommitmentHash = hashPrecommitment(secrets.nullifier, secrets.secret);
console.log("Precommitment hash:", precommitmentHash.toString());

// Step 6: The label on-chain is SHA256(scope || nonce) where nonce=0 for first deposit
const scopeBuf = Buffer.from(scope.toString(16).padStart(64, "0"), "hex");
const nonceBuf = Buffer.alloc(8);
const labelInput = Buffer.concat([scopeBuf, nonceBuf]);
const onChainLabel = createHash("sha256").update(labelInput).digest("hex");
console.log("On-chain label (SHA256):", onChainLabel);

// The circuit label is different - it's just `label` as a field element
// For the circuit, the label is derived from SHA256(scope || nonce) mod SNARK_SCALAR_FIELD
const BLS12381_SCALAR = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;
const circuitLabel = BigInt("0x" + onChainLabel) % BLS12381_SCALAR;
console.log("Circuit label:", circuitLabel.toString());

// Step 7: Compute commitment (Poseidon-based, for merkle tree)
const commitment = getCommitment(
  BigInt("1000000000"), // value
  circuitLabel,
  secrets.nullifier,
  secrets.secret
);
console.log("\n=== COMMITMENT ===");
console.log("Poseidon commitment hash:", commitment.hash.toString());
console.log("Nullifier hash:", commitment.nullifierHash.toString());
console.log("Preimage value:", commitment.preimage.value.toString());
console.log("Preimage label:", commitment.preimage.label.toString());

// Step 8: Deposit precommitment hex for CLI (sha256 hex)
const precommitmentHex = bigintToHash(precommitmentHash).replace("0x", "");
console.log("\n=== FOR CLI DEPOSIT ===");
console.log(`stellar contract invoke \\
  --id ${CONTRACT_ID} \\
  --source-account zkpay-user \\
  --network testnet \\
  --send=yes --auto-sign \\
  -- \\
  deposit \\
  --depositor ${USER} \\
  --value 1000000000 \\
  --precommitment ${precommitmentHex}`);

// Step 9: Build merkle tree and compute root
console.log("\n=== AFTER DEPOSIT ===");
console.log("Building merkle tree with commitment leaf...");
const leaves = [commitment.hash];
const merkleProof = generateMerkleProof(leaves, commitment.hash);
const merkleRoot = merkleProof.root;
console.log("Merkle root:", merkleRoot.toString());
console.log("Merkle root hex:", bigintToHash(merkleRoot));
console.log("Leaf index:", merkleProof.index);
console.log("Siblings:", merkleProof.siblings.map(s => s.toString()));

// Step 10: Context calculation
const dataHex = Buffer.concat([
  Buffer.from(circuitLabel.toString(16).padStart(64, "0"), "hex"),  // label
  Buffer.from(commitment.nullifierHash.toString(16).padStart(64, "0"), "hex"),  // nullifierHash
  // value and other fields...
]).toString("hex");
const context = calculateContextStellar(USER, dataHex, SCOPE_HEX);
console.log("\n=== FOR SET ROOT ===");
console.log(`stellar contract invoke \\
  --id ${CONTRACT_ID} \\
  --source-account zkpay-deployer \\
  --network testnet \\
  --send=yes --auto-sign \\
  -- \\
  set_root \\
  --root ${bigintToHash(commitment.hash).replace("0x", "")}`);

console.log("\nContext for proof:", context.toString());
