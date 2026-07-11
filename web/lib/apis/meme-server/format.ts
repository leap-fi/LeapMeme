import { getProtocolConfig } from '@/lib/protocol/runtime'

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

/** Graduation threshold on the bonding curve (USD). From runtime protocol config. */
export function bondingCurveGraduationTargetUsd(): number {
  return getProtocolConfig().graduationTargetUsdc
}

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
    if (value == null || value === '') continue
    const n = toNumber(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** Current curve fill (USD) — API volume when present, else derived from progress %. */
export function resolveBondingCurveVolumeUsd(params: {
  progress: number
  graduated: boolean
  volumeUsd?: number | string | null
  graduationTargetUsd?: number
}): number {
  const graduationTarget =
    params.graduationTargetUsd ?? bondingCurveGraduationTargetUsd()
  const { progress, graduated, volumeUsd } = params
  if (volumeUsd != null && volumeUsd !== '') {
    const fromApi = Math.max(0, toNumber(volumeUsd))
    return graduated ? graduationTarget : Math.min(fromApi, graduationTarget)
  }
  if (graduated) return graduationTarget
  const pct = normalizeBondingCurveProgress(progress)
  return (pct / 100) * graduationTarget
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
