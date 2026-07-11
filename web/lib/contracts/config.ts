import { getProtocolConfig } from '@/lib/protocol/runtime'

/** alt.fun 生产合约（HyperEVM）；与 api-pre / 链上存量 token 一致 */
/** Canonical Multicall3 on HyperEVM (same address as Ethereum mainnet). */
export const MULTICALL3_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11' as const

export const ALT_FUN_CONTRACTS = {
  zap: '0x693f12e9e6b35b34458793546065e8b08e0299d6',
  bonding: '0xb68811BcC0e4FcD825aA49F9453b065ddF752FcB',
  router: '0x70c7eC6f85B960379b7ee60Af72E0f419d915878',
  usdc: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
  creatorRewards: '0xb4894380282533A86cb241145fac54AaAc995F18',
} as const

export const CONTRACTS = {
  zap: (process.env.NEXT_PUBLIC_ZAP_ADDRESS ?? ALT_FUN_CONTRACTS.zap) as `0x${string}`,
  bonding: (process.env.NEXT_PUBLIC_BONDING_ADDRESS ??
    ALT_FUN_CONTRACTS.bonding) as `0x${string}`,
  router: (process.env.NEXT_PUBLIC_ROUTER_ADDRESS ??
    ALT_FUN_CONTRACTS.router) as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? ALT_FUN_CONTRACTS.usdc) as `0x${string}`,
  creatorRewards: (process.env.NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS ??
    ALT_FUN_CONTRACTS.creatorRewards) as `0x${string}`,
} as const

export const USDC_DECIMALS = 6
export const TOKEN_DECIMALS = 18

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/** On-chain `LaunchParams.image` — default until custom uploads are wired. */
export const DEFAULT_TOKEN_IMAGE = '/logo.svg'

export function getMinBuyUsdc(): number {
  return getProtocolConfig().minBuyUsdc
}

export function getMinSellUsdc(): number {
  return getProtocolConfig().minSellUsdc
}

export function getMinSeedUsdc(): number {
  return getProtocolConfig().minSeedUsdc
}

export function getMaxSeedUsdc(): number {
  return getProtocolConfig().maxSeedUsdc
}

export function getMaxTradeUsdc(): number | null {
  return getProtocolConfig().maxTradeUsdc
}
