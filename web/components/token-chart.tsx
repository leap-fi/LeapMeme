'use client'

import type { Token } from '@/lib/mock-data'
import { TokenInfo } from '@/components/token-info'

interface TokenChartProps {
  token: Token
  contractAddressOverride?: string | null
}

export function TokenChart({ token, contractAddressOverride }: TokenChartProps) {
  return (
    <TokenInfo
      token={token}
      contractAddressOverride={contractAddressOverride}
      embedded
      withChart
    />
  )
}
