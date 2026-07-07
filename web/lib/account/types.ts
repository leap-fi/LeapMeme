export type AccountLeverageToken = {
  address: string
  targetLeverage: number
  isLong: boolean
  symbol: string
  name: string
  decimals: number
  targetAsset: string
  mintPaused: boolean
  exchangeRate: string
  totalSupply: string
  totalAssets: string
}

export type AccountMarket = {
  symbol: string
  address: string
  decimals?: number
  name: string
  icon: string
  safetyLevel?: string | null
  warning?: boolean
  chain?: string
  leverage: AccountLeverageToken[]
  /** Optional fallback values from /market/markets */
  price?: number | string
  change?: number | string
  h24ChangePer?: number | string
}
