// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Profile 页占位；二期再实现真实激励逻辑。
contract LeapCreatorRewards {
    function creatorBalance(address) external pure returns (uint256) {
        return 0;
    }

    function lifetimeCreatorEarned(address) external pure returns (uint256) {
        return 0;
    }

    function claim() external {}
}
