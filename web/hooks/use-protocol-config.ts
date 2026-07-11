'use client'

import { useCallback, useEffect, useState } from 'react'
import { getProtocolConfig as fetchProtocolConfig } from '@/lib/apis/meme-server/protocol-config.api'
import { buildProtocolDefaultsFromEnv } from '@/lib/protocol/defaults'
import { setProtocolRuntimeConfig } from '@/lib/protocol/runtime'
import type { ProtocolProfile } from '@/lib/protocol/types'

export function useProtocolConfigLoader() {
  const [config, setConfig] = useState<ProtocolProfile>(() => buildProtocolDefaultsFromEnv())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const data = await fetchProtocolConfig()
      setProtocolRuntimeConfig(data)
      setConfig(data)
      setError(null)
    } catch (err) {
      const fallback = buildProtocolDefaultsFromEnv()
      setProtocolRuntimeConfig(fallback)
      setConfig(fallback)
      setError(err instanceof Error ? err.message : 'Failed to load protocol config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { config, loading, error, reload }
}
