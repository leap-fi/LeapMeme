import { createPublicClient, http } from 'viem'
import { hyperEvm } from '@/lib/contracts/chain'

export const publicClient = createPublicClient({
  chain: hyperEvm,
  transport: http(),
})
