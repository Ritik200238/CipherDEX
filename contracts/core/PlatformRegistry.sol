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
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        require(_feeCollector != address(0), "Zero fee collector");
        feeBasisPoints = _feeBps;
        feeCollector = _feeCollector;
    }

    // ─── User Management ────────────────────────────────────

    /// @notice Register the caller as a platform user
    /// @dev Auto-registration on first interaction. No gatekeeping for demo.
    function register() external whenNotPaused {
        require(!users[msg.sender].registered, "Already registered");
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
        require(users[user].registered, "Not registered");
        require(!users[user].suspended, "Already suspended");
        users[user].suspended = true;
        emit UserSuspended(user);
    }

    /// @notice Reinstate a suspended user (admin only)
    function reinstateUser(address user) external onlyOwner {
        require(users[user].suspended, "Not suspended");
        users[user].suspended = false;
        emit UserReinstated(user);
    }

    // ─── Contract Management ────────────────────────────────

    /// @notice Register a feature contract as authorized
    function registerContract(address contractAddr) external onlyOwner {
        require(contractAddr != address(0), "Zero address");
        require(!registeredContracts[contractAddr], "Already registered");
        registeredContracts[contractAddr] = true;
        emit ContractRegistered(contractAddr);
    }

    /// @notice Deregister a feature contract
    function deregisterContract(address contractAddr) external onlyOwner {
        require(registeredContracts[contractAddr], "Not registered");
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
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        feeBasisPoints = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    /// @notice Update fee collector address (admin only)
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Zero address");
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
