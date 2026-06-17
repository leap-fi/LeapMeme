import { defineChain } from 'viem'

/**
 * 链定义按环境变量驱动，默认 HyperEVM 主网（chain 999）。
 * 本地 Anvil 演示：在 .env.development(.local) 设置
 *   NEXT_PUBLIC_EVM_CHAIN_ID=31337
 *   NEXT_PUBLIC_EVM_RPC_URL=http://127.0.0.1:8545
 * 仅为配置层改动，不涉及业务逻辑；所有 `import { hyperEvm }` 保持不变。
 */
const chainId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID ?? '999')
const rpcUrl =
  process.env.NEXT_PUBLIC_EVM_RPC_URL ?? 'https://rpc.hyperliquid.xyz/evm'
const explorerUrl =
  process.env.NEXT_PUBLIC_EVM_EXPLORER_URL ?? 'https://hyperevmscan.io'
const isLocal = chainId === 31337

export const hyperEvm = defineChain({
  id: chainId,
  name: isLocal ? 'Anvil Local' : 'Hyperliquid',
  nativeCurrency: {
    decimals: 18,
    name: isLocal ? 'Ether' : 'HYPE',
    symbol: isLocal ? 'ETH' : 'HYPE',
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: isLocal ? 'Local' : 'HyperEVM Scan',
      url: explorerUrl,
    },
  },
  contracts: {
    // Anvil 默认在该 canonical 地址预部署 Multicall3。
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
})
