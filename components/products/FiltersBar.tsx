'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { Category, ProductQueryParams } from '@/types';

interface FiltersBarProps {
  categories: Category[];
  currentParams: ProductQueryParams;
}

const SORT_OPTIONS = [
  { value: 'newest',        label: 'Newest' },
  { value: 'price_asc',     label: 'Price: Low → High' },
  { value: 'price_desc',    label: 'Price: High → Low' },
  { value: 'rating_desc',   label: 'Top Rated' },
  { value: 'name_asc',      label: 'Name A–Z' },
];

export function FiltersBar({ categories, currentParams }: FiltersBarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const update = useCallback((updates: Partial<ProductQueryParams>) => {
    const next = { ...currentParams, ...updates, page: '1' };
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(next)) {
      if (val != null && val !== '') params.set(key, val);
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [currentParams, pathname, router]);

  const reset = () => router.push(pathname);

  const hasFilters = Object.values(currentParams).some(Boolean);

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="card p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Filters</h2>
          {hasFilters && (
            <button onClick={reset} className="text-xs text-blue-600 hover:underline">Clear all</button>
          )}
        </div>

        {/* Search */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
          <input
            type="search"
            className="input"
            placeholder="Search products…"
            defaultValue={currentParams.search ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') update({ search: (e.target as HTMLInputElement).value });
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
          <select
            className="input"
            value={currentParams.category ?? ''}
            onChange={(e) => update({ category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Price range</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input"
              placeholder="Min"
              min="0"
              defaultValue={currentParams.minPrice ?? ''}
              onBlur={(e) => update({ minPrice: e.target.value || undefined })}
            />
            <input
              type="number"
              className="input"
              placeholder="Max"
              min="0"
              defaultValue={currentParams.maxPrice ?? ''}
              onBlur={(e) => update({ maxPrice: e.target.value || undefined })}
            />
          </div>
        </div>

        {/* In stock */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
            checked={currentParams.inStock === 'true'}
            onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })}
          />
          <span className="text-sm font-medium text-gray-700">In stock only</span>
        </label>

        {/* Sort */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Sort by</label>
          <select
            className="input"
            value={currentParams.sort ?? 'newest'}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
