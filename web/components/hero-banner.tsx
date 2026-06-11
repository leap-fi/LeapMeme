'use client'

import { Sparkles } from 'lucide-react'
import { HeroBannerEffect } from '@/components/hero-banner-effect'

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-5 py-4">
      <HeroBannerEffect />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent" />
      <div className="relative z-10 max-w-lg md:max-w-[38%]">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">New Era of Trading</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight text-foreground mb-1">
          Launch coins <span className="text-primary">backed by perps</span>
        </h1>
        <p className="hidden md:block text-sm leading-snug text-muted-foreground">
          Every token is backed by a non-liquidating Hyperliquid perp. Your token pumps even when nobody&apos;s buying.
        </p>
      </div>
    </div>
  )
}
