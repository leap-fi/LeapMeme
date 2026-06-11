import type { BaseResponse } from '@/lib/apis/meme-server/types'
import type {
  WorldCupGraduationRaceResponse,
  WorldCupRaceFilter,
} from '@/lib/world-cup-api-types'
import { getWorldCupApiBaseUrl } from './config'
import { sortRaceTeamsForDisplay } from './race-utils'

function isSuccessCode(code: number | undefined): boolean {
  return code === 0 || code === 200
}

function withFilter(
  data: WorldCupGraduationRaceResponse,
  status: WorldCupRaceFilter = 'all',
): WorldCupGraduationRaceResponse {
  const teams =
    status === 'all'
      ? sortRaceTeamsForDisplay(data.teams, 'all')
      : sortRaceTeamsForDisplay(
          data.teams.filter((t) => t.status === status),
          status,
        )
  return { ...data, teams }
}

export async function getWorldCupGraduationRace(
  status: WorldCupRaceFilter = 'all',
): Promise<WorldCupGraduationRaceResponse> {
  const query = status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  const url = `${getWorldCupApiBaseUrl()}/account/world-cup/graduation-race${query}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`world-cup graduation-race HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<WorldCupGraduationRaceResponse>
  if (!isSuccessCode(payload?.code) || !payload.data) {
    throw new Error(payload?.msg || 'Invalid graduation-race response')
  }

  return withFilter(payload.data, status)
}
