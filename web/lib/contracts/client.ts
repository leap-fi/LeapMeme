import { createPublicClient, http } from 'viem'
import { hyperEvm } from '@/lib/contracts/chain'

const rpcUrl = hyperEvm.rpcUrls.default.http[0]

export const publicClient = createPublicClient({
  chain: hyperEvm,
  transport: http(rpcUrl),
})
