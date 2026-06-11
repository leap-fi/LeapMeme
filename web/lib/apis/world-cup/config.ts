import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'

export function getWorldCupApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_WORLD_CUP_API_BASE_URL ?? getMemeServerBaseUrl()
  return raw.replace(/\/+$/, '')
}
