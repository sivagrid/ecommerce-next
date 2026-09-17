/**
 * lib/auth.ts — JWT utilities + cookie helpers for Next.js.
 *
 * ─── Token strategy ───────────────────────────────────────────────────────────
 *
 * access_token  → httpOnly cookie, 15 min
 *   • Set by: login / register / refresh endpoints
 *   • Read by: Next.js middleware (route protection), Route Handlers
 *   • httpOnly: browser JS cannot read it → XSS safe
 *
 * refresh_token → httpOnly cookie, 7 days
 *   • Used only by POST /api/auth/refresh to issue new access tokens
 *
 * Both tokens are also returned in the response body so API clients (Postman,
 * mobile apps) can store and use them in the Authorization header.
 *
 * ─── Next.js vs Express cookie differences ───────────────────────────────────
 *
 * Express: use res.cookie() from cookie-parser
 * Next.js: use Response headers directly OR cookies() from next/headers
 *
 * Route Handlers set cookies via the Response object:
 *   new Response(body, { headers: { 'Set-Cookie': cookieString } })
 * Or via the cookies() API from next/headers (Next.js 15 — async).
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { JwtPayload } from '@/types';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets are not configured');
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';

/** Build the Set-Cookie header value for the access token */
export function buildAccessCookie(token: string): string {
  const maxAge = 15 * 60; // 15 minutes in seconds
  return [
    `access_token=${token}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `SameSite=Lax`,
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

/** Build the Set-Cookie header value for the refresh token */
export function buildRefreshCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return [
    `refresh_token=${token}`,
    `Path=/api/auth/refresh`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `SameSite=Lax`,
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

/** Build clearance cookies for logout */
export function buildClearCookies(): string[] {
  return [
    `access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    `refresh_token=; Path=/api/auth/refresh; Max-Age=0; HttpOnly; SameSite=Lax`,
  ];
}

// ─── Server-side current user ─────────────────────────────────────────────────

/**
 * Read the current user from the access_token cookie.
 * Available in Server Components and Route Handlers.
 *
 * In Next.js 15, cookies() is async.
 */
export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws a 401 response if not authenticated.
 * Use in Route Handlers:
 *   const user = await requireAuth();
 */
export async function requireAuth(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export async function requireRole(role: 'ADMIN'): Promise<JwtPayload> {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return user;
}

// ─── Extract token from request (supports both cookie and Authorization header) ─

/**
 * Extract access token from a Request object.
 * Checks Authorization header first (for API clients), then falls back to cookie.
 */
export function extractToken(request: Request): string | null {
  // Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Cookie-based (browser requests)
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/access_token=([^;]+)/);
  return match?.[1] ?? null;
}

export function verifyRequest(request: Request): JwtPayload | null {
  try {
    const token = extractToken(request);
    if (!token) return null;
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// ─── Custom error ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}
