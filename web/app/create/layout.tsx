/** Privy wallet hooks are client-only; skip static prerender for this route. */
export const dynamic = 'force-dynamic'

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
