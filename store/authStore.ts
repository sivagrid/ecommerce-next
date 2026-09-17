'use client';

import { create } from 'zustand';
import type { User } from '@/types';
import { useCartStore } from './cartStore';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  fetchMe: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

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

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const user = await apiFetch<User>('/api/auth/me');
      set({ user, isLoading: false, isInitialized: true });
      return true;
    } catch {
      set({ user: null, isLoading: false, isInitialized: true });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ user: User; accessToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      set({ user: data.user, isLoading: false });
      useCartStore.getState().fetchCart();
      return true;
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ user: User; accessToken: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      set({ user: data.user, isLoading: false });
      useCartStore.getState().fetchCart();
      return true;
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
      return false;
    }
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    set({ user: null, error: null });
    useCartStore.getState().reset();
  },

  clearError: () => set({ error: null }),
}));
