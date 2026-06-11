import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import { mapTokenNewDtosToTokens } from '@/lib/apis/meme-server/map-token'
import type {
  BaseResponse,
  NewTokensQueryParams,
  TrendingTokensQueryParams,
  TokenNewDto,
} from '@/lib/apis/meme-server/types'
import type { Token } from '@/lib/mock-data'
import { applyHomeListSort } from '@/lib/home-list-sort'

export type HomeListTab = 'trending' | 'new' | 'graduated'
export type HomeListFilters = {
  sort: string
  market: string
  leverage: string
  direction: string
}
export type HomeListQueryOptions = {
  pageNum?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 30

function applyHomeListFilters<
  T extends {
    market?: string
    leverage?: string
    direction?: 'LONG' | 'SHORT'
    sortField?: 'marketCap' | 'tradeVolume' | 'priceChangePercent24h' | 'graduatedTime'
    sortOrder?: 'asc' | 'desc'
  },
>(query: T, filters?: HomeListFilters, options?: { includeSort?: boolean }): T {
  if (!filters) return query

  if (filters.market && filters.market !== 'All') {
    query.market = filters.market
  }

  if (filters.leverage && filters.leverage !== 'All') {
    const lev = filters.leverage.replace(/[^\d]/g, '')
    if (lev) query.leverage = lev
  }

  if (filters.direction && filters.direction !== 'All') {
    query.direction = filters.direction.toUpperCase() as 'LONG' | 'SHORT'
  }

  if (options?.includeSort !== false) {
    applyHomeListSort(query, filters.sort)
  }

  return query
}

function toNewTokensQuery(
  tab: HomeListTab,
  filters?: HomeListFilters,
  options?: HomeListQueryOptions,
): NewTokensQueryParams {
  const pageNum = Math.max(1, options?.pageNum ?? 1)
  const pageSize = Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE)
  return applyHomeListFilters(
    {
      ...getNewTokensQueryForTab(tab),
      pageNum: String(pageNum),
      pageSize: String(pageSize),
    },
    filters,
    { includeSort: tab === 'graduated' },
  )
}

export function getNewTokensQueryForTab(tab: HomeListTab): NewTokensQueryParams {
  switch (tab) {
    case 'new':
      return { type: '1' }
    case 'graduated':
      return { type: '3' }
    case 'trending':
    default:
      return { tradeVolume24hMin: '0' }
  }
}

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') search.set(key, value)
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}

function toTrendingQueryFromFilters(
  filters?: HomeListFilters,
  options?: HomeListQueryOptions,
): TrendingTokensQueryParams {
  const pageNum = Math.max(1, options?.pageNum ?? 1)
  const pageSize = Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE)
  return applyHomeListFilters(
    {
      pageNum: String(pageNum),
      pageSize: String(pageSize),
    },
    filters,
  )
}

export async function fetchNewTokens(
  params: NewTokensQueryParams = {},
): Promise<BaseResponse<TokenNewDto[]>> {
  const url = `${getMemeServerBaseUrl()}/market/token/tokens${buildQuery(params)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server newTokens HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<TokenNewDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid newTokens response')
  }

  return payload
}

export async function fetchTrendingTokens(
  params: TrendingTokensQueryParams = {},
): Promise<BaseResponse<TokenNewDto[]>> {
  const queryWithDefault: TrendingTokensQueryParams = {
    pageNum: '1',
    pageSize: '30',
    ...params,
  }
  const url = `${getMemeServerBaseUrl()}/market/token/trending${buildQuery(queryWithDefault)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server trending HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<TokenNewDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid trending response')
  }

  return payload
}

export async function getTrendingTokens(
  params: TrendingTokensQueryParams = {},
): Promise<Token[]> {
  const res = await fetchTrendingTokens(params)
  return mapTokenNewDtosToTokens(res.data)
}

export async function getHomeTokenListWithFilters(
  tab: HomeListTab,
  filters?: HomeListFilters,
  options?: HomeListQueryOptions,
): Promise<Token[]> {
  if (tab === 'trending') {
    const res = await fetchTrendingTokens(toTrendingQueryFromFilters(filters, options))
    return mapTokenNewDtosToTokens(res.data)
  }
  const res = await fetchNewTokens(toNewTokensQuery(tab, filters, options))
  return mapTokenNewDtosToTokens(res.data)
}
