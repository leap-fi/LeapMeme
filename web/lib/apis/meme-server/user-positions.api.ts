import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import { toNumber } from '@/lib/apis/meme-server/format'
import type { BaseResponse, UserPositionDto } from '@/lib/apis/meme-server/types'
import { preserveCaseAccountParam } from '@/lib/utils/preserve-case-param'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

export async function fetchUserPositions(
  account: string,
): Promise<BaseResponse<UserPositionDto[]>> {
  const query = new URLSearchParams({ account: preserveCaseAccountParam(account) })
  const url = `${getMemeServerBaseUrl()}/market/user/positions?${query.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server positions HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<UserPositionDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid positions response')
  }

  return payload
}

export async function getUserPositions(account: string): Promise<UserPositionDto[]> {
  const res = await fetchUserPositions(account)
  return res.data.filter((p) => toNumber(p.holdAmount) > 0)
}
