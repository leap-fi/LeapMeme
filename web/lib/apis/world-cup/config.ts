const DEFAULT_WORLD_CUP_API_BASE_URL = 'https://api.leap.fun'

export function getWorldCupApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_WORLD_CUP_API_BASE_URL ?? DEFAULT_WORLD_CUP_API_BASE_URL
  return raw.replace(/\/+$/, '')
}
