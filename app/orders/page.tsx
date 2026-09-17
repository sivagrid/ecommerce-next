import { redirect } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getUserOrders } from '@/services/order.service';
import type { Metadata } from 'next';
import type { OrderStatus } from '@/types';

export const metadata: Metadata = { title: 'My Orders' };
export const dynamic = 'force-dynamic';

const statusColors: Record<OrderStatus, string> = {
  pending:    'badge-yellow',
  processing: 'badge-blue',
  shipped:    'badge-blue',
  delivered:  'badge-green',
  cancelled:  'badge-red',
};

export default async function OrdersPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login?redirect=/orders');
  }

  await connectDB();
  const { orders } = await getUserOrders(user.userId);

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-5xl">📦</p>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">No orders yet</h2>
        <p className="mt-2 text-gray-500">When you place orders they will appear here.</p>
        <Link href="/products" className="btn-primary mt-8 inline-flex">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order._id} href={`/orders/${order._id}`} className="card block p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">Order #{order.orderNumber}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${statusColors[order.status]}`}>{order.status}</span>
                <span className="font-semibold text-gray-900">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
