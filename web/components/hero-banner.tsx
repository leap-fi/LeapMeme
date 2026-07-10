'use client'

import Link from 'next/link'
import { ArrowRight, Rocket, Sparkles } from 'lucide-react'
import { HeroBannerEffect } from '@/components/hero-banner-effect'
import { useI18n } from '@/lib/i18n/context'

export function HeroBanner() {
  const { t } = useI18n()

  return (
    <Link
      href="/create"
      className="group relative block overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-5 py-4 transition-colors hover:from-primary/25 hover:via-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <HeroBannerEffect />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {t('hero.badge')}
              </span>
            </span>
          </div>
          <h1 className="mb-1 text-2xl font-bold leading-tight text-foreground md:text-3xl">
            {t('hero.title.a')} <span className="text-primary">{t('hero.title.b')}</span>
          </h1>
          <p className="text-sm leading-snug text-foreground">{t('hero.subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-foreground px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-foreground transition-transform group-hover:translate-x-0.5">
            <Rocket className="h-4 w-4" />
            {t('hero.cta')}
            <ArrowRight className="h-4 w-4 opacity-80" />
          </span>
        </div>
      </div>
    </Link>
  )
}
