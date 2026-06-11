/** Wallet hooks require client runtime; avoid static prerender failures. */
export const dynamic = 'force-dynamic'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
