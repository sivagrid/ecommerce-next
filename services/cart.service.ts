/**
 * services/cart.service.ts — Cart business logic.
 *
 * ─── effectivePrice vs snapshotPrice ─────────────────────────────────────────
 *
 * effectivePrice: live price (salePrice ?? price) — computed fresh from DB each
 *   time the cart is fetched. Always reflects the current live price.
 *
 * snapshotPrice: the price at the time the item was added to the cart. Used for
 *   display ("was $X when you added it") but the checkout uses effectivePrice.
 *
 * Why not lock the price?
 *   If a sale ends, we should charge the current price at checkout (customer is
 *   made aware by the UI updating). A locked price could be exploited to
 *   permanently lock sale prices.
 */

import { connectDB } from '@/lib/db';
import { Cart } from '@/models/Cart';
import { Product } from '@/models/Product';
import { AppError } from '@/lib/apiResponse';
import type { CartView, CartItem } from '@/types';
import type { IProduct } from '@/models/Product';

// ─── formatCart ───────────────────────────────────────────────────────────────

function formatCart(cartDoc: {
  items: Array<{ product: IProduct & { _id: unknown }; quantity: number; snapshotPrice: number }>;
}): CartView {
  const items: CartItem[] = cartDoc.items
    .filter((item) => item.product && (item.product as IProduct).isActive)
    .map((item) => {
      const p = item.product as IProduct & { _id: unknown };
      const effectivePrice = p.salePrice ?? p.price;
      return {
        product: {
          _id: String(p._id),
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice,
          effectivePrice,
          images: p.images,
          category: p.category as unknown as import('@/types').Category,
          stock: p.stock,
          rating: p.rating,
          tags: p.tags,
          isActive: p.isActive,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        },
        quantity: item.quantity,
        effectivePrice,
        lineTotal: parseFloat((effectivePrice * item.quantity).toFixed(2)),
      };
    });

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal  = parseFloat(items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));

  return { items, itemCount, subtotal };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getCart(userId: string): Promise<CartView> {
  await connectDB();
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    model: 'Product',
    populate: { path: 'category', model: 'Category' },
  });
  if (!cart) return { items: [], itemCount: 0, subtotal: 0 };
  return formatCart(cart as unknown as Parameters<typeof formatCart>[0]);
}

export async function addToCart(userId: string, productId: string, quantity: number): Promise<CartView> {
  await connectDB();

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError('Product not found', 404);
  if (product.stock < quantity) throw new AppError(`Only ${product.stock} in stock`, 400);

  const effectivePrice = product.salePrice ?? product.price;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [{ product: productId, quantity, snapshotPrice: effectivePrice }] });
  } else {
    const existing = cart.items.find((i) => String(i.product) === productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) throw new AppError(`Only ${product.stock} in stock`, 400);
      existing.quantity = newQty;
    } else {
      cart.items.push({ product: productId as unknown as import('mongoose').Types.ObjectId, quantity, snapshotPrice: effectivePrice });
    }
    await cart.save();
  }

  return getCart(userId);
}

export async function updateCartItem(userId: string, productId: string, quantity: number): Promise<CartView> {
  await connectDB();

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);
  if (product.stock < quantity) throw new AppError(`Only ${product.stock} in stock`, 400);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError('Cart not found', 404);

  const item = cart.items.find((i) => String(i.product) === productId);
  if (!item) throw new AppError('Item not in cart', 404);

  item.quantity = quantity;
  await cart.save();
  return getCart(userId);
}

export async function removeFromCart(userId: string, productId: string): Promise<CartView> {
  await connectDB();
  await Cart.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { product: productId } } },
  );
  return getCart(userId);
}

export async function clearCart(userId: string): Promise<void> {
  await connectDB();
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
}
