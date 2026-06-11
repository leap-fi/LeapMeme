import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getKlineList,
  listItemsToCandles,
  openKlineStream,
  wsPushToCandle,
  type KlineStream,
} from '@/lib/tradingview/api'
import type { KlineCandle, KlinePeriod, KlineWsPush } from '@/lib/tradingview/types'

type UseKlineFeedState = {
  candles: KlineCandle[]
  loading: boolean
}

function getLookbackMs(period: KlinePeriod): number {
  switch (period) {
    case '1m':
      return 24 * 60 * 60 * 1000
    case '15m':
      return 7 * 24 * 60 * 60 * 1000
    case '1h':
      return 30 * 24 * 60 * 60 * 1000
    case '1d':
      return 180 * 24 * 60 * 60 * 1000
    default:
      return 24 * 60 * 60 * 1000
  }
}

/** Merge a pushed candle into an existing sorted candle array.
 *  - If the candle with the same timestamp already exists, update it in-place.
 *  - Otherwise append it at the end (pushes are always the latest bar). */
function mergePushedCandle(candles: KlineCandle[], pushed: KlineCandle): KlineCandle[] {
  const idx = candles.findIndex((c) => c.time === pushed.time)
  if (idx >= 0) {
    const next = [...candles]
    next[idx] = pushed
    return next
  }
  return [...candles, pushed]
}

export function useKlineFeed(address: string, period: KlinePeriod): UseKlineFeedState {
  const [candles, setCandles] = useState<KlineCandle[]>([])
  const [loading, setLoading] = useState(true)

  const safeAddress = useMemo(() => address.trim(), [address])

  const streamRef = useRef<KlineStream | null>(null)
  // Track the latest period so the stream can be opened with the right value
  // even though the WS effect itself does not depend on `period`.
  const periodRef = useRef<KlinePeriod>(period)
  periodRef.current = period

  // Stable callback so the WS subscription doesn't re-create on every render.
  const handlePush = useCallback((push: KlineWsPush) => {
    const newCandle = wsPushToCandle(push)
    setCandles((prev) => mergePushedCandle(prev, newCandle))
  }, [])

  // Initial REST fetch.
  useEffect(() => {
    let cancelled = false

    if (!safeAddress) {
      setCandles([])
      setLoading(false)
      return
    }

    setCandles([])
    setLoading(true)

    const end = Date.now()
    const start = end - getLookbackMs(period)

    getKlineList({
      address: safeAddress,
      period,
      startTime: start,
      endTime: end,
    })
      .then((res) => {
        if (cancelled) return
        const next = listItemsToCandles(res.data, period)
        setCandles(next)
      })
      .catch(() => {
        if (!cancelled) setCandles([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [safeAddress, period])

  // Persistent WebSocket connection — recreated only when the address changes.
  useEffect(() => {
    if (!safeAddress) {
      streamRef.current = null
      return
    }
    const stream = openKlineStream(safeAddress, periodRef.current, handlePush)
    streamRef.current = stream
    return () => {
      stream.close()
      streamRef.current = null
    }
  }, [safeAddress, handlePush])

  // Switch the subscribed period over the existing socket (no reconnect).
  useEffect(() => {
    streamRef.current?.setPeriod(period)
  }, [period])

  return { candles, loading }
}
