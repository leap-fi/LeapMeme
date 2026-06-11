import { CONTRACTS } from '@/lib/contracts/config'

export function toHexAddress(value?: string | null): `0x${string}` | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return undefined
  return normalized as `0x${string}`
}

/** Bonding proxy for on-chain calls; prefers per-token address from API. */
export function resolveBondingAddress(tokenBonding?: string | null): `0x${string}` {
  return toHexAddress(tokenBonding) ?? CONTRACTS.bonding
}

export function isValidHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}
