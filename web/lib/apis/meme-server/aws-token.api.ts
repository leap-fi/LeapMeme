import { getMemeServerBaseUrl } from '@/lib/apis/meme-server/config'
import type { BaseResponse } from '@/lib/apis/meme-server/types'

export type AwsUploadToken = {
  signature: string
  url: string
}

function isSuccessCode(code: number | undefined): boolean {
  return code === 0
}

/** GET /account/awsToken */
export async function fetchAwsUploadTokenApi(fileName: string): Promise<AwsUploadToken> {
  const params = new URLSearchParams({ fileName })
  const url = `${getMemeServerBaseUrl()}/account/awsToken?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`meme-server awsToken HTTP ${response.status}`)
  }

  const payload = (await response.json()) as BaseResponse<AwsUploadToken>
  if (!isSuccessCode(payload?.code) || !payload.data?.signature || !payload.data?.url) {
    throw new Error(payload?.msg || 'Invalid awsToken response')
  }

  return payload.data
}
