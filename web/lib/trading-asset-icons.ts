import { isRenderableImageSrc } from '@/lib/image-src'

/** Fallback when symbol is not returned by /account/markets (e.g. USDC). */
const TRADING_ASSET_ICON_FALLBACK: Record<string, string> = {
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
}

export function buildMarketIconMap(
  markets: { symbol: string; icon?: string | null }[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const market of markets) {
    const key = market.symbol.trim().toUpperCase()
    const icon = market.icon?.trim()
    if (key && icon && isRenderableImageSrc(icon)) {
      map.set(key, icon)
    }
  }
  return map
}

export function resolveTradingAssetIcon(
  symbol: string,
  marketIcons?: Map<string, string>,
): string | null {
  const key = symbol.trim().toUpperCase()
  const fromMarkets = marketIcons?.get(key)
  if (fromMarkets && isRenderableImageSrc(fromMarkets)) {
    return fromMarkets
  }
  const fallback = TRADING_ASSET_ICON_FALLBACK[key]
  if (fallback && isRenderableImageSrc(fallback)) {
    return fallback
  }
  return null
}
