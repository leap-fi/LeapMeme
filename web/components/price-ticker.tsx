'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useMarketsContext } from '@/contexts/markets-context'
import { formatChangePercent, formatUsdPrice } from '@/lib/hyperliquid/format'
import { Skeleton } from '@/components/ui/skeleton'

const TICKER_SKELETON_ITEMS = 12

function PriceTickerSkeleton() {
  return (
    <div className="flex whitespace-nowrap py-0.5">
      {Array.from({ length: TICKER_SKELETON_ITEMS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 mx-6">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-9" />
        </div>
      ))}
    </div>
  )
}

export function PriceTicker() {
  const { items, loading } = useMarketsContext()
  const trackRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<Animation | null>(null)

  const tickerItems = useMemo(() => {
    if (items.length === 0) return []
    return [...items, ...items]
  }, [items])

  useEffect(() => {
    const track = trackRef.current
    if (!track || tickerItems.length === 0) return

    const animation = track.animate(
      [{ transform: 'translateX(0%)' }, { transform: 'translateX(-50%)' }],
      { duration: 30000, iterations: Infinity, easing: 'linear' },
    )
    animationRef.current = animation

    return () => animation.cancel()
  }, [tickerItems.length])

  const pause = () => animationRef.current?.pause()
  const play = () => animationRef.current?.play()

  if (loading) {
    return (
      <div className="price-ticker w-full bg-secondary/50 overflow-hidden py-2 border-b border-border">
        <PriceTickerSkeleton />
      </div>
    )
  }

  if (tickerItems.length === 0) {
    return null
  }

  return (
    <div
      className="price-ticker w-full bg-secondary/50 overflow-hidden py-2 border-b border-border"
      onMouseEnter={pause}
      onMouseLeave={play}
    >
      <div ref={trackRef} className="price-ticker-track flex whitespace-nowrap">
        {tickerItems.map((item, index) => {
          const hasPrice = item.price != null && Number.isFinite(item.price)
          const hasChange =
            item.changePercent != null && Number.isFinite(item.changePercent)

          return (
            <div
              key={`${item.symbol}-${index}`}
              className="flex items-center gap-2 mx-6"
            >
              <span className="text-xs font-semibold text-foreground">
                {item.symbol}
              </span>
              {hasPrice && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatUsdPrice(item.price!)}
                </span>
              )}
              {hasChange && (
                <span
                  className={`text-xs font-medium tabular-nums ${
                    item.changePercent! >= 0 ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {formatChangePercent(item.changePercent!)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
