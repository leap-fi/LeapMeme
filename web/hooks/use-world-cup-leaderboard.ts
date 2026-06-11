'use client'

import { useCallback, useEffect, useState } from 'react'
import { getWorldCupLeaderboard } from '@/lib/apis/world-cup/leaderboard.api'
import type { WorldCupLeaderboardResponse } from '@/lib/world-cup-api-types'

export function useWorldCupLeaderboard() {
  const [data, setData] = useState<WorldCupLeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getWorldCupLeaderboard())
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, refetch: load }
}
