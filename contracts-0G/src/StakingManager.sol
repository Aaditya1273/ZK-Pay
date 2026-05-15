// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingManager is Ownable {
    IERC20 public fogCoin;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake) public stakes;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    constructor(address _fogCoin) Ownable(msg.sender) {
        fogCoin = IERC20(_fogCoin);
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        fogCoin.transferFrom(msg.sender, address(this), amount);
        
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].timestamp = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }

    function unstake() external {
        uint256 amount = stakes[msg.sender].amount;
        require(amount > 0, "No stake to withdraw");
        
        stakes[msg.sender].amount = 0;
        totalStaked -= amount;
        fogCoin.transfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    function getStake(address user) external view returns (uint256) {
        return stakes[user].amount;
    }
}
