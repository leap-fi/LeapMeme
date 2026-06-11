/**
 * Prepare address/account for backend query params.
 * These values are case-sensitive on the API; only trim whitespace.
 */
export function preserveCaseAddressParam(value: string): string {
  return value.trim()
}

export function preserveCaseAccountParam(value: string): string {
  return value.trim()
}
