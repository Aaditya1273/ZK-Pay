import os
import json
import tempfile
import logging
import asyncio
import httpx
from web3 import Web3
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# 0G Newton Testnet Parameters
INDEXER_RPC = "https://indexer-storage-testnet-turbo.0g.ai"
EVM_RPC = os.getenv("0G_TESTNET_RPC", "https://evmrpc-testnet.0g.ai")
USER_REGISTRY_ADDRESS = os.getenv("USER_REGISTRY_ADDRESS", "0x90564782BfCd4abddC749B2209C03F774e82191e")
GAME_ITEMS_ADDRESS = os.getenv("GAME_ITEMS_ADDRESS", "0x61c54308FD1f5bB2451DE76DADaDE3b590b256e6")
NARRATIVE_INFT_ADDRESS = os.getenv("NARRATIVE_INFT_ADDRESS", "0x5EFaA2dd48323156ebE3d5B4834d83fcB8bFfcF4")
STAKING_MANAGER_ADDRESS = os.getenv("STAKING_MANAGER_ADDRESS", "0x2f48419F77E6cD6E9D319Dc1314a1b1008C8ddfB")

# WrappedOGBase: official 0G precompile — same address on testnet AND mainnet
# Used for ERC-20 style payments in TradeManager. Rewards use native 0G via StakingManager.
WRAPPED_OG_ADDRESS = "0x0000000000000000000000000000000000001001"

USER_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_rootHash", "type": "string"}],
        "name": "updateDialogueRoot",
        "outputs": [],
        "stateMutability": "external",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "latestDialogueRootHash",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "isUserRegistered",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]

GAME_ITEMS_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "tokenURI_", "type": "string"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"}
        ],
        "name": "mint",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

NARRATIVE_INFT_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "uri", "type": "string"},
            {"internalType": "bytes32", "name": "_metaHash", "type": "bytes32"}
        ],
        "name": "safeMint",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "string", "name": "newUri", "type": "string"},
            {"internalType": "bytes32", "name": "newHash", "type": "bytes32"},
            {"internalType": "bytes", "name": "proof", "type": "bytes"}
        ],
        "name": "updateMetadata",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getNonce",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "address", "name": "executor", "type": "address"},
            {"internalType": "bytes", "name": "permissions", "type": "bytes"}
        ],
        "name": "authorizeUsage",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

STAKING_MANAGER_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "bool", "name": "won", "type": "bool"}
        ],
        "name": "resolveGameStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

class OGStorageService:
    def __init__(self):
        self.account: Optional[Any] = None
        self.contract: Optional[Any] = None
        self.items_contract: Optional[Any] = None
        self.avatar_contract: Optional[Any] = None
        self.staking_contract: Optional[Any] = None
        
        self.w3 = Web3(Web3.HTTPProvider(EVM_RPC))
        self.private_key = os.getenv("PRIVATE_KEY")
        if self.private_key:
            self.account = self.w3.eth.account.from_key(self.private_key)
            self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(USER_REGISTRY_ADDRESS), abi=USER_REGISTRY_ABI)
            self.items_contract = self.w3.eth.contract(address=Web3.to_checksum_address(GAME_ITEMS_ADDRESS), abi=GAME_ITEMS_ABI)
            self.avatar_contract = self.w3.eth.contract(address=Web3.to_checksum_address(NARRATIVE_INFT_ADDRESS), abi=NARRATIVE_INFT_ABI)
            self.staking_contract = self.w3.eth.contract(address=Web3.to_checksum_address(STAKING_MANAGER_ADDRESS), abi=STAKING_MANAGER_ABI)
        else:
            logger.warning("PRIVATE_KEY not set. On-chain anchoring disabled.")

    def _get_gas_price(self):
        """Get current gas price with a 10% buffer and 2 gwei minimum for Newton Testnet"""
        try:
            current_price = self.w3.eth.gas_price
            # Buffer of 10% to prevent "below minimum" errors during spikes
            buffered_price = int(current_price * 1.1)
            # 2 gwei minimum (Newton Testnet often requires this)
            min_price = self.w3.to_wei('2', 'gwei')
            return max(buffered_price, min_price)
        except Exception as e:
            logger.error(f"Error getting gas price: {e}")
            return self.w3.to_wei('2', 'gwei')

    async def upload_data(self, data: Any) -> Optional[str]:
        """Upload data to 0G Storage via Node.js bridge without blocking the event loop."""
        if not self.private_key:
            logger.error("Cannot upload: PRIVATE_KEY missing")
            return None

        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json') as tf:
            json.dump(data, tf)
            temp_path = tf.name

        try:
            cmd = ["node", "bridge_0g.js", "upload", temp_path, self.private_key]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=os.path.dirname(__file__),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                logger.error("Bridge upload failed: %s", stderr.decode().strip())
                return None

            result = json.loads(stdout.decode())
            if not result.get("success"):
                logger.error(f"Bridge reported failure: {result.get('error')}")
                return None

            root_hash = result.get("rootHash")
            logger.info(f"✅ Uploaded to 0G Storage. Root: {root_hash}")
            return root_hash

        except Exception as e:
            logger.error(f"Error in upload_data: {e}")
            return None
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    async def anchor_root(self, root_hash: str) -> bool:
        """Anchor root hash on-chain in UserRegistry"""
        if not self.contract or not self.account:
            return False

        try:
            # Check if user is registered (address derived from PK)
            is_reg = self.contract.functions.isUserRegistered(self.account.address).call()
            if not is_reg:
                logger.info(f"User {self.account.address} not registered. Skipping anchor.")
                return False

            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.contract.functions.updateDialogueRoot(root_hash).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': self._get_gas_price()
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"✅ Anchored root on-chain. Tx: {tx_hash.hex()}")
                return True
            else:
                logger.error("Transaction failed")
                return False

        except Exception as e:
            logger.error(f"Error anchoring root: {e}")
            return False

    async def download_data(self, root_hash: str) -> Optional[Any]:
        """Download data from 0G Storage Indexer Gateway"""
        url = f"{INDEXER_RPC}/file?root={root_hash}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Download failed: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error downloading data: {e}")
            return None

    async def get_latest_dialogue(self, user_address: str) -> Optional[Any]:
        """Fetch latest dialogue from chain and storage"""
        if not self.contract:
            return None
            
        try:
            root_hash = self.contract.functions.latestDialogueRootHash(Web3.to_checksum_address(user_address)).call()
            if not root_hash or len(root_hash) < 10:
                return None
            
            return await self.download_data(root_hash)
        except Exception as e:
            logger.error(f"Error fetching latest dialogue: {e}")
            return None

    async def distribute_reward(self, user_address: str, amount: int) -> bool:
        """Send native 0G tokens to user as reward (no custom token needed — use real 0G).
        
        Rewards come from the backend wallet's native 0G balance.
        amount is in wei (e.g. calculate_reward() returns wei).
        """
        if not self.account:
            return False
        if amount <= 0:
            return True  # Nothing to send

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = {
                'to': Web3.to_checksum_address(user_address),
                'value': amount,
                'gas': 21000,
                'gasPrice': self._get_gas_price(),
                'nonce': nonce,
                'chainId': int(self.w3.eth.chain_id),
            }
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"💰 Native 0G reward sent to {user_address}. Tx: {tx_hash.hex()}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error distributing reward: {e}")
            return False

    async def resolve_game_stake(self, user_address: str, won: bool) -> bool:
        """Resolve a staked game. Rewards/confiscates stake."""
        if not self.staking_contract or not self.account:
            return False

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.staking_contract.functions.resolveGameStake(
                Web3.to_checksum_address(user_address), 
                won
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': self._get_gas_price()
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"⚖️ Stake resolved for {user_address}. Won: {won}. Tx: {tx_hash.hex()}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error resolving stake: {e}")
            return False

    def calculate_reward(self, score: int, is_true_ending: bool, difficulty: str = "easy", staked: bool = False) -> int:
        """Return native 0G reward in wei based on score and difficulty.
        
        Multipliers:
          Easy   → 1.5x
          Normal → 1.75x
          Hard   → 2.0x
        True ending bonus: +0.005 0G
        Staked games: handled by StakingManager (2x payout), no casual reward.
        """
        base_wei = self.w3.to_wei('0.001', 'ether')
        score_bonus = (score // 100) * self.w3.to_wei('0.0001', 'ether')
        true_ending_bonus = self.w3.to_wei('0.005', 'ether') if is_true_ending else 0
        total = base_wei + score_bonus + true_ending_bonus

        diff_lower = difficulty.lower()
        if diff_lower in ("easy", "very easy"):
            total = int(total * 1.5)
        elif diff_lower == "normal":
            total = int(total * 1.75)
        elif diff_lower == "hard":
            total = int(total * 2.0)

        if staked:
            return 0  # StakingManager handles staked payouts

        return total

    async def mint_game_item(self, user_address: str, item_name: str) -> bool:
        """Mint Game Item (ERC-721) to user via backend-sponsored flow."""
        if not self.items_contract or not self.account:
            return False

        try:
            item_name_formatted = item_name.replace('_', ' ').title()
            token_uri = f"https://storagescan-newton.0g.ai/file/{item_name.lower()}"
            description = f"A trusty {item_name_formatted} for your adventures in Beyond The Fog."

            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.items_contract.functions.mint(
                Web3.to_checksum_address(user_address),
                token_uri,
                item_name_formatted,
                description
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 500000,
                'gasPrice': self._get_gas_price()
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            logger.info(f"GameItem mint tx sent: {tx_hash.hex()}")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"✅ GameItem '{item_name}' minted to {user_address}")
                return True
            else:
                logger.error(f"GameItem mint reverted: {tx_hash.hex()}")
                return False
        except Exception as e:
            import traceback
            logger.error(f"Error minting item: {e}")
            logger.error(traceback.format_exc())
            return False

    async def prepare_avatar_metadata(self, metadata: Dict) -> Optional[str]:
        """Upload metadata to 0G Storage and return root hash for client-side minting"""
        if not self.private_key:
            return None

        root_hash = await self.upload_data(metadata)
        if root_hash:
            logger.info(f"🎨 Avatar metadata anchored on 0G. Root: {root_hash}")
            return root_hash
        return None

    def generate_erc7857_proof(self, token_id: int, new_uri: str, new_hash: bytes, nonce: int) -> Optional[bytes]:
        """
        Generate an ERC-7857 oracle proof (ECDSA signature) for metadata evolution.
        
        The contract verifies: signer == oracle for
            keccak256(abi.encodePacked(tokenId, newUri, newHash, nonce))
        
        This backend wallet IS the oracle — its address must match NarrativeINFT.oracle.
        """
        if not self.private_key or not self.account:
            logger.error("Cannot generate proof: PRIVATE_KEY missing")
            return None
        try:
            from eth_abi import encode
            from eth_account.messages import encode_defunct

            # Match Solidity: keccak256(abi.encodePacked(tokenId, newUri, newHash, nonce))
            packed = (
                token_id.to_bytes(32, 'big') +
                new_uri.encode('utf-8') +
                new_hash +
                nonce.to_bytes(32, 'big')
            )
            msg_hash = self.w3.keccak(packed)
            # Wrap with Ethereum signed message prefix (toEthSignedMessageHash)
            signable = encode_defunct(hexstr=msg_hash.hex())
            signed = self.w3.eth.account.sign_message(signable, private_key=self.private_key)
            logger.info(f"✅ ERC-7857 oracle proof generated for token {token_id}")
            return signed.signature
        except Exception as e:
            logger.error(f"Error generating ERC-7857 proof: {e}")
            return None

    async def mint_avatar_nft(self, user_address: str, avatar_id: int, metadata: Dict) -> Optional[str]:
        """
        Backend-sponsored iNFT mint using ERC-7857 safeMint.
        Uploads metadata to 0G Storage, computes hash, mints on-chain.
        """
        if not self.avatar_contract or not self.account:
            return None

        root_hash = await self.upload_data(metadata)
        if not root_hash:
            return None

        # Compute metadata hash for ERC-7857 (keccak256 of the URI string)
        meta_hash = self.w3.keccak(text=root_hash)

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.avatar_contract.functions.safeMint(
                Web3.to_checksum_address(user_address),
                root_hash,
                meta_hash  # bytes32 _metaHash — ERC-7857 requirement
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': self._get_gas_price()
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"✅ ERC-7857 iNFT minted for {user_address}. Tx: {tx_hash.hex()}")
                return root_hash
            return None
        except Exception as e:
            logger.error(f"Error minting ERC-7857 iNFT: {e}")
            return None

    async def evolve_inft(self, token_id: int, new_uri: str) -> bool:
        """
        Evolve an iNFT's metadata as the player progresses (ERC-7857 updateMetadata).
        Called after significant game events (stage change, true ending, etc.)
        """
        if not self.avatar_contract or not self.account:
            return False
        try:
            # Get current nonce from contract
            nonce = self.avatar_contract.functions.getNonce(token_id).call()
            new_hash = self.w3.keccak(text=new_uri)
            
            # Generate oracle proof
            proof = self.generate_erc7857_proof(token_id, new_uri, new_hash, nonce)
            if not proof:
                return False

            tx_nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.avatar_contract.functions.updateMetadata(
                token_id,
                new_uri,
                new_hash,
                proof
            ).build_transaction({
                'from': self.account.address,
                'nonce': tx_nonce,
                'gas': 200000,
                'gasPrice': self._get_gas_price()
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                logger.info(f"🌱 ERC-7857 iNFT #{token_id} evolved. Tx: {tx_hash.hex()}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error evolving iNFT: {e}")
            return False
