const WORLD_CUP_2026_FLAGS_BASE = 'https://s3.leap.fun/world-cup-2026-flags'

export const WORLD_CUP_FROM_PREFIX = 'world-cup-'

export type WorldCupTeam = {
  code: string
  name: string
}

/** All 48 FIFA World Cup 2026 nations */
export const WORLD_CUP_2026_TEAMS: WorldCupTeam[] = [
  { code: 'MEX', name: 'Mexico' },
  { code: 'RSA', name: 'South Africa' },
  { code: 'KOR', name: 'South Korea' },
  { code: 'CZE', name: 'Czech Republic' },
  { code: 'CAN', name: 'Canada' },
  { code: 'BIH', name: 'Bosnia and Herzegovina' },
  { code: 'QAT', name: 'Qatar' },
  { code: 'SUI', name: 'Switzerland' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'MAR', name: 'Morocco' },
  { code: 'HAI', name: 'Haiti' },
  { code: 'SCO', name: 'Scotland' },
  { code: 'USA', name: 'United States' },
  { code: 'PAR', name: 'Paraguay' },
  { code: 'AUS', name: 'Australia' },
  { code: 'TUR', name: 'Turkey' },
  { code: 'GER', name: 'Germany' },
  { code: 'CUW', name: 'Curaçao' },
  { code: 'CIV', name: 'Ivory Coast' },
  { code: 'ECU', name: 'Ecuador' },
  { code: 'NED', name: 'Netherlands' },
  { code: 'JPN', name: 'Japan' },
  { code: 'SWE', name: 'Sweden' },
  { code: 'TUN', name: 'Tunisia' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'EGY', name: 'Egypt' },
  { code: 'IRN', name: 'Iran' },
  { code: 'NZL', name: 'New Zealand' },
  { code: 'ESP', name: 'Spain' },
  { code: 'CPV', name: 'Cape Verde' },
  { code: 'SAU', name: 'Saudi Arabia' },
  { code: 'URU', name: 'Uruguay' },
  { code: 'FRA', name: 'France' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'IRQ', name: 'Iraq' },
  { code: 'NOR', name: 'Norway' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'ALG', name: 'Algeria' },
  { code: 'AUT', name: 'Austria' },
  { code: 'JOR', name: 'Jordan' },
  { code: 'POR', name: 'Portugal' },
  { code: 'COD', name: 'DR Congo' },
  { code: 'UZB', name: 'Uzbekistan' },
  { code: 'COL', name: 'Colombia' },
  { code: 'ENG', name: 'England' },
  { code: 'CRO', name: 'Croatia' },
  { code: 'GHA', name: 'Ghana' },
  { code: 'PAN', name: 'Panama' },
]

const TEAM_NAME_TO_FLAG_FILE: Record<string, string> = {
  Algeria: 'Algeria.png',
  Argentina: 'Argentina.png',
  Australia: 'Australia.png',
  Austria: 'Austria.png',
  Belgium: 'Belgium.png',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina.png',
  Brazil: 'Brazil.png',
  Canada: 'Canada.png',
  'Cape Verde': 'Cape-Verde.png',
  Colombia: 'Colombia.png',
  Croatia: 'Croatia.png',
  Curaçao: 'Curacao.png',
  'Czech Republic': 'Czechia.png',
  'DR Congo': 'DR-Congo.png',
  Ecuador: 'Ecuador.png',
  Egypt: 'Egypt.png',
  England: 'England.png',
  France: 'France.png',
  Germany: 'Germany.png',
  Ghana: 'Ghana.png',
  Haiti: 'Haiti.png',
  Iran: 'Iran.png',
  Iraq: 'Iraq.png',
  'Ivory Coast': 'Ivory-Coast.png',
  Japan: 'Japan.png',
  Jordan: 'Jordan.png',
  Mexico: 'Mexico.png',
  Morocco: 'Morocco.png',
  Netherlands: 'Netherlands.png',
  'New Zealand': 'New-Zealand.png',
  Norway: 'Norway.png',
  Panama: 'Panama.png',
  Paraguay: 'Paraguay.png',
  Portugal: 'Portugal.png',
  Qatar: 'Qatar.png',
  'Saudi Arabia': 'Saudi-Arabia.png',
  Scotland: 'Scotland.png',
  Senegal: 'Senegal.png',
  'South Africa': 'South-Africa.png',
  'South Korea': 'South-Korea.png',
  Spain: 'Spain.png',
  Sweden: 'Sweden.png',
  Switzerland: 'Switzerland.png',
  Tunisia: 'Tunisia.png',
  Turkey: 'Turkiye.png',
  'United States': 'United-States.png',
  Uruguay: 'Uruguay.png',
  Uzbekistan: 'Uzbekistan.png',
}

const teamByName = new Map(WORLD_CUP_2026_TEAMS.map((team) => [team.name, team]))

export function findWorldCupTeamByName(name: string): WorldCupTeam | undefined {
  return teamByName.get(name.trim())
}

export function worldCupFlagUrl(teamName: string): string {
  const file = TEAM_NAME_TO_FLAG_FILE[teamName]
  if (!file) {
    throw new Error(`Missing World Cup 2026 flag mapping for team: ${teamName}`)
  }
  return `${WORLD_CUP_2026_FLAGS_BASE}/${file}`
}

/** e.g. `/create?from=world-cup-Mexico` */
export function buildWorldCupCreateHref(team: Pick<WorldCupTeam, 'name'>): string {
  return `/create?from=${encodeURIComponent(`${WORLD_CUP_FROM_PREFIX}${team.name}`)}`
}

export function parseWorldCupFromQuery(from: string | null): WorldCupTeam | null {
  if (!from?.startsWith(WORLD_CUP_FROM_PREFIX)) return null
  const rawName = from.slice(WORLD_CUP_FROM_PREFIX.length)
  const name = decodeURIComponent(rawName.replace(/\+/g, ' '))
  return findWorldCupTeamByName(name) ?? null
}

export type WorldCupCreatePrefill = {
  tokenName: string
  ticker: string
  description: string
  image: string
}

export function getWorldCupCreatePrefill(team: WorldCupTeam): WorldCupCreatePrefill {
  return {
    tokenName: `${team.name} WC26`.slice(0, 34),
    ticker: team.code.slice(0, 10),
    description: `FIFA World Cup 2026 national team token for ${team.name} on Leap.`,
    image: worldCupFlagUrl(team.name),
  }
}
