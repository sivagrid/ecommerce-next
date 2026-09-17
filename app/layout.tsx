/**
 * app/layout.tsx — Root layout.
 *
 * ─── Next.js App Router layout hierarchy ─────────────────────────────────────
 *
 * layout.tsx wraps every page in its directory and subdirectories.
 * The root layout is required and must include <html> and <body> tags.
 *
 * Layout vs Template:
 *   layout.tsx — persists between route changes (state is preserved)
 *   template.tsx — re-renders on every route change (fresh mount each time)
 *
 * ─── Server Component by default ─────────────────────────────────────────────
 * Layouts are Server Components by default. They run on the server, can
 * access the database directly, and their output is cached by Next.js.
 * They do NOT re-render on client navigation — they are truly shared.
 *
 * ─── Metadata API ────────────────────────────────────────────────────────────
 * Next.js 15 Metadata API replaces <Head> tags. Export a `metadata` object
 * or a `generateMetadata` function from any layout or page.
 * Benefits: automatic deduplication, social preview tags, JSON-LD, etc.
 */

import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'ShopNext — E-commerce',
    template: '%s | ShopNext',
  },
  description: 'Production-grade Next.js e-commerce with Redis caching, MongoDB transactions, and optimistic UI.',
  keywords: ['ecommerce', 'nextjs', 'shopping', 'typescript'],
  openGraph: {
    type: 'website',
    siteName: 'ShopNext',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
