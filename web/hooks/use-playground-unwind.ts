'use client'

import { useCallback, useState } from 'react'
import { createWalletClient, custom, parseEventLogs, type Hash } from 'viem'
import { bondingAbi, bondingPlaygroundAbi } from '@/lib/contracts/abis'
import { isValidHexAddress, resolveBondingAddress, toHexAddress } from '@/lib/contracts/address'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'

export type PlaygroundUnwindTxState =
  | { status: 'idle' }
  | { status: 'unwinding' }
  | { status: 'success'; hash: Hash; usdcOut: bigint }
  | { status: 'error'; message: string }

export type PlaygroundRedeemStatus = {
  graduated: boolean
  unwound: boolean
  redeemable: boolean
  isCreator: boolean
  reason: string | null
}

async function waitForSuccessfulReceipt(hash: Hash, failMessage: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(failMessage)
  }
  return receipt
}

function normalizeUnwindError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Redeem failed.'
  const message = raw.toLowerCase()
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('denied transaction')
  ) {
    return 'You cancelled the wallet request. Please try again.'
  }
  if (message.includes('still circulating')) {
    return 'Meme tokens are still circulating. Sell all your holdings back to the pool first, then redeem.'
  }
  if (message.includes('not graduated')) {
    return 'This token has not graduated yet. Redeem is only available after graduation.'
  }
  if (message.includes('unwound')) {
    return 'This token has already been redeemed.'
  }
  if (message.includes('creator')) {
    return 'Only the token creator can redeem locked funds.'
  }
  if (message.includes('no lp') || message.includes('no pair')) {
    return 'No locked liquidity found for this token.'
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

export function usePlaygroundUnwind(wallet: {
  address?: `0x${string}`
  getEthereumProvider?: () => Promise<unknown>
  type?: string
} | null) {
  const [txState, setTxState] = useState<PlaygroundUnwindTxState>({ status: 'idle' })

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

  /** 读取某 token 的赎回状态（是否毕业 / 已赎回 / 可赎回 / 是否 creator）。 */
  const getStatus = useCallback(
    async (params: {
      tokenAddress: string
      bondingAddress?: string | null
    }): Promise<PlaygroundRedeemStatus> => {
      const token = toHexAddress(params.tokenAddress)
      if (!token) {
        return {
          graduated: false,
          unwound: false,
          redeemable: false,
          isCreator: false,
          reason: 'Invalid token address.',
        }
      }
      const bonding = resolveBondingAddress(params.bondingAddress)

      const [graduated, unwound, canUnwind, creator] = await Promise.all([
        publicClient.readContract({
          address: bonding,
          abi: bondingAbi,
          functionName: 'isGraduated',
          args: [token],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: bonding,
          abi: bondingPlaygroundAbi,
          functionName: 'unwound',
          args: [token],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: bonding,
          abi: bondingPlaygroundAbi,
          functionName: 'canUnwind',
          args: [token],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: bonding,
          abi: bondingAbi,
          functionName: 'creatorOf',
          args: [token],
        }) as Promise<`0x${string}`>,
      ])

      const isCreator =
        !!walletAddress && creator.toLowerCase() === walletAddress.toLowerCase()

      let reason: string | null = null
      if (!isCreator) reason = 'Only the token creator can redeem.'
      else if (unwound) reason = 'Already redeemed.'
      else if (!graduated) reason = 'Not graduated yet.'
      else if (!canUnwind) reason = 'Sell all your meme back to the pool first.'

      return {
        graduated,
        unwound,
        redeemable: canUnwind && isCreator,
        isCreator,
        reason,
      }
    },
    [walletAddress],
  )

  const unwind = useCallback(
    async (params: { tokenAddress: string; bondingAddress?: string | null }) => {
      if (!walletAddress) {
        throw new Error('Please connect wallet first.')
      }
      const token = toHexAddress(params.tokenAddress)
      if (!token) throw new Error('Invalid token address.')

      const bonding = resolveBondingAddress(params.bondingAddress)

      setTxState({ status: 'unwinding' })
      try {
        const walletClient = await getWalletClient()
        const simulation = await publicClient.simulateContract({
          address: bonding,
          abi: bondingPlaygroundAbi,
          functionName: 'playgroundUnwind',
          args: [token],
          account: walletAddress,
        })
        const hash = await walletClient.writeContract(simulation.request)
        const receipt = await waitForSuccessfulReceipt(hash, 'Redeem transaction reverted.')

        const events = parseEventLogs({
          abi: bondingPlaygroundAbi,
          eventName: 'PlaygroundUnwound',
          logs: receipt.logs,
        })
        const usdcOut = events[0]?.args?.usdcOut ?? 0n

        setTxState({ status: 'success', hash, usdcOut })
        return hash
      } catch (e) {
        const message = normalizeUnwindError(e)
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
    unwinding: txState.status === 'unwinding',
    unwind,
    getStatus,
    resetTxState,
    isValidHexAddress,
  }
}
