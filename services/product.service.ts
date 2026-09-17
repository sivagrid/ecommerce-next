import { connectDB } from '@/lib/db';
import { cache } from '@/lib/redis';
import { Product } from '@/models/Product';
import { Category } from '@/models/Category';
import { AppError } from '@/lib/apiResponse';
import type { ProductQueryParams, Product as ProductType, Category as CategoryType, PaginationMeta } from '@/types';
import type { FilterQuery } from 'mongoose';
import type { IProduct } from '@/models/Product';

// ─── helpers ─────────────────────────────────────────────────────────────────

function serializeCategory(cat: Record<string, unknown> | null | undefined): CategoryType | undefined {
  if (!cat) return undefined;
  return {
    _id: String(cat._id),
    name: cat.name as string,
    slug: cat.slug as string,
    description: cat.description as string | undefined,
    isActive: cat.isActive as boolean,
  };
}

function serializeProduct(rawDoc: Record<string, unknown>): ProductType {
  // JSON round-trip forces BSON ObjectIds (which have toJSON) → plain strings
  const doc: Record<string, unknown> = JSON.parse(JSON.stringify(rawDoc));
  const price = doc.price as number;
  const salePrice = doc.salePrice as number | undefined;
  const effectivePrice = salePrice ?? price;
  const cat = doc.category as Record<string, unknown> | null | undefined;

  return {
    _id: String(doc._id),
    name: doc.name as string,
    slug: doc.slug as string,
    description: doc.description as string,
    price,
    salePrice,
    effectivePrice,
    images: (doc.images as string[]) ?? [],
    category: serializeCategory(cat) as CategoryType,
    stock: doc.stock as number,
    rating: doc.rating as { average: number; count: number },
    tags: (doc.tags as string[]) ?? [],
    isActive: doc.isActive as boolean,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt) as string,
    updatedAt: (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt) as string,
  };
}

// ─── List products ────────────────────────────────────────────────────────────

export async function listProducts(
  params: ProductQueryParams,
): Promise<{ products: ProductType[]; pagination: PaginationMeta }> {
  await connectDB();

  const page  = Math.max(1, parseInt(params.page  ?? '1',  10));
  const limit = Math.min(100, parseInt(params.limit ?? '12', 10));
  const skip  = (page - 1) * limit;

  const filter: FilterQuery<IProduct> = { isActive: true };

  if (params.search) {
    filter.$text = { $search: params.search };
  }
  if (params.category) {
    const cat = await Category.findOne({ slug: params.category }).lean();
    if (cat) filter.category = cat._id;
    else filter.category = null;
  }
  if (params.minPrice) filter.price = { ...filter.price as object, $gte: parseFloat(params.minPrice) };
  if (params.maxPrice) filter.price = { ...filter.price as object, $lte: parseFloat(params.maxPrice) };
  if (params.minRating) filter['rating.average'] = { $gte: parseFloat(params.minRating) };
  if (params.inStock === 'true') filter.stock = { $gt: 0 };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest:     { createdAt: -1 },
    price_asc:  { price: 1 },
    price_desc: { price: -1 },
    rating:     { 'rating.average': -1 },
    popular:    { 'rating.count': -1 },
  };
  const sort = sortMap[params.sort ?? 'newest'] ?? { createdAt: -1 };

  const [docs, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).populate('category').lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: docs.map((d) => serializeProduct(d as Record<string, unknown>)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ─── Single product ───────────────────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<ProductType> {
  await connectDB();

  const cacheKey = `product:${slug}`;
  const cached = await cache.get<ProductType>(cacheKey);
  if (cached) return cached;

  const doc = await Product.findOne({ slug, isActive: true }).populate('category').lean();
  if (!doc) throw new AppError(`Product not found: ${slug}`, 404, 'NOT_FOUND');

  const product = serializeProduct(doc as Record<string, unknown>);
  await cache.set(cacheKey, product, 300);
  return product;
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function createProduct(data: {
  name: string; description: string; price: number; salePrice?: number;
  category: string; images?: string[]; stock?: number; tags?: string[];
}): Promise<ProductType> {
  await connectDB();
  const slugify = (await import('slugify')).default;
  const slug = slugify(data.name, { lower: true, strict: true });

  const exists = await Product.exists({ slug });
  if (exists) throw new AppError('A product with this name already exists', 400);

  const created = await Product.create({ ...data, slug });
  const doc = await Product.findById(created._id).populate('category').lean();
  await cache.invalidatePattern('products:*');
  return serializeProduct(doc as Record<string, unknown>);
}

export async function updateProduct(id: string, data: Partial<{
  name: string; description: string; price: number; salePrice: number;
  category: string; images: string[]; stock: number; tags: string[];
}>): Promise<ProductType> {
  await connectDB();
  const doc = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('category').lean();
  if (!doc) throw new AppError('Product not found', 404);
  await cache.invalidatePattern('products:*');
  return serializeProduct(doc as Record<string, unknown>);
}

export async function deleteProduct(id: string): Promise<void> {
  await connectDB();
  const result = await Product.findByIdAndUpdate(id, { isActive: false });
  if (!result) throw new AppError('Product not found', 404);
  await cache.invalidatePattern('products:*');
}
