import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as categoryService from '@/services/category.service';
import { sendSuccess, withErrorHandler, AppError } from '@/lib/apiResponse';
import { verifyRequest } from '@/lib/auth';

export const GET = withErrorHandler(async (): Promise<NextResponse> => {
  const categories = await categoryService.getAllCategories();
  return sendSuccess(categories);
});

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});

export const POST = withErrorHandler(async (req: Request): Promise<NextResponse> => {
  const user = verifyRequest(req);
  if (!user || user.role !== 'ADMIN') throw new AppError('Admin access required', 403);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Validation failed' }, { status: 400 });
  }

  const category = await categoryService.createCategory(parsed.data);
  return sendSuccess(category, { message: 'Category created', status: 201 });
});
