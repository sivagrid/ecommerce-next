'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Spinner } from '@/components/ui/Spinner';
import type { ShippingAddress } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { view, reset } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState<ShippingAddress>({
    street: '', city: '', state: '', zipCode: '', country: 'US',
  });

  const TAX_RATE = 0.08;
  const SHIPPING = 9.99;
  const subtotal = view?.subtotal ?? 0;
  const tax      = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total    = parseFloat((subtotal + tax + SHIPPING).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!view || view.items.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shippingAddress: address }),
      });
      const json = await res.json() as { success: boolean; data?: { _id: string }; message?: string };
      if (!json.success) throw new Error(json.message ?? 'Checkout failed');

      // Clear cart immediately (optimistic — matches server action)
      reset();
      router.push(`/orders/${json.data!._id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!view || view.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <a href="/cart" className="link mt-2 block">Go to cart →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Shipping form */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Shipping Address</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Street</label>
              <input className="input" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required placeholder="Springfield" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                <input className="input" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} required placeholder="IL" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ZIP Code</label>
                <input className="input" value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} required placeholder="62701" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                <select className="input" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? <><Spinner size="sm" /> Placing Order…</> : `Place Order · $${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        {/* Order summary */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>
          <div className="space-y-3">
            {view.items.map((item) => (
              <div key={item.product._id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product.name} × {item.quantity}</span>
                <span className="font-medium">${item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span><span>${SHIPPING.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
