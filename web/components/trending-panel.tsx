'use client'

import { TrendingUp, Clock, Award } from 'lucide-react'
import type { Token } from '@/lib/mock-data'

interface TrendingPanelProps {
  tokens: Token[]
}

export function TrendingPanel({ tokens }: TrendingPanelProps) {
  // Get top gainers
  const topGainers = [...tokens]
    .filter(t => t.graduated)
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 5)

  // Get newest (non-graduated with lowest progress)
  const newest = [...tokens]
    .filter(t => !t.graduated)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5)

  // Get highest market cap
  const topMcap = [...tokens]
    .sort((a, b) => {
      const aVal = parseFloat(a.marketCap.replace(/[$KM]/g, '')) * (a.marketCap.includes('M') ? 1000 : 1)
      const bVal = parseFloat(b.marketCap.replace(/[$KM]/g, '')) * (b.marketCap.includes('M') ? 1000 : 1)
      return bVal - aVal
    })
    .slice(0, 5)

  return (
    <aside className="w-72 bg-sidebar border-l border-sidebar-border p-4 overflow-y-auto hidden xl:block">
      {/* Top Gainers */}
      <Section
        icon={<TrendingUp className="w-4 h-4 text-primary" />}
        title="TOP GAINERS"
        tokens={topGainers}
        showChange
      />

      {/* Newest */}
      <Section
        icon={<Clock className="w-4 h-4 text-primary" />}
        title="NEWEST LAUNCHES"
        tokens={newest}
        showProgress
      />

      {/* Top Market Cap */}
      <Section
        icon={<Award className="w-4 h-4 text-primary" />}
        title="TOP MARKET CAP"
        tokens={topMcap}
        showMcap
      />
    </aside>
  )
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  tokens: Token[]
  showChange?: boolean
  showProgress?: boolean
  showMcap?: boolean
}

function Section({ icon, title, tokens, showChange, showProgress, showMcap }: SectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                {token.image}
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">{token.symbol}</span>
                <p className="text-xs text-muted-foreground">{token.underlying}</p>
              </div>
            </div>
            <div className="text-right">
              {showChange && (
                <span
                  className={`text-xs font-semibold ${
                    token.change24h >= 0 ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {token.change24h >= 0 ? '+' : ''}
                  {token.change24h.toFixed(1)}%
                </span>
              )}
              {showProgress && (
                <div className="w-16">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${token.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {token.progress}%
                  </p>
                </div>
              )}
              {showMcap && (
                <span className="text-xs font-semibold text-foreground">
                  {token.marketCap}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
