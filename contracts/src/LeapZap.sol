// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ILeapTypes} from "./interfaces/ILeapTypes.sol";
import {LeapBonding} from "./LeapBonding.sol";

contract LeapZap is ILeapTypes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_SEED_USDC = 20_000_000; // 20 USDC
    uint256 public constant MIN_USDC_AMOUNT = 10_000_000; // 10 USDC
    uint256 public constant buyFeeBps = 100;
    uint256 public constant sellFeeBps = 100;

    IERC20 public immutable usdc;
    LeapBonding public immutable bonding;

    event TokenCreated(address indexed token, address indexed creator, address indexed ltAddress);

    constructor(address usdc_, address bonding_) {
        usdc = IERC20(usdc_);
        bonding = LeapBonding(bonding_);
    }

    function createToken(LaunchParams calldata params, uint256 seedUsdcAmount)
        external
        nonReentrant
        returns (address tokenAddr)
    {
        require(seedUsdcAmount >= MIN_SEED_USDC, "seed");
        usdc.safeTransferFrom(msg.sender, address(this), seedUsdcAmount);
        usdc.approve(address(bonding), seedUsdcAmount);
        tokenAddr = bonding.createToken(msg.sender, params, seedUsdcAmount);
        emit TokenCreated(tokenAddr, msg.sender, params.ltAddress);
    }

    function buy(address tokenAddress, uint256 usdcAmount, uint256 minTokensOut, address)
        external
        nonReentrant
        returns (uint256 tokensOut)
    {
        require(usdcAmount >= MIN_USDC_AMOUNT, "min buy");
        uint256 fee = (usdcAmount * buyFeeBps) / 10_000;
        uint256 net = usdcAmount - fee;
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        usdc.approve(address(bonding), net);
        tokensOut = bonding.buy(msg.sender, tokenAddress, net);
        require(tokensOut >= minTokensOut, "slippage");
    }

    function sell(address tokenAddress, uint256 tokenAmount, uint256 minUsdcOut)
        external
        nonReentrant
        returns (uint256 usdcOut)
    {
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(tokenAddress).approve(address(bonding), tokenAmount);
        uint256 gross = bonding.sell(msg.sender, tokenAddress, tokenAmount);
        uint256 fee = (gross * sellFeeBps) / 10_000;
        usdcOut = gross - fee;
        require(usdcOut >= minUsdcOut, "slippage");
        usdc.safeTransfer(msg.sender, usdcOut);
    }
}
