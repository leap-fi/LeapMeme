'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SearchModal } from './search-modal'
import { WalletActions } from './wallet-actions'

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 flex flex-nowrap items-center gap-3 border-b border-border bg-background px-4 py-3 md:grid md:grid-cols-[1fr_400px_1fr] md:gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 cursor-pointer items-center gap-2 md:justify-self-start">
          <Logo width={40} height={40} className="h-10 w-10" priority />
        </Link>

        {/* Search Bar - Clickable trigger */}
        <div className="min-w-0 flex-1 md:w-[400px] md:flex-none md:justify-self-center">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative flex h-9 w-full items-center"
          >
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <div className="flex h-full w-full items-center truncate rounded-lg bg-secondary pl-10 pr-4 text-left text-sm whitespace-nowrap text-muted-foreground">
              Search for tokens...
            </div>
          </button>
        </div>

        {/* Right Actions */}
        <div className="shrink-0 md:justify-self-end">
          <WalletActions />
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  )
}
