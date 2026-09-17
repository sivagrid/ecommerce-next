import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  snapshotPrice: number; // price at time of add — not live price
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Quantity must be an integer' } },
    snapshotPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    user:  { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.index({ user: 1 });

export const Cart: Model<ICart> =
  (mongoose.models['Cart'] as Model<ICart>) ??
  mongoose.model<ICart>('Cart', cartSchema);
