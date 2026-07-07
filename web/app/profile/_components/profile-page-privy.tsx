'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  usePrivy,
  useWallets,
  useActiveWallet,
  getEmbeddedConnectedWallet,
} from '@privy-io/react-auth'
import {
  ProfilePageView,
  type ProfileBalanceItem,
  type ProfileCreatedTokenItem,
  type ProfileRewardTokenItem,
  type ProfileRedeemStatus,
} from './profile-page-view'
import { IS_PLAYGROUND } from '@/lib/protocol-profile'
import { usePlaygroundUnwind } from '@/hooks/use-playground-unwind'
import { getUserPositions } from '@/lib/apis/meme-server/user-positions.api'
import { getTokenDetail } from '@/lib/apis/meme-server/token-detail.api'
import { getUserCreatedTokens } from '@/lib/apis/meme-server/user-created.api'
import { getUserRewards } from '@/lib/apis/meme-server/user-rewards.api'
import type { UserRewardDto } from '@/lib/apis/meme-server/types'
import { resolveTokenLogoSrc } from '@/lib/image-src'
import { toHexAddress } from '@/lib/contracts/address'
import { CONTRACTS, USDC_DECIMALS } from '@/lib/contracts/config'
import {
  isMeaningfulUserPositionBalance,
  normalizeUserPositionHoldAmount,
} from '@/lib/apis/meme-server/position-filter'
import { useTransferCreator } from '@/hooks/use-transfer-creator'
import { publicClient } from '@/lib/contracts/client'
import { readErc20Balance } from '@/lib/contracts/trade-quote'
import { useCreatorRewards } from '@/hooks/use-creator-rewards'
import { formatShortAddress } from '@/lib/utils'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import { usePrivyWalletLogin } from '@/hooks/use-privy-wallet-login'
import { getViewerWalletAddress } from '@/lib/wallet/test-wallet'

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatAmountCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatUsdFixed2(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  // API may return 0.25 (=25%) or 25 (=25%)
  return Math.abs(value) <= 1 ? value * 100 : value
}

function formatChangePercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '--'
  const normalized = normalizePercent(value)
  const sign = normalized >= 0 ? '+' : ''
  return `${sign}${normalized.toFixed(2)}%`
}

function formatAssetBalance(value: number, maxDecimals = 6): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })
}

function bigintToNumber(value: bigint, decimals: number): number {
  return Number(value) / 10 ** decimals
}

function formatAddressCompact(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

async function mapCreatedTokenItems(
  items: Awaited<ReturnType<typeof getUserCreatedTokens>>,
): Promise<ProfileCreatedTokenItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const rawAddress = item.address?.trim() || ''
      let bondingAddress = toHexAddress(item.bonding) ?? null
      if (!bondingAddress && rawAddress) {
        try {
          const detail = await getTokenDetail(rawAddress)
          bondingAddress = toHexAddress(detail.bonding) ?? null
        } catch {
          bondingAddress = null
        }
      }
      const volume = toNumber(item.tradeVolume24h ?? item.tradeVolume)
      return {
        id: rawAddress || `${item.symbol}-${item.timestamp ?? Date.now()}`,
        symbol: item.symbol?.trim() || 'UNKNOWN',
        name: item.name?.trim() || item.symbol?.trim() || 'Unknown Token',
        address: formatAddressCompact(rawAddress),
        rawAddress,
        bondingAddress,
        volume: formatUsdFixed2(volume),
        earned: '$0.00',
        image: resolveTokenLogoSrc(item.logo),
      }
    }),
  )
}

function mapUserRewardItems(items: UserRewardDto[]): ProfileRewardTokenItem[] {
  return items.map((item) => {
    const rawAddress = item.address?.trim() || ''
    return {
      id: String(item.tokenId ?? (rawAddress || `${item.symbol}-${Date.now()}`)),
      symbol: item.symbol?.trim() || 'UNKNOWN',
      name: item.name?.trim() || item.symbol?.trim() || 'Unknown Token',
      address: formatAddressCompact(rawAddress),
      rawAddress,
      volume: formatUsdFixed2(toNumber(item.tradeVolume24h)),
      earned: formatUsdFixed2(toNumber(item.accruedAmount)),
      image: resolveTokenLogoSrc(item.logo),
    }
  })
}

async function loadUserRewardTokenItems(
  account: string,
): Promise<ProfileRewardTokenItem[]> {
  const rows = await getUserRewards(account, CONTRACTS.creatorRewards)
  return mapUserRewardItems(rows)
}

export function ProfilePagePrivy() {
  const router = useRouter()
  const { ready: privyReady, authenticated, logout } = usePrivy()
  const session = useWalletSessionOptional()
  const loginWithWallet = usePrivyWalletLogin()
  const { wallets, ready: walletsReady } = useWallets()
  const { wallet: activeWallet } = useActiveWallet()
  const selectedWallet = useMemo(() => {
    if (activeWallet && 'address' in activeWallet && activeWallet.address) {
      return activeWallet
    }
    const embedded = getEmbeddedConnectedWallet(wallets)
    return embedded ?? wallets[0] ?? null
  }, [activeWallet, wallets])

  const walletAddress = useMemo(() => {
    if (selectedWallet && 'address' in selectedWallet && selectedWallet.address) {
      return getViewerWalletAddress(selectedWallet.address)
    }
    return null
  }, [selectedWallet])

  const shortAddress = walletAddress ? formatShortAddress(walletAddress) : '—'
  const isLoadingWallet = !privyReady || (authenticated && !walletsReady)
  const [balances, setBalances] = useState<ProfileBalanceItem[]>([])
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [balancesError, setBalancesError] = useState<string | null>(null)
  const [manageWalletUsdc, setManageWalletUsdc] = useState('0')
  const [manageWalletHype, setManageWalletHype] = useState('0')
  const [manageWalletLoading, setManageWalletLoading] = useState(false)
  const [manageWalletError, setManageWalletError] = useState<string | null>(null)
  const [createdTokens, setCreatedTokens] = useState<ProfileCreatedTokenItem[]>([])
  const [createdTokensLoading, setCreatedTokensLoading] = useState(false)
  const [createdTokensError, setCreatedTokensError] = useState<string | null>(null)
  const [rewardTokens, setRewardTokens] = useState<ProfileRewardTokenItem[]>([])
  const [rewardTokensLoading, setRewardTokensLoading] = useState(false)
  const [rewardTokensError, setRewardTokensError] = useState<string | null>(null)
  const walletForChain =
    selectedWallet &&
    'address' in selectedWallet &&
    selectedWallet.type === 'ethereum' &&
    'getEthereumProvider' in selectedWallet
      ? {
          address: selectedWallet.address as `0x${string}`,
          getEthereumProvider: selectedWallet.getEthereumProvider?.bind(selectedWallet),
          type: selectedWallet.type,
        }
      : null

  const creatorRewards = useCreatorRewards(walletForChain)
  const transferCreator = useTransferCreator(walletForChain)
  const playgroundUnwind = usePlaygroundUnwind(walletForChain)

  const [redeemStatuses, setRedeemStatuses] = useState<Record<string, ProfileRedeemStatus>>({})
  const [redeemStatusesLoading, setRedeemStatusesLoading] = useState(false)
  const [redeemingTokenId, setRedeemingTokenId] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    async function loadBalances() {
      if (!authenticated || !walletAddress) {
        if (!disposed) {
          setBalances([])
          setBalancesLoading(false)
          setBalancesError(null)
        }
        return
      }
      setBalancesLoading(true)
      setBalancesError(null)
      try {
        const positions = await getUserPositions(walletAddress)
        const nextBalances: ProfileBalanceItem[] = []
        for (const item of positions) {
          const holdAmount = normalizeUserPositionHoldAmount(item.holdAmount, item.decimals)
          const price = toNumber(item.price)
          const value = holdAmount * price
          if (!isMeaningfulUserPositionBalance(item)) continue

          const rawAddress = item.address?.trim() || ''
          nextBalances.push({
            id: item.id,
            symbol: item.symbol?.trim() || 'UNKNOWN',
            name: item.name?.trim() || item.symbol?.trim() || 'Unknown Token',
            address: formatAddressCompact(rawAddress),
            rawAddress,
            image: resolveTokenLogoSrc(item.logo),
            amountText: formatAmountCompact(holdAmount),
            change24hText: formatChangePercent(
              item.priceChangePercent24h != null
                ? toNumber(item.priceChangePercent24h)
                : item.changePercent24h != null
                  ? toNumber(item.changePercent24h)
                  : item.changePercent != null
                    ? toNumber(item.changePercent)
                    : null,
            ),
            change24hValue:
              item.priceChangePercent24h != null
                ? normalizePercent(toNumber(item.priceChangePercent24h))
                : item.changePercent24h != null
                  ? normalizePercent(toNumber(item.changePercent24h))
                  : item.changePercent != null
                    ? normalizePercent(toNumber(item.changePercent))
                    : null,
            valueText: formatUsdFixed2(value),
            valueNumber: value,
          })
        }
        if (!disposed) setBalances(nextBalances)
      } catch (error) {
        if (!disposed) {
          setBalances([])
          setBalancesError(error instanceof Error ? error.message : 'Failed to load balances')
        }
      } finally {
        if (!disposed) setBalancesLoading(false)
      }
    }
    void loadBalances()
    return () => {
      disposed = true
    }
  }, [authenticated, walletAddress])

  useEffect(() => {
    let disposed = false
    async function loadCreatedTokens() {
      if (!authenticated || !walletAddress) {
        if (!disposed) {
          setCreatedTokens([])
          setCreatedTokensLoading(false)
          setCreatedTokensError(null)
        }
        return
      }
      setCreatedTokensLoading(true)
      setCreatedTokensError(null)
      try {
        const items = await getUserCreatedTokens(walletAddress)
        const enriched = await mapCreatedTokenItems(items)
        if (!disposed) setCreatedTokens(enriched)
      } catch (error) {
        if (!disposed) {
          setCreatedTokens([])
          setCreatedTokensError(
            error instanceof Error ? error.message : 'Failed to load created tokens',
          )
        }
      } finally {
        if (!disposed) setCreatedTokensLoading(false)
      }
    }
    void loadCreatedTokens()
    return () => {
      disposed = true
    }
  }, [authenticated, walletAddress])

  useEffect(() => {
    let disposed = false
    async function loadRewardTokens() {
      if (!authenticated || !walletAddress) {
        if (!disposed) {
          setRewardTokens([])
          setRewardTokensLoading(false)
          setRewardTokensError(null)
        }
        return
      }
      setRewardTokensLoading(true)
      setRewardTokensError(null)
      try {
        const items = await loadUserRewardTokenItems(walletAddress)
        if (!disposed) setRewardTokens(items)
      } catch (error) {
        if (!disposed) {
          setRewardTokens([])
          setRewardTokensError(
            error instanceof Error ? error.message : 'Failed to load creator rewards',
          )
        }
      } finally {
        if (!disposed) setRewardTokensLoading(false)
      }
    }
    void loadRewardTokens()
    return () => {
      disposed = true
    }
  }, [authenticated, walletAddress])

  useEffect(() => {
    if (creatorRewards.txState.status !== 'success' || !walletAddress) return
    void loadUserRewardTokenItems(walletAddress)
      .then(setRewardTokens)
      .catch(() => {})
  }, [creatorRewards.txState.status, walletAddress])

  useEffect(() => {
    let disposed = false
    async function loadManageWalletBalances() {
      if (!authenticated || !walletAddress) {
        if (!disposed) {
          setManageWalletUsdc('0')
          setManageWalletHype('0')
          setManageWalletLoading(false)
          setManageWalletError(null)
        }
        return
      }
      setManageWalletLoading(true)
      setManageWalletError(null)
      try {
        const [usdcRaw, hypeRaw] = await Promise.all([
          readErc20Balance(walletAddress as `0x${string}`, CONTRACTS.usdc),
          publicClient.getBalance({ address: walletAddress as `0x${string}` }),
        ])
        const usdc = bigintToNumber(usdcRaw, USDC_DECIMALS)
        const hype = bigintToNumber(hypeRaw, 18)
        if (!disposed) {
          setManageWalletUsdc(formatAssetBalance(usdc, 2))
          setManageWalletHype(formatAssetBalance(hype, 6))
        }
      } catch (error) {
        if (!disposed) {
          setManageWalletUsdc('0')
          setManageWalletHype('0')
          setManageWalletError(
            error instanceof Error ? error.message : 'Failed to load on-chain wallet balances',
          )
        }
      } finally {
        if (!disposed) setManageWalletLoading(false)
      }
    }
    void loadManageWalletBalances()
    const timer = window.setInterval(() => {
      void loadManageWalletBalances()
    }, 12_000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [authenticated, walletAddress])

  useEffect(() => {
    let disposed = false
    async function loadRedeemStatuses() {
      if (!IS_PLAYGROUND || !authenticated || !walletAddress || createdTokens.length === 0) {
        if (!disposed) {
          setRedeemStatuses({})
          setRedeemStatusesLoading(false)
        }
        return
      }
      setRedeemStatusesLoading(true)
      try {
        const entries = await Promise.all(
          createdTokens.map(async (token) => {
            if (!token.rawAddress) return null
            try {
              const status = await playgroundUnwind.getStatus({
                tokenAddress: token.rawAddress,
                bondingAddress: token.bondingAddress,
              })
              return [token.id, status] as const
            } catch {
              return null
            }
          }),
        )
        if (!disposed) {
          const next: Record<string, ProfileRedeemStatus> = {}
          for (const entry of entries) {
            if (entry) next[entry[0]] = entry[1]
          }
          setRedeemStatuses(next)
        }
      } finally {
        if (!disposed) setRedeemStatusesLoading(false)
      }
    }
    void loadRedeemStatuses()
    return () => {
      disposed = true
    }
    // playgroundUnwind.getStatus is stable per walletAddress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, walletAddress, createdTokens])

  const handleRedeemLockedFunds = async (tokenId: string) => {
    const token = createdTokens.find((t) => t.id === tokenId)
    if (!token?.rawAddress) return
    setRedeemingTokenId(tokenId)
    try {
      await playgroundUnwind.unwind({
        tokenAddress: token.rawAddress,
        bondingAddress: token.bondingAddress,
      })
      const status = await playgroundUnwind.getStatus({
        tokenAddress: token.rawAddress,
        bondingAddress: token.bondingAddress,
      })
      setRedeemStatuses((prev) => ({ ...prev, [tokenId]: status }))
    } catch {
      // error surfaced via txState
    } finally {
      setRedeemingTokenId(null)
    }
  }

  const redeemUsdcOut =
    playgroundUnwind.txState.status === 'success'
      ? bigintToNumber(playgroundUnwind.txState.usdcOut, USDC_DECIMALS).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
      : null

  const handleDisconnect = async () => {
    await logout()
    router.push('/')
  }

  const handleTransferCreatorRole = async (tokenId: string, newOwner: string) => {
    const token = createdTokens.find((t) => t.id === tokenId)
    if (!token?.rawAddress) return
    try {
      await transferCreator.transferCreator({
        tokenAddress: token.rawAddress,
        newCreator: newOwner,
        bondingAddress: token.bondingAddress,
      })
      const items = await getUserCreatedTokens(walletAddress!)
      setCreatedTokens(await mapCreatedTokenItems(items))
    } catch {
      // error surfaced via txState
    }
  }

  return (
    <ProfilePageView
      walletAddress={walletAddress}
      shortAddress={shortAddress}
      isLoadingWallet={isLoadingWallet}
      authenticated={authenticated}
      authReady={privyReady}
      balances={balances}
      balancesLoading={balancesLoading}
      balancesError={balancesError}
      manageWalletUsdc={manageWalletUsdc}
      manageWalletHype={manageWalletHype}
      manageWalletLoading={manageWalletLoading}
      manageWalletError={manageWalletError}
      createdTokens={createdTokens}
      createdTokensLoading={createdTokensLoading}
      createdTokensError={createdTokensError}
      rewardTokens={rewardTokens}
      rewardTokensLoading={rewardTokensLoading}
      rewardTokensError={rewardTokensError}
      creatorRewardsClaiming={creatorRewards.txState.status === 'claiming'}
      creatorRewardsTxStatus={creatorRewards.txState.status}
      creatorRewardsTxMessage={
        creatorRewards.txState.status === 'error' ? creatorRewards.txState.message : null
      }
      creatorRewardsClaimTxHash={
        creatorRewards.txState.status === 'success' ? creatorRewards.txState.hash : null
      }
      creatorRewardsClaimable={creatorRewards.claimableText}
      creatorRewardsTotalEarned={creatorRewards.totalEarnedText}
      creatorRewardsPreviouslyClaimed={creatorRewards.previouslyClaimedText}
      creatorRewardsLoading={creatorRewards.loading}
      creatorRewardsError={creatorRewards.error}
      onClaimCreatorRewards={() => {
        // Error/cancel is already surfaced via txState; swallow to avoid unhandled rejection.
        void creatorRewards.claim().catch(() => {})
      }}
      onDismissCreatorRewardsTxModal={creatorRewards.resetTxState}
      transferCreatorTransferring={transferCreator.transferring}
      transferCreatorTxStatus={transferCreator.txState.status}
      transferCreatorTxMessage={
        transferCreator.txState.status === 'error' ? transferCreator.txState.message : null
      }
      transferCreatorTxHash={
        transferCreator.txState.status === 'success' ? transferCreator.txState.hash : null
      }
      onTransferCreatorRole={(tokenId, newOwner) => void handleTransferCreatorRole(tokenId, newOwner)}
      onDismissTransferCreatorTxModal={transferCreator.resetTxState}
      redeemStatuses={redeemStatuses}
      redeemStatusesLoading={redeemStatusesLoading}
      redeemingTokenId={redeemingTokenId}
      redeemTxStatus={playgroundUnwind.txState.status}
      redeemTxMessage={
        playgroundUnwind.txState.status === 'error' ? playgroundUnwind.txState.message : null
      }
      redeemTxHash={
        playgroundUnwind.txState.status === 'success' ? playgroundUnwind.txState.hash : null
      }
      redeemUsdcOut={redeemUsdcOut}
      onRedeemLockedFunds={(tokenId) => void handleRedeemLockedFunds(tokenId)}
      onDismissRedeemTxModal={playgroundUnwind.resetTxState}
      onConnect={loginWithWallet}
      onDisconnect={handleDisconnect}
      needsReconnect={session?.needsReconnect ?? false}
    />
  )
}
