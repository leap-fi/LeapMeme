export type HyperliquidWsMessage = {
  channel?: string
  data?: {
    mids?: Record<string, string>
    coin?: string
  }
}

export type HyperliquidUniverseItem = {
  name: string
  showSymbol?: string
  szDecimals?: number
  maxLeverage?: number
}

export type HyperliquidAssetCtx = {
  markPx: string
  midPx?: string
  prevDayPx: string
  dayNtlVlm?: string
}

export type MetaAndAssetCtxsResponse = [
  { universe: HyperliquidUniverseItem[] },
  HyperliquidAssetCtx[],
]

export type HyperliquidMarketQuote = {
  symbol: string
  price: number
  changePercent: number
  prevDayPx: number
}
