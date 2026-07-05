'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Settings, X, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { Token } from '@/lib/mock-data'
import { usePrivyWalletLogin } from '@/hooks/use-privy-wallet-login'
import { useZapTrade } from '@/hooks/use-zap-trade'
import { resolveTokenAddress } from '@/lib/contracts/token-address'
import { CONTRACTS } from '@/lib/contracts/config'
import type { TradeContracts } from '@/lib/contracts/trade-quote'
import { MIN_BUY_USDC, MIN_SELL_USDC } from '@/lib/contracts/config'
import { hyperEvm } from '@/lib/contracts/chain'

interface TradePanelProps {
  token: Token
  /** Optional on-chain address (?address=0x...) */
  contractAddressOverride?: string | null
  protocolAddressOverrides?: Partial<Pick<TradeContracts, 'zap' | 'bonding' | 'router' | 'pool' | 'lt'>>
  /** Wait for token detail before quoting with per-token protocol addresses. */
  protocolAddressesReady?: boolean
  /** Omit outer card shell (e.g. inside mobile trade drawer). */
  embedded?: boolean
}

const TX_MODAL_AUTO_CLOSE_SEC = 10

function formatAmount(value: string, maxDecimals = 4) {
  const n = Number.parseFloat(value)
  if (Number.isNaN(n) || n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  if (n >= 1) {
    return n.toLocaleString(undefined, { maximumFractionDigits: maxDecimals })
  }
  if (n >= 0.0001) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
  }
  // Very small token amounts (e.g. graduated low-cap memecoins) need more precision.
  const precise = n.toPrecision(4)
  if (!precise.includes('e')) {
    return precise.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  }
  return precise
}

function truncateDecimals(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.floor(value * factor) / factor
}

function formatGas(value?: string) {
  if (!value) return '—'
  const gas = Number.parseInt(value, 10)
  if (!Number.isFinite(gas)) return value
  return gas.toLocaleString()
}

export function TradePanel({
  token,
  contractAddressOverride,
  protocolAddressOverrides,
  protocolAddressesReady = true,
  embedded,
}: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [slippage, setSlippage] = useState('10')
  const [showTxModal, setShowTxModal] = useState(false)
  const [closeCountdown, setCloseCountdown] = useState(TX_MODAL_AUTO_CLOSE_SEC)

  const tokenAddress = resolveTokenAddress(token, contractAddressOverride)
  const slippageNum = Number.parseFloat(slippage) || 10
  const loginWithWallet = usePrivyWalletLogin()

  const contracts = useMemo<TradeContracts>(() => ({
    zap: protocolAddressOverrides?.zap ?? CONTRACTS.zap,
    bonding: protocolAddressOverrides?.bonding ?? CONTRACTS.bonding,
    router: protocolAddressOverrides?.router ?? CONTRACTS.router,
    usdc: CONTRACTS.usdc,
    pool: protocolAddressOverrides?.pool,
    lt: protocolAddressOverrides?.lt,
  }), [protocolAddressOverrides])

  const {
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
  } = useZapTrade(tokenAddress, mode, amount, slippageNum, contracts, protocolAddressesReady)

  const presetAmounts = mode === 'buy' ? ['20', '50', '100', '500'] : ['25%', '50%', '75%', '100%']

  const handlePreset = (preset: string) => {
    if (mode === 'buy') {
      setAmount(preset)
      return
    }
    const pct = Number.parseInt(preset, 10) / 100
    const bal = Number.parseFloat(balances.token)
    if (!Number.isNaN(bal) && bal > 0) {
      const presetAmount = truncateDecimals(bal * pct, 6)
      setAmount(presetAmount.toString())
    }
  }

  const handleTrade = async () => {
    resetTx()
    try {
      await executeTrade()
    } catch {
      // error surfaced via txState
    }
  }

  useEffect(() => {
    if (txState.status !== 'idle') {
      setShowTxModal(true)
    }
  }, [txState.status])

  const minHint =
    mode === 'buy' ? `Minimum ${MIN_BUY_USDC} USDC` : `Estimated minimum ${MIN_SELL_USDC} USDC`

  const isGraduating = tokenStatus?.isGraduating
  const noContract = !tokenAddress
  const amountNum = Number.parseFloat(amount)
  const usdcBalanceNum = Number.parseFloat(balances.usdc)
  const tokenBalanceNum = Number.parseFloat(balances.token)
  const hasValidAmount = Number.isFinite(amountNum) && amountNum > 0
  const hasInsufficientBalance =
    hasValidAmount &&
    isWalletReady &&
    (mode === 'buy'
      ? Number.isFinite(usdcBalanceNum) && amountNum > usdcBalanceNum
      : Number.isFinite(tokenBalanceNum) && amountNum > tokenBalanceNum)

  const estimatedReceiveOut = quote ? Number.parseFloat(quote.estimatedOut) : NaN
  const hasQuoteReady =
    !quoteLoading &&
    quote != null &&
    quote.estimatedOutRaw != null &&
    Number.isFinite(estimatedReceiveOut) &&
    estimatedReceiveOut > 0

  const isBelowMinimum =
    mode === 'buy'
      ? hasValidAmount && amountNum < MIN_BUY_USDC
      : hasValidAmount && hasQuoteReady && estimatedReceiveOut < MIN_SELL_USDC

  const buttonLabel = (() => {
    if (noContract) return 'Contract address not configured'
    if (needsReconnect) return `RECONNECT WALLET TO ${mode.toUpperCase()}`
    if (!isWalletReady) return `CONNECT WALLET TO ${mode.toUpperCase()}`
    if (hasValidAmount && quoteLoading) return 'LOADING QUOTE…'
    if (hasValidAmount && !hasQuoteReady) return 'QUOTE UNAVAILABLE'
    if (hasInsufficientBalance) {
      return mode === 'buy' ? 'INSUFFICIENT USDC BALANCE' : 'INSUFFICIENT TOKEN BALANCE'
    }
    if (isBelowMinimum) return minHint.toUpperCase()
    if (isGraduating) return 'GRADUATING…'
    if (isBusy) {
      return 'CONFIRM IN WALLET…'
    }
    if (txState.status === 'success') return 'TRADE SUCCESS'
    return mode === 'buy' ? 'BUY' : 'SELL'
  })()

  const buttonDisabled =
    noContract ||
    isGraduating ||
    isBusy ||
    !amount ||
    amountNum <= 0 ||
    (hasValidAmount && !hasQuoteReady) ||
    hasInsufficientBalance ||
    isBelowMinimum ||
    (isWalletReady && txState.status === 'success')

  const isPending = txState.status === 'trading'
  const receiveLabel = mode === 'buy' ? token.symbol : 'USDC'
  const payLabel = mode === 'buy' ? 'USDC' : token.symbol
  const estimatedReceive = quote
    ? `${formatAmount(quote.estimatedOut)} ${receiveLabel}`
    : '—'
  const simulationStepLabel =
    simulationState.status === 'idle'
      ? '—'
      : simulationState.step === 'permit'
        ? 'Sign permit'
        : simulationState.step === 'approve'
          ? 'Approve'
          : simulationState.step === 'buy'
            ? 'Buy'
            : 'Sell'

  const closeTxModal = () => {
    if (isPending) return
    setShowTxModal(false)
    setCloseCountdown(TX_MODAL_AUTO_CLOSE_SEC)
    resetTx()
  }

  useEffect(() => {
    if (txState.status !== 'success' || !showTxModal) {
      setCloseCountdown(TX_MODAL_AUTO_CLOSE_SEC)
      return
    }

    let remaining = TX_MODAL_AUTO_CLOSE_SEC
    setCloseCountdown(remaining)

    const timer = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(timer)
        setShowTxModal(false)
        setCloseCountdown(TX_MODAL_AUTO_CLOSE_SEC)
        resetTx()
        return
      }
      setCloseCountdown(remaining)
    }, 1000)

    return () => clearInterval(timer)
  }, [txState.status, showTxModal, resetTx])

  return (
    <div className={embedded ? 'relative' : 'bg-card rounded-xl p-6 relative'}>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('buy')
            setAmount('')
            resetTx()
          }}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            mode === 'buy'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('sell')
            setAmount('')
            resetTx()
          }}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            mode === 'sell'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          SELL
        </button>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-3 bg-secondary text-muted-foreground hover:text-primary rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div
          className={`absolute top-16 z-10 rounded-xl border border-border bg-card p-4 shadow-xl ${
            embedded ? 'inset-x-0' : 'left-6 right-6'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-2 block tracking-wide">
              MAX SLIPPAGE (%)
            </label>
            <div className="relative">
              <input
                type="text"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Maximum price change you&apos;re willing to accept when placing trades.
          </p>

          <div className="flex gap-2">
            {['2', '5', '10', '15'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSlippage(preset)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  slippage === preset
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      )}

      {noContract && (
        <p className="text-xs text-amber-500/90 mb-4 rounded-lg bg-amber-500/10 px-3 py-2">
          Configure <code className="font-mono">contractAddress</code> for this token, or add{' '}
          <code className="font-mono">?address=0x…</code> to the URL to enable on-chain trading.
        </p>
      )}

      {isGraduating && (
        <p className="text-xs text-primary mb-4 rounded-lg bg-primary/10 px-3 py-2">
          This token is graduating and liquidity is migrating. Please try again shortly.
        </p>
      )}

      {tokenStatus?.isGraduated && !isGraduating && (
        <p className="text-xs text-muted-foreground mb-4">
          This token has graduated to DEX liquidity. Quotes reflect the current pool price.
        </p>
      )}

      <div className="mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">
          Amount ({mode === 'buy' ? 'USDC' : token.symbol})
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^0-9.]/g, ''))
            resetTx()
          }}
          placeholder="0.00"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">{minHint}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {presetAmounts.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className="flex-1 py-2 text-xs font-semibold bg-secondary text-muted-foreground rounded hover:bg-muted transition-colors"
          >
            {preset} {mode === 'buy' ? 'USDC' : ''}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-6 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">You receive (est.)</span>
          <span className="text-foreground flex items-center gap-1">
            {quoteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {quote
              ? `${formatAmount(quote.estimatedOut)} ${mode === 'buy' ? token.symbol : 'USDC'}`
              : '—'}
          </span>
        </div>
        {quote && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Protocol fee (est.)</span>
            <span className="text-foreground">{quote.feePercent}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Underlying</span>
          <span className="text-foreground">{token.underlying}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Leverage</span>
          <span className="text-foreground">{token.leverage}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Direction</span>
          <span className={token.direction === 'Long' ? 'text-primary' : 'text-destructive'}>
            {token.direction}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Slippage</span>
          <span className="text-foreground">{slippage}%</span>
        </div>
      </div>

      {!isWalletReady ? (
        <button
          type="button"
          onClick={loginWithWallet}
          disabled={noContract}
          className={`w-full py-4 text-sm font-bold rounded-lg transition-colors ${
            mode === 'buy'
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {buttonLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTrade}
          disabled={buttonDisabled}
          className={`w-full py-4 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            mode === 'buy'
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonLabel}
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Balance</span>
          <span className="text-foreground">
            {formatAmount(balances.token)} {token.symbol}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-muted-foreground">USDC Balance</span>
          <span className="text-foreground">{formatAmount(balances.usdc)} USDC</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 text-center">
        Trades route through{' '}
        <Link href="https://docs.leap.fun/integrations" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Zap
        </Link>{' '}
        on HyperEVM
      </p>

      {showTxModal && txState.status !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {mode === 'buy' ? 'Buy Order' : 'Sell Order'}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {isPending
                    ? 'Transaction In Progress'
                    : txState.status === 'success'
                      ? 'Transaction Successful'
                      : 'Transaction Failed'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTxModal}
                disabled={isPending}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-border bg-secondary/50 p-4 text-sm">
              {isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-foreground">
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
                      <span className="absolute inline-flex h-6 w-6 rounded-full bg-primary/20" />
                      <Loader2 className="relative h-4 w-4 animate-spin text-primary" />
                    </div>
                    <p>Confirm the transaction in your wallet...</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
              {txState.status === 'error' && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 animate-pulse text-destructive" />
                  <p className="text-destructive">{txState.message}</p>
                </div>
              )}
              {txState.status === 'success' && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 animate-bounce text-primary" />
                  <p className="text-primary">Transaction completed and confirmed on-chain.</p>
                </div>
              )}
            </div>

            <div className="mb-4 space-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Side</span>
                <span className={mode === 'buy' ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                  {mode === 'buy' ? 'Buy' : 'Sell'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Token</span>
                <span className="text-foreground">{token.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Input Amount</span>
                <span className="text-foreground">
                  {amount || '—'} {payLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Receive</span>
                <span className="text-foreground">{estimatedReceive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Slippage</span>
                <span className="text-foreground">{slippage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Protocol Fee</span>
                <span className="text-foreground">{quote ? `${quote.feePercent}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Gas</span>
                <span className="text-foreground">
                  {simulationState.status === 'success'
                    ? formatGas(simulationState.estimatedGas)
                    : '—'}
                </span>
              </div>
              {simulationState.status === 'error' && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                  {simulationState.message}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Underlying</span>
                <span className="text-foreground">{token.underlying}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Leverage / Direction</span>
                <span className="text-foreground">
                  {token.leverage}x / {token.direction}
                </span>
              </div>
            </div>

            {txState.status === 'success' && (
              <a
                href={`${hyperEvm.blockExplorers.default.url}/tx/${txState.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View Transaction Details
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {simulationState.status !== 'idle' && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <div className="flex items-center gap-2">
                  {simulationState.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : simulationState.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  <p
                    className={
                      simulationState.status === 'success'
                        ? 'text-primary'
                        : simulationState.status === 'error'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                    }
                  >
                    {simulationState.status === 'running'
                      ? 'Simulation running: transaction is being validated before submission.'
                      : simulationState.status === 'success'
                        ? 'Simulation passed: transaction is expected to execute successfully.'
                        : 'Simulation failed: transaction is likely to fail, please adjust amount or slippage and try again.'}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={closeTxModal}
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? 'Processing...'
                : txState.status === 'success'
                  ? `Close (${closeCountdown}s)`
                  : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
