import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse } from '@/lib/apis/meme-server/types'
import { preserveCaseAddressParam } from '@/lib/utils/preserve-case-param'

export interface TokenDetailDto {
  address: string
  ltAddress?: string | null
  symbol: string
  name: string
  bondingCurve?: string | null
  associatedBondingCurve?: string | null
  totalSupply?: number | string
  decimals?: number | string
  logo?: string | null
  creator?: string | null
  description?: string | null
  showName?: string | null
  twitter?: string | null
  telegram?: string | null
  website?: string | null
  blockNumber?: number | string
  hash?: string | null
  timestamp?: number | string
  bonding?: string | null
  zap?: string | null
  router?: string | null
  pool?: string | null
  market?: string | null
  leverage?: string | number | null
  direction?: string | null
  price?: number | string
  marketCap?: number | string
  liquidity?: number | string
  tradeUserCount?: number | string
  tradeVolume?: number | string
  tradeVolume24h?: number | string
  buyVolume24h?: number | string
  sellVolume24h?: number | string
  bondingCurveProgress?: number | string
  /** Cumulative bonding-curve trade volume (USD), when backend provides it. */
  bondingCurveVolumeUsd?: number | string | null
  bondingCurveVolume?: number | string | null
  bonding_curve_volume_usd?: number | string | null
  tradeCount?: number | string
  tradeCount24h?: number | string
  buyCount24h?: number | string
  sellCount24h?: number | string
  top10Holder?: number | string
  status?: string | null
  priceChangePercent24h?: number | string
  isExternal?: boolean
}

const ZAP_TO_ROUTER_MAP: Record<string, `0x${string}`> = {
  '0x693f12e9e6b35b34458793546065e8b08e0299d6': '0x70c7eC6f85B960379b7ee60Af72E0f419d915878',
  '0x5f66e5ec4ec9f045e10a580e7ba1147b0c650e45': '0xf1e943a1b78ac7F0976beC79c5F74C4B30C5646b',
}

export async function getTokenDetail(address: string): Promise<TokenDetailDto> {
  const query = new URLSearchParams({ address: preserveCaseAddressParam(address) })
  const url = `${getMemeServerBaseUrl()}/market/token/detail?${query.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server detail HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<
    TokenDetailDto & {
      lt_address?: string | null
      ltaddress?: string | null
    }
  >
  if (payload?.code !== 0 || !payload.data) {
    throw new Error(payload?.msg || 'Invalid token detail response')
  }

  const detail = payload.data
  const normalizedZap = detail.zap?.trim().toLowerCase()
  const mappedRouter = normalizedZap ? ZAP_TO_ROUTER_MAP[normalizedZap] : undefined

  return {
    ...detail,
    ltAddress: detail.ltAddress ?? detail.lt_address ?? detail.ltaddress ?? null,
    pool: detail.pool ?? null,
    router: detail.router ?? mappedRouter ?? null,
  }
}
