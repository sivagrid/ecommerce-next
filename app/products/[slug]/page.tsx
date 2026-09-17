/**
 * app/products/[slug]/page.tsx — Product detail page (Server Component).
 *
 * ─── generateMetadata ─────────────────────────────────────────────────────────
 * Next.js calls generateMetadata() on the server before rendering the page.
 * The returned metadata is injected into <head> — Googlebot sees it.
 * This is how you get per-page dynamic og:title, og:image, etc. for SEO.
 *
 * ─── generateStaticParams ────────────────────────────────────────────────────
 * Pre-generates static HTML for all known slugs at build time (SSG).
 * After the build, if a product slug changes, set revalidate to invalidate.
 * Unlisted slugs fall back to on-demand rendering (ISR).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductBySlug } from '@/services/product.service';
import { connectDB } from '@/lib/db';
import { connectRedis } from '@/lib/redis';
import { AddToCartButton } from '@/components/products/AddToCartButton';
import { StarRating } from '@/components/ui/StarRating';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectDB();
  connectRedis();
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: product.name,
      description: product.description.slice(0, 160),
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 160),
        images: product.images[0] ? [{ url: product.images[0] }] : [],
      },
    };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  await connectDB();
  connectRedis();
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  const inStock = product.stock > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <span className="text-6xl">📦</span>
              </div>
            )}
          </div>
          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.slice(1).map((img, i) => (
                <div key={i} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">{product.category?.name}</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>
          </div>

          <StarRating average={product.rating.average} count={product.rating.count} />

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              ${product.effectivePrice.toFixed(2)}
            </span>
            {product.salePrice && (
              <>
                <span className="text-xl text-gray-400 line-through">${product.price.toFixed(2)}</span>
                <span className="badge-green">
                  {Math.round((1 - product.salePrice / product.price) * 100)}% off
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <p className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
            {inStock ? `✓ In stock (${product.stock} available)` : '✗ Out of stock'}
          </p>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="badge badge-blue">{tag}</span>
              ))}
            </div>
          )}

          {/* Add to cart — Client Component */}
          <div className="mt-2">
            <AddToCartButton product={product} disabled={!inStock} />
          </div>
        </div>
      </div>
    </div>
  );
}
