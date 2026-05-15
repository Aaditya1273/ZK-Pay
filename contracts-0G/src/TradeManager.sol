// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TradeManager is Ownable {
    
    struct Trade {
        address creator;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    Trade[] public trades;
    IERC20 public fogCoin;

    event TradeCreated(uint256 indexed tradeId, address indexed creator, uint256 tokenId, uint256 price);
    event TradeCompleted(uint256 indexed tradeId, address indexed buyer);
    event TradeCancelled(uint256 indexed tradeId);

    constructor(address _fogCoin) Ownable(msg.sender) {
        fogCoin = IERC20(_fogCoin);
    }

    function createTrade(address nftContract, uint256 tokenId, uint256 price) external {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        trades.push(Trade({
            creator: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        }));
        
        emit TradeCreated(trades.length - 1, msg.sender, tokenId, price);
    }

    function completeTrade(uint256 tradeId) external {
        Trade storage trade = trades[tradeId];
        require(trade.active, "Trade not active");
        
        trade.active = false;
        fogCoin.transferFrom(msg.sender, trade.creator, trade.price);
        IERC721(trade.nftContract).safeTransferFrom(address(this), msg.sender, trade.tokenId);
        
        emit TradeCompleted(tradeId, msg.sender);
    }

    function cancelTrade(uint256 tradeId) external {
        Trade storage trade = trades[tradeId];
        require(msg.sender == trade.creator, "Not creator");
        require(trade.active, "Trade not active");
        
        trade.active = false;
        IERC721(trade.nftContract).safeTransferFrom(address(this), trade.creator, trade.tokenId);
        
        emit TradeCancelled(tradeId);
    }
}
