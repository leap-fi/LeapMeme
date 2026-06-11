'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import { usePrivyWalletLogin } from '@/hooks/use-privy-wallet-login'
import { isPrivyEnabled } from '@/lib/privy-enabled'

function WalletActionsInner() {
  const session = useWalletSessionOptional()
  const loginWithWallet = usePrivyWalletLogin()

  const ready = session?.ready ?? false
  const authenticated = session?.authenticated ?? false
  const needsReconnect = session?.needsReconnect ?? false

  if (!ready) {
    return (
      <div
        className="h-9 w-[5.5rem] shrink-0 rounded-lg bg-secondary animate-pulse sm:w-36"
        aria-hidden
      />
    )
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={loginWithWallet}
        className="h-9 shrink-0 whitespace-nowrap px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        CONNECT WALLET
      </button>
    )
  }

  if (needsReconnect) {
    return (
      <button
        type="button"
        onClick={loginWithWallet}
        className="h-9 shrink-0 whitespace-nowrap px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        RECONNECT
      </button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link
        href="/profile"
        className="flex h-9 items-center whitespace-nowrap px-4 text-sm font-semibold rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
      >
        PROFILE
      </Link>
      <Link
        href="/create"
        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-4 h-4" />
        CREATE ON LEAP
      </Link>
    </div>
  )
}

export function WalletActions() {
  if (!isPrivyEnabled()) {
    return (
      <button
        type="button"
        disabled
        title="Please set NEXT_PUBLIC_PRIVY_APP_ID in .env.local"
        className="h-9 shrink-0 whitespace-nowrap px-4 text-sm font-semibold rounded-lg bg-primary/50 text-primary-foreground cursor-not-allowed"
      >
        CONNECT WALLET
      </button>
    )
  }

  return <WalletActionsInner />
}
