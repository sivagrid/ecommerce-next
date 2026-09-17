import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as cartService from '@/services/cart.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';

const schema = z.object({
  productId: z.string().length(24),
  quantity:  z.number().int().positive(),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const user = await requireAuth();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'productId and quantity are required' }, { status: 400 });
  }

  const cart = await cartService.addToCart(user.userId, parsed.data.productId, parsed.data.quantity);
  return sendSuccess(cart, { message: 'Item added to cart' });
});
