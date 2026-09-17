'use client';

/**
 * app/cart/page.tsx — Cart page (Client Component).
 *
 * ─── Why Client Component for cart? ──────────────────────────────────────────
 * The cart page is highly interactive:
 *  • Quantity stepper (increment/decrement)
 *  • Remove item with optimistic removal
 *  • Real-time subtotal updates
 *  • "Proceed to checkout" button
 *
 * All of these require browser state (Zustand) and user events.
 * Using a Server Component would mean re-rendering the page on every cart change
 * (slow). Client-side Zustand gives instant, optimistic feedback.
 *
 * ─── Alternative: Server Component + Server Actions ───────────────────────────
 * Next.js 15 Server Actions can mutate cart from a Server Component:
 *   <form action={removeFromCartAction}><button>Remove</button></form>
 * This works without JS (progressive enhancement) and avoids client state.
 * Trade-off: no optimistic updates (page re-fetches after mutation).
 * For a shopping cart, optimistic updates are critical UX — we use Client Component.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { CartSummary } from '@/components/cart/CartSummary';
import { Spinner } from '@/components/ui/Spinner';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { view, isLoading, fetchCart, clearCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!view || view.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-5xl">🛒</p>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="mt-2 text-gray-500">Add some items to get started.</p>
        <Link href="/products" className="btn-primary mt-8 inline-flex">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Shopping Cart ({view.itemCount} {view.itemCount === 1 ? 'item' : 'items'})
        </h1>
        <button
          onClick={() => clearCart()}
          className="text-sm text-red-500 hover:text-red-700 hover:underline"
        >
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {view.items.map((item) => (
            <CartItemRow key={item.product._id} item={item} />
          ))}
        </div>

        {/* Summary */}
        <div>
          <CartSummary
            view={view}
            onCheckout={() => router.push('/checkout')}
            isAuthenticated={!!user}
          />
        </div>
      </div>
    </div>
  );
}
