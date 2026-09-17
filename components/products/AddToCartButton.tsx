'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Spinner } from '@/components/ui/Spinner';
import type { Product } from '@/types';

interface AddToCartButtonProps {
  product: Product;
  disabled?: boolean;
  variant?: 'detail' | 'card';
}

export function AddToCartButton({ product, disabled = false, variant = 'detail' }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (adding || disabled) return;
    setAdding(true);
    try {
      await addItem(product._id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  const isDetail = variant === 'detail';

  return (
    <button
      onClick={handleAdd}
      disabled={disabled || adding}
      className={`${isDetail ? 'btn-primary w-full text-base py-3' : 'btn-primary w-full text-sm py-2'} flex items-center justify-center gap-2`}
    >
      {adding ? (
        <><Spinner size="sm" /> Adding…</>
      ) : added ? (
        '✓ Added to cart'
      ) : disabled ? (
        'Out of Stock'
      ) : (
        `Add to Cart${isDetail ? ` · $${product.effectivePrice.toFixed(2)}` : ''}`
      )}
    </button>
  );
}
