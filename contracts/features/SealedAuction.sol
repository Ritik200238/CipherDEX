// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, euint128, InEuint128, eaddress, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISettlementVault} from "../interfaces/ISettlementVault.sol";
import {IPlatformRegistry} from "../interfaces/IPlatformRegistry.sol";
import {FHEConstants} from "../libraries/FHEConstants.sol";

/// @title SealedAuction — Sealed-bid token auctions with anti-snipe timer
/// @notice Seller lists tokens, bidders submit encrypted bids. FHE.gt() + FHE.max()
///         find the highest bid without revealing any losing bids. Anti-snipe extends
///         deadline on late bids (amount stays hidden).
/// @dev Async 2-step flow: closeAuction → wait → revealWinner → settleAuction
contract SealedAuction is ReentrancyGuard, FHEConstants {
    enum AuctionStatus { OPEN, CLOSED, REVEALED, SETTLED, CANCELLED }

    struct Auction {
        address seller;
        address token;           // Token being auctioned
        address paymentToken;    // Token bidders pay with
        uint256 amount;          // Plaintext: what's for sale (public for discoverability)
        uint256 deadline;        // Plaintext: public deadline
        uint256 originalDeadline;
        uint256 bidCount;        // Plaintext: number of bids (not amounts)
        euint128 highestBid;     // ENCRYPTED until reveal
        eaddress highestBidder;  // ENCRYPTED until reveal
        uint128 revealedBid;     // Set after async decrypt
        address revealedBidder;  // Set after async decrypt
        AuctionStatus status;
        uint256 snipeExtension;  // Seconds to extend on late bids
    }

    ISettlementVault public vault;
    IPlatformRegistry public registry;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => euint128)) private bids;
    mapping(uint256 => mapping(address => bool)) public hasBid;
    uint256 public nextAuctionId;

    uint256 public constant DEFAULT_SNIPE_WINDOW = 60;      // Last 60 seconds
    uint256 public constant DEFAULT_SNIPE_EXTENSION = 120;   // Extend by 2 minutes
    uint256 public constant MIN_DURATION = 300;               // 5 minutes minimum

    event AuctionCreated(uint256 indexed auctionId, address indexed seller, address token, uint256 amount, uint256 deadline);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 newDeadline);
    event AuctionClosed(uint256 indexed auctionId);
    event WinnerRevealed(uint256 indexed auctionId, address winner, uint128 winningBid);
    event AuctionSettled(uint256 indexed auctionId);
    event AuctionCancelled(uint256 indexed auctionId);
    event TradeCompleted(address indexed partyA, address indexed partyB, uint256 auctionId);

    modifier whenNotPaused() {
        require(!registry.paused(), "Platform paused");
        _;
    }

    constructor(address _vault, address _registry) {
        require(_vault != address(0) && _registry != address(0), "Zero address");
        vault = ISettlementVault(_vault);
        registry = IPlatformRegistry(_registry);
        _initFHEConstants();
    }

    /// @notice Seller creates a new auction
    /// @param token Token being auctioned
    /// @param paymentToken Token bidders pay with
    /// @param amount Amount of tokens for sale (plaintext)
    /// @param duration Auction duration in seconds
    /// @param snipeExtension Seconds to extend on late bids (0 = use default)
    function createAuction(
        address token,
        address paymentToken,
        uint256 amount,
        uint256 duration,
        uint256 snipeExtension
    ) external whenNotPaused returns (uint256 auctionId) {
        require(token != paymentToken, "Same token");
        require(amount > 0, "Zero amount");
        require(duration >= MIN_DURATION, "Duration too short");

        auctionId = nextAuctionId++;
        uint256 deadline = block.timestamp + duration;
        uint256 ext = snipeExtension > 0 ? snipeExtension : DEFAULT_SNIPE_EXTENSION;

        // Initialize encrypted highest bid to 0 and bidder to zero address
        euint128 initBid = FHE.asEuint128(0);
        eaddress initBidder = FHE.asEaddress(address(0));
        FHE.allowThis(initBid);
        FHE.allowThis(initBidder);

        auctions[auctionId] = Auction({
            seller: msg.sender,
            token: token,
            paymentToken: paymentToken,
            amount: amount,
            deadline: deadline,
            originalDeadline: deadline,
            bidCount: 0,
            highestBid: initBid,
            highestBidder: initBidder,
            revealedBid: 0,
            revealedBidder: address(0),
            status: AuctionStatus.OPEN,
            snipeExtension: ext
        });

        emit AuctionCreated(auctionId, msg.sender, token, amount, deadline);
    }

    /// @notice Submit an encrypted bid on an auction
    /// @dev FHE ops: gt(1), max(1), select(1) = 3 ops per bid
    /// @dev Anti-snipe: if bid is in last SNIPE_WINDOW seconds, extends deadline
    function bid(uint256 auctionId, InEuint128 calldata encBidAmount)
        external
        whenNotPaused
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.OPEN, "Auction not open");
        require(block.timestamp < auction.deadline, "Auction expired");
        require(auction.seller != msg.sender, "Seller cannot bid");
        require(!hasBid[auctionId][msg.sender], "Already bid");

        euint128 newBid = FHE.asEuint128(encBidAmount);

        // Core FHE: compare new bid against current highest
        ebool isHigher = FHE.gt(newBid, auction.highestBid);

        // Update highest bid and bidder using encrypted conditional logic
        auction.highestBid = FHE.max(newBid, auction.highestBid);
        auction.highestBidder = FHE.select(isHigher, FHE.asEaddress(msg.sender), auction.highestBidder);

        // ACL: contract needs persistent access for future comparisons
        FHE.allowThis(auction.highestBid);
        FHE.allowThis(auction.highestBidder);

        // Store individual bid (bidder can unseal their own bid later)
        bids[auctionId][msg.sender] = newBid;
        FHE.allowThis(newBid);
        FHE.allow(newBid, msg.sender);

        hasBid[auctionId][msg.sender] = true;
        auction.bidCount++;

        // Anti-snipe: extend deadline if bid is in the last SNIPE_WINDOW seconds
        // Note: this reveals that A bid was placed (timing metadata), but NOT the amount
        uint256 newDeadline = auction.deadline;
        if (block.timestamp > auction.deadline - DEFAULT_SNIPE_WINDOW) {
            newDeadline = block.timestamp + auction.snipeExtension;
            auction.deadline = newDeadline;
        }

        emit BidPlaced(auctionId, msg.sender, newDeadline);
    }

    /// @notice Seller closes the auction and requests async decryption of winner
    /// @dev Triggers 2-step async decryption. Must wait before calling revealWinner.
    function closeAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(auction.seller == msg.sender, "Not seller");
        require(auction.status == AuctionStatus.OPEN, "Not open");
        require(block.timestamp >= auction.deadline, "Auction still active");
        require(auction.bidCount > 0, "No bids");

        // Request async decryption of highest bid and bidder
        FHE.decrypt(auction.highestBid);
        FHE.decrypt(auction.highestBidder);

        auction.status = AuctionStatus.CLOSED;
        emit AuctionClosed(auctionId);
    }

    /// @notice Retrieve decrypted winner after async processing
    /// @dev Must be called after closeAuction, once co-processor returns results
    function revealWinner(uint256 auctionId)
        external
        returns (uint128 winningBid, address winner)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.CLOSED, "Not closed");

        // Safe retrieval: returns (value, isReady)
        (uint128 bidValue, bool bidReady) = FHE.getDecryptResultSafe(auction.highestBid);
        require(bidReady, "Bid not yet decrypted");

        (address bidderValue, bool bidderReady) = FHE.getDecryptResultSafe(auction.highestBidder);
        require(bidderReady, "Bidder not yet decrypted");

        auction.revealedBid = bidValue;
        auction.revealedBidder = bidderValue;
        auction.status = AuctionStatus.REVEALED;

        emit WinnerRevealed(auctionId, bidderValue, bidValue);
        return (bidValue, bidderValue);
    }

    /// @notice Settle the auction — transfer tokens to winner, payment to seller
    /// @dev Uses plaintext revealed values. Settlement via vault.
    function settleAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.REVEALED, "Not revealed");

        address winner = auction.revealedBidder;
        require(winner != address(0), "No winner");

        // Encrypt the settlement amounts for vault (vault works with euint64)
        euint64 auctionAmount = FHE.asEuint64(uint64(auction.amount));
        euint64 paymentAmount = FHE.asEuint64(uint64(auction.revealedBid));

        // Allow vault to access these amounts
        FHE.allowThis(auctionAmount);
        FHE.allowThis(paymentAmount);
        FHE.allowTransient(auctionAmount, address(vault));
        FHE.allow(auctionAmount, address(vault));
        FHE.allowTransient(paymentAmount, address(vault));
        FHE.allow(paymentAmount, address(vault));

        // Transfer auctioned tokens: seller → winner
        vault.settleTrade(auction.seller, winner, auction.token, auctionAmount);

        // Transfer payment: winner → seller
        vault.settleTrade(winner, auction.seller, auction.paymentToken, paymentAmount);

        auction.status = AuctionStatus.SETTLED;

        emit TradeCompleted(auction.seller, winner, auctionId);
        emit AuctionSettled(auctionId);
    }

    /// @notice Cancel auction if no bids placed (seller only)
    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(auction.seller == msg.sender, "Not seller");
        require(auction.status == AuctionStatus.OPEN, "Not open");
        require(auction.bidCount == 0, "Has bids");

        auction.status = AuctionStatus.CANCELLED;
        emit AuctionCancelled(auctionId);
    }

    /// @notice Bidder views their own bid handle (for unsealing)
    function getMyBid(uint256 auctionId) external view returns (euint128) {
        require(hasBid[auctionId][msg.sender], "No bid placed");
        return bids[auctionId][msg.sender];
    }

    /// @notice Get auction details
    function getAuction(uint256 auctionId) external view returns (
        address seller,
        address token,
        address paymentToken,
        uint256 amount,
        uint256 deadline,
        uint256 bidCount,
        AuctionStatus status,
        uint128 revealedBid,
        address revealedBidder
    ) {
        Auction storage a = auctions[auctionId];
        return (a.seller, a.token, a.paymentToken, a.amount, a.deadline,
                a.bidCount, a.status, a.revealedBid, a.revealedBidder);
    }

    /// @notice Get total auctions created
    function getAuctionCount() external view returns (uint256) {
        return nextAuctionId;
    }
}
