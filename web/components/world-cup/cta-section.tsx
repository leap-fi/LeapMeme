'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Rocket, ExternalLink } from 'lucide-react'

export function WorldCupCTASection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl bg-card border border-primary/30 p-8 md:p-12 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_70%)]" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              Ready to Launch Your
              <br />
              <span className="text-primary">National Champion?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Be the first to deploy your nation&apos;s meme token and lead the
              graduation race. Early minters get the biggest rewards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 animate-pulse-glow" asChild>
                <Link href="/create">
                  <Rocket className="w-5 h-5 mr-2" />
                  Launch on leap.fun
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border border-white/15 bg-transparent shadow-none backdrop-blur-xl backdrop-saturate-150 hover:bg-white/10 hover:text-foreground hover:border-primary/40 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5"
                asChild
              >
                <Link href="/terms">
                  Read the Docs
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Powered by Hyperliquid • Built on leap.fun
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
