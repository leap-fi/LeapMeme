'use client'

import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { Footer } from '@/components/footer'
import { WorldCupBackground } from '@/components/world-cup/world-cup-background'
import { WorldCupHeroSection } from '@/components/world-cup/hero-section'
import { WorldCupTokenCards } from '@/components/world-cup/token-cards'
import { WorldCupLeaderboard } from '@/components/world-cup/leaderboard'
import { WorldCupFAQSection } from '@/components/world-cup/faq-section'
import { WorldCupCTASection } from '@/components/world-cup/cta-section'

export default function WorldCupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PriceTicker />

      <main className="world-cup-theme flex-1 relative bg-background text-foreground">
        <WorldCupBackground />
        <div className="relative z-10">
          <WorldCupHeroSection />
          <section id="race">
            <WorldCupTokenCards />
          </section>
          <section id="leaderboard">
            <WorldCupLeaderboard />
          </section>
          <section id="faq">
            <WorldCupFAQSection />
          </section>
          <WorldCupCTASection />
        </div>
      </main>

      <Footer />
    </div>
  )
}
