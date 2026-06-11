'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getHomeTokenListWithFilters,
  type HomeListFilters,
  type HomeListTab,
} from '@/lib/apis/meme-server/new-tokens.api'
import type { Token } from '@/lib/mock-data'

const PAGE_SIZE = 30

export function useHomeTokenList(
  activeTab: HomeListTab,
  filters?: HomeListFilters,
) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [page, setPage] = useState(1)

  const loadPage = useCallback(async (
    tab: HomeListTab,
    currentFilters: HomeListFilters | undefined,
    pageNum: number,
    append: boolean,
  ) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const list = await getHomeTokenListWithFilters(tab, currentFilters, {
        pageNum,
        pageSize: PAGE_SIZE,
      })
      setTokens((prev) => (append ? [...prev, ...list] : list))
      setPage(pageNum)
      setHasNextPage(list.length >= PAGE_SIZE)
    } catch (err) {
      if (!append) {
        setTokens([])
        setHasNextPage(false)
      }
      setError(err instanceof Error ? err.message : 'Failed to load tokens')
    } finally {
      if (append) {
        setIsLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadPage(activeTab, filters, 1, false)
  }, [activeTab, filters, loadPage])

  const refetch = useCallback(() => {
    void loadPage(activeTab, filters, page, false)
  }, [activeTab, filters, page, loadPage])

  const loadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasNextPage) return
    void loadPage(activeTab, filters, page + 1, true)
  }, [loading, isLoadingMore, hasNextPage, loadPage, activeTab, filters, page])

  return { tokens, loading, isLoadingMore, error, refetch, hasNextPage, loadMore }
}
