/**
 * World Cup fee charge & distribution — see docs/world-cup-2026-api.md §2.4
 *
 * Charge: fee_total on each trade → fee_creator (33.33%) + fee_protocol (66.67%)
 * Distribution: fee_creator → deployer (claim); fee_protocol pool → top 10 holders at graduation
 */

export const BPS_DENOMINATOR = 10_000 as const

/** Current production Zap / FeeVault params (verify on-chain) */
export const CURRENT_BUY_FEE_BPS = 75 as const
export const CURRENT_SELL_FEE_BPS = 75 as const
export const CURRENT_CREATOR_FEE_BPS = 3333 as const
export const CURRENT_PROTOCOL_FEE_BPS = BPS_DENOMINATOR - CURRENT_CREATOR_FEE_BPS

/** Protocol fee pool is split only among the top N holders by balance at graduation snapshot */
export const TOP_PROTOCOL_HOLDER_COUNT = 10 as const

export function bpsToPercent(feeBps: number): number {
  return feeBps / 100
}

/** Total fee charged on one trade (USDC ≈ 1:1) */
export function computeTradeFeeUsd(notionalUsd: number, feeBps: number): number {
  if (notionalUsd <= 0 || feeBps <= 0) return 0
  return roundUsd((notionalUsd * feeBps) / BPS_DENOMINATOR)
}

/** Creator portion of a single trade's fee (33.33% of fee_total) → deployer */
export function computeCreatorFeeUsd(
  notionalUsd: number,
  tradeFeeBps: number,
  creatorFeeBps: number = CURRENT_CREATOR_FEE_BPS,
): number {
  const total = computeTradeFeeUsd(notionalUsd, tradeFeeBps)
  return roundUsd((total * creatorFeeBps) / BPS_DENOMINATOR)
}

/** Protocol portion of a single trade's fee (66.67% of fee_total) → top-10 holder pool */
export function computeProtocolFeeUsd(
  notionalUsd: number,
  tradeFeeBps: number,
  creatorFeeBps: number = CURRENT_CREATOR_FEE_BPS,
): number {
  const total = computeTradeFeeUsd(notionalUsd, tradeFeeBps)
  return roundUsd(total - computeCreatorFeeUsd(notionalUsd, tradeFeeBps, creatorFeeBps))
}

export function computeEffectiveRatePercent(
  tradeFeeBps: number,
  shareBps: number,
): number {
  return roundPercent((tradeFeeBps / 100) * (shareBps / BPS_DENOMINATOR))
}

/** F = Σ fee_protocol — Leaderboard `totalRewardsUsd` */
export function computeTotalProtocolFeePoolUsd(protocolFeesUsd: number[]): number {
  return roundUsd(protocolFeesUsd.reduce((sum, fee) => sum + fee, 0))
}

/** Σ fee_creator — Leaderboard `deployer.rewardUsd` */
export function computeTotalCreatorFeeUsd(creatorFeesUsd: number[]): number {
  return roundUsd(creatorFeesUsd.reduce((sum, fee) => sum + fee, 0))
}

/**
 * Share of protocol pool within Top N holders (by snapshot balance).
 * `holderPoolPercentage` = b_a / W_topN × 100
 */
export function computeTopHolderPoolPercentage(
  holderBalance: number,
  topNTotalBalance: number,
): number {
  if (topNTotalBalance <= 0 || holderBalance <= 0) return 0
  return roundPercent((holderBalance / topNTotalBalance) * 100)
}

/** rewardUsd = F × (b_a / W_topN) */
export function computeTopHolderRewardUsd(
  protocolPoolUsd: number,
  holderBalance: number,
  topNTotalBalance: number,
): number {
  if (topNTotalBalance <= 0 || holderBalance <= 0) return 0
  return roundUsd((protocolPoolUsd * holderBalance) / topNTotalBalance)
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}
