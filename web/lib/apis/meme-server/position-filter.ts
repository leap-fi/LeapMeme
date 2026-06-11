import type { UserPositionDto } from '@/lib/apis/meme-server/types'

const MIN_BALANCE_HOLD_AMOUNT = 1e-6
const MIN_BALANCE_VALUE_USD = 0.000001

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function normalizeUserPositionHoldAmount(
  holdAmount: number | string | null | undefined,
  decimalsRaw?: number | string,
): number {
  const rawAmount = toNumber(holdAmount)
  const decimals =
    typeof decimalsRaw === 'number' ? decimalsRaw : Number.parseInt(String(decimalsRaw ?? ''), 10)

  // Some backends return raw uint-like holdAmount; scale down only when it looks like raw units.
  const looksLikeRawInteger = Number.isInteger(rawAmount) && Math.abs(rawAmount) >= 1e12
  if (looksLikeRawInteger) {
    const safeDecimals = Number.isFinite(decimals) && decimals > 0 ? decimals : 18
    return rawAmount / 10 ** safeDecimals
  }
  return rawAmount
}

export function isMeaningfulUserPositionBalance(
  position: Pick<UserPositionDto, 'holdAmount' | 'decimals' | 'price'>,
): boolean {
  const holdAmount = normalizeUserPositionHoldAmount(position.holdAmount, position.decimals)
  if (!Number.isFinite(holdAmount) || holdAmount < MIN_BALANCE_HOLD_AMOUNT) return false

  const price = toNumber(position.price)
  const valueUsd = holdAmount * price
  if (Number.isFinite(valueUsd) && valueUsd > 0 && valueUsd < MIN_BALANCE_VALUE_USD) {
    return false
  }
  return true
}

