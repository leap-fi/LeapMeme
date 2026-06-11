import { resolveTokenLogoSrc } from '@/lib/image-src'

const STORAGE_KEY = 'leap:recently-viewed'
const MAX_ITEMS = 10

export type RecentlyViewedToken = {
  symbol: string
  name: string
  address: string
  image: string
  underlying: string
  leverage: number
  direction: 'Long' | 'Short'
  marketCap: string
  /** 24h 交易量展示文案，如 $1.2M */
  volume24h?: string
  change24h: number
  viewedAt: number
}

const PLACEHOLDER_METRICS = new Set(['—', '--', '$0', ''])

/** Recently Viewed 卡片左侧指标：优先 24h 交易量 */
export function recentlyViewedDisplayMetric(item: RecentlyViewedToken): string {
  for (const value of [item.volume24h, item.marketCap]) {
    const v = value?.trim()
    if (v && !PLACEHOLDER_METRICS.has(v)) return v
  }
  return '—'
}

export type RecentlyViewedInput = Omit<RecentlyViewedToken, 'viewedAt'>

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

export function getRecentlyViewed(limit = MAX_ITEMS): RecentlyViewedToken[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentlyViewedToken[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.symbol && item?.address)
      .map((item) => ({
        ...item,
        image: resolveTokenLogoSrc(item.image),
      }))
      .slice(0, limit)
  } catch {
    return []
  }
}

export function addRecentlyViewed(entry: RecentlyViewedInput): void {
  if (!canUseStorage() || !entry.address?.trim()) return

  const normalized: RecentlyViewedToken = {
    ...entry,
    address: entry.address.trim(),
    image: resolveTokenLogoSrc(entry.image),
    viewedAt: Date.now(),
  }

  const existing = getRecentlyViewed(MAX_ITEMS).filter(
    (item) => item.address.toLowerCase() !== normalized.address.toLowerCase(),
  )
  const next = [normalized, ...existing].slice(0, MAX_ITEMS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // quota exceeded or private mode
  }
}
