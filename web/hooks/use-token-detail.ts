'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getTokenDetail, type TokenDetailDto } from '@/lib/apis/meme-server/token-detail.api'

export const TOKEN_DETAIL_POLL_MS = 10_000

export function useTokenDetail(address: string, pollMs = TOKEN_DETAIL_POLL_MS) {
  const [detail, setDetail] = useState<TokenDetailDto | null>(null)
  const loadedRef = useRef(false)

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    const fetchAddress = address.trim()
    if (!fetchAddress) {
      loadedRef.current = false
      setDetail(null)
      return
    }
    try {
      const data = await getTokenDetail(fetchAddress)
      setDetail(data)
      loadedRef.current = true
    } catch {
      if (!silent || !loadedRef.current) {
        setDetail(null)
        loadedRef.current = false
      }
    }
  }, [address])

  useEffect(() => {
    loadedRef.current = false
    void refetch()
    if (pollMs <= 0) return undefined
    const timer = window.setInterval(() => {
      void refetch({ silent: true })
    }, pollMs)
    return () => window.clearInterval(timer)
  }, [refetch, pollMs])

  return { detail, refetch }
}
