import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as authService from '@/services/auth.service';
import { sendSuccess, withErrorHandler } from '@/lib/apiResponse';
import { buildAccessCookie, buildRefreshCookie } from '@/lib/auth';
import { checkRateLimit, authRateLimit } from '@/lib/rateLimit';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const rl = await checkRateLimit(req, authRateLimit);
  if (!rl.allowed) return rl.response!;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
  }

  const { user, accessToken, refreshToken } = await authService.login(parsed.data.email, parsed.data.password);

  return sendSuccess({ user, accessToken }, {
    message: 'Login successful',
    headers: {
      'Set-Cookie': [buildAccessCookie(accessToken), buildRefreshCookie(refreshToken)].join(', '),
    },
  });
});
