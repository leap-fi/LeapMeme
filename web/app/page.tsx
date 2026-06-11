'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { MarketSidebar } from '@/components/market-sidebar'
import { HomeHeroBanners } from '@/components/home-hero-banners'
import { FilterBar, DEFAULT_HOME_FILTERS } from '@/components/filter-bar'
import { defaultSortForTab } from '@/lib/home-list-sort'
import { HomeFilteredEmpty } from '@/components/home-filtered-empty'
import { TokenList } from '@/components/token-list'
import { RightSidebar } from '@/components/right-sidebar'
import { Footer } from '@/components/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { useHomeTokenList } from '@/hooks/use-home-token-list'
import { Plus } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'graduated'>('trending')
  const [filters, setFilters] = useState(DEFAULT_HOME_FILTERS)
  const {
    tokens: apiTokens,
    loading,
    isLoadingMore,
    error,
    refetch,
    hasNextPage,
    loadMore,
  } = useHomeTokenList(
    activeTab,
    filters,
  )

  // All tabs filter/sort on backend (trending + new type=1 + graduated type=3).
  const filteredTokens = apiTokens

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (loading || isLoadingMore || !hasNextPage || !!error) {
        return
      }
      const target = e.currentTarget
      const distanceToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceToBottom <= 120) {
        loadMore()
      }
    },
    [loading, isLoadingMore, hasNextPage, error, loadMore],
  )

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />

      <PriceTicker />

      <div className="flex-1 flex min-h-0">
        <div className="hidden lg:block w-56 border-r border-border overflow-y-auto">
          <MarketSidebar
            selectedMarket={filters.market === 'All' ? undefined : filters.market}
            onMarketSelect={(symbol) =>
              setFilters((prev) => ({ ...prev, market: symbol }))
            }
          />
        </div>

        <main className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 lg:px-6 lg:pt-6">
            <HomeHeroBanners />
          </div>

          <div className="pt-2 p-0 lg:px-6 lg:pt-2">
            <FilterBar
              activeTab={activeTab}
              filters={filters}
              onTabChange={(tab) => {
                setActiveTab(tab)
                setFilters((prev) => ({
                  ...prev,
                  sort: defaultSortForTab(tab),
                }))
              }}
              onFilterChange={setFilters}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-0 lg:px-6 lg:py-4" onScroll={handleListScroll}>
            {loading ? (
              <div className="space-y-1">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr] gap-4 px-4 py-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-14 justify-self-end" />
                </div>

                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="border-b border-border/50 px-4 py-3.5 md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr] md:gap-4 md:p-3"
                  >
                    <div className="flex gap-3 md:items-center md:gap-3">
                      <Skeleton className="size-11 shrink-0 rounded-xl md:size-10 md:rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-2 md:space-y-2">
                        <div className="flex items-start justify-between gap-2 md:block">
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-20" />
                            <Skeleton className="h-3 w-28 md:block" />
                          </div>
                          <Skeleton className="h-3.5 w-12 shrink-0 md:hidden" />
                        </div>
                        <div className="flex items-center justify-between gap-2 md:hidden">
                          <Skeleton className="h-6 w-32 rounded-md" />
                          <Skeleton className="h-3.5 w-14" />
                        </div>
                        <Skeleton className="h-1.5 w-full rounded-full md:hidden" />
                      </div>
                    </div>
                    <div className="hidden md:flex md:items-center md:gap-2">
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <div className="hidden md:flex md:items-center">
                      <Skeleton className="h-3.5 w-12" />
                    </div>
                    <div className="hidden md:flex md:items-center">
                      <Skeleton className="h-1.5 w-24 rounded-full" />
                    </div>
                    <div className="hidden md:flex md:items-center md:justify-end">
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredTokens.length > 0 ? (
              <>
                <TokenList tokens={filteredTokens} />
                {isLoadingMore && (
                  <div className="space-y-1 pt-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`load-more-${index}`}
                        className="border-b border-border/50 px-4 py-3.5 md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr] md:gap-4 md:p-3"
                      >
                        <div className="flex gap-3 md:items-center md:gap-3">
                          <Skeleton className="size-11 shrink-0 rounded-xl md:size-10 md:rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2 md:space-y-2">
                            <div className="flex items-start justify-between gap-2 md:block">
                              <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-20" />
                                <Skeleton className="h-3 w-28 md:block" />
                              </div>
                              <Skeleton className="h-3.5 w-12 shrink-0 md:hidden" />
                            </div>
                            <div className="flex items-center justify-between gap-2 md:hidden">
                              <Skeleton className="h-6 w-32 rounded-md" />
                              <Skeleton className="h-3.5 w-14" />
                            </div>
                            <Skeleton className="h-1.5 w-full rounded-full md:hidden" />
                          </div>
                        </div>
                        <div className="hidden md:flex md:items-center md:gap-2">
                          <Skeleton className="size-6 rounded-full" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                        <div className="hidden md:flex md:items-center">
                          <Skeleton className="h-3.5 w-12" />
                        </div>
                        <div className="hidden md:flex md:items-center">
                          <Skeleton className="h-1.5 w-24 rounded-full" />
                        </div>
                        <div className="hidden md:flex md:items-center md:justify-end">
                          <Skeleton className="h-3.5 w-14" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <HomeFilteredEmpty onClearFilters={() => setFilters(DEFAULT_HOME_FILTERS)} />
            )}
          </div>
        </main>

        <div className="hidden xl:block w-72 border-l border-border overflow-y-auto">
          <RightSidebar />
        </div>
      </div>

      <Footer />

      <Link
        href="/create"
        aria-label="Create token"
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity lg:hidden z-50"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </Link>
    </div>
  )
}
