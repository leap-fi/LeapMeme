export function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Normalize bondingCurveProgress to 0–100 for UI.
 * API returns percent directly (20 → 20%, 100 → 100%); values above 100 are capped at 100%.
 */
export function normalizeBondingCurveProgress(
  value: number | string | null | undefined,
): number {
  const raw = toNumber(value)
  if (raw <= 0) return 0
  if (raw > 100) return 100
  return raw
}

/** Graduation threshold on the bonding curve (USD). Align with LeapBonding.GRADUATION_USDC / backend BondingCurveGraduationTargetUSD. */
export const BONDING_CURVE_GRADUATION_TARGET_USD = 1_000

export function pickBondingCurveVolumeUsd(
  detail:
    | {
        bondingCurveVolumeUsd?: number | string | null
        bondingCurveVolume?: number | string | null
        bonding_curve_volume_usd?: number | string | null
      }
    | null
    | undefined,
): number | null {
  if (!detail) return null
  for (const value of [
    detail.bondingCurveVolumeUsd,
    detail.bondingCurveVolume,
    detail.bonding_curve_volume_usd,
  ]) {
    const n = toNumber(value)
    if (n > 0) return n
  }
  return null
}

/** Current curve fill (USD) — API volume when present, else derived from progress %. */
export function resolveBondingCurveVolumeUsd(params: {
  progress: number
  graduated: boolean
  volumeUsd?: number | string | null
}): number {
  const { progress, graduated, volumeUsd } = params
  const fromApi = toNumber(volumeUsd)
  if (fromApi > 0) {
    return graduated
      ? BONDING_CURVE_GRADUATION_TARGET_USD
      : Math.min(fromApi, BONDING_CURVE_GRADUATION_TARGET_USD)
  }
  if (graduated) return BONDING_CURVE_GRADUATION_TARGET_USD
  const pct = normalizeBondingCurveProgress(progress)
  return (pct / 100) * BONDING_CURVE_GRADUATION_TARGET_USD
}

/** e.g. $1.48M, $206K, $45.2K */
export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`.replace(/\.00M$/, 'M')
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  }
  return `$${value.toFixed(0)}`
}

export function formatTimeAgo(timestampMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestampMs)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}
