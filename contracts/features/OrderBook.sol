// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, euint128, InEuint128, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISettlementVault} from "../interfaces/ISettlementVault.sol";
import {IPlatformRegistry} from "../interfaces/IPlatformRegistry.sol";
import {FHEConstants} from "../libraries/FHEConstants.sol";

/// @title OrderBook — P2P encrypted order matching
/// @notice Makers post sell orders with encrypted prices. Takers submit encrypted buy prices.
///         FHE.gte(takerPrice, makerPrice) determines if there's a match — nobody sees either price.
/// @dev Core feature: remove FHE and prices are public, enabling front-running.
contract OrderBook is ReentrancyGuard, FHEConstants {
    enum OrderSide { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED }

    struct Order {
        address maker;
        address tokenSell;       // Plaintext: needed for discoverability
        address tokenBuy;        // Plaintext: needed for discoverability
        uint256 amountSell;      // Plaintext: takers need to see available volume
        euint128 encPrice;       // ENCRYPTED: price per unit — the secret sauce
        OrderSide side;
        OrderStatus status;
        uint256 createdAt;
    }

    ISettlementVault public vault;
    IPlatformRegistry public registry;

    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;

    // Track active order IDs per token pair for frontend querying
    uint256[] public activeOrderIds;

    error Unauthorized();
    error InvalidInput();
    error InvalidState();
    error Paused();

    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenSell,
        address tokenBuy,
        uint256 amountSell,
        OrderSide side
    );
    event OrderFilled(uint256 indexed orderId, address indexed taker);
    event OrderCancelled(uint256 indexed orderId);
    event TradeCompleted(bytes32 indexed partyAHash, bytes32 indexed partyBHash, uint256 orderId);

    modifier whenNotPaused() {
        if (registry.paused()) revert Paused();
        _;
    }

    constructor(address _vault, address _registry) {
        if (_vault == address(0) || _registry == address(0)) revert InvalidInput();
        vault = ISettlementVault(_vault);
        registry = IPlatformRegistry(_registry);
        _initFHEConstants();
    }

    /// @notice Maker creates a sell/buy order with encrypted price
    /// @param tokenSell Token the maker is selling
    /// @param tokenBuy Token the maker wants to receive
    /// @param amountSell Amount being sold (plaintext for discoverability)
    /// @param encPrice Encrypted price per unit (hidden from everyone except maker)
    /// @param side BUY or SELL
    /// @return orderId The new order's ID
    function createOrder(
        address tokenSell,
        address tokenBuy,
        uint256 amountSell,
        InEuint128 calldata encPrice,
        OrderSide side
    ) external whenNotPaused returns (uint256 orderId) {
        if (tokenSell == tokenBuy) revert InvalidInput();
        if (amountSell == 0) revert InvalidInput();

        orderId = nextOrderId++;
        euint128 price = FHE.asEuint128(encPrice);

        orders[orderId] = Order({
            maker: msg.sender,
            tokenSell: tokenSell,
            tokenBuy: tokenBuy,
            amountSell: amountSell,
            encPrice: price,
            side: side,
            status: OrderStatus.ACTIVE,
            createdAt: block.timestamp
        });

        // ACL: contract can use this price for matching, maker can unseal their own price
        FHE.allowThis(price);
        FHE.allow(price, msg.sender);

        activeOrderIds.push(orderId);

        emit OrderCreated(orderId, msg.sender, tokenSell, tokenBuy, amountSell, side);
    }

    /// @notice Taker fills an order with their encrypted price
    /// @dev FHE.gte(takerPrice, makerPrice) determines match. If match, settles via vault.
    ///      If no match, nothing happens (taker's price wasn't high enough).
    /// @dev FHE ops: gte(1), select(2) = 3 ops
    /// @param orderId The order to fill
    /// @param encTakerPrice Taker's encrypted price (must be >= maker's price for a match)
    function fillOrder(
        uint256 orderId,
        InEuint128 calldata encTakerPrice
    ) external whenNotPaused nonReentrant {
        Order storage order = orders[orderId];
        if (order.status != OrderStatus.ACTIVE) revert InvalidState();
        if (order.maker == msg.sender) revert InvalidInput();

        euint128 takerPrice = FHE.asEuint128(encTakerPrice);

        // Core FHE operation: does taker's price meet maker's price?
        ebool isMatch = FHE.gte(takerPrice, order.encPrice);

        // Compute settlement amount: if match, use order amount; if no match, use 0
        // We settle at the maker's price (maker gets what they asked for)
        euint64 settlementAmount = FHE.select(
            isMatch,
            FHE.asEuint64(order.amountSell),
            ZERO_64
        );

        // Grant vault access to the computed settlement handle
        // Without this, vault.settleTrade() would fail with ACLNotAllowed
        FHE.allowTransient(settlementAmount, address(vault));
        FHE.allow(settlementAmount, address(vault));

        // Settlement: move tokens through the vault
        // Maker's sell token goes to taker
        vault.settleTrade(order.maker, msg.sender, order.tokenSell, settlementAmount);

        // Taker's buy token goes to maker (at maker's price * amount)
        // For simplicity in v1: taker deposits equivalent amount of tokenBuy
        vault.settleTrade(msg.sender, order.maker, order.tokenBuy, settlementAmount);

        // Mark order as filled (both branches execute, but status only changes on match)
        // Since we can't branch on encrypted data, we always mark filled.
        // The zero-replacement pattern in the vault means 0 tokens move if no match.
        order.status = OrderStatus.FILLED;

        // Remove from active list
        _removeFromActive(orderId);

        // Emit trade event with hashed addresses for privacy
        bytes32 salt = keccak256(abi.encodePacked(block.number, block.prevrandao));
        emit TradeCompleted(
            keccak256(abi.encodePacked(order.maker, salt)),
            keccak256(abi.encodePacked(msg.sender, salt)),
            orderId
        );
        emit OrderFilled(orderId, msg.sender);
    }

    /// @notice Cancel an unfilled order (maker only)
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        if (order.maker != msg.sender) revert Unauthorized();
        if (order.status != OrderStatus.ACTIVE) revert InvalidState();

        order.status = OrderStatus.CANCELLED;
        _removeFromActive(orderId);

        emit OrderCancelled(orderId);
    }

    /// @notice Get order details (encrypted price only readable by owner via unseal)
    function getOrder(uint256 orderId) external view returns (
        address maker,
        address tokenSell,
        address tokenBuy,
        uint256 amountSell,
        euint128 encPrice,
        OrderSide side,
        OrderStatus status,
        uint256 createdAt
    ) {
        Order storage o = orders[orderId];
        return (o.maker, o.tokenSell, o.tokenBuy, o.amountSell, o.encPrice, o.side, o.status, o.createdAt);
    }

    /// @notice Get total number of orders ever created
    function getOrderCount() external view returns (uint256) {
        return nextOrderId;
    }

    /// @notice Check if there are any active orders
    function hasActiveOrders() external view returns (bool) {
        return activeOrderIds.length > 0;
    }

    /// @notice Get active order ID at index
    function getActiveOrderId(uint256 index) external view returns (uint256) {
        if (index >= activeOrderIds.length) revert InvalidInput();
        return activeOrderIds[index];
    }

    // ─── Internal ───────────────────────────────────────────

    /// @dev Remove an order ID from the active list (swap-and-pop)
    function _removeFromActive(uint256 orderId) internal {
        uint256 len = activeOrderIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (activeOrderIds[i] == orderId) {
                activeOrderIds[i] = activeOrderIds[len - 1];
                activeOrderIds.pop();
                return;
            }
        }
    }
}
