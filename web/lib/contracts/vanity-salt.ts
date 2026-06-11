import {
  encodeAbiParameters,
  encodePacked,
  getCreate2Address,
  keccak256,
  pad,
  toBytes,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { CONTRACTS } from '@/lib/contracts/config'

/** Mirrors `Bonding.VANITY_TRAILING_ZEROS` (5 hex zeros at end of address). */
const VANITY_MASK = (1n << 20n) - 1n

const EIP1167_PREFIX = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' as const
const EIP1167_SUFFIX = '0x5af43d82803e903d91602b57fd5bf3' as const

export function isVanityTokenAddress(address: Address): boolean {
  return (BigInt(address) & VANITY_MASK) === 0n
}

function mixSalt(
  creator: Address,
  name: string,
  ticker: string,
  userSalt: Hex,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
      ],
      [
        creator,
        keccak256(toBytes(name)),
        keccak256(toBytes(ticker)),
        userSalt,
      ],
    ),
  )
}

/** Local mirror of `Bonding.predictTokenAddress` (OpenZeppelin Clones CREATE2). */
export function predictTokenAddress(
  creator: Address,
  name: string,
  ticker: string,
  userSalt: Hex,
  tokenImplementation: Address,
  deployer: Address = CONTRACTS.bonding,
): Address {
  const saltMixed = mixSalt(creator, name, ticker, userSalt)
  const bytecode = encodePacked(
    ['bytes', 'address', 'bytes'],
    [EIP1167_PREFIX, tokenImplementation, EIP1167_SUFFIX],
  )
  return getCreate2Address({
    from: deployer,
    salt: saltMixed,
    bytecode,
  })
}

/**
 * Brute-force a user salt so the clone address ends with five hex zeros.
 * Average ~1M attempts (~5–15s in-browser depending on hardware).
 */
export async function mineVanitySalt(
  creator: Address,
  name: string,
  ticker: string,
  tokenImplementation: Address,
  options?: { maxAttempts?: number; startOffset?: bigint },
): Promise<Hex> {
  const maxAttempts = options?.maxAttempts ?? 3_000_000
  const start =
    options?.startOffset ??
    BigInt(Math.floor(Math.random() * 1_000_000))

  for (let i = 0n; i < BigInt(maxAttempts); i++) {
    if (i > 0n && i % 50_000n === 0n) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    const userSalt = pad(toHex(start + i), { size: 32 })
    const predicted = predictTokenAddress(
      creator,
      name,
      ticker,
      userSalt,
      tokenImplementation,
    )
    if (isVanityTokenAddress(predicted)) return userSalt
  }

  throw new Error('Unable to generate a token address that matches the vanity requirement. Please try again.')
}
