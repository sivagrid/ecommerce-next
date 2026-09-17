import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as cartService from '@/services/cart.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';

type Context = { params: Promise<{ productId: string }> };

export const PATCH = withErrorHandler(async (req: Request, ctx?: Context): Promise<NextResponse> => {
  const user = await requireAuth();
  const { productId } = await ctx!.params;
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ quantity: z.number().int().positive() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: 'quantity is required' }, { status: 400 });

  const cart = await cartService.updateCartItem(user.userId, productId, parsed.data.quantity);
  return sendSuccess(cart);
});

export const DELETE = withErrorHandler(async (_req: Request, ctx?: Context): Promise<NextResponse> => {
  const user = await requireAuth();
  const { productId } = await ctx!.params;
  const cart = await cartService.removeFromCart(user.userId, productId);
  return sendSuccess(cart, { message: 'Item removed' });
});
