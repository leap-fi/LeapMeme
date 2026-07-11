import { buildProtocolDefaultsFromEnv } from '@/lib/protocol/defaults'
import type { ProtocolProfile } from '@/lib/protocol/types'

let runtimeConfig: ProtocolProfile = buildProtocolDefaultsFromEnv()

export function getProtocolConfig(): ProtocolProfile {
  return runtimeConfig
}

export function setProtocolRuntimeConfig(next: ProtocolProfile): void {
  runtimeConfig = next
}

export function resetProtocolRuntimeConfig(): void {
  runtimeConfig = buildProtocolDefaultsFromEnv()
}
