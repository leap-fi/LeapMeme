'use client'

import { Wallet } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useWalletSessionOptional } from '@/contexts/wallet-session-context'
import { isPrivyEnabled } from '@/lib/privy-enabled'

export function WalletSessionGuard() {
  const session = useWalletSessionOptional()
  let needsReconnect = session?.needsReconnect ?? false

  if (!isPrivyEnabled() || !needsReconnect) return null
  return (
    <AlertDialog open={needsReconnect}>
      <AlertDialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <Wallet className="h-6 w-6" aria-hidden />
          </div>
          <AlertDialogTitle className="text-center">Reconnect your wallet</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your wallet extension is disconnected or locked. Reconnect to trade, create tokens, and
            view live balances.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="w-full sm:w-auto min-w-[10rem] font-semibold"
            onClick={() => session?.connectOrReconnect()}
          >
            Reconnect wallet
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
