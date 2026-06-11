import {
  parseSignature,
  type Address,
  type WalletClient,
} from 'viem'
import { erc20Abi } from '@/lib/contracts/abis'
import { publicClient } from '@/lib/contracts/client'
import { hyperEvm } from '@/lib/contracts/chain'

export type PermitData = {
  value: bigint
  deadline: bigint
  v: number
  r: `0x${string}`
  s: `0x${string}`
}

const PERMIT_DEADLINE_SEC = 60 * 30

/** EIP-2612 off-chain permit signature for Zap buyWithPermit / sellWithPermit. */
export async function signErc20Permit(
  walletClient: WalletClient,
  params: {
    token: Address
    owner: Address
    spender: Address
    value: bigint
  },
): Promise<PermitData> {
  const { token, owner, spender, value } = params

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
