import type { BaseResponse } from '@/lib/apis/meme-server/types'
import type { WorldCupLeaderboardResponse } from '@/lib/world-cup-api-types'
import { getWorldCupApiBaseUrl } from './config'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

export async function getWorldCupLeaderboard(): Promise<WorldCupLeaderboardResponse> {
  const url = `${getWorldCupApiBaseUrl()}/account/world-cup/leaderboard`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`world-cup leaderboard HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<WorldCupLeaderboardResponse>
  if (!isSuccessCode(payload?.code) || !payload.data) {
    throw new Error(payload?.msg || 'Invalid leaderboard response')
  }

  return payload.data
}
