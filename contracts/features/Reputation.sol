// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint8, euint64, InEuint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IPlatformRegistry} from "../interfaces/IPlatformRegistry.sol";

/// @title Reputation — Private trade reputation system
/// @notice After trades, both parties rate each other (encrypted 1-5 score).
///         Average computed on encrypted data. Only the rated user can see their own score.
/// @dev NON-BLOCKING: Feature contracts emit TradeCompleted events; Reputation reads them
///      via recordTrade(). If Reputation fails, all trading continues normally.
contract Reputation {
    IPlatformRegistry public registry;

    /// @notice Sum of all encrypted ratings received by a user
    mapping(address => euint64) private totalScores;

    /// @notice Plaintext trade count (no privacy issue — visible from events anyway)
    mapping(address => uint256) public tradeCounts;

    /// @notice Prevents double-rating: keccak256(rater, rated, tradeId)
    mapping(bytes32 => bool) private hasRated;

    /// @notice Authorized callers (feature contracts that can record trades)
    mapping(address => bool) public authorizedCallers;

    /// @notice Cached average reputation (computed on-demand by user)
    mapping(address => euint64) private cachedReputation;

    /// @notice Admin address for managing authorized callers
    address public admin;

    // Pre-encrypted constants for rating validation
    euint8 private EUINT8_ONE;
    euint8 private EUINT8_FIVE;
    euint64 private EUINT64_ZERO;

    event TradeRecorded(address indexed partyA, address indexed partyB);
    event RatingSubmitted(address indexed rater, address indexed rated);
    event ReputationComputed(address indexed user, uint256 tradeCount);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAuthorizedCaller() {
        require(authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    constructor(address _registry, address _admin) {
        require(_registry != address(0) && _admin != address(0), "Zero address");
        registry = IPlatformRegistry(_registry);
        admin = _admin;

        // Pre-encrypt constants
        EUINT8_ONE = FHE.asEuint8(1);
        EUINT8_FIVE = FHE.asEuint8(5);
        EUINT64_ZERO = FHE.asEuint64(0);
        FHE.allowThis(EUINT8_ONE);
        FHE.allowThis(EUINT8_FIVE);
        FHE.allowThis(EUINT64_ZERO);
    }

    /// @notice Record a completed trade between two parties
    /// @dev Called by feature contracts (OrderBook, Auction, Escrow, OTC)
    /// @dev Non-blocking: if this reverts, the calling contract's trade still succeeds
    ///      because feature contracts use try/catch or emit events instead of direct calls
    function recordTrade(address partyA, address partyB) external onlyAuthorizedCaller {
        require(partyA != partyB, "Self-trade");
        tradeCounts[partyA]++;
        tradeCounts[partyB]++;
        emit TradeRecorded(partyA, partyB);
    }

    /// @notice Submit an encrypted rating for a trade counterparty
    /// @dev FHE ops: gte(1), lte(1), and(1), select(1), add(1) = 5 ops
    /// @dev Validates rating is 1-5 using encrypted comparison
    /// @param counterparty Address being rated
    /// @param encRating Encrypted rating (must be 1-5)
    /// @param tradeId Unique trade identifier (to prevent double-rating)
    function submitRating(
        address counterparty,
        InEuint8 calldata encRating,
        uint256 tradeId
    ) external {
        require(counterparty != msg.sender, "Cannot rate self");
        require(counterparty != address(0), "Zero address");

        bytes32 ratingKey = keccak256(abi.encodePacked(msg.sender, counterparty, tradeId));
        require(!hasRated[ratingKey], "Already rated");

        euint8 rating = FHE.asEuint8(encRating);

        // Validate rating is in range [1, 5] using encrypted comparison
        ebool aboveMin = FHE.gte(rating, EUINT8_ONE);
        ebool belowMax = FHE.lte(rating, EUINT8_FIVE);
        ebool validRating = FHE.and(aboveMin, belowMax);

        // If invalid rating, use 0 (doesn't affect score). If valid, use the rating.
        euint8 validatedRating = FHE.select(validRating, rating, FHE.asEuint8(0));

        // Cast euint8 → euint64 for accumulation (uses FHE.asEuint64(euint8) overload)
        euint64 ratingAsU64 = FHE.asEuint64(validatedRating);
        FHE.allowThis(ratingAsU64);

        totalScores[counterparty] = FHE.add(totalScores[counterparty], ratingAsU64);
        FHE.allowThis(totalScores[counterparty]);

        hasRated[ratingKey] = true;
        emit RatingSubmitted(msg.sender, counterparty);
    }

    /// @notice Compute own average reputation
    /// @dev FHE ops: div(1, plaintext tradeCount) = 1 op
    /// @dev Only the user themselves can call this and unseal the result
    function computeMyReputation() external returns (euint64) {
        require(tradeCounts[msg.sender] > 0, "No trades");

        // Division: trivially encrypt the plaintext count, then divide two encrypted values
        euint64 avgRep = FHE.div(totalScores[msg.sender], FHE.asEuint64(uint256(tradeCounts[msg.sender])));

        // ACL: contract stores, user can unseal
        FHE.allowThis(avgRep);
        FHE.allowSender(avgRep);

        cachedReputation[msg.sender] = avgRep;
        emit ReputationComputed(msg.sender, tradeCounts[msg.sender]);
        return avgRep;
    }

    /// @notice Read own reputation handle (for unsealing via cofhejs)
    function getMyReputation() external view returns (euint64) {
        return cachedReputation[msg.sender];
    }

    /// @notice Get plaintext trade count for any user
    function getTradeCount(address user) external view returns (uint256) {
        return tradeCounts[user];
    }

    // ─── Admin ──────────────────────────────────────────────

    function addAuthorizedCaller(address caller) external onlyAdmin {
        require(caller != address(0), "Zero address");
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    function removeAuthorizedCaller(address caller) external onlyAdmin {
        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }
}
