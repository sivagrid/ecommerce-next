import { NextResponse } from 'next/server';
import * as orderService from '@/services/order.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { requireAuth } from '@/lib/auth';

type Context = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_req: Request, ctx?: Context): Promise<NextResponse> => {
  const user = await requireAuth();
  const { id } = await ctx!.params;
  const order = await orderService.getOrderById(id, user.userId);
  return sendSuccess(order);
});
