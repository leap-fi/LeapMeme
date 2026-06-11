'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  underlyingAssets,
  leverageOptions,
  directionOptions,
} from '@/lib/mock-data'
import { sortOptionsForTab } from '@/lib/home-list-sort'

export type HomeFilters = {
  sort: string
  market: string
  leverage: string
  direction: string
}

export const DEFAULT_HOME_FILTERS: HomeFilters = {
  sort: '24H Volume',
  market: 'All',
  leverage: 'All',
  direction: 'All',
}

interface FilterBarProps {
  activeTab: 'trending' | 'new' | 'graduated'
  filters: HomeFilters
  onTabChange: (tab: 'trending' | 'new' | 'graduated') => void
  onFilterChange: (filters: HomeFilters) => void
}

export function FilterBar({
  activeTab,
  filters,
  onTabChange,
  onFilterChange,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const showSort = activeTab === 'trending' || activeTab === 'graduated'
  const sortDropdownOptions = [...sortOptionsForTab(activeTab)]

  const handleFilterChange = (
    key: 'sort' | 'market' | 'leverage' | 'direction',
    value: string
  ) => {
    onFilterChange({ ...filters, [key]: value })
    setOpenDropdown(null)
  }

  const Dropdown = ({
    label,
    value,
    options,
    filterKey,
    scrollable = false,
  }: {
    label: string
    value: string
    options: string[]
    filterKey: 'sort' | 'market' | 'leverage' | 'direction'
    scrollable?: boolean
  }) => {
    const isOpen = openDropdown === filterKey

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : filterKey)}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-xs hover:bg-secondary/80 transition-colors"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground font-medium">{value}</span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[120px] overflow-hidden">
            <div className={scrollable ? 'max-h-60 overflow-y-auto' : undefined}>
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFilterChange(filterKey, option)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors ${
                    !scrollable ? 'first:rounded-t-lg last:rounded-b-lg' : ''
                  } ${value === option ? 'text-primary' : 'text-foreground'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0 lg:space-y-4">
      {/* Tabs */}
      <div className="mx-4 flex items-center gap-1 rounded-lg bg-secondary p-1 lg:mx-0 lg:gap-6 lg:rounded-none lg:bg-transparent lg:p-0 lg:pb-3 lg:border-b lg:border-border">
        {(['trending', 'new', 'graduated'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors lg:flex-none lg:rounded-none lg:px-1 lg:py-2 lg:text-sm ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm lg:bg-transparent lg:shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.toUpperCase()}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 hidden h-0.5 bg-primary lg:block lg:-mb-3" />
            )}
          </button>
        ))}
      </div>

      {/* Filters — desktop only */}
      <div className="hidden lg:flex flex-wrap gap-2">
        {showSort ? (
          <Dropdown label="SORT" value={filters.sort} options={sortDropdownOptions} filterKey="sort" />
        ) : null}
        <Dropdown label="MARKET" value={filters.market} options={underlyingAssets} filterKey="market" scrollable />
        <Dropdown label="LEVERAGE" value={filters.leverage} options={leverageOptions} filterKey="leverage" />
        <Dropdown label="DIRECTION" value={filters.direction} options={directionOptions} filterKey="direction" />
      </div>
    </div>
  )
}
