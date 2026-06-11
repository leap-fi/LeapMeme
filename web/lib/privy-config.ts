import type { WalletListEntry } from '@privy-io/react-auth'

export const PRIVY_WALLET_LIST: WalletListEntry[] = [
  'metamask',
  'coinbase_wallet',
  'rabby_wallet',
  'rainbow',
  'okx_wallet',
  'zerion',
]

export const privyWalletConnectOptions = {
  walletList: PRIVY_WALLET_LIST,
  walletChainType: 'ethereum-only' as const,
}
