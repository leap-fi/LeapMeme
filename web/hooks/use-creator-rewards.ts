'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { creatorRewardsAbi, leapCreatorRewardsAbi } from '@/lib/contracts/abis'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'
import { CONTRACTS, USDC_DECIMALS } from '@/lib/contracts/config'

type CreatorRewardsTxState =
  | { status: 'idle' }
  | { status: 'claiming' }
  | { status: 'success'; hash: `0x${string}` }
  | { status: 'error'; message: string }
type RewardSource = 'alt' | 'leap'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function toUsdcString(raw: bigint, maxDecimals = 2): string {
  const num = Number(raw) / 10 ** USDC_DECIMALS
  if (!Number.isFinite(num) || num <= 0) return '0.00'
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })
}

function normalizeClaimErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Claim failed.'
  const message = raw.toLowerCase()
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('denied transaction')
  ) {
    return 'You cancelled the wallet request. Please try again.'
  }
  if (
    message.includes('network') ||
    message.includes('chain') ||
    message.includes('switchethereumchain') ||
    message.includes('wallet_addethereumchain')
  ) {
    return 'Network switch failed. Please switch to HyperEVM and try again.'
  }
  return raw
}

function isChainNotAddedError(error: unknown): boolean {
  const maybeCode = typeof error === 'object' && error && 'code' in error ? (error as { code?: number }).code : undefined
  if (maybeCode === 4902) return true
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('unrecognized chain') ||
    message.includes('chain not added') ||
    message.includes('unknown chain')
  )
}

export function useCreatorRewards(wallet: {
  address?: `0x${string}`
  getEthereumProvider?: () => Promise<unknown>
  type?: string
} | null) {
  const [altClaimableRaw, setAltClaimableRaw] = useState<bigint>(BigInt(0))
  const [leapClaimableRaw, setLeapClaimableRaw] = useState<bigint>(BigInt(0))
  const [altTotalEarnedRaw, setAltTotalEarnedRaw] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [altTxState, setAltTxState] = useState<CreatorRewardsTxState>({
    status: 'idle',
  })
  const [leapTxState, setLeapTxState] = useState<CreatorRewardsTxState>({
    status: 'idle',
  })

  const walletAddress = wallet?.address

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setAltClaimableRaw(BigInt(0))
      setLeapClaimableRaw(BigInt(0))
      setAltTotalEarnedRaw(BigInt(0))
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [altClaimable, altTotalEarned, leapClaimable] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.creatorRewards,
          abi: creatorRewardsAbi,
          functionName: 'creatorBalance',
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: CONTRACTS.creatorRewards,
          abi: creatorRewardsAbi,
          functionName: 'lifetimeCreatorEarned',
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: CONTRACTS.leapCreatorRewards,
          abi: leapCreatorRewardsAbi,
          functionName: 'creatorBalance',
          args: [walletAddress],
        }),
      ])
      setAltClaimableRaw(altClaimable)
      setAltTotalEarnedRaw(altTotalEarned)
      setLeapClaimableRaw(leapClaimable)
    } catch (e) {
      setAltClaimableRaw(BigInt(0))
      setLeapClaimableRaw(BigInt(0))
      setAltTotalEarnedRaw(BigInt(0))
      setError(e instanceof Error ? e.message : 'Failed to load creator rewards')
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const claimBySource = useCallback(async (source: RewardSource) => {
    if (!wallet || wallet.type !== 'ethereum' || !walletAddress || !wallet.getEthereumProvider) {
      throw new Error('Please connect wallet first.')
    }
    const claimable = source === 'alt' ? altClaimableRaw : leapClaimableRaw
    if (claimable <= BigInt(0)) return

    const setTxState = source === 'alt' ? setAltTxState : setLeapTxState
    const contractAddress =
      source === 'alt' ? CONTRACTS.creatorRewards : CONTRACTS.leapCreatorRewards
    setTxState({ status: 'claiming' })

    try {
      const provider = (await wallet.getEthereumProvider()) as Eip1193Provider
      const targetChainIdHex = `0x${hyperEvm.id.toString(16)}`
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        })
      } catch (switchError) {
        if (!isChainNotAddedError(switchError)) throw switchError
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: targetChainIdHex,
              chainName: hyperEvm.name,
              nativeCurrency: hyperEvm.nativeCurrency,
              rpcUrls: [hyperEvm.rpcUrls.default.http[0]],
              blockExplorerUrls: [hyperEvm.blockExplorers.default.url],
            },
          ],
        })
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        })
      }

      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contractAddress,
            data: '0x4e71d92d',
          },
        ],
      })) as `0x${string}`
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        throw new Error('Claim transaction reverted.')
      }
      setTxState({ status: 'success', hash })
      await refresh()
    } catch (e) {
      const message = normalizeClaimErrorMessage(e)
      setTxState({ status: 'error', message })
      throw e
    }
  }, [wallet, walletAddress, altClaimableRaw, leapClaimableRaw, refresh])

  const claimAlt = useCallback(() => claimBySource('alt'), [claimBySource])
  const claimLeap = useCallback(() => claimBySource('leap'), [claimBySource])

  const resetTxState = useCallback(() => {
    setAltTxState({ status: 'idle' })
    setLeapTxState({ status: 'idle' })
  }, [])

  const claimableRaw = useMemo(
    () => altClaimableRaw + leapClaimableRaw,
    [altClaimableRaw, leapClaimableRaw],
  )
  const totalEarnedRaw = useMemo(
    () => altTotalEarnedRaw + leapClaimableRaw,
    [altTotalEarnedRaw, leapClaimableRaw],
  )
  const previouslyClaimedRaw = useMemo(() => {
    if (totalEarnedRaw <= claimableRaw) return BigInt(0)
    return totalEarnedRaw - claimableRaw
  }, [totalEarnedRaw, claimableRaw])
  const txState = leapTxState.status !== 'idle' ? leapTxState : altTxState

  return {
    altClaimableRaw,
    leapClaimableRaw,
    altClaimableText: toUsdcString(altClaimableRaw),
    leapClaimableText: toUsdcString(leapClaimableRaw),
    claimableRaw,
    totalEarnedRaw,
    previouslyClaimedRaw,
    claimableText: toUsdcString(claimableRaw),
    totalEarnedText: toUsdcString(totalEarnedRaw),
    previouslyClaimedText: toUsdcString(previouslyClaimedRaw),
    loading,
    error,
    altTxState,
    leapTxState,
    txState,
    resetTxState,
    claim: claimAlt,
    claimAlt,
    claimLeap,
    refresh,
  }
}
