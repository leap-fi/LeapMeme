import {
  parseSignature,
  type Address,
  type WalletClient,
} from 'viem'
import { erc20Abi } from '@/lib/contracts/abis'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'
import { MAX_ALLOWANCE } from '@/lib/contracts/wallet-batch'

export type PermitData = {
  value: bigint
  deadline: bigint
  v: number
  r: `0x${string}`
  s: `0x${string}`
}

export type PermitTuple = {
  value: bigint
  deadline: bigint
  v: number
  r: `0x${string}`
  s: `0x${string}`
}

const PERMIT_DEADLINE_SEC = 60 * 30

export function toPermitTuple(p: PermitData): PermitTuple {
  return {
    value: p.value,
    deadline: p.deadline,
    v: p.v,
    r: p.r,
    s: p.s,
  }
}

/** Zap PermitInput with zero fields — only used when allowance already suffices (not sent on-chain). */
export const EMPTY_PERMIT: PermitTuple = {
  value: 0n,
  deadline: 0n,
  v: 0,
  r: '0x0000000000000000000000000000000000000000000000000000000000000000',
  s: '0x0000000000000000000000000000000000000000000000000000000000000000',
}

export function isUserRejectedError(error: unknown): boolean {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  const message = raw.toLowerCase()
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request') ||
    message.includes('denied transaction') ||
    message.includes('rejected signing')
  )
}

/** True when the token exposes EIP-2612 `nonces(address)`. */
export async function tokenSupportsPermit(token: Address): Promise<boolean> {
  try {
    await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'nonces',
      args: ['0x0000000000000000000000000000000000000001'],
    })
    return true
  } catch {
    return false
  }
}

/** EIP-2612 off-chain permit signature for Zap buyWithPermit / sellWithPermit / createTokenWithPermit. */
export async function signErc20Permit(
  walletClient: WalletClient,
  params: {
    token: Address
    owner: Address
    spender: Address
    value?: bigint
  },
): Promise<PermitData> {
  const { token, owner, spender, value = MAX_ALLOWANCE } = params

  const [name, nonce] = await Promise.all([
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'name',
    }),
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'nonces',
      args: [owner],
    }),
  ])

  let version = '1'
  try {
    version = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'version',
    })
  } catch {
    // Default EIP-2612 domain version
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_SEC)

  const signature = await walletClient.signTypedData({
    account: owner,
    domain: {
      name,
      version,
      chainId: hyperEvm.id,
      verifyingContract: token,
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: {
      owner,
      spender,
      value,
      nonce,
      deadline,
    },
  })

  const { v, r, s } = parseSignature(signature)
  return { value, deadline, v: Number(v), r, s }
}
