'use client'

import { createContext, useContext } from 'react'
import {
  useMarketLiveData,
  type MarketLiveItem,
} from '@/hooks/use-market-live-data'
import type { AccountMarket } from '@/lib/account/types'
import type { HyperliquidMarketQuote } from '@/lib/hyperliquid/types'

type MarketsContextValue = {
  items: MarketLiveItem[]
  markets: AccountMarket[]
  quotesBySymbol: Map<string, HyperliquidMarketQuote>
  loading: boolean
  error: string | null
  refetch: () => void
}

const MarketsContext = createContext<MarketsContextValue | null>(null)

export function MarketsProvider({ children }: { children: React.ReactNode }) {
  const value = useMarketLiveData()
  return (
    <MarketsContext.Provider value={value}>{children}</MarketsContext.Provider>
  )
}

export function useMarketsContext(): MarketsContextValue {
  const ctx = useContext(MarketsContext)
  if (!ctx) {
    throw new Error('useMarketsContext must be used within MarketsProvider')
  }
  return ctx
}

/** Safe for optional provider — returns null when outside MarketsProvider */
export function useMarketsContextOptional(): MarketsContextValue | null {
  return useContext(MarketsContext)
}
