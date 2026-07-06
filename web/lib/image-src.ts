const ALT_FUN_IMAGE_CDN_PREFIX =
  'https://api.alt.fun/cdn-cgi/image/width=64,quality=85,format=auto/'

/** Local SVG shown when a token has no logo. */
export const DEFAULT_TOKEN_IMAGE = '/token-placeholder.svg'

/** U+1FA99 — old default token image in localStorage/API before SVG placeholder. */
function isLegacyDefaultTokenImage(value: string): boolean {
  return value.trim() === '\u{1FA99}'
}

/** API placeholder logos — use app default instead. */
export function isPlaceholderTokenLogo(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || isLegacyDefaultTokenImage(trimmed)) return true
  const src = trimmed.toLowerCase()
  return src === '/logo.png' || src === 'logo.png' || src === '/logo.svg' || src === 'logo.svg'
}

export function resolveTokenLogoSrc(
  value: string | null | undefined,
  defaultSrc: string = DEFAULT_TOKEN_IMAGE,
): string {
  if (isPlaceholderTokenLogo(value)) return defaultSrc
  return normalizeTokenImageSrc(value) ?? defaultSrc
}

/** Resolve image for UI: CDN/API logo, local default SVG, or symbol text fallback. */
export function resolveTokenDisplaySrc(
  image: string | null | undefined,
  symbol?: string,
): string {
  const trimmed = image?.trim() ?? ''
  if (trimmed && isLocalPublicAssetPath(trimmed)) return trimmed
  const normalized = normalizeTokenImageSrc(image)
  if (normalized) return normalized
  if (trimmed && isRenderableImageSrc(trimmed)) return trimmed
  const logo = resolveTokenLogoSrc(image)
  if (isRenderableImageSrc(logo)) return logo
  if (symbol?.trim()) return symbol.trim().slice(0, 4).toLowerCase()
  return DEFAULT_TOKEN_IMAGE
}

export function isRenderableImageSrc(value: string | null | undefined): boolean {
  if (!value) return false
  const src = value.trim()
  if (!src) return false
  if (isLegacyDefaultTokenImage(src)) return false

  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/') ||
    src.startsWith('blob:') ||
    src.startsWith('/')
  )
}

/**
 * Only true for files that exist under Next `public/` (e.g. placeholder SVG).
 * API logos like `/images/tokens/...` must go through alt.fun CDN — not local.
 */
function isLocalPublicAssetPath(src: string): boolean {
  const path = src.split('?')[0]?.trim() ?? ''
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (path.startsWith('/images/')) return false
  return (
    path === DEFAULT_TOKEN_IMAGE ||
    path === '/logo.svg' ||
    path === '/logo.png' ||
    path === '/placeholder-logo.svg' ||
    path === '/favicon.png' ||
    path === '/apple-icon.png' ||
    path === '/icon.svg' ||
    path.startsWith('/icon-')
  )
}

export function normalizeTokenImageSrc(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const src = value.trim()
  if (!src) return null
  if (isPlaceholderTokenLogo(src)) return null
  if (isLocalPublicAssetPath(src)) return src
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/') ||
    src.startsWith('blob:')
  ) {
    return src
  }
  // Ignore plain text labels; only prefix relative image-like paths.
  const isRelativeImagePath =
    src.includes('/') || /\.[a-zA-Z0-9]{2,5}($|\?)/.test(src)
  if (!isRelativeImagePath) return null
  const normalized = src.startsWith('/') ? src.slice(1) : src
  return `${ALT_FUN_IMAGE_CDN_PREFIX}${normalized}`
}
