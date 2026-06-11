'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, Medal, Wallet, ExternalLink, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAddressCompact, formatUsd } from '@/lib/apis/world-cup/format'
import { useWorldCupLeaderboard } from '@/hooks/use-world-cup-leaderboard'
import { AnimatedStat } from '@/components/world-cup/animated-stat'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  WorldCupGraduatedToken,
  WorldCupLeaderboardSummary,
  WorldCupTopEarner,
} from '@/lib/world-cup-api-types'

const TOP_EARNER_SKELETON_ROWS = 5
const GRADUATED_TOKEN_SKELETON_ROWS = 2
const SUMMARY_STAT_LABELS = [
  'Tokens Graduated',
  'Total Rewards Paid',
  'Unique Earners',
  'Avg. Reward/Token',
] as const

function TopEarnerRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
      <div className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

function GraduatedTokenCardSkeleton() {
  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1.5 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

function LeaderboardPanelShell({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  children,
}: {
  icon: typeof Crown
  iconClassName: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            iconClassName,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function LeaderboardContentSkeleton() {
  return (
    <>
      <div
        className="grid lg:grid-cols-3 gap-6 mb-12"
        aria-busy="true"
        aria-label="Loading leaderboard"
      >
        <LeaderboardPanelShell
          icon={Crown}
          iconClassName="bg-primary/10 text-primary"
          title="Top Earners"
          subtitle="Click to view graduated tokens"
        >
          <div className="space-y-3">
            {Array.from({ length: TOP_EARNER_SKELETON_ROWS }).map((_, index) => (
              <TopEarnerRowSkeleton key={index} />
            ))}
          </div>
        </LeaderboardPanelShell>

        <div className="lg:col-span-2">
          <LeaderboardPanelShell
            icon={Medal}
            iconClassName="bg-accent/10 text-accent"
            title="Graduated Tokens"
            subtitle="Loading reward breakdown…"
          >
            <div className="space-y-4">
              {Array.from({ length: GRADUATED_TOKEN_SKELETON_ROWS }).map((_, index) => (
                <GraduatedTokenCardSkeleton key={index} />
              ))}
            </div>
          </LeaderboardPanelShell>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUMMARY_STAT_LABELS.map((label) => (
          <div
            key={label}
            className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-4 text-center space-y-2"
          >
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        ))}
      </div>
    </>
  )
}

function LeaderboardEmptyState({ summary }: { summary?: WorldCupLeaderboardSummary }) {
  const summaryStats = summary
    ? [
        { label: SUMMARY_STAT_LABELS[0], value: summary.tokensGraduated },
        { label: SUMMARY_STAT_LABELS[1], value: summary.totalRewardsPaidUsd, prefix: '$' },
        { label: SUMMARY_STAT_LABELS[2], value: summary.uniqueEarners },
        { label: SUMMARY_STAT_LABELS[3], value: summary.avgRewardPerTokenUsd, prefix: '$' },
      ]
    : SUMMARY_STAT_LABELS.map((label) => ({ label, value: null as number | null }))

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <LeaderboardPanelShell
          icon={Crown}
          iconClassName="bg-muted text-muted-foreground"
          title="Top Earners"
          subtitle="No earners yet"
        >
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border rounded-xl bg-muted/20">
            <Inbox className="w-8 h-8 text-muted-foreground/60 mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground">No wallet has earned graduation rewards yet.</p>
          </div>
        </LeaderboardPanelShell>

        <div className="lg:col-span-2">
          <LeaderboardPanelShell
            icon={Medal}
            iconClassName="bg-muted text-muted-foreground"
            title="Graduated Tokens"
            subtitle="No graduated tokens yet"
          >
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <Trophy className="w-8 h-8 text-muted-foreground/60 mb-3" aria-hidden />
              <p className="text-sm font-medium text-foreground mb-1">The leaderboard is empty</p>
              <p className="text-sm text-muted-foreground max-w-md text-balance">
                When a national team token fills its bonding curve and graduates to HyperSwap V2,
                deployer and top-holder rewards will appear here automatically.
              </p>
            </div>
          </LeaderboardPanelShell>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto mb-8 text-balance">
        Track the{' '}
        <a href="#race" className="text-primary hover:underline">
          Live Graduation Race
        </a>{' '}
        above to see which teams are closest to graduating.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-4 text-center"
          >
            {stat.value === null ? (
              <p className="text-2xl md:text-3xl font-bold mb-1 text-muted-foreground tabular-nums">
                —
              </p>
            ) : (
              <AnimatedStat
                value={stat.value}
                prefix={'prefix' in stat ? stat.prefix : undefined}
                delay={0.2 + i * 0.1}
                className="text-2xl md:text-3xl font-bold mb-1 text-muted-foreground tabular-nums"
              />
            )}
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function rankBadgeClass(index: number, selected: boolean) {
  if (selected) return 'bg-primary text-primary-foreground'
  if (index === 0) return 'bg-primary text-primary-foreground'
  if (index === 1) return 'bg-zinc-400 text-zinc-900'
  if (index === 2) return 'bg-amber-700 text-amber-100'
  return 'bg-muted text-muted-foreground'
}

function resolveVisibleTokens(
  earner: WorldCupTopEarner,
  graduatedTokens: WorldCupGraduatedToken[],
): WorldCupGraduatedToken[] {
  const symbolSet = new Set(earner.graduatedTokenSymbols)
  return graduatedTokens.filter((t) => symbolSet.has(t.tokenSymbol))
}

export function WorldCupLeaderboard() {
  const { data, loading, error } = useWorldCupLeaderboard()
  const [selectedEarnerIndex, setSelectedEarnerIndex] = useState(0)

  const topEarners = data?.topEarners ?? []
  const graduatedTokens = data?.graduatedTokens ?? []
  const summary = data?.summary

  const selectedEarner = topEarners[selectedEarnerIndex]
  const visibleTokens = useMemo(
    () => (selectedEarner ? resolveVisibleTokens(selectedEarner, graduatedTokens) : []),
    [selectedEarner, graduatedTokens],
  )

  const summaryStats = summary
    ? [
        { label: 'Tokens Graduated', value: summary.tokensGraduated },
        { label: 'Total Rewards Paid', value: summary.totalRewardsPaidUsd, prefix: '$' },
        { label: 'Unique Earners', value: summary.uniqueEarners },
        { label: 'Avg. Reward/Token', value: summary.avgRewardPerTokenUsd, prefix: '$' },
      ]
    : []

  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Rewards Distributed</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            Graduation Leaderboard
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Tokens that have filled their bonding curve and graduated to HyperSwap V2. Deployers
            and holders have claimed their rewards.
          </p>
        </motion.div>

        {loading && <LeaderboardContentSkeleton />}

        {error && !loading && (
          <p className="text-center text-destructive text-sm py-8" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && topEarners.length === 0 && (
          <LeaderboardEmptyState summary={summary} />
        )}

        {!loading && !error && selectedEarner && (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-1 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Top Earners</h3>
                    <p className="text-xs text-muted-foreground">Click to view graduated tokens</p>
                  </div>
                </div>

                <div className="space-y-3" role="listbox" aria-label="Top earners">
                  {topEarners.map((earner, index) => {
                    const selected = selectedEarnerIndex === index
                    const displayAddress = formatAddressCompact(earner.address)
                    return (
                      <button
                        key={earner.address}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setSelectedEarnerIndex(index)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left cursor-pointer',
                          selected
                            ? 'bg-primary/10 border border-primary/40 ring-1 ring-primary/20'
                            : 'bg-muted/30 hover:bg-muted/50 border border-transparent',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              rankBadgeClass(index, selected),
                            )}
                          >
                            {earner.rank}
                          </div>
                          <div>
                            <p className="font-mono text-sm">{displayAddress}</p>
                            <p className="text-xs text-muted-foreground">
                              {earner.graduatedTokenCount} token
                              {earner.graduatedTokenCount > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-accent">
                            {formatUsd(earner.totalEarnedUsd)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Graduated Tokens</h3>
                    <p className="text-xs text-muted-foreground">
                      {visibleTokens.length === 1
                        ? `Rewards for ${formatAddressCompact(selectedEarner.address)}`
                        : `${visibleTokens.length} tokens linked to ${formatAddressCompact(selectedEarner.address)}`}
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedEarnerIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {visibleTokens.map((token) => (
                      <div
                        key={token.tokenSymbol}
                        className="bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'px-3 py-1.5 rounded-lg font-mono font-bold text-sm',
                                token.type === 'long'
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-destructive/20 text-destructive',
                              )}
                            >
                              {token.tokenSymbol}
                            </div>
                            <div>
                              <p className="font-medium">{token.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Graduated {token.graduatedAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Total Rewards</p>
                              <p className="font-bold text-primary">
                                {formatUsd(token.totalRewardsUsd)}
                              </p>
                            </div>
                            {token.explorerUrl ? (
                              <a
                                href={token.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                                aria-label={`View ${token.tokenSymbol}`}
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            ) : (
                              <span
                                className="p-2 rounded-lg bg-muted/50 opacity-50"
                                aria-hidden
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-background/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Wallet className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs font-medium text-primary">
                                Creator (33.33% of fees)
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm">
                                {formatAddressCompact(token.deployer.address)}
                              </span>
                              <span className="font-semibold text-accent">
                                {formatUsd(token.deployer.rewardUsd)}
                              </span>
                            </div>
                          </div>

                          <div className="bg-background/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className="w-3.5 h-3.5 text-accent" />
                              <span className="text-xs font-medium text-accent">
                                Top 10 Holders (100% protocol fees)
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {token.topHolders.map((holder) => (
                                <div
                                  key={holder.address}
                                  className={cn(
                                    'flex items-center justify-between text-sm rounded-md px-1 -mx-1',
                                    holder.address === selectedEarner.address && 'bg-primary/10',
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">
                                      #{holder.rank}
                                    </span>
                                    <span className="font-mono text-xs">
                                      {formatAddressCompact(holder.address)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({holder.holderPoolPercentage}%)
                                    </span>
                                  </div>
                                  <span className="font-medium text-accent text-xs">
                                    {formatUsd(holder.rewardUsd)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {summaryStats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-4 text-center"
                >
                  <AnimatedStat
                    value={stat.value}
                    prefix={stat.prefix}
                    delay={0.5 + i * 0.15}
                    className="text-2xl md:text-3xl font-bold mb-1 text-primary tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </section>
  )
}
