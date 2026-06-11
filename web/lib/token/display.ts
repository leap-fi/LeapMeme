import { formatLeverageLabel } from '@/lib/account/market-leverage'

/** Resolve full market label (e.g. `xyz:SPCX`) from API market or underlying asset. */
export function resolveMarketLabel(
  market?: string | null,
  underlying?: string | null,
): string {
  const fromMarket = market?.trim()
  if (fromMarket) return fromMarket

  const fromUnderlying = underlying?.trim()
  if (!fromUnderlying) return ''
  if (fromUnderlying.includes(':')) return fromUnderlying
  return `xyz:${fromUnderlying}`
}

export type TokenHeaderTitleParts = {
  symbol: string
  market: string | null
  meta: string
}

export function resolveTokenHeaderTitleParts(input: {
  symbol: string
  market?: string | null
  underlying?: string | null
  leverage: number
  direction: 'Long' | 'Short'
}): TokenHeaderTitleParts {
  const symbol = input.symbol.trim()
  const market = resolveMarketLabel(input.market, input.underlying) || null
  const meta = `${formatLeverageLabel(input.leverage)} ${input.direction}`
  return { symbol, market, meta }
}

/** Coin page header title, e.g. `SPCX/xyz:SPCX 3× Long`. */
export function formatTokenHeaderTitle(
  input: Parameters<typeof resolveTokenHeaderTitleParts>[0],
): string {
  const { symbol, market, meta } = resolveTokenHeaderTitleParts(input)
  if (!market) return `${symbol} ${meta}`
  return `${symbol} / ${market} ${meta}`
}
