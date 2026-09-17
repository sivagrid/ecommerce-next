import { NextResponse } from 'next/server';
import * as productService from '@/services/product.service';
import { sendSuccess, withErrorHandler, AppError } from '@/lib/apiResponse';
import { verifyRequest } from '@/lib/auth';

type Context = { params: Promise<{ slug: string }> };

export const GET = withErrorHandler(async (_req: Request, ctx?: Context): Promise<NextResponse> => {
  const { slug } = await ctx!.params;
  const product = await productService.getProductBySlug(slug);
  return sendSuccess(product);
});

export const PUT = withErrorHandler(async (req: Request, ctx?: Context): Promise<NextResponse> => {
  const user = verifyRequest(req);
  if (!user || user.role !== 'ADMIN') throw new AppError('Admin access required', 403);

  const { slug } = await ctx!.params;
  const body = await req.json().catch(() => ({}));
  const product = await productService.updateProduct(slug, body);
  return sendSuccess(product, { message: 'Product updated' });
});

export const DELETE = withErrorHandler(async (req: Request, ctx?: Context): Promise<NextResponse> => {
  const user = verifyRequest(req);
  if (!user || user.role !== 'ADMIN') throw new AppError('Admin access required', 403);

  const { slug } = await ctx!.params;
  await productService.deleteProduct(slug);
  return sendSuccess(null, { message: 'Product deleted' });
});
