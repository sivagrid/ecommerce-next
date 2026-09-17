/**
 * store/cartStore.ts — Zustand cart store with optimistic updates.
 *
 * ─── Why Zustand over Redux Toolkit in Next.js? ───────────────────────────────
 *
 * Redux Toolkit:
 *   Pro: Powerful devtools, time-travel debugging, well-known.
 *   Con: Requires a Provider wrapper — this conflicts with React Server
 *        Components (RSC), which cannot be wrapped by a "use client" Provider.
 *        You'd need to split your component tree carefully.
 *
 * Zustand:
 *   Pro: No Provider needed. Import the store hook directly in any Client Component.
 *        Works naturally alongside RSC without wrapping the entire tree.
 *        Smaller bundle (~1KB vs ~8KB for RTK).
 *        Simple, flat API — no actions/reducers/slices ceremony.
 *   Con: Less structure (can be a pro for smaller teams).
 *
 * ─── Optimistic updates in Zustand ───────────────────────────────────────────
 *
 * Same pattern as cartSlice.ts from the MERN version:
 *  Snapshot → Mutate → Confirm/Rollback
 *
 * 1. Save current state as _snapshot
 * 2. Apply mutation locally immediately (optimistic)
 * 3. Call API
 * 4a. API success → replace local state with server truth (confirm)
 * 4b. API failure → restore _snapshot (rollback)
 *
 * ─── Hydration ───────────────────────────────────────────────────────────────
 * On app load, the Header Component calls store.fetchCart() which hydrates
 * the Zustand store from the API. This is fine for a SPA-within-Next.js pattern.
 * For SSR-hydrated cart, you would pass initial cart data as a prop from a
 * Server Component and use zustand/react#useStore with SSR persistence.
 */

'use client'; // store uses browser APIs (fetch)

import { create } from 'zustand';
import type { CartView, CartItem } from '@/types';

interface CartStore {
  // ── State ──────────────────────────────────────────────────────────────────
  view: CartView | null;
  isLoading: boolean;
  itemLoading: Record<string, boolean>; // per-item loading state
  error: string | null;
  _snapshot: CartView | null; // rollback snapshot for optimistic updates

  // ── Computed ───────────────────────────────────────────────────────────────
  itemCount: () => number;

  // ── Actions ────────────────────────────────────────────────────────────────
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  reset: () => void; // called on logout
}

const API = '/api/cart';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  const json = await res.json() as { success: boolean; data: T; message?: string };
  if (!json.success) throw new Error((json as { message?: string }).message ?? 'API error');
  return json.data;
}

function recomputeTotals(items: CartItem[]): Pick<CartView, 'itemCount' | 'subtotal'> {
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal  = parseFloat(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
  return { itemCount, subtotal };
}

export const useCartStore = create<CartStore>((set, get) => ({
  view: null,
  isLoading: false,
  itemLoading: {},
  error: null,
  _snapshot: null,

  itemCount: () => get().view?.itemCount ?? 0,

  // ── fetchCart ────────────────────────────────────────────────────────────
  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await apiFetch<CartView>(API);
      set({ view: cart, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  // ── addItem (NOT optimistic — server computes effectivePrice) ─────────────
  addItem: async (productId, quantity = 1) => {
    set((s) => ({ itemLoading: { ...s.itemLoading, [productId]: true }, error: null }));
    try {
      const cart = await apiFetch<CartView>(API + '/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
      set((s) => ({ view: cart, itemLoading: { ...s.itemLoading, [productId]: false } }));
    } catch (err) {
      set((s) => ({ itemLoading: { ...s.itemLoading, [productId]: false }, error: (err as Error).message }));
    }
  },

  // ── updateItem ✅ OPTIMISTIC ─────────────────────────────────────────────
  updateItem: async (productId, quantity) => {
    const { view } = get();
    if (!view) return;

    // Snapshot → Mutate
    const snapshot = JSON.parse(JSON.stringify(view)) as CartView;
    const updatedItems = view.items.map((item) =>
      item.product._id === productId
        ? { ...item, quantity, lineTotal: parseFloat((item.effectivePrice * quantity).toFixed(2)) }
        : item,
    );
    const { itemCount, subtotal } = recomputeTotals(updatedItems);

    set((s) => ({
      view: { items: updatedItems, itemCount, subtotal },
      _snapshot: snapshot,
      itemLoading: { ...s.itemLoading, [productId]: true },
    }));

    try {
      const cart = await apiFetch<CartView>(`${API}/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      // Confirm
      set((s) => ({ view: cart, _snapshot: null, itemLoading: { ...s.itemLoading, [productId]: false } }));
    } catch (err) {
      // Rollback
      set((s) => ({ view: snapshot, _snapshot: null, itemLoading: { ...s.itemLoading, [productId]: false }, error: (err as Error).message }));
    }
  },

  // ── removeItem ✅ OPTIMISTIC ──────────────────────────────────────────────
  removeItem: async (productId) => {
    const { view } = get();
    if (!view) return;

    // Snapshot → Mutate
    const snapshot = JSON.parse(JSON.stringify(view)) as CartView;
    const filteredItems = view.items.filter((item) => item.product._id !== productId);
    const { itemCount, subtotal } = recomputeTotals(filteredItems);

    set((s) => ({
      view: { items: filteredItems, itemCount, subtotal },
      _snapshot: snapshot,
      itemLoading: { ...s.itemLoading, [productId]: true },
    }));

    try {
      await apiFetch(`${API}/items/${productId}`, { method: 'DELETE' });
      // Confirm
      set((s) => ({ _snapshot: null, itemLoading: { ...s.itemLoading, [productId]: false } }));
    } catch (err) {
      // Rollback
      set((s) => ({ view: snapshot, _snapshot: null, itemLoading: { ...s.itemLoading, [productId]: false }, error: (err as Error).message }));
    }
  },

  // ── clearCart ─────────────────────────────────────────────────────────────
  clearCart: async () => {
    try {
      await apiFetch(API, { method: 'DELETE' });
      set({ view: { items: [], itemCount: 0, subtotal: 0 } });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  // ── reset (on logout) ─────────────────────────────────────────────────────
  reset: () => set({ view: null, isLoading: false, itemLoading: {}, error: null, _snapshot: null }),
}));
