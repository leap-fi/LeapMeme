// Mock data for the LEAP trading platform

export interface MarketPrice {
  symbol: string
  price: string
  change: number
  icon?: string
}

export interface Token {
  id: string
  symbol: string
  name: string
  image: string
  underlying: string
  leverage: number
  direction: 'Long' | 'Short'
  change24h: number
  progress: number
  marketCap: string
  graduated: boolean
  volume24h: string
  /** On-chain ERC-20 address for Zap buy/sell */
  contractAddress?: string
  /** Token creator wallet from meme-server API */
  creator?: string
  /** Raw values for sorting (API-mapped tokens) */
  marketCapValue?: number
  volume24hValue?: number
  createdAt?: number
}

export const marketPrices: MarketPrice[] = [
  { symbol: 'BRENTOIL', price: '$95.52', change: 2.50, icon: '🛢️' },
  { symbol: 'BTC', price: '$77,397', change: 0.91, icon: '🟠' },
  { symbol: 'CBRS', price: '$262', change: 0.94, icon: '🔵' },
  { symbol: 'CL', price: '$91.59', change: 2.30, icon: '⚫' },
  { symbol: 'DOGE', price: '$0.1029', change: -0.06, icon: '🐕' },
  { symbol: 'ETH', price: '$2108', change: -0.43, icon: '💠' },
  { symbol: 'FARTCOIN', price: '$0.1815', change: -1.11, icon: '💨' },
  { symbol: 'GOLD', price: '$4558', change: 0.30, icon: '🥇' },
  { symbol: 'HYPE', price: '$62.06', change: 5.83, icon: '💜' },
  { symbol: 'kPEPE', price: '$0.0036', change: -1.12, icon: '🐸' },
  { symbol: 'NEAR', price: '$2.39', change: -2.39, icon: '🌐' },
  { symbol: 'NVDA', price: '$220', change: 0.01, icon: '🟢' },
  { symbol: 'SILVER', price: '$77.65', change: 0.02, icon: '🥈' },
  { symbol: 'SOL', price: '$85.94', change: 0.28, icon: '🟣' },
  { symbol: 'SP500', price: '$7544', change: -0.47, icon: '📊' },
  { symbol: 'TSLA', price: '$434', change: 0.16, icon: '🔴' },
  { symbol: 'XYZ100', price: '$29,903', change: 0.08, icon: '💯' },
]

/** Test on-chain token address (shared by all mock tokens). */
export const TOKEN_CONTRACT_ADDRESS =
  '0x8853DAAb23F5712Da2c942555875ecA2b2000000' as const

const rawTokens: Omit<Token, 'contractAddress'>[] = [
  {
    id: '1',
    symbol: 'LEAP',
    name: 'LEAP',
    image: '🅰️',
    underlying: 'HYPE',
    leverage: 5,
    direction: 'Long',
    change24h: -32.1,
    progress: 100,
    marketCap: '$1.48M',
    graduated: true,
    volume24h: '$520K',
  },
  {
    id: '2',
    symbol: 'FLOOR',
    name: 'floor',
    image: '🏠',
    underlying: 'HYPE',
    leverage: 5,
    direction: 'Long',
    change24h: 6791.4,
    progress: 100,
    marketCap: '$206K',
    graduated: true,
    volume24h: '$180K',
  },
  {
    id: '3',
    symbol: 'PURR',
    name: 'Pürr',
    image: '🐱',
    underlying: 'HYPE',
    leverage: 2,
    direction: 'Long',
    change24h: -23.3,
    progress: 100,
    marketCap: '$99K',
    graduated: true,
    volume24h: '$85K',
  },
  {
    id: '4',
    symbol: 'STONKS',
    name: 'STONKS',
    image: '📈',
    underlying: 'SP500',
    leverage: 5,
    direction: 'Long',
    change24h: -11.5,
    progress: 100,
    marketCap: '$145K',
    graduated: true,
    volume24h: '$120K',
  },
  {
    id: '5',
    symbol: 'AURA',
    name: 'AURA',
    image: '✨',
    underlying: 'HYPE',
    leverage: 3,
    direction: 'Long',
    change24h: -27.3,
    progress: 100,
    marketCap: '$116K',
    graduated: true,
    volume24h: '$95K',
  },
  {
    id: '6',
    symbol: 'LCPT',
    name: 'LCPT',
    image: '🎯',
    underlying: 'NVDA',
    leverage: 5,
    direction: 'Long',
    change24h: 17.5,
    progress: 12,
    marketCap: '$3.5K',
    graduated: false,
    volume24h: '$2.1K',
  },
  {
    id: '7',
    symbol: 'GASS',
    name: 'Gekko AI Super Shitcoin',
    image: '⛽',
    underlying: 'NEAR',
    leverage: 3,
    direction: 'Long',
    change24h: 4.5,
    progress: 65,
    marketCap: '$3.1K',
    graduated: false,
    volume24h: '$1.8K',
  },
  {
    id: '8',
    symbol: 'ANDREW',
    name: '@Hyperliquid',
    image: '👤',
    underlying: 'HYPE',
    leverage: 5,
    direction: 'Long',
    change24h: -24.9,
    progress: 100,
    marketCap: '$28K',
    graduated: true,
    volume24h: '$15K',
  },
  {
    id: '9',
    symbol: 'HYPURR',
    name: 'HYPURR',
    image: '😼',
    underlying: 'HYPE',
    leverage: 2,
    direction: 'Long',
    change24h: -13.5,
    progress: 100,
    marketCap: '$30K',
    graduated: true,
    volume24h: '$22K',
  },
  {
    id: '10',
    symbol: 'JEFF',
    name: 'Jeff',
    image: '🦸',
    underlying: 'NVDA',
    leverage: 5,
    direction: 'Long',
    change24h: -9.3,
    progress: 100,
    marketCap: '$45K',
    graduated: true,
    volume24h: '$38K',
  },
  {
    id: '11',
    symbol: 'SATOSHI',
    name: 'SatoshiClub',
    image: '₿',
    underlying: 'BTC',
    leverage: 5,
    direction: 'Long',
    change24h: -56.0,
    progress: 42,
    marketCap: '$2.7K',
    graduated: false,
    volume24h: '$1.2K',
  },
  {
    id: '12',
    symbol: 'TESLABOT',
    name: 'TeslaBot',
    image: '🤖',
    underlying: 'TSLA',
    leverage: 3,
    direction: 'Long',
    change24h: 32.1,
    progress: 100,
    marketCap: '$32K',
    graduated: true,
    volume24h: '$28K',
  },
  {
    id: '13',
    symbol: 'GALAXY',
    name: 'GalaxyQuest',
    image: '🌌',
    underlying: 'NEAR',
    leverage: 3,
    direction: 'Long',
    change24h: -27.6,
    progress: 100,
    marketCap: '$22K',
    graduated: true,
    volume24h: '$18K',
  },
  {
    id: '14',
    symbol: 'WHALE',
    name: 'WhaleAlert',
    image: '🐋',
    underlying: 'ETH',
    leverage: 2,
    direction: 'Long',
    change24h: -0.6,
    progress: 55,
    marketCap: '$3.0K',
    graduated: false,
    volume24h: '$1.5K',
  },
  {
    id: '15',
    symbol: 'DEGEN',
    name: 'DegenApe',
    image: '🦍',
    underlying: 'SOL',
    leverage: 3,
    direction: 'Long',
    change24h: -8.0,
    progress: 100,
    marketCap: '$57K',
    graduated: true,
    volume24h: '$45K',
  },
  {
    id: '16',
    symbol: 'BULLRUN',
    name: 'BullRun',
    image: '🐂',
    underlying: 'BTC',
    leverage: 5,
    direction: 'Long',
    change24h: 4.4,
    progress: 38,
    marketCap: '$3.1K',
    graduated: false,
    volume24h: '$2.2K',
  },
  {
    id: '17',
    symbol: 'FOMO',
    name: 'FomoKing',
    image: '👑',
    underlying: 'HYPE',
    leverage: 3,
    direction: 'Long',
    change24h: -36.7,
    progress: 100,
    marketCap: '$31K',
    graduated: true,
    volume24h: '$25K',
  },
  {
    id: '18',
    symbol: 'WAGMI',
    name: 'WagmiDAO',
    image: '🤝',
    underlying: 'ETH',
    leverage: 2,
    direction: 'Long',
    change24h: 12.7,
    progress: 100,
    marketCap: '$13K',
    graduated: true,
    volume24h: '$10K',
  },
]

export const tokens: Token[] = rawTokens.map((token) => ({
  ...token,
  contractAddress: TOKEN_CONTRACT_ADDRESS,
}))

export interface UnderlyingAssetOption {
  symbol: string
  icon: string
  change: number
}

/** Underlying assets for token creation (3×6 grid order). */
export const underlyingAssetOptions: UnderlyingAssetOption[] = [
  { symbol: 'BRENTOIL', icon: '🛢️', change: 3.2 },
  { symbol: 'BTC', icon: '🟠', change: 0.8 },
  { symbol: 'CBRS', icon: '🔵', change: 1.6 },
  { symbol: 'CL', icon: '⚫', change: 3.1 },
  { symbol: 'DOGE', icon: '🐕', change: -0.4 },
  { symbol: 'ETH', icon: '💠', change: -0.3 },
  { symbol: 'FARTCOIN', icon: '💨', change: -0.8 },
  { symbol: 'GOLD', icon: '🥇', change: 0.3 },
  { symbol: 'HYPE', icon: '💜', change: 8.0 },
  { symbol: 'kPEPE', icon: '🐸', change: -1.4 },
  { symbol: 'NEAR', icon: '🌐', change: -2.7 },
  { symbol: 'NVDA', icon: '🟢', change: 0.1 },
  { symbol: 'SILVER', icon: '🥈', change: 0.2 },
  { symbol: 'SOL', icon: '🟣', change: 0.1 },
  { symbol: 'SP500', icon: '📊', change: -0.5 },
  { symbol: 'TSLA', icon: '🔴', change: 0.3 },
  { symbol: 'XYZ100', icon: '💯', change: 0.0 },
  { symbol: 'ZEC', icon: '🟡', change: 5.1 },
]

export function formatUnderlyingChange(change: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '' : '+'
  return `${sign}${change.toFixed(1)}%`
}

export const underlyingAssets = ['All', ...underlyingAssetOptions.map((a) => a.symbol)]
export const leverageOptions = ['All', '2x', '3x', '5x']
export const directionOptions = ['All', 'Long', 'Short']
export const sortOptions = ['24H Volume', 'Market Cap', '24H Change', 'Newest']
