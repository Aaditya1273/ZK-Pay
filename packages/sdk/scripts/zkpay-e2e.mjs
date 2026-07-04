import poseidon_bls from "../../circuits/scripts/poseidon_bls.mjs";
import { LeanIMT } from "@zk-kit/lean-imt";
import { createHash, randomBytes } from "crypto";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJ = join(__dirname, "..");
const BLS_SCALAR_FIELD = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;

const CONFIG = {
  contractId: "CAYDGB7SLRONSTM4G562HEGPECFJNQKGRTSY4ZUJPGFX33HOUNAEX5LW",
  assetId: "CAEPLVCK4VMA6HJDKYWBIAV7DE7EBQ6ZWUCEHQ22DEJHEPMNLFNX2YQ6",
  deployerKey: "zkpay-deployer",
  userKey: "zkpay-user",
  userAddr: "GATFXD3G53E5YNX3SJLXMXHSTE4QY2XHMOIC52YVZQVQICDTYUYUUQ55",
  deployerAddr: "GDA3OLN4HZETWCSIJV6OMOXDWDTMIUZWHKGSHSYNW36WDAHPVCHJ47LL",
  network: "testnet",
  maxDepth: 32,
};

function bigintToHex(v, bytes = 32) {
  return v.toString(16).padStart(bytes * 2, "0");
}

function hexToBuf(h) {
  return Buffer.from(h.replace(/^0x/, ""), "hex");
}

async function cli(...args) {
  const cmd = "stellar " + args.join(" ");
  console.log("  $", cmd);
  try {
    const out = execSync(cmd, { cwd: PROJ, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
      .split("\n")
      .filter(l => !l.includes("⚠️") && !l.includes("ℹ️") && !l.startsWith("Run `"))
      .join("\n")
      .trim();
    return out;
  } catch (e) {
    console.error("CLI Error:", e.message);
    return null;
  }
}

async function cmdGenDeposit() {
  console.log("\n🔷 Generating deposit parameters...");

  const scopeHex = await cli("contract", "invoke", "--id", CONFIG.contractId,
    "--source", CONFIG.deployerKey, "--network", CONFIG.network,
    "--", "scope");
  const scope = BigInt("0x" + scopeHex.replace(/"/g, ""));
  console.log("  Scope:", scopeHex);

  const nullifier = BigInt("0x" + randomBytes(31).toString("hex"));
  const secret = BigInt("0x" + randomBytes(31).toString("hex"));
  console.log("  Nullifier:", nullifier.toString());
  console.log("  Secret:", secret.toString());

  const precommitment = poseidon_bls([nullifier, secret]);
  console.log("  Precommitment:", precommitment.toString());

  const nonce = 0n;
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64BE(nonce);
  const scopeBuf = hexToBuf(scopeHex.replace(/"/g, ""));
  const labelBuf = createHash("sha256").update(Buffer.concat([scopeBuf, nonceBuf])).digest();
  const labelField = BigInt("0x" + labelBuf.toString("hex")) % BLS_SCALAR_FIELD;
  console.log("  Label field:", labelField.toString());

  const value = 1000000000n;
  const commitment = poseidon_bls([value, labelField, precommitment]);
  console.log("  Commitment:", commitment.toString());
  console.log("  Commitment hex:", bigintToHex(commitment));

  const nullifierHash = poseidon_bls([nullifier]);
  console.log("  NullifierHash:", nullifierHash.toString());

  const precommitmentHex = bigintToHex(precommitment);
  console.log("\n📋 Deposit params:", JSON.stringify({
    value: value.toString(),
    precommitmentHex,
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    labelField: labelField.toString(),
    commitment: commitment.toString(),
    nullifierHash: nullifierHash.toString(),
    scopeHex: scopeHex.replace(/"/g, ""),
  }, null, 2));

  const state = {
    scopeHex: scopeHex.replace(/"/g, ""),
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    precommitment: precommitment.toString(),
    labelField: labelField.toString(),
    commitment: commitment.toString(),
    nullifierHash: nullifierHash.toString(),
    value: value.toString(),
    nonce: nonce.toString(),
    maxDepth: CONFIG.maxDepth,
  };
  writeFileSync(join(__dirname, "e2e-state.json"), JSON.stringify(state, null, 2));

  console.log("\n▶️  Run deposit:");
  console.log(`stellar contract invoke \\
  --id ${CONFIG.contractId} \\
  --source-account ${CONFIG.userKey} \\
  --network ${CONFIG.network} \\
  --send=yes --auto-sign \\
  -- \\
  deposit \\
  --depositor ${CONFIG.userAddr} \\
  --value ${value} \\
  --precommitment ${precommitmentHex}`);

  console.log("\n▶️ After deposit, run:");
  console.log(`node ${join("scripts", "zkpay-e2e.mjs")} set-root`);
}

async function cmdSetRoot() {
  const statePath = join(__dirname, "e2e-state.json");
  if (!existsSync(statePath)) {
    console.error("No e2e-state.json found. Run 'gen-deposit' first.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const commitment = BigInt(state.commitment);

  console.log("\n🔷 Setting merkle root...");

  const leaves = [commitment];
  const tree = new LeanIMT((a, b) => poseidon_bls([a, b]));
  tree.insertMany(leaves);
  const root = tree.root;
  console.log("  Merkle root:", root.toString());
  console.log("  Root hex:", bigintToHex(root));

  state.merkleRoot = root.toString();
  state.siblings = "[]";
  state.leafIndex = "0";

  const rootHex = bigintToHex(root);
  console.log("\n▶️ Setting root on contract...");
  const result = await cli("contract", "invoke", "--id", CONFIG.contractId,
    "--source-account", CONFIG.deployerKey, "--network", CONFIG.network,
    "--send=yes", "--auto-sign", "--",
    "set_root", "--root", rootHex);
  console.log("  Result:", result ? "OK" : "FAILED");

  writeFileSync(statePath, JSON.stringify(state, null, 2));

  console.log("\n▶️ After root set, generate proof:");
  console.log(`node ${join("scripts", "zkpay-e2e.mjs")} gen-proof`);
}

async function cmdGenProof() {
  const statePath = join(__dirname, "e2e-state.json");
  if (!existsSync(statePath)) {
    console.error("No e2e-state.json found. Run 'gen-deposit' first.");
    return;
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const nullifier = BigInt(state.nullifier);
  const secret = BigInt(state.secret);
  const labelField = BigInt(state.labelField);
  const commitment = BigInt(state.commitment);
  const nullifierHash = BigInt(state.nullifierHash);
  const value = BigInt(state.value);
  const merkleRoot = BigInt(state.merkleRoot);

  console.log("\n🔷 Generating withdraw proof...");

  const newNullifier = BigInt("0x" + randomBytes(31).toString("hex"));
  const newSecret = BigInt("0x" + randomBytes(31).toString("hex"));

  const scopeHex = state.scopeHex;
  const dataBuf = Buffer.concat([
    hexToBuf(bigintToHex(labelField, 32)),
    hexToBuf(bigintToHex(value, 32)),
  ]);
  if (dataBuf.length !== 64) {
    console.error("Data buffer not 64 bytes:", dataBuf.length);
    return;
  }
  const dataHex = dataBuf.toString("hex");

  const scopeBuf = hexToBuf(scopeHex.replace(/^0x/, ""));
  const ctxBuf = createHash("sha256").update(Buffer.concat([dataBuf, scopeBuf])).digest();
  const context = BigInt("0x" + ctxBuf.toString("hex")) % BLS_SCALAR_FIELD;

  console.log("  Data hex (64 bytes):", dataHex);
  console.log("  Context:", context.toString());
  console.log("  Context hex:", bigintToHex(context));

  // Use current BLS-compiled circuit artifacts
  const circuitsDir = join(PROJ, "..", "circuits", "build", "withdraw_bls");
  const wasmPath = join(circuitsDir, "withdraw_js", "withdraw.wasm");
  const zkeyPath = join(circuitsDir, "withdraw.zkey");
  const proofPath = join(__dirname, "withdraw-proof.json");
  const pubPath = join(__dirname, "withdraw-pub.json");

  if (!existsSync(wasmPath) || !existsSync(zkeyPath)) {
    // Fallback to old paths
    const oldWasm = join(PROJ, "..", "circuits", "build", "withdraw_js", "withdraw.wasm");
    const oldZkey = join(PROJ, "..", "circuits", "build", "withdraw.zkey");
    if (existsSync(oldWasm) && existsSync(oldZkey)) {
      wasmPath = oldWasm;
      zkeyPath = oldZkey;
    } else {
      console.error("Circuit artifacts not found");
      return;
    }
  }

  const circuitInput = {
    withdrawnValue: value.toString(),
    stateRoot: merkleRoot.toString(),
    stateTreeDepth: "0",
    ASPRoot: labelField.toString(),
    ASPTreeDepth: "0",
    context: context.toString(),
    label: labelField.toString(),
    existingValue: value.toString(),
    existingNullifier: nullifier.toString(),
    existingSecret: secret.toString(),
    newNullifier: newNullifier.toString(),
    newSecret: newSecret.toString(),
    stateSiblings: Array(CONFIG.maxDepth).fill("0"),
    stateIndex: "0",
    ASPSiblings: Array(CONFIG.maxDepth).fill("0"),
    ASPIndex: "0",
  };

  const inputPath = join(__dirname, "withdraw-input.json");
  writeFileSync(inputPath, JSON.stringify(circuitInput, null, 2));
  console.log("  Input written to:", inputPath);

  console.log("\n🔷 Running snarkjs fullprove...");
  console.log("  WASM:", wasmPath);
  console.log("  Zkey:", zkeyPath);

  try {
    const result = execSync(
      `npx snarkjs groth16 fullprove "${inputPath}" "${wasmPath}" "${zkeyPath}" "${proofPath}" "${pubPath}"`,
      { cwd: PROJ, encoding: "utf8", maxBuffer: 100 * 1024 * 1024, timeout: 300000 }
    );
    console.log("  Proof generated!");
    console.log(result);
  } catch (e) {
    console.error("Proof generation failed:", e.message);
    console.error(e.stdout);
    console.error(e.stderr);
    return;
  }

  const proof = JSON.parse(readFileSync(proofPath, "utf8"));
  const pubSignals = JSON.parse(readFileSync(pubPath, "utf8"));
  console.log("\n  Public signals:", pubSignals);

  function g1ToHex(p) {
    const x = BigInt(p[0]);
    const y = BigInt(p[1]);
    return bigintToHex(x, 48) + bigintToHex(y, 48);
  }

  function g2ToHex(p) {
    const x0 = BigInt(p[0][0]);
    const x1 = BigInt(p[0][1]);
    const y0 = BigInt(p[1][0]);
    const y1 = BigInt(p[1][1]);
    // Soroban BLS12-381 expects Fp2 as c1 || c0 (imaginary first, real second)
    return bigintToHex(x1, 48) + bigintToHex(x0, 48) + bigintToHex(y1, 48) + bigintToHex(y0, 48);
  }

  const flatProof = {
    a: g1ToHex(proof.pi_a),
    b: g2ToHex(proof.pi_b),
    c: g1ToHex(proof.pi_c),
    pubSignals: pubSignals.map(s => bigintToHex(BigInt(s))),
  };

  // Pad to 10 for contract (8 circuit + allowlistRoot + ciphertext)
  const paddedSignals = [...flatProof.pubSignals];
  while (paddedSignals.length < 10) {
    paddedSignals.push(bigintToHex(0n));
  }

  console.log("\n📋 Stellar withdraw proof:");
  console.log(JSON.stringify({ ...flatProof, pubSignals: paddedSignals }, null, 2));

  const combined = {
    withdrawal: {
      processooor: CONFIG.userAddr,
      data: dataHex,
    },
    proof: flatProof,
    pubSignals: paddedSignals,
    circuitInput: circuitInput,
  };
  writeFileSync(join(__dirname, "e2e-withdraw.json"), JSON.stringify(combined, null, 2));

  const withdrawalJson = JSON.stringify(combined.withdrawal);
  const proofJson = JSON.stringify({
    proof: { a: flatProof.a, b: flatProof.b, c: flatProof.c },
    pub_signals: paddedSignals,
  });
  console.log(`\nstellar contract invoke \\
  --id ${CONFIG.contractId} \\
  --source-account ${CONFIG.userKey} \\
  --network ${CONFIG.network} \\
  --send=yes --auto-sign \\
  -- \\
  withdraw \\
  --withdrawal '${withdrawalJson}' \\
  --proof '${proofJson}'`);

  writeFileSync(join(__dirname, "e2e-withdrawal.json"), JSON.stringify(combined.withdrawal));
  writeFileSync(join(__dirname, "e2e-proof.json"), JSON.stringify({
    proof: { a: flatProof.a, b: flatProof.b, c: flatProof.c },
    pub_signals: paddedSignals,
  }));
  console.log(`\nstellar contract invoke \\
  --id ${CONFIG.contractId} \\
  --source-account ${CONFIG.userKey} \\
  --network ${CONFIG.network} \\
  --send=yes --auto-sign \\
  -- \\
  withdraw \\
  --withdrawal-file-path ${join(__dirname, "e2e-withdrawal.json")} \\
  --proof-file-path ${join(__dirname, "e2e-proof.json")}`);
}

async function cmdSubmitWithdraw() {
  const statePath = join(__dirname, "e2e-withdraw.json");
  if (!existsSync(statePath)) {
    console.error("No e2e-withdraw.json found. Run 'gen-proof' first.");
    return;
  }
  const data = JSON.parse(readFileSync(statePath, "utf8"));
  const proof = data.proof;
  const pubSignals = data.pubSignals;
  const withdrawal = data.withdrawal;

  console.log("\n🔷 Submitting withdraw...");
  console.log("  Processooor:", withdrawal.processooor);

  const args = [
    "contract", "invoke", "--id", CONFIG.contractId,
    "--source-account", CONFIG.userKey, "--network", CONFIG.network,
    "--send=yes", "--auto-sign", "--",
    "withdraw",
    "--withdrawal-processooor", withdrawal.processooor,
    "--withdrawal-data", withdrawal.data,
    "--proof-a", proof.a,
    "--proof-b", proof.b,
    "--proof-c", proof.c,
  ];

  for (const s of pubSignals) {
    args.push("--proof-pub_signals", s);
  }

  const result = await cli(...args);
  console.log("  Result:", result || "Sent");
}

const command = process.argv[2] || "gen-deposit";
const commands = {
  "gen-deposit": cmdGenDeposit,
  "set-root": cmdSetRoot,
  "gen-proof": cmdGenProof,
  "submit-withdraw": cmdSubmitWithdraw,
};

if (commands[command]) {
  commands[command]().catch(console.error);
} else {
  console.log("Usage: node zkpay-e2e.mjs <command>");
  console.log("Commands:");
  console.log("  gen-deposit       Generate deposit params and deposit via CLI");
  console.log("  set-root          Compute merkle root and set on contract");
  console.log("  gen-proof         Generate withdraw proof via snarkjs");
  console.log("  submit-withdraw   Submit withdraw to contract");
}
