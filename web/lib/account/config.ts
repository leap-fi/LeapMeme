/** Account API base URL — awsToken 等走线上，与本地 meme-server 分离 */
export const ACCOUNT_API_BASE_URL = (
  process.env.NEXT_PUBLIC_ACCOUNT_API_BASE_URL ?? 'https://api.leap.fun'
).replace(/\/$/, '')
