// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, euint128, InEuint128, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISettlementVault} from "../interfaces/ISettlementVault.sol";
import {IPlatformRegistry} from "../interfaces/IPlatformRegistry.sol";
import {FHEConstants} from "../libraries/FHEConstants.sol";

/// @title LimitOrderEngine — Private limit orders with encrypted trigger prices
/// @notice Users set encrypted trigger prices. Oracle pushes plaintext market prices.
///         FHE.lte(oraclePrice, triggerPrice) checks trigger without revealing the trigger.
///         MEV bots can't front-run because trigger prices are hidden.
/// @dev Manual oracle for testnet. Production: integrate Chainlink/Pyth when on Fhenix mainnet.
contract LimitOrderEngine is ReentrancyGuard, FHEConstants {
    enum TriggerDirection { BUY_BELOW, SELL_ABOVE }
    enum OrderStatus { ACTIVE, TRIGGERED, SETTLED, CANCELLED }

    struct LimitOrder {
        address owner;
        address tokenBuy;
        address tokenSell;
        uint256 amount;              // Plaintext trade size
        euint128 encTriggerPrice;    // ENCRYPTED: the hidden trigger
        TriggerDirection direction;
        ebool executed;              // Encrypted: even execution status is hidden
        OrderStatus status;
        uint256 createdAt;
    }

    ISettlementVault public vault;
    IPlatformRegistry public registry;

    mapping(uint256 => LimitOrder) public limitOrders;
    uint256[] public activeOrderIds;
    uint256 public nextOrderId;

    /// @notice Oracle address (admin for testnet, Chainlink for production)
    address public oracle;

    /// @notice Last price pushed by oracle
    uint128 public lastOraclePrice;

    uint256 public constant MAX_ORDERS_PER_CHECK = 50;

    event LimitOrderCreated(uint256 indexed orderId, address indexed owner, TriggerDirection direction);
    event PriceChecked(uint128 price, uint256 ordersChecked);
    event OrderTriggered(uint256 indexed orderId);
    event OrderSettled(uint256 indexed orderId);
    event OrderCancelled(uint256 indexed orderId);
    event OracleUpdated(address indexed newOracle);

    modifier whenNotPaused() {
        require(!registry.paused(), "Platform paused");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(address _vault, address _registry, address _oracle) {
        require(_vault != address(0) && _registry != address(0), "Zero address");
        require(_oracle != address(0), "Zero oracle");
        vault = ISettlementVault(_vault);
        registry = IPlatformRegistry(_registry);
        oracle = _oracle;
        _initFHEConstants();
    }

    /// @notice Create a limit order with encrypted trigger price
    /// @param tokenBuy Token to buy when triggered
    /// @param tokenSell Token to sell when triggered
    /// @param amount Trade size (plaintext)
    /// @param encTriggerPrice Encrypted price at which order should execute
    /// @param direction BUY_BELOW (buy when price drops) or SELL_ABOVE (sell when price rises)
    function createLimitOrder(
        address tokenBuy,
        address tokenSell,
        uint256 amount,
        InEuint128 calldata encTriggerPrice,
        TriggerDirection direction
    ) external whenNotPaused returns (uint256 orderId) {
        require(tokenBuy != tokenSell, "Same token");
        require(amount > 0, "Zero amount");

        orderId = nextOrderId++;
        euint128 trigger = FHE.asEuint128(encTriggerPrice);
        ebool notExecuted = FHE.asEbool(false);

        limitOrders[orderId] = LimitOrder({
            owner: msg.sender,
            tokenBuy: tokenBuy,
            tokenSell: tokenSell,
            amount: amount,
            encTriggerPrice: trigger,
            direction: direction,
            executed: notExecuted,
            status: OrderStatus.ACTIVE,
            createdAt: block.timestamp
        });

        // ACL: contract can use trigger for comparison, owner can unseal
        FHE.allowThis(trigger);
        FHE.allow(trigger, msg.sender);
        FHE.allowThis(notExecuted);
        FHE.allow(notExecuted, msg.sender);

        activeOrderIds.push(orderId);
        emit LimitOrderCreated(orderId, msg.sender, direction);
    }

    /// @notice Oracle pushes current price — contract checks all active orders
    /// @dev FHE ops per order: lte/gte(1), or(1) = 2 ops × N orders (max 50)
    /// @param currentPrice Current market price from oracle (plaintext)
    function checkPrice(uint128 currentPrice) external onlyOracle {
        lastOraclePrice = currentPrice;

        // Trivially encrypt oracle price for FHE comparison
        euint128 encCurrent = FHE.asEuint128(currentPrice);
        FHE.allowThis(encCurrent);

        uint256 len = activeOrderIds.length;
        uint256 toCheck = len > MAX_ORDERS_PER_CHECK ? MAX_ORDERS_PER_CHECK : len;

        for (uint256 i = 0; i < toCheck; i++) {
            uint256 orderId = activeOrderIds[i];
            LimitOrder storage order = limitOrders[orderId];

            if (order.status != OrderStatus.ACTIVE) continue;

            ebool triggered;
            if (order.direction == TriggerDirection.BUY_BELOW) {
                // Trigger when market price drops below trigger price
                triggered = FHE.lte(encCurrent, order.encTriggerPrice);
            } else {
                // Trigger when market price rises above trigger price
                triggered = FHE.gte(encCurrent, order.encTriggerPrice);
            }

            // Once triggered, stays true (or-latch)
            order.executed = FHE.or(order.executed, triggered);
            FHE.allowThis(order.executed);
            FHE.allow(order.executed, order.owner);
        }

        emit PriceChecked(currentPrice, toCheck);
    }

    /// @notice Settle triggered orders after decryption
    /// @dev Owner or keeper calls this. Checks decrypted execution status.
    function settleTriggered(uint256 orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[orderId];
        require(order.status == OrderStatus.ACTIVE, "Not active");

        // Request decryption of execution status
        FHE.decrypt(order.executed);

        order.status = OrderStatus.TRIGGERED;
        emit OrderTriggered(orderId);
    }

    /// @notice Complete settlement after decrypt result is ready
    function completeSettlement(uint256 orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[orderId];
        require(order.status == OrderStatus.TRIGGERED, "Not triggered");

        (bool wasExecuted, bool ready) = FHE.getDecryptResultSafe(order.executed);
        require(ready, "Not yet decrypted");

        if (wasExecuted) {
            // Execute the trade through vault
            euint64 tradeAmount = FHE.asEuint64(uint64(order.amount));
            FHE.allowThis(tradeAmount);
            FHE.allowTransient(tradeAmount, address(vault));
            FHE.allow(tradeAmount, address(vault));

            // For limit orders, we do a simple token swap at the market price
            vault.settleTrade(order.owner, address(this), order.tokenSell, tradeAmount);

            order.status = OrderStatus.SETTLED;
            emit OrderSettled(orderId);
        } else {
            // Not yet triggered — revert to active
            order.status = OrderStatus.ACTIVE;
        }

        _removeFromActive(orderId);
    }

    /// @notice Owner cancels their limit order
    function cancelLimitOrder(uint256 orderId) external {
        LimitOrder storage order = limitOrders[orderId];
        require(order.owner == msg.sender, "Not owner");
        require(order.status == OrderStatus.ACTIVE, "Not active");

        order.status = OrderStatus.CANCELLED;
        _removeFromActive(orderId);
        emit OrderCancelled(orderId);
    }

    /// @notice Owner views their trigger price handle (for unsealing)
    function getMyTriggerPrice(uint256 orderId) external view returns (euint128) {
        require(limitOrders[orderId].owner == msg.sender, "Not owner");
        return limitOrders[orderId].encTriggerPrice;
    }

    /// @notice Update oracle address (admin only — via registry owner)
    function setOracle(address _oracle) external {
        require(msg.sender == oracle, "Not oracle");
        require(_oracle != address(0), "Zero address");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    /// @notice Get active order count
    function getActiveOrderCount() external view returns (uint256) {
        return activeOrderIds.length;
    }

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
