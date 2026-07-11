'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TokenDetailDto } from '@/lib/apis/meme-server/token-detail.api'
import {
  getLeveragedTokens,
  type LeveragedTokenDto,
} from '@/lib/apis/bounce/leveraged-tokens.api'
import { useMarketsContextOptional } from '@/contexts/markets-context'
import { isRenderableImageSrc } from '@/lib/image-src'
import type { Token, MarketPrice } from '@/lib/mock-data'
import { resolveTokenAddress } from '@/lib/contracts/token-address'
import { hyperEvm } from '@/lib/contracts/chain'
import {
  normalizeBondingCurveProgress,
  pickBondingCurveVolumeUsd,
} from '@/lib/apis/meme-server/format'
import { BondingCurveProgressSection } from '@/components/bonding-curve-volume-bar'
import { KlineChart } from '@/lib/tradingview'
import { formatShortAddress } from '@/lib/utils'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface TokenInfoProps {
  token: Token
  underlyingPrice?: MarketPrice
  contractAddressOverride?: string | null
  /** Polled token detail from coin page (single source of truth). */
  detail: TokenDetailDto | null
  /** Omit outer card shell and section title (e.g. inside coin page tabs). */
  embedded?: boolean
  /** Embed stats above chart and remaining info below (used on coin page). */
  withChart?: boolean
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseUsdLikeValue(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = value.trim().replace(/\$/g, '').replace(/,/g, '')
  if (!raw) return 0
  const upper = raw.toUpperCase()
  if (upper.endsWith('T')) return (Number(upper.slice(0, -1)) || 0) * 1_000_000_000_000
  if (upper.endsWith('B')) return (Number(upper.slice(0, -1)) || 0) * 1_000_000_000
  if (upper.endsWith('M')) return (Number(upper.slice(0, -1)) || 0) * 1_000_000
  if (upper.endsWith('K')) return (Number(upper.slice(0, -1)) || 0) * 1_000
  return Number(upper) || 0
}

function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  // Generic large-number compaction using base-1000 units: K/M/B/T/P/E.
  const units = ['', 'K', 'M', 'B', 'T', 'P', 'E']
  let scaled = value
  let unitIndex = 0
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000
    unitIndex += 1
  }
  const fixed =
    scaled >= 100
      ? scaled.toFixed(0)
      : scaled >= 10
        ? scaled.toFixed(1)
        : scaled.toFixed(2)
  return `$${fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${units[unitIndex]}`
}

function formatUsdFixed2(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatExchangeRatePrice(raw: string | null | undefined, decimals = 18): string | null {
  if (!raw) return null
  try {
    let base = BigInt(1)
    for (let i = 0; i < decimals; i += 1) {
      base *= BigInt(10)
    }
    const rawBigInt = BigInt(raw)
    const integerPart = rawBigInt / base
    const fractionPart = rawBigInt % base
    const fractionText = fractionPart.toString().padStart(decimals, '0').replace(/0+$/, '')
    const normalized = fractionText.length > 0
      ? `${integerPart.toString()}.${fractionText}`
      : integerPart.toString()
    const value = Number(normalized)
    if (!Number.isFinite(value) || value <= 0) return null
    const maxFractionDigits = value >= 100 ? 2 : value >= 1 ? 4 : 6
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxFractionDigits,
    })}`
  } catch {
    return null
  }
}

function resolveProgress(detail: TokenDetailDto | null, fallback: number): number {
  const status = String(detail?.status ?? '').toUpperCase()
  if (status === 'COMPLETED' || status === 'GRADUATED' || status === 'MIGRATED') {
    return 100
  }
  const source = detail?.bondingCurveProgress ?? fallback
  return normalizeBondingCurveProgress(source)
}

function resolveUnderlyingSymbol(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''
  const idx = normalized.lastIndexOf(':')
  if (idx >= 0 && idx < normalized.length - 1) {
    return normalized.slice(idx + 1).trim().toUpperCase()
  }
  return normalized.toUpperCase()
}

function EmbeddedStatsRow({
  display,
}: {
  display: {
    marketCap: string
    marketCapRaw: number
    volume24h: string
    volume24hRaw: number
  }
}) {
  const { t } = useI18n()
  return (
    <div className="flex h-10 items-center gap-x-4 text-xs">
      <div
        className="flex min-w-0 flex-1 items-center gap-1.5"
        title={formatUsdFixed2(display.marketCapRaw)}
      >
        <span className="shrink-0 text-muted-foreground">{t('coin.info.marketCap')}</span>
        <span className="truncate font-semibold text-foreground">{display.marketCap}</span>
      </div>
      <div
        className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right"
        title={formatUsdFixed2(display.volume24hRaw)}
      >
        <span className="shrink-0 text-muted-foreground">{t('coin.info.volume24h')}</span>
        <span className="truncate font-semibold text-foreground">{display.volume24h}</span>
      </div>
    </div>
  )
}

export function TokenInfo({
  token,
  underlyingPrice,
  contractAddressOverride,
  detail,
  embedded,
  withChart,
}: TokenInfoProps) {
  const { t } = useI18n()
  const marketsContext = useMarketsContextOptional()
  const marketIconBySymbol = useMemo(() => {
    const map = new Map<string, string>()
    for (const market of marketsContext?.markets ?? []) {
      const key = market.symbol.trim().toUpperCase()
      if (key) map.set(key, market.icon)
    }
    return map
  }, [marketsContext?.markets])

  const contractAddress =
    resolveTokenAddress(token, contractAddressOverride) ??
    `0x${token.id.padStart(40, '0').slice(0, 40)}`
  const maskedContractAddress = formatShortAddress(contractAddress, 6, 4)
  const [leveragedTokens, setLeveragedTokens] = useState<LeveragedTokenDto[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let disposed = false
    async function loadLeveragedTokens() {
      try {
        const items = await getLeveragedTokens()
        if (!disposed) setLeveragedTokens(items)
      } catch {
        if (!disposed) setLeveragedTokens([])
      }
    }
    void loadLeveragedTokens()
    return () => {
      disposed = true
    }
  }, [])

  const display = useMemo(() => {
    const marketCapRaw = parseUsdLikeValue(detail?.marketCap ?? token.marketCap)
    const marketCap = formatUsdCompact(marketCapRaw)
    const volume24hRaw = detail ? toNumber(detail.tradeVolume24h) : parseUsdLikeValue(token.volume24h)
    const volume24h = formatUsdFixed2(volume24hRaw)
    const leverage =
      detail && detail.leverage != null && detail.leverage !== ''
        ? `${toNumber(detail.leverage)}x`
        : `${token.leverage}x`
    const leverageRaw = detail?.leverage != null && detail.leverage !== '' ? String(detail.leverage) : String(token.leverage)
    const directionRaw =
      detail?.direction?.toUpperCase() === 'SHORT'
        ? 'Short'
        : detail?.direction?.toUpperCase() === 'LONG'
          ? 'Long'
          : token.direction
    const progress = resolveProgress(detail, token.progress)
    const graduated = progress >= 100
    const curveVolumeUsd = pickBondingCurveVolumeUsd(detail)
    const ltAddress = detail?.ltAddress?.trim().toLowerCase()
    const matchedLtByAddress =
      ltAddress && ltAddress.length > 0
        ? leveragedTokens.find((item) => item.address?.toLowerCase() === ltAddress)
        : undefined
    const marketNormalized = detail?.market?.trim().toLowerCase()
    const leverageNormalized = toNumber(detail?.leverage)
    const directionNormalized = detail?.direction?.trim().toUpperCase()
    const matchedLtByMeta =
      marketNormalized && leverageNormalized > 0 && (directionNormalized === 'LONG' || directionNormalized === 'SHORT')
        ? leveragedTokens.find(
            (item) =>
              item.targetAsset?.trim().toLowerCase() === marketNormalized &&
              item.targetLeverage === leverageNormalized &&
              item.isLong === (directionNormalized === 'LONG'),
          )
        : undefined
    const matchedLt = matchedLtByAddress ?? matchedLtByMeta
    const underlying =
      matchedLt?.targetAsset?.trim() || detail?.market?.trim() || token.underlying
    const matchedLtPrice = formatExchangeRatePrice(
      matchedLt?.exchangeRate,
      matchedLt?.decimals ?? 18,
    )
    return {
      marketCap,
      marketCapRaw,
      volume24h,
      volume24hRaw,
      leverage,
      leverageRaw,
      direction: directionRaw as Token['direction'],
      progress,
      graduated,
      curveVolumeUsd,
      underlying,
      matchedLtSymbol: matchedLt?.symbol?.trim() || null,
      matchedLtPrice,
    }
  }, [detail, leveragedTokens, token])
  const underlyingIcon = marketIconBySymbol.get(
    resolveUnderlyingSymbol(display.underlying),
  )
  
  const copyAddress = () => {
    navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const embeddedFooter = (
    <div className="divide-y divide-border/60 text-sm">
      <div className="pb-3">
        <BondingCurveProgressSection
          variant="embedded"
          progress={display.progress}
          graduated={display.graduated}
          volumeUsd={display.curveVolumeUsd}
        />
      </div>

      <EmbeddedStatsRow display={display} />

      <div className="flex h-10 items-center gap-1.5 text-xs">
        <span className="shrink-0 text-[11px] text-muted-foreground">{t('coin.info.contract')}</span>
        <code
          className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
          title={contractAddress}
        >
          {maskedContractAddress}
        </code>
        <button
          type="button"
          onClick={copyAddress}
          className="shrink-0 rounded p-1 hover:bg-muted transition-colors"
          title={t('coin.info.copyAddress')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <a
          href={`${hyperEvm.blockExplorers.default.url}/token/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-1 hover:bg-muted transition-colors"
          title={t('coin.info.viewExplorer')}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      </div>
    </div>
  )

  if (embedded && withChart) {
    const chartAddress = resolveTokenAddress(token, contractAddressOverride) ?? ''
    return <KlineChart address={chartAddress} footer={embeddedFooter} embedded />
  }

  if (embedded) {
    return embeddedFooter
  }

  return (
    <div className="bg-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{t('coin.info.title')}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('coin.info.marketCap')}</p>
          <p
            className="text-lg font-bold text-foreground truncate"
            title={formatUsdFixed2(display.marketCapRaw)}
          >
            {display.marketCap}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('coin.info.volume24h')}</p>
          <p className="text-lg font-bold text-foreground" title={formatUsdFixed2(display.volume24hRaw)}>
            {display.volume24h}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('coin.info.leverage')}</p>
          <p className="text-lg font-bold text-foreground" title={`${display.leverageRaw}x`}>
            {display.leverage}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('coin.info.direction')}</p>
          <p className={`text-lg font-bold ${display.direction === 'Long' ? 'text-primary' : 'text-destructive'}`}>
            {display.direction === 'Long' ? t('coin.direction.long') : t('coin.direction.short')}
          </p>
        </div>
      </div>

      {/* Underlying Asset */}
      <div className="bg-secondary rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {isRenderableImageSrc(underlyingIcon) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={underlyingIcon} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">⚪</span>
              )}
            </div>
            <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{t('coin.info.underlying')}</p>
            <p className="text-lg font-bold text-foreground">{display.underlying}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">
              {underlyingPrice?.price ?? display.matchedLtPrice ?? '--'}
            </p>
            {underlyingPrice ? (
              <p className={`text-sm ${underlyingPrice.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {underlyingPrice.change >= 0 ? '+' : ''}
                {underlyingPrice.change}%
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <BondingCurveProgressSection
          variant="full"
          progress={display.progress}
          graduated={display.graduated}
          volumeUsd={display.curveVolumeUsd}
        />
      </div>

      {/* Contract Address */}
      <div className="bg-secondary rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2">{t('coin.info.contractAddress')}</p>
        <div className="flex items-center gap-2">
          <code
            className="text-xs text-foreground font-mono flex-1 truncate"
            title={contractAddress}
          >
            {maskedContractAddress}
          </code>
          <button
            type="button"
            onClick={copyAddress}
            className="p-2 hover:bg-muted rounded transition-colors"
            title={t('coin.info.copyAddress')}
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <a
            href={`${hyperEvm.blockExplorers.default.url}/token/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-muted rounded transition-colors"
            title={t('coin.info.viewExplorer')}
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  )
}
