import { accountFetch } from '@/lib/account/api'

export type AwsUploadToken = {
  signature: string
  url: string
}

/** GET /account/awsToken */
export async function fetchAwsUploadTokenApi(fileName: string): Promise<AwsUploadToken> {
  const params = new URLSearchParams({ fileName })
  return accountFetch<AwsUploadToken>(`/account/awsToken?${params.toString()}`)
}
