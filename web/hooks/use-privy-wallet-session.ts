'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useActiveWallet,
  useLogin,
  usePrivy,
  useWallets,
  type ConnectedWallet,
} from '@privy-io/react-auth'
import { privyWalletConnectOptions } from '@/lib/privy-config'
import { isWalletProviderConnected } from '@/lib/wallet/provider-health'
import {
  getPrivyWalletAddress,
  selectPrivyEthereumWallet,
} from '@/lib/wallet/select-privy-wallet'

const PROVIDER_CHECK_INTERVAL_MS = 20_000

export type WalletSessionState = {
  ready: boolean
  authenticated: boolean
  walletsReady: boolean
  wallet: ConnectedWallet | null
  walletAddress: `0x${string}` | null
  /** null = not checked yet */
  providerConnected: boolean | null
  /** Privy session exists and provider responds with the linked account */
  isSessionActive: boolean
  /** Privy logged in but extension/provider is locked or disconnected */
  needsReconnect: boolean
  checkingProvider: boolean
  checkProviderConnection: () => Promise<boolean>
  connectOrReconnect: () => void
}

export function usePrivyWalletSession(): WalletSessionState {
  const { ready, authenticated, connectWallet } = usePrivy()
  const { login } = useLogin()
  const { wallets, ready: walletsReady } = useWallets()
  const { wallet: activeWallet } = useActiveWallet()

  const wallet = useMemo(
    () => selectPrivyEthereumWallet(activeWallet, wallets),
    [activeWallet, wallets],
  )
  const walletAddress = useMemo(() => getPrivyWalletAddress(wallet), [wallet])

  const [providerConnected, setProviderConnected] = useState<boolean | null>(null)
  const [checkingProvider, setCheckingProvider] = useState(false)
  const checkingRef = useRef(false)

  const checkProviderConnection = useCallback(async () => {
    if (!authenticated || !walletsReady) {
      setProviderConnected(null)
      return false
    }

    if (!wallet) {
      setProviderConnected(false)
      return false
    }

    if (checkingRef.current) return false

    checkingRef.current = true
    setCheckingProvider(true)
    try {
      const connected = await isWalletProviderConnected(wallet)
      setProviderConnected(connected)
      return connected
    } finally {
      checkingRef.current = false
      setCheckingProvider(false)
    }
  }, [authenticated, walletsReady, wallet])

  useEffect(() => {
    if (!authenticated || !walletsReady) {
      setProviderConnected(null)
      return
    }

    void checkProviderConnection()
  }, [authenticated, walletsReady, wallet, checkProviderConnection])

  useEffect(() => {
    if (!authenticated || !wallet) return

    let disposed = false
    let cleanup: (() => void) | undefined

    void (async () => {
      try {
        if (typeof wallet.getEthereumProvider !== 'function') return
        const provider = await wallet.getEthereumProvider()
        if (disposed || !provider) return

        const handleChange = () => {
          void checkProviderConnection()
        }

        provider.on?.('accountsChanged', handleChange)
        provider.on?.('disconnect', handleChange)
        provider.on?.('connect', handleChange)

        cleanup = () => {
          provider.removeListener?.('accountsChanged', handleChange)
          provider.removeListener?.('disconnect', handleChange)
          provider.removeListener?.('connect', handleChange)
        }
      } catch {
        if (!disposed) setProviderConnected(false)
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [authenticated, wallet, checkProviderConnection])

  useEffect(() => {
    if (!authenticated) return

    const onFocus = () => {
      void checkProviderConnection()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkProviderConnection()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => {
      void checkProviderConnection()
    }, PROVIDER_CHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [authenticated, checkProviderConnection])

  const connectOrReconnect = useCallback(() => {
    if (!ready) return

    if (!authenticated) {
      login({
        loginMethods: ['wallet'],
        ...privyWalletConnectOptions,
      })
      return
    }

    connectWallet(privyWalletConnectOptions)
  }, [ready, authenticated, login, connectWallet])

  const isSessionActive =
    authenticated && walletsReady && providerConnected === true
  const needsReconnect =
    authenticated && walletsReady && providerConnected === false

  return {
    ready,
    authenticated,
    walletsReady,
    wallet,
    walletAddress,
    providerConnected,
    isSessionActive,
    needsReconnect,
    checkingProvider,
    checkProviderConnection,
    connectOrReconnect,
  }
}
