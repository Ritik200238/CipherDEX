// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AuctionClaim — Tradeable position NFT for auction and job winners
/// @notice Minted to winners of SealedAuction, BatchAuction, and FreelanceBidding.
///         Transferable — creates secondary market for positions.
///         Holder of the NFT at maturity receives the underlying value.
contract AuctionClaim is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct ClaimInfo {
        address sourceContract;
        uint256 sourceId;       // auctionId or jobId
        string claimType;       // "AUCTION" or "FREELANCE"
        uint256 mintedAt;
    }

    mapping(uint256 => ClaimInfo) public claims;
    uint256 public nextTokenId;

    error InvalidInput();

    event ClaimMinted(uint256 indexed tokenId, address indexed winner, address sourceContract, uint256 sourceId, string claimType);

    constructor(address admin) ERC721("CipherDEX Claim", "CLAIM") {
        if (admin == address(0)) revert InvalidInput();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint a claim NFT to an auction/job winner
    /// @param winner Address receiving the NFT
    /// @param sourceContract Contract that produced this claim (SealedAuction, FreelanceBidding, etc.)
    /// @param sourceId The auction or job ID
    /// @param claimType Human-readable type ("AUCTION", "BATCH", "FREELANCE")
    function mint(
        address winner,
        address sourceContract,
        uint256 sourceId,
        string calldata claimType
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (winner == address(0)) revert InvalidInput();
        if (sourceContract == address(0)) revert InvalidInput();

        tokenId = nextTokenId++;
        _mint(winner, tokenId);

        claims[tokenId] = ClaimInfo({
            sourceContract: sourceContract,
            sourceId: sourceId,
            claimType: claimType,
            mintedAt: block.timestamp
        });

        emit ClaimMinted(tokenId, winner, sourceContract, sourceId, claimType);
    }

    /// @notice Get claim details
    function getClaim(uint256 tokenId) external view returns (
        address sourceContract, uint256 sourceId, string memory claimType, uint256 mintedAt
    ) {
        ClaimInfo storage c = claims[tokenId];
        return (c.sourceContract, c.sourceId, c.claimType, c.mintedAt);
    }

    /// @notice Total claims minted
    function totalClaims() external view returns (uint256) {
        return nextTokenId;
    }

    /// @dev Required override for AccessControl + ERC721
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
