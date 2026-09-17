/**
 * app/api/products/route.ts
 *
 * GET  /api/products  — public, cached (Redis + Next.js cache)
 * POST /api/products  — admin only
 *
 * ─── Next.js Route Handler caching ───────────────────────────────────────────
 * Route Handlers with GET are cacheable. We combine:
 *   1. Redis cache: shared across instances (survives deploy)
 *   2. next/cache revalidation tags: `revalidateTag('products')` on mutation
 *
 * ─── Server Component vs Route Handler for products ──────────────────────────
 * Interview Q: When would you use a Server Component instead of a Route Handler?
 *
 * Server Component:
 *   • Data only consumed by YOUR own frontend (no external API clients needed)
 *   • Want React Suspense, streaming, and RSC caching
 *   • Simpler code: call the service directly in the component
 *
 * Route Handler:
 *   • Building a REST API for external consumers (mobile app, Postman)
 *   • Need HTTP-level caching headers, rate limiting, CORS
 *   • Supporting both Server Components AND external clients
 *
 * We use Route Handlers here for maximum flexibility.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as productService from '@/services/product.service';
import { sendSuccess, withErrorHandler, AppError } from '@/lib/apiResponse';
import { requireRole, verifyRequest } from '@/lib/auth';
import { cache } from '@/lib/redis';
import { checkRateLimit, apiRateLimit } from '@/lib/rateLimit';
import { connectRedis } from '@/lib/redis';
import type { ProductQueryParams } from '@/types';

connectRedis();

export const GET = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const rl = await checkRateLimit(req, apiRateLimit);
  if (!rl.allowed) return rl.response!;

  const { searchParams } = new URL(req.url);
  const params: ProductQueryParams = {
    search:    searchParams.get('search')    ?? undefined,
    category:  searchParams.get('category')  ?? undefined,
    minPrice:  searchParams.get('minPrice')  ?? undefined,
    maxPrice:  searchParams.get('maxPrice')  ?? undefined,
    minRating: searchParams.get('minRating') ?? undefined,
    inStock:   searchParams.get('inStock')   ?? undefined,
    sort:      searchParams.get('sort')      ?? undefined,
    page:      searchParams.get('page')      ?? undefined,
    limit:     searchParams.get('limit')     ?? undefined,
  };

  // Redis cache key = full URL params
  const cacheKey = `products:${searchParams.toString()}`;
  const cached = await cache.get<{ products: unknown; pagination: unknown }>(cacheKey);
  if (cached) {
    return sendSuccess(cached.products, {
      pagination: cached.pagination as import('@/types').PaginationMeta,
      headers: { 'X-Cache': 'HIT' },
    });
  }

  const { products, pagination } = await productService.listProducts(params);
  await cache.set(cacheKey, { products, pagination }, 120); // 2 min

  return sendSuccess(products, { pagination, headers: { 'X-Cache': 'MISS' } });
});

const createSchema = z.object({
  name:        z.string().min(2).max(200),
  description: z.string().min(10),
  price:       z.number().positive(),
  salePrice:   z.number().positive().optional(),
  category:    z.string().length(24), // MongoDB ObjectId
  images:      z.array(z.string().url()).default([]),
  stock:       z.number().int().nonnegative().default(0),
  tags:        z.array(z.string()).default([]),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const user = verifyRequest(req);
  if (!user || user.role !== 'ADMIN') throw new AppError('Admin access required', 403);

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.errors }, { status: 400 });
  }

  const product = await productService.createProduct(parsed.data);
  return sendSuccess(product, { message: 'Product created', status: 201 });
});
