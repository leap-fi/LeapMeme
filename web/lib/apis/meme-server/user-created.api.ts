import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse, TokenNewDto } from '@/lib/apis/meme-server/types'
import { preserveCaseAccountParam } from '@/lib/utils/preserve-case-param'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

export async function fetchUserCreatedTokens(
  account: string,
): Promise<BaseResponse<TokenNewDto[]>> {
  const query = new URLSearchParams({ account: preserveCaseAccountParam(account) })
  const url = `${getMemeServerBaseUrl()}/market/user/created?${query.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server user created HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<TokenNewDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid user created response')
  }

  return payload
}

export async function getUserCreatedTokens(account: string): Promise<TokenNewDto[]> {
  const res = await fetchUserCreatedTokens(account)
  return res.data
}
