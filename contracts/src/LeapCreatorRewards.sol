// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev 创作者奖励：Zap 把每笔买卖手续费按 token 的 creator 计入；creator 调 claim 提取 USDC。
///      对齐前端 `creatorRewardsAbi`：creatorBalance / lifetimeCreatorEarned / claim。
contract LeapCreatorRewards {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public zap;

    mapping(address => uint256) public creatorBalance;
    mapping(address => uint256) public lifetimeCreatorEarned;

    event FeeRecorded(address indexed creator, uint256 amount);
    event Claimed(address indexed creator, uint256 amount);

    constructor(address usdc_) {
        usdc = IERC20(usdc_);
    }

    function setZap(address zap_) external {
        require(zap == address(0), "zap set");
        require(zap_ != address(0), "zero");
        zap = zap_;
    }

    /// @dev 由 Zap 调用：从 Zap 收取 USDC 手续费并计入 creator 余额。
    function recordFee(address creator, uint256 amount) external {
        require(msg.sender == zap, "zap");
        if (creator == address(0) || amount == 0) return;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        creatorBalance[creator] += amount;
        lifetimeCreatorEarned[creator] += amount;
        emit FeeRecorded(creator, amount);
    }

    function claim() external {
        uint256 amount = creatorBalance[msg.sender];
        require(amount > 0, "nothing to claim");
        creatorBalance[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }
}
