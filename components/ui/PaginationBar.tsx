'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { PaginationMeta } from '@/types';

interface PaginationBarProps {
  pagination: PaginationMeta;
}

export function PaginationBar({ pagination }: PaginationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { page, pages } = pagination;

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (pages <= 1) return null;

  const pageNumbers: (number | '…')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) pageNumbers.push(i);
    if (page < pages - 2) pageNumbers.push('…');
    pageNumbers.push(pages);
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prev
      </button>

      {pageNumbers.map((n, i) =>
        n === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
        ) : (
          <button
            key={n}
            onClick={() => goTo(n)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              n === page
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        )
      )}

      <button
        onClick={() => goTo(page + 1)}
        disabled={page >= pages}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </nav>
  );
}
