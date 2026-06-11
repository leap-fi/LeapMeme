/** World Cup 2026 page API types — Live Graduation Race & Graduation Leaderboard */

export type WorldCupTeamStatus = 'graduated' | 'near' | 'active' | 'pending'

export type WorldCupRaceFilter = 'all' | WorldCupTeamStatus

export type WorldCupLeverageDirection = 'long' | 'short'

/** Nation slot in a tournament group (A–L) */
export type WorldCupGroupLetter =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'

/** Token already launched on the bonding curve */
export type WorldCupLaunchedTeam = {
  code: string
  name: string
  group: WorldCupGroupLetter
  status: Exclude<WorldCupTeamStatus, 'pending'>
  /** Bonding curve fill progress, 0–100 */
  progress: number
  /** Cumulative bonding-curve volume in USD */
  bondingCurveVolumeUsd: number
  type: WorldCupLeverageDirection
  /** Leverage multiplier label, e.g. `"5x"` */
  leverage: string
  holders: number
  /** Display symbol, e.g. `$ARG5L` */
  tokenSymbol: string
  /** On-chain ERC-20 address when launched */
  contractAddress?: string
  flagUrl: string
}

/** Nation without a token yet */
export type WorldCupPendingTeam = {
  code: string
  name: string
  group: WorldCupGroupLetter
  status: 'pending'
  flagUrl: string
  /** Prefilled create page path, e.g. `/create?from=world-cup-Mexico` */
  createHref: string
}

export type WorldCupRaceTeam = WorldCupLaunchedTeam | WorldCupPendingTeam

export type WorldCupGraduationRaceSummary = {
  total: number
  graduated: number
  near: number
  active: number
  pending: number
}

export type WorldCupGraduationRaceResponse = {
  /** Fixed graduation threshold (USD) for World Cup campaign */
  graduationTargetUsd: number
  /** Progress >= this value maps to UI status `near` */
  nearGraduationProgressMin: number
  summary: WorldCupGraduationRaceSummary
  teams: WorldCupRaceTeam[]
}

export type WorldCupRewardParticipant = {
  address: string
  rewardUsd: number
}

export type WorldCupTopHolder = WorldCupRewardParticipant & {
  rank: number
  /**
   * 占 Top N 协议池内的持仓比例，0–100：b_a / W_topN × 100。
   * 返回满 N 条时各条之和为 100。
   */
  holderPoolPercentage: number
}

export type WorldCupGraduatedToken = {
  tokenSymbol: string
  name: string
  teamCode: string
  type: WorldCupLeverageDirection
  leverage: string
  /** ISO 8601 date, e.g. `2026-05-28` */
  graduatedAt: string
  /**
   * 累计协议手续费池 F（USD）= Σ fee_protocol（每笔总费的 66.67%）。
   * 毕业时 100% 分给快照时刻持仓 Top 10 持有人。
   * ≠ bondingCurveVolumeUsd；≠ fee_creator 累计。
   */
  totalRewardsUsd: number
  contractAddress?: string
  explorerUrl?: string
  flagUrl: string
  /**
   * 部署者累计创建者手续费（Σ fee_creator，每笔总费的 33.33%），
   * 与协议池 F 独立，走 Creator Rewards Claim 路径。
   */
  deployer: WorldCupRewardParticipant
  /** 毕业快照时持仓 Top 10，按持仓比例分走全部 F；最多 10 条 */
  topHolders: WorldCupTopHolder[]
}

export type WorldCupTopEarner = {
  rank: number
  address: string
  totalEarnedUsd: number
  /** Number of graduated tokens this wallet earned from */
  graduatedTokenCount: number
  /** References `tokenSymbol` values in `graduatedTokens` */
  graduatedTokenSymbols: string[]
}

export type WorldCupLeaderboardSummary = {
  tokensGraduated: number
  totalRewardsPaidUsd: number
  uniqueEarners: number
  avgRewardPerTokenUsd: number
}

export type WorldCupLeaderboardResponse = {
  summary: WorldCupLeaderboardSummary
  graduatedTokens: WorldCupGraduatedToken[]
  topEarners: WorldCupTopEarner[]
}

/** Standard meme-server envelope */
export type WorldCupApiEnvelope<T> = {
  code: number
  msg: string
  data: T
}
