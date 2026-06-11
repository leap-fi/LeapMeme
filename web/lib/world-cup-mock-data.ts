import {
  buildWorldCupCreateHref,
  worldCupFlagUrl,
  type WorldCupTeam,
} from '@/lib/world-cup-flags'
import type {
  WorldCupGraduationRaceResponse,
  WorldCupGraduatedToken,
  WorldCupGroupLetter,
  WorldCupLaunchedTeam,
  WorldCupLeaderboardResponse,
  WorldCupPendingTeam,
  WorldCupRaceTeam,
  WorldCupTopEarner,
} from '@/lib/world-cup-api-types'

const GRADUATION_TARGET_USD = 9_000
const NEAR_GRADUATION_PROGRESS_MIN = 70

function launched(
  code: string,
  name: string,
  group: WorldCupGroupLetter,
  status: WorldCupLaunchedTeam['status'],
  progress: number,
  seed: number,
): WorldCupLaunchedTeam {
  const leverageNum = seed % 2 === 0 ? 5 : 3
  const leverage = `${leverageNum}x`
  const type = seed % 3 === 0 ? 'short' : 'long'
  const holders = Math.max(12, 456 - seed * 12)
  const bondingCurveVolumeUsd =
    status === 'graduated' ? GRADUATION_TARGET_USD : Math.round((progress / 100) * GRADUATION_TARGET_USD)
  const tokenSymbol = `$${code}${leverageNum}${type === 'long' ? 'L' : 'S'}`

  return {
    code,
    name,
    group,
    status,
    progress,
    bondingCurveVolumeUsd,
    type,
    leverage,
    holders,
    tokenSymbol,
    contractAddress: `0x${code.toLowerCase()}${'0'.repeat(40 - code.length)}`,
    flagUrl: worldCupFlagUrl(name),
  }
}

function pending(code: string, name: string, group: WorldCupGroupLetter): WorldCupPendingTeam {
  const team: WorldCupTeam = { code, name }
  return {
    code,
    name,
    group,
    status: 'pending',
    flagUrl: worldCupFlagUrl(name),
    createHref: buildWorldCupCreateHref(team),
  }
}

/** Source list aligned with `components/world-cup/token-cards.tsx` */
const launchedTeams: WorldCupLaunchedTeam[] = [
  launched('MEX', 'Mexico', 'A', 'active', 52, 1),
  launched('KOR', 'South Korea', 'A', 'active', 42, 2),
  launched('CZE', 'Czech Republic', 'A', 'active', 13, 3),
  launched('CAN', 'Canada', 'B', 'active', 48, 4),
  launched('QAT', 'Qatar', 'B', 'active', 4, 5),
  launched('SUI', 'Switzerland', 'B', 'active', 22, 6),
  launched('BRA', 'Brazil', 'C', 'graduated', 100, 7),
  launched('MAR', 'Morocco', 'C', 'active', 28, 8),
  launched('SCO', 'Scotland', 'C', 'active', 15, 9),
  launched('USA', 'United States', 'D', 'active', 58, 10),
  launched('PAR', 'Paraguay', 'D', 'active', 36, 11),
  launched('AUS', 'Australia', 'D', 'active', 38, 12),
  launched('TUR', 'Turkey', 'D', 'active', 12, 13),
  launched('GER', 'Germany', 'E', 'graduated', 100, 14),
  launched('CIV', 'Ivory Coast', 'E', 'active', 9, 15),
  launched('ECU', 'Ecuador', 'E', 'active', 33, 16),
  launched('NED', 'Netherlands', 'F', 'near', 75, 17),
  launched('JPN', 'Japan', 'F', 'active', 45, 18),
  launched('SWE', 'Sweden', 'F', 'active', 24, 19),
  launched('TUN', 'Tunisia', 'F', 'active', 6, 20),
  launched('BEL', 'Belgium', 'G', 'near', 71, 21),
  launched('EGY', 'Egypt', 'G', 'active', 8, 22),
  launched('IRN', 'Iran', 'G', 'active', 5, 23),
  launched('NZL', 'New Zealand', 'G', 'active', 3, 24),
  launched('ESP', 'Spain', 'H', 'near', 87, 25),
  launched('SAU', 'Saudi Arabia', 'H', 'active', 5, 26),
  launched('URU', 'Uruguay', 'H', 'active', 35, 27),
  launched('FRA', 'France', 'I', 'near', 92, 28),
  launched('SEN', 'Senegal', 'I', 'active', 26, 29),
  launched('IRQ', 'Iraq', 'I', 'active', 11, 30),
  launched('NOR', 'Norway', 'I', 'active', 20, 31),
  launched('ARG', 'Argentina', 'J', 'graduated', 100, 32),
  launched('ALG', 'Algeria', 'J', 'active', 7, 33),
  launched('AUT', 'Austria', 'J', 'active', 17, 34),
  launched('POR', 'Portugal', 'K', 'near', 78, 35),
  launched('COL', 'Colombia', 'K', 'active', 32, 36),
  launched('ENG', 'England', 'L', 'near', 82, 37),
  launched('CRO', 'Croatia', 'L', 'active', 30, 38),
  launched('GHA', 'Ghana', 'L', 'active', 10, 39),
  launched('PAN', 'Panama', 'L', 'active', 2, 40),
]

const pendingTeams: WorldCupPendingTeam[] = [
  pending('RSA', 'South Africa', 'A'),
  pending('BIH', 'Bosnia and Herzegovina', 'B'),
  pending('HAI', 'Haiti', 'C'),
  pending('CUW', 'Curaçao', 'E'),
  pending('CPV', 'Cape Verde', 'H'),
  pending('JOR', 'Jordan', 'J'),
  pending('COD', 'DR Congo', 'K'),
  pending('UZB', 'Uzbekistan', 'K'),
]

/** Interleave by group (A1,B1,…,L1,A2,…) — same order as the page grid */
function buildAllRaceTeams(): WorldCupRaceTeam[] {
  const groups: WorldCupRaceTeam[][] = Array.from({ length: 12 }, () => [])
  const slot = (groupIndex: number, team: WorldCupRaceTeam) => {
    groups[groupIndex].push(team)
  }

  slot(0, launchedTeams[0])
  slot(0, pendingTeams[0])
  slot(0, launchedTeams[1])
  slot(0, launchedTeams[2])

  slot(1, launchedTeams[3])
  slot(1, pendingTeams[1])
  slot(1, launchedTeams[4])
  slot(1, launchedTeams[5])

  slot(2, launchedTeams[6])
  slot(2, launchedTeams[7])
  slot(2, pendingTeams[2])
  slot(2, launchedTeams[8])

  slot(3, launchedTeams[9])
  slot(3, launchedTeams[10])
  slot(3, launchedTeams[11])
  slot(3, launchedTeams[12])

  slot(4, launchedTeams[13])
  slot(4, pendingTeams[3])
  slot(4, launchedTeams[14])
  slot(4, launchedTeams[15])

  slot(5, launchedTeams[16])
  slot(5, launchedTeams[17])
  slot(5, launchedTeams[18])
  slot(5, launchedTeams[19])

  slot(6, launchedTeams[20])
  slot(6, launchedTeams[21])
  slot(6, launchedTeams[22])
  slot(6, launchedTeams[23])

  slot(7, launchedTeams[24])
  slot(7, pendingTeams[4])
  slot(7, launchedTeams[25])
  slot(7, launchedTeams[26])

  slot(8, launchedTeams[27])
  slot(8, launchedTeams[28])
  slot(8, launchedTeams[29])
  slot(8, launchedTeams[30])

  slot(9, launchedTeams[31])
  slot(9, launchedTeams[32])
  slot(9, launchedTeams[33])
  slot(9, pendingTeams[5])

  slot(10, launchedTeams[34])
  slot(10, pendingTeams[6])
  slot(10, pendingTeams[7])
  slot(10, launchedTeams[35])

  slot(11, launchedTeams[36])
  slot(11, launchedTeams[37])
  slot(11, launchedTeams[38])
  slot(11, launchedTeams[39])

  const ordered: WorldCupRaceTeam[] = []
  for (let pos = 0; pos < 4; pos++) {
    for (let g = 0; g < 12; g++) {
      ordered.push(groups[g][pos])
    }
  }
  return ordered
}

const allRaceTeams = buildAllRaceTeams()

function countByStatus(status: WorldCupRaceTeam['status']): number {
  return allRaceTeams.filter((t) => t.status === status).length
}

export const worldCupGraduationRaceMock: WorldCupGraduationRaceResponse = {
  graduationTargetUsd: GRADUATION_TARGET_USD,
  nearGraduationProgressMin: NEAR_GRADUATION_PROGRESS_MIN,
  summary: {
    total: allRaceTeams.length,
    graduated: countByStatus('graduated'),
    near: countByStatus('near'),
    active: countByStatus('active'),
    pending: countByStatus('pending'),
  },
  teams: allRaceTeams,
}

export const worldCupGraduatedTokensMock: WorldCupGraduatedToken[] = [
  {
    tokenSymbol: '$ARG5L',
    name: 'Argentina 5x Long',
    teamCode: 'ARG',
    type: 'long',
    leverage: '5x',
    graduatedAt: '2026-05-28',
    totalRewardsUsd: 12_450,
    contractAddress: '0xarg0000000000000000000000000000000000001',
    explorerUrl: 'https://hyperevmscan.io/token/0xarg0000000000000000000000000000000000001',
    flagUrl: worldCupFlagUrl('Argentina'),
    deployer: { address: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12', rewardUsd: 6224 },
    topHolders: [
      {
        rank: 1,
        address: '0x5e6f7890abcdef1234567890abcdef1234567890',
        holderPoolPercentage: 45,
        rewardUsd: 5602.5,
      },
      {
        rank: 2,
        address: '0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        holderPoolPercentage: 30,
        rewardUsd: 3735,
      },
      {
        rank: 3,
        address: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
        holderPoolPercentage: 25,
        rewardUsd: 3112.5,
      },
    ],
  },
  {
    tokenSymbol: '$BRA3L',
    name: 'Brazil 3x Long',
    teamCode: 'BRA',
    type: 'long',
    leverage: '3x',
    graduatedAt: '2026-05-30',
    totalRewardsUsd: 9820,
    contractAddress: '0xbra0000000000000000000000000000000000000002',
    explorerUrl: 'https://hyperevmscan.io/token/0xbra0000000000000000000000000000000000000002',
    flagUrl: worldCupFlagUrl('Brazil'),
    deployer: { address: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d', rewardUsd: 4910 },
    topHolders: [
      {
        rank: 1,
        address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
        holderPoolPercentage: 50,
        rewardUsd: 4910,
      },
      {
        rank: 2,
        address: '0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
        holderPoolPercentage: 30,
        rewardUsd: 2946,
      },
      {
        rank: 3,
        address: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
        holderPoolPercentage: 20,
        rewardUsd: 1964,
      },
    ],
  },
  {
    tokenSymbol: '$GER5S',
    name: 'Germany 5x Short',
    teamCode: 'GER',
    type: 'short',
    leverage: '5x',
    graduatedAt: '2026-06-01',
    totalRewardsUsd: 8540,
    contractAddress: '0xger0000000000000000000000000000000000000003',
    explorerUrl: 'https://hyperevmscan.io/token/0xger0000000000000000000000000000000000000003',
    flagUrl: worldCupFlagUrl('Germany'),
    deployer: { address: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', rewardUsd: 4270 },
    topHolders: [
      {
        rank: 1,
        address: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
        holderPoolPercentage: 55,
        rewardUsd: 4697,
      },
      {
        rank: 2,
        address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
        holderPoolPercentage: 28,
        rewardUsd: 2391.2,
      },
      {
        rank: 3,
        address: '0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
        holderPoolPercentage: 17,
        rewardUsd: 1451.8,
      },
    ],
  },
]

export const worldCupTopEarnersMock: WorldCupTopEarner[] = [
  {
    rank: 1,
    address: '0x5e6f7890abcdef1234567890abcdef1234567890',
    totalEarnedUsd: 4215,
    graduatedTokenCount: 3,
    graduatedTokenSymbols: ['$ARG5L', '$BRA3L', '$GER5S'],
  },
  {
    rank: 2,
    address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    totalEarnedUsd: 3892,
    graduatedTokenCount: 2,
    graduatedTokenSymbols: ['$BRA3L', '$GER5S'],
  },
  {
    rank: 3,
    address: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    totalEarnedUsd: 2964,
    graduatedTokenCount: 1,
    graduatedTokenSymbols: ['$BRA3L'],
  },
  {
    rank: 4,
    address: '0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    totalEarnedUsd: 2156,
    graduatedTokenCount: 2,
    graduatedTokenSymbols: ['$ARG5L'],
  },
  {
    rank: 5,
    address: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    totalEarnedUsd: 2490,
    graduatedTokenCount: 1,
    graduatedTokenSymbols: ['$ARG5L'],
  },
]

const totalRewardsPaidUsd = worldCupGraduatedTokensMock.reduce(
  (sum, t) => sum + t.totalRewardsUsd,
  0,
)

export const worldCupLeaderboardMock: WorldCupLeaderboardResponse = {
  summary: {
    tokensGraduated: worldCupGraduatedTokensMock.length,
    totalRewardsPaidUsd,
    uniqueEarners: 12,
    avgRewardPerTokenUsd: Math.round(totalRewardsPaidUsd / worldCupGraduatedTokensMock.length),
  },
  graduatedTokens: worldCupGraduatedTokensMock,
  topEarners: worldCupTopEarnersMock,
}

/** Full API envelopes for mock servers / tests */
export const worldCupGraduationRaceMockEnvelope = {
  code: 200,
  msg: 'success',
  data: worldCupGraduationRaceMock,
} as const

export const worldCupLeaderboardMockEnvelope = {
  code: 200,
  msg: 'success',
  data: worldCupLeaderboardMock,
} as const
