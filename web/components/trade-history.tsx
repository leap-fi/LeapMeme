'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTokenTrades } from '@/lib/apis/meme-server/token-trades.api'
import type { TokenTradeDto } from '@/lib/apis/meme-server/types'
import type { Token } from '@/lib/mock-data'
import { hyperEvm } from '@/lib/contracts/chain'
import { Check, Copy, ExternalLink } from 'lucide-react'

interface TradeHistoryProps {
  token: Token
  contractAddressOverride?: string | null
  /** Omit outer card shell and section title (e.g. inside coin page tabs). */
  embedded?: boolean
  /** Bump to reload once (e.g. after a successful trade). */
  refreshKey?: number
}

const TRADES_POLL_MS = 10_000

type TradeRow = {
  id: string
  account: string
  type: 'buy' | 'sell'
  usdc: string
  hos: string
  time: string
  txHash: string
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeTokenAmount(value: number | string | null | undefined, decimals = 18): number {
  if (value == null || value === '') return 0

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    // If it is already decimal/scientific notation, treat as normalized.
    if (trimmed.includes('.') || /e/i.test(trimmed)) {
      return toNumber(trimmed)
    }
    // Large integer strings are usually raw on-chain units; scale down by decimals.
    if (/^\d+$/.test(trimmed) && trimmed.length > decimals) {
      try {
        const base = 10 ** decimals
        return Number(trimmed) / base
      } catch {
        return toNumber(trimmed)
      }
    }
    return toNumber(trimmed)
  }

  // Numeric payloads: if it's a huge integer-like value, likely raw units.
  if (Number.isInteger(value) && Math.abs(value) >= 1e12) {
    return value / 10 ** decimals
  }
  return toNumber(value)
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatTradeTimeAgo(timestampMs: number): string {
  const ts = timestampMs < 1_000_000_000_000 ? timestampMs * 1000 : timestampMs
  const diff = Math.max(0, Date.now() - ts)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function shortAddress(value: string): string {
  if (!value) return '--'
  if (value.length <= 10) return value
  return `${value.slice(0, 4)}...${value.slice(-2)}`
}

function shortHash(value: string): string {
  if (!value) return '--'
  if (value.length <= 12) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function toTradeRows(items: TokenTradeDto[]): TradeRow[] {
  return items.slice(0, 15).map((item) => ({
    id: item.hash,
    account: item.account,
    type: item.side === 'BUY' ? 'buy' : 'sell',
    usdc: formatUsd(toNumber(item.volume)),
    hos: formatCompactNumber(normalizeTokenAmount(item.amount, 18)),
    time: formatTradeTimeAgo(item.tradeTime),
    txHash: item.hash,
  }))
}

export function TradeHistory({
  token,
  contractAddressOverride,
  embedded,
  refreshKey = 0,
}: TradeHistoryProps) {
  const [tradesApiData, setTradesApiData] = useState<TokenTradeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const loadedOnceRef = useRef(false)

  const handleCopyAddress = async (tradeId: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedId(tradeId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const loadTrades = useCallback(async (silent = false) => {
    const isFirstLoad = !loadedOnceRef.current
    if (!silent && isFirstLoad) {
      setLoading(true)
      setError(null)
    }

    const address = contractAddressOverride?.trim() || token.contractAddress
    if (!address) {
      loadedOnceRef.current = false
      setTradesApiData([])
      setError(null)
      setLoading(false)
      return
    }

    try {
      const response = await getTokenTrades({ address })
      setTradesApiData(response.data)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (!loadedOnceRef.current) {
        setTradesApiData([])
        setError(err instanceof Error ? err.message : 'Failed to load trades')
      }
    } finally {
      if (!silent && isFirstLoad) {
        setLoading(false)
      }
    }
  }, [contractAddressOverride, token.contractAddress])

  const tradeAddress =
    contractAddressOverride?.trim() || token.contractAddress?.trim() || ''

  useEffect(() => {
    loadedOnceRef.current = false
    void loadTrades(false)
    const timer = window.setInterval(() => {
      void loadTrades(true)
    }, TRADES_POLL_MS)
    return () => window.clearInterval(timer)
  }, [tradeAddress, loadTrades])

  useEffect(() => {
    if (refreshKey === 0) return
    void loadTrades(true)
  }, [refreshKey, loadTrades])

  const trades = useMemo(() => toTradeRows(tradesApiData), [tradesApiData])
  const tokenColumnLabel = token.symbol.trim().toUpperCase() || 'TOKEN'
  const tableHeaderClass = embedded
    ? 'text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
    : 'text-left text-xs font-semibold text-muted-foreground'
  const tableRowClass = embedded
    ? 'border-b border-border/50 transition-colors hover:bg-secondary/30'
    : 'hover:bg-secondary/50 transition-colors'

  return (
    <div className={embedded ? 'space-y-1' : 'bg-card rounded-xl p-6'}>
      {!embedded && (
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Trades</h3>
      )}

      {loading && (
        <div className="px-2 py-2 text-sm text-muted-foreground">Loading trades...</div>
      )}
      {!loading && error && (
        <div className="px-2 py-2 text-sm text-destructive">{error}</div>
      )}
      {!loading && !error && trades.length === 0 && (
        <div className="px-2 py-2 text-sm text-muted-foreground">No trades yet.</div>
      )}
      {!loading && !error && trades.length > 0 && (
        <div className={embedded ? 'overflow-x-auto' : '-mx-2 overflow-x-auto'}>
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
            <thead>
              <tr className={tableHeaderClass}>
                <th className={`w-[22%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>ACCOUNT</th>
                <th className={`w-[10%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>TYPE</th>
                <th className={`w-[18%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>USDC</th>
                <th className={`w-[18%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>{tokenColumnLabel}</th>
                <th className={`w-[14%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>TIME</th>
                <th className={`w-[18%] whitespace-nowrap pb-3 text-right ${embedded ? 'px-4' : 'px-2'}`}>TXN</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className={tableRowClass}
                >
                  <td className={`whitespace-nowrap py-2.5 font-mono text-foreground ${embedded ? 'px-4' : 'px-2 py-2'}`}>
                    <span className="inline-flex items-center gap-1">
                      {shortAddress(trade.account)}
                      <button
                        type="button"
                        title="Copy address"
                        onClick={() => handleCopyAddress(trade.id, trade.account)}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === trade.id ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap font-semibold ${
                      embedded ? 'px-4 py-2.5' : 'px-2 py-2'
                    } ${trade.type === 'buy' ? 'text-primary' : 'text-destructive'}`}
                  >
                    {trade.type.toUpperCase()}
                  </td>
                  <td
                    className={`max-w-0 truncate whitespace-nowrap text-foreground ${
                      embedded ? 'px-4 py-2.5' : 'px-2 py-2'
                    }`}
                    title={trade.usdc}
                  >
                    {trade.usdc}
                  </td>
                  <td
                    className={`max-w-0 truncate whitespace-nowrap font-semibold ${
                      embedded ? 'px-4 py-2.5' : 'px-2 py-2'
                    } ${trade.type === 'buy' ? 'text-primary' : 'text-destructive'}`}
                    title={trade.hos}
                  >
                    {trade.hos}
                  </td>
                  <td className={`whitespace-nowrap text-muted-foreground ${embedded ? 'px-4 py-2.5' : 'px-2 py-2'}`}>
                    {trade.time}
                  </td>
                  <td className={`whitespace-nowrap text-right ${embedded ? 'px-4 py-2.5' : 'px-2 py-2'}`}>
                    <a
                      href={`${hyperEvm.blockExplorers.default.url}/tx/${trade.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-foreground hover:text-primary"
                    >
                      {shortHash(trade.txHash)}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
