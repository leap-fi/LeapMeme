import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'World Cup Meme Launch Battle | LEAP',
  description:
    'Race to graduate your national team leveraged meme token. First to fill the bonding curve wins 100% fee sharing rewards on Hyperliquid.',
}

export default function WorldCupLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
