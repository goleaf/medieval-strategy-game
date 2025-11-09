import type { CacheAdapter } from "./types"

type Entry = { value: unknown; expiresAt: number }

export class MemoryCache implements CacheAdapter {
  private store = new Map<string, Entry>()
  private janitor: NodeJS.Timeout | null = null

  constructor(private maxEntries = 5000) {
    this.janitor = setInterval(() => this.sweep(), 60_000).unref?.()
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // naive eviction: delete 10% oldest
      const arr = Array.from(this.store.entries())
      arr.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      const remove = Math.ceil(this.maxEntries * 0.1)
      for (let i = 0; i < remove && i < arr.length; i++) this.store.delete(arr[i]![0])
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  private sweep() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
  }
}

