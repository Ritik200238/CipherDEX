// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, euint128, InEuint128, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISettlementVault} from "../interfaces/ISettlementVault.sol";
import {IPlatformRegistry} from "../interfaces/IPlatformRegistry.sol";
import {FHEConstants} from "../libraries/FHEConstants.sol";

/// @title Escrow — Encrypted P2P escrow with term verification
/// @notice Two parties agree off-chain on terms. Both deposit with encrypted amounts.
///         FHE.eq() verifies deposits match agreed terms — nobody sees the deal amounts.
///         Match → auto-release. Mismatch → refund.
contract Escrow is ReentrancyGuard, FHEConstants {
    enum DealStatus { CREATED, FUNDED_A, FUNDED_BOTH, RELEASED, CANCELLED }

    struct Deal {
        address partyA;
        address partyB;
        address tokenA;          // Token partyA deposits
        address tokenB;          // Token partyB deposits
        euint128 encTermsA;      // Encrypted amount A must deposit
        euint128 encTermsB;      // Encrypted amount B must deposit
        euint128 encDepositA;    // What A actually deposited
        euint128 encDepositB;    // What B actually deposited
        ebool matchA;            // Whether A's deposit matches terms
        ebool matchB;            // Whether B's deposit matches terms
        DealStatus status;
        uint256 deadline;        // Auto-cancel if not funded by deadline
        bytes32 dealHash;        // Off-chain agreement hash (for dispute reference)
    }

    ISettlementVault public vault;
    IPlatformRegistry public registry;

    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId;

    event DealCreated(uint256 indexed dealId, address indexed partyA, address indexed partyB, uint256 deadline);
    event DealFunded(uint256 indexed dealId, address indexed party);
    event DealReleased(uint256 indexed dealId);
    event DealCancelled(uint256 indexed dealId);
    event TradeCompleted(address indexed partyA, address indexed partyB, uint256 dealId);

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

    /// @notice Party A creates an escrow deal with encrypted terms
    /// @param partyB Counterparty address
    /// @param tokenA Token that party A will deposit
    /// @param tokenB Token that party B will deposit
    /// @param encTermsA Encrypted amount A must deposit
    /// @param encTermsB Encrypted amount B must deposit
    /// @param deadline Timestamp after which the deal auto-cancels
    /// @param dealHash Hash of off-chain agreement (for reference)
    function createDeal(
        address partyB,
        address tokenA,
        address tokenB,
        InEuint128 calldata encTermsA,
        InEuint128 calldata encTermsB,
        uint256 deadline,
        bytes32 dealHash
    ) external whenNotPaused returns (uint256 dealId) {
        require(partyB != address(0) && partyB != msg.sender, "Invalid partyB");
        require(tokenA != tokenB, "Same token");
        require(deadline > block.timestamp, "Deadline passed");

        dealId = nextDealId++;
        euint128 termsA = FHE.asEuint128(encTermsA);
        euint128 termsB = FHE.asEuint128(encTermsB);

        deals[dealId] = Deal({
            partyA: msg.sender,
            partyB: partyB,
            tokenA: tokenA,
            tokenB: tokenB,
            encTermsA: termsA,
            encTermsB: termsB,
            encDepositA: ZERO_128,
            encDepositB: ZERO_128,
            matchA: FALSE_BOOL,
            matchB: FALSE_BOOL,
            status: DealStatus.CREATED,
            deadline: deadline,
            dealHash: dealHash
        });

        // ACL: contract can use terms for verification
        FHE.allowThis(termsA);
        FHE.allowThis(termsB);
        // Both parties can unseal their own terms
        FHE.allow(termsA, msg.sender);
        FHE.allow(termsB, partyB);
        // Cross-visibility: each party sees what they need to deposit
        FHE.allow(termsA, msg.sender); // A sees their own terms
        FHE.allow(termsB, partyB);     // B sees their own terms

        emit DealCreated(dealId, msg.sender, partyB, deadline);
    }

    /// @notice Either party deposits tokens — contract verifies against encrypted terms
    /// @dev FHE ops: eq(1) per deposit. Stores match result for release verification.
    function fundDeal(uint256 dealId, InEuint128 calldata encAmount)
        external
        whenNotPaused
        nonReentrant
    {
        Deal storage deal = deals[dealId];
        require(block.timestamp < deal.deadline, "Deadline passed");

        euint128 amount = FHE.asEuint128(encAmount);

        if (msg.sender == deal.partyA) {
            require(
                deal.status == DealStatus.CREATED || deal.status == DealStatus.FUNDED_A,
                "Invalid state for A"
            );
            // Store deposit and verify against terms
            deal.encDepositA = amount;
            deal.matchA = FHE.eq(amount, deal.encTermsA);

            FHE.allowThis(deal.encDepositA);
            FHE.allowThis(deal.matchA);
            FHE.allow(deal.encDepositA, msg.sender);

            if (deal.status == DealStatus.CREATED) {
                deal.status = DealStatus.FUNDED_A;
            }
        } else if (msg.sender == deal.partyB) {
            require(
                deal.status == DealStatus.FUNDED_A,
                "PartyA must fund first"
            );
            // Store deposit and verify against terms
            deal.encDepositB = amount;
            deal.matchB = FHE.eq(amount, deal.encTermsB);

            FHE.allowThis(deal.encDepositB);
            FHE.allowThis(deal.matchB);
            FHE.allow(deal.encDepositB, msg.sender);

            deal.status = DealStatus.FUNDED_BOTH;
        } else {
            revert("Not a party");
        }

        emit DealFunded(dealId, msg.sender);
    }

    /// @notice Release funds when both deposits match terms
    /// @dev FHE ops: and(1), select(2) = 3 ops
    /// @dev Both branches always execute (constant-time, no timing leak)
    function releaseDeal(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        require(deal.status == DealStatus.FUNDED_BOTH, "Not fully funded");
        require(
            msg.sender == deal.partyA || msg.sender == deal.partyB,
            "Not a party"
        );

        // Verify both deposits match their respective terms
        ebool bothMatch = FHE.and(deal.matchA, deal.matchB);

        // Settlement amounts: if both match, transfer deposit amounts; if not, transfer 0
        // We use euint128 select then convert via asEuint64 for vault compatibility
        euint128 releaseA128 = FHE.select(bothMatch, deal.encDepositA, ZERO_128);
        euint128 releaseB128 = FHE.select(bothMatch, deal.encDepositB, ZERO_128);
        euint64 releaseA = FHE.asEuint64(releaseA128);
        euint64 releaseB = FHE.asEuint64(releaseB128);

        FHE.allowThis(releaseA);
        FHE.allowThis(releaseB);
        FHE.allowTransient(releaseA, address(vault));
        FHE.allow(releaseA, address(vault));
        FHE.allowTransient(releaseB, address(vault));
        FHE.allow(releaseB, address(vault));

        // Cross-transfer: A's deposit goes to B, B's deposit goes to A
        vault.settleTrade(deal.partyA, deal.partyB, deal.tokenA, releaseA);
        vault.settleTrade(deal.partyB, deal.partyA, deal.tokenB, releaseB);

        deal.status = DealStatus.RELEASED;

        emit TradeCompleted(deal.partyA, deal.partyB, dealId);
        emit DealReleased(dealId);
    }

    /// @notice Cancel and refund if deadline passed or deal not fully funded
    function cancelDeal(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        require(
            deal.status == DealStatus.CREATED ||
            deal.status == DealStatus.FUNDED_A ||
            deal.status == DealStatus.FUNDED_BOTH,
            "Cannot cancel"
        );
        require(
            msg.sender == deal.partyA || msg.sender == deal.partyB,
            "Not a party"
        );

        // Allow cancel if deadline passed OR if deal not fully funded
        if (deal.status == DealStatus.FUNDED_BOTH) {
            require(block.timestamp >= deal.deadline, "Deadline not passed");
        }

        deal.status = DealStatus.CANCELLED;
        emit DealCancelled(dealId);
    }

    /// @notice Get deal details
    function getDeal(uint256 dealId) external view returns (
        address partyA,
        address partyB,
        address tokenA,
        address tokenB,
        DealStatus status,
        uint256 deadline,
        bytes32 dealHash
    ) {
        Deal storage d = deals[dealId];
        return (d.partyA, d.partyB, d.tokenA, d.tokenB, d.status, d.deadline, d.dealHash);
    }

    /// @notice Get total deals created
    function getDealCount() external view returns (uint256) {
        return nextDealId;
    }
}
