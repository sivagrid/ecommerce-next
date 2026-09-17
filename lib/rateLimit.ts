/**
 * lib/rateLimit.ts — Redis-based rate limiting for Next.js Route Handlers.
 *
 * ─── Why custom instead of express-rate-limit? ────────────────────────────────
 * express-rate-limit requires Express middleware — it doesn't work with Next.js
 * Route Handlers (which use the Web Request API).
 *
 * ─── Algorithm: Fixed Window Counter ─────────────────────────────────────────
 * 1. Build a key: `rl:<endpoint>:<ip>` (or `<userId>` for authenticated routes)
 * 2. INCR the key → returns the new count
 * 3. On first INCR (count = 1), set EXPIRE = windowMs (atomic via INCR + EXPIRE)
 * 4. If count > limit → reject (429)
 *
 * Trade-off: Not perfectly sliding-window — a burst can span two windows.
 * For a shopping cart API, fixed-window is sufficient.
 * More accurate: use Redis Sorted Sets with ZADD/ZREMRANGEBYSCORE (sliding window).
 *
 * ─── Graceful fallback ────────────────────────────────────────────────────────
 * If Redis is unavailable: allow all requests (fail open).
 * Fail-closed (deny all) would take down the site if Redis goes down.
 */

import { cache } from './redis';
import { sendError } from './apiResponse';
import type { NextResponse } from 'next/server';

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Identifier for this limiter (e.g. 'auth', 'api') */
  name: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  response?: NextResponse;
}

/**
 * Check rate limit for an incoming request.
 *
 * @param request - The incoming Next.js Request
 * @param options - Rate limit configuration
 * @returns { allowed, remaining, resetAt, response? }
 */
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, windowMs, name } = options;

  if (!cache.isAvailable) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  // Use IP address as the rate limit key (X-Forwarded-For in production behind proxy)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const key = `rl:${name}:${ip}`;
  const windowSeconds = Math.floor(windowMs / 1000);

  try {
    // INCR is atomic: returns the new value after incrementing
    const current = await incrementCounter(key, windowSeconds);
    const remaining = Math.max(0, limit - current);
    const resetAt = Date.now() + windowMs;

    if (current > limit) {
      const response = sendError(
        'Too many requests — please try again later',
        429,
        'RATE_LIMIT_EXCEEDED',
      );
      response.headers.set('Retry-After', String(windowSeconds));
      response.headers.set('X-RateLimit-Limit', String(limit));
      response.headers.set('X-RateLimit-Remaining', '0');
      return { allowed: false, remaining: 0, resetAt, response };
    }

    return { allowed: true, remaining, resetAt };
  } catch {
    // Redis error → fail open
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
}

async function incrementCounter(key: string, windowSeconds: number): Promise<number> {
  const redis = (await import('./redis')).getRedisClient();
  if (!redis) return 0;

  // Pipeline: INCR + EXPIRE in one round-trip
  const pipeline = redis.pipeline();
  pipeline.incr(`ecommerce-next:${key}`);
  pipeline.expire(`ecommerce-next:${key}`, windowSeconds, 'NX'); // NX: only set if not exists (don't reset window)
  const results = await pipeline.exec();
  return (results?.[0]?.[1] as number) ?? 0;
}

// ─── Preset limiters ─────────────────────────────────────────────────────────

export const authRateLimit: RateLimitOptions = {
  name: 'auth',
  limit: 10,
  windowMs: 15 * 60 * 1000, // 10 requests per 15 minutes
};

export const apiRateLimit: RateLimitOptions = {
  name: 'api',
  limit: 200,
  windowMs: 60 * 1000, // 200 requests per minute
};
