/**
 * services/order.service.ts — Checkout with MongoDB transaction.
 *
 * Same ACID checkout pattern as the MERN version.
 * See server/src/services/order.service.ts in ecommerce-cart for full annotations.
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Cart } from '@/models/Cart';
import { Product } from '@/models/Product';
import { Order } from '@/models/Order';
import { AppError } from '@/lib/apiResponse';
import type { Order as OrderType, ShippingAddress, PaginationMeta } from '@/types';

function toOrder(doc: InstanceType<typeof Order>): OrderType {
  const raw: Record<string, unknown> = JSON.parse(JSON.stringify(doc.toObject()));
  const items = (raw.items as Record<string, unknown>[]).map((item) => ({
    product: String(item.product),
    name: item.name as string,
    image: item.image as string,
    quantity: item.quantity as number,
    effectivePrice: item.effectivePrice as number,
    lineTotal: item.lineTotal as number,
  }));
  return {
    _id: String(raw._id),
    orderNumber: raw.orderNumber as string,
    user: String(raw.user),
    items,
    status: raw.status as OrderType['status'],
    subtotal: raw.subtotal as number,
    tax: raw.tax as number,
    shipping: raw.shipping as number,
    total: raw.total as number,
    shippingAddress: raw.shippingAddress as OrderType['shippingAddress'],
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

export async function checkout(
  userId: string,
  shippingAddress: ShippingAddress,
): Promise<OrderType> {
  await connectDB();

  // ── Phase 1: Validate (outside transaction) ──────────────────────────────
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400);

  for (const item of cart.items) {
    const product = item.product as unknown as InstanceType<typeof Product>;
    if (!product || !product.isActive) throw new AppError(`Product unavailable`, 400);
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }
  }

  // ── Phase 2: Transaction ──────────────────────────────────────────────────
  const session = await mongoose.startSession();
  let createdOrder: InstanceType<typeof Order> | undefined;

  await session.withTransaction(async () => {
    // Decrement stock atomically for each item
    for (const item of cart.items) {
      const product = item.product as unknown as InstanceType<typeof Product>;
      const result = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session, new: true },
      );
      if (!result) throw new AppError(`Stock changed for ${product.name}`, 409);
    }

    // Build order items with snapshots
    const TAX_RATE = 0.08;
    const SHIPPING_FLAT = 9.99;
    const orderItems = cart.items.map((item) => {
      const p = item.product as unknown as InstanceType<typeof Product>;
      const effectivePrice = p.salePrice ?? p.price;
      return {
        product: p._id,
        name: p.name,
        image: p.images[0] ?? '',
        quantity: item.quantity,
        effectivePrice,
        lineTotal: parseFloat((effectivePrice * item.quantity).toFixed(2)),
      };
    });
    const subtotal = parseFloat(orderItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const tax      = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const shipping = SHIPPING_FLAT;
    const total    = parseFloat((subtotal + tax + shipping).toFixed(2));

    // Create order (generate orderNumber here — pre('save') doesn't fire with create+session)
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const [order] = await Order.create(
      [{ orderNumber, user: userId, items: orderItems, subtotal, tax, shipping, total, shippingAddress }],
      { session },
    );
    createdOrder = order;

    // Clear cart
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { session });
  });

  session.endSession();

  if (!createdOrder) throw new AppError('Order creation failed', 500);
  return toOrder(createdOrder);
}

export async function getUserOrders(
  userId: string,
  page = 1,
  limit = 10,
): Promise<{ orders: OrderType[]; pagination: PaginationMeta }> {
  await connectDB();
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: userId }),
  ]);
  return {
    orders: docs.map(toOrder),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getOrderById(id: string, userId: string): Promise<OrderType> {
  await connectDB();
  const doc = await Order.findOne({ _id: id, user: userId });
  if (!doc) throw new AppError('Order not found', 404);
  return toOrder(doc);
}
