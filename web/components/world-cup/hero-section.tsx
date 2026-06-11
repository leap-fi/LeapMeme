'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AnimatedStat } from '@/components/world-cup/animated-stat'
import { ArrowRight, Rocket, Trophy } from 'lucide-react'

export function WorldCupHeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Trophy className="w-4 h-4" />
            World Cup 2026 Special Event
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-balance"
        >
          <span className="text-foreground">National Team</span>
          <br />
          <span className="text-primary">Power Meme</span>
          <br />
          <span className="text-foreground">Launch Battle</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty"
        >
          Race to graduate your nation&apos;s leveraged meme token on leap.fun.
          First to fill the bonding curve wins massive rewards.
          100% fee sharing for early minters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button size="lg" className="text-lg px-8 py-6 animate-pulse-glow" asChild>
            <Link href="/create">
              <Rocket className="w-5 h-5 mr-2" />
              Launch Token Now
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 border border-white/15 bg-transparent shadow-none backdrop-blur-xl backdrop-saturate-150 hover:bg-white/10 hover:text-foreground hover:border-primary/40 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5"
            asChild
          >
            <a href="#leaderboard">
              View Leaderboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto"
        >
          {[
            { value: 9000, prefix: '$', label: 'Graduation Target' },
            { value: 100, suffix: '%', label: 'Fee Sharing' },
            { value: 48, label: 'Nations Competing' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <AnimatedStat
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                delay={0.5 + i * 0.15}
                className="text-3xl md:text-4xl font-bold text-primary tabular-nums"
              />
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
