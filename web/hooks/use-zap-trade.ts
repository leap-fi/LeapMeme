'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  usePrivy,
  useWallets,
  useActiveWallet,
  getEmbeddedConnectedWallet,
} from '@privy-io/react-auth'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  parseUnits,
  type Hash,
} from 'viem'
import { erc20Abi, zapAbi } from '@/lib/contracts/abis'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'
import {
  CONTRACTS,
  TOKEN_DECIMALS,
  USDC_DECIMALS,
  ZERO_ADDRESS,
  getMinBuyUsdc,
} from '@/lib/contracts/config'
import {
  encodeApproveCall,
  MAX_ALLOWANCE,
  sendWalletBatch,
} from '@/lib/contracts/wallet-batch'
import {
  isUserRejectedError,
  signErc20Permit,
  toPermitTuple,
  tokenSupportsPermit,
} from '@/lib/contracts/permit'
import {
  quoteBuy,
  quoteSell,
  readAllowance,
  readBalances,
  readErc20Balance,
  readTokenStatus,
  type TradeContracts,
  type TradeQuote,
} from '@/lib/contracts/trade-quote'

export type TradeMode = 'buy' | 'sell'

export type TradeTxState =
  | { status: 'idle' }
  | { status: 'trading' }
  | { status: 'success'; hash: Hash }
  | { status: 'error'; message: string }

export type TradeSimulationStep = 'permit' | 'approve' | 'buy' | 'sell'

export type TradeSimulationState =
  | { status: 'idle' }
  | { status: 'running'; step: TradeSimulationStep }
  | { status: 'success'; step: TradeSimulationStep; estimatedGas?: string }
  | { status: 'error'; step: TradeSimulationStep; message: string }

async function waitForSuccessfulReceipt(hash: Hash, failMessage: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(failMessage)
  }
  return receipt
}

function normalizeTradeErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Trade failed, please try again shortly.'
  const message = raw.toLowerCase()

  // User rejected in wallet popup (MetaMask / Privy / viem)
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
    message.includes('insufficient balance')
  ) {
    return 'Insufficient balance. Reduce the amount or top up your wallet and try again.'
  }

  if (
    message.includes('slippage') ||
    message.includes('minout') ||
    message.includes('price impact')
  ) {
    return 'Price movement exceeded your slippage limit. Increase slippage or try again later.'
  }

  if (
    message.includes('execution reverted') ||
    message.includes('call_exception') ||
    message.includes('estimategas')
  ) {
    return 'Trade execution failed. Please check amount, balance, and slippage settings.'
  }

  if (
    message.includes('network') ||
    message.includes('chain') ||
    message.includes('switchethereumchain')
  ) {
    return 'Network switch failed. Please switch to HyperEVM and try again.'
  }

  if (
    message.includes('wallet_sendcalls') ||
    message.includes('wallet_getcallsstatus') ||
    message.includes('batch transaction')
  ) {
    return 'Your wallet does not support batched approvals. Try Rabby or MetaMask, or approve USDC to Zap once in your wallet.'
  }

  return 'Trade failed, please try again shortly.'
}

function applySlippage(amount: bigint, slippagePercent: number): bigint {
  const bps = BigInt(Math.round(slippagePercent * 100))
  return (amount * (BigInt(10_000) - bps)) / BigInt(10_000)
}

/** When sell input is within this fraction of wallet balance, sell the full on-chain balance. */
const SELL_ALL_BALANCE_BPS = 9990n

function isNearFullTokenBalance(amount: bigint, balance: bigint): boolean {
  if (balance <= 0n || amount <= 0n) return false
  return amount * 10_000n >= balance * SELL_ALL_BALANCE_BPS
}

export function useZapTrade(
  tokenAddress: `0x${string}` | null,
  mode: TradeMode,
  amount: string,
  slippagePercent: number,
  contracts: TradeContracts = CONTRACTS,
  protocolAddressesReady = true,
) {
  const session = useWalletSessionOptional()
  const { authenticated, ready: privyReady } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { wallet: activeWallet } = useActiveWallet()

  const [quote, setQuote] = useState<TradeQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [balances, setBalances] = useState({ usdc: '0', token: '0' })
  const [tokenStatus, setTokenStatus] = useState<{
    exists: boolean
    isGraduating: boolean
    isGraduated: boolean
    isTrading: boolean
  } | null>(null)
  const [txState, setTxState] = useState<TradeTxState>({ status: 'idle' })
  const [simulationState, setSimulationState] = useState<TradeSimulationState>({
    status: 'idle',
  })

  const wallet = useMemo(() => {
    if (activeWallet && 'address' in activeWallet) {
      return activeWallet
    }
    const embedded = getEmbeddedConnectedWallet(wallets)
    return embedded ?? wallets[0] ?? null
  }, [activeWallet, wallets])

  const walletAddress = wallet?.address as `0x${string}` | undefined

  const refreshBalances = useCallback(async () => {
    if (!walletAddress || !tokenAddress) return
    try {
      const b = await readBalances(walletAddress, tokenAddress, contracts)
      setBalances({ usdc: b.usdc, token: b.token })
    } catch {
      setBalances({ usdc: '0', token: '0' })
    }
  }, [walletAddress, tokenAddress, contracts])

  const refreshTokenStatus = useCallback(async () => {
    if (!tokenAddress) {
      setTokenStatus(null)
      return
    }
    try {
      const status = await readTokenStatus(tokenAddress, contracts)
      setTokenStatus(status)
    } catch {
      setTokenStatus(null)
    }
  }, [tokenAddress, contracts])

  useEffect(() => {
    void refreshTokenStatus()
    const id = setInterval(refreshTokenStatus, 15_000)
    return () => clearInterval(id)
  }, [refreshTokenStatus])

  useEffect(() => {
    if (!walletAddress) {
      setBalances({ usdc: '0', token: '0' })
      return
    }
    void refreshBalances()
    const id = setInterval(refreshBalances, 12_000)
    return () => clearInterval(id)
  }, [walletAddress, refreshBalances])

  useEffect(() => {
    if (!tokenAddress || !amount || Number.parseFloat(amount) <= 0) {
      setQuote(null)
      setQuoteLoading(false)
      return
    }

    let cancelled = false
    setQuote(null)
    setQuoteLoading(true)

    const timer = setTimeout(async () => {
      try {
        const result =
          mode === 'buy'
            ? await quoteBuy(tokenAddress, amount, contracts)
            : await quoteSell(tokenAddress, amount, contracts)
        if (!cancelled) setQuote(result)
      } catch {
        if (!cancelled) setQuote(null)
      } finally {
        if (!cancelled) setQuoteLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tokenAddress, mode, amount, contracts])

  const getWalletContext = useCallback(async () => {
    if (!wallet || !('getEthereumProvider' in wallet) || typeof wallet.getEthereumProvider !== 'function') {
      throw new Error('Please connect an Ethereum wallet.')
    }
    const provider = await wallet.getEthereumProvider()
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${hyperEvm.id.toString(16)}` }],
    })
    const address = wallet.address as `0x${string}`
    const walletClient = createWalletClient({
      account: address,
      chain: hyperEvm,
      transport: custom(provider),
    })
    return { walletClient, provider, address }
  }, [wallet])

  const executeTrade = useCallback(async () => {
    if (!tokenAddress) throw new Error('Token contract address is not configured.')
    if (!walletAddress) throw new Error('Please connect your wallet first.')
    if (!amount || Number.parseFloat(amount) <= 0) {
      throw new Error('Please enter a valid amount.')
    }
    if (quoteLoading || !quote?.estimatedOutRaw) {
      throw new Error('Please wait for the receive estimate to finish loading.')
    }

    if (tokenStatus?.isGraduating) {
      throw new Error('This token is graduating. Please trade again later.')
    }
    if (tokenStatus && !tokenStatus.exists) {
      throw new Error('This address is not a valid LEAP token.')
    }

    const { walletClient, provider, address } = await getWalletContext()
    setTxState({ status: 'trading' })
    setSimulationState({ status: 'idle' })

    const writeWithSimulation = async ({
      step,
      address: contractAddress,
      abi,
      functionName,
      args,
    }: {
      step: TradeSimulationStep
      address: `0x${string}`
      abi: any
      functionName: string
      args: readonly unknown[]
    }) => {
      setSimulationState({ status: 'running', step })
      try {
        const simulation = await publicClient.simulateContract({
          address: contractAddress,
          abi,
          functionName,
          args,
          account: address,
        })
        let estimatedGas: bigint | undefined
        try {
          estimatedGas = await publicClient.estimateContractGas({
            address: contractAddress,
            abi,
            functionName,
            args,
            account: address,
          })
        } catch {
          estimatedGas = undefined
        }
        setSimulationState({
          status: 'success',
          step,
          estimatedGas: estimatedGas?.toString(),
        })
        return walletClient.writeContract(simulation.request)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Simulation failed before sending transaction.'
        setSimulationState({ status: 'error', step, message })
        throw error
      }
    }

    const signPermitForZap = async (token: `0x${string}`) => {
      setSimulationState({ status: 'running', step: 'permit' })
      try {
        const permit = await signErc20Permit(walletClient, {
          token,
          owner: address,
          spender: contracts.zap,
          value: MAX_ALLOWANCE,
        })
        setSimulationState({ status: 'success', step: 'permit' })
        return toPermitTuple(permit)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Permit signature failed.'
        setSimulationState({ status: 'error', step: 'permit', message })
        throw error
      }
    }

    const submitBuy = async (usdcAmount: bigint, minOut: bigint) => {
      const allowance = await readAllowance(address, contracts.usdc, contracts.zap)
      const buyArgs = [tokenAddress, usdcAmount, minOut, ZERO_ADDRESS] as const

      if (allowance >= usdcAmount) {
        return writeWithSimulation({
          step: 'buy',
          address: contracts.zap,
          abi: zapAbi,
          functionName: 'buy',
          args: buyArgs,
        })
      }

      // Prefer EIP-2612: one on-chain tx, no approve footprint.
      if (await tokenSupportsPermit(contracts.usdc)) {
        try {
          const p = await signPermitForZap(contracts.usdc)
          return writeWithSimulation({
            step: 'buy',
            address: contracts.zap,
            abi: zapAbi,
            functionName: 'buyWithPermit',
            args: [...buyArgs, p],
          })
        } catch (error) {
          if (isUserRejectedError(error)) throw error
        }
      }

      const buyCall = {
        to: contracts.zap,
        data: encodeFunctionData({
          abi: zapAbi,
          functionName: 'buy',
          args: buyArgs,
        }),
      }

      // EIP-5792 batch approve + buy in one wallet confirmation.
      try {
        return await sendWalletBatch(provider as any, address, [
          encodeApproveCall(contracts.usdc, contracts.zap),
          buyCall,
        ])
      } catch {
        const approveHash = await writeWithSimulation({
          step: 'approve',
          address: contracts.usdc,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contracts.zap, MAX_ALLOWANCE],
        })
        await waitForSuccessfulReceipt(approveHash, 'Approval transaction failed.')
        return writeWithSimulation({
          step: 'buy',
          address: contracts.zap,
          abi: zapAbi,
          functionName: 'buy',
          args: buyArgs,
        })
      }
    }

    const submitSell = async (tokenAmt: bigint, minUsdc: bigint) => {
      const allowance = await readAllowance(address, tokenAddress, contracts.zap)
      const sellArgs = [tokenAddress, tokenAmt, minUsdc] as const

      if (allowance >= tokenAmt) {
        return writeWithSimulation({
          step: 'sell',
          address: contracts.zap,
          abi: zapAbi,
          functionName: 'sell',
          args: sellArgs,
        })
      }

      if (await tokenSupportsPermit(tokenAddress)) {
        try {
          const p = await signPermitForZap(tokenAddress)
          return writeWithSimulation({
            step: 'sell',
            address: contracts.zap,
            abi: zapAbi,
            functionName: 'sellWithPermit',
            args: [...sellArgs, p],
          })
        } catch (error) {
          if (isUserRejectedError(error)) throw error
        }
      }

      const sellCall = {
        to: contracts.zap,
        data: encodeFunctionData({
          abi: zapAbi,
          functionName: 'sell',
          args: sellArgs,
        }),
      }

      try {
        return await sendWalletBatch(provider as any, address, [
          encodeApproveCall(tokenAddress, contracts.zap),
          sellCall,
        ])
      } catch {
        const approveHash = await writeWithSimulation({
          step: 'approve',
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contracts.zap, MAX_ALLOWANCE],
        })
        await waitForSuccessfulReceipt(approveHash, 'Approval transaction failed.')
        return writeWithSimulation({
          step: 'sell',
          address: contracts.zap,
          abi: zapAbi,
          functionName: 'sell',
          args: sellArgs,
        })
      }
    }

    try {
      if (mode === 'buy') {
        const usdcAmount = parseUnits(amount, USDC_DECIMALS)
        if (Number.parseFloat(amount) < getMinBuyUsdc()) {
          throw new Error(`Minimum buy amount is ${getMinBuyUsdc()} USDC.`)
        }
        const minOut = quote?.estimatedOutRaw
          ? applySlippage(quote.estimatedOutRaw, slippagePercent)
          : BigInt(0)
        const hash = await submitBuy(usdcAmount, minOut)
        await waitForSuccessfulReceipt(hash, 'Buy transaction failed on-chain.')
        setTxState({ status: 'success', hash })
      } else {
        let tokenAmt = parseUnits(amount, TOKEN_DECIMALS)
        const onChainBalance = await readErc20Balance(address, tokenAddress)
        if (isNearFullTokenBalance(tokenAmt, onChainBalance)) {
          tokenAmt = onChainBalance
        }
        const minUsdc = quote?.estimatedOutRaw
          ? applySlippage(quote.estimatedOutRaw, slippagePercent)
          : BigInt(0)
        const hash = await submitSell(tokenAmt, minUsdc)
        await waitForSuccessfulReceipt(hash, 'Sell transaction failed on-chain.')
        setTxState({ status: 'success', hash })
      }
      await refreshBalances()
    } catch (err) {
      const message = normalizeTradeErrorMessage(err)
      setTxState({ status: 'error', message })
      throw err
    }
  }, [
    tokenAddress,
    walletAddress,
    amount,
    mode,
    tokenStatus,
    getWalletContext,
    quote,
    quoteLoading,
    slippagePercent,
    refreshBalances,
    contracts,
  ])

  const resetTx = useCallback(() => {
    setTxState({ status: 'idle' })
    setSimulationState({ status: 'idle' })
  }, [])

  const isWalletReady = session
    ? session.isSessionActive
    : privyReady && walletsReady && authenticated && !!walletAddress
  const needsReconnect = session?.needsReconnect ?? false
  const isBusy = txState.status === 'trading'

  return {
    walletAddress,
    isWalletReady,
    needsReconnect,
    balances,
    quote,
    quoteLoading,
    tokenStatus,
    txState,
    simulationState,
    isBusy,
    executeTrade,
    resetTx,
    refreshBalances,
    zapAddress: contracts.zap,
  }
}
