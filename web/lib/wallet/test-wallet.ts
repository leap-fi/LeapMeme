/** Optional fixed viewer wallet for QA testing. */
export const FORCED_TEST_WALLET_ADDRESS = '' as const

export function getViewerWalletAddress(
  connectedAddress: string | null | undefined,
): `0x${string}` | null {
  if (!connectedAddress) return null
  if (!FORCED_TEST_WALLET_ADDRESS) return connectedAddress as `0x${string}`
  return FORCED_TEST_WALLET_ADDRESS as `0x${string}`
}