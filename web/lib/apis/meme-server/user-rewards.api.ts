import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse, UserRewardDto } from '@/lib/apis/meme-server/types'
import { preserveCaseAccountParam } from '@/lib/utils/preserve-case-param'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

export async function fetchUserRewards(
  account: string,
  feeVault: string,
): Promise<BaseResponse<UserRewardDto[]>> {
  const query = new URLSearchParams({
    account: preserveCaseAccountParam(account),
    feeVault,
  })
  const url = `${getMemeServerBaseUrl()}/market/user/rewards?${query.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server user rewards HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<UserRewardDto[]>
  if (!isSuccessCode(payload?.code) || !Array.isArray(payload.data)) {
    throw new Error(payload?.msg || 'Invalid user rewards response')
  }

  return payload
}

export async function getUserRewards(
  account: string,
  feeVault: string,
): Promise<UserRewardDto[]> {
  const res = await fetchUserRewards(account, feeVault)
  return res.data
}
