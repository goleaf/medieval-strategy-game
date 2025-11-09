const buckets = new Map<string, { tokens: number; lastRefill: number }>()

export function rateLimit({ key, rate, perMs }: { key: string; rate: number; perMs: number }): boolean {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: rate, lastRefill: now }
  // refill
  const elapsed = now - bucket.lastRefill
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / perMs) * rate)
    if (refill > 0) {
      bucket.tokens = Math.min(rate, bucket.tokens + refill)
      bucket.lastRefill = now
    }
  }
  if (bucket.tokens <= 0) {
    buckets.set(key, bucket)
    return false
  }
  bucket.tokens -= 1
  buckets.set(key, bucket)
  return true
}

