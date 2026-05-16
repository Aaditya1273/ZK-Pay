import { Indexer, ZgFile, Uploader, getFlowContract, getShardConfigs } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import fs from "fs/promises";
import path from "path";
import os from "os";

const INDEXER_RPC = process.env.INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai";
const EVM_RPC = process.env["0G_TESTNET_RPC"] || "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = process.env.FLOW_ADDRESS || "0x62d4144db0f0a6fbbaeb6296c785c71b3d57c526";

async function upload(filePath, privateKey) {
    const provider = new ethers.JsonRpcProvider(EVM_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const indexer = new Indexer(INDEXER_RPC);

    const zgFile = await ZgFile.fromFilePath(filePath);
    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

    const rootHash = tree.rootHash();
    
    try {
        const flowContract = getFlowContract(FLOW_ADDRESS, signer);
        
        let shardConfigs;
        try {
            shardConfigs = await getShardConfigs(indexer);
        } catch (e) {
            console.error("Warning: getShardConfigs failed, using empty array:", e.message);
            shardConfigs = [];
        }

        // 0.2.1 specific fix: ensure shardConfigs is iterable
        const nodes = Array.isArray(shardConfigs) ? shardConfigs : [];
        
        const uploader = new Uploader([flowContract], provider, signer, nodes, 0, 0);

        const [_, uploadErr] = await uploader.uploadFile(zgFile, {
            tags: '0x',
            skipTx: true,
            fee: 0n,
            taskSize: 10,
            expectedReplica: 1,
            finalityRequired: false,
            timeout: 30000,
        });

        if (uploadErr && !uploadErr.toString().toLowerCase().includes('already')) {
            throw new Error(`Upload failed: ${uploadErr}`);
        }

        console.log(JSON.stringify({ success: true, rootHash }));
    } finally {
        await zgFile.close();
    }
}

const action = process.argv[2];
const param1 = process.argv[3];
const param2 = process.argv[4];

if (action === "upload") {
    upload(param1, param2).catch(err => {
        console.error(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    });
} else {
    console.error("Unknown action");
    process.exit(1);
}
