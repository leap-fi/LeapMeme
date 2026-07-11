'use client'

import {
  formatUsdCompact,
  normalizeBondingCurveProgress,
  resolveBondingCurveVolumeUsd,
} from '@/lib/apis/meme-server/format'
import { useProtocolConfig } from '@/contexts/protocol-context'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'

type BondingCurveVolumeBarProps = {
  progress: number
  volumeUsd?: number | string | null
  className?: string
}

/** CURVE volume progress — only for tokens still on the bonding curve. */
export function BondingCurveVolumeBar({
  progress,
  volumeUsd,
  className,
}: BondingCurveVolumeBarProps) {
  const { t } = useI18n()
  const { config } = useProtocolConfig()
  const targetUsd = config.graduationTargetUsdc
  const currentUsd = resolveBondingCurveVolumeUsd({
    progress,
    graduated: false,
    volumeUsd,
    graduationTargetUsd: targetUsd,
  })
  const fillPct = normalizeBondingCurveProgress(progress)

  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('coin.curve.label')}
      </span>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
          {formatUsdCompact(currentUsd)}
        </span>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
          {formatUsdCompact(targetUsd)}
        </span>
      </div>
    </div>
  )
}

type BondingCurveProgressSectionProps = {
  progress: number
  graduated: boolean
  volumeUsd?: number | string | null
  variant?: 'embedded' | 'full'
  className?: string
}

/** One progress bar: CURVE volume (trading) or % bar (graduated). */
export function BondingCurveProgressSection({
  progress,
  graduated,
  volumeUsd,
  variant = 'embedded',
  className,
}: BondingCurveProgressSectionProps) {
  const { t } = useI18n()
  if (!graduated) {
    return (
      <BondingCurveVolumeBar
        className={className}
        progress={progress}
        volumeUsd={volumeUsd}
      />
    )
  }

  if (variant === 'embedded') {
    return (
      <div className={className}>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{t('coin.curve.bonding')}</span>
          <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[rgb(240,180,41)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-primary">{t('coin.curve.graduatedShort')}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{t('coin.curve.progress')}</span>
        <span className="font-semibold text-foreground">{progress.toFixed(2)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[rgb(240,180,41)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-primary">{t('coin.curve.graduatedLong')}</p>
    </div>
  )
}
