import { NextResponse } from 'next/server';
import { buildClearCookies } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  const clearCookies = buildClearCookies();
  // Set both clear cookies on the response
  clearCookies.forEach((c, i) => {
    if (i === 0) response.headers.set('Set-Cookie', c);
    else response.headers.append('Set-Cookie', c);
  });
  return response;
}
