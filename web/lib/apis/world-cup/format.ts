export function formatAddressCompact(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

export function formatBondingCurveVolumeUsd(amount: number, graduated: boolean): string {
  if (graduated) return '$9,000'
  return formatUsd(amount)
}
