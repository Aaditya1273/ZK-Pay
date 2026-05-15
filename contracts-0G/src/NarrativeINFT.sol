// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NarrativeINFT
 * @dev Intelligent NFTs that track narrative progress. 
 * The metadata URI typically points to a gateway for 0G Storage.
 */
contract NarrativeINFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event MetadataUpdated(uint256 indexed tokenId, string newUri);

    constructor() ERC721("Narrative iNFT", "iNFT") Ownable(msg.sender) {}

    /**
     * @dev Mints a new iNFT to a player.
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev Updates the metadata URI for an existing NFT.
     * Used when the character/item evolves based on game actions.
     */
    function updateMetadata(uint256 tokenId, string memory newUri) external onlyOwner {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId, newUri);
    }
}
