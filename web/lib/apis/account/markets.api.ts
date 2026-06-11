import { accountFetch } from '@/lib/account/api'
import type { AccountMarket } from '@/lib/account/types'

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeAccountMarket(raw: AccountMarket): AccountMarket {
  const extra = raw as AccountMarket & Record<string, unknown>
  const price = toFiniteNumber(extra.price)
  const h24ChangePer = toFiniteNumber(
    extra.h24ChangePer ?? extra.h24ChangePercent ?? extra.h24_change_per,
  )
  const change = toFiniteNumber(extra.change ?? extra.changePercent)

  return {
    ...raw,
    ...(price != null ? { price } : {}),
    ...(h24ChangePer != null ? { h24ChangePer } : {}),
    ...(change != null ? { change } : {}),
  }
}

/** GET /account/markets */
export async function fetchAccountMarketsApi(): Promise<AccountMarket[]> {
  const data = await accountFetch<AccountMarket[]>('/account/markets')
  return Array.isArray(data) ? data.map(normalizeAccountMarket) : []
}
