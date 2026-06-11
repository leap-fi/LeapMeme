'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { TokenAvatar } from '@/components/token-avatar'
import { useMarketsContextOptional } from '@/contexts/markets-context'
import type { Token } from '@/lib/mock-data'
import { isRenderableImageSrc } from '@/lib/image-src'

interface TokenListProps {
  tokens: Token[]
}

export function TokenList({ tokens }: TokenListProps) {
  const marketsContext = useMarketsContextOptional()
  const marketIconBySymbol = useMemo(() => {
    const map = new Map<string, string>()
    for (const market of marketsContext?.markets ?? []) {
      const key = market.symbol.trim().toUpperCase()
      if (key) map.set(key, market.icon)
    }
    return map
  }, [marketsContext?.markets])

  return (
    <div className="space-y-1">
      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span className="w-full text-left">Token</span>
        <span className="w-full text-left">Underlying</span>
        <span className="w-full text-left">24H Change</span>
        <span className="w-full text-left">Progress</span>
        <span className="w-full text-right">MCap</span>
      </div>

      {tokens.map((token) => (
        <TokenRow
          key={token.id}
          token={token}
          marketIconBySymbol={marketIconBySymbol}
        />
      ))}
    </div>
  )
}

function fallbackUnderlyingEmoji(underlying: string): string {
  switch (underlying) {
    case 'HYPE':
      return '💜'
    case 'BTC':
      return '🟠'
    case 'ETH':
      return '💠'
    case 'SOL':
      return '🟣'
    case 'SP500':
      return '📊'
    case 'NVDA':
      return '🟢'
    case 'TSLA':
      return '🔴'
    case 'NEAR':
      return '🌐'
    default:
      return '⚪'
  }
}

function resolveUnderlyingSymbol(underlying: string): string {
  const value = underlying.trim()
  if (!value) return ''
  const idx = value.lastIndexOf(':')
  if (idx >= 0 && idx < value.length - 1) {
    return value.slice(idx + 1).trim().toUpperCase()
  }
  return value.toUpperCase()
}

function TokenRow({
  token,
  marketIconBySymbol,
}: {
  token: Token
  marketIconBySymbol: Map<string, string>
}) {
  const href = token.contractAddress
    ? `/coin/${encodeURIComponent(token.symbol)}?address=${token.contractAddress}`
    : `/coin/${encodeURIComponent(token.symbol)}`
  const underlyingSymbol = resolveUnderlyingSymbol(token.underlying)
  const underlyingIcon = marketIconBySymbol.get(underlyingSymbol)
  const changePositive = token.change24h >= 0
  const changeLabel = `${changePositive ? '+' : ''}${token.change24h.toFixed(1)}%`
  const changeClass = changePositive ? 'text-primary' : 'text-destructive'
  const mcapClass = token.marketCap.includes('M') ? 'text-primary' : 'text-foreground'
  const progressBarClass =
    token.progress >= 100 || token.graduated ? 'bg-[rgb(240,180,41)]' : 'bg-primary'

  return (
    <Link href={href} className="block">
      {/* Mobile card */}
      <div className="md:hidden border-b border-border/50 px-4 py-3.5 transition-colors active:bg-secondary/40 hover:bg-secondary/30">
        <div className="flex gap-3">
          <TokenAvatar
            image={token.image}
            symbol={token.symbol}
            className="size-11 shrink-0 rounded-xl bg-secondary overflow-hidden"
            imgClassName="size-full object-cover"
            fallbackClassName="text-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold text-foreground">{token.symbol}</span>
                  {token.graduated && (
                    <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Graduated
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{token.name}</p>
              </div>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${changeClass}`}>
                {changeLabel}
              </span>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-secondary/70 px-2 py-1">
                <UnderlyingIcon icon={underlyingIcon} symbol={underlyingSymbol} />
                <span className="truncate text-xs font-medium text-foreground">{token.underlying}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {token.leverage}x{' '}
                  <span className={token.direction === 'Long' ? 'text-primary' : 'text-destructive'}>
                    {token.direction}
                  </span>
                </span>
              </div>
              <span className={`shrink-0 text-xs font-semibold tabular-nums ${mcapClass}`}>
                {token.marketCap}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/80">
                <div
                  className={`h-full rounded-full transition-all ${progressBarClass}`}
                  style={{ width: `${token.progress}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                {token.graduated ? '100%' : `${token.progress}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table row */}
      <div className="group hidden cursor-pointer grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-4 border-b border-border/50 px-4 py-3 transition-colors hover:bg-secondary/30 md:grid">
        <div className="flex items-center gap-3">
          <TokenAvatar
            image={token.image}
            symbol={token.symbol}
            className="size-10 shrink-0 rounded-lg bg-secondary overflow-hidden"
            imgClassName="size-full object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{token.symbol}</span>
              {token.graduated && (
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  Graduated
                </span>
              )}
            </div>
            <span className="block truncate text-xs text-muted-foreground">{token.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UnderlyingIcon icon={underlyingIcon} symbol={underlyingSymbol} size="md" />
          <span className="text-sm font-medium text-foreground">{token.underlying}</span>
          <span className="text-xs text-muted-foreground">
            {token.leverage}x{' '}
            <span className={token.direction === 'Long' ? 'text-primary' : 'text-destructive'}>
              {token.direction}
            </span>
          </span>
        </div>

        <div className="flex items-center">
          <span className={`text-sm font-semibold ${changeClass}`}>{changeLabel}</span>
        </div>

        <div className="flex items-center">
          <div className="max-w-[120px] flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${progressBarClass}`}
                style={{ width: `${token.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <span className={`text-sm font-semibold ${mcapClass}`}>{token.marketCap}</span>
        </div>
      </div>
    </Link>
  )
}

function UnderlyingIcon({
  icon,
  symbol,
  size = 'sm',
}: {
  icon?: string
  symbol: string
  size?: 'sm' | 'md'
}) {
  const boxClass = size === 'sm' ? 'size-4' : 'size-6'
  const emojiClass = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className={`${boxClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary`}>
      {isRenderableImageSrc(icon) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="size-full object-cover" />
      ) : (
        <span className={emojiClass}>{fallbackUnderlyingEmoji(symbol)}</span>
      )}
    </div>
  )
}
