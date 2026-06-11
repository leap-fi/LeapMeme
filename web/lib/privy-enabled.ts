const PLACEHOLDER_PRIVY_APP_IDS = new Set([
  'your_privy_app_id_here',
  'your_production_privy_app_id_here',
])

/** Read and validate Privy App ID (placeholder values are treated as unset). */
export function getPrivyAppId(): string | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim()
  if (!appId || PLACEHOLDER_PRIVY_APP_IDS.has(appId)) {
    return null
  }
  return appId
}

/** True when Privy wallet auth is configured with a real app ID. */
export function isPrivyEnabled(): boolean {
  return getPrivyAppId() !== null
}
