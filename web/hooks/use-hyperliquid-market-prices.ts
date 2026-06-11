'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { calcChangePercent, mergeMidsIntoQuotes } from '@/lib/hyperliquid/quotes'
import { fetchHyperliquidMarketSnapshot } from '@/lib/hyperliquid/rest'
import { resolveMidPrice } from '@/lib/hyperliquid/symbols'
import type { HyperliquidMarketQuote } from '@/lib/hyperliquid/types'
import { getHyperliquidWsClient } from '@/lib/hyperliquid/ws'

const PRICES_READY_TIMEOUT_MS = 15_000

export type UseHyperliquidMarketPricesOptions = {
  symbols: string[]
  enabled?: boolean
}

export type UseHyperliquidMarketPricesState = {
  quotesBySymbol: Map<string, HyperliquidMarketQuote>
  ready: boolean
  loading: boolean
}

function hasAnyPrice(
  symbols: string[],
  quotes: Map<string, HyperliquidMarketQuote>,
): boolean {
  return symbols.some((symbol) => {
    const price = quotes.get(symbol)?.price
    return price != null && Number.isFinite(price)
  })
}

export function useHyperliquidMarketPrices({
  symbols,
  enabled = true,
}: UseHyperliquidMarketPricesOptions): UseHyperliquidMarketPricesState {
  const [quotesBySymbol, setQuotesBySymbol] = useState<
    Map<string, HyperliquidMarketQuote>
  >(new Map())
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const prevDayRef = useRef<Map<string, number>>(new Map())
  const symbolKey = useMemo(() => symbols.join('\0'), [symbols])

  useEffect(() => {
    if (hasAnyPrice(symbols, quotesBySymbol)) {
      setReady(true)
    }
  }, [quotesBySymbol, symbols])

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setReady(true)
      setTimedOut(false)
      setQuotesBySymbol(new Map())
      return
    }

    let cancelled = false
    setReady(false)
    setTimedOut(false)
    setQuotesBySymbol(new Map())

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setTimedOut(true)
    }, PRICES_READY_TIMEOUT_MS)

    fetchHyperliquidMarketSnapshot()
      .then(({ quotes, prevDayBySymbol }) => {
        if (cancelled) return
        prevDayRef.current = prevDayBySymbol
        setQuotesBySymbol(filterQuotes(quotes, symbols))
      })
      .catch(() => {
        if (!cancelled) setQuotesBySymbol(new Map())
      })

    const unsubscribe = getHyperliquidWsClient().subscribe((mids) => {
      if (cancelled) return
      setQuotesBySymbol((prev) => {
        const merged = mergeMidsIntoQuotes(mids, prevDayRef.current, prev)
        for (const symbol of symbols) {
          if (merged.has(symbol)) continue
          const price = resolveMidPrice(mids, symbol)
          if (price == null) continue
          const prevDayPx = prevDayRef.current.get(symbol) ?? price
          merged.set(symbol, {
            symbol,
            price,
            prevDayPx,
            changePercent: calcChangePercent(price, prevDayPx),
          })
        }
        return filterQuotes(merged, symbols)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [enabled, symbolKey, symbols])

  const loading = enabled && symbols.length > 0 && !ready && !timedOut

  return { quotesBySymbol, ready: ready || timedOut, loading }
}

function filterQuotes(
  quotes: Map<string, HyperliquidMarketQuote>,
  symbols: string[],
): Map<string, HyperliquidMarketQuote> {
  const out = new Map<string, HyperliquidMarketQuote>()
  for (const symbol of symbols) {
    const q = quotes.get(symbol)
    if (q) out.set(symbol, q)
  }
  return out
}
