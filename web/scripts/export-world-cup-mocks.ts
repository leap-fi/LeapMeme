import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  worldCupGraduationRaceMockEnvelope,
  worldCupLeaderboardMockEnvelope,
} from '../lib/world-cup-mock-data'

const outDir = join(process.cwd(), 'docs/mocks/world-cup-2026')
mkdirSync(outDir, { recursive: true })

writeFileSync(
  join(outDir, 'graduation-race.mock.json'),
  `${JSON.stringify(worldCupGraduationRaceMockEnvelope, null, 2)}\n`,
)
writeFileSync(
  join(outDir, 'leaderboard.mock.json'),
  `${JSON.stringify(worldCupLeaderboardMockEnvelope, null, 2)}\n`,
)

console.log('Wrote docs/mocks/world-cup-2026/*.mock.json')
