// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint8, euint64, euint128, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title FHEConstants — Pre-encrypted constants shared across contracts
/// @notice Encrypt common values once in constructor to save gas on repeated use
/// @dev Each contract that inherits this gets its own copies (allowThis is per-contract)
abstract contract FHEConstants {
    euint64 internal ZERO_64;
    euint128 internal ZERO_128;
    ebool internal FALSE_BOOL;

    /// @dev Call in constructor of inheriting contracts
    function _initFHEConstants() internal {
        ZERO_64 = FHE.asEuint64(0);
        ZERO_128 = FHE.asEuint128(0);
        FALSE_BOOL = FHE.asEbool(false);
        FHE.allowThis(ZERO_64);
        FHE.allowThis(ZERO_128);
        FHE.allowThis(FALSE_BOOL);
    }
}
