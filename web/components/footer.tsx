'use client'

import Link from 'next/link'
import { BookOpen, Send } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useI18n } from '@/lib/i18n/context'

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border bg-card/50 px-6 py-4">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-center gap-4 sm:justify-start">
          <LanguageToggle />
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <BookOpen className="h-4 w-4" />
            {t('footer.docs')}
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">{t('footer.rights')}</p>

        <div className="flex items-center justify-center gap-3 sm:justify-end">
          <ThemeToggle />
          <a
            href="https://x.com/leapfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="X"
          >
            <XIcon className="h-4 w-4" />
          </a>
          <a
            href="https://t.me/leap_fun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="Telegram"
          >
            <Send className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}
