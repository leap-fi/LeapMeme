'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import { usePrivy, useWallets, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { formatShortAddress } from '@/lib/utils'
import { getUserPositions } from '@/lib/apis/meme-server/user-positions.api'
import {
  isMeaningfulUserPositionBalance,
  normalizeUserPositionHoldAmount,
} from '@/lib/apis/meme-server/position-filter'
import { getLatestTrades } from '@/lib/apis/meme-server/latest-trades.api'
import { formatTimeAgo, formatUsdCompact, toNumber } from '@/lib/apis/meme-server/format'
import { TokenAvatar } from '@/components/token-avatar'
import type { LatestTradeDto, UserPositionDto } from '@/lib/apis/meme-server/types'
import { getViewerWalletAddress } from '@/lib/wallet/test-wallet'

type RecentTradeRow = {
  id: string
  symbol: string
  tokenAddress: string
  account: string
  time: string
  volumeUsd: number
}

const TRADES_POLL_MS = 5000

function mapLatestTrades(items: LatestTradeDto[]): RecentTradeRow[] {
  return items.map((item) => {
    const volume = toNumber(item.volume)
    const signedVolume = item.side === 'BUY' ? volume : -volume
    return {
      id: item.hash,
      symbol: item.symbol,
      tokenAddress: item.address,
      account: item.account,
      time: formatTimeAgo(item.tradeTime),
      volumeUsd: signedVolume,
    }
  })
}

function formatHoldAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  // API may return 0.25 (=25%) or 25 (=25%)
  return Math.abs(value) <= 1 ? value * 100 : value
}

function formatChangePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--'
  const normalized = normalizePercent(value)
  const sign = normalized >= 0 ? '+' : ''
  return `${sign}${normalized.toFixed(2)}%`
}

function formatPositionValueUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatTradeVolumeUsd(value: number): string {
  // Reuse compact USD formatter; strip "$" because sign is prefixed separately.
  return formatUsdCompact(Math.abs(value)).replace(/^\$/, '')
}

function PositionRow({ position }: { position: UserPositionDto }) {
  const holdAmount = toNumber(position.holdAmount)
  const price = toNumber(position.price)
  const valueUsd = holdAmount * price
  const rawChange =
    position.priceChangePercent24h ??
    position.changePercent24h ??
    position.changePercent
  const changePercent =
    rawChange == null ? null : Number.isFinite(toNumber(rawChange)) ? toNumber(rawChange) : null
  const href = `/coin/${encodeURIComponent(position.symbol)}?address=${encodeURIComponent(position.address)}`

  return (
    <Link
      href={href}
      className="block py-2 pr-4 hover:bg-secondary/40 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <TokenAvatar
          image={position.logo}
          symbol={position.symbol}
          className="w-6 h-6 rounded-full bg-secondary shrink-0 overflow-hidden"
          imgClassName="w-full h-full rounded-full object-cover"
          fallbackClassName="text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{position.symbol}</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatHoldAmount(holdAmount)} ·{' '}
            <span
              className={
                changePercent == null
                  ? 'text-muted-foreground'
                  : normalizePercent(changePercent) >= 0
                    ? 'text-primary'
                    : 'text-destructive'
              }
            >
              {formatChangePercent(changePercent)}
            </span>
          </p>
        </div>
        <span className="text-xs font-semibold shrink-0 text-foreground">
          {formatPositionValueUsd(valueUsd)}
        </span>
      </div>
    </Link>
  )
}

export function RightSidebar() {
  const { ready: privyReady, authenticated } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const walletAddress = useMemo(() => {
    const wallet = getEmbeddedConnectedWallet(wallets) ?? wallets[0]
    return getViewerWalletAddress(wallet?.address)
  }, [wallets])

  const [positions, setPositions] = useState<UserPositionDto[]>([])
  const [positionsLoading, setPositionsLoading] = useState(true)
  const [positionsError, setPositionsError] = useState<string | null>(null)

  const [trades, setTrades] = useState<RecentTradeRow[]>([])
  const [tradesInitialLoading, setTradesInitialLoading] = useState(true)
  const [tradesError, setTradesError] = useState<string | null>(null)
  const tradesLoadedOnceRef = useRef(false)

  const [isLive, setIsLive] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyAddress = async (
    e: React.MouseEvent,
    tradeId: string,
    address: string,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopiedId(tradeId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const loadPositions = useCallback(async (account: string) => {
    setPositionsLoading(true)
    setPositionsError(null)
    try {
      const list = await getUserPositions(account)
      const filtered = list
        .map((item) => ({
          ...item,
          holdAmount: normalizeUserPositionHoldAmount(item.holdAmount, item.decimals),
        }))
        .filter((item) => isMeaningfulUserPositionBalance(item))
      setPositions(filtered)
    } catch (err) {
      setPositions([])
      setPositionsError(
        err instanceof Error ? err.message : 'Failed to load positions',
      )
    } finally {
      setPositionsLoading(false)
    }
  }, [])

  const loadTrades = useCallback(async () => {
    const isFirstLoad = !tradesLoadedOnceRef.current
    if (isFirstLoad) {
      setTradesInitialLoading(true)
    }

    try {
      const list = await getLatestTrades()
      setTrades(mapLatestTrades(list))
      setTradesError(null)
      tradesLoadedOnceRef.current = true
    } catch (err) {
      if (!tradesLoadedOnceRef.current) {
        setTrades([])
        setTradesError(
          err instanceof Error ? err.message : 'Failed to load trades',
        )
      }
    } finally {
      if (isFirstLoad) {
        setTradesInitialLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!privyReady || !walletsReady) return
    if (!authenticated || !walletAddress) {
      setPositions([])
      setPositionsLoading(false)
      setPositionsError(null)
      return
    }
    void loadPositions(walletAddress)
  }, [privyReady, walletsReady, authenticated, walletAddress, loadPositions])

  useEffect(() => {
    if (!isLive) return

    void loadTrades()
    const interval = setInterval(() => {
      void loadTrades()
    }, TRADES_POLL_MS)

    return () => clearInterval(interval)
  }, [isLive, loadTrades])

  const renderPositions = () => {
    if (!privyReady || !walletsReady || !authenticated) {
      return (
        <p className="text-sm text-muted-foreground pr-4">
          Connect wallet to view positions
        </p>
      )
    }

    if (positionsLoading) {
      return (
        <div className="space-y-2 pr-4">
          {Array.from({ length: 1 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (positionsError) {
      return (
        <p className="text-sm text-destructive pr-4">{positionsError}</p>
      )
    }

    if (positions.length === 0) {
      return <p className="text-sm text-muted-foreground pr-4">No positions yet</p>
    }

    return (
      <div className="max-h-40 overflow-y-auto pr-1">
        {positions.map((p) => (
          <PositionRow key={p.id} position={p} />
        ))}
      </div>
    )
  }

  const renderRecentTrades = () => {
    if (tradesInitialLoading) {
      return Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center justify-between py-2 px-4 ${
            index % 2 === 0 ? 'bg-secondary/40' : ''
          }`}
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))
    }

    if (tradesError) {
      return (
        <p className="text-sm text-destructive px-4 py-2">{tradesError}</p>
      )
    }

    if (trades.length === 0) {
      return (
        <p className="text-sm text-muted-foreground px-4 py-2">No recent trades</p>
      )
    }

    return trades.map((trade, index) => (
      <Link
        key={trade.id}
        href={`/coin/${encodeURIComponent(trade.symbol)}?address=${encodeURIComponent(trade.tokenAddress)}`}
        className={`flex items-center justify-between py-2 px-4 text-sm transition-colors hover:bg-secondary/60 ${
          index % 2 === 0 ? 'bg-secondary/40' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{trade.symbol}</span>
            <span className="text-xs text-muted-foreground">{trade.time}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{formatShortAddress(trade.account, 4, 2)}</span>
            <button
              type="button"
              title="Copy address"
              onClick={(e) => handleCopyAddress(e, trade.id, trade.account)}
              className="p-0.5 hover:text-foreground transition-colors"
            >
              {copiedId === trade.id ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
        <span
          className={`font-semibold ${
            trade.volumeUsd >= 0 ? 'text-primary' : 'text-destructive'
          }`}
        >
          {trade.volumeUsd >= 0 ? '+' : '-'}${formatTradeVolumeUsd(trade.volumeUsd)}
        </span>
      </Link>
    ))
  }

  return (
    <div className="flex flex-col h-full">
      {/* My Positions */}
      <div className="pt-4 pl-4 pb-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">MY POSITIONS</h3>
        {renderPositions()}
      </div>

      {/* Recent Trades */}
      <div className="flex-1 flex flex-col min-h-0 pt-4">
        <div className="flex items-center justify-between mb-3 px-4">
          <h3 className="text-xs font-semibold text-muted-foreground">RECENT TRADES</h3>
          <button
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-1.5 text-xs"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
              }`}
            />
            <span className={isLive ? 'text-primary' : 'text-muted-foreground'}>LIVE</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">{renderRecentTrades()}</div>
      </div>
    </div>
  )
}
