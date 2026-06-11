import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'
import {
  createKlineChartLocalization,
  createKlineTimeScaleOptions,
  toChartTime,
} from '@/lib/tradingview/chart-format'
import type { KlineCandle, KlinePeriod } from '@/lib/tradingview/types'

function toSeriesData(candles: KlineCandle[]): CandlestickData[] {
  return candles.map((c) => ({
    time: toChartTime(c.time) as CandlestickData['time'],
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
}

function formatAxisPrice(price: number): string {
  if (!Number.isFinite(price)) return '0'
  const abs = Math.abs(price)
  if (abs >= 1000) return price.toFixed(2)
  if (abs >= 1) return price.toFixed(4)
  if (abs >= 0.01) return price.toFixed(6)
  if (abs >= 0.0001) return price.toFixed(8)
  return price.toFixed(10)
}

function getPriceFormat(candles: KlineCandle[]) {
  const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v) && v > 0)
  const sample = closes.length > 0 ? closes[closes.length - 1] : 1
  const abs = Math.abs(sample)

  let precision = 4
  let minMove = 0.0001
  if (abs >= 1000) {
    precision = 2
    minMove = 0.01
  } else if (abs >= 1) {
    precision = 4
    minMove = 0.0001
  } else if (abs >= 0.01) {
    precision = 6
    minMove = 0.000001
  } else if (abs >= 0.0001) {
    precision = 8
    minMove = 0.00000001
  } else {
    precision = 10
    minMove = 0.0000000001
  }

  return {
    type: 'custom' as const,
    formatter: formatAxisPrice,
    precision,
    minMove,
  }
}

/** Default number of candles to show on screen (rest is scrollable). */
const DEFAULT_VISIBLE_BARS = 150

function buildCandlesSignature(candles: KlineCandle[]): string {
  if (candles.length === 0) return 'empty'
  const first = candles[0]
  const last = candles[candles.length - 1]
  return `${candles.length}:${first.time}:${last.time}:${last.close}`
}

export function useLightweightChart(
  containerRef: RefObject<HTMLDivElement | null>,
  candles: KlineCandle[],
  period: KlinePeriod,
) {
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  // Track whether the initial bulk load (REST response) has been applied to the chart.
  // This lets us distinguish bulk setData (initial) from incremental WS updates.
  const dataInitializedRef = useRef(false)
  const prevCandlesLengthRef = useRef(0)
  const lastBarTimeRef = useRef<number | null>(null)
  const firstBarTimeRef = useRef<number | null>(null)
  const appliedPeriodRef = useRef<KlinePeriod>(period)

  const candlesSignature = useMemo(() => buildCandlesSignature(candles), [candles])
  const seriesData = useMemo(() => toSeriesData(candles), [candlesSignature])
  const localization = useMemo(() => createKlineChartLocalization(period), [period])
  const timeScaleOptions = useMemo(() => createKlineTimeScaleOptions(period), [period])

  // Recreate chart when period changes; reset initialized flag accordingly.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    dataInitializedRef.current = false
    prevCandlesLengthRef.current = 0
    lastBarTimeRef.current = null
    firstBarTimeRef.current = null

    const chart: IChartApi = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.35)',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#1A221C' },
      },
      rightPriceScale: {
        borderColor: '#1A221C',
      },
      timeScale: timeScaleOptions,
      crosshair: {
        vertLine: { color: '#2c2c35' },
        horzLine: { color: '#2c2c35' },
      },
      localization,
      autoSize: true,
    })

    const series: ISeriesApi<'Candlestick'> = chart.addSeries(CandlestickSeries, {
      upColor: '#00C076',
      borderUpColor: '#00C076',
      wickUpColor: '#00C076',
      downColor: '#F84960',
      borderDownColor: '#F84960',
      wickDownColor: '#F84960',
    })

    chartRef.current = chart
    seriesRef.current = series

    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chartRef.current = null
      seriesRef.current = null
      chart.remove()
    }
  }, [containerRef, period, localization, timeScaleOptions])

  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return

    chart.applyOptions({
      localization,
      timeScale: timeScaleOptions,
    })

    const periodChanged = appliedPeriodRef.current !== period
    appliedPeriodRef.current = period

    if (seriesData.length === 0) {
      series.setData([])
      dataInitializedRef.current = false
      prevCandlesLengthRef.current = 0
      lastBarTimeRef.current = null
      firstBarTimeRef.current = null
      return
    }

    const prevLength = prevCandlesLengthRef.current
    const firstTime = candles[0]?.time ?? null
    const lastTime = candles[candles.length - 1]?.time ?? null
    const lastBar = seriesData[seriesData.length - 1]

    const isTickUpdate =
      dataInitializedRef.current &&
      !periodChanged &&
      seriesData.length === prevLength &&
      lastTime != null &&
      lastTime === lastBarTimeRef.current

    const isAppend =
      dataInitializedRef.current &&
      !periodChanged &&
      seriesData.length === prevLength + 1 &&
      lastTime != null &&
      lastBarTimeRef.current != null &&
      lastTime > lastBarTimeRef.current

    const needsFullSet =
      !dataInitializedRef.current ||
      periodChanged ||
      (!isTickUpdate &&
        !isAppend &&
        (seriesData.length !== prevLength ||
          firstTime !== firstBarTimeRef.current ||
          lastTime !== lastBarTimeRef.current))

    prevCandlesLengthRef.current = seriesData.length
    firstBarTimeRef.current = firstTime
    lastBarTimeRef.current = lastTime

    if (needsFullSet) {
      series.applyOptions({ priceFormat: getPriceFormat(candles) })
      series.setData(seriesData)
      dataInitializedRef.current = true

      const timeScale = chart.timeScale()
      if (seriesData.length > DEFAULT_VISIBLE_BARS) {
        const to = seriesData.length - 0.5
        const from = to - DEFAULT_VISIBLE_BARS
        timeScale.setVisibleLogicalRange({ from, to })
      } else {
        timeScale.fitContent()
      }
      return
    }

    // WS tick or single-bar append — only update the latest bar (library requirement).
    if (lastBar) {
      try {
        series.update(lastBar)
      } catch {
        series.setData(seriesData)
      }
    }
  }, [candles, candlesSignature, period, seriesData, localization, timeScaleOptions])
}
