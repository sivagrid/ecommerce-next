import { connectDB } from '@/lib/db';
import { cache } from '@/lib/redis';
import { Category } from '@/models/Category';
import { AppError } from '@/lib/apiResponse';
import type { Category as CategoryType } from '@/types';

function toCategory(rawDoc: Record<string, unknown>): CategoryType {
  const doc: Record<string, unknown> = JSON.parse(JSON.stringify(rawDoc));
  return {
    _id: String(doc._id),
    name: doc.name as string,
    slug: doc.slug as string,
    description: doc.description as string | undefined,
    isActive: doc.isActive as boolean,
  };
}

export async function getAllCategories(): Promise<CategoryType[]> {
  await connectDB();

  const cacheKey = 'categories:all';
  const cached = await cache.get<CategoryType[]>(cacheKey);
  if (cached) return cached;

  const docs = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  const categories = docs.map(toCategory);
  await cache.set(cacheKey, categories, 600); // 10 min
  return categories;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryType> {
  await connectDB();
  const doc = await Category.findOne({ slug, isActive: true }).lean();
  if (!doc) throw new AppError('Category not found', 404);
  return toCategory(doc as Record<string, unknown>);
}

export async function createCategory(data: { name: string; description?: string }): Promise<CategoryType> {
  await connectDB();
  const slugify = (await import('slugify')).default;
  const slug = slugify(data.name, { lower: true, strict: true });
  const exists = await Category.exists({ slug });
  if (exists) throw new AppError('Category already exists', 400);
  const doc = await Category.create({ ...data, slug });
  await cache.invalidatePattern('categories:*');
  return toCategory(doc.toObject() as Record<string, unknown>);
}

export async function updateCategory(id: string, data: { name?: string; description?: string }): Promise<CategoryType> {
  await connectDB();
  const doc = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  if (!doc) throw new AppError('Category not found', 404);
  await cache.invalidatePattern('categories:*');
  return toCategory(doc as Record<string, unknown>);
}

export async function deleteCategory(id: string): Promise<void> {
  await connectDB();
  const doc = await Category.findByIdAndUpdate(id, { isActive: false });
  if (!doc) throw new AppError('Category not found', 404);
  await cache.invalidatePattern('categories:*');
}
