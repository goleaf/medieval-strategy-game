import { MemoryCache } from "./memory"
import type { CacheAdapter } from "./types"

let adapter: CacheAdapter | null = null

const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  dels: 0,
}

export function getCacheMetrics() {
  return { ...metrics }
}

async function getAdapter(): Promise<CacheAdapter> {
  if (adapter) return adapter
  const url = process.env.REDIS_URL
  if (url) {
    try {
      const { RedisCache } = await import("./redis")
      adapter = await RedisCache.create(url)
      return adapter
    } catch (err) {
      console.warn("[cache] Redis unavailable, falling back to memory:", err)
    }
  }
  adapter = new MemoryCache(5000)
  return adapter
}

export const cache: CacheAdapter & {
  wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T>
} = {
  async get<T>(key: string) {
    const value = await (await getAdapter()).get<T>(key)
    if (value === undefined) metrics.misses++
    else metrics.hits++
    return value
  },
  async set<T>(key: string, value: T, ttlSeconds: number) {
    metrics.sets++
    return (await getAdapter()).set<T>(key, value, ttlSeconds)
  },
  async del(key: string) {
    metrics.dels++
    return (await getAdapter()).del(key)
  },
  async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>) {
    const adapter = await getAdapter()
    const cached = await adapter.get<T>(key)
    if (cached !== undefined) return cached
    const value = await fetcher()
    await adapter.set(key, value, ttlSeconds)
    return value
  },
}
