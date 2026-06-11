'use client'

import { useCallback, useEffect, useState } from 'react'
import { AccountApiError } from '@/lib/account/api'
import { fetchAccountMarkets } from '@/lib/account/markets'
import type { AccountMarket } from '@/lib/account/types'

export type UseAccountMarketsState = {
  markets: AccountMarket[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAccountMarkets(): UseAccountMarketsState {
  const [markets, setMarkets] = useState<AccountMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAccountMarkets()
      .then((data) => {
        if (cancelled) return
        setMarkets(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof AccountApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load markets'
        setError(message)
        setMarkets([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { markets, loading, error, refetch }
}
