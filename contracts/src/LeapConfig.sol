// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 协议经济参数集中定义，部署脚本 / 测试从这里取值，切换 Playground ↔ Production 只改一处。
///      USDC 为 6 位小数；VIRTUAL_TOKEN / meme 为 18 位小数。
library LeapConfig {
    struct Params {
        uint256 virtualUsdc; // 曲线虚拟 USDC 储备
        uint256 virtualToken; // 曲线虚拟 meme 储备
        uint256 graduationUsdc; // 累计真实募集达到此值即毕业
        uint256 minSeedUsdc; // createToken 最小 seed（0 = 允许不垫钱）
        uint256 minUsdcAmount; // 单笔 buy 最小 USDC
        uint256 maxUsdcPerTrade; // 单笔 buy/sell 的 USDC 上限（全生命周期），max = 不限
    }

    /// @dev 低风险体验版：0 seed、单笔 ≤ 1 USDC、10 USDC 毕业、虚拟池整体缩小。
    function playground() internal pure returns (Params memory) {
        return Params({
            virtualUsdc: 3_000_000, // 3 USDC
            virtualToken: 1_073_000_000 ether,
            graduationUsdc: 10_000_000, // 10 USDC
            minSeedUsdc: 0,
            minUsdcAmount: 100_000, // 0.1 USDC
            maxUsdcPerTrade: 1_000_000 // 1 USDC
        });
    }

    /// @dev 正式版（pump.fun 量级）：大虚拟池、20 seed、1000 USDC 毕业、单笔不封顶。
    function production() internal pure returns (Params memory) {
        return Params({
            virtualUsdc: 3_000_000_000, // 3000 USDC
            virtualToken: 1_073_000_000 ether,
            graduationUsdc: 1_000_000_000, // 1000 USDC
            minSeedUsdc: 20_000_000, // 20 USDC
            minUsdcAmount: 10_000_000, // 10 USDC
            maxUsdcPerTrade: type(uint256).max // 不限
        });
    }
}
