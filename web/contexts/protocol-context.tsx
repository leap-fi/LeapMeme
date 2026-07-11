'use client'

import { createContext, useContext } from 'react'
import { useProtocolConfigLoader } from '@/hooks/use-protocol-config'
import type { ProtocolProfile } from '@/lib/protocol/types'

type ProtocolContextValue = {
  config: ProtocolProfile
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const ProtocolContext = createContext<ProtocolContextValue | null>(null)

export function ProtocolProvider({ children }: { children: React.ReactNode }) {
  const value = useProtocolConfigLoader()
  return <ProtocolContext.Provider value={value}>{children}</ProtocolContext.Provider>
}

export function useProtocolConfig(): ProtocolContextValue {
  const ctx = useContext(ProtocolContext)
  if (!ctx) {
    throw new Error('useProtocolConfig must be used within ProtocolProvider')
  }
  return ctx
}

export function useProtocolConfigOptional(): ProtocolContextValue | null {
  return useContext(ProtocolContext)
}
