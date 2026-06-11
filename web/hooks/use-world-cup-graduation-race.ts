'use client'

import { useCallback, useEffect, useState } from 'react'
import { getWorldCupGraduationRace } from '@/lib/apis/world-cup/graduation-race.api'
import type {
  WorldCupGraduationRaceResponse,
  WorldCupRaceFilter,
} from '@/lib/world-cup-api-types'

export function useWorldCupGraduationRace(filter: WorldCupRaceFilter = 'all') {
  const [data, setData] = useState<WorldCupGraduationRaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (status: WorldCupRaceFilter) => {
    setLoading(true)
    setError(null)
    try {
      setData(await getWorldCupGraduationRace(status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graduation race')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  return { data, loading, error, refetch: () => load(filter) }
}
