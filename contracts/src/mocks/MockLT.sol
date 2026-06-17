// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev 简化版 Bounce LT：与 USDC 1:1（同为 6 位小数）的可兑换 ERC20，
///      供 lt-registry 解析，并作为毕业后 UniV2 池的对手资产。
///      毕业前仅作为 meme 的「主题标签」，毕业时 Bonding 用 deposit 铸出 LT 注入池子。
contract MockLT is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    string private _asset;
    uint256 public targetLeverage;
    bool public isLong;

    constructor(address usdc_, string memory asset_, uint256 leverage_, bool isLong_)
        ERC20("Bounce Leverage Token", "bLT")
    {
        usdc = IERC20(usdc_);
        _asset = asset_;
        targetLeverage = leverage_;
        isLong = isLong_;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function targetAsset() external view returns (string memory) {
        return _asset;
    }

    function baseToLtAmount(uint256 baseAmount) external pure returns (uint256) {
        return baseAmount;
    }

    function ltToBaseAmount(uint256 ltAmount) external pure returns (uint256) {
        return ltAmount;
    }

    /// @dev 存入 USDC 1:1 铸造 LT。
    function deposit(uint256 usdcAmount) external returns (uint256 ltOut) {
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        ltOut = usdcAmount;
        _mint(msg.sender, ltOut);
    }

    /// @dev 销毁 LT 1:1 赎回 USDC。
    function redeem(uint256 ltAmount) external returns (uint256 usdcOut) {
        _burn(msg.sender, ltAmount);
        usdcOut = ltAmount;
        usdc.safeTransfer(msg.sender, usdcOut);
    }
}
