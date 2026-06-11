'use client'

import { useCallback, useState } from 'react'
import {
  createWalletClient,
  custom,
  parseEventLogs,
  type Hash,
} from 'viem'
import { bondingAbi } from '@/lib/contracts/abis'
import { isValidHexAddress, resolveBondingAddress, toHexAddress } from '@/lib/contracts/address'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'

export type TransferCreatorTxState =
  | { status: 'idle' }
  | { status: 'transferring' }
  | { status: 'success'; hash: Hash }
  | { status: 'error'; message: string }

async function waitForSuccessfulReceipt(hash: Hash, failMessage: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(failMessage)
  }
  return receipt
}

function normalizeTransferError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Transfer failed.'
  const message = raw.toLowerCase()
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('denied transaction')
  ) {
    return 'You cancelled the wallet request. Please try again.'
  }
  if (message.includes('notcreator')) {
    return 'Only the current token creator can transfer this role.'
  }
  if (
    message.includes('network') ||
    message.includes('chain') ||
    message.includes('switchethereumchain')
  ) {
    return 'Network switch failed. Please switch to HyperEVM and try again.'
  }
  return raw
}

export function useTransferCreator(wallet: {
  address?: `0x${string}`
  getEthereumProvider?: () => Promise<unknown>
  type?: string
} | null) {
  const [txState, setTxState] = useState<TransferCreatorTxState>({ status: 'idle' })

  const walletAddress = wallet?.address

  const getWalletClient = useCallback(async () => {
    if (!wallet || wallet.type !== 'ethereum' || !walletAddress || !wallet.getEthereumProvider) {
      throw new Error('Please connect an Ethereum wallet.')
    }
    const provider = await wallet.getEthereumProvider()
    try {
      await (provider as { request: (args: unknown) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${hyperEvm.id.toString(16)}` }],
      })
    } catch (switchError) {
      const code =
        typeof switchError === 'object' && switchError && 'code' in switchError
          ? (switchError as { code?: number }).code
          : undefined
      const msg = switchError instanceof Error ? switchError.message.toLowerCase() : ''
      if (code !== 4902 && !msg.includes('unrecognized chain') && !msg.includes('unknown chain')) {
        throw switchError
      }
      await (provider as { request: (args: unknown) => Promise<unknown> }).request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${hyperEvm.id.toString(16)}`,
            chainName: hyperEvm.name,
            nativeCurrency: hyperEvm.nativeCurrency,
            rpcUrls: [hyperEvm.rpcUrls.default.http[0]],
            blockExplorerUrls: [hyperEvm.blockExplorers.default.url],
          },
        ],
      })
      await (provider as { request: (args: unknown) => Promise<unknown> }).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${hyperEvm.id.toString(16)}` }],
      })
    }
    return createWalletClient({
      account: walletAddress,
      chain: hyperEvm,
      transport: custom(provider as Parameters<typeof custom>[0]),
    })
  }, [wallet, walletAddress])

  const transferCreator = useCallback(
    async (params: {
      tokenAddress: string
      newCreator: string
      bondingAddress?: string | null
    }) => {
      if (!walletAddress) {
        throw new Error('Please connect wallet first.')
      }

      const token = toHexAddress(params.tokenAddress)
      const newCreator = toHexAddress(params.newCreator.trim())
      if (!token) throw new Error('Invalid token address.')
      if (!newCreator) throw new Error('Invalid new creator wallet address.')
      if (newCreator.toLowerCase() === walletAddress.toLowerCase()) {
        throw new Error('New creator must be a different wallet.')
      }

      const bonding = resolveBondingAddress(params.bondingAddress)

      setTxState({ status: 'transferring' })

      try {
        const onChainCreator = await publicClient.readContract({
          address: bonding,
          abi: bondingAbi,
          functionName: 'creatorOf',
          args: [token],
        })
        if (onChainCreator.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error('Only the current token creator can transfer this role.')
        }

        const walletClient = await getWalletClient()
        const simulation = await publicClient.simulateContract({
          address: bonding,
          abi: bondingAbi,
          functionName: 'transferCreator',
          args: [token, newCreator],
          account: walletAddress,
        })
        const hash = await walletClient.writeContract(simulation.request)
        const receipt = await waitForSuccessfulReceipt(
          hash,
          'Transfer creator transaction reverted.',
        )

        parseEventLogs({
          abi: bondingAbi,
          eventName: 'CreatorTransferred',
          logs: receipt.logs,
        })

        setTxState({ status: 'success', hash })
        return hash
      } catch (e) {
        const message = normalizeTransferError(e)
        setTxState({ status: 'error', message })
        throw e
      }
    },
    [walletAddress, getWalletClient],
  )

  const resetTxState = useCallback(() => {
    setTxState({ status: 'idle' })
  }, [])

  return {
    txState,
    transferring: txState.status === 'transferring',
    transferCreator,
    resetTxState,
    isValidHexAddress,
  }
}
