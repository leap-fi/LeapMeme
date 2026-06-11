import {
  getEmbeddedConnectedWallet,
  type ConnectedWallet,
} from '@privy-io/react-auth'

type ActiveWalletLike =
  | ConnectedWallet
  | { address?: string; type?: string }
  | null
  | undefined

export function selectPrivyEthereumWallet(
  activeWallet: ActiveWalletLike,
  wallets: ConnectedWallet[],
): ConnectedWallet | null {
  if (
    activeWallet &&
    'address' in activeWallet &&
    activeWallet.address &&
    (!('type' in activeWallet) || activeWallet.type === 'ethereum')
  ) {
    const matched = wallets.find(
      (wallet) => wallet.address?.toLowerCase() === activeWallet.address?.toLowerCase(),
    )
    if (matched) return matched
  }
  const embedded = getEmbeddedConnectedWallet(wallets)
  return embedded ?? wallets[0] ?? null
}

export function getPrivyWalletAddress(wallet: ConnectedWallet | null): `0x${string}` | null {
  if (!wallet || !('address' in wallet) || !wallet.address) return null
  return wallet.address as `0x${string}`
}
