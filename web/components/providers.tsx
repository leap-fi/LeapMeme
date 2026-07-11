'use client'

import { ProtocolProvider } from '@/contexts/protocol-context'
import { MarketsProvider } from '@/contexts/markets-context'
import { WalletSessionProvider } from '@/contexts/wallet-session-context'
import { WalletSessionGuard } from '@/components/wallet-session-guard'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/i18n/context'
import { getPrivyAppId, isPrivyEnabled } from '@/lib/privy-enabled'
import dynamic from 'next/dynamic'

const PrivyProviderInner = dynamic(
  () =>
    import('@/components/privy-provider-inner').then((m) => m.PrivyProviderInner),
  { ssr: false },
)

const FluidBackground = dynamic(
  () => import('@/components/fluid-background').then((m) => m.FluidBackground),
  { ssr: false },
)

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProtocolProvider>
      <MarketsProvider>{children}</MarketsProvider>
    </ProtocolProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = getPrivyAppId()
  const content =
    !isPrivyEnabled() || !appId ? (
      <AppProviders>{children}</AppProviders>
    ) : (
      <PrivyProviderInner appId={appId}>
        <WalletSessionProvider>
          <WalletSessionGuard />
          <AppProviders>{children}</AppProviders>
        </WalletSessionProvider>
      </PrivyProviderInner>
    )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <LanguageProvider>
        <FluidBackground />
        <div className="relative z-10">{content}</div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
