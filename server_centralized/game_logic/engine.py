# game_logic/engine.py
# The core GameEngine that manages the entire game lifecycle.

import json
import traceback
from .state_manager import GameState
from .llm_calls import GeminiAPI
from config import VILLAGER_ROSTER, FAMILIARITY_LEVELS

class GameEngine:
    def __init__(self, api_key: str):
        self.llm_api = GeminiAPI(api_key)

    def _build_fallback_quest_network(self, game_state: GameState):
        location = game_state.correct_location or "the old well"
        theme = game_state.story_theme or "Something in the village is hiding the truth."
        villagers = [v["name"] for v in game_state.villagers]

        primary_clue_templates = [
            f"Arthur Hobbs admits the village has been uneasy since strange signs began appearing near {location}.",
            f"Sam says he saw movement and fresh tracks leading toward {location} after sunset.",
            f"Elias warns that the village's sickness seems to gather around {location}, and says the air there feels wrong.",
            f"Leo noticed wet soil, dragged footprints, and broken plants pointing in the direction of {location}.",
            f"Markus recalls villagers quietly repairing damage near {location} before dawn, as if hiding something.",
            f"Edward Gable remembers old village records linking disappearances and whispered panic to {location}.",
            f"Gavin says the most suspicious gossip in town keeps circling back to {location}.",
            f"Father Thomas confesses that his deepest dread and prayers both keep returning to {location}.",
        ]

        followup_clue_templates = [
            f"Arthur Hobbs adds that anyone searching near {location} should look for disturbed ground and signs of recent passage.",
            f"Sam remembers hearing a strange call from the direction of {location} when the fog was thickest.",
            f"Elias says the old omens all point to {location}, especially where rot, damp, and silence gather together.",
            f"Leo swears the tracks near {location} were too heavy for one person, as if something was dragged there.",
            f"Markus admits tools and timber have gone missing whenever someone starts asking questions about {location}.",
            f"Edward Gable insists the oldest records describe {location} as a place villagers feared even before the recent disappearances.",
            f"Gavin quietly admits several villagers changed the subject whenever {location} came up in conversation.",
            f"Father Thomas says his prayers feel weakest near {location}, as if something there pushes back.",
        ]

        nodes = []
        for index, villager_name in enumerate(villagers):
            primary_content = primary_clue_templates[index] if index < len(primary_clue_templates) else f"{villager_name} points you toward {location}."
            followup_content = followup_clue_templates[index] if index < len(followup_clue_templates) else f"{villager_name} grows more certain that the truth lies at {location}."

            primary_node_id = f"node{index * 2 + 1}"
            followup_node_id = f"node{index * 2 + 2}"

            nodes.append({
                "node_id": primary_node_id,
                "villager_name": villager_name,
                "content": primary_content,
                "type": "Information",
                "priority": 5 if index < 4 else 3,
                "key_clue": index < 4,
                "preconditions": [],
                "required_familiarity": 0 if index < 2 else 1,
            })
            nodes.append({
                "node_id": followup_node_id,
                "villager_name": villager_name,
                "content": followup_content,
                "type": "Information",
                "priority": 4 if index < 4 else 2,
                "key_clue": index < 2,
                "preconditions": [primary_node_id],
                "required_familiarity": 1 if index < 2 else 2,
            })

        if nodes:
            nodes[0]["content"] += f" He speaks as if he knows the village secret: {theme}"

        return {"nodes": nodes}

    def _sanitize_quest_network(self, game_state: GameState, quest_network):
        valid_names = {villager["name"] for villager in game_state.villagers}
        raw_nodes = quest_network.get("nodes", []) if isinstance(quest_network, dict) else []
        sanitized_nodes = []
        seen_ids = set()

        for index, node in enumerate(raw_nodes, start=1):
            if not isinstance(node, dict):
                continue
            villager_name = node.get("villager_name")
            if villager_name not in valid_names:
                continue

            node_id = node.get("node_id") or f"node{index}"
            if node_id in seen_ids:
                node_id = f"{node_id}_{index}"
            seen_ids.add(node_id)

            sanitized_nodes.append({
                "node_id": node_id,
                "villager_name": villager_name,
                "content": node.get("content") or f"{villager_name} shares a clue about {game_state.correct_location}.",
                "type": node.get("type", "Information"),
                "priority": int(node.get("priority", 3)),
                "key_clue": bool(node.get("key_clue", False)),
                "preconditions": [p for p in node.get("preconditions", []) if isinstance(p, str)],
                "required_familiarity": node.get("required_familiarity", 0),
            })

        represented_villagers = {node["villager_name"] for node in sanitized_nodes}
        if len(sanitized_nodes) < max(4, len(valid_names) // 2) or len(represented_villagers) < max(3, len(valid_names) // 2):
            return self._build_fallback_quest_network(game_state)

        fallback_nodes = self._build_fallback_quest_network(game_state)["nodes"]
        for fallback_node in fallback_nodes:
            if fallback_node["villager_name"] not in represented_villagers:
                sanitized_nodes.append(fallback_node)

        valid_ids = {node["node_id"] for node in sanitized_nodes}
        for node in sanitized_nodes:
            node["preconditions"] = [p for p in node.get("preconditions", []) if p in valid_ids]

        return {"nodes": sanitized_nodes}

    def _build_fallback_dialogue(self, npc_name: str, clue_status: str, context_node, familiarity: int):
        exhausted_lines = {
            "Arthur Hobbs": "Arthur rubs his hands together and lowers his voice. \"I've told you what I can. Best follow those signs before the village notices.\"",
            "Sam": "Sam stares into the fog for a moment. \"That's all I remember clearly. If you follow the tracks, be quick about it.\"",
            "Elias": "Elias closes his eyes uneasily. \"The omen has already been spoken. The rest is for you to read in the village itself.\"",
            "Leo": "Leo wipes dirt from his hands. \"I've already given you the useful part. Check what I told you and you'll see it yourself.\"",
            "Markus": "Markus folds his arms. \"I've said enough. If something is wrong, you'll find proof where I pointed you.\"",
            "Edward Gable": "Edward straightens his coat impatiently. \"I do not intend to repeat myself. Use the evidence already in front of you.\"",
            "Gavin": "Gavin leans in, then backs off with a thin smile. \"You've got the valuable part already. Now see whether the village matches the gossip.\"",
            "Father Thomas": "Father Thomas looks troubled. \"I have shared what my conscience allowed. The rest must be faced where the darkness gathers.\"",
        }

        if clue_status == "CAN_REVEAL" and context_node:
            return {
                "npc_dialogue": f"{context_node['content']} You should follow that lead before the trail goes cold.",
                "player_responses": ["Tell me more.", "I will check that place.", "Thank you."],
                "node_revealed_id": context_node.get("node_id"),
                "new_familiarity_level": min(5, familiarity + 1),
            }

        if clue_status == "HAS_LOCKED_CLUES":
            return {
                "npc_dialogue": f"{npc_name} studies you carefully. \"I know more, but not enough to trust you with it yet.\"",
                "player_responses": ["I understand. I will come back later."],
                "node_revealed_id": None,
                "new_familiarity_level": min(5, familiarity + 1),
            }

        return {
            "npc_dialogue": exhausted_lines.get(npc_name, f"{npc_name} has already shared the most useful part of what they know."),
            "player_responses": ["Thank you for your help."],
            "node_revealed_id": None,
            "new_familiarity_level": familiarity,
        }

    def start_new_game(
        self,
        game_id: str,
        num_inaccessible_locations: int,
        difficulty: str,
        staked: bool = False,
        user_address: str = "",
        session_token: str = "",
    ) -> GameState:
        game_state = GameState(game_id, difficulty, staked, user_address, session_token)
        
        # 1. Generate the core story idea
        story_idea = None
        try:
            print("Attempting to generate story idea...")
            story_context = {"num_inaccessible_locations": num_inaccessible_locations}
            story_idea_json = self.llm_api.generate_content("StoryGenerator", story_context)
            if story_idea_json:
                story_idea = json.loads(story_idea_json)
                print("Story idea generated successfully.")
        except Exception as e:
            print(f"--- Warning: Story generation failed, using fallback. Error: {e} ---")

        if not story_idea:
            story_idea = {
                "story_theme": "The villagers are trapped in a collective dream maintained by a mysterious fungus in the well.",
                "inaccessible_locations": ["The Damp Cellar", "The Rotting Shed", "The Ivy Gate", "The Mossy Well", "The Fungal Grove"],
                "correct_location": "The Mossy Well"
            }
            print("Fallback story idea used.")

        game_state.story_theme = story_idea.get("story_theme")
        game_state.inaccessible_locations = story_idea.get("inaccessible_locations", [])
        game_state.correct_location = story_idea.get("correct_location")
        
        game_state.player_state["knowledge_summary"] = "You've just woken up in a cozy cottage. A kind old man named Arthur tells you he found you unconscious by a car wreck on the edge of the woods. He says he searched the area but saw no sign of your friends. As he speaks, you remember a faint, desperate call in your mind: 'Help us... find us...' You've just thanked him and stepped outside into the village square to begin your search."
        
        game_state.villagers = VILLAGER_ROSTER
        
        # Initialize state for all villagers
        for v in game_state.villagers:
            game_state.full_npc_memory[v["name"]] = []
            game_state.player_state["familiarity"][v["name"]] = 0
            game_state.player_state["unproductive_turns"][v["name"]] = 0

        # 2. Build the detailed Quest Network
        quest_network = None
        try:
            print("Attempting to generate quest network...")
            world_context = {
                "correctLocation": game_state.correct_location,
                "villagers": game_state.villagers,
                "difficulty": difficulty,
                "story_theme": game_state.story_theme
            }
            quest_network_json = self.llm_api.generate_content("WorldBuilder", world_context)
            if quest_network_json:
                quest_network = json.loads(quest_network_json)
                if quest_network.get("nodes"):
                    print("Quest network generated successfully.")
        except Exception as e:
            print(f"--- Warning: Quest network generation failed, using fallback. Error: {e} ---")

        if not quest_network:
            quest_network = self._build_fallback_quest_network(game_state)
            print("Fallback quest network used.")

        game_state.quest_network = self._sanitize_quest_network(game_state, quest_network)

        return game_state
    
    def get_villager_clue_status(self, game_state: GameState, npc_name: str):
        undiscovered_nodes = [
            node for node in game_state.quest_network.get("nodes", [])
            if node["villager_name"] == npc_name and node["node_id"] not in game_state.player_state["discovered_nodes"]
        ]

        if not undiscovered_nodes:
            return "PERMANENTLY_EXHAUSTED", None

        sorted_nodes = sorted(undiscovered_nodes, key=lambda x: x.get('priority', 0), reverse=True)

        for node in sorted_nodes:
            preconditions_met = all(p in game_state.player_state["discovered_nodes"] for p in node.get("preconditions", []))
            current_familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
            required_familiarity = node.get("required_familiarity")
            familiarity_met = required_familiarity is None or current_familiarity >= required_familiarity

            if preconditions_met and familiarity_met:
                return "CAN_REVEAL", node

        return "HAS_LOCKED_CLUES", sorted_nodes[0]

    def process_interaction_turn(self, game_state: GameState, npc_name: str, player_input: str, frustration: dict):
        clue_status, context_node = self.get_villager_clue_status(game_state, npc_name)

        villager_profile = next((v for v in game_state.villagers if v["name"] == npc_name), None)
        
        familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
        
        dialogue_turn = self.llm_api.generate_content("Interaction", {
            "villagerProfile": villager_profile,
            "chatHistory": game_state.full_npc_memory.get(npc_name, []),
            "player_last_response": player_input,
            "conversational_status": clue_status,
            "context_node": context_node,
            "frustration": frustration,
            "player_knowledge_summary": game_state.player_state["knowledge_summary"],
            "familiarity_level": familiarity,
            "familiarity_description": FAMILIARITY_LEVELS.get(familiarity, "Unknown"),
        })
        
        if not dialogue_turn:
            dialogue_data = self._build_fallback_dialogue(npc_name, clue_status, context_node, familiarity)
        else:
            try:
                dialogue_data = json.loads(dialogue_turn)
            except Exception:
                dialogue_data = self._build_fallback_dialogue(npc_name, clue_status, context_node, familiarity)
        
        game_state.full_npc_memory[npc_name].append({"role": "player", "content": player_input})
        game_state.full_npc_memory[npc_name].append({"role": "npc", "content": dialogue_data.get("npc_dialogue")})
        
        # LOGIC FIX: Enforce the "+1" familiarity rule in the engine
        new_familiarity = dialogue_data.get("new_familiarity_level")
        if new_familiarity is not None:
            old_familiarity = game_state.player_state["familiarity"].get(npc_name, 0)
            # Cap the increase at a maximum of 1
            if new_familiarity > old_familiarity + 1:
                new_familiarity = old_familiarity + 1
            game_state.player_state["familiarity"][npc_name] = new_familiarity

        revealed_node_id = dialogue_data.get("node_revealed_id")
        if revealed_node_id and revealed_node_id not in game_state.player_state["discovered_nodes"]:
            game_state.player_state["discovered_nodes"].append(revealed_node_id)
            all_discovered_content = [node['content'] for node in game_state.quest_network.get('nodes', []) if node['node_id'] in game_state.player_state['discovered_nodes']]
            game_state.player_state["knowledge_summary"] = "Key points discovered so far: " + "; ".join(all_discovered_content)

        print("\n\n" + "-"*20 + " CURRENT PLAYER STATE " + "-"*20)
        print(json.dumps(game_state.player_state, indent=2, default=str))
        print("-"*60 + "\n\n")

        return dialogue_data
