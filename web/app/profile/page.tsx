'use client'

import dynamic from 'next/dynamic'
import { ProfilePageView } from './_components/profile-page-view'
import { isPrivyEnabled } from '@/lib/privy-enabled'

const ProfilePagePrivy = dynamic(
  () => import('./_components/profile-page-privy').then((m) => m.ProfilePagePrivy),
  {
    ssr: false,
    loading: () => (
      <ProfilePageView
        walletAddress={null}
        shortAddress="—"
        isLoadingWallet
        authenticated={false}
        authReady={false}
        balances={[]}
        balancesLoading={false}
        balancesError={null}
      />
    ),
  },
)

export default function ProfilePage() {
  if (!isPrivyEnabled()) {
    return (
      <ProfilePageView
        walletAddress={null}
        shortAddress="Guest"
        isLoadingWallet={false}
        authenticated={false}
        authReady
        balances={[]}
        balancesLoading={false}
        balancesError={null}
        walletUnavailable
      />
    )
  }

  return <ProfilePagePrivy />
}
