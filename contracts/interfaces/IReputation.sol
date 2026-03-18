// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IReputation — Interface for the non-blocking reputation system
/// @notice Feature contracts call recordTrade() after successful settlements
interface IReputation {
    /// @notice Record that a trade occurred between two parties
    /// @dev Only callable by authorized feature contracts
    /// @dev Non-blocking: if this call fails, trading still works
    function recordTrade(address partyA, address partyB) external;

    /// @notice Get the plaintext trade count for any user
    function getTradeCount(address user) external view returns (uint256);
}
