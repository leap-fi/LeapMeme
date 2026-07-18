import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getKlineList,
  listItemsToCandles,
  openKlineStream,
  resolveKlinePriceDivisor,
  wsPushToCandle,
  type KlineStream,
} from '@/lib/tradingview/api'
import { KLINE_HISTORY_START_MS } from '@/lib/tradingview/constants'
import type { KlineCandle, KlinePeriod, KlineWsPush } from '@/lib/tradingview/types'

type UseKlineFeedState = {
  candles: KlineCandle[]
  loading: boolean
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

/** After create→detail navigation, indexer may lag; poll until first bars appear. */
const EMPTY_RETRY_MS = 2_000
const EMPTY_RETRY_MAX = 15
const KLINE_REFRESH_MS = 15_000

export function useKlineFeed(address: string, period: KlinePeriod): UseKlineFeedState {
  const [candles, setCandles] = useState<KlineCandle[]>([])
  const [loading, setLoading] = useState(true)

  const safeAddress = useMemo(() => address.trim(), [address])

  const streamRef = useRef<KlineStream | null>(null)
  const priceDivisorRef = useRef(1)
  // Track the latest period so the stream can be opened with the right value
  // even though the WS effect itself does not depend on `period`.
  const periodRef = useRef<KlinePeriod>(period)
  periodRef.current = period

  // Stable callback so the WS subscription doesn't re-create on every render.
  const handlePush = useCallback((push: KlineWsPush) => {
    const newCandle = wsPushToCandle(push, priceDivisorRef.current)
    setCandles((prev) => mergePushedCandle(prev, newCandle))
  }, [])

  const fetchCandles = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!safeAddress) {
        setCandles([])
        setLoading(false)
        return [] as KlineCandle[]
      }
      if (!opts?.silent) setLoading(true)
      try {
        const res = await getKlineList({
          address: safeAddress,
          period: periodRef.current,
          startTime: KLINE_HISTORY_START_MS,
          endTime: Date.now(),
        })
        priceDivisorRef.current = resolveKlinePriceDivisor(res.data)
        const next = listItemsToCandles(res.data, periodRef.current)
        setCandles(next)
        return next
      } catch {
        if (!opts?.silent) setCandles([])
        return [] as KlineCandle[]
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [safeAddress],
  )

  // Initial REST fetch + retries while empty (create→coin race with indexer).
  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retries = 0

    if (!safeAddress) {
      setCandles([])
      setLoading(false)
      return
    }

    setCandles([])
    setLoading(true)

    const run = async (silent: boolean) => {
      const next = await fetchCandles({ silent })
      if (cancelled) return
      if (next.length === 0 && retries < EMPTY_RETRY_MAX) {
        retries += 1
        retryTimer = setTimeout(() => {
          void run(true)
        }, EMPTY_RETRY_MS)
      }
    }

    void run(false)

    return () => {
      cancelled = true
      if (retryTimer != null) clearTimeout(retryTimer)
    }
  }, [safeAddress, period, fetchCandles])

  // Periodic refresh so late-indexed trades still land without a full reload.
  useEffect(() => {
    if (!safeAddress) return
    const id = setInterval(() => {
      void fetchCandles({ silent: true })
    }, KLINE_REFRESH_MS)
    return () => clearInterval(id)
  }, [safeAddress, period, fetchCandles])

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
