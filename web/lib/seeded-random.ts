/** Deterministic PRNG so mock data matches between server and client. */
export function createSeededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state + seed.charCodeAt(i)) | 0
    state = Math.imul(state, 31)
  }
  if (state === 0) state = 1

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    return ((state >>> 0) & 0xffffffff) / 0x100000000
  }
}

/** Fixed epoch for mock timestamps (avoids Date.now() hydration drift). */
export const MOCK_BASE_TIME_MS = 1_700_000_000_000
