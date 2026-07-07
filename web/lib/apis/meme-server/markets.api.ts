import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { AccountMarket } from '@/lib/account/types'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0
}

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

/** GET /market/markets */
export async function fetchAccountMarketsApi(): Promise<AccountMarket[]> {
  const url = `${getMemeServerBaseUrl()}/market/markets`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server markets HTTP ${response.status}`)
  }

  const payload = (await response.json()) as {
    code?: number
    msg?: string
    data?: AccountMarket[]
  }

  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid markets response')
  }

  return payload.data.map(normalizeAccountMarket)
}
