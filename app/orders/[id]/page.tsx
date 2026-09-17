import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getOrderById } from '@/services/order.service';
import type { Metadata } from 'next';
import type { OrderStatus } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id.slice(-8).toUpperCase()}` };
}

const statusColors: Record<OrderStatus, string> = {
  pending:    'badge-yellow',
  processing: 'badge-blue',
  shipped:    'badge-blue',
  delivered:  'badge-green',
  cancelled:  'badge-red',
};

const statusSteps: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered'];

export default async function OrderDetailPage({ params }: Props) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login?redirect=/orders');
  }

  await connectDB();
  const { id } = await params;

  let order;
  try {
    order = await getOrderById(id, user.userId);
  } catch {
    notFound();
  }

  const currentStep = statusSteps.indexOf(order.status as OrderStatus);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-700">← My Orders</Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`badge text-sm ${statusColors[order.status]}`}>{order.status}</span>
      </div>

      {/* Progress tracker */}
      {order.status !== 'cancelled' && (
        <div className="card p-5 mb-6">
          <div className="flex items-center">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <div className="hidden sm:block ml-1.5 text-xs font-medium capitalize text-gray-600">{step}</div>
                {i < statusSteps.length - 1 && (
                  <div className={`flex-1 mx-2 h-0.5 ${i < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Items ordered</h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.product} className="flex gap-4 py-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity} × ${item.effectivePrice.toFixed(2)}</p>
                  </div>
                  <p className="ml-4 font-semibold text-gray-900">${item.lineTotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Order total</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${order.tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>${order.shipping.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900 text-base">
                <span>Total</span><span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Ship to</h2>
            <address className="not-italic text-sm text-gray-600 space-y-0.5">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
