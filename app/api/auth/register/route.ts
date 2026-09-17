import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as authService from '@/services/auth.service';
import { sendSuccess, sendError, withErrorHandler } from '@/lib/apiResponse';
import { buildAccessCookie, buildRefreshCookie } from '@/lib/auth';
import { checkRateLimit, authRateLimit } from '@/lib/rateLimit';
import { connectRedis } from '@/lib/redis';

connectRedis();

const schema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const rl = await checkRateLimit(req, authRateLimit);
  if (!rl.allowed) return rl.response!;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: String(e.path[0]), message: e.message }));
    return NextResponse.json({ success: false, message: 'Validation failed', errors }, { status: 400 });
  }

  const { user, accessToken, refreshToken } = await authService.register(parsed.data);

  return sendSuccess({ user, accessToken }, {
    message: 'Account created successfully',
    status: 201,
    headers: {
      'Set-Cookie': [buildAccessCookie(accessToken), buildRefreshCookie(refreshToken)].join(', '),
    },
  });
});
