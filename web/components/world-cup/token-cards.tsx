'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Trophy, Flame, Clock, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatBondingCurveVolumeUsd } from '@/lib/apis/world-cup/format'
import { WORLD_CUP_2026_TEAMS } from '@/lib/world-cup-flags'
import { useWorldCupGraduationRace } from '@/hooks/use-world-cup-graduation-race'
import type {
  WorldCupLaunchedTeam,
  WorldCupPendingTeam,
  WorldCupRaceFilter,
  WorldCupRaceTeam,
} from '@/lib/world-cup-api-types'

function TeamFlag({ flagUrl, name }: { flagUrl: string; name: string }) {
  return (
    <img
      src={flagUrl}
      alt={`${name} flag`}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      className="w-12 h-12 object-contain mb-2"
    />
  )
}

function isPendingTeam(team: WorldCupRaceTeam): team is WorldCupPendingTeam {
  return team.status === 'pending'
}

function buildCoinDetailHref(token: WorldCupLaunchedTeam): string {
  const symbol = encodeURIComponent(token.tokenSymbol)
  const address = token.contractAddress?.trim()
  return address
    ? `/coin/${symbol}?address=${encodeURIComponent(address)}`
    : `/coin/${symbol}`
}

function LaunchedTeamCard({ token }: { token: WorldCupLaunchedTeam }) {
  const volume = formatBondingCurveVolumeUsd(
    token.bondingCurveVolumeUsd,
    token.status === 'graduated',
  )

  return (
    <Link href={buildCoinDetailHref(token)} className="block h-full">
      <Card
        className={cn(
          'bg-card hover:bg-card/80 transition-all border-border hover:border-primary/50 relative overflow-hidden h-full',
          token.status === 'graduated' && 'border-primary/50 bg-primary/5',
          token.status === 'near' && 'border-orange-500/50',
        )}
      >
      {token.status === 'graduated' && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-bl">
          <Trophy className="w-3 h-3 inline mr-1" />
          GRADUATED
        </div>
      )}
      {token.status === 'near' && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-bl">
          <Flame className="w-3 h-3 inline mr-1" />
          HOT
        </div>
      )}
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col items-center text-center">
          <TeamFlag flagUrl={token.flagUrl} name={token.name} />
          <CardTitle className="text-sm font-bold text-card-foreground">
            {token.tokenSymbol}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{token.name}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-card-foreground">{token.progress}%</span>
            </div>
            <Progress
              value={token.progress}
              className={cn(
                'h-1.5',
                token.status === 'graduated' && '[&>div]:bg-primary',
                token.status === 'near' && '[&>div]:bg-orange-500',
              )}
            />
          </div>

          <div className="flex justify-between items-center">
            <Badge
              variant={token.type === 'long' ? 'default' : 'destructive'}
              className="flex items-center gap-1 text-xs px-1.5 py-0"
            >
              {token.type === 'long' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {token.leverage}
            </Badge>
            <span className="text-xs text-muted-foreground">{token.holders} holders</span>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-semibold text-primary">{volume}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  )
}

function PendingTeamCard({ team }: { team: WorldCupPendingTeam }) {
  return (
    <Card className="bg-card hover:bg-card/80 transition-all border-border border-dashed hover:border-primary/50 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-bl">
        TO CREATE
      </div>
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col items-center text-center">
          <TeamFlag flagUrl={team.flagUrl} name={team.name} />
          <CardTitle className="text-sm font-bold text-card-foreground">${team.code}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{team.name}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground leading-relaxed min-h-[2.5rem]">
            No token launched yet. Be the first to deploy this nation&apos;s meme token.
          </p>
          <Button size="sm" className="w-full text-xs" asChild>
            <Link href={team.createHref}>
              <Plus className="w-3.5 h-3.5" />
              Create Token
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function GraduationRaceCardSkeleton() {
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="w-12 h-12 rounded-md mb-2" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-1 text-center">
            <Skeleton className="h-3 w-12 mx-auto" />
            <Skeleton className="h-4 w-14 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GraduationRaceCardsSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      aria-busy="true"
      aria-label="Loading teams"
    >
      {Array.from({ length: count }).map((_, index) => (
        <GraduationRaceCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function WorldCupTokenCards() {
  const [filter, setFilter] = useState<WorldCupRaceFilter>('all')
  const { data, loading, error } = useWorldCupGraduationRace(filter)

  const filterButtons: {
    key: WorldCupRaceFilter
    label: string
    count: number
    icon: typeof Trophy | null
  }[] = data
    ? [
        { key: 'all', label: 'All Teams', count: data.summary.total, icon: null },
        { key: 'graduated', label: 'Graduated', count: data.summary.graduated, icon: Trophy },
        { key: 'near', label: 'Near Graduation', count: data.summary.near, icon: Flame },
        { key: 'active', label: 'In Progress', count: data.summary.active, icon: Clock },
        { key: 'pending', label: 'To Be Created', count: data.summary.pending, icon: Plus },
      ]
    : []

  const teams = data?.teams ?? []
  const skeletonCount = data?.teams.length ?? WORLD_CUP_2026_TEAMS.length

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Live Graduation Race</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-2">
            Track all 48 national team tokens racing to fill their bonding curves and graduate to
            HyperSwap V2.
          </p>
          <p className="text-sm text-primary font-medium">World Cup 2026 - 48 Nations Competing</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer',
                filter === btn.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border',
                loading && 'opacity-60 pointer-events-none',
              )}
            >
              {btn.icon && <btn.icon className="w-4 h-4" />}
              {btn.label}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  filter === btn.key
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </motion.div>

        {loading && <GraduationRaceCardsSkeleton count={skeletonCount} />}

        {error && !loading && (
          <p className="text-center text-destructive text-sm py-8" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {teams.map((token, index) => (
              <motion.div
                key={token.code}
                className="h-full cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{
                  y: -5,
                  transition: { type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
              >
                {isPendingTeam(token) ? (
                  <PendingTeamCard team={token} />
                ) : (
                  <LaunchedTeamCard token={token} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
