import type { Token } from '@/lib/mock-data'

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

/** Resolve on-chain token address from metadata or URL override. */
export function resolveTokenAddress(
  token: Token,
  addressOverride?: string | null,
): `0x${string}` | null {
  const candidate = addressOverride?.trim() || token.contractAddress?.trim()
  if (!candidate || !ADDRESS_RE.test(candidate)) return null
  return candidate as `0x${string}`
}
