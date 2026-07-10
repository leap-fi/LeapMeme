// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 协议经济参数集中定义，部署脚本 / 测试从这里取值。
///      USDC 为 6 位小数；VIRTUAL_TOKEN / meme 为 18 位小数。
library LeapConfig {
    struct Params {
        uint256 virtualUsdc; // 曲线虚拟 USDC 储备
        uint256 virtualToken; // 曲线虚拟 meme 储备
        uint256 graduationUsdc; // 累计真实募集达到此值即毕业
        uint256 minSeedUsdc; // createToken 最小 seed（0 = 允许不垫钱）
        uint256 maxSeedUsdc; // createToken 最大 seed
        uint256 minUsdcAmount; // 单笔 buy 最小 USDC
        uint256 maxUsdcPerTrade; // 单笔 buy/sell 的 USDC 上限（全生命周期），max = 不限
    }

    /// @dev 当前默认参数：大虚拟池、0 seed 可发币、seed 最多 20 USDC、10 USDC 毕业、单笔不封顶。
    function params() internal pure returns (Params memory) {
        return Params({
            virtualUsdc: 3_000_000_000, // 3000 USDC
            virtualToken: 1_073_000_000 ether,
            graduationUsdc: 10_000_000, // 10 USDC
            minSeedUsdc: 0,
            maxSeedUsdc: 20_000_000, // 20 USDC
            minUsdcAmount: 100, // 0.0001 USDC
            maxUsdcPerTrade: type(uint256).max // 不限
        });
    }
}
