'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, ExternalLink, LogOut, Check, Loader2, X, CheckCircle2, XCircle, ChevronRight, Coins } from 'lucide-react'
import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { Footer } from '@/components/footer'
import { TokenAvatar } from '@/components/token-avatar'
import { useMarketsContextOptional } from '@/contexts/markets-context'
import { buildMarketIconMap, resolveTradingAssetIcon } from '@/lib/trading-asset-icons'
import { useI18n } from '@/lib/i18n/context'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WithdrawLockedFundsStatus } from '@/hooks/use-withdraw-locked-funds'

const RELAY_BRIDGE_HYPEREVM_URL = `https://app.openocean.finance/swap/hyperevm/USDC/HYPE`

const PROFILE_TABLE_TOKEN_COL =
  'w-[200px] max-w-[200px] min-w-[200px] overflow-hidden'
const PROFILE_TABLE_ADDRESS_COL =
  'w-[11rem] max-w-[11rem] min-w-[11rem] whitespace-nowrap px-3'
const PROFILE_TABLE_AMOUNT_COL = 'min-w-[10rem] whitespace-nowrap px-4'
const PROFILE_TABLE_24H_COL = 'min-w-[4.5rem] whitespace-nowrap px-4'
const PROFILE_TABLE_VALUE_COL = 'min-w-[6.5rem] whitespace-nowrap px-4'
const PROFILE_TABLE_VOLUME_COL = PROFILE_TABLE_AMOUNT_COL
const PROFILE_TABLE_EARNED_COL = PROFILE_TABLE_VALUE_COL
/** Creator Rewards — 3-column layout, fills row width */
const CREATED_TOKENS_TABLE_TOKEN_COL =
  'w-[38%] min-w-[11rem] max-w-[16rem] overflow-hidden'
const CREATED_TOKENS_TABLE_ADDRESS_COL =
  'min-w-[8rem] whitespace-nowrap px-3'
const CREATED_TOKENS_TABLE_VOLUME_COL =
  'w-[6.5rem] min-w-[6.5rem] whitespace-nowrap px-3 text-right'
const CREATED_TOKENS_TABLE_EARNED_COL =
  'w-[6.5rem] min-w-[6.5rem] whitespace-nowrap px-3 text-right'
const PROFILE_TABLE_STICKY_CELL =
  'sticky left-0 z-10 bg-background border-r border-border'
const PROFILE_TABLE_STICKY_HEAD_CELL = `${PROFILE_TABLE_STICKY_CELL} z-20`

/** Align profile labels/headers with app-wide sans typography (see token-list, trade-history). */
const profileSectionLabel =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wider'
const profileTableHeadRow =
  'border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider'

type TabType = 'balances' | 'rewards' | 'transfer' | 'withdraw' | 'wallet'

function stopRowNavigation(e: React.SyntheticEvent) {
  e.preventDefault()
  e.stopPropagation()
}

function CopyAddressButton({ value }: { value: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    stopRowNavigation(e)
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onPointerDown={stopRowNavigation}
      onClick={handleCopy}
      title={t('profile.copyAddress')}
      aria-label={t('profile.copyAddress')}
      className="relative z-30 shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export type ProfileBalanceItem = {
  id: string
  symbol: string
  name: string
  /** Short display address */
  address: string
  /** Full contract address for links and copy */
  rawAddress: string
  /** Normalized logo URL or default SVG / symbol fallback (same as homepage Token.image) */
  image: string
  amountText: string
  change24hText: string
  change24hValue: number | null
  valueText: string
  valueNumber: number
}

export type ProfileRewardTokenItem = {
  id: string
  symbol: string
  name: string
  address: string
  rawAddress: string
  volume: string
  earned: string
  image: string
}

export type ProfileCreatedTokenItem = ProfileRewardTokenItem & {
  /** Bonding proxy from token detail API */
  bondingAddress?: string | null
}

export type ProfilePageViewProps = {
  walletAddress: string | null
  shortAddress: string
  isLoadingWallet: boolean
  authenticated: boolean
  authReady: boolean
  balances?: ProfileBalanceItem[]
  balancesLoading?: boolean
  balancesError?: string | null
  manageWalletUsdc?: string
  manageWalletHype?: string
  manageWalletLoading?: boolean
  manageWalletError?: string | null
  createdTokens?: ProfileCreatedTokenItem[]
  createdTokensLoading?: boolean
  createdTokensError?: string | null
  rewardTokens?: ProfileRewardTokenItem[]
  rewardTokensLoading?: boolean
  rewardTokensError?: string | null
  creatorRewardsClaimable?: string
  creatorRewardsTotalEarned?: string
  creatorRewardsPreviouslyClaimed?: string
  creatorRewardsLoading?: boolean
  creatorRewardsError?: string | null
  creatorRewardsClaiming?: boolean
  creatorRewardsTxStatus?: 'idle' | 'claiming' | 'success' | 'error'
  creatorRewardsTxMessage?: string | null
  creatorRewardsClaimTxHash?: string | null
  onClaimCreatorRewards?: () => void
  onDismissCreatorRewardsTxModal?: () => void
  transferCreatorTransferring?: boolean
  transferCreatorTxStatus?: 'idle' | 'transferring' | 'success' | 'error'
  transferCreatorTxMessage?: string | null
  transferCreatorTxHash?: string | null
  onTransferCreatorRole?: (tokenId: string, newOwner: string) => void
  onDismissTransferCreatorTxModal?: () => void
  withdrawStatuses?: Record<string, WithdrawLockedFundsStatus>
  withdrawStatusesLoading?: boolean
  withdrawingTokenId?: string | null
  withdrawTxStatus?: 'idle' | 'withdrawing' | 'success' | 'error'
  withdrawTxMessage?: string | null
  withdrawTxHash?: string | null
  withdrawUsdcOut?: string | null
  onWithdrawLockedFunds?: (tokenId: string) => void
  onDismissWithdrawTxModal?: () => void
  walletUnavailable?: boolean
  needsReconnect?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
}

export function ProfilePageView({
  walletAddress,
  shortAddress,
  isLoadingWallet,
  authenticated,
  authReady,
  balances = [],
  balancesLoading = false,
  balancesError = null,
  manageWalletUsdc = '0',
  manageWalletHype = '0',
  manageWalletLoading = false,
  manageWalletError = null,
  createdTokens = [],
  createdTokensLoading = false,
  createdTokensError = null,
  rewardTokens = [],
  rewardTokensLoading = false,
  rewardTokensError = null,
  creatorRewardsClaimable = '0.00',
  creatorRewardsTotalEarned = '0.00',
  creatorRewardsPreviouslyClaimed = '0.00',
  creatorRewardsLoading = false,
  creatorRewardsError = null,
  creatorRewardsClaiming = false,
  creatorRewardsTxStatus = 'idle',
  creatorRewardsTxMessage = null,
  creatorRewardsClaimTxHash = null,
  onClaimCreatorRewards,
  onDismissCreatorRewardsTxModal,
  transferCreatorTransferring = false,
  transferCreatorTxStatus = 'idle',
  transferCreatorTxMessage = null,
  transferCreatorTxHash = null,
  onTransferCreatorRole,
  onDismissTransferCreatorTxModal,
  withdrawStatuses = {},
  withdrawStatusesLoading = false,
  withdrawingTokenId = null,
  withdrawTxStatus = 'idle',
  withdrawTxMessage = null,
  withdrawTxHash = null,
  withdrawUsdcOut = null,
  onWithdrawLockedFunds,
  onDismissWithdrawTxModal,
  walletUnavailable = false,
  needsReconnect = false,
  onConnect,
  onDisconnect,
}: ProfilePageViewProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('balances')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'balances', label: t('profile.tab.balances') },
    { id: 'rewards', label: t('profile.tab.rewards') },
    { id: 'transfer', label: t('profile.tab.transfer') },
    { id: 'withdraw', label: t('profile.tab.withdraw') },
    { id: 'wallet', label: t('profile.tab.wallet') },
  ]

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Header />
      <PriceTicker />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {walletUnavailable && (
          <div className="mb-6 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            {t('profile.walletNotConfigured.lead')}{' '}
            <code className="text-foreground">NEXT_PUBLIC_PRIVY_APP_ID</code> in{' '}
            <code className="text-foreground">.env.local</code> {t('profile.walletNotConfigured.tail')}
          </div>
        )}

        {needsReconnect && onConnect && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              {t('profile.reconnect.message')}
            </p>
            <button
              type="button"
              onClick={onConnect}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t('profile.reconnect.button')}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-primary bg-card flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20c0-4 3-6 6-6s6 2 6 6" />
              </svg>
            </div>

            <div>
              <p className={`${profileSectionLabel} mb-1`}>{t('profile.title')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {isLoadingWallet ? (
                  <div className="h-7 w-32 bg-secondary rounded animate-pulse" aria-hidden />
                ) : (
                  <span className="text-xl font-bold text-foreground font-mono">{shortAddress}</span>
                )}
                {walletAddress && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`https://hyperevmscan.io/address/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      {t('profile.viewOnScan')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
                {authReady && !authenticated && onConnect && !walletUnavailable && (
                  <button
                    type="button"
                    onClick={onConnect}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {t('profile.connectWallet')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {authenticated && onDisconnect && (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('profile.disconnect')}</span>
            </button>
          )}
        </div>

        <div className="mb-6 border-b border-border">
          <div className="flex flex-wrap gap-x-6 gap-y-1 md:gap-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'wallet' && (
          <ManageWalletTab
            authenticated={authenticated}
            usdcBalance={manageWalletUsdc}
            hypeBalance={manageWalletHype}
            loading={manageWalletLoading}
            error={manageWalletError}
          />
        )}
        {activeTab === 'balances' && (
          <BalancesTab
            authenticated={authenticated}
            balances={balances}
            loading={balancesLoading}
            error={balancesError}
          />
        )}
        {activeTab === 'rewards' && (
          <CreatorRewardsTab
            authenticated={authenticated}
            rewardTokens={rewardTokens}
            loading={rewardTokensLoading}
            error={rewardTokensError}
            claimable={creatorRewardsClaimable}
            totalEarned={creatorRewardsTotalEarned}
            previouslyClaimed={creatorRewardsPreviouslyClaimed}
            rewardsLoading={creatorRewardsLoading}
            rewardsError={creatorRewardsError}
            claiming={creatorRewardsClaiming}
            txStatus={creatorRewardsTxStatus}
            txMessage={creatorRewardsTxMessage}
            claimTxHash={creatorRewardsClaimTxHash}
            onClaim={onClaimCreatorRewards}
            onDismissTxModal={onDismissCreatorRewardsTxModal}
          />
        )}
        {activeTab === 'transfer' && (
          <TransferOwnershipTab
            authenticated={authenticated}
            createdTokens={createdTokens}
            loading={createdTokensLoading}
            error={createdTokensError}
            transferring={transferCreatorTransferring}
            txStatus={transferCreatorTxStatus}
            txMessage={transferCreatorTxMessage}
            txHash={transferCreatorTxHash}
            onTransfer={onTransferCreatorRole}
            onDismissTxModal={onDismissTransferCreatorTxModal}
          />
        )}
        {activeTab === 'withdraw' && (
          <WithdrawLockedFundsTab
            authenticated={authenticated}
            createdTokens={createdTokens}
            loading={createdTokensLoading}
            error={createdTokensError}
            statuses={withdrawStatuses}
            statusesLoading={withdrawStatusesLoading}
            withdrawingTokenId={withdrawingTokenId}
            txStatus={withdrawTxStatus}
            txMessage={withdrawTxMessage}
            txHash={withdrawTxHash}
            usdcOut={withdrawUsdcOut}
            onWithdraw={onWithdrawLockedFunds}
            onDismissTxModal={onDismissWithdrawTxModal}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}

function ManageWalletTab({
  authenticated,
  usdcBalance,
  hypeBalance,
  loading,
  error,
}: {
  authenticated: boolean
  usdcBalance: string
  hypeBalance: string
  loading: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const marketsContext = useMarketsContextOptional()
  const marketIconMap = useMemo(
    () => buildMarketIconMap(marketsContext?.markets ?? []),
    [marketsContext?.markets],
  )
  const usdcIcon = useMemo(
    () => resolveTradingAssetIcon('USDC', marketIconMap),
    [marketIconMap],
  )
  const hypeIcon = useMemo(
    () => resolveTradingAssetIcon('HYPE', marketIconMap),
    [marketIconMap],
  )
  const displayUsdc = loading ? '—' : usdcBalance
  const displayHype = loading ? '—' : hypeBalance

  return (
    <div className="space-y-6">
      {!authenticated && (
        <div className="px-2 py-2 text-sm text-muted-foreground">{t('profile.wallet.connectPrompt')}</div>
      )}
      {authenticated && error && (
        <div className="px-2 py-2 text-sm text-destructive">{error}</div>
      )}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div>
          <p className={`${profileSectionLabel} mb-1`}>{t('profile.wallet.network')}</p>
          <p className="text-lg font-bold text-foreground">HyperEVM</p>
        </div>
        <div className="text-right">
          <p className={`${profileSectionLabel} mb-1`}>{t('profile.wallet.chainId')}</p>
          <p className="text-lg font-bold text-foreground">999</p>
        </div>
      </div>

      <div className="border-b border-border pb-6">
        <p className={`${profileSectionLabel} mb-4`}>{t('profile.wallet.assetsTitle')}</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <TokenAvatar
                symbol="USDC"
                image={usdcIcon}
                className="w-10 h-10 shrink-0 rounded-full bg-secondary flex items-center justify-center overflow-hidden"
                fallbackClassName="text-sm font-bold text-[#2775CA]"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">USDC</span>
                  <span className="hidden md:inline text-xs font-semibold text-primary">{t('profile.wallet.usdc.tradeCurrency')}</span>
                  <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {t('profile.wallet.erc20')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t('profile.wallet.usdc.name')}</p>
              </div>
            </div>
            <div className="shrink-0 text-right whitespace-nowrap">
              <span className="font-bold text-foreground">{displayUsdc}</span>
              <span className="text-muted-foreground ml-1 text-sm">USDC</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <TokenAvatar
                symbol="HYPE"
                image={hypeIcon}
                className="w-10 h-10 shrink-0 rounded-full bg-secondary flex items-center justify-center overflow-hidden"
                fallbackClassName="text-lg"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">HYPE</span>
                  <span className="hidden md:inline text-xs font-semibold text-primary">{t('profile.wallet.hype.gasToken')}</span>
                  <span className="hidden md:inline text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {t('profile.wallet.native')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t('profile.wallet.hype.name')}</p>
              </div>
            </div>
            <div className="shrink-0 text-right whitespace-nowrap">
              <span className="font-bold text-foreground">{displayHype}</span>
              <span className="text-muted-foreground ml-1 text-sm">HYPE</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('profile.wallet.bridge.lead')}{' '}
        <a
          href={RELAY_BRIDGE_HYPEREVM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {t('profile.wallet.bridge.link')}
        </a>
        {t('profile.wallet.bridge.tail')}
      </p>
    </div>
  )
}

function BalancesTab({
  authenticated,
  balances,
  loading,
  error,
}: {
  authenticated: boolean
  balances: ProfileBalanceItem[]
  loading: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const router = useRouter()
  const totalValue = balances.reduce((sum, item) => sum + item.valueNumber, 0)
  const totalValueText = `$${totalValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  const showEmptyState = authenticated && !loading && !error && balances.length === 0

  if (!authenticated) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.balances.connectPrompt')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">{t('profile.balances.loading')}</div>
    )
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-destructive">{error}</div>
  }

  if (showEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-foreground mb-4">{t('profile.balances.empty.title')}</p>
        <p className="text-sm text-muted-foreground max-w-lg mb-6">
          {t('profile.balances.empty.desc')}
        </p>
        <Link
          href="/"
          className="px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('profile.balances.empty.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <p className={`${profileSectionLabel} mb-2`}>{t('profile.balances.totalValue')}</p>
        <p className="text-3xl font-bold text-foreground">{totalValueText}</p>
      </div>

      <div className="-mx-2 overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead>
            <tr className={profileTableHeadRow}>
              <th
                className={`${PROFILE_TABLE_STICKY_HEAD_CELL} ${PROFILE_TABLE_TOKEN_COL} py-2 pl-2 pr-4`}
              >
                {t('profile.table.token')}
              </th>
              <th className={`${PROFILE_TABLE_ADDRESS_COL} py-2`}>{t('profile.table.address')}</th>
              <th className={`${PROFILE_TABLE_AMOUNT_COL} py-2`}>{t('profile.table.amount')}</th>
              <th className={`${PROFILE_TABLE_24H_COL} py-2`}>{t('profile.table.24h')}</th>
              <th className={`${PROFILE_TABLE_VALUE_COL} py-2`}>{t('profile.table.value')}</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((token) => {
              const href = `/coin/${token.symbol.toLowerCase()}?address=${encodeURIComponent(token.rawAddress || token.address)}`
              return (
                <tr
                  key={token.id}
                  className="group cursor-pointer border-b border-border transition-colors hover:bg-secondary/30"
                  onClick={() => router.push(href)}
                >
                  <td
                    className={`${PROFILE_TABLE_STICKY_CELL} ${PROFILE_TABLE_TOKEN_COL} py-4 pl-2 pr-4 group-hover:bg-secondary/30`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TokenAvatar
                        image={token.image}
                        symbol={token.symbol}
                        className="w-10 h-10 shrink-0 rounded-lg bg-card border border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate" title={token.symbol}>
                          {token.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={token.name}>
                          {token.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`relative z-20 bg-background py-4 ${PROFILE_TABLE_ADDRESS_COL}`}
                    onClick={stopRowNavigation}
                  >
                    <div className="inline-flex items-center gap-1">
                      <span
                        className="text-sm text-muted-foreground font-mono"
                        title={token.rawAddress || token.address}
                      >
                        {token.address}
                      </span>
                      <CopyAddressButton value={token.rawAddress || token.address} />
                    </div>
                  </td>
                  <td className={`${PROFILE_TABLE_AMOUNT_COL} py-4 text-sm text-foreground`}>
                    {token.amountText}
                  </td>
                  <td
                    className={`${PROFILE_TABLE_24H_COL} py-4 text-sm ${token.change24hValue == null
                      ? 'text-muted-foreground'
                      : token.change24hValue >= 0
                        ? 'text-primary'
                        : 'text-destructive'
                      }`}
                  >
                    {token.change24hText}
                  </td>
                  <td className={`${PROFILE_TABLE_VALUE_COL} py-4 text-sm text-foreground`}>
                    {token.valueText}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreatorRewardsTab({
  authenticated,
  rewardTokens,
  loading,
  error,
  claimable,
  totalEarned,
  previouslyClaimed,
  rewardsLoading,
  rewardsError,
  claiming,
  txStatus,
  txMessage,
  claimTxHash,
  onClaim,
  onDismissTxModal,
}: {
  authenticated: boolean
  rewardTokens: ProfileRewardTokenItem[]
  loading: boolean
  error: string | null
  claimable: string
  totalEarned: string
  previouslyClaimed: string
  rewardsLoading: boolean
  rewardsError: string | null
  claiming: boolean
  txStatus: 'idle' | 'claiming' | 'success' | 'error'
  txMessage: string | null
  claimTxHash: string | null
  onClaim?: () => void
  onDismissTxModal?: () => void
}) {
  const { t } = useI18n()
  const router = useRouter()
  const claimableNumber = Number.parseFloat(claimable.replace(/,/g, '')) || 0
  const canClaim =
    authenticated && claimableNumber > 0 && !rewardsLoading && !claiming
  const claimableLabel = `$${claimable}`
  const claimButtonLabel = claiming
    ? t('profile.rewards.claiming')
    : `${t('profile.rewards.claim')} $${claimable} USDC`
  const showTxModal = txStatus !== 'idle'
  const isPending = txStatus === 'claiming'
  const showNoTokensEmptyState =
    authenticated && !loading && !error && rewardTokens.length === 0

  if (!authenticated) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.rewards.connectPrompt')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.rewards.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-destructive">{error}</div>
    )
  }

  if (showNoTokensEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-foreground mb-4">{t('profile.rewards.empty.title')}</p>
        <p className="text-sm text-muted-foreground max-w-lg mb-6">
          {t('profile.rewards.empty.desc')}
        </p>
        <Link
          href="/create"
          className="px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('profile.rewards.empty.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center py-8 border-b border-border">
        <p className={`${profileSectionLabel} mb-2`}>{t('profile.rewards.claimable')}</p>
        <p className="text-5xl font-bold text-primary mb-6">{claimableLabel}</p>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={!canClaim}
            onClick={onClaim}
            className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
            {claimButtonLabel}
          </button>
        </div>
        {rewardsError && <p className="mt-3 text-sm text-destructive">{rewardsError}</p>}
        {claimTxHash && (
          <a
            href={`https://hyperevmscan.io/tx/${claimTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
          >
            {t('profile.rewards.viewClaimTx')}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <div className="flex gap-16 mt-8">
          <div className="text-center">
            <p className={`${profileSectionLabel} mb-1`}>{t('profile.rewards.totalEarned')}</p>
            <p className="text-xl font-bold text-foreground">${totalEarned}</p>
          </div>
          <div className="text-center">
            <p className={`${profileSectionLabel} mb-1`}>{t('profile.rewards.previouslyClaimed')}</p>
            <p className="text-xl font-bold text-foreground">${previouslyClaimed}</p>
          </div>
        </div>
      </div>

      <div className="-mx-2 overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className={profileTableHeadRow}>
              <th
                className={`${PROFILE_TABLE_STICKY_HEAD_CELL} ${CREATED_TOKENS_TABLE_TOKEN_COL} py-2 pl-2 pr-4`}
              >
                {t('profile.table.token')}
              </th>
              <th className={`${CREATED_TOKENS_TABLE_ADDRESS_COL} py-2`}>{t('profile.table.address')}</th>
              <th className={`${CREATED_TOKENS_TABLE_VOLUME_COL} py-2`}>{t('profile.table.volume24h')}</th>
              <th className={`${CREATED_TOKENS_TABLE_EARNED_COL} py-2`}>{t('profile.table.earned')}</th>
            </tr>
          </thead>
          <tbody>
            {rewardTokens.map((token) => {
              const href = `/coin/${token.symbol.toLowerCase()}?address=${encodeURIComponent(token.rawAddress || token.address)}`
              return (
                <tr
                  key={token.id}
                  className="group border-b border-border transition-colors hover:bg-secondary/30"
                >
                  <td
                    className={`${PROFILE_TABLE_STICKY_CELL} ${CREATED_TOKENS_TABLE_TOKEN_COL} py-4 pl-2 pr-4 group-hover:bg-secondary/30`}
                  >
                    <div
                      onClick={() => router.push(href)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                    >
                      <TokenAvatar
                        image={token.image}
                        symbol={token.symbol}
                        className="w-10 h-10 shrink-0 rounded-lg bg-card border border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate" title={token.symbol}>
                          {token.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={token.name}>
                          {token.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`relative z-20 bg-background py-4 ${CREATED_TOKENS_TABLE_ADDRESS_COL}`}
                    onClick={stopRowNavigation}
                  >
                    <div className="inline-flex max-w-full items-center gap-1">
                      <span
                        className="truncate text-sm text-muted-foreground font-mono"
                        title={token.rawAddress || token.address}
                      >
                        {token.address}
                      </span>
                      <CopyAddressButton value={token.rawAddress || token.address} />
                    </div>
                  </td>
                  <td
                    className={`${CREATED_TOKENS_TABLE_VOLUME_COL} py-4 text-sm font-medium text-foreground tabular-nums`}
                  >
                    {token.volume}
                  </td>
                  <td
                    className={`${CREATED_TOKENS_TABLE_EARNED_COL} py-4 text-sm font-medium text-foreground tabular-nums`}
                  >
                    {token.earned}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('profile.rewards.feeNote')}
      </p>

      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('profile.rewards.modal.title')}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {isPending
                    ? t('profile.tx.inProgress')
                    : txStatus === 'success'
                      ? t('profile.tx.success')
                      : t('profile.tx.failed')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onDismissTxModal}
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
                    <p>{t('profile.tx.confirmClaim')}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
              {txStatus === 'error' && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 animate-pulse text-destructive" />
                  <p className="text-destructive">{txMessage ?? t('profile.tx.claimFailed')}</p>
                </div>
              )}
              {txStatus === 'success' && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 animate-bounce text-primary" />
                  <p className="text-primary">{t('profile.tx.claimSuccess')}</p>
                </div>
              )}
            </div>

            {txStatus === 'success' && claimTxHash && (
              <a
                href={`https://hyperevmscan.io/tx/${claimTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('profile.tx.viewDetails')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <button
              type="button"
              onClick={onDismissTxModal}
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? t('profile.tx.processing') : t('profile.tx.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TransferOwnershipTab({
  authenticated,
  createdTokens,
  loading,
  error,
  transferring,
  txStatus,
  txMessage,
  txHash,
  onTransfer,
  onDismissTxModal,
}: {
  authenticated: boolean
  createdTokens: ProfileCreatedTokenItem[]
  loading: boolean
  error: string | null
  transferring: boolean
  txStatus: 'idle' | 'transferring' | 'success' | 'error'
  txMessage: string | null
  txHash: string | null
  onTransfer?: (tokenId: string, newOwner: string) => void
  onDismissTxModal?: () => void
}) {
  const { t } = useI18n()
  const [newOwner, setNewOwner] = useState('')
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')

  useEffect(() => {
    if (createdTokens.length === 0) {
      setSelectedTokenId('')
      return
    }
    const exists = createdTokens.some((token) => token.id === selectedTokenId)
    if (!exists) {
      setSelectedTokenId(createdTokens[0]!.id)
    }
  }, [createdTokens, selectedTokenId])

  useEffect(() => {
    if (txStatus === 'success') {
      setNewOwner('')
    }
  }, [txStatus])

  const selectedToken = createdTokens.find((t) => t.id === selectedTokenId)
  const newOwnerTrimmed = newOwner.trim()
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(newOwnerTrimmed)
  const addressError =
    newOwnerTrimmed.length > 0 && !isValidAddress
      ? t('profile.transfer.addressError')
      : null
  const canTransfer =
    authenticated &&
    !!selectedTokenId &&
    isValidAddress &&
    !transferring

  const showTxModal = txStatus !== 'idle'
  const isPending = txStatus === 'transferring'
  const showNoTokensEmptyState =
    authenticated && !loading && !error && createdTokens.length === 0

  if (!authenticated) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.transfer.connectPrompt')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.transfer.loading')}
      </div>
    )
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-destructive">{error}</div>
  }

  if (showNoTokensEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-foreground mb-4">{t('profile.transfer.empty.title')}</p>
        <p className="text-sm text-muted-foreground max-w-lg">
          {t('profile.transfer.empty.desc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{t('profile.transfer.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('profile.transfer.desc')}
        </p>
      </div>

      <div className="rounded-lg border-l-2 border-amber-500 bg-amber-500/5 p-4">
        <p className={`${profileSectionLabel} text-amber-500 mb-1`}>{t('profile.transfer.beforeTitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('profile.transfer.beforeDesc.lead')}{' '}
          <span className="text-foreground font-medium">{t('profile.transfer.beforeDesc.tab')}</span>{' '}
          {t('profile.transfer.beforeDesc.tail')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {/* Token picker */}
        <div className="space-y-3">
          <p className={profileSectionLabel}>
            {createdTokens.length === 1 ? t('profile.transfer.yourToken') : t('profile.transfer.selectToken')}
          </p>
          <div
            className="space-y-2"
            role="radiogroup"
            aria-label={t('profile.transfer.tokenAriaLabel')}
          >
            {createdTokens.map((token) => {
              const isSelected = token.id === selectedTokenId
              return (
                <button
                  key={token.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={transferring}
                  onClick={() => setSelectedTokenId(token.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/20'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TokenAvatar
                      image={token.image}
                      symbol={token.symbol}
                      className="w-10 h-10 shrink-0 rounded-lg bg-card border border-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                    </div>
                    <div
                      className="hidden sm:flex shrink-0 items-center gap-1 max-w-[8.5rem]"
                      onClick={stopRowNavigation}
                      onKeyDown={stopRowNavigation}
                      role="presentation"
                    >
                      <span
                        className="truncate text-xs text-muted-foreground font-mono"
                        title={token.rawAddress}
                      >
                        {token.address}
                      </span>
                      <CopyAddressButton value={token.rawAddress} />
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-primary rotate-90' : 'text-muted-foreground'
                        }`}
                      aria-hidden
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Transfer form — sticky on desktop, always tied to selection */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5 shadow-sm">
            <div>
              <p className={`${profileSectionLabel} mb-3`}>{t('profile.transfer.details')}</p>
              {selectedToken ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                  <TokenAvatar
                    image={selectedToken.image}
                    symbol={selectedToken.symbol}
                    className="w-11 h-11 shrink-0 rounded-lg bg-card border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{selectedToken.symbol}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span
                        className="truncate text-xs text-muted-foreground font-mono"
                        title={selectedToken.rawAddress}
                      >
                        {selectedToken.rawAddress}
                      </span>
                      <CopyAddressButton value={selectedToken.rawAddress} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('profile.transfer.selectFromList')}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="transfer-new-creator"
                className={profileSectionLabel}
              >
                {t('profile.transfer.newCreatorLabel')}
              </label>
              <input
                id="transfer-new-creator"
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                disabled={transferring || !selectedToken}
                autoComplete="off"
                spellCheck={false}
                className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono text-sm disabled:opacity-50"
              />
              {addressError ? (
                <p className="text-xs text-destructive">{addressError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('profile.transfer.newCreatorHint')}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!canTransfer}
              onClick={() => onTransfer?.(selectedTokenId, newOwnerTrimmed)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {transferring && <Loader2 className="h-4 w-4 animate-spin" />}
              {transferring
                ? t('profile.transfer.confirmInWallet')
                : selectedToken
                  ? `${t('profile.transfer.transfer')} ${selectedToken.symbol} ${t('profile.transfer.creatorRole')}`
                  : `${t('profile.transfer.transfer')} ${t('profile.transfer.creatorRole')}`}
            </button>
          </div>
        </div>
      </div>

      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('profile.transfer.modal.title')}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {isPending
                    ? t('profile.tx.inProgress')
                    : txStatus === 'success'
                      ? t('profile.tx.success')
                      : t('profile.tx.failed')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onDismissTxModal}
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
                    <p>{t('profile.transfer.confirmInWalletModal')}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
              {txStatus === 'error' && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 animate-pulse text-destructive" />
                  <p className="text-destructive">{txMessage ?? t('profile.transfer.failed')}</p>
                </div>
              )}
              {txStatus === 'success' && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 animate-bounce text-primary" />
                  <p className="text-primary">{t('profile.transfer.success')}</p>
                </div>
              )}
            </div>

            {selectedToken && (
              <div className="mb-4 space-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('profile.table.token')}</span>
                  <span className="font-semibold text-foreground">{selectedToken.symbol}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{t('profile.transfer.modal.contract')}</span>
                  <span className="text-foreground font-mono text-xs truncate">{selectedToken.rawAddress}</span>
                </div>
                {newOwnerTrimmed && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{t('profile.transfer.modal.newCreator')}</span>
                    <span className="text-foreground font-mono text-xs truncate">{newOwnerTrimmed}</span>
                  </div>
                )}
              </div>
            )}

            {txStatus === 'success' && txHash && (
              <a
                href={`https://hyperevmscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('profile.tx.viewDetails')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <button
              type="button"
              onClick={onDismissTxModal}
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? t('profile.tx.processing') : t('profile.tx.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function WithdrawLockedFundsTab({
  authenticated,
  createdTokens,
  loading,
  error,
  statuses,
  statusesLoading,
  withdrawingTokenId,
  txStatus,
  txMessage,
  txHash,
  usdcOut,
  onWithdraw,
  onDismissTxModal,
}: {
  authenticated: boolean
  createdTokens: ProfileCreatedTokenItem[]
  loading: boolean
  error: string | null
  statuses: Record<string, WithdrawLockedFundsStatus>
  statusesLoading: boolean
  withdrawingTokenId: string | null
  txStatus: 'idle' | 'withdrawing' | 'success' | 'error'
  txMessage: string | null
  txHash: string | null
  usdcOut: string | null
  onWithdraw?: (tokenId: string) => void
  onDismissTxModal?: () => void
}) {
  const { t } = useI18n()
  const showTxModal = txStatus !== 'idle'
  const isPending = txStatus === 'withdrawing'
  const showNoTokensEmptyState =
    authenticated && !loading && !error && createdTokens.length === 0

  if (!authenticated) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.withdraw.connectPrompt')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('profile.withdraw.loading')}
      </div>
    )
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{t('profile.withdraw.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{t('profile.withdraw.desc')}</p>
      </div>

      <div className="rounded-lg border-l-2 border-amber-500 bg-amber-500/5 p-4">
        <p className={`${profileSectionLabel} text-amber-500 mb-1`}>{t('profile.withdraw.howTitle')}</p>
        <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
          <li>{t('profile.withdraw.step1')}</li>
          <li>{t('profile.withdraw.step2')}</li>
          <li>{t('profile.withdraw.step3')}</li>
        </ol>
      </div>

      {showNoTokensEmptyState ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-foreground mb-4">{t('profile.withdraw.empty.title')}</p>
          <p className="text-sm text-muted-foreground max-w-lg">{t('profile.withdraw.empty.desc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {createdTokens.map((token) => {
            const status = statuses[token.id]
            const isThisWithdrawing = withdrawingTokenId === token.id
            const canWithdraw = !!status?.withdrawable && !isThisWithdrawing
            const tipKey = status?.reasonKey
            const statusLabel = status?.withdrawn
              ? t('profile.withdraw.status.withdrawn')
              : status?.withdrawable
                ? t('profile.withdraw.status.ready')
                : statusesLoading && !status
                  ? t('profile.withdraw.status.checking')
                  : tipKey
                    ? t(tipKey)
                    : t('profile.withdraw.status.notReady')

            const withdrawButton = (
              <button
                type="button"
                disabled={!canWithdraw}
                onClick={() => onWithdraw?.(token.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isThisWithdrawing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                {status?.withdrawn
                  ? t('profile.withdraw.button.withdrawn')
                  : isThisWithdrawing
                    ? t('profile.withdraw.button.withdrawing')
                    : t('profile.withdraw.button')}
              </button>
            )

            return (
              <div
                key={token.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TokenAvatar
                    image={token.image}
                    symbol={token.symbol}
                    className="w-10 h-10 shrink-0 rounded-lg bg-card border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`max-w-[14rem] text-xs font-medium ${status?.withdrawn
                        ? 'text-muted-foreground'
                        : status?.withdrawable
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                  >
                    {statusLabel}
                  </span>
                  {!canWithdraw && tipKey ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">{withdrawButton}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {t(tipKey)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    withdrawButton
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('profile.withdraw.modal.title')}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {isPending
                    ? t('profile.tx.inProgress')
                    : txStatus === 'success'
                      ? t('profile.tx.success')
                      : t('profile.tx.failed')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onDismissTxModal}
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
                    <p>{t('profile.withdraw.confirmInWallet')}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
              {txStatus === 'error' && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 animate-pulse text-destructive" />
                  <p className="text-destructive">{txMessage ?? t('profile.withdraw.failed')}</p>
                </div>
              )}
              {txStatus === 'success' && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 animate-bounce text-primary" />
                  <p className="text-primary">
                    {usdcOut
                      ? t('profile.withdraw.success.amount').replace('{amount}', usdcOut)
                      : t('profile.withdraw.success')}
                  </p>
                </div>
              )}
            </div>

            {txStatus === 'success' && txHash && (
              <a
                href={`https://hyperevmscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('profile.tx.viewDetails')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <button
              type="button"
              onClick={onDismissTxModal}
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? t('profile.tx.processing') : t('profile.tx.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
