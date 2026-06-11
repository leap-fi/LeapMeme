'use client'

import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { PERIOD_OPTIONS } from '@/lib/tradingview/constants'
import { cn } from '@/lib/utils'
import { useKlineFeed } from '@/lib/tradingview/hooks/use-kline-feed'
import { useLightweightChart } from '@/lib/tradingview/hooks/use-lightweight-chart'
import type { KlinePeriod } from '@/lib/tradingview/types'

type KlineChartProps = {
  address: string
  header?: ReactNode
  footer?: ReactNode
}

function ShareLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? 'Link copied' : 'Share page link'}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
        copied
          ? 'bg-primary text-primary-foreground'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
      )}
    >
      {copied ? (
        <>
          Copied
          <Check className="h-3.5 w-3.5" />
        </>
      ) : (
        <>
          Share
          <Share2 className="h-3.5 w-3.5" />
        </>
      )}
    </button>
  )
}

export function KlineChart({ address, header, footer }: KlineChartProps) {
  const [period, setPeriod] = useState<KlinePeriod>('1m')
  const { candles, loading } = useKlineFeed(address, period)

  const chartRef = useRef<HTMLDivElement>(null)
  useLightweightChart(chartRef, candles, period)

  return (
    <div className="bg-card rounded-xl p-6">
      {header ? <div className="mb-4">{header}</div> : null}

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === item.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ShareLinkButton />
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-lg lg:h-[460px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
            Loading kline...
          </div>
        )}
        <div ref={chartRef} className="h-full w-full" />
      </div>

      {footer ? (
        <div className="mt-3 border-t border-border pt-3">{footer}</div>
      ) : null}
    </div>
  )
}
