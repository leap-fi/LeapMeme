'use client'

import type { Token } from '@/lib/mock-data'
import type { TokenDetailDto } from '@/lib/apis/meme-server/token-detail.api'
import { TokenInfo } from '@/components/token-info'

interface TokenChartProps {
  token: Token
  contractAddressOverride?: string | null
  detail: TokenDetailDto | null
}

export function TokenChart({ token, contractAddressOverride, detail }: TokenChartProps) {
  return (
    <TokenInfo
      token={token}
      contractAddressOverride={contractAddressOverride}
      detail={detail}
      embedded
      withChart
    />
  )
}
