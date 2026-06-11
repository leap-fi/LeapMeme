type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export type PrivyWalletLike = {
  address?: string
  getEthereumProvider?: () => Promise<Eip1193Provider>
}

export async function isWalletProviderConnected(
  wallet: PrivyWalletLike | null | undefined,
): Promise<boolean> {
  if (!wallet?.address || typeof wallet.getEthereumProvider !== 'function') {
    return false
  }

  try {
    const provider = await wallet.getEthereumProvider()
    const accounts = (await provider.request({ method: 'eth_accounts' })) as unknown
    if (!Array.isArray(accounts) || accounts.length === 0) return false

    const expected = wallet.address.toLowerCase()
    return accounts.some(
      (account) => typeof account === 'string' && account.toLowerCase() === expected,
    )
  } catch {
    return false
  }
}
