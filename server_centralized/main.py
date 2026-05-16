from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
import uuid
import os
import traceback
import sys
from datetime import datetime
import json
import secrets
import threading
import time
from web3 import Web3
from dotenv import load_dotenv

# ---------- Persistence paths ----------
COMPLETIONS_FILE = "data/completions.json"
DIALOGUE_STATE_FILE = "data/dialogue_state.json"
all_completions: list = []
dialogue_state_index: dict[str, dict[str, Any]] = {}

from schemas import *
from game_logic.engine import GameEngine
from game_logic.state_manager import GameState
from og_storage_service import OGStorageService, NARRATIVE_INFT_ADDRESS
from config import AVATAR_NFT_METADATA
from metadata_service import store_metadata, get_metadata, build_token_uri

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3002")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
MAX_PROMPT_LENGTH = int(os.getenv("MAX_PROMPT_LENGTH", "500"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60"))
COMPLETE_LIMIT_MAX_REQUESTS = int(os.getenv("COMPLETE_LIMIT_MAX_REQUESTS", "5"))

game_engine: Any = None
og_storage: Any = None
file_lock = threading.Lock()
rate_limit_lock = threading.Lock()
rate_limit_store: dict[str, list[float]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global game_engine, og_storage
    print("--- Server Startup ---")
    API_KEY = os.environ.get("GOOGLE_API_KEY")
    if not API_KEY:
        sys.exit("GOOGLE_API_KEY is not configured. Shutting down.")
    
    game_engine = GameEngine(api_key=API_KEY)
    og_storage = OGStorageService()
    
    if not os.path.exists("data"):
        os.makedirs("data")
    load_active_games()
    print("Game Engine and 0G Storage initialized successfully.")
    yield

app = FastAPI(title="Beyond The Fog - 0G Production Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

active_games: dict[str, GameState] = {}

def atomic_json_dump(filepath: str, payload: Any):
    temp_path = f"{filepath}.tmp"
    with open(temp_path, "w") as f:
        json.dump(payload, f)
    os.replace(temp_path, filepath)

def save_active_games():
    try:
        data = {gid: state.to_dict() for gid, state in active_games.items()}
        with file_lock:
            atomic_json_dump("data/active_sessions.json", data)
    except Exception as e:
        logger.error(f"Failed to save sessions: {e}")

def load_active_games():
    global active_games
    try:
        if os.path.exists("data/active_sessions.json"):
            with open("data/active_sessions.json", "r") as f:
                data = json.load(f)
                active_games = {gid: GameState.from_dict(state_data) for gid, state_data in data.items()}
                logger.info(f"Loaded {len(active_games)} sessions from persistence")
    except Exception as e:
        logger.error(f"Failed to load sessions: {e}")

def load_completions():
    global all_completions
    try:
        if os.path.exists(COMPLETIONS_FILE):
            with open(COMPLETIONS_FILE, "r") as f:
                all_completions = json.load(f)
                logger.info(f"Loaded {len(all_completions)} completions")
    except Exception as e:
        logger.error(f"Failed to load completions: {e}")

def load_dialogue_state():
    global dialogue_state_index
    try:
        if os.path.exists(DIALOGUE_STATE_FILE):
            with open(DIALOGUE_STATE_FILE, "r") as f:
                dialogue_state_index = json.load(f)
                logger.info("Loaded %s dialogue snapshots", len(dialogue_state_index))
    except Exception as e:
        logger.error(f"Failed to load dialogue state: {e}")

def save_completion(completion_data):
    all_completions.append(completion_data)
    try:
        with file_lock:
            atomic_json_dump(COMPLETIONS_FILE, all_completions)
    except Exception as e:
        logger.error(f"Failed to save completion: {e}")

def save_dialogue_state(user_address: str, payload: dict[str, Any]):
    dialogue_state_index[user_address.lower()] = payload
    try:
        with file_lock:
            atomic_json_dump(DIALOGUE_STATE_FILE, dialogue_state_index)
    except Exception as e:
        logger.error(f"Failed to save dialogue state: {e}")

def sanitize_player_prompt(player_prompt: str | None) -> str:
    if not player_prompt:
        return "Hello."
    normalized = " ".join(player_prompt.split())
    return normalized[:MAX_PROMPT_LENGTH] or "Hello."

def enforce_rate_limit(bucket: str, limit: int):
    now = time.time()
    with rate_limit_lock:
        entries = rate_limit_store.setdefault(bucket, [])
        cutoff = now - RATE_LIMIT_WINDOW_SECONDS
        entries[:] = [ts for ts in entries if ts >= cutoff]
        if len(entries) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        entries.append(now)

def authorize_game_session(game_id: str, user_address: str, session_token: str) -> GameState:
    game_state = active_games.get(game_id)
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    if game_state.user_address.lower() != user_address.lower():
        raise HTTPException(status_code=403, detail="Address is not authorized for this session")
    if not secrets.compare_digest(game_state.session_token, session_token):
        raise HTTPException(status_code=403, detail="Invalid session token")
    return game_state

# --- Background Task: Anchor Dialogue ---
async def persist_dialogue_to_og(user_address: str, game_id: str, dialogue: Dict):
    """Persist dialogue to 0G Storage and anchor on-chain"""
    if not user_address:
        return

    payload = {
        "game_id": game_id,
        "timestamp": datetime.now().isoformat(),
        "dialogue": dialogue,
    }
    save_dialogue_state(user_address, payload)

    if not og_storage.private_key:
        return

    logger.info(f"💾 Persisting dialogue for {user_address} to 0G")
    root_hash = await og_storage.upload_data(payload)

    if root_hash:
        await og_storage.anchor_root(root_hash)

# --- Initialization ---
load_active_games()
load_completions()
load_dialogue_state()

# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "online", "message": "Beyond The Fog - 0G Galileo API", "version": "1.0.0"}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.middleware("http")
async def apply_rate_limits(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    try:
        enforce_rate_limit(f"global:{client_ip}", RATE_LIMIT_MAX_REQUESTS)
        if request.url.path == "/game/complete":
            enforce_rate_limit(f"complete:{client_ip}", COMPLETE_LIMIT_MAX_REQUESTS)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)

@app.post("/game/new", response_model=NewGameResponse)
async def create_new_game(request: NewGameRequest):
    enforce_rate_limit(f"new-game:{request.user_address.lower()}", 10)
    game_id = str(uuid.uuid4())
    session_token = secrets.token_urlsafe(32)
    try:
        game_state = game_engine.start_new_game(
            game_id=game_id,
            num_inaccessible_locations=request.num_inaccessible_locations,
            difficulty=request.difficulty,
            staked=request.staked,
            user_address=request.user_address,
            session_token=session_token,
        )
        game_state.user_address = request.user_address
        game_state.session_token = session_token
        active_games[game_id] = game_state
        save_active_games()
        
        initial_villagers = [{"id": f"villager_{i}", "title": v["title"]} for i, v in enumerate(game_state.villagers)]
        return NewGameResponse(
            game_id=game_id,
            status="success",
            inaccessible_locations=game_state.inaccessible_locations,
            villagers=initial_villagers,
            user_address=request.user_address,
            session_token=session_token,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game/mint-item")
async def mint_item(request: MintItemRequest):
    matching_sessions = [
        game_state for game_state in active_games.values()
        if game_state.user_address.lower() == request.user_address.lower()
        and secrets.compare_digest(game_state.session_token, request.session_token)
    ]
    if not matching_sessions:
        raise HTTPException(status_code=403, detail="Invalid session token")

    item_name = request.item_name.strip().upper()
    item_map = { 
        "RUSTY_KEY": 0, 
        "FOG_LANTERN": 1, 
        "ANCIENT_MAP": 2,
        "AXE": 3,
        "FISHING_ROD": 4,
        "SHOVEL": 5,
        "LANTERN": 6,
        "PICKAXE": 7,
        "HAMMER": 8,
        "BUCKET": 9,
        "SCYTHE": 10
    }
    item_id = item_map.get(item_name)
    
    if item_id is None:
        raise HTTPException(status_code=400, detail="Invalid item name")
    
    try:
        success = await og_storage.mint_game_item(request.user_address, item_name)
        if not success:
            raise HTTPException(status_code=500, detail="On-chain minting failed (Check server logs for reason)")
        
        return {"success": True, "item_name": item_name}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in mint_item: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"On-chain minting failed: {str(e)}")

@app.post("/game/{game_id}/interact", response_model=InteractResponse)
async def interact(game_id: str, request: InteractRequest, background_tasks: BackgroundTasks):
    game_state = authorize_game_session(game_id, request.user_address, request.session_token)
    try:
        if not request.villager_id or '_' not in request.villager_id:
            raise HTTPException(status_code=400, detail="Invalid villager_id format")
            
        parts = request.villager_id.split('_')
        if len(parts) < 2 or not parts[1].isdigit():
            raise HTTPException(status_code=400, detail="Invalid villager_id index")
            
        villager_index = int(parts[1])
        if villager_index < 0 or villager_index >= len(game_state.villagers):
             raise HTTPException(status_code=400, detail="Villager index out of range")
             
        villager_name = game_state.villagers[villager_index]["name"]
        
        frustration = {"friends": len([m for m in game_state.full_npc_memory.get(villager_name, []) if "friend" in str(m.get("content")).lower()])}
        player_input = sanitize_player_prompt(request.player_prompt)

        dialogue_data = game_engine.process_interaction_turn(game_state, villager_name, player_input, frustration)
        save_active_games()
        
        background_tasks.add_task(persist_dialogue_to_og, request.user_address, game_id, dialogue_data)

        return InteractResponse(villager_id=request.villager_id, villager_name=villager_name, npc_dialogue=dialogue_data.get("npc_dialogue"), player_suggestions=dialogue_data.get("player_responses"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game/resume")
async def resume_game(request: ResumeGameRequest):
    latest_state = dialogue_state_index.get(request.user_address.lower())
    if not latest_state:
        latest_state = await og_storage.get_latest_dialogue(request.user_address)
    if not latest_state:
        raise HTTPException(status_code=404, detail="No previous state found on-chain")
    
    return {"success": True, "state": latest_state}

@app.post("/game/complete")
async def complete_game(request: CompleteGameRequest):
    try:
        game_state = authorize_game_session(request.game_id, request.user_address, request.session_token)
        is_staked = getattr(game_state, 'staked', False)
        difficulty = getattr(game_state, 'difficulty', "medium")

        reward_amount = 0
        if request.won and not is_staked:
            reward_amount = og_storage.calculate_reward(request.score, request.is_true_ending, difficulty, is_staked)
            await og_storage.distribute_reward(request.user_address, reward_amount)

        if is_staked:
            await og_storage.resolve_game_stake(request.user_address, request.won)

        # Record completion
        completion_record = {
            "game_id": request.game_id,
            "user_address": request.user_address,
            "score": request.score,
            "won": request.won,
            "reward": reward_amount,
            "is_true_ending": request.is_true_ending,
            "timestamp": datetime.now().isoformat()
        }
        save_completion(completion_record)

        # Cleanup session
        if request.game_id in active_games:
            del active_games[request.game_id]
            save_active_games()
            
        return {
            "success": True,
            "reward": reward_amount,
            "message": "Journey complete. Rewards being distributed on-chain."
        }
    except Exception as e:
        logger.error(f"Completion failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error during completion")

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Return top players across all sessions"""
    # Group by address and get max score for each
    player_scores = {}
    for comp in all_completions:
        addr = comp["user_address"]
        score = comp["score"]
        if addr not in player_scores or score > player_scores[addr]:
            player_scores[addr] = score
    
    leaderboard = [{"address": addr, "score": score} for addr, score in player_scores.items()]
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    return {"success": True, "leaderboard": leaderboard[:10]}

@app.get("/api/portfolio/{user_address}")
async def get_portfolio(user_address: str):
    try:
        user_completions = [c for c in all_completions if c["user_address"].lower() == user_address.lower()]
        best_score = max([c["score"] for c in user_completions]) if user_completions else 0
        games_played = len(user_completions)
        
        has_dialogue_root = False
        try:
            root_hash = og_storage.contract.functions.latestDialogueRootHash(Web3.to_checksum_address(user_address)).call()
            has_dialogue_root = bool(root_hash and len(root_hash) > 10)
        except:
            pass

        return {
            "success": True,
            "stats": {
                "best_score": best_score,
                "games_played": games_played,
                "on_chain_sync": has_dialogue_root
            },
            "history": user_completions[-5:] # Last 5 games
        }
    except Exception as e:
        logger.error(f"Portfolio fetch failed: {e}")
        return {"success": False, "error": str(e)}

@app.post("/game/{game_id}/guess", response_model=GuessResponse)
async def guess(game_id: str, request: GuessRequest):
    game_state = authorize_game_session(game_id, request.user_address, request.session_token)
    is_correct = request.location_name == game_state.correct_location
    
    key_clues = [n['node_id'] for n in game_state.quest_network.get('nodes', []) if n.get('key_clue')]
    discovered_key_clues = [nid for nid in game_state.player_state['discovered_nodes'] if nid in key_clues]
    is_true_ending = len(discovered_key_clues) == len(key_clues)

    message = f"You head towards {request.location_name}... "
    if is_correct:
        message += "You find your friends! " + ("TRUE ENDING UNLOCKED." if is_true_ending else "YOU WIN.")
    else:
        message += f"Nothing but fog. The truth was at {game_state.correct_location}."

    return GuessResponse(message=message, is_correct=is_correct, is_true_ending=is_true_ending)

@app.post("/game/mint-avatar")
async def mint_avatar(request: MintAvatarRequest):
    """
    Prepare ERC-7857 iNFT identity metadata and return tokenURI + metaHash for client-side minting.
    
    ERC-7857 flow:
      1. Backend builds metadata, uploads to 0G Storage → gets root_hash (URI)
      2. Backend computes metaHash = keccak256(root_hash)
      3. Client calls NarrativeINFT.safeMint(to, root_hash, metaHash) on-chain
    """
    try:
        if request.avatar_id not in AVATAR_NFT_METADATA:
            raise HTTPException(status_code=400, detail="Invalid avatar_id")

        # Build ERC-7857 / ERC-721 standard metadata
        metadata = AVATAR_NFT_METADATA[request.avatar_id].copy()
        metadata["minted_at"] = datetime.now().isoformat()
        metadata["owner"] = request.user_address
        metadata["status"] = "Active"
        metadata["stage"] = "newborn"           # ERC-7857 evolution stage
        metadata["origin"] = "Beyond The Fog - 0G Galileo Testnet"
        metadata["image"] = f"{BACKEND_URL}/assets/avatars/{request.avatar_id}.png"
        metadata["external_url"] = "https://beyondthefog.0g.ai"
        metadata["erc_standard"] = "ERC-7857"   # Signal compliance

        # Store metadata locally and build URI
        content_hash = store_metadata(metadata)
        token_uri = build_token_uri(content_hash, BACKEND_URL)

        # ERC-7857: compute metaHash = keccak256(token_uri) for on-chain verification
        from web3 import Web3
        meta_hash = Web3.keccak(text=token_uri).hex()

        logger.info(f"✅ ERC-7857 iNFT metadata prepared for {request.user_address}: {token_uri}")

        return {
            "success": True,
            "message": f"ERC-7857 iNFT metadata for {metadata['name']} prepared!",
            "root_hash": token_uri,       # URI passed to safeMint(to, uri, metaHash)
            "token_uri": token_uri,
            "meta_hash": meta_hash,       # bytes32 metaHash passed to safeMint
            "content_hash": content_hash,
            "nft_address": NARRATIVE_INFT_ADDRESS,
            "erc_standard": "ERC-7857"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in mint_avatar: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/game/evolve-inft")
async def evolve_inft(request: Dict[str, Any]):
    """
    ERC-7857 metadata evolution endpoint.
    Called when a player reaches a new stage (curious, master, wise, savior).
    Backend generates new metadata, uploads to 0G Storage, signs oracle proof, updates on-chain.
    """
    token_id = request.get("token_id")
    stage = request.get("stage")
    user_address = request.get("user_address")

    if token_id is None or not stage or not user_address:
        raise HTTPException(status_code=400, detail="token_id, stage, and user_address required")

    VALID_STAGES = ["curious", "master", "wise", "savior"]
    if stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    try:
        # Build evolved metadata
        stage_metadata = {
            "name": f"Narrative iNFT — {stage.capitalize()}",
            "description": f"This iNFT has evolved to the {stage} stage through gameplay on Beyond The Fog.",
            "stage": stage,
            "owner": user_address,
            "evolved_at": datetime.now().isoformat(),
            "origin": "Beyond The Fog - 0G Galileo Testnet",
            "erc_standard": "ERC-7857",
            "attributes": [
                {"trait_type": "Stage", "value": stage.capitalize()},
                {"trait_type": "Token ID", "value": str(token_id)}
            ]
        }

        # Upload to 0G Storage
        new_uri = await og_storage.upload_data(stage_metadata)
        if not new_uri:
            raise HTTPException(status_code=500, detail="Failed to upload evolved metadata to 0G Storage")

        # Call ERC-7857 updateMetadata on-chain (backend is the oracle)
        success = await og_storage.evolve_inft(int(token_id), new_uri)
        if not success:
            raise HTTPException(status_code=500, detail="On-chain metadata evolution failed")

        return {
            "success": True,
            "token_id": token_id,
            "new_stage": stage,
            "new_uri": new_uri,
            "message": f"iNFT #{token_id} evolved to {stage}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evolving iNFT: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metadata/{hash_hex}")
async def get_nft_metadata(hash_hex: str):
    """ERC-721 compatible metadata endpoint. Called by marketplaces and wallets."""
    metadata = get_metadata(hash_hex)
    if not metadata:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return metadata

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
