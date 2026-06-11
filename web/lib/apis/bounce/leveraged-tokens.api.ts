export interface LeveragedTokenDto {
  address: string
  targetLeverage: number
  isLong: boolean
  symbol: string
  name: string
  decimals: number
  targetAsset: string
  mintPaused: boolean
  exchangeRate: string
  totalSupply: string
  totalAssets: string
}

type LeveragedTokensResponse = {
  status: string
  data: LeveragedTokenDto[]
}

const LEVERAGED_TOKENS_URL = 'https://indexing.bounce.tech/leveraged-tokens'
let leveragedTokensCache: Promise<LeveragedTokenDto[]> | null = null

async function fetchLeveragedTokens(): Promise<LeveragedTokenDto[]> {
  const response = await fetch(LEVERAGED_TOKENS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`bounce leveraged tokens HTTP ${response.status}`)
  }

  const payload = (await response.json()) as LeveragedTokensResponse
  if (payload?.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid leveraged tokens response')
  }

  return payload.data
}

export async function getLeveragedTokens(): Promise<LeveragedTokenDto[]> {
  if (!leveragedTokensCache) {
    leveragedTokensCache = fetchLeveragedTokens().catch((error) => {
      leveragedTokensCache = null
      throw error
    })
  }
  return leveragedTokensCache
}
