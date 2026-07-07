// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {LeapBonding} from "../LeapBonding.sol";
import {IUniswapV2Pair} from "../external/univ2/IUniswapV2.sol";

interface IMockLTRedeemable {
    function redeem(uint256 ltAmount) external returns (uint256 usdcOut);
}

/// @dev 低风险体验版（Playground）专用 Bonding。
///
///      设计原则：**只扩展、不改写**。本合约继承正式版 LeapBonding，不覆盖任何父类函数，
///      因此正式合约的发币 / 买卖 / 毕业逻辑完全不受影响；正式版部署时仍用 LeapBonding。
///
///      新增能力：`playgroundUnwind` —— 体验版收尾赎回。
///        场景：creator 把某 token 玩到毕业、再把外部流通的 meme 全部卖回池子后，
///        可拆掉毕业时「永久锁定」的 LP，把池内 LT 兑回 USDC 退还给自己，
///        让「全是自己钱包」的 solo 体验闭环接近「除 gas 外不亏」。
///
///      触发条件不是 `totalSupply == 0`（毕业池里恒有 meme，永远触发不了），
///      而是「池外（非 pair、非本合约）流通的 meme ≈ 0」，即真的没人再持有 meme。
contract LeapBondingPlayground is LeapBonding {
    using SafeERC20 for IERC20;

    /// @dev 允许残留的极小 meme dust（18 位小数）。防止有人故意留 1 wei 永久卡死赎回。
    uint256 public constant UNWIND_DUST = 1e12;

    /// @dev 标记已收尾，避免重复赎回 / 赎回后继续按毕业池交易。
    mapping(address => bool) public unwound;

    event PlaygroundUnwound(
        address indexed token, address indexed to, uint256 usdcOut, uint256 memeReclaimed
    );

    constructor(
        address usdc_,
        address tokenImplementation_,
        address bounceGlobalStorage_,
        uint256 virtualUsdc_,
        uint256 virtualToken_,
        uint256 graduationUsdc_
    )
        LeapBonding(
            usdc_,
            tokenImplementation_,
            bounceGlobalStorage_,
            virtualUsdc_,
            virtualToken_,
            graduationUsdc_
        )
    {}

    /// @dev 池外流通的 meme 数量（供前端预检，判断是否满足赎回条件）。
    function circulatingMeme(address token) public view returns (uint256) {
        address pair = pairOf[token];
        uint256 supply = IERC20(token).totalSupply();
        uint256 inPair = pair == address(0) ? 0 : IERC20(token).balanceOf(pair);
        uint256 inBonding = IERC20(token).balanceOf(address(this));
        uint256 held = inPair + inBonding;
        return supply > held ? supply - held : 0;
    }

    /// @dev 是否可执行体验版收尾赎回（已毕业、未赎回过、池外 meme ≈ 0、仍有 LP）。
    function canUnwind(address token) external view returns (bool) {
        if (!this.isGraduated(token) || unwound[token]) return false;
        address pair = pairOf[token];
        if (pair == address(0)) return false;
        if (IERC20(pair).balanceOf(address(this)) == 0) return false;
        return circulatingMeme(token) <= UNWIND_DUST;
    }

    /// @dev 体验版收尾赎回。要求：已毕业、调用者为 creator、池外 meme 流通量 ≤ dust。
    ///      流程：burn 本合约持有的全部 LP → 取回 LT + meme → LT 全额兑回 USDC → 退给 creator。
    ///      取回的 meme 留在本合约（退出流通，不再计入 circulating）。
    function playgroundUnwind(address token) external nonReentrant returns (uint256 usdcOut) {
        require(msg.sender == creatorOf[token], "creator");
        require(this.isGraduated(token), "not graduated");
        require(!unwound[token], "unwound");

        address pair = pairOf[token];
        require(pair != address(0), "no pair");
        require(circulatingMeme(token) <= UNWIND_DUST, "still circulating");

        uint256 lp = IERC20(pair).balanceOf(address(this));
        require(lp > 0, "no lp");

        unwound[token] = true;

        // burn 全部锁定 LP，取回 LT + meme 到本合约。
        IERC20(pair).safeTransfer(pair, lp);
        IUniswapV2Pair(pair).burn(address(this));

        // 取回的 meme 已退出流通，记录数量用于事件。
        uint256 memeReclaimed = IERC20(token).balanceOf(address(this));

        // LT 全额兑回 USDC。
        address lt = ltOf[token];
        uint256 ltBal = IERC20(lt).balanceOf(address(this));
        if (ltBal > 0) {
            usdcOut = IMockLTRedeemable(lt).redeem(ltBal);
        }

        if (usdcOut > 0) {
            usdc.safeTransfer(msg.sender, usdcOut);
        }

        emit PlaygroundUnwound(token, msg.sender, usdcOut, memeReclaimed);
    }
}
