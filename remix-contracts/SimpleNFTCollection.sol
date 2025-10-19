// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleNFTCollection
 * @dev A shared NFT collection where anyone can mint their NFTs
 * No payment required - completely free minting for all users
 */
contract SimpleNFTCollection is ERC721, ERC721URIStorage, Ownable {
    
    // Counter for token IDs
    uint256 private _nextTokenId;
    
    // Mapping to track who created which NFT
    mapping(uint256 => address) public nftCreator;
    
    // Mapping to track all NFTs created by an address
    mapping(address => uint256[]) private _creatorTokens;
    
    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string uri
    );
    
    constructor() ERC721("opBNB AI NFT Collection", "OPBNB-NFT") Ownable(msg.sender) {
        _nextTokenId = 1; // Start from token ID 1
    }
    
    /**
     * @dev Mint a new NFT to the caller's address
     * @param uri The metadata URI (IPFS, Greenfield, or data URI)
     * @return tokenId The ID of the newly minted NFT
     */
    function mint(string calldata uri) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        // Mint NFT to the sender
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Track creator
        nftCreator[tokenId] = msg.sender;
        _creatorTokens[msg.sender].push(tokenId);
        
        emit NFTMinted(tokenId, msg.sender, uri);
        
        return tokenId;
    }
    
    /**
     * @dev Mint NFT to a specific address (gift NFT)
     * @param to The address to receive the NFT
     * @param uri The metadata URI
     * @return tokenId The ID of the newly minted NFT
     */
    function mintTo(address to, string calldata uri) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId++;
        
        // Mint NFT to specified address
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Track creator (the person who initiated the mint, not the recipient)
        nftCreator[tokenId] = msg.sender;
        _creatorTokens[msg.sender].push(tokenId);
        
        emit NFTMinted(tokenId, msg.sender, uri);
        
        return tokenId;
    }
    
    /**
     * @dev Batch mint multiple NFTs at once
     * @param uris Array of metadata URIs
     * @return tokenIds Array of newly minted token IDs
     */
    function batchMint(string[] calldata uris) external returns (uint256[] memory) {
        require(uris.length > 0 && uris.length <= 50, "Invalid batch size");
        
        uint256[] memory tokenIds = new uint256[](uris.length);
        
        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _nextTokenId++;
            
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, uris[i]);
            
            nftCreator[tokenId] = msg.sender;
            _creatorTokens[msg.sender].push(tokenId);
            
            tokenIds[i] = tokenId;
            
            emit NFTMinted(tokenId, msg.sender, uris[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get all token IDs created by a specific address
     * @param creator The address to query
     * @return Array of token IDs
     */
    function getTokensByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }
    
    /**
     * @dev Get the total number of NFTs minted
     * @return Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev Get the creator of a specific NFT
     * @param tokenId The token ID to query
     * @return The address of the creator
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftCreator[tokenId];
    }
    
    /**
     * @dev Check if a token exists
     * @param tokenId The token ID to check
     * @return Boolean indicating if token exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
