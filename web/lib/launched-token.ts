import { DEFAULT_TOKEN_IMAGE } from '@/lib/image-src'
import type { Token } from '@/lib/mock-data'

/** Synthetic token for freshly launched coins (not yet in the mock list). */
export function buildLaunchedToken(
  symbol: string,
  contractAddress: string,
  meta: {
    name?: string | null
    underlying?: string | null
    leverage?: string | null
    direction?: string | null
  },
): Token {
  const leverage = Number.parseInt(meta.leverage ?? '3', 10) || 3
  const direction =
    meta.direction?.toUpperCase() === 'SHORT' ? 'Short' : 'Long'

  return {
    id: contractAddress.slice(2, 10),
    symbol: symbol.toUpperCase(),
    name: meta.name ?? symbol.toUpperCase(),
    image: DEFAULT_TOKEN_IMAGE,
    underlying: meta.underlying ?? 'HYPE',
    leverage,
    direction,
    change24h: 0,
    progress: 0,
    marketCap: '—',
    graduated: false,
    volume24h: '—',
    contractAddress: contractAddress as `0x${string}`,
  }
}
