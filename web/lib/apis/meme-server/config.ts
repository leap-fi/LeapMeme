const DEFAULT_MEME_SERVER_BASE_URL = 'https://leap.cc'

export function getMemeServerBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_MEME_SERVER_BASE_URL ?? DEFAULT_MEME_SERVER_BASE_URL
  return raw.replace(/\/+$/, '')
}
