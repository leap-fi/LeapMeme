// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LeapBonding} from "./LeapBonding.sol";

/// @dev 报价层；ltAmount 在 MockLT 下与 USDC 1:1。
contract LeapRouter {
    LeapBonding public immutable bonding;

    constructor(address bonding_) {
        bonding = LeapBonding(bonding_);
    }

    function previewBuy(address token, uint256 amountIn)
        external
        view
        returns (uint256 amountInUsed, uint256 tokensOut)
    {
        return bonding.quoteBuy(token, amountIn);
    }

    function getAmountOut(address token, bool isBuy, uint256 amountIn) external view returns (uint256) {
        if (isBuy) {
            (, uint256 tokensOut) = bonding.quoteBuy(token, amountIn);
            return tokensOut;
        }
        return bonding.quoteSell(token, amountIn);
    }
}
