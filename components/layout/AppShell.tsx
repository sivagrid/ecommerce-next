'use client';

import { useEffect } from 'react';
import { Header } from './Header';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const fetchMe  = useAuthStore((s) => s.fetchMe);
  const fetchCart = useCartStore((s) => s.fetchCart);

  // Rehydrate auth and cart once on mount
  useEffect(() => {
    fetchMe().then((authed) => {
      if (authed) fetchCart();
    });
  }, [fetchMe, fetchCart]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ShopNext. Built with Next.js 15 + App Router.
      </footer>
    </div>
  );
}
