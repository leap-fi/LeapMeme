import { normalizeBondingCurveProgress, toNumber } from '@/lib/apis/meme-server/format'
import type { TokenNewDto } from '@/lib/apis/meme-server/types'

function hasPositiveTimestamp(value: number | string | null | undefined): boolean {
  return toNumber(value) > 0
}

export function isGraduatedToken(dto: TokenNewDto): boolean {
  const status = String(dto.status ?? '').toUpperCase()
  if (status === 'COMPLETED' || status === 'GRADUATED' || status === 'MIGRATED') {
    return true
  }

  if (hasPositiveTimestamp(dto.graduatedTime)) return true
  if (hasPositiveTimestamp(dto.graduatingTime)) return true
  if (hasPositiveTimestamp(dto.completeTime)) return true
  if (hasPositiveTimestamp(dto.migrateTime)) return true

  return normalizeBondingCurveProgress(dto.bondingCurveProgress) >= 100
}
