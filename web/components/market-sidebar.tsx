'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useMarketsContext } from '@/contexts/markets-context'
import { formatChangePercent, formatUsdPrice } from '@/lib/hyperliquid/format'
import { Skeleton } from '@/components/ui/skeleton'

const MARKET_SKELETON_ROWS = 10

function MarketSidebarSkeleton() {
  return (
    <>
      {Array.from({ length: MARKET_SKELETON_ROWS }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3 border-t border-border gap-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-12 shrink-0" />
        </div>
      ))}
    </>
  )
}

type MarketSidebarProps = {
  selectedMarket?: string
  onMarketSelect?: (symbol: string) => void
}

export function MarketSidebar({
  selectedMarket,
  onMarketSelect,
}: MarketSidebarProps) {
  const { items, loading, error, refetch } = useMarketsContext()

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xs font-semibold text-muted-foreground px-4 pt-4 pb-3 uppercase tracking-wider">
        Markets
      </h2>

      <div className="flex-1 overflow-y-auto">
        {loading && <MarketSidebarSkeleton />}

        {!loading && error && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No markets</p>
        )}

        {!loading &&
          !error &&
          items.map((market) => {
            const hasPrice = market.price != null && Number.isFinite(market.price)
            const hasChange =
              market.changePercent != null && Number.isFinite(market.changePercent)

            const isSelected = selectedMarket === market.symbol

            return (
              <button
                type="button"
                key={market.symbol}
                onClick={() => onMarketSelect?.(market.symbol)}
                className={`w-full flex items-center justify-between px-4 py-3 border-t border-border gap-2 text-left transition-colors ${
                  onMarketSelect ? 'cursor-pointer hover:bg-secondary/50' : ''
                } ${isSelected ? 'bg-secondary/60' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {market.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={market.icon}
                      alt=""
                      className="w-5 h-5 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <span className="text-sm shrink-0">⚪</span>
                  )}
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">
                      {market.symbol}
                    </span>
                    {hasChange && (
                      <p
                        className={`text-xs ${market.changePercent! >= 0 ? 'text-primary' : 'text-destructive'}`}
                      >
                        {formatChangePercent(market.changePercent!)}
                      </p>
                    )}
                  </div>
                </div>
                {hasPrice && (
                  <span className="text-sm text-foreground font-medium shrink-0 text-right tabular-nums">
                    {formatUsdPrice(market.price!)}
                  </span>
                )}
              </button>
            )
          })}
      </div>

      <div className="px-4 py-4 border-t border-border">
        <Link
          href="/create"
          className="w-full py-3 border border-primary text-primary font-semibold text-sm rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          CREATE ON LEAP
        </Link>
      </div>
    </div>
  )
}
