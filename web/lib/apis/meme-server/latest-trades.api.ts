import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse, LatestTradeDto } from '@/lib/apis/meme-server/types'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

export async function getLatestTrades(): Promise<LatestTradeDto[]> {
  const url = `${getMemeServerBaseUrl()}/market/trade/latest`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server latest trades HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<LatestTradeDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid latest trades response')
  }

  return payload.data
}
