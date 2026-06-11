/** Account API base URL — see doc/leap-account-en.md */
export const ACCOUNT_API_BASE_URL = (
  process.env.NEXT_PUBLIC_MEME_SERVER_BASE_URL ?? 'https://api-pre.leap.fun'
).replace(/\/$/, '')
