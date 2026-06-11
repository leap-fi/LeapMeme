import { HYPERLIQUID_API_URL } from '@/lib/hyperliquid/constants'
import type { HyperliquidMarketQuote, MetaAndAssetCtxsResponse } from '@/lib/hyperliquid/types'
import { buildQuotesFromMeta, buildQuotesFromMids } from '@/lib/hyperliquid/quotes'

async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${HYPERLIQUID_API_URL}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Hyperliquid info HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAllMids(dex?: 'xyz'): Promise<Record<string, string>> {
  const body = dex ? { type: 'allMids', dex } : { type: 'allMids' }
  return postInfo<Record<string, string>>(body)
}

export async function fetchMetaAndAssetCtxs(
  dex?: 'xyz',
): Promise<MetaAndAssetCtxsResponse> {
  const body = dex
    ? { type: 'metaAndAssetCtxs', dex }
    : { type: 'metaAndAssetCtxs' }
  return postInfo<MetaAndAssetCtxsResponse>(body)
}

/** prevDayPx keyed by display symbol (matches account market symbols) */
export async function fetchPrevDayPxMap(): Promise<Map<string, number>> {
  const [metaMain, metaXyz] = await Promise.all([
    fetchMetaAndAssetCtxs(),
    fetchMetaAndAssetCtxs('xyz'),
  ])
  const map = new Map<string, number>()
  buildQuotesFromMeta(metaMain, map)
  buildQuotesFromMeta(metaXyz, map)
  return map
}

export async function fetchMergedAllMids(): Promise<Record<string, string>> {
  const [main, xyz] = await Promise.all([fetchAllMids(), fetchAllMids('xyz')])
  return { ...main, ...xyz }
}

export async function fetchHyperliquidMarketSnapshot(): Promise<{
  quotes: Map<string, HyperliquidMarketQuote>
  prevDayBySymbol: Map<string, number>
}> {
  const [prevDayBySymbol, mids] = await Promise.all([
    fetchPrevDayPxMap(),
    fetchMergedAllMids(),
  ])
  return {
    quotes: buildQuotesFromMids(mids, prevDayBySymbol),
    prevDayBySymbol,
  }
}

/** @deprecated Use fetchHyperliquidMarketSnapshot */
export async function fetchHyperliquidMarketQuotes(): Promise<
  Map<string, HyperliquidMarketQuote>
> {
  const { quotes } = await fetchHyperliquidMarketSnapshot()
  return quotes
}
