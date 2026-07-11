export type ProtocolProfile = {
  minSeedUsdc: number
  maxSeedUsdc: number
  minBuyUsdc: number
  minSellUsdc: number
  graduationTargetUsdc: number
  maxTradeUsdc: number | null
  buyFeeBps: number
  sellFeeBps: number
  creatorFeeShareBps: number
  seedPresets: number[]
  source: 'chain' | 'env' | 'fallback'
}
