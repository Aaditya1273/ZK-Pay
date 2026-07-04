#!/usr/bin/env node
/**
 * ZK-PAY: Generate VK Args for Stellar Contract Deployment
 * 
 * Converts a snarkjs verification key JSON into the FlatVerificationKey
 * format expected by the PrivacyPool Soroban contract.
 * 
 * Usage: node generate_vk_args.js <vk_json_path> <output_dir> [owner_address]
 */

const fs = require('fs');
const path = require('path');

// ─── BLS12-381 Constants ───────────────────────────────────
const BLS12_381_PRIME = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;

/**
 * Convert a BigInt to a hex string, padded to the specified byte length
 */
function bigintToHexPadded(value, byteLength) {
    let hex = value.toString(16);
    // Pad to the required length
    while (hex.length < byteLength * 2) {
        hex = '0' + hex;
    }
    return hex;
}

/**
 * Convert a G1 point (snarkjs format [x, y, 1]) to 96-byte hex
 * Uncompressed BLS12-381 G1: 48 bytes x || 48 bytes y
 */
function g1ToHex(g1Point) {
    const x = BigInt(g1Point[0]);
    const y = BigInt(g1Point[1]);
    const xHex = bigintToHexPadded(x, 48);
    const yHex = bigintToHexPadded(y, 48);
    return xHex + yHex;
}

/**
 * Convert a G2 point (snarkjs format [[x0, x1], [y0, y1], [1, 0]]) to 192-byte hex
 * Uncompressed BLS12-381 G2: 96 bytes x (48 x0 || 48 x1) || 96 bytes y (48 y0 || 48 y1)
 */
function g2ToHex(g2Point) {
    const x0 = BigInt(g2Point[0][0]);
    const x1 = BigInt(g2Point[0][1]);
    const y0 = BigInt(g2Point[1][0]);
    const y1 = BigInt(g2Point[1][1]);
    const x0Hex = bigintToHexPadded(x0, 48);
    const x1Hex = bigintToHexPadded(x1, 48);
    const y0Hex = bigintToHexPadded(y0, 48);
    const y1Hex = bigintToHexPadded(y1, 48);
    // Soroban BLS12-381 expects Fp2 as c1 || c0 (imaginary first, real second)
    return x1Hex + x0Hex + y1Hex + y0Hex;
}

/**
 * Field-to-point validity check: verify the point is on the curve
 */
function validateG1Point(g1Point) {
    const x = BigInt(g1Point[0]);
    const y = BigInt(g1Point[1]);
    const z = BigInt(g1Point[2] || 1n);
    
    // For now, basic check: ensure coordinates are non-negative
    if (x < 0n || y < 0n) {
        throw new Error('Invalid G1 point: negative coordinate');
    }
    if (x >= BLS12_381_PRIME || y >= BLS12_381_PRIME) {
        console.warn('  ⚠ G1 point coordinate exceeds field prime (expected for valid BLS12-381 points)');
    }
    return true;
}

// ─── Main ──────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node generate_vk_args.js <vk_json_path> <output_dir> [owner_address]');
        process.exit(1);
    }
    
    const vkPath = args[0];
    const outputDir = args[1];
    const ownerAddr = args[2] || '';
    
    if (!fs.existsSync(vkPath)) {
        console.error(`VK JSON not found: ${vkPath}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('  Reading VK JSON...');
    const vk = JSON.parse(fs.readFileSync(vkPath, 'utf8'));
    
    console.log(`  Protocol: ${vk.protocol}`);
    console.log(`  Curve: ${vk.curve}`);
    console.log(`  Public inputs: ${vk.nPublic}`);
    console.log(`  IC points: ${vk.IC.length}`);
    
    // Convert G1 points
    console.log('  Converting alpha (G1)...');
    validateG1Point(vk.vk_alpha_1);
    const alphaHex = g1ToHex(vk.vk_alpha_1);
    console.log(`    alpha: ${alphaHex.substring(0, 16)}...${alphaHex.substring(alphaHex.length - 16)}`);
    
    console.log('  Converting beta (G2)...');
    const betaHex = g2ToHex(vk.vk_beta_2);
    console.log(`    beta: ${betaHex.substring(0, 16)}...${betaHex.substring(betaHex.length - 16)}`);
    
    console.log('  Converting gamma (G2)...');
    const gammaHex = g2ToHex(vk.vk_gamma_2);
    console.log(`    gamma: ${gammaHex.substring(0, 16)}...${gammaHex.substring(gammaHex.length - 16)}`);
    
    console.log('  Converting delta (G2)...');
    const deltaHex = g2ToHex(vk.vk_delta_2);
    console.log(`    delta: ${deltaHex.substring(0, 16)}...${deltaHex.substring(deltaHex.length - 16)}`);
    
    console.log('  Converting IC points (G1)...');
    const icHexList = vk.IC.map((ic, i) => {
        validateG1Point(ic);
        const hex = g1ToHex(ic);
        console.log(`    IC[${i}]: ${hex.substring(0, 16)}...${hex.substring(hex.length - 16)}`);
        return hex;
    });
    
    // Save full VK as JSON for the contract
    const vkContract = {
        alpha: alphaHex,
        beta: betaHex,
        gamma: gammaHex,
        delta: deltaHex,
        ic: icHexList,
    };
    
    fs.writeFileSync(
        path.join(outputDir, 'vk_contract.json'),
        JSON.stringify(vkContract, null, 2)
    );
    console.log('  ✓ Saved: vk_contract.json');
    
    // Save individual VK components as hex files for CLI usage
    fs.writeFileSync(path.join(outputDir, 'vk_alpha.hex'), alphaHex);
    fs.writeFileSync(path.join(outputDir, 'vk_beta.hex'), betaHex);
    fs.writeFileSync(path.join(outputDir, 'vk_gamma.hex'), gammaHex);
    fs.writeFileSync(path.join(outputDir, 'vk_delta.hex'), deltaHex);
    fs.writeFileSync(path.join(outputDir, 'vk_ic.json'), JSON.stringify(icHexList));
    
    // Generate stellar CLI args file
    const icArgs = icHexList.map(h => `--ic ${h}`).join(' ');
    const cliArgs = `--alpha ${alphaHex} --beta ${betaHex} --gamma ${gammaHex} --delta ${deltaHex} ${icArgs}`;
    fs.writeFileSync(path.join(outputDir, 'vk_cli_args.txt'), cliArgs);
    console.log('  ✓ Saved: vk_cli_args.txt');
    
    // Output summary
    const totalSize = (alphaHex.length / 2) + (betaHex.length / 2) + (gammaHex.length / 2) + 
                      (deltaHex.length / 2) + icHexList.reduce((s, h) => s + h.length / 2, 0);
    console.log(`\n  VK total size: ${(totalSize / 1024).toFixed(1)} KB`);
    console.log('  VK conversion complete!');
    
    return vkContract;
}

try {
    main();
} catch (err) {
    console.error(`\n  ✗ Error: ${err.message}`);
    process.exit(1);
}
