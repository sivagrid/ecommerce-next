/**
 * app/products/page.tsx — Product listing page (Server Component).
 *
 * ─── Why a Server Component here? ────────────────────────────────────────────
 *
 * This is the most important architectural decision in Next.js:
 * WHEN to use a Server Component vs Client Component.
 *
 * Server Component advantages for this page:
 *  1. SEO: HTML is rendered on the server → Googlebot sees the full product list
 *  2. Performance: Zero client-side JS for the product grid (smaller bundle)
 *  3. Data: Call the service directly without an API round-trip
 *  4. Caching: Next.js caches the rendered output; Redis caches the DB query
 *
 * The interactive parts (search input, filters, add-to-cart button) are
 * wrapped in Client Components ('use client') selectively.
 *
 * ─── URL search params → filters ─────────────────────────────────────────────
 * In the App Router, `searchParams` is a prop passed to page.tsx.
 * It represents the current URL query string.
 * The page re-renders on the server when the URL changes (filter/sort/page).
 * This gives us:
 *  • Shareable, bookmarkable filter URLs
 *  • Working browser back button
 *  • No client-side state needed for filters
 *
 * ─── Streaming with Suspense ─────────────────────────────────────────────────
 * The <Suspense fallback={<ProductGridSkeleton />}> boundary allows the page
 * shell (header, filters sidebar) to stream to the browser immediately while
 * the data fetch completes. Result: faster Time to First Byte (TTFB).
 */

import { Suspense } from 'react';
import { listProducts } from '@/services/product.service';
import { getAllCategories } from '@/services/category.service';
import { connectDB } from '@/lib/db';
import { connectRedis } from '@/lib/redis';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductGridSkeleton } from '@/components/products/ProductGridSkeleton';
import { FiltersBar } from '@/components/products/FiltersBar';
import { PaginationBar } from '@/components/ui/PaginationBar';
import type { Metadata } from 'next';
import type { ProductQueryParams } from '@/types';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our full product catalogue',
};

// Opt-out of static generation — this page depends on search params
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ProductsContent({ params }: { params: ProductQueryParams }) {
  await connectDB();
  connectRedis();

  const { products, pagination } = await listProducts(params);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl">😕</p>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
        <p className="mt-2 text-sm text-gray-500">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 text-sm text-gray-500">
        {pagination.total} product{pagination.total !== 1 ? 's' : ''}
      </div>
      <ProductGrid products={products} />
      <PaginationBar pagination={pagination} />
    </>
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  // JSON round-trip strips BSON ObjectId toJSON methods before passing to a Client Component
  const categories = JSON.parse(JSON.stringify(await getAllCategories().catch(() => [])));

  const params: ProductQueryParams = {
    search:    typeof sp.search === 'string'    ? sp.search    : undefined,
    category:  typeof sp.category === 'string'  ? sp.category  : undefined,
    minPrice:  typeof sp.minPrice === 'string'  ? sp.minPrice  : undefined,
    maxPrice:  typeof sp.maxPrice === 'string'  ? sp.maxPrice  : undefined,
    minRating: typeof sp.minRating === 'string' ? sp.minRating : undefined,
    inStock:   typeof sp.inStock === 'string'   ? sp.inStock   : undefined,
    sort:      typeof sp.sort === 'string'      ? sp.sort      : undefined,
    page:      typeof sp.page === 'string'      ? sp.page      : undefined,
    limit:     typeof sp.limit === 'string'     ? sp.limit     : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Products</h1>

      <div className="flex gap-6">
        {/* Sidebar filters — Client Component for interactivity */}
        <FiltersBar categories={categories} currentParams={params} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Suspense: stream the page shell immediately, wait for products */}
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductsContent params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
