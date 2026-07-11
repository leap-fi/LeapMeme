import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse } from '@/lib/apis/meme-server/types'
import type { ProtocolProfile } from '@/lib/protocol/types'

export type ProtocolConfigDto = {
  graduationTargetUsdc: string
  minSeedUsdc: string
  maxSeedUsdc: string
  minBuyUsdc: string
  minSellUsdc: string
  maxTradeUsdc?: string | null
  buyFeeBps: number
  sellFeeBps: number
  creatorFeeShareBps: number
  seedPresets: string[]
  source: string
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === '') return fallback
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function mapProtocolConfigDto(dto: ProtocolConfigDto): ProtocolProfile {
  const maxSeedUsdc = toNumber(dto.maxSeedUsdc, 20)
  const seedPresets = (dto.seedPresets ?? [])
    .map((item) => toNumber(item, NaN))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= maxSeedUsdc)

  return {
    graduationTargetUsdc: toNumber(dto.graduationTargetUsdc, 1000),
    minSeedUsdc: toNumber(dto.minSeedUsdc, 0),
    maxSeedUsdc,
    minBuyUsdc: toNumber(dto.minBuyUsdc, 0.0001),
    minSellUsdc: toNumber(dto.minSellUsdc, 0),
    maxTradeUsdc:
      dto.maxTradeUsdc != null && dto.maxTradeUsdc !== ''
        ? toNumber(dto.maxTradeUsdc, NaN)
        : null,
    buyFeeBps: dto.buyFeeBps ?? 75,
    sellFeeBps: dto.sellFeeBps ?? 75,
    creatorFeeShareBps: dto.creatorFeeShareBps ?? 6667,
    seedPresets: seedPresets.length > 0 ? seedPresets : [0],
    source: dto.source === 'chain' ? 'chain' : 'env',
  }
}

export async function getProtocolConfig(): Promise<ProtocolProfile> {
  const url = `${getMemeServerBaseUrl()}/market/protocol/config`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`meme-server protocol config HTTP ${response.status}`)
  }
  const payload = (await response.json()) as BaseResponse<ProtocolConfigDto>
  if (payload?.code !== 0 || !payload.data) {
    throw new Error(payload?.msg || 'Invalid protocol config response')
  }
  return mapProtocolConfigDto(payload.data)
}
