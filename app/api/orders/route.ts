import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as orderService from '@/services/order.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';

const addressSchema = z.object({
  street:  z.string().min(1),
  city:    z.string().min(1),
  state:   z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().min(1),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ shippingAddress: addressSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Valid shipping address is required' }, { status: 400 });
  }

  const order = await orderService.checkout(user.userId, parsed.data.shippingAddress);
  return sendSuccess(order, { message: 'Order placed successfully', status: 201 });
});

export const GET = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get('page')  ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);

  const { orders, pagination } = await orderService.getUserOrders(user.userId, page, limit);
  return sendSuccess(orders, { pagination });
});
