import type { Time, TickMarkType, UTCTimestamp } from 'lightweight-charts'
import type { KlinePeriod } from '@/lib/tradingview/types'

const LOCALE = 'en-US'

export function timeToSeconds(time: Time): number {
  if (typeof time === 'number') return time
  if (typeof time === 'string') return Math.floor(new Date(time).getTime() / 1000)
  return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000)
}

/** API may return seconds or ms; chart library expects unix seconds. */
export function normalizeKlineBeginTime(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
}

export function toChartTime(timeSec: number): Time {
  return timeSec as UTCTimestamp
}

export function formatKlineOpenTime(time: Time, period: KlinePeriod): string {
  const date = new Date(timeToSeconds(time) * 1000)
  if (period === '1d') {
    return date.toLocaleDateString(LOCALE, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (period === '1h' || period === '15m') {
    return date.toLocaleString(LOCALE, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return date.toLocaleString(LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatKlineTickMark(time: Time, period: KlinePeriod, _tickMarkType: TickMarkType): string {
  const date = new Date(timeToSeconds(time) * 1000)
  if (period === '1d') {
    return date.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })
  }
  if (period === '1h') {
    return date.toLocaleString(LOCALE, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  if (period === '15m') {
    return date.toLocaleString(LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return date.toLocaleString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function createKlineChartLocalization(period: KlinePeriod) {
  return {
    locale: LOCALE,
    timeFormatter: (time: Time) => formatKlineOpenTime(time, period),
  }
}

export function createKlineTimeScaleOptions(period: KlinePeriod) {
  return {
    borderColor: '#1A221C',
    timeVisible: period !== '1d',
    secondsVisible: period === '1m',
    tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) =>
      formatKlineTickMark(time, period, tickMarkType),
  }
}
