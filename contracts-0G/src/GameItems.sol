// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameItems is ERC1155, Ownable {
    
    // Item IDs
    uint256 public constant RUSTY_KEY = 0;
    uint256 public constant FOG_LANTERN = 1;
    uint256 public constant ANCIENT_MAP = 2;

    constructor() ERC1155("https://api.beyondthefog.com/metadata/{id}.json") Ownable(msg.sender) {
        _mint(msg.sender, RUSTY_KEY, 1000, "");
        _mint(msg.sender, FOG_LANTERN, 500, "");
        _mint(msg.sender, ANCIENT_MAP, 100, "");
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyOwner {
        _mint(account, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
}
