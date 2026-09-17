# ShopNext — Production-Grade Next.js E-commerce

A full-stack e-commerce application built with **Next.js 15 App Router**, demonstrating every senior-level pattern: Server Components, streaming, Redis caching, MongoDB transactions, optimistic UI, JWT auth in httpOnly cookies, rate limiting, and Docker.

## Tech Stack

| Layer        | Technology |
|---|---|
| Framework    | Next.js 15 (App Router) |
| Language     | TypeScript 5 |
| Database     | MongoDB 7 + Mongoose 8 |
| Cache        | Redis 7 (ioredis) |
| Auth         | JWT in httpOnly cookies |
| State        | Zustand (no Provider, RSC-compatible) |
| Styling      | Tailwind CSS 3 |
| Testing      | Jest + Testing Library |
| Container    | Docker (multi-stage) + docker-compose |
| CI           | GitHub Actions |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js App Router                 │
│                                                     │
│  ┌──────────────────┐    ┌─────────────────────┐   │
│  │  Server Components│    │ Client Components   │   │
│  │  (RSC)            │    │ ('use client')      │   │
│  │  • Product pages  │    │ • Cart, Auth forms  │   │
│  │  • Order history  │    │ • FiltersBar        │   │
│  │  • generateMeta   │    │ • AddToCartButton   │   │
│  └────────┬─────────┘    └────────┬────────────┘   │
│           │                       │                  │
│           ▼                       ▼                  │
│  ┌────────────────┐    ┌──────────────────────┐     │
│  │  Services      │    │  Zustand Stores      │     │
│  │  product,cart  │    │  authStore,cartStore  │     │
│  │  order,auth    │    │  (optimistic updates) │     │
│  └────────┬───────┘    └──────────┬───────────┘     │
│           │                       │                  │
│           ▼                       ▼                  │
│  ┌─────────────────────────────────────────────┐    │
│  │          Route Handlers  (REST API)          │    │
│  │  /api/products  /api/cart  /api/orders       │    │
│  │  /api/auth/{register,login,logout,refresh}   │    │
│  └──────────────┬──────────────────────────────┘    │
│                 │                                    │
└─────────────────┼────────────────────────────────────┘
                  │
         ┌────────┴─────────┐
         │                  │
    ┌────▼────┐        ┌────▼────┐
    │ MongoDB │        │  Redis  │
    │ (data)  │        │ (cache) │
    └─────────┘        └─────────┘
```

## Features

- **Server Components** — SEO-ready HTML, zero client JS for product grids
- **Streaming with Suspense** — skeleton shown instantly, data loads async
- **Redis cache-aside** — product lists + detail cached (2–5 min TTL)
- **MongoDB transactions** — atomic checkout (stock decrement + order create)
- **Optimistic UI** — cart quantity updates revert on failure (Zustand snapshot)
- **JWT httpOnly cookies** — access (15 min) + refresh (7 day) tokens
- **Edge Middleware** — structural JWT check on every request (no ioredis needed)
- **Rate limiting** — Redis INCR+EXPIRE fixed-window counter
- **Compound indexes** — ESR Rule: Equality → Sort → Range

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local infrastructure)

## Quick Start (Development)

**1. Clone and install**
```bash
cd /Users/siva.vanapalli/Practice/ecommerce-next
npm install
```

**2. Copy env file**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/ecommerce_next
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
NODE_ENV=development
```

**3. Start MongoDB + Redis**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**4. Seed the database**
```bash
npm run seed
```

Seeded accounts:
| Email | Password | Role |
|---|---|---|
| `admin@shopnext.dev` | `Admin@123!` | ADMIN |
| `jane@shopnext.dev`  | `Customer@123!` | CUSTOMER |

**5. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Docker (Production)

```bash
# Copy and fill in production env vars
cp .env.example .env

# Build and run all services
docker compose up -d
```

App available at `http://localhost:3000`.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `JWT_ACCESS_SECRET` | Access token signing secret (32+ chars) | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (32+ chars) | Yes |
| `NODE_ENV` | `development` or `production` | Yes |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript check (no emit) |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Tests with coverage report |
| `npm run seed` | Seed MongoDB with sample data |

## Project Structure

```
ecommerce-next/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Server Component)
│   ├── page.tsx                  # Root → redirects to /products
│   ├── globals.css               # Tailwind + utility classes
│   ├── products/
│   │   ├── page.tsx              # Product listing (Server Component + Suspense)
│   │   └── [slug]/page.tsx       # Product detail (generateMetadata, SSR)
│   ├── cart/page.tsx             # Cart (Client Component, Zustand)
│   ├── checkout/page.tsx         # Checkout form (Client Component)
│   ├── orders/
│   │   ├── page.tsx              # Order history (Server Component)
│   │   └── [id]/page.tsx         # Order detail (Server Component)
│   ├── login/page.tsx            # Login form (Client Component)
│   ├── register/page.tsx         # Register form (Client Component)
│   └── api/                      # Route Handlers (REST API)
│       ├── health/route.ts
│       ├── auth/{register,login,logout,refresh,me}/route.ts
│       ├── products/route.ts + [slug]/route.ts
│       ├── categories/route.ts
│       ├── cart/route.ts + items/route.ts + items/[productId]/route.ts
│       └── orders/route.ts + [id]/route.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Auth/cart init wrapper (Client)
│   │   └── Header.tsx            # Nav with cart badge (Client)
│   ├── products/
│   │   ├── ProductGrid.tsx       # Grid layout (Server)
│   │   ├── ProductCard.tsx       # Individual card (Server)
│   │   ├── ProductGridSkeleton.tsx # Loading skeleton
│   │   ├── FiltersBar.tsx        # URL-driven filters (Client)
│   │   └── AddToCartButton.tsx   # Add-to-cart (Client)
│   ├── cart/
│   │   ├── CartItemRow.tsx       # Quantity stepper (Client)
│   │   └── CartSummary.tsx       # Order totals (Client)
│   └── ui/
│       ├── Spinner.tsx
│       ├── StarRating.tsx
│       └── PaginationBar.tsx
├── lib/
│   ├── db.ts                     # Mongoose singleton (global cache)
│   ├── redis.ts                  # ioredis singleton + cache helper
│   ├── auth.ts                   # JWT sign/verify + cookie builders
│   ├── apiResponse.ts            # sendSuccess / sendError / withErrorHandler
│   └── rateLimit.ts              # Redis INCR+EXPIRE fixed-window
├── models/                       # Mongoose schemas
│   ├── User.ts                   # bcrypt pre-save, comparePassword
│   ├── Category.ts
│   ├── Product.ts                # ESR compound indexes
│   ├── Cart.ts                   # snapshotPrice on add
│   └── Order.ts                  # auto orderNumber, tax/shipping computed
├── services/                     # Business logic (called by RSC + route handlers)
│   ├── auth.service.ts
│   ├── product.service.ts        # Redis cache-aside for list + detail
│   ├── category.service.ts       # Redis 10 min cache
│   ├── cart.service.ts
│   └── order.service.ts          # MongoDB transaction checkout
├── store/
│   ├── authStore.ts              # Zustand: login, register, logout, fetchMe
│   └── cartStore.ts              # Zustand: optimistic updateItem / removeItem
├── middleware.ts                 # Edge Runtime: JWT structural check + security headers
├── types/index.ts                # All shared TypeScript types
├── scripts/seed.ts               # Database seeder
├── __tests__/                    # Jest unit tests
├── Dockerfile                    # Multi-stage build (deps → builder → runner)
├── docker-compose.yml            # Production stack
└── docker-compose.dev.yml        # Dev infrastructure only (mongo + redis)
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in |
| POST | `/api/auth/logout` | — | Sign out (clears cookies) |
| POST | `/api/auth/refresh` | Cookie | Rotate access token |
| GET | `/api/auth/me` | Cookie | Current user |
| GET | `/api/products` | — | List products (filter/sort/paginate) |
| POST | `/api/products` | Admin | Create product |
| GET | `/api/products/:slug` | — | Product detail |
| PUT | `/api/products/:slug` | Admin | Update product |
| DELETE | `/api/products/:slug` | Admin | Delete product |
| GET | `/api/categories` | — | All categories |
| POST | `/api/categories` | Admin | Create category |
| GET | `/api/cart` | User | Get cart |
| DELETE | `/api/cart` | User | Clear cart |
| POST | `/api/cart/items` | User | Add item |
| PATCH | `/api/cart/items/:productId` | User | Update quantity |
| DELETE | `/api/cart/items/:productId` | User | Remove item |
| GET | `/api/orders` | User | User's orders |
| POST | `/api/orders` | User | Checkout (transaction) |
| GET | `/api/orders/:id` | User | Order detail |

## Key Patterns Implemented

### Server Components vs Client Components
- Product listing and detail pages: Server Components (SEO, zero client JS)
- Cart, forms, interactive filters: Client Components (`'use client'`)
- Mix: Server page → passes data → Client sub-component

### Streaming with Suspense
```tsx
<Suspense fallback={<ProductGridSkeleton />}>
  <ProductsContent params={params} />   {/* async Server Component */}
</Suspense>
```

### Redis Cache-Aside
1. Check Redis → HIT: return immediately with `X-Cache: HIT`
2. MISS → query MongoDB → store in Redis (TTL) → return with `X-Cache: MISS`
3. Admin mutations → `invalidatePattern('products:*')` via SCAN cursor

### Optimistic Cart Updates (Zustand)
```ts
// Snapshot → mutate locally → confirm or rollback
const snapshot = get().view;
set({ view: optimisticView });
try { await api.updateItem(); }
catch { set({ view: snapshot }); }  // rollback
```

### MongoDB Transaction Checkout
```ts
const session = await mongoose.startSession();
session.startTransaction();
// validate stock outside transaction
// decrement stock + create order + clear cart inside transaction
await session.commitTransaction();
```

### JWT in httpOnly Cookies
- Access token: 15 min, `SameSite=Lax`, `Secure` in production
- Refresh token: 7 days, `Path=/api/auth/refresh` (only sent on refresh)
- Middleware: structural decode only (Edge Runtime, no ioredis/mongoose)
- Route handlers: full `jsonwebtoken.verify()` with secret
