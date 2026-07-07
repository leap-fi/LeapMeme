/**
 * 协议经济参数单一入口（前端）。与合约 LeapConfig / 后端 BondingCurveGraduationTargetUSD 同源。
 *
 * 通过 NEXT_PUBLIC_PROTOCOL_PROFILE=playground | production 切换：
 *  - playground（默认）：低风险体验版——0 seed、单笔 ≤ 1 USDC、10 USDC 毕业。
 *  - production：pump.fun 量级——20 seed、单笔不封顶、1000 USDC 毕业。
 *
 * 部署正式合约后，可改为启动时从链上 read（Zap/Bonding 的 getter）以彻底避免漂移。
 */
export type ProtocolProfileName = 'playground' | 'production'

export type ProtocolProfile = {
  name: ProtocolProfileName
  /** createToken 最小 seed（USDC）。0 = 允许不垫钱发币。 */
  minSeedUsdc: number
  /** 单笔 buy 最小 USDC。 */
  minBuyUsdc: number
  /** 卖出预估产出的 UI 下限（USDC）；0 = 不设下限。 */
  minSellUsdc: number
  /** 单笔 buy/sell 的 USDC 上限（全生命周期）；0 = 不封顶。 */
  maxTradeUsdc: number
  /** 毕业阈值（真实募集 USDC）。 */
  graduationTargetUsdc: number
  /** seed buy 预设按钮金额（USDC）。 */
  seedPresets: number[]
}

const PLAYGROUND: ProtocolProfile = {
  name: 'playground',
  minSeedUsdc: 0,
  minBuyUsdc: 0.1,
  minSellUsdc: 0,
  maxTradeUsdc: 1,
  graduationTargetUsdc: 10,
  seedPresets: [0, 0.25, 0.5, 1],
}

const PRODUCTION: ProtocolProfile = {
  name: 'production',
  minSeedUsdc: 20,
  minBuyUsdc: 20,
  minSellUsdc: 12,
  maxTradeUsdc: 0,
  graduationTargetUsdc: 1000,
  seedPresets: [20, 31, 62, 94, 160],
}

export const PROTOCOL_PROFILE: ProtocolProfile =
  process.env.NEXT_PUBLIC_PROTOCOL_PROFILE === 'production' ? PRODUCTION : PLAYGROUND

/** 是否为低风险体验版（用于全站文案 / 广告位判断）。 */
export const IS_PLAYGROUND = PROTOCOL_PROFILE.name === 'playground'
