'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getTrendingTokens } from '@/lib/apis/meme-server/new-tokens.api'
import { TokenAvatar } from '@/components/token-avatar'
import {
  getRecentlyViewed,
  recentlyViewedDisplayMetric,
  type RecentlyViewedToken,
} from '@/lib/recently-viewed'
import type { Token } from '@/lib/mock-data'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const TRENDING_COUNT = 4
const SEARCH_PAGE_SIZE = 30
const RECENTLY_VIEWED_COUNT = 3
const SEARCH_DEBOUNCE_MS = 500

function tokenHref(token: { symbol: string; contractAddress?: string }): string {
  const base = `/coin/${encodeURIComponent(token.symbol)}`
  if (token.contractAddress) {
    return `${base}?address=${encodeURIComponent(token.contractAddress)}`
  }
  return base
}

function SearchResultRow({
  token,
  onClose,
  compact,
}: {
  token: Token | RecentlyViewedToken
  onClose: () => void
  compact?: boolean
}) {
  const href = tokenHref({
    symbol: token.symbol,
    contractAddress: 'contractAddress' in token ? token.contractAddress : token.address,
  })

  const compactMetric =
    'viewedAt' in token ? recentlyViewedDisplayMetric(token) : token.marketCap

  if (compact) {
    return (
      <Link
        href={href}
        onClick={onClose}
        className="p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors border border-border"
      >
        <div className="flex items-center gap-2 mb-2">
          <TokenAvatar
            image={token.image}
            symbol={token.symbol}
            className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs flex-shrink-0 overflow-hidden"
            imgClassName="w-full h-full rounded-full object-cover"
            fallbackClassName="text-[10px]"
          />
          <div className="font-semibold text-foreground text-xs">{token.symbol}</div>
        </div>
        <div className="text-xs text-muted-foreground truncate mb-1">
          {token.underlying} {token.leverage} {token.direction}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{compactMetric}</span>
          <span
            className={`text-xs font-semibold ${
              token.change24h >= 0 ? 'text-primary' : 'text-destructive'
            }`}
          >
            {token.change24h >= 0 ? '+' : ''}
            {token.change24h.toFixed(1)}%
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <TokenAvatar
          image={token.image}
          symbol={token.symbol}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
          imgClassName="w-full h-full rounded-full object-cover"
          fallbackClassName="text-xs"
        />
        <div className="min-w-0">
          <div className="font-semibold text-foreground text-sm truncate">{token.name}</div>
          <div className="text-xs text-muted-foreground">
            {token.underlying} {token.leverage} {token.direction}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div
          className={`text-sm font-semibold ${
            token.change24h >= 0 ? 'text-primary' : 'text-destructive'
          }`}
        >
          {token.change24h >= 0 ? '+' : ''}
          {token.change24h.toFixed(1)}%
        </div>
        <div className="text-xs text-muted-foreground">{token.marketCap}</div>
      </div>
    </Link>
  )
}

function TrendingCard({ token, onClose }: { token: Token; onClose: () => void }) {
  return (
    <Link
      href={tokenHref(token)}
      onClick={onClose}
      className="p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors border border-border"
    >
      <div className="flex items-center gap-2 mb-2">
        <TokenAvatar
          image={token.image}
          symbol={token.symbol}
          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-sm flex-shrink-0 overflow-hidden"
          imgClassName="w-full h-full rounded-full object-cover"
          fallbackClassName="text-[10px]"
        />
        <div className="min-w-0">
          <div className="font-semibold text-foreground text-sm">{token.symbol}</div>
          <div className="text-xs text-muted-foreground truncate">
            {token.underlying} {token.leverage} {token.direction}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{token.marketCap}</span>
        <span
          className={`text-xs font-semibold ${
            token.change24h >= 0 ? 'text-primary' : 'text-destructive'
          }`}
        >
          {token.change24h >= 0 ? '+' : ''}
          {token.change24h.toFixed(1)}%
        </span>
      </div>
    </Link>
  )
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [trendingTokens, setTrendingTokens] = useState<Token[]>([])
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [trendingError, setTrendingError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedToken[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const loadTrendingData = useCallback(async () => {
    setTrendingLoading(true)
    setTrendingError(null)
    try {
      const list = await getTrendingTokens({
        pageNum: '1',
        pageSize: String(TRENDING_COUNT),
        sortField: 'marketCap',
        sortOrder: 'desc',
      })
      setTrendingTokens(list.slice(0, TRENDING_COUNT))
    } catch (err) {
      setTrendingTokens([])
      setTrendingError(err instanceof Error ? err.message : 'Failed to load tokens')
    } finally {
      setTrendingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setSearchResults([])
      setSearchError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setRecentlyViewed(getRecentlyViewed(RECENTLY_VIEWED_COUNT))
    void loadTrendingData()
  }, [isOpen, loadTrendingData])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    const keyword = query.trim()
    if (!keyword) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true)
        setSearchError(null)
        try {
          const list = await getTrendingTokens({
            search: keyword,
            pageNum: '1',
            pageSize: String(SEARCH_PAGE_SIZE),
            sortField: 'marketCap',
            sortOrder: 'desc',
          })
          if (!cancelled) setSearchResults(list)
        } catch (err) {
          if (!cancelled) {
            setSearchResults([])
            setSearchError(
              err instanceof Error ? err.message : 'Failed to search tokens',
            )
          }
        } finally {
          if (!cancelled) setSearchLoading(false)
        }
      })()
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, query])

  if (!isOpen || !portalReady) return null

  const isSearching = query.trim().length > 0

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={modalRef}
        className="fixed z-[101] flex flex-col overflow-hidden border-border/50 bg-background/85 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/75
          inset-x-0 top-0 bottom-0 max-h-[100dvh]
          md:inset-x-auto md:bottom-auto md:left-1/2 md:top-20 md:h-auto md:max-h-none md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-xl md:border"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for tokens..."
            className="min-h-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none md:text-sm"
          />
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-secondary"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto md:max-h-[60vh]">
          {isSearching ? (
            <div className="py-2">
              {searchLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))
              ) : searchError ? (
                <div className="px-4 py-8 text-center text-sm text-destructive">
                  {searchError}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((token) => (
                  <SearchResultRow key={token.id} token={token} onClose={onClose} />
                ))
              ) : (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No tokens found for &quot;{query.trim()}&quot;
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Trending
                </h3>
                {trendingLoading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: TRENDING_COUNT }).map((_, i) => (
                      <Skeleton key={i} className="h-[76px] rounded-lg md:h-[88px]" />
                    ))}
                  </div>
                ) : trendingError ? (
                  <p className="text-sm text-destructive">{trendingError}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {trendingTokens.map((token) => (
                      <TrendingCard key={token.id} token={token} onClose={onClose} />
                    ))}
                  </div>
                )}
              </div>

              {recentlyViewed.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Recently Viewed
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {recentlyViewed.map((token) => (
                      <SearchResultRow
                        key={token.address}
                        token={token}
                        onClose={onClose}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
