import type { KlinePeriod } from '@/lib/tradingview/types'

export const PERIOD_OPTIONS: Array<{ value: KlinePeriod; label: string }> = [
  { value: '1m', label: '1M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '1d', label: '1D' },
]

export const PERIOD_SECONDS: Record<KlinePeriod, number> = {
  '1m': 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '1d': 24 * 60 * 60,
}
