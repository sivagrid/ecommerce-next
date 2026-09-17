import Link from 'next/link';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { AddToCartButton } from './AddToCartButton';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const inStock = product.stock > 0;

  return (
    <div className="card group flex flex-col overflow-hidden">
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-gray-100">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-400">📦</div>
        )}
        {product.salePrice && (
          <span className="absolute left-2 top-2 badge badge-red">Sale</span>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-900">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        <p className="text-xs font-medium text-blue-600">{product.category?.name}</p>
        <Link href={`/products/${product.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 leading-snug">
          {product.name}
        </Link>
        <StarRating average={product.rating.average} count={product.rating.count} />

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-lg font-bold text-gray-900">${product.effectivePrice.toFixed(2)}</span>
          {product.salePrice && (
            <span className="text-sm text-gray-400 line-through">${product.price.toFixed(2)}</span>
          )}
        </div>

        <AddToCartButton product={product} disabled={!inStock} variant="card" />
      </div>
    </div>
  );
}
