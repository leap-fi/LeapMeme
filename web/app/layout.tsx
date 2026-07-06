import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://leap.fun'),
  title: 'LEAP - Launch Leveraged Tokens',
  description: 'Create and trade leveraged tokens backed by perpetual contracts on leap.fun',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '196x196', type: 'image/png' },
      { url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Injected at build time when Web Analytics is enabled in the Vercel project
const vercelAnalyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH,
)

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        {vercelAnalyticsEnabled && <Analytics />}
        {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
      </body>
    </html>
  )
}
