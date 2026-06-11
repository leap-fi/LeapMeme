'use client'

import {
  DEFAULT_TOKEN_IMAGE,
  isRenderableImageSrc,
  resolveTokenDisplaySrc,
} from '@/lib/image-src'

type TokenAvatarProps = {
  image?: string | null
  symbol: string
  className?: string
  imgClassName?: string
  fallbackClassName?: string
}

/** Renders token logo — same rules as homepage TRENDING (`token-list`). */
export function TokenAvatar({
  image,
  symbol,
  className = 'w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = 'text-xl',
}: TokenAvatarProps) {
  const resolved = resolveTokenDisplaySrc(image, symbol)

  return (
    <div className={className}>
      {isRenderableImageSrc(resolved) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          className={imgClassName}
          onError={(event) => {
            const el = event.currentTarget
            if (el.src.includes(DEFAULT_TOKEN_IMAGE)) return
            el.onerror = null
            el.src = DEFAULT_TOKEN_IMAGE
          }}
        />
      ) : (
        <span className={fallbackClassName}>{resolved}</span>
      )}
    </div>
  )
}
