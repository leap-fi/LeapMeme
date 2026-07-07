import { PERIOD_SECONDS } from '@/lib/tradingview/constants'
import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import { normalizeKlineBeginTime } from '@/lib/tradingview/chart-format'
import { preserveCaseAddressParam } from '@/lib/utils/preserve-case-param'
import type {
  KlineCandle,
  KlineListItem,
  KlineListParams,
  KlineListResponse,
  KlinePeriod,
  KlineWsPush,
} from '@/lib/tradingview/types'

function toListItem(c: KlineCandle, period: KlinePeriod): KlineListItem {
  return {
    beginTime: c.time,
    endTime: c.time + PERIOD_SECONDS[period],
    openPrice: c.open,
    highPrice: c.high,
    lowPrice: c.low,
    closePrice: c.close,
    volume: c.volume,
    quoteVolume: c.volume * c.close,
    count: Math.max(1, Math.floor(c.volume / 50)),
  }
}

function toKlineNumber(value: number | string | undefined): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Some responses use 1e8 fixed-point prices (27456 -> 0.00027456), others are already decimal. */
export function resolveKlinePriceDivisor(items: KlineListItem[]): number {
  const closes = items.map((item) => toKlineNumber(item.closePrice)).filter((p) => p > 0)
  if (closes.length === 0) return 1

  const sorted = [...closes].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  if (median >= 100) return 1e8
  return 1
}

function normalizeKlineItem(item: KlineListItem, priceDivisor: number): KlineListItem {
  if (priceDivisor === 1) return item
  return {
    ...item,
    openPrice: toKlineNumber(item.openPrice) / priceDivisor,
    highPrice: toKlineNumber(item.highPrice) / priceDivisor,
    lowPrice: toKlineNumber(item.lowPrice) / priceDivisor,
    closePrice: toKlineNumber(item.closePrice) / priceDivisor,
  }
}

function toCandle(item: KlineListItem): KlineCandle {
  return {
    time: normalizeKlineBeginTime(item.beginTime),
    open: toKlineNumber(item.openPrice),
    high: toKlineNumber(item.highPrice),
    low: toKlineNumber(item.lowPrice),
    close: toKlineNumber(item.closePrice),
    volume: toKlineNumber(item.volume),
  }
}

export async function getKlineList(params: KlineListParams): Promise<KlineListResponse> {
  const address = preserveCaseAddressParam(params.address)
  const query = new URLSearchParams({
    address,
    period: params.period,
    startTime: String(Math.floor(params.startTime)),
    endTime: String(Math.floor(params.endTime)),
  })
  const url = `${getMemeServerBaseUrl()}/market/kline/list?${query.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server kline list HTTP ${response.status}`)
  }

  const payload = (await response.json()) as KlineListResponse
  if (!payload || (payload.code !== 0 && payload.code !== 200) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid kline list response')
  }
  return payload
}

const KLINE_WS_PING = 'ping'
const KLINE_WS_PONG = 'pong'
const KLINE_WS_RECONNECT_BASE_MS = 1000
const KLINE_WS_RECONNECT_MAX_MS = 30_000

function isKlineWsPingPayload(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === KLINE_WS_PING) return true
  try {
    const message = JSON.parse(trimmed) as { event?: string; op?: string }
    return message.event === KLINE_WS_PING || message.op === KLINE_WS_PING
  } catch {
    return false
  }
}

function sendKlineWsPong(socket: WebSocket) {
  if (socket.readyState !== WebSocket.OPEN) return
  // Server expects plain-text "pong" (see docs/API_DOC.md §3.3).
  socket.send(KLINE_WS_PONG)
}

function sendKlineSubscribe(socket: WebSocket, period: KlinePeriod, address: string) {
  socket.send(
    JSON.stringify({
      op: 'subscribe',
      args: [{ channel: 'kline', period, address }],
    }),
  )
}

function sendKlineUnsubscribe(socket: WebSocket, period: KlinePeriod, address: string) {
  socket.send(
    JSON.stringify({
      op: 'unsubscribe',
      args: [{ channel: 'kline', period, address }],
    }),
  )
}

function handleKlineWsDataMessage(
  raw: string,
  period: KlinePeriod,
  safeAddress: string,
  onPush: (push: KlineWsPush) => void,
) {
  const message = JSON.parse(raw) as {
    event?: string
    op?: string
    arg?: { channel?: string; period?: KlinePeriod; address?: string }
    data?: KlineListItem | KlineListItem[]
  }

  if (
    message.arg?.channel !== 'kline' ||
    message.arg?.period !== period ||
    !message.data
  ) {
    return
  }

  const argAddress = message.arg.address?.trim() ?? ''
  if (
    argAddress &&
    argAddress.toLowerCase() !== safeAddress.toLowerCase()
  ) {
    return
  }

  const items = Array.isArray(message.data) ? message.data : [message.data]
  items.forEach((item) =>
    onPush({
      arg: {
        channel: 'kline',
        period,
        address: safeAddress,
      },
      data: item,
    }),
  )
}

export type KlineStream = {
  /** Switch the subscribed period over the SAME socket (no reconnect). */
  setPeriod: (period: KlinePeriod) => void
  /** Tear down the stream permanently. */
  close: () => void
}

/**
 * Open a single persistent kline WebSocket. Period changes are applied by
 * sending unsubscribe(old) + subscribe(new) over the same connection instead of
 * reopening a socket each time — this avoids the rapid open/close that left new
 * connections without a working heartbeat after switching kline intervals.
 */
export function openKlineStream(
  address: string,
  initialPeriod: KlinePeriod,
  onPush: (push: KlineWsPush) => void,
): KlineStream {
  if (typeof WebSocket === 'undefined') {
    return { setPeriod: () => {}, close: () => {} }
  }

  const safeAddress = preserveCaseAddressParam(address)
  const wsBase = getMemeServerBaseUrl().replace(/^http/i, 'ws')
  const wsUrl = `${wsBase}/ws/kline`

  let socket: WebSocket | null = null
  let stopped = false
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let currentPeriod = initialPeriod
  // The period currently acknowledged/subscribed on the live socket.
  let subscribedPeriod: KlinePeriod | null = null

  const clearReconnectTimer = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /** Reconcile the socket's subscription with the desired currentPeriod. */
  const syncSubscription = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    if (subscribedPeriod === currentPeriod) return
    if (subscribedPeriod) {
      sendKlineUnsubscribe(socket, subscribedPeriod, safeAddress)
    }
    sendKlineSubscribe(socket, currentPeriod, safeAddress)
    subscribedPeriod = currentPeriod
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearReconnectTimer()
    const delay = Math.min(
      KLINE_WS_RECONNECT_BASE_MS * 2 ** reconnectAttempt,
      KLINE_WS_RECONNECT_MAX_MS,
    )
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  const connect = () => {
    if (stopped) return

    const ws = new WebSocket(wsUrl)
    socket = ws
    subscribedPeriod = null

    ws.onopen = () => {
      // Ignore handlers from a socket that is no longer the active one.
      if (ws !== socket) return
      reconnectAttempt = 0
      syncSubscription()
    }

    ws.onmessage = (event) => {
      if (ws !== socket) return
      const raw = String(event.data)
      if (isKlineWsPingPayload(raw)) {
        sendKlineWsPong(ws)
        return
      }

      try {
        handleKlineWsDataMessage(raw, currentPeriod, safeAddress, onPush)
      } catch {
        // ignore malformed kline payloads
      }
    }

    ws.onclose = () => {
      if (ws !== socket) return
      socket = null
      subscribedPeriod = null
      scheduleReconnect()
    }

    ws.onerror = () => {
      if (ws === socket && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }

  connect()

  return {
    setPeriod: (period: KlinePeriod) => {
      currentPeriod = period
      syncSubscription()
    },
    close: () => {
      stopped = true
      clearReconnectTimer()
      if (socket) {
        if (socket.readyState === WebSocket.OPEN && subscribedPeriod) {
          sendKlineUnsubscribe(socket, subscribedPeriod, safeAddress)
        }
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close()
        }
      }
      socket = null
    },
  }
}

export function listItemsToCandles(items: KlineListItem[], _period: KlinePeriod): KlineCandle[] {
  const priceDivisor = resolveKlinePriceDivisor(items)
  return items
    .map((item) => toCandle(normalizeKlineItem(item, priceDivisor)))
    .sort((a, b) => a.time - b.time)
}

export function wsPushToCandle(push: KlineWsPush, priceDivisor = 1): KlineCandle {
  const item = priceDivisor === 1 ? push.data : normalizeKlineItem(push.data, priceDivisor)
  return toCandle(item)
}
