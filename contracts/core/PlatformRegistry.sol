// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title PlatformRegistry — User registration, config, fees, and emergency controls
/// @notice Central configuration hub for all CipherDEX feature contracts
contract PlatformRegistry is Ownable2Step, Pausable {
    struct UserProfile {
        bool registered;
        uint256 registeredAt;
        bool suspended;
    }

    /// @notice Registered user profiles
    mapping(address => UserProfile) public users;

    /// @notice Authorized feature contracts that can interact with the platform
    mapping(address => bool) public registeredContracts;

    /// @notice Platform fee in basis points (0-10000, i.e. 0%-100%)
    uint16 public feeBasisPoints;

    /// @notice Address that collects platform fees
    address public feeCollector;

    /// @notice Total registered users (for stats display)
    uint256 public userCount;

    error InvalidInput();
    error InvalidState();
    error PlatformPaused();

    event UserRegistered(address indexed user);
    event UserSuspended(address indexed user);
    event UserReinstated(address indexed user);
    event ContractRegistered(address indexed contractAddr);
    event ContractDeregistered(address indexed contractAddr);
    event FeeUpdated(uint16 newFeeBps);
    event FeeCollectorUpdated(address indexed newCollector);

    constructor(address _admin, uint16 _feeBps, address _feeCollector)
        Ownable(_admin)
    {
        if (_feeBps > 1000) revert InvalidInput(); // Max 10%
        if (_feeCollector == address(0)) revert InvalidInput();
        feeBasisPoints = _feeBps;
        feeCollector = _feeCollector;
    }

    // ─── User Management ────────────────────────────────────

    /// @notice Register the caller as a platform user
    /// @dev Auto-registration on first interaction. No gatekeeping for demo.
    function register() external whenNotPaused {
        if (users[msg.sender].registered) revert InvalidState();
        users[msg.sender] = UserProfile({
            registered: true,
            registeredAt: block.timestamp,
            suspended: false
        });
        userCount++;
        emit UserRegistered(msg.sender);
    }

    /// @notice Check if user is registered (convenience for external contracts)
    function isRegistered(address user) external view returns (bool) {
        return users[user].registered;
    }

    /// @notice Check if user is suspended
    function isSuspended(address user) external view returns (bool) {
        return users[user].suspended;
    }

    /// @notice Suspend a user (admin only)
    function suspendUser(address user) external onlyOwner {
        if (!users[user].registered) revert InvalidState();
        if (users[user].suspended) revert InvalidState();
        users[user].suspended = true;
        emit UserSuspended(user);
    }

    /// @notice Reinstate a suspended user (admin only)
    function reinstateUser(address user) external onlyOwner {
        if (!users[user].suspended) revert InvalidState();
        users[user].suspended = false;
        emit UserReinstated(user);
    }

    // ─── Contract Management ────────────────────────────────

    /// @notice Register a feature contract as authorized
    function registerContract(address contractAddr) external onlyOwner {
        if (contractAddr == address(0)) revert InvalidInput();
        if (registeredContracts[contractAddr]) revert InvalidState();
        registeredContracts[contractAddr] = true;
        emit ContractRegistered(contractAddr);
    }

    /// @notice Deregister a feature contract
    function deregisterContract(address contractAddr) external onlyOwner {
        if (!registeredContracts[contractAddr]) revert InvalidState();
        registeredContracts[contractAddr] = false;
        emit ContractDeregistered(contractAddr);
    }

    /// @notice Check if a contract is registered
    function isRegisteredContract(address contractAddr) external view returns (bool) {
        return registeredContracts[contractAddr];
    }

    // ─── Fee Configuration ──────────────────────────────────

    /// @notice Update platform fee (admin only)
    function setFeeBasisPoints(uint16 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert InvalidInput(); // Max 10%
        feeBasisPoints = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    /// @notice Update fee collector address (admin only)
    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert InvalidInput();
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    // ─── Emergency Controls ─────────────────────────────────

    /// @notice Pause the entire platform (admin only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the platform (admin only)
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Override Pausable.paused() to be accessible via interface
    function paused() public view override returns (bool) {
        return super.paused();
    }
}
