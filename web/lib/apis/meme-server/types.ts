export interface BaseResponse<T> {
  code: number
  msg: string
  ts: number
  data: T
}

export type TokenStatus = 'NEW' | 'TRADING' | 'MIGRATING' | 'COMPLETED' | 'GRADUATED' | 'MIGRATED'

/** GET /market/token/newTokens — see doc/API_DOC.md §2.1 */
export interface TokenNewDto {
  address: string
  symbol: string
  name: string
  totalSupply?: number | string
  decimals?: number
  logo?: string | null
  creator?: string
  description?: string | null
  showName?: boolean
  twitter?: string | null
  telegram?: string | null
  website?: string | null
  blockNumber?: number
  hash?: string
  source?: string
  dex?: string
  timestamp?: number
  migrateTime?: number | null
  completeTime?: number | null
  graduatingTime?: number | null
  graduatedTime?: number | null
  marketCap?: number | string
  tradeVolume?: number | string
  tradeCount?: number
  top10Holder?: number | string
  bondingCurveProgress?: number | string
  status?: TokenStatus | string
  tradeVolume24h?: number | string
  buyVolume24h?: number | string
  sellVolume24h?: number | string
  tradeCount24h?: number
  buyCount24h?: number
  sellCount24h?: number
  liquidity?: number | string
  /** Optional LEAP / LT metadata when backend provides it */
  targetAsset?: string
  underlying?: string
  targetLeverage?: number
  leverage?: number
  isLong?: boolean
  direction?: string
  priceChangePercent24h?: number | string
  bonding?: string | null
  zap?: string | null
  router?: string | null
}

export type NewTokensQueryParams = {
  /** Backend convention: 1 = new, 3 = graduated. */
  type?: string
  pageNum?: string
  pageSize?: string
  market?: string
  leverage?: string
  direction?: 'LONG' | 'SHORT'
  sortField?: 'marketCap' | 'tradeVolume' | 'priceChangePercent24h' | 'graduatedTime'
  sortOrder?: 'asc' | 'desc'
  marketCapMin?: string
  marketCapMax?: string
  tradeVolume24hMin?: string
  tradeVolume24hMax?: string
  tradeCount24hMin?: string
  tradeCount24hMax?: string
  buyCount24hMin?: string
  buyCount24hMax?: string
  sellCount24hMin?: string
  sellCount24hMax?: string
  liquidityMin?: string
  liquidityMax?: string
}

export type TrendingTokensQueryParams = {
  /** Fuzzy match on address and symbol — see doc/api_documentation.md */
  search?: string
  market?: string
  leverage?: string
  direction?: 'LONG' | 'SHORT'
  sortField?: 'marketCap' | 'tradeVolume' | 'priceChangePercent24h' | 'graduatedTime'
  sortOrder?: 'asc' | 'desc'
  pageNum?: string
  pageSize?: string
}

export interface TokenTradeDto {
  hash: string
  address: string
  account: string
  side: 'BUY' | 'SELL'
  amount: number
  volume: number
  price: number
  tradeTime: number
  source: string
}

/** GET /market/trade/latest — see docs/meme_api_document.md §2 */
export interface LatestTradeDto {
  hash: string
  symbol: string
  name: string
  address: string
  account: string
  side: 'BUY' | 'SELL'
  amount: number | string
  volume: number | string
  price: number | string
  tradeTime: number
  source: string
}

/** GET /market/user/rewards — per-token creator fee accrual by fee vault */
export interface UserRewardDto {
  tokenId?: number
  address: string
  symbol: string
  name: string
  logo?: string | null
  tradeVolume24h?: number | string
  accruedAmount?: number | string
}

/** GET /market/user/positions — see docs/meme_api_document.md §3 */
export interface UserPositionDto {
  id: string
  tokenId?: number
  address: string
  symbol: string
  name: string
  logo?: string | null
  decimals?: number | string
  account: string
  holdAmount: number | string
  totalProfit: number | string
  lastActiveTime?: number
  price?: number | string
  priceChangePercent24h?: number | string
  changePercent24h?: number | string
  changePercent?: number | string
}
