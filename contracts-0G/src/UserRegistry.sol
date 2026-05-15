// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserRegistry
 * @dev Stores and manages player dialogue state anchored to 0G Storage.
 */
contract UserRegistry is Ownable {
    
    struct UserData {
        bool isRegistered;
        string latestDialogueRootHash;
        uint256 lastUpdated;
    }

    mapping(address => UserData) private users;
    
    event UserRegistered(address indexed user);
    event DialogueRootUpdated(address indexed user, string rootHash);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Registers a new player in the system.
     */
    function registerUser() external {
        require(!users[msg.sender].isRegistered, "User already registered");
        users[msg.sender].isRegistered = true;
        users[msg.sender].lastUpdated = block.timestamp;
        emit UserRegistered(msg.sender);
    }

    /**
     * @dev Updates the dialogue root hash for the caller.
     * @param _rootHash The Merkle root hash of the dialogue data stored in 0G Storage.
     */
    function updateDialogueRoot(string calldata _rootHash) external {
        require(users[msg.sender].isRegistered, "User not registered");
        users[msg.sender].latestDialogueRootHash = _rootHash;
        users[msg.sender].lastUpdated = block.timestamp;
        emit DialogueRootUpdated(msg.sender, _rootHash);
    }

    /**
     * @dev Checks if a user is registered.
     */
    function isUserRegistered(address user) external view returns (bool) {
        return users[user].isRegistered;
    }

    /**
     * @dev Retrieves the latest dialogue root hash for a user.
     */
    function latestDialogueRootHash(address user) external view returns (string memory) {
        return users[user].latestDialogueRootHash;
    }

    /**
     * @dev Retrieves the last update timestamp for a user.
     */
    function getLastUpdated(address user) external view returns (uint256) {
        return users[user].lastUpdated;
    }
}
