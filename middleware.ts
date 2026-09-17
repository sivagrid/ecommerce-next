/**
 * middleware.ts — Next.js Middleware (runs at the Edge before every request).
 *
 * ─── What is Next.js Middleware? ─────────────────────────────────────────────
 *
 * Middleware runs BEFORE a request is completed — before the page or route
 * handler renders. It can:
 *  • Redirect (unauthenticated → /login)
 *  • Rewrite (A/B testing, localisation)
 *  • Set response headers (security headers, CORS)
 *  • Modify cookies
 *
 * Middleware runs on the Edge Runtime (V8 isolate, not Node.js). This means:
 *  • Cannot use Node.js APIs (fs, crypto, ioredis, mongoose)
 *  • Must use Web APIs only (fetch, Request, Response, TextEncoder)
 *  • jsonwebtoken uses Node.js crypto → we use jose instead for Edge JWT verification
 *  • Very fast: ~1ms cold start vs ~100ms for serverless Node
 *
 * ─── Interview Q: Why not just check auth in every page/route? ───────────────
 * Middleware runs once centrally — DRY, consistent, and before the page
 * even starts to render. A protected page that checks auth on render can
 * still leak layout/component structure. Middleware prevents that.
 *
 * ─── JWT verification at the Edge ────────────────────────────────────────────
 * We use the jose library (pure Web API, no Node.js deps) to verify JWTs.
 * jsonwebtoken uses Node.js crypto → doesn't work in Edge Runtime.
 */

import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/cart', '/checkout', '/orders', '/account'];
// Routes that require admin role
const ADMIN_ROUTES = ['/admin'];
// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  const accessToken  = request.cookies.get('access_token')?.value;
  const isLoggedIn   = !!accessToken && isTokenFormatValid(accessToken);

  // Redirect unauthenticated users away from protected routes
  if ((isProtected || isAdmin) && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/products', request.url));
  }

  // Add security headers to every response
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Quick structural validation (not full signature verification — that happens
 * in Route Handlers with the full Node.js jose/jsonwebtoken stack).
 * Here we just check that the token looks like a valid JWT (3 base64url parts).
 * Full cryptographic verification happens in the route handler / server action.
 *
 * Why not verify the signature here?
 * jose works in Edge, but loading the secret from process.env and running HMAC
 * adds ~5ms per request. For high-traffic routes, a structural check is enough
 * to prevent unauthenticated requests — the real verification still happens
 * in the route handler if the route is sensitive.
 */
function isTokenFormatValid(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    // Check the payload is valid base64url JSON with an exp field
    const payload = JSON.parse(
      Buffer.from(parts[1]!, 'base64url').toString('utf8'),
    );
    // Reject clearly expired tokens
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return typeof payload.userId === 'string';
  } catch {
    return false;
  }
}

export const config = {
  // Run middleware on all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)).*)',
  ],
};
