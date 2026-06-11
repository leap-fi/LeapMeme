'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLogin, usePrivy } from '@privy-io/react-auth'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import { privyWalletConnectOptions } from '@/lib/privy-config'

/**
 * Opens Privy login for new users, or reconnects the wallet provider when the
 * Privy session is still active but the extension was locked/disconnected.
 */
export function usePrivyWalletLogin() {
  const session = useWalletSessionOptional()
  const [mounted, setMounted] = useState(false)
  const { ready, authenticated, connectWallet } = usePrivy()
  const { login } = useLogin()

  useEffect(() => setMounted(true), [])

  const fallbackConnect = useCallback(() => {
    if (!mounted || !ready) return
    if (!authenticated) {
      login({
        loginMethods: ['wallet'],
        ...privyWalletConnectOptions,
      })
      return
    }
    connectWallet(privyWalletConnectOptions)
  }, [mounted, ready, authenticated, login, connectWallet])

  return session?.connectOrReconnect ?? fallbackConnect
}
