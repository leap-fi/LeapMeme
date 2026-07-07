'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Token } from '@/lib/mock-data'
import { getTokenPositions } from '@/lib/apis/meme-server/token-positions.api'
import type { UserPositionDto } from '@/lib/apis/meme-server/types'
import { hyperEvm } from '@/lib/contracts/chain'
import { ExternalLink } from 'lucide-react'

interface TokenHoldersProps {
  token: Token
  contractAddressOverride?: string | null
  /** Omit outer card shell and section title (e.g. inside coin page tabs). */
  embedded?: boolean
  totalSupply?: number | string | null
  tokenDecimals?: number | string | null
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function resolveDecimals(value?: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 18
}

function normalizePositionAmount(rawAmount: number, decimals: number): number {
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 0
  const looksLikeRawInteger = Number.isInteger(rawAmount) && Math.abs(rawAmount) >= 1e12
  if (looksLikeRawInteger) {
    return rawAmount / 10 ** decimals
  }
  return rawAmount
}

function normalizeSupplyAmount(raw: number | string | null | undefined, decimals: number): number {
  const value = toNumber(raw)
  if (value <= 0) return 0
  return normalizePositionAmount(value, decimals)
}

function formatCompactTokens(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  if (abs >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatSupplyPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%'
  if (value >= 10) return `${value.toFixed(2)}%`
  if (value >= 1) return `${value.toFixed(2)}%`
  return `${value.toFixed(2)}%`
}

function shortWallet(value: string): string {
  if (!value) return '--'
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}..${value.slice(-2)}`
}

type HolderRow = {
  id: string
  rank: number
  address: string
  tokens: number
  tokensLabel: string
  supplyPercent: number
}

export function TokenHolders({
  token,
  contractAddressOverride,
  embedded,
  totalSupply,
  tokenDecimals,
}: TokenHoldersProps) {
  const [positions, setPositions] = useState<UserPositionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tokenAddress = contractAddressOverride?.trim() || token.contractAddress?.trim() || ''
  const decimals = resolveDecimals(tokenDecimals)
  const tokenColumnLabel = token.symbol.trim().toUpperCase() || 'TOKEN'

  useEffect(() => {
    let disposed = false
    async function loadPositions() {
      if (!tokenAddress) {
        if (!disposed) {
          setPositions([])
          setLoading(false)
          setError('Missing token address')
        }
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await getTokenPositions(tokenAddress)
        if (!disposed) setPositions(data)
      } catch (err) {
        if (!disposed) {
          setPositions([])
          setError(err instanceof Error ? err.message : 'Failed to load holders')
        }
      } finally {
        if (!disposed) setLoading(false)
      }
    }
    void loadPositions()
    return () => {
      disposed = true
    }
  }, [tokenAddress])

  const { holders, holderCount, maxSupplyPercent } = useMemo(() => {
    const normalized = positions
      .map((item) => ({
        id: item.id,
        address: item.account?.trim() || '',
        tokens: normalizePositionAmount(toNumber(item.holdAmount), resolveDecimals(item.decimals ?? decimals)),
      }))
      .filter((item) => item.address && item.tokens > 0)

    const supplyTotal = normalizeSupplyAmount(totalSupply, decimals)
    const positionsTotal = normalized.reduce((sum, item) => sum + item.tokens, 0)
    const denominator = supplyTotal > 0 ? supplyTotal : positionsTotal

    const rows: HolderRow[] = normalized
      .map((item) => {
        const supplyPercent = denominator > 0 ? (item.tokens / denominator) * 100 : 0
        return {
          id: item.id,
          rank: 0,
          address: item.address,
          tokens: item.tokens,
          tokensLabel: formatCompactTokens(item.tokens),
          supplyPercent,
        }
      })
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }))

    const maxSupplyPercent = rows.reduce((max, row) => Math.max(max, row.supplyPercent), 0)

    return {
      holders: rows,
      holderCount: positions.length,
      maxSupplyPercent,
    }
  }, [positions, totalSupply, decimals])

  const tableHeaderClass = embedded
    ? 'text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
    : 'text-left text-xs font-semibold text-muted-foreground'
  const tableRowClass = embedded
    ? 'border-b border-border/50 transition-colors hover:bg-secondary/30'
    : 'hover:bg-secondary/50 transition-colors'
  const cellPad = embedded ? 'px-4 py-2.5' : 'px-2 py-2.5'

  return (
    <div className={embedded ? 'space-y-1' : 'bg-card rounded-xl p-6'}>
      {!embedded && (
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Holders</h3>
      )}

      {loading && (
        <div className="px-2 py-2 text-sm text-muted-foreground">Loading holders...</div>
      )}
      {!loading && error && (
        <div className="px-2 py-2 text-sm text-destructive">{error}</div>
      )}
      {!loading && !error && holders.length === 0 && (
        <div className="px-2 py-2 text-sm text-muted-foreground">No holders found.</div>
      )}

      {!loading && !error && holders.length > 0 && (
        <div className={embedded ? 'overflow-x-auto' : '-mx-2 overflow-x-auto'}>
          <table className="w-full min-w-[32rem] table-fixed border-collapse text-sm">
            <thead>
              <tr className={tableHeaderClass}>
                <th className={`w-[8%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>#</th>
                <th className={`w-[28%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>WALLET</th>
                <th className={`w-[20%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>{tokenColumnLabel}</th>
                <th className={`w-[16%] whitespace-nowrap pb-3 ${embedded ? 'px-4' : 'px-2'}`}>% SUPPLY</th>
                <th className={`w-[28%] whitespace-nowrap pb-3 text-right ${embedded ? 'px-4' : 'px-2'}`}>BAR</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((holder) => {
                const barWidth =
                  maxSupplyPercent > 0
                    ? Math.min(100, (holder.supplyPercent / maxSupplyPercent) * 100)
                    : 0
                return (
                  <tr key={holder.id} className={tableRowClass}>
                    <td className={`whitespace-nowrap text-muted-foreground ${cellPad}`}>
                      {holder.rank}
                    </td>
                    <td className={`whitespace-nowrap ${cellPad}`}>
                      <a
                        href={`${hyperEvm.blockExplorers.default.url}/address/${holder.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-foreground hover:text-primary"
                        title={holder.address}
                      >
                        {shortWallet(holder.address)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td
                      className={`max-w-0 truncate whitespace-nowrap text-foreground ${cellPad}`}
                      title={String(holder.tokens)}
                    >
                      {holder.tokensLabel}
                    </td>
                    <td className={`whitespace-nowrap text-foreground ${cellPad}`}>
                      {formatSupplyPercent(holder.supplyPercent)}
                    </td>
                    <td className={cellPad}>
                      <div className="ml-auto h-2 w-full max-w-[10rem] overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className={`${embedded ? 'px-4' : ''} mt-4 border-t border-border/50 pt-4`}>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Holders</span>
            <span className="font-semibold text-foreground">{holderCount}</span>
          </div>
        </div>
      )}
    </div>
  )
}
