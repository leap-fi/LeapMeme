'use client'

import { createContext, useContext } from 'react'
import {
  usePrivyWalletSession,
  type WalletSessionState,
} from '@/hooks/use-privy-wallet-session'

const WalletSessionContext = createContext<WalletSessionState | null>(null)

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const session = usePrivyWalletSession()
  return (
    <WalletSessionContext.Provider value={session}>{children}</WalletSessionContext.Provider>
  )
}

export function useWalletSession(): WalletSessionState {
  const context = useContext(WalletSessionContext)
  if (!context) {
    throw new Error('useWalletSession must be used within WalletSessionProvider')
  }
  return context
}

export function useWalletSessionOptional(): WalletSessionState | null {
  return useContext(WalletSessionContext)
}
