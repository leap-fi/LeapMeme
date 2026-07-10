'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { tokens } from '@/lib/mock-data'
import {
  formatUsdCompact,
  normalizeBondingCurveProgress,
  toNumber,
} from '@/lib/apis/meme-server/format'
import { getTokenDetail, type TokenDetailDto } from '@/lib/apis/meme-server/token-detail.api'
import { buildLaunchedToken } from '@/lib/launched-token'
import { addRecentlyViewed } from '@/lib/recently-viewed'
import {
  DEFAULT_TOKEN_IMAGE,
  isRenderableImageSrc,
  normalizeTokenImageSrc,
  resolveTokenDisplaySrc,
  resolveTokenLogoSrc,
} from '@/lib/image-src'
import { resolveTokenHeaderTitleParts } from '@/lib/token/display'
import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { TokenChart } from '@/components/token-chart'
import { TokenSocialLinks } from '@/components/token-social-links'
import { TokenAvatar } from '@/components/token-avatar'
import { TradePanel } from '@/components/trade-panel'
import { TradeHistory } from '@/components/trade-history'
import { TokenHolders } from '@/components/token-holders'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const LG_BREAKPOINT_PX = 1024
const DETAIL_POLL_MS = 10_000

function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT_PX}px)`)
    const update = () => setIsLgUp(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isLgUp
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  // API may return ratio (0.25 => 25%) or direct percent (25 => 25%).
  return Math.abs(value) <= 1 ? value * 100 : value
}

function resolveUnderlyingSymbol(value: string): string {
  const normalized = value.trim()
  if (!normalized) return normalized
  const idx = normalized.lastIndexOf(':')
  if (idx >= 0 && idx < normalized.length - 1) {
    return normalized.slice(idx + 1).trim()
  }
  return normalized
}

function toHexAddress(value?: string | null): `0x${string}` | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return undefined
  return normalized as `0x${string}`
}

export default function CoinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const symbol = safeDecodeURIComponent(params.symbol as string)
  const addressOverride = searchParams.get('address')

  const tokenFromList = tokens.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
  )
  const token =
    tokenFromList ??
    (addressOverride
      ? buildLaunchedToken(symbol, addressOverride, {
          name: searchParams.get('name'),
          underlying: searchParams.get('underlying'),
          leverage: searchParams.get('leverage'),
          direction: searchParams.get('direction'),
        })
      : null)

  const fetchAddress = addressOverride?.trim() || tokenFromList?.contractAddress?.trim() || ''
  const [detail, setDetail] = useState<TokenDetailDto | null>(null)
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0)
  const detailLoadedRef = useRef(false)
  const isLgUp = useIsLgUp()
  const [tradeDrawerOpen, setTradeDrawerOpen] = useState(false)

  const loadDetail = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!fetchAddress) {
      detailLoadedRef.current = false
      setDetail(null)
      return
    }
    try {
      const data = await getTokenDetail(fetchAddress)
      setDetail(data)
      detailLoadedRef.current = true
    } catch {
      if (!silent || !detailLoadedRef.current) {
        setDetail(null)
        detailLoadedRef.current = false
      }
    }
  }, [fetchAddress])

  useEffect(() => {
    detailLoadedRef.current = false
    void loadDetail()
    const timer = window.setInterval(() => {
      void loadDetail({ silent: true })
    }, DETAIL_POLL_MS)
    return () => window.clearInterval(timer)
  }, [loadDetail])

  const handleTradeSuccess = useCallback(() => {
    setTradeRefreshKey((key) => key + 1)
    void loadDetail({ silent: true })
  }, [loadDetail])

  const resolvedToken = useMemo(() => {
    const underlying = detail?.market?.trim()
      ? resolveUnderlyingSymbol(detail.market)
      : token?.underlying
    const leverageRaw =
      detail?.leverage != null && detail.leverage !== ''
        ? Number(detail.leverage)
        : token?.leverage
    const leverage =
      Number.isFinite(leverageRaw) && (leverageRaw ?? 0) > 0
        ? Number(leverageRaw)
        : token?.leverage
    const direction =
      detail?.direction?.toUpperCase() === 'SHORT'
        ? 'Short'
        : detail?.direction?.toUpperCase() === 'LONG'
          ? 'Long'
          : token?.direction
    const image =
      normalizeTokenImageSrc(detail?.logo) ?? resolveTokenLogoSrc(token?.image)

    if (!token) return null
    const status = String(detail?.status ?? '').toUpperCase()
    const progress =
      status === 'COMPLETED' || status === 'GRADUATED' || status === 'MIGRATED'
        ? 100
        : normalizeBondingCurveProgress(
            detail?.bondingCurveProgress ?? token.progress,
          )
    const graduated =
      status === 'COMPLETED' ||
      status === 'GRADUATED' ||
      status === 'MIGRATED' ||
      progress >= 100 ||
      token.graduated

    return {
      ...token,
      symbol: detail?.symbol?.trim() || token.symbol,
      name: detail?.name?.trim() || token.name,
      underlying: underlying || token.underlying,
      leverage: leverage || token.leverage,
      direction: (direction || token.direction) as 'Long' | 'Short',
      image,
      progress,
      graduated,
    }
  }, [detail, token])

  useEffect(() => {
    if (!resolvedToken) return
    const address = (addressOverride?.trim() || resolvedToken.contractAddress?.trim()) ?? ''
    if (!address) return
    const image =
      normalizeTokenImageSrc(detail?.logo) ??
      resolveTokenLogoSrc(resolvedToken.image)

    const marketCap = detail
      ? formatUsdCompact(toNumber(detail.marketCap))
      : resolvedToken.marketCap
    const volume24h = detail
      ? formatUsdCompact(toNumber(detail.tradeVolume24h ?? detail.tradeVolume))
      : resolvedToken.volume24h
    const change24h = detail
      ? normalizePercent(toNumber(detail.priceChangePercent24h))
      : resolvedToken.change24h

    addRecentlyViewed({
      symbol: resolvedToken.symbol,
      name: resolvedToken.name,
      address,
      image,
      underlying: resolvedToken.underlying,
      leverage: resolvedToken.leverage,
      direction: resolvedToken.direction,
      marketCap,
      volume24h,
      change24h,
    })
  }, [resolvedToken, addressOverride, detail])

  if (!resolvedToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent">
        <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Token not found</p>
        <Link href="/" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Return to Home
        </Link>
      </div>
    )
  }

  const display = useMemo(() => {
    const symbol = detail?.symbol?.trim() || resolvedToken.symbol
    const name = detail?.name?.trim() || resolvedToken.name
    const description = detail?.description?.trim() || ''
    const subtitle = description || name
    const change24h = detail
      ? normalizePercent(toNumber(detail.priceChangePercent24h))
      : resolvedToken.change24h
    const status = String(detail?.status ?? '').toUpperCase()
    const graduated =
      status === 'COMPLETED' ||
      status === 'GRADUATED' ||
      status === 'MIGRATED' ||
      normalizeBondingCurveProgress(detail?.bondingCurveProgress) >= 100 ||
      resolvedToken.graduated
    const logo = normalizeTokenImageSrc(detail?.logo)
    const headerImageSrc = resolveTokenDisplaySrc(
      logo ?? resolvedToken.image,
      symbol,
    )
    const titleParts = resolveTokenHeaderTitleParts({
      symbol,
      market: detail?.market,
      underlying: resolvedToken.underlying,
      leverage: resolvedToken.leverage,
      direction: resolvedToken.direction,
    })
    return {
      symbol,
      titleParts,
      subtitle,
      change24h,
      graduated,
      logo,
      headerImageSrc: isRenderableImageSrc(headerImageSrc)
        ? headerImageSrc
        : DEFAULT_TOKEN_IMAGE,
    }
  }, [detail, resolvedToken])

  const protocolAddressOverrides = useMemo(() => ({
    zap: toHexAddress(detail?.zap),
    bonding: toHexAddress(detail?.bonding),
    router: toHexAddress(detail?.router),
    pool: toHexAddress(detail?.pool),
    lt: toHexAddress(detail?.ltAddress),
  }), [detail?.zap, detail?.bonding, detail?.router, detail?.pool, detail?.ltAddress])

  const protocolAddressesReady = !fetchAddress || detail != null

  const tradePanelProps = {
    token: resolvedToken,
    contractAddressOverride: addressOverride,
    protocolAddressOverrides,
    protocolAddressesReady,
    onTradeSuccess: handleTradeSuccess,
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Price Ticker */}
      <PriceTicker />
      
      {/* Header */}
      <Header />
      
      {/* Back Link */}
      <div className="w-full px-4 py-4">
        <Link href="/" className="text-primary hover:underline flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left Column - Chart and Info */}
          <div className="space-y-6">
            {/* Token Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-4">
                <TokenAvatar
                  image={display.headerImageSrc}
                  symbol={display.symbol}
                  className="size-16 shrink-0 rounded-xl bg-secondary overflow-hidden"
                  imgClassName="size-full object-cover"
                />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h1 className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-bold text-foreground">
                        {display.titleParts.symbol}
                        {display.titleParts.market && (
                          <>
                            <span className="text-lg text-primary">/</span>
                            <span className="text-lg font-normal leading-relaxed text-muted-foreground">
                              {display.titleParts.market}
                            </span>
                          </>
                        )}
                        <span className="text-lg font-normal leading-relaxed text-muted-foreground">
                          {display.titleParts.meta}
                        </span>
                      </h1>
                      {display.graduated && (
                        <span className="px-2 py-1 text-xs font-semibold bg-primary/20 text-primary rounded">
                          GRADUATED
                        </span>
                      )}
                      <TokenSocialLinks
                        twitter={detail?.twitter}
                        telegram={detail?.telegram}
                        website={detail?.website}
                      />
                    </div>
                    {display.subtitle ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">{display.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xl font-bold sm:text-2xl ${display.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {display.change24h >= 0 ? '+' : ''}
                      {display.change24h.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground sm:text-sm">24H Change</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <TokenChart
              token={resolvedToken}
              contractAddressOverride={addressOverride}
            />

            {/* Token detail tabs */}
            <div className="space-y-4">
              <Tabs defaultValue="trades" className="gap-4">
                <TabsList className="grid h-10 w-full grid-cols-2 gap-1 rounded-[4px] border border-border/30 bg-muted/20 p-1 backdrop-blur-sm">
                  <TabsTrigger
                    value="trades"
                    className="flex h-full min-h-0 items-center justify-center self-stretch rounded-[4px] border-0 px-3 py-0 text-xs leading-none font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground/80 data-[state=active]:bg-foreground/5 data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-white/5 dark:data-[state=active]:text-white sm:text-sm"
                  >
                    Recent Trades
                  </TabsTrigger>
                  <TabsTrigger
                    value="holders"
                    className="flex h-full min-h-0 items-center justify-center self-stretch rounded-[4px] border-0 px-3 py-0 text-xs leading-none font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground/80 data-[state=active]:bg-foreground/5 data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-white/5 dark:data-[state=active]:text-white sm:text-sm"
                  >
                    Top Holders
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="trades" className="mt-0">
                  <TradeHistory
                    token={resolvedToken}
                    contractAddressOverride={addressOverride}
                    embedded
                    refreshKey={tradeRefreshKey}
                  />
                </TabsContent>
                <TabsContent value="holders" className="mt-0">
                  <TokenHolders
                    token={resolvedToken}
                    contractAddressOverride={addressOverride}
                    embedded
                    totalSupply={detail?.totalSupply}
                    tokenDecimals={detail?.decimals}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Trade Panel */}
          <div className="w-full lg:w-[380px] lg:shrink-0 space-y-6">
            {isLgUp === true && <TradePanel {...tradePanelProps} glass />}
          </div>
        </div>
      </main>

      <Footer />

      {isLgUp === false && (
        <>
          <Drawer open={tradeDrawerOpen} onOpenChange={setTradeDrawerOpen} direction="bottom">
            <DrawerContent className="!h-auto max-h-[90vh] overflow-y-auto px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <DrawerHeader className="gap-1 px-0 pb-3 pt-0 text-left">
                <DrawerTitle>Trade {display.symbol}</DrawerTitle>
              </DrawerHeader>
              {tradeDrawerOpen && <TradePanel {...tradePanelProps} embedded />}
            </DrawerContent>
          </Drawer>

          {!tradeDrawerOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
            <button
              type="button"
              onClick={() => setTradeDrawerOpen(true)}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Trade {display.symbol}
            </button>
          </div>
          )}
        </>
      )}
    </div>
  )
}
