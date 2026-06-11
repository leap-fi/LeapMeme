import { ACCOUNT_API_BASE_URL } from '@/lib/account/config'
import type { AccountApiResponse } from '@/lib/account/types'

export class AccountApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
    this.name = 'AccountApiError'
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new AccountApiError(
      res.ok ? 'Invalid JSON from account API' : `HTTP ${res.status}: ${text.slice(0, 200)}`,
    )
  }
}

export async function accountFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${ACCOUNT_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  const body = await parseJson<AccountApiResponse<T>>(res)

  if (!res.ok) {
    throw new AccountApiError(body.msg || `HTTP ${res.status}`, body.code)
  }

  if (body.code !== 0) {
    throw new AccountApiError(body.msg || 'Account API error', body.code)
  }

  return body.data
}
