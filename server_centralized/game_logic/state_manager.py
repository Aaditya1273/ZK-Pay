# game_logic/state_manager.py
# Defines the GameState class, which holds all dynamic data for a single playthrough.

class GameState:
    def __init__(
        self,
        game_id: str,
        difficulty: str,
        staked: bool = False,
        user_address: str = "",
        session_token: str = "",
    ):
        self.game_id = game_id
        self.difficulty = difficulty
        self.staked = staked
        self.user_address = user_address
        self.session_token = session_token
        self.correct_location = ""
        self.story_theme = ""
        self.inaccessible_locations = []
        self.quest_network = {"nodes": []}
        self.villagers = [] # Each game session will store its own list of villagers
        self.player_state = {
            "discovered_nodes": [],
            "knowledge_summary": "You've just woken up in a cozy cottage...",
            "familiarity": {},
            "unproductive_turns": {} # Tracks turns since last clue for each villager
        }
        self.full_npc_memory = {}

    def to_dict(self):
        return {
            "game_id": self.game_id,
            "difficulty": self.difficulty,
            "staked": self.staked,
            "user_address": self.user_address,
            "session_token": self.session_token,
            "correct_location": self.correct_location,
            "story_theme": self.story_theme,
            "inaccessible_locations": self.inaccessible_locations,
            "quest_network": self.quest_network,
            "villagers": self.villagers,
            "player_state": self.player_state,
            "full_npc_memory": self.full_npc_memory
        }

    @staticmethod
    def from_dict(data):
        state = GameState(
            data["game_id"], 
            data["difficulty"], 
            data.get("staked", False),
            data.get("user_address", ""),
            data.get("session_token", ""),
        )
        state.correct_location = data.get("correct_location", "")
        state.story_theme = data.get("story_theme", "")
        state.inaccessible_locations = data.get("inaccessible_locations", [])
        state.quest_network = data.get("quest_network", {"nodes": []})
        state.villagers = data.get("villagers", [])
        state.player_state = data.get("player_state", {})
        state.full_npc_memory = data.get("full_npc_memory", {})
        return state
