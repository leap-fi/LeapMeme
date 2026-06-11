'use client'

import { useMemo } from 'react'
import { useAccountMarkets } from '@/hooks/use-account-markets'
import { useHyperliquidMarketPrices } from '@/hooks/use-hyperliquid-market-prices'
import type { AccountMarket } from '@/lib/account/types'
import type { HyperliquidMarketQuote } from '@/lib/hyperliquid/types'

export type MarketLiveItem = Omit<AccountMarket, 'price' | 'change'> & {
  price: number | null
  changePercent: number | null
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function resolveLivePrice(
  apiPrice: number | null,
  quote?: HyperliquidMarketQuote,
): number | null {
  if (quote?.price != null && Number.isFinite(quote.price)) return quote.price
  return apiPrice
}

function resolveLiveChange(
  apiChange: number | null,
  quote?: HyperliquidMarketQuote,
): number | null {
  if (quote?.changePercent == null || !Number.isFinite(quote.changePercent)) {
    return apiChange
  }
  // WS may emit 0% before prevDayPx baseline is loaded — keep API h24ChangePer until then.
  const noBaseline =
    quote.prevDayPx != null &&
    quote.price != null &&
    Math.abs(quote.prevDayPx - quote.price) < 1e-12
  if (noBaseline && apiChange != null) return apiChange
  return quote.changePercent
}

export function useMarketLiveData() {
  const { markets, loading: marketsLoading, error, refetch } = useAccountMarkets()
  const symbols = useMemo(() => markets.map((m) => m.symbol), [markets])
  const { quotesBySymbol } = useHyperliquidMarketPrices({
    symbols,
    enabled: markets.length > 0,
  })

  const items = useMemo<MarketLiveItem[]>(
    () =>
      markets.map((market) => {
        const quote = quotesBySymbol.get(market.symbol)
        const apiPrice = toFiniteNumber(market.price)
        const apiChange =
          toFiniteNumber(market.h24ChangePer) ?? toFiniteNumber(market.change)
        return {
          ...market,
          price: resolveLivePrice(apiPrice, quote),
          changePercent: resolveLiveChange(apiChange, quote),
        }
      }),
    [markets, quotesBySymbol],
  )

  /** Show list as soon as /account/markets has data; never wait for WS */
  const loading = marketsLoading && markets.length === 0

  return { items, markets, quotesBySymbol, loading, error, refetch }
}
