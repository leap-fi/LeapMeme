'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Settings, X, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { Token } from '@/lib/mock-data'
import { usePrivyWalletLogin } from '@/hooks/use-privy-wallet-login'
import { useZapTrade } from '@/hooks/use-zap-trade'
import { resolveTokenAddress } from '@/lib/contracts/token-address'
import { CONTRACTS } from '@/lib/contracts/config'
import type { TradeContracts } from '@/lib/contracts/trade-quote'
import { useProtocolConfig } from '@/contexts/protocol-context'
import { hyperEvm } from '@/lib/contracts/chain'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface TradePanelProps {
  token: Token
  /** Optional on-chain address (?address=0x...) */
  contractAddressOverride?: string | null
  protocolAddressOverrides?: Partial<Pick<TradeContracts, 'zap' | 'bonding' | 'router' | 'pool' | 'lt'>>
  /** Wait for token detail before quoting with per-token protocol addresses. */
  protocolAddressesReady?: boolean
  /** Omit outer card shell (e.g. inside mobile trade drawer). */
  embedded?: boolean
  /** Semi-transparent shell for pages with fluid background. */
  glass?: boolean
  /** Called once per successful trade tx. */
  onTradeSuccess?: () => void
}

const TX_MODAL_AUTO_CLOSE_SEC = 10

type TradeSnapshot = {
  amount: string
  payLabel: string
  estimatedReceive: string
  slippage: string
  feePercent: string | null
}

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
  glass,
  onTradeSuccess,
}: TradePanelProps) {
  const { t } = useI18n()
  const { config } = useProtocolConfig()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [slippage, setSlippage] = useState('10')
  const [showTxModal, setShowTxModal] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [closeCountdown, setCloseCountdown] = useState(TX_MODAL_AUTO_CLOSE_SEC)
  const [tradeSnapshot, setTradeSnapshot] = useState<TradeSnapshot | null>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

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
    if (amount && quote) {
      const snapshotPayLabel = mode === 'buy' ? 'USDC' : token.symbol
      const snapshotReceiveLabel = mode === 'buy' ? token.symbol : 'USDC'
      setTradeSnapshot({
        amount,
        payLabel: snapshotPayLabel,
        estimatedReceive: `${formatAmount(quote.estimatedOut)} ${snapshotReceiveLabel}`,
        slippage,
        feePercent: quote.feePercent != null ? String(quote.feePercent) : null,
      })
    }
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

  const modeLabel = mode === 'buy' ? t('coin.trade.buy') : t('coin.trade.sell')
  const directionLabel =
    token.direction === 'Long' ? t('coin.direction.long') : t('coin.direction.short')
  const minHint =
    mode === 'buy'
      ? t('coin.trade.minBuy').replace('{amount}', String(config.minBuyUsdc))
      : ''
  const amountHint = minHint

  const isGraduating = tokenStatus?.isGraduating
  const isVoided = Boolean(tokenStatus?.tradeDisabled)
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

  const isBelowMinimum = mode === 'buy' ? hasValidAmount && amountNum < config.minBuyUsdc : false

  const buttonLabel = (() => {
    if (noContract) return t('coin.trade.btn.noContract')
    if (isVoided) return t('coin.trade.btn.voided')
    if (needsReconnect) return t('coin.trade.btn.reconnect').replace('{mode}', modeLabel)
    if (!isWalletReady) return t('coin.trade.btn.connect').replace('{mode}', modeLabel)
    if (hasValidAmount && quoteLoading) return t('coin.trade.btn.loadingQuote')
    if (hasValidAmount && !hasQuoteReady) return t('coin.trade.btn.quoteUnavailable')
    if (hasInsufficientBalance) {
      return mode === 'buy'
        ? t('coin.trade.btn.insufficientUsdc')
        : t('coin.trade.btn.insufficientToken')
    }
    if (isBelowMinimum) return minHint
    if (isGraduating) return t('coin.trade.btn.graduating')
    if (isBusy) {
      return t('coin.trade.btn.confirmWallet')
    }
    if (txState.status === 'success') return t('coin.trade.btn.success')
    return modeLabel
  })()

  const buttonDisabled =
    noContract ||
    isVoided ||
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
  const modalTradeDetails = tradeSnapshot ?? {
    amount,
    payLabel,
    estimatedReceive,
    slippage,
    feePercent: quote?.feePercent != null ? String(quote.feePercent) : null,
  }

  const closeTxModal = () => {
    if (isPending) return
    setShowTxModal(false)
    setCloseCountdown(TX_MODAL_AUTO_CLOSE_SEC)
    setTradeSnapshot(null)
    resetTx()
  }

  const lastSuccessHashRef = useRef<string | null>(null)
  useEffect(() => {
    if (txState.status !== 'success') return
    const hash = txState.hash
    if (!hash || lastSuccessHashRef.current === hash) return
    lastSuccessHashRef.current = hash
    setAmount('')
    onTradeSuccess?.()
  }, [txState, onTradeSuccess])

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
        setTradeSnapshot(null)
        resetTx()
        return
      }
      setCloseCountdown(remaining)
    }, 1000)

    return () => clearInterval(timer)
  }, [txState.status, showTxModal, resetTx])

  return (
    <>
    <div
      className={cn(
        'relative',
        !embedded &&
          (glass
            ? 'rounded-xl border border-border/30 bg-background/20 p-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/15'
            : 'rounded-xl bg-card p-6'),
      )}
    >
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('buy')
            setAmount('')
            setTradeSnapshot(null)
            resetTx()
          }}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            mode === 'buy'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('coin.trade.buy')}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('sell')
            setAmount('')
            setTradeSnapshot(null)
            resetTx()
          }}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            mode === 'sell'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('coin.trade.sell')}
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
            <span className="text-sm font-semibold text-foreground">{t('coin.trade.settings')}</span>
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
              {t('coin.trade.maxSlippage')}
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
            {t('coin.trade.slippageHint')}
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
          {t('coin.trade.noContract')}
        </p>
      )}

      {isVoided && (
        <p className="text-xs text-destructive mb-4 rounded-lg bg-destructive/10 px-3 py-2">
          {t('coin.trade.voided')}
        </p>
      )}

      {isGraduating && (
        <p className="text-xs text-primary mb-4 rounded-lg bg-primary/10 px-3 py-2">
          {t('coin.trade.graduating')}
        </p>
      )}

      {tokenStatus?.isGraduated && !isGraduating && !isVoided && (
        <p className="text-xs text-muted-foreground mb-4">
          {t('coin.trade.graduatedDex')}
        </p>
      )}

      <div className="mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">
          {t('coin.trade.amount').replace(
            '{asset}',
            mode === 'buy' ? 'USDC' : token.symbol,
          )}
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
        <p className="text-xs text-muted-foreground mt-1">{amountHint}</p>
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
          <span className="text-muted-foreground">{t('coin.trade.youReceive')}</span>
          <span className="text-foreground flex items-center gap-1">
            {quoteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {quote
              ? `${formatAmount(quote.estimatedOut)} ${mode === 'buy' ? token.symbol : 'USDC'}`
              : '—'}
          </span>
        </div>
        {quote && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('coin.trade.protocolFeeEst')}</span>
            <span className="text-foreground">{quote.feePercent}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('coin.trade.underlying')}</span>
          <span className="text-foreground">{token.underlying}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('coin.trade.leverage')}</span>
          <span className="text-foreground">{token.leverage}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('coin.trade.direction')}</span>
          <span className={token.direction === 'Long' ? 'text-primary' : 'text-destructive'}>
            {directionLabel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('coin.trade.maxSlippageLabel')}</span>
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
          <span className="text-muted-foreground">{t('coin.trade.yourBalance')}</span>
          <span className="text-foreground">
            {formatAmount(balances.token)} {token.symbol}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-muted-foreground">{t('coin.trade.usdcBalance')}</span>
          <span className="text-foreground">{formatAmount(balances.usdc)} USDC</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 text-center">
        {t('coin.trade.footer.lead')}{' '}
        <Link href="https://docs.leap.fun/integrations" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Zap
        </Link>{' '}
        {t('coin.trade.footer.tail')}
      </p>
    </div>

      {portalReady &&
        showTxModal &&
        txState.status !== 'idle' &&
        createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {mode === 'buy' ? t('coin.trade.modal.buyOrder') : t('coin.trade.modal.sellOrder')}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {isPending
                    ? t('coin.trade.modal.inProgress')
                    : txState.status === 'success'
                      ? t('coin.trade.modal.success')
                      : t('coin.trade.modal.failed')}
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
                    <p>{t('coin.trade.modal.confirmWallet')}</p>
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
                  <p className="text-primary">{t('coin.trade.modal.completed')}</p>
                </div>
              )}
            </div>

            <div className="mb-4 space-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.side')}</span>
                <span className={mode === 'buy' ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                  {mode === 'buy' ? t('coin.trade.side.buy') : t('coin.trade.side.sell')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.token')}</span>
                <span className="text-foreground">{token.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.inputAmount')}</span>
                <span className="text-foreground">
                  {modalTradeDetails.amount || '—'} {modalTradeDetails.payLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.estimatedReceive')}</span>
                <span className="text-foreground">{modalTradeDetails.estimatedReceive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.maxSlippageLabel')}</span>
                <span className="text-foreground">{modalTradeDetails.slippage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.protocolFee')}</span>
                <span className="text-foreground">
                  {modalTradeDetails.feePercent != null ? `${modalTradeDetails.feePercent}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.estimatedGas')}</span>
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
                <span className="text-muted-foreground">{t('coin.trade.underlying')}</span>
                <span className="text-foreground">{token.underlying}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('coin.trade.modal.leverageDirection')}</span>
                <span className="text-foreground">
                  {token.leverage}x / {directionLabel}
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
                {t('coin.trade.modal.viewTx')}
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
                      ? t('coin.trade.modal.simRunning')
                      : simulationState.status === 'success'
                        ? t('coin.trade.modal.simPassed')
                        : t('coin.trade.modal.simFailed')}
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
                ? t('coin.trade.modal.processing')
                : txState.status === 'success'
                  ? t('coin.trade.modal.closeCountdown').replace(
                      '{sec}',
                      String(closeCountdown),
                    )
                  : t('coin.trade.modal.close')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
