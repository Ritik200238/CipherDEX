// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IPlatformRegistry — Interface for platform configuration and user management
interface IPlatformRegistry {
    /// @notice Check if a user is registered on the platform
    function isRegistered(address user) external view returns (bool);

    /// @notice Check if a user is suspended
    function isSuspended(address user) external view returns (bool);

    /// @notice Check if a contract is registered as a platform feature contract
    function isRegisteredContract(address contractAddr) external view returns (bool);

    /// @notice Get the fee in basis points (0-10000)
    function feeBasisPoints() external view returns (uint16);

    /// @notice Get the fee collector address
    function feeCollector() external view returns (address);

    /// @notice Check if the platform is paused
    function paused() external view returns (bool);
}
