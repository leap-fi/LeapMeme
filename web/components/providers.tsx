'use client'

import { MarketsProvider } from '@/contexts/markets-context'
import { WalletSessionProvider } from '@/contexts/wallet-session-context'
import { WalletSessionGuard } from '@/components/wallet-session-guard'
import { getPrivyAppId, isPrivyEnabled } from '@/lib/privy-enabled'
import dynamic from 'next/dynamic'

const PrivyProviderInner = dynamic(
  () =>
    import('@/components/privy-provider-inner').then((m) => m.PrivyProviderInner),
  { ssr: false },
)

function AppProviders({ children }: { children: React.ReactNode }) {
  return <MarketsProvider>{children}</MarketsProvider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = getPrivyAppId()
  if (!isPrivyEnabled() || !appId) {
    return <AppProviders>{children}</AppProviders>
  }

  return (
    <PrivyProviderInner appId={appId}>
      <WalletSessionProvider>
        <WalletSessionGuard />
        <AppProviders>{children}</AppProviders>
      </WalletSessionProvider>
    </PrivyProviderInner>
  )
}
