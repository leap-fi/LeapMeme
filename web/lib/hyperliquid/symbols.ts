/** Candidate Hyperliquid `allMids` keys for an account market symbol */
export function hyperliquidMidKeys(symbol: string): string[] {
  return [symbol, `xyz:${symbol}`]
}

export function resolveMidPrice(
  mids: Record<string, string>,
  symbol: string,
): number | null {
  for (const key of hyperliquidMidKeys(symbol)) {
    const raw = mids[key]
    if (raw == null || raw === '') continue
    const price = Number(raw)
    if (Number.isFinite(price)) return price
  }
  return null
}

export function displaySymbolFromUniverseName(name: string, showSymbol?: string): string {
  if (showSymbol) return showSymbol
  const parts = name.split(':')
  return parts.length > 1 ? parts[parts.length - 1]! : name
}
