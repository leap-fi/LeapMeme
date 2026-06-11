'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { PRIVY_WALLET_LIST } from '@/lib/privy-config'
import { hyperEvm } from '@/lib/contracts/chain'

export function PrivyProviderInner({
  appId,
  children,
}: {
  appId: string
  children: React.ReactNode
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet'],
        embeddedWallets: {
          ethereum: {
            // External wallets only — avoid embedded-wallet flow closing the login modal
            createOnLogin: 'off',
          },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
          showWalletLoginFirst: true,
          walletChainType: 'ethereum-only',
          walletList: PRIVY_WALLET_LIST,
        },
        defaultChain: hyperEvm,
        supportedChains: [hyperEvm],
      }}
    >
      {children}
    </PrivyProvider>
  )
}
