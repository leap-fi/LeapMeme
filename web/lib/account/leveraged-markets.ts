import type { LeveragedTokenDto } from '@/lib/apis/bounce/leveraged-tokens.api'
import type { AccountLeverageToken, AccountMarket } from '@/lib/account/types'

const SUPPORTED_LEVERAGE = new Set([2, 3, 5])

/** 与后端 indexer.parseUnderlyingSymbol 对齐：xyz:NVDA → NVDA */
export function parseUnderlyingSymbol(targetAsset: string): string {
  const raw = targetAsset.trim()
  if (!raw) return ''
  const idx = raw.lastIndexOf(':')
  if (idx >= 0 && idx < raw.length - 1) {
    return raw.slice(idx + 1).trim().toUpperCase()
  }
  return raw.toUpperCase()
}

function toLeverageToken(dto: LeveragedTokenDto): AccountLeverageToken {
  return {
    address: dto.address,
    targetLeverage: dto.targetLeverage,
    isLong: dto.isLong,
    symbol: dto.symbol,
    name: dto.name,
    decimals: dto.decimals,
    targetAsset: dto.targetAsset,
    mintPaused: dto.mintPaused,
    exchangeRate: dto.exchangeRate,
    totalSupply: dto.totalSupply,
    totalAssets: dto.totalAssets,
  }
}

/** 将 Bounce indexing API 的 LT 列表分组为 /market/markets 同构数据。 */
export function leveragedTokensToMarkets(tokens: LeveragedTokenDto[]): AccountMarket[] {
  const grouped = new Map<string, AccountMarket>()

  for (const token of tokens) {
    if (token.mintPaused) continue
    if (!SUPPORTED_LEVERAGE.has(token.targetLeverage)) continue

    const underlying = parseUnderlyingSymbol(token.targetAsset)
    if (!underlying) continue

    let market = grouped.get(underlying)
    if (!market) {
      market = {
        symbol: underlying,
        address: underlying,
        name: underlying,
        icon: '',
        chain: 'hyperliquid',
        leverage: [],
      }
      grouped.set(underlying, market)
    }

    market.leverage.push(toLeverageToken(token))
  }

  return [...grouped.values()].sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export type LtPairOption = {
  underlying: string
  leverage: number
  direction: 'LONG' | 'SHORT'
  ltAddress: `0x${string}`
  label: string
  ltSymbol: string
}

/** 展平为可点击的 LT 对（用于 create 页快速选择）。 */
export function flattenLtPairs(markets: AccountMarket[]): LtPairOption[] {
  const out: LtPairOption[] = []

  for (const market of markets) {
    for (const lt of market.leverage ?? []) {
      if (lt.mintPaused) continue
      if (!SUPPORTED_LEVERAGE.has(lt.targetLeverage)) continue

      const addr = lt.address?.trim() ?? ''
      if (!/^0x[a-fA-F0-9]{40}$/i.test(addr)) continue

      const direction: 'LONG' | 'SHORT' = lt.isLong ? 'LONG' : 'SHORT'
      out.push({
        underlying: market.symbol,
        leverage: lt.targetLeverage,
        direction,
        ltAddress: addr as `0x${string}`,
        label: `${market.symbol} ${lt.targetLeverage}× ${direction}`,
        ltSymbol: lt.symbol,
      })
    }
  }

  return out.sort((a, b) => {
    const byAsset = a.underlying.localeCompare(b.underlying)
    if (byAsset !== 0) return byAsset
    if (a.leverage !== b.leverage) return a.leverage - b.leverage
    if (a.direction !== b.direction) return (a.direction === 'LONG' ? -1 : 1)
    return 0
  })
}
