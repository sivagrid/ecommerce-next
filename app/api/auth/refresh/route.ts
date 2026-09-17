import { NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken, buildAccessCookie } from '@/lib/auth';
import { sendError, sendSuccess } from '@/lib/apiResponse';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (!refreshToken) return sendError('Refresh token missing', 401);

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    return sendSuccess({ accessToken }, {
      headers: { 'Set-Cookie': buildAccessCookie(accessToken) },
    });
  } catch {
    return sendError('Invalid or expired refresh token', 401);
  }
}
