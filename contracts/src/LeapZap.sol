// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ILeapTypes} from "./interfaces/ILeapTypes.sol";
import {LeapBonding} from "./LeapBonding.sol";
import {LeapCreatorRewards} from "./LeapCreatorRewards.sol";

/// @dev 用户入口：发币 / 买卖（含 permit 变体）。收取 0.75% swap 费并拆分：
///      0.25% → CreatorRewards（创作者 claim）；0.5% → protocolTreasury。
///      曲线与毕业后买卖均在 Zap 层扣费。毕业路由由 Bonding 内部决定。
contract LeapZap is ILeapTypes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev EIP-2612 签名（对齐前端 abis.ts 中 buyWithPermit/sellWithPermit/createTokenWithPermit 的 tuple）。
    struct PermitInput {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 public constant MIN_SEED_USDC = 20_000_000; // 20 USDC
    uint256 public constant MIN_USDC_AMOUNT = 10_000_000; // 10 USDC
    /// @dev 总 swap 费 0.75%（对齐 Alt Fun / 前端报价）；在 Zap 层扣除，曲线与毕业后均适用。
    uint256 public constant buyFeeBps = 75;
    uint256 public constant sellFeeBps = 75;
    /// @dev 总手续费中创作者占比（3333 = 33.33% → 0.25% of volume）；余下归协议。
    uint256 public constant creatorFeeShareBps = 3333;
    address public constant protocolTreasury = 0x5945509FD601fB6b67bE2ff06ee72188057d45F3;

    event ProtocolFeePaid(address indexed treasury, uint256 amount);

    IERC20 public immutable usdc;
    LeapBonding public immutable bonding;
    LeapCreatorRewards public immutable creatorRewards;

    event TokenCreated(address indexed token, address indexed creator, address indexed ltAddress);

    constructor(address usdc_, address bonding_, address creatorRewards_) {
        usdc = IERC20(usdc_);
        bonding = LeapBonding(bonding_);
        creatorRewards = LeapCreatorRewards(creatorRewards_);
    }

    // --- create ---

    function createToken(LaunchParams calldata params, uint256 seedUsdcAmount)
        external
        nonReentrant
        returns (address tokenAddr)
    {
        return _create(params, seedUsdcAmount);
    }

    function createTokenWithPermit(
        LaunchParams calldata params,
        uint256 seedUsdcAmount,
        PermitInput calldata p
    ) external nonReentrant returns (address tokenAddr) {
        _tryPermit(address(usdc), p);
        return _create(params, seedUsdcAmount);
    }

    function _create(LaunchParams calldata params, uint256 seedUsdcAmount)
        internal
        returns (address tokenAddr)
    {
        require(seedUsdcAmount >= MIN_SEED_USDC, "seed");
        usdc.safeTransferFrom(msg.sender, address(this), seedUsdcAmount);
        usdc.forceApprove(address(bonding), seedUsdcAmount);
        tokenAddr = bonding.createToken(msg.sender, params, seedUsdcAmount);
        emit TokenCreated(tokenAddr, msg.sender, params.ltAddress);
    }

    // --- buy ---

    function buy(address tokenAddress, uint256 usdcAmount, uint256 minTokensOut, address /* referrer */ )
        external
        nonReentrant
        returns (uint256 tokensOut)
    {
        return _buy(tokenAddress, usdcAmount, minTokensOut);
    }

    function buyWithPermit(
        address tokenAddress,
        uint256 usdcAmount,
        uint256 minTokensOut,
        address, /* referrer */
        PermitInput calldata p
    ) external nonReentrant returns (uint256 tokensOut) {
        _tryPermit(address(usdc), p);
        return _buy(tokenAddress, usdcAmount, minTokensOut);
    }

    function _buy(address tokenAddress, uint256 usdcAmount, uint256 minTokensOut)
        internal
        returns (uint256 tokensOut)
    {
        require(usdcAmount >= MIN_USDC_AMOUNT, "min buy");
        uint256 fee = (usdcAmount * buyFeeBps) / 10_000;
        uint256 net = usdcAmount - fee;

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        usdc.forceApprove(address(bonding), net);
        tokensOut = bonding.buy(msg.sender, tokenAddress, net);
        require(tokensOut >= minTokensOut, "slippage");

        _payFee(tokenAddress, fee);
    }

    // --- sell ---

    function sell(address tokenAddress, uint256 tokenAmount, uint256 minUsdcOut)
        external
        nonReentrant
        returns (uint256 usdcOut)
    {
        return _sell(tokenAddress, tokenAmount, minUsdcOut);
    }

    function sellWithPermit(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 minUsdcOut,
        PermitInput calldata p
    ) external nonReentrant returns (uint256 usdcOut) {
        _tryPermit(tokenAddress, p);
        return _sell(tokenAddress, tokenAmount, minUsdcOut);
    }

    function _sell(address tokenAddress, uint256 tokenAmount, uint256 minUsdcOut)
        internal
        returns (uint256 usdcOut)
    {
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(tokenAddress).forceApprove(address(bonding), tokenAmount);
        uint256 gross = bonding.sell(msg.sender, tokenAddress, tokenAmount);

        uint256 fee = (gross * sellFeeBps) / 10_000;
        usdcOut = gross - fee;
        require(usdcOut >= minUsdcOut, "slippage");

        usdc.safeTransfer(msg.sender, usdcOut);
        _payFee(tokenAddress, fee);
    }

    // --- internal ---

    function _payFee(address tokenAddress, uint256 fee) internal {
        if (fee == 0) return;

        uint256 creatorFee = (fee * creatorFeeShareBps) / 10_000;
        uint256 protocolFee = fee - creatorFee;

        if (protocolFee > 0) {
            usdc.safeTransfer(protocolTreasury, protocolFee);
            emit ProtocolFeePaid(protocolTreasury, protocolFee);
        }

        if (creatorFee == 0) return;
        address creator = bonding.creatorOf(tokenAddress);
        if (creator == address(0)) {
            usdc.safeTransfer(protocolTreasury, creatorFee);
            emit ProtocolFeePaid(protocolTreasury, creatorFee);
            return;
        }
        usdc.forceApprove(address(creatorRewards), creatorFee);
        creatorRewards.recordFee(creator, creatorFee);
    }

    /// @dev permit 失败不阻断主流程（可能已被他人抢先提交），最终以授权额度为准。
    function _tryPermit(address token, PermitInput calldata p) internal {
        if (p.value == 0 && p.deadline == 0) return;
        try IERC20Permit(token).permit(msg.sender, address(this), p.value, p.deadline, p.v, p.r, p.s) {}
            catch {}
    }
}
