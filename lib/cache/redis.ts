import type { CacheAdapter } from "./types"

type RedisClient = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode: string, ttlSeconds: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

export class RedisCache implements CacheAdapter {
  private client: RedisClient

  private constructor(client: RedisClient) {
    this.client = client
  }

  static async create(url: string): Promise<RedisCache> {
    // Lazy import to avoid build-time dependency when Redis is not used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis")
    const client: RedisClient = new Redis(url, { lazyConnect: false })
    return new RedisCache(client)
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key)
    if (!raw) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value)
    await this.client.set(key, raw, "EX", Math.max(1, Math.floor(ttlSeconds)))
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }
}

