import { NextResponse } from 'next/server';
import * as cartService from '@/services/cart.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';

export const GET = withErrorHandler(async (): Promise<NextResponse> => {
  const user = await requireAuth();
  const cart = await cartService.getCart(user.userId);
  return sendSuccess(cart);
});

export const DELETE = withErrorHandler(async (): Promise<NextResponse> => {
  const user = await requireAuth();
  await cartService.clearCart(user.userId);
  return sendSuccess({ items: [], itemCount: 0, subtotal: 0 }, { message: 'Cart cleared' });
});
