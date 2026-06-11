import type { Token } from '@/lib/mock-data'

function parseCompactUsd(value: string): number {
  const raw = value.replace(/[$,]/g, '').trim()
  if (raw.endsWith('M')) return parseFloat(raw) * 1_000_000
  if (raw.endsWith('K')) return parseFloat(raw) * 1_000
  return parseFloat(raw) || 0
}

export function getTokenVolume24h(token: Token): number {
  if (token.volume24hValue != null) return token.volume24hValue
  return parseCompactUsd(token.volume24h)
}

export function getTokenMarketCap(token: Token): number {
  if (token.marketCapValue != null) return token.marketCapValue
  return parseCompactUsd(token.marketCap)
}

export function getTokenCreatedAt(token: Token): number {
  return token.createdAt ?? (Number(token.id) || 0)
}

export function sortTokens(tokens: Token[], sort: string): Token[] {
  const result = [...tokens]
  switch (sort) {
    case '24H Volume':
      result.sort((a, b) => getTokenVolume24h(b) - getTokenVolume24h(a))
      break
    case 'Market Cap':
      result.sort((a, b) => getTokenMarketCap(b) - getTokenMarketCap(a))
      break
    case '24H Change':
      result.sort((a, b) => b.change24h - a.change24h)
      break
    case 'Newest':
      result.sort((a, b) => getTokenCreatedAt(b) - getTokenCreatedAt(a))
      break
  }
  return result
}
