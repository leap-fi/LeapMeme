import { fetchAccountMarketsApi } from '@/lib/apis/meme-server/markets.api'
import type { AccountMarket } from '@/lib/account/types'

export async function fetchAccountMarkets(): Promise<AccountMarket[]> {
  return fetchAccountMarketsApi()
}

/** e.g. "2×–5×" from available leverage tiers */
export function formatLeverageRange(market: AccountMarket): string {
  const tiers = [
    ...new Set(
      (market.leverage ?? [])
        .map((lt) => lt.targetLeverage)
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ].sort((a, b) => a - b)

  if (tiers.length === 0) return '—'
  if (tiers.length === 1) return `${tiers[0]}×`
  return `${tiers[0]}×–${tiers[tiers.length - 1]}×`
}

export function formatMarketPrice(market: AccountMarket): string | null {
  if (market.price == null || market.price === '') return null
  const n = typeof market.price === 'number' ? market.price : Number(market.price)
  if (!Number.isFinite(n)) return String(market.price)
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
}
