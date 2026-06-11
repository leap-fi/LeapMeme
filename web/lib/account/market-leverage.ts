import type { AccountLeverageToken, AccountMarket } from '@/lib/account/types'

export function parseLeverageMultiplier(label: string): number {
  const n = Number.parseInt(label.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : n
}

export function formatLeverageLabel(leverage: number): string {
  return `${leverage}×`
}

export function filterLeverageByDirection(
  leverage: AccountLeverageToken[],
  direction: 'LONG' | 'SHORT',
): AccountLeverageToken[] {
  const wantLong = direction === 'LONG'
  return leverage.filter((lt) => lt.isLong === wantLong && !lt.mintPaused)
}

/** Unique sorted leverage tiers (e.g. 2, 3, 5) for the current direction */
export function getLeverageTiers(
  market: AccountMarket | undefined,
  direction: 'LONG' | 'SHORT',
): number[] {
  if (!market?.leverage?.length) return []
  const tiers = new Set<number>()
  for (const lt of filterLeverageByDirection(market.leverage, direction)) {
    if (Number.isFinite(lt.targetLeverage) && lt.targetLeverage > 0) {
      tiers.add(lt.targetLeverage)
    }
  }
  return [...tiers].sort((a, b) => a - b)
}

export function findLeverageToken(
  market: AccountMarket | undefined,
  direction: 'LONG' | 'SHORT',
  leverage: number,
): AccountLeverageToken | null {
  if (!market) return null
  return (
    filterLeverageByDirection(market.leverage, direction).find(
      (lt) => lt.targetLeverage === leverage,
    ) ?? null
  )
}
