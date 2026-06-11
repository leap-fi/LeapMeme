import { encodeFunctionData, type Address, type Hash } from 'viem'
import { erc20Abi } from '@/lib/contracts/abis'
import { hyperEvm } from '@/lib/contracts/chain'

/** Max ERC-20 allowance — one-time approve, then future trades need only one confirmation. */
export const MAX_ALLOWANCE = (1n << 256n) - 1n

type WalletCall = { to: Address; data: `0x${string}` }

type SendCallsResponse = { id: string }

type CallsStatusResponse = {
  status: number
  receipts?: { transactionHash: Hash }[]
}

type EIP1193Provider = {
  request: (args: { method: string; params?: any[] }) => Promise<unknown>
}

/**
 * EIP-5792 atomic batch: approve + trade in a single wallet confirmation
 * (Rabby, MetaMask Smart Accounts, etc.).
 */
export async function sendWalletBatch(
  provider: EIP1193Provider,
  from: Address,
  calls: WalletCall[],
): Promise<Hash> {
  const result = (await provider.request({
    method: 'wallet_sendCalls',
    params: [
      {
        version: '1.0',
        chainId: `0x${hyperEvm.id.toString(16)}`,
        from,
        atomicRequired: true,
        calls: calls.map((c) => ({
          to: c.to,
          data: c.data,
          value: '0x0',
        })),
      },
    ],
  })) as SendCallsResponse

  return waitForBatchTxHash(provider, result.id)
}

async function waitForBatchTxHash(
  provider: EIP1193Provider,
  batchId: string,
): Promise<Hash> {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    const status = (await provider.request({
      method: 'wallet_getCallsStatus',
      params: [batchId],
    })) as CallsStatusResponse

    if (status.status === 200) {
      const receipts = status.receipts ?? []
      const last = receipts[receipts.length - 1]?.transactionHash
      if (last) return last
    }
    if (status.status >= 400) {
      throw new Error('Batch transaction failed')
    }
    await new Promise((r) => setTimeout(r, 1500))
  }

  throw new Error('Transaction confirmation timed out')
}

export function encodeApproveCall(
  token: Address,
  spender: Address,
  amount: bigint = MAX_ALLOWANCE,
): WalletCall {
  return {
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    }),
  }
}
