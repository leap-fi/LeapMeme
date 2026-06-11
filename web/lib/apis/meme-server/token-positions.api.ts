import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse } from '@/lib/apis/meme-server/types'
import type { UserPositionDto } from '@/lib/apis/meme-server/user-positions.api'
import { preserveCaseAddressParam } from '@/lib/utils/preserve-case-param'

/** GET /market/token/positions */
export async function getTokenPositions(address: string): Promise<UserPositionDto[]> {
  const query = new URLSearchParams({ address: preserveCaseAddressParam(address) })
  const url = `${getMemeServerBaseUrl()}/market/token/positions?${query.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server token positions HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<UserPositionDto[]>
  if (!payload || (payload.code !== 0 && payload.code !== 200) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid token positions response')
  }
  return payload.data
}
