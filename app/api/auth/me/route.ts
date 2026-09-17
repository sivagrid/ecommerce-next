import { requireAuth } from '@/lib/auth';
import * as authService from '@/services/auth.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import type { NextResponse } from 'next/server';

export const GET = withErrorHandler(async (): Promise<NextResponse> => {
  const user = await requireAuth();
  const me = await authService.getMe(user.userId);
  return sendSuccess(me);
});
