import type { ProtocolProfile } from '@/lib/protocol/types'

function readEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim()
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function readSeedPresets(maxSeed: number): number[] {
  const raw = process.env.NEXT_PUBLIC_PROTOCOL_SEED_PRESETS?.trim()
  if (!raw) return defaultSeedPresets(maxSeed)
  const parsed = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= maxSeed)
  return parsed.length > 0 ? parsed : defaultSeedPresets(maxSeed)
}

function defaultSeedPresets(maxSeed: number): number[] {
  const candidates = [0, 5, 10, 20]
  const out = candidates.filter((v) => v <= maxSeed)
  if (maxSeed > 0 && !out.includes(maxSeed)) out.push(maxSeed)
  return out.length > 0 ? out : [0]
}

/** SSR / API-down fallback — mirrors backend env names (NEXT_PUBLIC_*). */
export function buildProtocolDefaultsFromEnv(): ProtocolProfile {
  const maxSeedUsdc = readEnvNumber('NEXT_PUBLIC_PROTOCOL_MAX_SEED_USDC', 20)
  const maxTradeRaw = process.env.NEXT_PUBLIC_PROTOCOL_MAX_TRADE_USDC?.trim()
  let maxTradeUsdc: number | null = null
  if (maxTradeRaw) {
    const n = Number(maxTradeRaw)
    if (Number.isFinite(n) && n > 0) maxTradeUsdc = n
  }

  return {
    minSeedUsdc: readEnvNumber('NEXT_PUBLIC_PROTOCOL_MIN_SEED_USDC', 0),
    maxSeedUsdc,
    minBuyUsdc: readEnvNumber('NEXT_PUBLIC_PROTOCOL_MIN_BUY_USDC', 0.0001),
    minSellUsdc: readEnvNumber('NEXT_PUBLIC_PROTOCOL_MIN_SELL_USDC', 0),
    graduationTargetUsdc: readEnvNumber(
      'NEXT_PUBLIC_PROTOCOL_GRADUATION_USDC',
      readEnvNumber('NEXT_PUBLIC_BONDING_CURVE_GRADUATION_TARGET_USD', 1000),
    ),
    maxTradeUsdc,
    buyFeeBps: readEnvNumber('NEXT_PUBLIC_PROTOCOL_BUY_FEE_BPS', 75),
    sellFeeBps: readEnvNumber('NEXT_PUBLIC_PROTOCOL_SELL_FEE_BPS', 75),
    creatorFeeShareBps: readEnvNumber('NEXT_PUBLIC_PROTOCOL_CREATOR_FEE_SHARE_BPS', 6667),
    seedPresets: readSeedPresets(maxSeedUsdc),
    source: 'fallback',
  }
}
