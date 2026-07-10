/**
 * 协议经济参数单一入口（前端）。与合约 LeapConfig / 后端 BondingCurveGraduationTargetUSD 同源。
 *
 * 部署后如需彻底避免漂移，可改为启动时从链上 read（Zap/Bonding 的 getter）。
 */
export type ProtocolProfile = {
  /** createToken 最小 seed（USDC）。0 = 允许不垫钱发币。 */
  minSeedUsdc: number
  /** createToken 最大 seed（USDC）。 */
  maxSeedUsdc: number
  /** 单笔 buy 最小 USDC。 */
  minBuyUsdc: number
  /** 卖出预估产出的 UI 下限（USDC）；0 = 不设下限。 */
  minSellUsdc: number
  /** 毕业阈值（真实募集 USDC）。 */
  graduationTargetUsdc: number
  /** seed buy 预设按钮金额（USDC）。 */
  seedPresets: number[]
}

export const PROTOCOL_PROFILE: ProtocolProfile = {
  minSeedUsdc: 0,
  maxSeedUsdc: 20,
  minBuyUsdc: 0.0001,
  minSellUsdc: 0,
  graduationTargetUsdc: 10,
  seedPresets: [0, 5, 10, 20],
}
