import { formatUnits, parseUnits } from 'viem'
import {
  bondingAbi,
  bondingExtraAbi,
  bounceGlobalStorageAbi,
  bounceLtAbi,
  erc20Abi,
  routerAbi,
  uniswapV2FactoryAbi,
  uniswapV2PairAbi,
  zapAbi,
} from '@/lib/contracts/abis'
import { CONTRACTS, TOKEN_DECIMALS, USDC_DECIMALS, ZERO_ADDRESS } from '@/lib/contracts/config'
import { publicClient } from '@/lib/contracts/client'

const BPS = BigInt(10_000)
const UNISWAP_V2_FEE_NUMERATOR = 997n

export type TradeContracts = {
  zap: `0x${string}`
  bonding: `0x${string}`
  router: `0x${string}`
  usdc: `0x${string}`
  pool?: `0x${string}`
  lt?: `0x${string}`
}

export type TradeQuote = {
  estimatedOut: string
  estimatedOutRaw: bigint
  feePercent: number
}

function uniV2GetAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountIn <= BigInt(0) || reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) {
    return BigInt(0)
  }
  const amountInWithFee = amountIn * UNISWAP_V2_FEE_NUMERATOR
  return (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee)
}

async function readFees(contracts: TradeContracts) {
  const [buyFeeBps, sellFeeBps] = await Promise.all([
    publicClient.readContract({
      address: contracts.zap,
      abi: zapAbi,
      functionName: 'buyFeeBps',
    }),
    publicClient.readContract({
      address: contracts.zap,
      abi: zapAbi,
      functionName: 'sellFeeBps',
    }),
  ])
  return { buyFeeBps, sellFeeBps }
}

async function readLtAddress(
  tokenAddress: `0x${string}`,
  contracts: TradeContracts,
): Promise<`0x${string}` | null> {
  if (contracts.lt) return contracts.lt

  const ltAddress = await publicClient.readContract({
    address: contracts.bonding,
    abi: bondingAbi,
    functionName: 'ltOf',
    args: [tokenAddress],
  })
  if (ltAddress === ZERO_ADDRESS) return null
  return ltAddress
}

async function resolvePoolAddress(
  tokenAddress: `0x${string}`,
  contracts: TradeContracts,
  ltAddress: `0x${string}`,
): Promise<`0x${string}` | null> {
  if (contracts.pool) return contracts.pool

  try {
    const globalStorage = await publicClient.readContract({
      address: contracts.bonding,
      abi: bondingExtraAbi,
      functionName: 'bounceGlobalStorage',
    })
    const factory = await publicClient.readContract({
      address: globalStorage,
      abi: bounceGlobalStorageAbi,
      functionName: 'factory',
    })
    const pair = await publicClient.readContract({
      address: factory,
      abi: uniswapV2FactoryAbi,
      functionName: 'getPair',
      args: [tokenAddress, ltAddress],
    })
    if (pair === ZERO_ADDRESS) return null
    return pair
  } catch {
    return null
  }
}

async function readPoolReserves(
  poolAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  ltAddress: `0x${string}`,
) {
  const [token0, reserves] = await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: uniswapV2PairAbi,
      functionName: 'token0',
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: uniswapV2PairAbi,
      functionName: 'getReserves',
    }),
  ])

  const tokenIsToken0 = token0.toLowerCase() === tokenAddress.toLowerCase()
  const ltIsToken0 = token0.toLowerCase() === ltAddress.toLowerCase()
  if (!tokenIsToken0 && !ltIsToken0) return null

  const [reserve0, reserve1] = reserves
  return {
    reserveToken: tokenIsToken0 ? reserve0 : reserve1,
    reserveLt: tokenIsToken0 ? reserve1 : reserve0,
  }
}

async function quoteGraduatedBuy(
  tokenAddress: `0x${string}`,
  netUsdc: bigint,
  contracts: TradeContracts,
  buyFeeBps: bigint,
): Promise<TradeQuote | null> {
  const ltAddress = await readLtAddress(tokenAddress, contracts)
  if (!ltAddress) return null

  const poolAddress = await resolvePoolAddress(tokenAddress, contracts, ltAddress)
  if (!poolAddress) return null

  const [ltIn, poolReserves] = await Promise.all([
    publicClient.readContract({
      address: ltAddress,
      abi: bounceLtAbi,
      functionName: 'baseToLtAmount',
      args: [netUsdc],
    }),
    readPoolReserves(poolAddress, tokenAddress, ltAddress),
  ])
  if (!poolReserves || ltIn <= BigInt(0)) return null

  const tokensOut = uniV2GetAmountOut(ltIn, poolReserves.reserveLt, poolReserves.reserveToken)
  if (tokensOut <= BigInt(0)) return null

  return {
    estimatedOut: formatUnits(tokensOut, TOKEN_DECIMALS),
    estimatedOutRaw: tokensOut,
    feePercent: Number(buyFeeBps) / 100,
  }
}

async function quoteGraduatedSell(
  tokenAddress: `0x${string}`,
  amountIn: bigint,
  contracts: TradeContracts,
  sellFeeBps: bigint,
): Promise<TradeQuote | null> {
  const ltAddress = await readLtAddress(tokenAddress, contracts)
  if (!ltAddress) return null

  const poolAddress = await resolvePoolAddress(tokenAddress, contracts, ltAddress)
  if (!poolAddress) return null

  const poolReserves = await readPoolReserves(poolAddress, tokenAddress, ltAddress)
  if (!poolReserves) return null

  const ltOut = uniV2GetAmountOut(amountIn, poolReserves.reserveToken, poolReserves.reserveLt)
  if (ltOut <= BigInt(0)) return null

  const grossUsdc = await publicClient.readContract({
    address: ltAddress,
    abi: bounceLtAbi,
    functionName: 'ltToBaseAmount',
    args: [ltOut],
  })
  const netUsdc = grossUsdc - (grossUsdc * sellFeeBps) / BPS

  return {
    estimatedOut: formatUnits(netUsdc, USDC_DECIMALS),
    estimatedOutRaw: netUsdc,
    feePercent: Number(sellFeeBps) / 100,
  }
}

/** Estimate tokens received for a gross USDC buy. */
export async function quoteBuy(
  tokenAddress: `0x${string}`,
  usdcAmount: string,
  contracts: TradeContracts = CONTRACTS,
): Promise<TradeQuote | null> {
  const gross = parseUnits(usdcAmount, USDC_DECIMALS)
  if (gross <= BigInt(0)) return null

  const [graduated, withdrawn, { buyFeeBps }] = await Promise.all([
    publicClient.readContract({
      address: contracts.bonding,
      abi: bondingAbi,
      functionName: 'isGraduated',
      args: [tokenAddress],
    }),
    publicClient.readContract({
      address: contracts.bonding,
      abi: bondingAbi,
      functionName: 'liquidityWithdrawn',
      args: [tokenAddress],
    }),
    readFees(contracts),
  ])
  if (withdrawn) return null
  const netUsdc = gross - (gross * buyFeeBps) / BPS
  if (netUsdc <= BigInt(0)) return null

  if (graduated) {
    return quoteGraduatedBuy(tokenAddress, netUsdc, contracts, buyFeeBps)
  }

  // Bonding curve quotes USDC directly (LeapRouter.previewBuy → Bonding.quoteBuy).
  const [, tokensOut] = await publicClient.readContract({
    address: contracts.router,
    abi: routerAbi,
    functionName: 'previewBuy',
    args: [tokenAddress, netUsdc],
  })
  if (tokensOut <= BigInt(0)) return null

  return {
    estimatedOut: formatUnits(tokensOut, TOKEN_DECIMALS),
    estimatedOutRaw: tokensOut,
    feePercent: Number(buyFeeBps) / 100,
  }
}

/** Estimate USDC received for a token sell. */
export async function quoteSell(
  tokenAddress: `0x${string}`,
  tokenAmount: string,
  contracts: TradeContracts = CONTRACTS,
): Promise<TradeQuote | null> {
  const amountIn = parseUnits(tokenAmount, TOKEN_DECIMALS)
  if (amountIn <= BigInt(0)) return null

  const [graduated, withdrawn, { sellFeeBps }] = await Promise.all([
    publicClient.readContract({
      address: contracts.bonding,
      abi: bondingAbi,
      functionName: 'isGraduated',
      args: [tokenAddress],
    }),
    publicClient.readContract({
      address: contracts.bonding,
      abi: bondingAbi,
      functionName: 'liquidityWithdrawn',
      args: [tokenAddress],
    }),
    readFees(contracts),
  ])
  if (withdrawn) return null

  if (graduated) {
    return quoteGraduatedSell(tokenAddress, amountIn, contracts, sellFeeBps)
  }

  const grossUsdc = await publicClient.readContract({
    address: contracts.router,
    abi: routerAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress, false, amountIn],
  })
  if (grossUsdc <= BigInt(0)) return null

  const netUsdc = grossUsdc - (grossUsdc * sellFeeBps) / BPS
  if (netUsdc <= BigInt(0)) return null

  return {
    estimatedOut: formatUnits(netUsdc, USDC_DECIMALS),
    estimatedOutRaw: netUsdc,
    feePercent: Number(sellFeeBps) / 100,
  }
}

export async function readTokenStatus(
  tokenAddress: `0x${string}`,
  contracts: TradeContracts = CONTRACTS,
) {
  const [creator, isGraduating, isGraduated, isTrading, liquidityWithdrawn] =
    await Promise.all([
      publicClient.readContract({
        address: contracts.bonding,
        abi: bondingAbi,
        functionName: 'creatorOf',
        args: [tokenAddress],
      }),
      publicClient.readContract({
        address: contracts.bonding,
        abi: bondingAbi,
        functionName: 'isGraduating',
        args: [tokenAddress],
      }),
      publicClient.readContract({
        address: contracts.bonding,
        abi: bondingAbi,
        functionName: 'isGraduated',
        args: [tokenAddress],
      }),
      publicClient.readContract({
        address: contracts.bonding,
        abi: bondingAbi,
        functionName: 'isTrading',
        args: [tokenAddress],
      }),
      publicClient.readContract({
        address: contracts.bonding,
        abi: bondingAbi,
        functionName: 'liquidityWithdrawn',
        args: [tokenAddress],
      }),
    ])

  const exists = creator !== ZERO_ADDRESS
  // Graduated tokens still trade on DEX until creator withdraws locked LP.
  const tradeDisabled = Boolean(liquidityWithdrawn)
  return {
    exists,
    isGraduating,
    isGraduated,
    isTrading,
    liquidityWithdrawn: Boolean(liquidityWithdrawn),
    tradeDisabled,
  }
}

export async function readBalances(
  walletAddress: `0x${string}`,
  tokenAddress: `0x${string}` | null,
  contracts: TradeContracts = CONTRACTS,
) {
  let usdcBalance = 0n
  let tokenBalance = 0n

  try {
    usdcBalance = await publicClient.readContract({
      address: contracts.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    })
  } catch {
    // USDC read failed (RPC / wrong contract address)
  }

  if (tokenAddress) {
    try {
      tokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      })
    } catch {
      // Meme token may be missing after Anvil reset while DB still lists it
    }
  }

  return {
    usdc: formatUnits(usdcBalance, USDC_DECIMALS),
    token: formatUnits(tokenBalance, TOKEN_DECIMALS),
    usdcRaw: usdcBalance,
    tokenRaw: tokenBalance,
  }
}

export async function readAllowance(
  owner: `0x${string}`,
  token: `0x${string}`,
  spender: `0x${string}`,
) {
  return publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

export async function readErc20Balance(
  owner: `0x${string}`,
  token: `0x${string}`,
) {
  return publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  })
}
