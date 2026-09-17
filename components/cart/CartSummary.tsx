'use client';

import Link from 'next/link';
import type { CartView } from '@/types';

interface CartSummaryProps {
  view: CartView;
  onCheckout: () => void;
  isAuthenticated: boolean;
}

export function CartSummary({ view, onCheckout, isAuthenticated }: CartSummaryProps) {
  const TAX_RATE = 0.08;
  const SHIPPING = 9.99;
  const tax   = parseFloat((view.subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((view.subtotal + tax + SHIPPING).toFixed(2));

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({view.itemCount} items)</span>
          <span>${view.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Estimated tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>${SHIPPING.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-gray-900">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>

      {isAuthenticated ? (
        <button onClick={onCheckout} className="btn-primary w-full">
          Proceed to Checkout
        </button>
      ) : (
        <div className="space-y-2">
          <Link href="/login?redirect=/checkout" className="btn-primary w-full text-center block">
            Sign in to Checkout
          </Link>
          <Link href="/register" className="btn-secondary w-full text-center block text-sm">
            Create an account
          </Link>
        </div>
      )}
    </div>
  );
}
