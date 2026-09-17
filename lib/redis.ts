/**
 * lib/redis.ts — ioredis singleton with graceful degradation.
 * Same pattern as the MERN version — see server/src/config/redis.ts for annotations.
 *
 * ─── Next.js specifics ────────────────────────────────────────────────────────
 * Next.js runs Route Handlers in Node.js (not Edge Runtime), so ioredis works.
 * If you use Edge Runtime (middleware.ts), you cannot use ioredis — use a
 * REST-based Redis client like @upstash/redis instead.
 *
 * This Redis client is for Route Handlers and Server Components only.
 */

import Redis from 'ioredis';

let client: Redis | null = null;
let _isReady = false;

export function getRedisClient(): Redis | null {
  return client;
}

export function isRedisReady(): boolean {
  return _isReady;
}

export function connectRedis(): void {
  const REDIS_URL = process.env.REDIS_URL;

  if (!REDIS_URL || process.env.NODE_ENV === 'test') {
    return;
  }

  // Only create one connection per process (singleton)
  if (client) return;

  client = new Redis(REDIS_URL, {
    retryStrategy: (times: number) => {
      if (times > 5) {
        _isReady = false;
        return null;
      }
      return Math.min(times * 300, 3000);
    },
    enableOfflineQueue: false,
    connectTimeout: 5000,
    commandTimeout: 3000,
    lazyConnect: true,
  });

  client.on('ready',  () => { _isReady = true;  });
  client.on('error',  () => { _isReady = false; });
  client.on('close',  () => { _isReady = false; });

  client.connect().catch(() => {
    _isReady = false;
  });
}

// ─── CacheService ─────────────────────────────────────────────────────────────

const KEY_PREFIX = 'ecommerce-next:';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!_isReady) return null;
    try {
      const raw = await client!.get(KEY_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!_isReady) return;
    try {
      await client!.set(KEY_PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { /* silent */ }
  },

  async del(key: string): Promise<void> {
    if (!_isReady) return;
    try { await client!.del(KEY_PREFIX + key); } catch { /* silent */ }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    if (!_isReady) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await client!.scan(cursor, 'MATCH', KEY_PREFIX + pattern, 'COUNT', 100);
        cursor = next;
        if (keys.length) await client!.del(...keys);
      } while (cursor !== '0');
    } catch { /* silent */ }
  },

  get isAvailable() { return _isReady; },
};
