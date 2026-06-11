import type { HomeListTab } from '@/lib/apis/meme-server/new-tokens.api'

export const TRENDING_SORT_OPTIONS = ['24H Volume', 'Market Cap', '24H Change'] as const
export const GRADUATED_SORT_OPTIONS = [
  'Recently Graduated',
  '24H Volume',
  'MCAP',
  '24H Change',
] as const

export const DEFAULT_TRENDING_SORT = '24H Volume'
export const DEFAULT_GRADUATED_SORT = 'Recently Graduated'

export type HomeListSortField =
  | 'marketCap'
  | 'tradeVolume'
  | 'priceChangePercent24h'
  | 'graduatedTime'

export function sortOptionsForTab(tab: HomeListTab): readonly string[] {
  if (tab === 'graduated') return GRADUATED_SORT_OPTIONS
  if (tab === 'trending') return TRENDING_SORT_OPTIONS
  return []
}

export function defaultSortForTab(tab: HomeListTab): string {
  if (tab === 'graduated') return DEFAULT_GRADUATED_SORT
  return DEFAULT_TRENDING_SORT
}

export function applyHomeListSort<
  T extends { sortField?: HomeListSortField; sortOrder?: 'asc' | 'desc' },
>(query: T, sort: string | undefined): T {
  switch (sort) {
    case 'Recently Graduated':
      query.sortField = 'graduatedTime'
      query.sortOrder = 'desc'
      break
    case '24H Volume':
      query.sortField = 'tradeVolume'
      query.sortOrder = 'desc'
      break
    case 'Market Cap':
    case 'MCAP':
      query.sortField = 'marketCap'
      query.sortOrder = 'desc'
      break
    case '24H Change':
      query.sortField = 'priceChangePercent24h'
      query.sortOrder = 'desc'
      break
    default:
      break
  }
  return query
}
