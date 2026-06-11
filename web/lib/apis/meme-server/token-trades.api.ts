import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse, TokenTradeDto } from '@/lib/apis/meme-server/types'
import { preserveCaseAddressParam } from '@/lib/utils/preserve-case-param'

export type GetTokenTradesParams = {
  address: string
}

export async function getTokenTrades(
  params: GetTokenTradesParams,
): Promise<BaseResponse<TokenTradeDto[]>> {
  const query = new URLSearchParams({ address: preserveCaseAddressParam(params.address) })
  const url = `${getMemeServerBaseUrl()}/market/token/trades?${query.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`meme-server trades HTTP ${response.status}`)
    }

    const payload = (await response.json()) as BaseResponse<TokenTradeDto[]>
    if (payload?.code === 0 && Array.isArray(payload.data)) {
      return payload
    }
    throw new Error(payload?.msg || 'Invalid trades response')
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Failed to fetch recent trades')
  }
}
