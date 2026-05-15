// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FogCoin
 * @dev The utility token for Beyond The Fog. Includes a faucet for testnet distribution.
 */
contract FogCoin is ERC20, Ownable {
    
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 FOG
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    mapping(address => uint256) public lastFaucetRequest;

    event FaucetDrip(address indexed user, uint256 amount);

    constructor() ERC20("FogCoin", "FOG") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10**decimals()); // Initial supply for liquidity/rewards
    }

    /**
     * @dev Testnet Faucet to allow users to get FOG tokens.
     */
    function requestTokens() external {
        require(block.timestamp >= lastFaucetRequest[msg.sender] + FAUCET_COOLDOWN, "Faucet cooldown active");
        
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetDrip(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Admin function to mint tokens if needed for rewards.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
