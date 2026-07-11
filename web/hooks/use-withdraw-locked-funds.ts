'use client'

import { useCallback, useState } from 'react'
import { createWalletClient, custom, parseEventLogs, type Hash } from 'viem'
import { bondingAbi } from '@/lib/contracts/abis'
import { isValidHexAddress, resolveBondingAddress, toHexAddress } from '@/lib/contracts/address'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'
import type { TranslationKey } from '@/lib/i18n/dictionaries'

export type WithdrawLockedFundsTxState =
  | { status: 'idle' }
  | { status: 'withdrawing' }
  | { status: 'success'; hash: Hash; usdcOut: bigint }
  | { status: 'error'; message: string }

export type WithdrawLockedFundsStatus = {
  graduated: boolean
  withdrawn: boolean
  withdrawable: boolean
  isCreator: boolean
  reasonKey: TranslationKey | null
}

async function waitForSuccessfulReceipt(hash: Hash, failMessage: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(failMessage)
  }
  return receipt
}

function normalizeWithdrawError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Withdraw failed.'
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
    return 'Meme tokens are still circulating. Sell all external holdings back to the pool first.'
  }
  if (message.includes('not graduated')) {
    return 'This token has not graduated yet.'
  }
  if (message.includes('withdrawn')) {
    return 'Locked liquidity has already been withdrawn.'
  }
  if (message.includes('creator')) {
    return 'Only the token creator can withdraw locked funds.'
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

export function useWithdrawLockedFunds(wallet: {
  address?: `0x${string}`
  getEthereumProvider?: () => Promise<unknown>
  type?: string
} | null) {
  const [txState, setTxState] = useState<WithdrawLockedFundsTxState>({ status: 'idle' })

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

  const getStatus = useCallback(
    async (params: {
      tokenAddress: string
      bondingAddress?: string | null
    }): Promise<WithdrawLockedFundsStatus> => {
      const token = toHexAddress(params.tokenAddress)
      if (!token) {
        return {
          graduated: false,
          withdrawn: false,
          withdrawable: false,
          isCreator: false,
          reasonKey: null,
        }
      }
      const bonding = resolveBondingAddress(params.bondingAddress)

      try {
        const [graduated, withdrawn, canWithdraw, creator] = await Promise.all([
          publicClient.readContract({
            address: bonding,
            abi: bondingAbi,
            functionName: 'isGraduated',
            args: [token],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: bonding,
            abi: bondingAbi,
            functionName: 'liquidityWithdrawn',
            args: [token],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: bonding,
            abi: bondingAbi,
            functionName: 'canWithdrawLockedLiquidity',
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

        let reasonKey: TranslationKey | null = null
        if (!isCreator) reasonKey = 'profile.withdraw.reason.notCreator'
        else if (withdrawn) reasonKey = 'profile.withdraw.reason.alreadyWithdrawn'
        else if (!graduated) reasonKey = 'profile.withdraw.reason.notGraduated'
        else if (!canWithdraw) reasonKey = 'profile.withdraw.reason.stillCirculating'

        return {
          graduated,
          withdrawn,
          withdrawable: canWithdraw && isCreator,
          isCreator,
          reasonKey,
        }
      } catch {
        return {
          graduated: false,
          withdrawn: false,
          withdrawable: false,
          isCreator: false,
          reasonKey: 'profile.withdraw.reason.unsupported',
        }
      }
    },
    [walletAddress],
  )

  const withdraw = useCallback(
    async (params: { tokenAddress: string; bondingAddress?: string | null }) => {
      if (!walletAddress) {
        throw new Error('Please connect wallet first.')
      }
      const token = toHexAddress(params.tokenAddress)
      if (!token) throw new Error('Invalid token address.')

      const bonding = resolveBondingAddress(params.bondingAddress)

      setTxState({ status: 'withdrawing' })
      try {
        const walletClient = await getWalletClient()
        const simulation = await publicClient.simulateContract({
          address: bonding,
          abi: bondingAbi,
          functionName: 'withdrawLockedLiquidity',
          args: [token],
          account: walletAddress,
        })
        const hash = await walletClient.writeContract(simulation.request)
        const receipt = await waitForSuccessfulReceipt(hash, 'Withdraw transaction reverted.')

        const events = parseEventLogs({
          abi: bondingAbi,
          eventName: 'LockedLiquidityWithdrawn',
          logs: receipt.logs,
        })
        const usdcOut = events[0]?.args?.usdcOut ?? 0n

        setTxState({ status: 'success', hash, usdcOut })
        return hash
      } catch (e) {
        const message = normalizeWithdrawError(e)
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
    withdrawing: txState.status === 'withdrawing',
    withdraw,
    getStatus,
    resetTxState,
    isValidHexAddress,
  }
}
