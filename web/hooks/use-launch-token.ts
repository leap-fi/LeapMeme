'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import {
  usePrivy,
  useWallets,
  useActiveWallet,
  getEmbeddedConnectedWallet,
} from '@privy-io/react-auth'
import {
  createWalletClient,
  custom,
  parseEventLogs,
  parseUnits,
  type Hash,
} from 'viem'
import { bondingExtraAbi, erc20Abi, zapAbi } from '@/lib/contracts/abis'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'
import {
  CONTRACTS,
  MAX_TRADE_USDC,
  MIN_SEED_USDC,
  USDC_DECIMALS,
} from '@/lib/contracts/config'
import {
  parseLeverageMultiplier,
  preloadLtRegistry,
  resolveLtAddress,
} from '@/lib/contracts/lt-registry'
import { readAllowance, readErc20Balance } from '@/lib/contracts/trade-quote'
import { MAX_ALLOWANCE } from '@/lib/contracts/wallet-batch'
import {
  isUserRejectedError,
  signErc20Permit,
  toPermitTuple,
  tokenSupportsPermit,
  type PermitTuple,
} from '@/lib/contracts/permit'
import { mineVanitySalt } from '@/lib/contracts/vanity-salt'

export type LaunchParamsInput = {
  tokenName: string
  ticker: string
  description: string
  underlying: string
  leverageLabel: string
  direction: 'LONG' | 'SHORT'
  seedAmountUsd: number
  socialUrls: [string, string, string]
  image?: string | null
}

export type LaunchTxState =
  | { status: 'idle' }
  | { status: 'resolving_lt' }
  | { status: 'mining_address' }
  | { status: 'simulating' }
  | { status: 'approving' }
  | { status: 'launching' }
  | { status: 'success'; hash: Hash; tokenAddress: `0x${string}` }
  | { status: 'error'; message: string }

const FRIENDLY_LAUNCH_ERROR_MARKERS = [
  'please connect',
  'please enter',
  'please select',
  'seed buy must',
  'no leverage token',
  'insufficient usdc',
  'transaction was confirmed, but token address',
  'wallet is not connected',
  'please connect an ethereum wallet',
] as const

export function formatLtPairNotFoundMessage(
  underlying: string,
  leverageLabel: string,
  direction: 'LONG' | 'SHORT',
): string {
  const leverage = parseLeverageMultiplier(leverageLabel)
  return `No leverage token on chain for ${underlying} ${leverage}x ${direction}. Please choose another pair.`
}

function getLaunchErrorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) {
    const e = error as Error & { shortMessage?: string; details?: string; cause?: unknown }
    const parts = [e.shortMessage, e.details, e.message].filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    )
    if (e.cause) {
      const causeText = getLaunchErrorText(e.cause)
      if (causeText) parts.push(causeText)
    }
    return parts.join(' ')
  }
  return 'Launch failed. Please try again shortly.'
}

function isFriendlyLaunchMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return FRIENDLY_LAUNCH_ERROR_MARKERS.some((marker) => lower.includes(marker))
}

function normalizeLaunchErrorMessage(error: unknown): string {
  const raw = getLaunchErrorText(error)
  if (isFriendlyLaunchMessage(raw)) return raw

  const message = raw.toLowerCase()

  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('denied transaction') ||
    message.includes('rejected signing')
  ) {
    return 'You cancelled the wallet request. Please try again.'
  }

  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('transfer amount exceeds balance') ||
    message.includes('erc20: transfer amount exceeds balance')
  ) {
    return 'Insufficient USDC balance. Reduce the seed amount or top up your wallet and try again.'
  }

  if (
    message.includes('insufficient allowance') ||
    message.includes('erc20insufficientallowance') ||
    message.includes('0xfb8f41b2')
  ) {
    return 'USDC authorization is required. Sign the permit in your wallet, or approve USDC to Zap and try again.'
  }

  if (
    message.includes('execution reverted') ||
    message.includes('call_exception') ||
    message.includes('estimategas') ||
    message.includes('revert')
  ) {
    return 'Launch simulation failed. Check your seed amount, USDC balance, and pair settings, then try again.'
  }

  if (
    message.includes('network') ||
    message.includes('chain') ||
    message.includes('switchethereumchain') ||
    message.includes('wallet_addethereumchain')
  ) {
    return 'Network switch failed. Please switch to HyperEVM and try again.'
  }

  return 'Launch failed. Please try again shortly.'
}

async function waitForSuccessfulReceipt(hash: Hash, failMessage: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(failMessage)
  }
  return receipt
}

function buildLaunchParams(
  input: LaunchParamsInput,
  ltAddress: `0x${string}`,
  salt: `0x${string}`,
) {
  return {
    name: input.tokenName.trim(),
    ticker: input.ticker.trim().toUpperCase(),
    description: input.description.trim(),
    image: input.image?.trim() ? input.image.trim() : null,
    urls: input.socialUrls,
    ltAddress,
    salt,
  } as const
}

export function useLaunchToken() {
  const session = useWalletSessionOptional()
  const { authenticated, ready: privyReady } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { wallet: activeWallet } = useActiveWallet()
  const [txState, setTxState] = useState<LaunchTxState>({ status: 'idle' })
  const [ltAddress, setLtAddress] = useState<`0x${string}` | null>(null)
  const [ltLoading, setLtLoading] = useState(true)
  const resolveSeq = useRef(0)
  const registryLoadedRef = useRef(false)

  const wallet = useMemo(() => {
    if (activeWallet && 'address' in activeWallet) {
      return activeWallet
    }
    const embedded = getEmbeddedConnectedWallet(wallets)
    return embedded ?? wallets[0] ?? null
  }, [activeWallet, wallets])

  const walletAddress = wallet?.address as `0x${string}` | undefined
  const isWalletReady = session
    ? session.isSessionActive
    : privyReady && walletsReady && authenticated && !!walletAddress
  const needsReconnect = session?.needsReconnect ?? false
  const isBusy =
    txState.status === 'resolving_lt' ||
    txState.status === 'mining_address' ||
    txState.status === 'simulating' ||
    txState.status === 'approving' ||
    txState.status === 'launching'

  useEffect(() => {
    void preloadLtRegistry().then(() => {
      registryLoadedRef.current = true
    })
  }, [])

  const resolveLtForPair = useCallback(
    async (
      underlying: string,
      leverageLabel: string,
      direction: 'LONG' | 'SHORT',
    ) => {
      const leverage = parseLeverageMultiplier(leverageLabel)
      return resolveLtAddress(underlying, leverage, direction)
    },
    [],
  )

  const resolveLt = useCallback(
    async (
      underlying: string,
      leverageLabel: string,
      direction: 'LONG' | 'SHORT',
    ) => {
      const seq = ++resolveSeq.current
      if (!registryLoadedRef.current) setLtLoading(true)
      try {
        const lt = await resolveLtForPair(underlying, leverageLabel, direction)
        if (seq === resolveSeq.current) {
          registryLoadedRef.current = true
          setLtAddress(lt)
        }
        return lt
      } finally {
        if (seq === resolveSeq.current) setLtLoading(false)
      }
    },
    [resolveLtForPair],
  )

  const getWalletClient = useCallback(async () => {
    if (!wallet || wallet.type !== 'ethereum') {
      throw new Error('Please connect an Ethereum wallet.')
    }
    const provider = await wallet.getEthereumProvider()
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${hyperEvm.id.toString(16)}` }],
    })
    return createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: hyperEvm,
      transport: custom(provider),
    })
  }, [wallet])

  const launchToken = useCallback(
    async (input: LaunchParamsInput) => {
      if (!walletAddress) throw new Error('Please connect your wallet first.')
      if (!input.tokenName.trim()) throw new Error('Please enter a token name.')
      if (!input.ticker.trim()) throw new Error('Please enter a ticker.')
      if (input.seedAmountUsd < MIN_SEED_USDC) {
        throw new Error(`Seed buy must be at least ${MIN_SEED_USDC} USDC.`)
      }
      if (MAX_TRADE_USDC > 0 && input.seedAmountUsd > MAX_TRADE_USDC) {
        throw new Error(`Seed buy cannot exceed ${MAX_TRADE_USDC} USDC in this experience version.`)
      }

      const leverage = parseLeverageMultiplier(input.leverageLabel)
      if (![2, 3, 5].includes(leverage)) {
        throw new Error('Please select a valid leverage multiplier.')
      }

      setTxState({ status: 'resolving_lt' })
      try {
        const lt = await resolveLtForPair(
          input.underlying,
          input.leverageLabel,
          input.direction,
        )
        if (!lt) {
          throw new Error(
            formatLtPairNotFoundMessage(
              input.underlying,
              input.leverageLabel,
              input.direction,
            ),
          )
        }
        setLtAddress(lt)

        const seedUsdcAmount = parseUnits(
          input.seedAmountUsd.toString(),
          USDC_DECIMALS,
        )

        const usdcBalance = await readErc20Balance(walletAddress, CONTRACTS.usdc)
        if (usdcBalance < seedUsdcAmount) {
          const available = Number(usdcBalance) / 10 ** USDC_DECIMALS
          throw new Error(
            `Insufficient USDC. You need $${input.seedAmountUsd.toFixed(2)} but only have about $${available.toFixed(2)}.`,
          )
        }

        const walletClient = await getWalletClient()

        const allowance = await readAllowance(
          walletAddress,
          CONTRACTS.usdc,
          CONTRACTS.zap,
        )
        const needsApproval = allowance < seedUsdcAmount

        let permit: PermitTuple | null = null
        if (needsApproval) {
          if (await tokenSupportsPermit(CONTRACTS.usdc)) {
            try {
              setTxState({ status: 'approving' })
              const signed = await signErc20Permit(walletClient, {
                token: CONTRACTS.usdc,
                owner: walletAddress,
                spender: CONTRACTS.zap,
                value: MAX_ALLOWANCE,
              })
              permit = toPermitTuple(signed)
            } catch (error) {
              if (isUserRejectedError(error)) throw error
            }
          }

          if (!permit) {
            setTxState({ status: 'approving' })
            const approveSimulation = await publicClient.simulateContract({
              address: CONTRACTS.usdc,
              abi: erc20Abi,
              functionName: 'approve',
              args: [CONTRACTS.zap, MAX_ALLOWANCE],
              account: walletAddress,
            })
            const approveHash = await walletClient.writeContract(
              approveSimulation.request,
            )
            await waitForSuccessfulReceipt(
              approveHash,
              'USDC approval failed on-chain. Please try again.',
            )
          }
        }

        const name = input.tokenName.trim()
        const ticker = input.ticker.trim().toUpperCase()

        setTxState({ status: 'mining_address' })
        const tokenImplementation = await publicClient.readContract({
          address: CONTRACTS.bonding,
          abi: bondingExtraAbi,
          functionName: 'tokenImplementation',
        })
        const saltHex = await mineVanitySalt(
          walletAddress,
          name,
          ticker,
          tokenImplementation,
        )
        const params = buildLaunchParams(input, lt, saltHex)

        setTxState({ status: 'simulating' })
        const launchFn = permit ? 'createTokenWithPermit' : 'createToken'
        const launchArgs = permit
          ? [params, seedUsdcAmount, permit]
          : [params, seedUsdcAmount]
        const launchSimulation = await publicClient.simulateContract({
          address: CONTRACTS.zap,
          abi: zapAbi,
          functionName: launchFn,
          args: launchArgs as any,
          account: walletAddress,
        })

        setTxState({ status: 'launching' })
        const hash = await walletClient.writeContract(launchSimulation.request)

        const receipt = await waitForSuccessfulReceipt(
          hash,
          'Create token transaction failed on-chain.',
        )
        const events = parseEventLogs({
          abi: zapAbi,
          eventName: 'TokenCreated',
          logs: receipt.logs,
        })
        const tokenAddress = events[0]?.args.token
        if (!tokenAddress) {
          throw new Error('Transaction was confirmed, but token address could not be parsed.')
        }

        setTxState({ status: 'success', hash, tokenAddress })
        return { hash, tokenAddress }
      } catch (err) {
        const message = normalizeLaunchErrorMessage(err)
        setTxState({ status: 'error', message })
        throw new Error(message)
      }
    },
    [walletAddress, resolveLtForPair, getWalletClient],
  )

  const resetTx = useCallback(() => setTxState({ status: 'idle' }), [])

  return {
    walletAddress,
    isWalletReady,
    needsReconnect,
    ltAddress,
    ltLoading,
    txState,
    isBusy,
    resolveLt,
    launchToken,
    resetTx,
  }
}
