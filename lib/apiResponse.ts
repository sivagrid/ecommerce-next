/**
 * lib/apiResponse.ts — Next.js Route Handler response helpers.
 *
 * ─── Next.js vs Express ───────────────────────────────────────────────────────
 *
 * Express: res.status(200).json({ ... })
 * Next.js: return NextResponse.json({ ... }, { status: 200 })
 *          OR: return Response.json({ ... }, { status: 200 })
 *
 * We use the Web API Response directly (compatible with both Node.js and Edge).
 * NextResponse extends Response and adds helpers — either works for JSON APIs.
 *
 * ─── Why helpers? ────────────────────────────────────────────────────────────
 * Consistent shape: { success, data, message, pagination }
 * Consistent status codes: 200 for success, 400/401/404/500 for errors
 */

import { NextResponse } from 'next/server';
import type { PaginationMeta } from '@/types';

interface SuccessOptions {
  message?: string;
  pagination?: PaginationMeta;
  status?: number;
  headers?: Record<string, string>;
}

export function sendSuccess<T>(data: T, options: SuccessOptions = {}): NextResponse {
  const { message, pagination, status = 200, headers = {} } = options;
  return NextResponse.json(
    { success: true, data, ...(message && { message }), ...(pagination && { pagination }) },
    { status, headers },
  );
}

export function sendError(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ success: false, message, ...(code && { code }) }, { status });
}

export function sendValidationError(errors: Array<{ field: string; message: string }>): NextResponse {
  return NextResponse.json({ success: false, message: 'Validation failed', errors }, { status: 400 });
}

// ─── Error handler for Route Handlers ────────────────────────────────────────
// Wraps async route handler and converts thrown errors to proper responses.
// Usage: export const GET = withErrorHandler(async (req) => { ... });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: Request, ctx?: any) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number; code?: string };

      if (error.name === 'AuthError' || error.statusCode === 401) {
        return sendError(error.message, error.statusCode ?? 401, 'UNAUTHORIZED');
      }
      if (error.statusCode === 403) {
        return sendError(error.message, 403, 'FORBIDDEN');
      }
      if (error.statusCode === 404) {
        return sendError(error.message, 404, 'NOT_FOUND');
      }
      if (error.statusCode === 400 || error.name === 'ZodError') {
        return sendError(error.message, 400, 'BAD_REQUEST');
      }

      console.error('[API Error]', error);
      return sendError('Internal server error', 500, 'INTERNAL_ERROR');
    }
  };
}

// ─── AppError ────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
