'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { Spinner } from '@/components/ui/Spinner';
import type { CartItem } from '@/types';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateItem, removeItem, itemLoading } = useCartStore();
  const productId = item.product._id;
  const isLoading  = itemLoading[productId] ?? false;

  return (
    <div className="card flex gap-4 p-4">
      {/* Thumbnail */}
      <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
          {item.product.images[0] ? (
            <Image
              src={item.product.images[0]}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📦</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <Link href={`/products/${item.product.slug}`} className="truncate font-medium text-gray-900 hover:text-blue-600">
          {item.product.name}
        </Link>
        <p className="text-sm text-gray-500">${item.effectivePrice.toFixed(2)} each</p>

        {/* Quantity stepper + remove */}
        <div className="mt-auto flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-gray-300">
            <button
              onClick={() => updateItem(productId, item.quantity - 1)}
              disabled={isLoading || item.quantity <= 1}
              className="px-3 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40 rounded-l-lg"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium">
              {isLoading ? <Spinner size="sm" className="mx-auto" /> : item.quantity}
            </span>
            <button
              onClick={() => updateItem(productId, item.quantity + 1)}
              disabled={isLoading || item.quantity >= item.product.stock}
              className="px-3 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40 rounded-r-lg"
            >
              +
            </button>
          </div>

          <button
            onClick={() => removeItem(productId)}
            disabled={isLoading}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="flex-shrink-0 text-right">
        <p className="font-semibold text-gray-900">${item.lineTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}
