// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 简化版 Bounce LT，1:1 兑换 USDC，供 lt-registry 解析。
contract MockLT {
    string public targetAsset;
    uint256 public targetLeverage;
    bool public isLong;

    constructor(string memory asset_, uint256 leverage_, bool isLong_) {
        targetAsset = asset_;
        targetLeverage = leverage_;
        isLong = isLong_;
    }

    function baseToLtAmount(uint256 baseAmount) external pure returns (uint256) {
        return baseAmount;
    }

    function ltToBaseAmount(uint256 ltAmount) external pure returns (uint256) {
        return ltAmount;
    }
}
