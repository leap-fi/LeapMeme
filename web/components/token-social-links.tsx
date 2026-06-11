'use client'

import { Globe, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export type TokenSocialLinksProps = {
  twitter?: string | null
  telegram?: string | null
  website?: string | null
  className?: string
}

function normalizeSocialUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const SOCIAL_LINKS = [
  {
    key: 'twitter',
    label: 'X',
    Icon: XIcon,
    pick: (props: TokenSocialLinksProps) => props.twitter,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    Icon: Send,
    pick: (props: TokenSocialLinksProps) => props.telegram,
  },
  {
    key: 'website',
    label: 'Website',
    Icon: Globe,
    pick: (props: TokenSocialLinksProps) => props.website,
  },
] as const

export function TokenSocialLinks({ className, ...props }: TokenSocialLinksProps) {
  const items = SOCIAL_LINKS.map((item) => ({
    ...item,
    href: normalizeSocialUrl(item.pick(props)),
  })).filter((item): item is typeof item & { href: string } => Boolean(item.href))

  if (items.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {items.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  )
}
