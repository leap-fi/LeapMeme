import {
  formatUsdCompact,
  normalizeBondingCurveProgress,
  toNumber,
} from '@/lib/apis/meme-server/format'
import { isGraduatedToken } from '@/lib/apis/meme-server/status'
import type { TokenNewDto } from '@/lib/apis/meme-server/types'
import { DEFAULT_TOKEN_IMAGE, normalizeTokenImageSrc } from '@/lib/image-src'
import type { Token } from '@/lib/mock-data'

function isGraduated(dto: TokenNewDto): boolean {
  return isGraduatedToken(dto)
}

function resolveUnderlying(dto: TokenNewDto): string {
  const raw = (
    (dto as TokenNewDto & { market?: string }).market?.trim() ||
    dto.targetAsset?.trim() ||
    dto.underlying?.trim() ||
    'HYPE'
  )
  const idx = raw.lastIndexOf(':')
  if (idx >= 0 && idx < raw.length - 1) {
    return raw.slice(idx + 1).trim()
  }
  return raw
}

function resolveLeverage(dto: TokenNewDto): number {
  const lev = dto.targetLeverage ?? dto.leverage
  if (lev != null && Number.isFinite(Number(lev))) {
    const n = Number(lev)
    if ([2, 3, 5].includes(n)) return n
  }
  return 3
}

function resolveDirection(dto: TokenNewDto): Token['direction'] {
  if (dto.isLong === true) return 'Long'
  if (dto.isLong === false) return 'Short'
  const d = dto.direction?.toLowerCase()
  if (d === 'long') return 'Long'
  if (d === 'short') return 'Short'
  return 'Long'
}

function resolveChange24h(dto: TokenNewDto): number {
  const fromApi = toNumber(dto.priceChangePercent24h)
  if (fromApi !== 0) {
    // API may send 0.25 for +25% or 25 for 25%
    return Math.abs(fromApi) <= 1 ? fromApi * 100 : fromApi
  }
  const buy = toNumber(dto.buyVolume24h)
  const sell = toNumber(dto.sellVolume24h)
  const total = buy + sell
  if (total <= 0) return 0
  return ((buy - sell) / total) * 100
}

function resolveImage(dto: TokenNewDto): string {
  return normalizeTokenImageSrc(dto.logo) ?? DEFAULT_TOKEN_IMAGE
}

function resolveProgress(dto: TokenNewDto): number {
  if (isGraduated(dto)) return 100
  return normalizeBondingCurveProgress(dto.bondingCurveProgress)
}

export function mapTokenNewDtoToToken(dto: TokenNewDto, index: number): Token {
  const marketCapValue = toNumber(dto.marketCap)
  const volume24hValue = toNumber(dto.tradeVolume24h ?? dto.tradeVolume)
  const progress = resolveProgress(dto)

  return {
    id: dto.address || String(dto.timestamp ?? index),
    symbol: dto.symbol,
    name: dto.name,
    image: resolveImage(dto),
    underlying: resolveUnderlying(dto),
    leverage: resolveLeverage(dto),
    direction: resolveDirection(dto),
    change24h: resolveChange24h(dto),
    progress,
    marketCap: formatUsdCompact(marketCapValue),
    graduated: isGraduated(dto),
    volume24h: formatUsdCompact(volume24hValue),
    contractAddress: dto.address as `0x${string}` | undefined,
    creator: dto.creator?.trim() || undefined,
    marketCapValue,
    volume24hValue,
    createdAt: dto.timestamp ?? 0,
  }
}

export function mapTokenNewDtosToTokens(dtos: TokenNewDto[]): Token[] {
  return dtos.map((dto, i) => mapTokenNewDtoToToken(dto, i))
}
