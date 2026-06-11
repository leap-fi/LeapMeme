import {
  displaySymbolFromUniverseName,
  resolveMidPrice,
} from '@/lib/hyperliquid/symbols'
import type {
  HyperliquidMarketQuote,
  MetaAndAssetCtxsResponse,
} from '@/lib/hyperliquid/types'

export function calcChangePercent(price: number, prevDayPx: number): number {
  if (!Number.isFinite(prevDayPx) || prevDayPx <= 0) return 0
  return ((price - prevDayPx) / prevDayPx) * 100
}

/** Fill prevDayPx map keyed by display symbol (account market symbol) */
export function buildQuotesFromMeta(
  response: MetaAndAssetCtxsResponse,
  prevDayBySymbol: Map<string, number>,
): void {
  const [meta, contexts] = response
  meta.universe.forEach((item, index) => {
    const ctx = contexts[index]
    if (!ctx) return
    const symbol = displaySymbolFromUniverseName(item.name, item.showSymbol)
    const prev = Number(ctx.prevDayPx)
    if (Number.isFinite(prev) && prev > 0) {
      prevDayBySymbol.set(symbol, prev)
    }
  })
}

export function buildQuotesFromMids(
  mids: Record<string, string>,
  prevDayBySymbol: Map<string, number>,
): Map<string, HyperliquidMarketQuote> {
  const quotes = new Map<string, HyperliquidMarketQuote>()

  for (const [symbol, prevDayPx] of prevDayBySymbol) {
    const price = resolveMidPrice(mids, symbol)
    if (price == null) continue
    quotes.set(symbol, {
      symbol,
      price,
      prevDayPx,
      changePercent: calcChangePercent(price, prevDayPx),
    })
  }

  // Include mids that have no meta prevDayPx (fallback: no change %)
  for (const key of Object.keys(mids)) {
    const display =
      key.startsWith('xyz:') ? key.slice(4) : key
    if (quotes.has(display)) continue
    const price = Number(mids[key])
    if (!Number.isFinite(price)) continue
    quotes.set(display, {
      symbol: display,
      price,
      prevDayPx: price,
      changePercent: 0,
    })
  }

  return quotes
}

export function mergeMidsIntoQuotes(
  mids: Record<string, string>,
  prevDayBySymbol: Map<string, number>,
  prev: Map<string, HyperliquidMarketQuote>,
): Map<string, HyperliquidMarketQuote> {
  const next = new Map(prev)

  for (const [symbol, prevDayPx] of prevDayBySymbol) {
    const price = resolveMidPrice(mids, symbol)
    if (price == null) continue
    next.set(symbol, {
      symbol,
      price,
      prevDayPx,
      changePercent: calcChangePercent(price, prevDayPx),
    })
  }

  return next
}
