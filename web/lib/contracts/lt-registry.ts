import {
  bondingExtraAbi,
  bounceFactoryAbi,
  bounceGlobalStorageAbi,
  bounceLtAbi,
} from '@/lib/contracts/abis'
import { CONTRACTS, MULTICALL3_ADDRESS } from '@/lib/contracts/config'
import { publicClient } from '@/lib/contracts/client'

export type LtPairKey = `${string}:${number}:${'LONG' | 'SHORT'}`

let registryPromise: Promise<Map<LtPairKey, `0x${string}`>> | null = null

function pairKey(
  underlying: string,
  leverage: number,
  direction: 'LONG' | 'SHORT',
): LtPairKey {
  return `${underlying.toUpperCase()}:${leverage}:${direction}`
}

const LT_MULTICALL_CHUNK = 40

type LtMetadata = {
  asset: string
  leverage: number
  direction: 'LONG' | 'SHORT'
}

async function readLtMetadataSequential(
  chunk: readonly `0x${string}`[],
): Promise<Map<`0x${string}`, LtMetadata>> {
  const out = new Map<`0x${string}`, LtMetadata>()

  await Promise.all(
    chunk.map(async (lt) => {
      try {
        const [asset, leverageRaw, isLong] = await Promise.all([
          publicClient.readContract({
            address: lt,
            abi: bounceLtAbi,
            functionName: 'targetAsset',
          }),
          publicClient.readContract({
            address: lt,
            abi: bounceLtAbi,
            functionName: 'targetLeverage',
          }),
          publicClient.readContract({
            address: lt,
            abi: bounceLtAbi,
            functionName: 'isLong',
          }),
        ])
        const leverage = Number(leverageRaw / BigInt(1e18))
        if (![2, 3, 5].includes(leverage)) return
        out.set(lt, {
          asset,
          leverage,
          direction: isLong ? 'LONG' : 'SHORT',
        })
      } catch {
        // skip invalid LT
      }
    }),
  )

  return out
}

async function readLtMetadataChunk(
  chunk: readonly `0x${string}`[],
): Promise<Map<`0x${string}`, LtMetadata>> {
  if (chunk.length === 0) return new Map()

  let results: Awaited<ReturnType<typeof publicClient.multicall>> | null = null
  try {
    const contracts = chunk.flatMap((lt) => [
      {
        address: lt,
        abi: bounceLtAbi,
        functionName: 'targetAsset' as const,
      },
      {
        address: lt,
        abi: bounceLtAbi,
        functionName: 'targetLeverage' as const,
      },
      {
        address: lt,
        abi: bounceLtAbi,
        functionName: 'isLong' as const,
      },
    ])
    results = await publicClient.multicall({
      contracts,
      allowFailure: true,
      multicallAddress: MULTICALL3_ADDRESS,
    })
  } catch {
    results = null
  }

  if (results) {
    const out = new Map<`0x${string}`, LtMetadata>()
    for (let i = 0; i < chunk.length; i++) {
      const assetResult = results[i * 3]
      const leverageResult = results[i * 3 + 1]
      const isLongResult = results[i * 3 + 2]
      if (
        assetResult.status !== 'success' ||
        leverageResult.status !== 'success' ||
        isLongResult.status !== 'success'
      ) {
        continue
      }

      const leverage = Number(leverageResult.result / BigInt(1e18))
      if (![2, 3, 5].includes(leverage)) continue

      out.set(chunk[i]!, {
        asset: assetResult.result,
        leverage,
        direction: isLongResult.result ? 'LONG' : 'SHORT',
      })
    }
    // Anvil 等环境常无 Multicall3：multicall 不抛错但全部 failure，需回退逐条读。
    if (out.size > 0) return out
  }

  return readLtMetadataSequential(chunk)
}

async function loadLtRegistry(): Promise<Map<LtPairKey, `0x${string}`>> {
  const map = new Map<LtPairKey, `0x${string}`>()

  const globalStorage = await publicClient.readContract({
    address: CONTRACTS.bonding,
    abi: bondingExtraAbi,
    functionName: 'bounceGlobalStorage',
  })

  const factory = await publicClient.readContract({
    address: globalStorage,
    abi: bounceGlobalStorageAbi,
    functionName: 'factory',
  })

  const lts = await publicClient.readContract({
    address: factory,
    abi: bounceFactoryAbi,
    functionName: 'lts',
  })

  for (let offset = 0; offset < lts.length; offset += LT_MULTICALL_CHUNK) {
    const chunk = lts.slice(offset, offset + LT_MULTICALL_CHUNK)
    const metadataByLt = await readLtMetadataChunk(chunk)
    for (const [lt, meta] of metadataByLt) {
      const key = pairKey(meta.asset, meta.leverage, meta.direction)
      if (!map.has(key)) map.set(key, lt)
    }
  }

  return map
}

function getRegistry() {
  if (!registryPromise) {
    registryPromise = loadLtRegistry().catch((err) => {
      registryPromise = null
      throw err
    })
  }
  return registryPromise
}

/** Warm the LT registry (shared by pair resolve + asset list). */
export function preloadLtRegistry() {
  return getRegistry()
}

/** Resolve BounceTech LT address for underlying × leverage × direction. */
export async function resolveLtAddress(
  underlying: string,
  leverage: number,
  direction: 'LONG' | 'SHORT',
): Promise<`0x${string}` | null> {
  const registry = await getRegistry()
  return registry.get(pairKey(underlying, leverage, direction)) ?? null
}

export function parseLeverageMultiplier(label: string): number {
  const n = Number.parseInt(label.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : n
}

/** Underlying symbols that have at least one on-chain LT (2×/3×/5×, long or short). */
export async function listAvailableUnderlyings(): Promise<string[]> {
  const registry = await getRegistry()
  const symbols = new Set<string>()
  for (const key of registry.keys()) {
    symbols.add(key.split(':')[0]!)
  }
  return [...symbols].sort()
}
