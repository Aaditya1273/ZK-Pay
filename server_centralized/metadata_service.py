"""
metadata_service.py
Production ERC-721 Metadata Service for iNFT identity anchoring.

Architecture:
- Generates a keccak256 content hash from metadata (deterministic, content-addressable)
- Stores metadata as JSON locally in data/metadata/
- Returns a tokenURI pointing to the backend's /metadata/:hash endpoint
- This tokenURI is what gets minted into the NFT on-chain via safeMint(to, tokenURI)
"""

import os
import json
import hashlib
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

METADATA_DIR = os.path.join(os.path.dirname(__file__), "data", "metadata")


def _ensure_metadata_dir():
    os.makedirs(METADATA_DIR, exist_ok=True)


def generate_metadata_hash(metadata: Dict) -> str:
    """
    Generate a deterministic keccak256-style hash from metadata content.
    Sorted keys ensure the same metadata always produces the same hash.
    """
    canonical = json.dumps(metadata, sort_keys=True, separators=(',', ':'))
    return "0x" + hashlib.sha256(canonical.encode()).hexdigest()


def store_metadata(metadata: Dict) -> str:
    """
    Stores metadata to disk and returns the content hash.
    Idempotent — same metadata always maps to the same file.
    """
    _ensure_metadata_dir()
    content_hash = generate_metadata_hash(metadata)
    # Strip "0x" prefix for filename
    hash_hex = content_hash[2:]
    filepath = os.path.join(METADATA_DIR, f"{hash_hex}.json")
    
    if not os.path.exists(filepath):
        with open(filepath, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"✅ Metadata stored: {hash_hex}.json")
    else:
        logger.info(f"♻️  Metadata already exists: {hash_hex}.json (idempotent)")
    
    return content_hash


def get_metadata(hash_hex: str) -> Optional[Dict]:
    """
    Retrieves stored metadata by hash. Returns None if not found.
    """
    # Accept both with and without 0x prefix
    clean_hash = hash_hex.replace("0x", "")
    filepath = os.path.join(METADATA_DIR, f"{clean_hash}.json")
    
    if not os.path.exists(filepath):
        return None
    
    with open(filepath, "r") as f:
        return json.load(f)


def build_token_uri(content_hash: str, base_url: str) -> str:
    """
    Builds the ERC-721 compatible tokenURI.
    Format: https://<backend>/metadata/<hash>
    """
    clean_hash = content_hash.replace("0x", "")
    return f"{base_url}/metadata/{clean_hash}"
