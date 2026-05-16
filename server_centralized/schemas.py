from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional

class NewGameRequest(BaseModel):
    difficulty: str = "medium"
    num_inaccessible_locations: int = 5
    staked: bool = False
    user_address: str = Field(..., description="Player wallet address")

class NewGameResponse(BaseModel):
    game_id: str
    status: str
    inaccessible_locations: List[str]
    villagers: List[Dict]
    user_address: str
    session_token: str

class InteractRequest(BaseModel):
    villager_id: str
    player_prompt: Optional[str] = None
    user_address: str
    session_token: str

class CompleteGameRequest(BaseModel):
    game_id: str
    user_address: str = Field(..., description="Player's wallet address (0x...)")
    session_token: str
    score: int = Field(..., ge=0)
    won: bool
    is_true_ending: bool = False

    @field_validator('user_address')
    @classmethod
    def validate_user_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v

    @field_validator('score')
    @classmethod
    def validate_score(cls, v):
        if v < 0:
            raise ValueError("Score cannot be negative")
        return v

class ResumeGameRequest(BaseModel):
    user_address: str

    @field_validator('user_address')
    @classmethod
    def validate_user_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v

class MintItemRequest(BaseModel):
    user_address: str
    item_name: str
    session_token: str

    @field_validator('user_address')
    @classmethod
    def validate_user_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v

class MintAvatarRequest(BaseModel):
    user_address: str = Field(..., description="Player's wallet address")
    avatar_id: str = Field(..., description="Selected avatar ID (mc_1, mc_2, etc)")

class InteractResponse(BaseModel):
    villager_id: str
    villager_name: str
    npc_dialogue: str
    player_suggestions: List[str]
    # Clue progress — surfaced to frontend for journal + INVESTIGATE gating
    node_revealed_id: Optional[str] = None
    node_revealed_content: Optional[str] = None
    discovered_clues_count: int = 0
    key_clues_found: int = 0
    total_key_clues: int = 0

class GuessRequest(BaseModel):
    location_name: str
    user_address: str
    session_token: str

    @field_validator('user_address')
    @classmethod
    def validate_user_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v

class GuessResponse(BaseModel):
    is_correct: bool
    is_true_ending: bool
    message: str
