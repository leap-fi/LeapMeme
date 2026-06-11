/** Deployed protocol addresses — defaults from README, overridable via env. */
/** Canonical Multicall3 on HyperEVM (same address as Ethereum mainnet). */
export const MULTICALL3_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11' as const

export const CONTRACTS = {
  zap: (process.env.NEXT_PUBLIC_ZAP_ADDRESS ??
    '0x5f66E5Ec4ec9F045E10a580e7bA1147b0c650E45') as `0x${string}`,
  bonding: (process.env.NEXT_PUBLIC_BONDING_ADDRESS ??
    '0x3d968edbed8c953C814FE7Ad207705525189D13A') as `0x${string}`,
  router: (process.env.NEXT_PUBLIC_ROUTER_ADDRESS ??
    '0xf1e943a1b78ac7F0976beC79c5F74C4B30C5646b') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    '0xb88339CB7199b77E23DB6E890353E22632Ba630f') as `0x${string}`,
  creatorRewards: (process.env.NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS ??
    '0xb4894380282533A86cb241145fac54AaAc995F18') as `0x${string}`,
  leapCreatorRewards: (process.env.NEXT_PUBLIC_LEAP_CREATOR_REWARDS_ADDRESS ??
    '0x2B7fB3857B26654609E4d36db3876c61EECA50DC') as `0x${string}`,
} as const

/** UI floors per alt.fun integration guide (above on-chain 10 USDC minimum). */
export const MIN_BUY_USDC = 20
export const MIN_SELL_USDC = 12

export const USDC_DECIMALS = 6
export const TOKEN_DECIMALS = 18

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/** On-chain `LaunchParams.image` — default until custom uploads are wired. */
export const DEFAULT_TOKEN_IMAGE = '/logo.png'

/** Matches `Zap.MIN_SEED_USDC` (20 USDC, 6 decimals). */
export const MIN_SEED_USDC = 20
