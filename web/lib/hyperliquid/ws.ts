import { HYPERLIQUID_PING_INTERVAL_MS, HYPERLIQUID_WS_URL } from '@/lib/hyperliquid/constants'
import type { HyperliquidWsMessage } from '@/lib/hyperliquid/types'

export type AllMidsListener = (mids: Record<string, string>) => void

/**
 * Singleton Hyperliquid WS — mirrors doc/hyperliquid.js:
 * ping + subscribe allMids (main + xyz dex).
 */
class HyperliquidWsClient {
  private ws: WebSocket | null = null
  private listeners = new Set<AllMidsListener>()
  private mids: Record<string, string> = {}
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private subscribed = false

  subscribe(listener: AllMidsListener): () => void {
    this.listeners.add(listener)
    if (Object.keys(this.mids).length > 0) {
      listener({ ...this.mids })
    }
    this.connect()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.disconnect()
      }
    }
  }

  getMids(): Record<string, string> {
    return { ...this.mids }
  }

  private connect() {
    if (typeof window === 'undefined') return
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    this.ws = new WebSocket(HYPERLIQUID_WS_URL)

    this.ws.onopen = () => {
      this.subscribed = false
      this.sendSubscribeAllMids()
      this.startPing()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as HyperliquidWsMessage
        if (msg.channel === 'allMids' && msg.data?.mids) {
          Object.assign(this.mids, msg.data.mids)
          this.notify()
        }
      } catch {
        // ignore malformed frames
      }
    }

    this.ws.onclose = () => {
      this.cleanupSocket()
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private sendSubscribeAllMids() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.subscribed) return
    this.ws.send(
      JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'allMids', dex: 'xyz' },
      }),
    )
    this.ws.send(
      JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'allMids' },
      }),
    )
    this.subscribed = true
  }

  private startPing() {
    this.stopPing()
    const ping = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }))
      }
    }
    ping()
    this.pingTimer = setInterval(ping, HYPERLIQUID_PING_INTERVAL_MS)
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.listeners.size === 0 || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.listeners.size > 0) this.connect()
    }, 3000)
  }

  private notify() {
    const snapshot = { ...this.mids }
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  private cleanupSocket() {
    this.stopPing()
    this.subscribed = false
    this.ws = null
  }

  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.cleanupSocket()
  }
}

let client: HyperliquidWsClient | null = null

export function getHyperliquidWsClient(): HyperliquidWsClient {
  if (!client) client = new HyperliquidWsClient()
  return client
}
