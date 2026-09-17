import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // needed for mongoose

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    },
  });
}
