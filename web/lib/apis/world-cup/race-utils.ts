import type {
  WorldCupLaunchedTeam,
  WorldCupPendingTeam,
  WorldCupRaceFilter,
  WorldCupRaceTeam,
} from '@/lib/world-cup-api-types'

const sortLaunchedByProgress = (a: WorldCupLaunchedTeam, b: WorldCupLaunchedTeam) =>
  b.progress - a.progress

const sortPendingByName = (a: WorldCupPendingTeam, b: WorldCupPendingTeam) =>
  a.name.localeCompare(b.name)

/** UI sort: graduated → near → active → pending; within group by progress or name */
export function sortRaceTeamsForDisplay(
  teams: WorldCupRaceTeam[],
  filter: WorldCupRaceFilter,
): WorldCupRaceTeam[] {
  const launched = teams.filter((t): t is WorldCupLaunchedTeam => t.status !== 'pending')
  const pending = teams.filter((t): t is WorldCupPendingTeam => t.status === 'pending')

  const graduated = launched.filter((t) => t.status === 'graduated').sort(sortLaunchedByProgress)
  const near = launched.filter((t) => t.status === 'near').sort(sortLaunchedByProgress)
  const active = launched.filter((t) => t.status === 'active').sort(sortLaunchedByProgress)
  const pendingSorted = [...pending].sort(sortPendingByName)

  if (filter === 'all') {
    return [...graduated, ...near, ...active, ...pendingSorted]
  }
  if (filter === 'pending') return pendingSorted
  return launched.filter((t) => t.status === filter).sort(sortLaunchedByProgress)
}
