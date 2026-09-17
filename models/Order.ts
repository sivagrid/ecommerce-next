import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

interface IOrderItem {
  product: Types.ObjectId;
  name: string;   // snapshot at order time
  image: string;  // snapshot
  quantity: number;
  effectivePrice: number;
  lineTotal: number;
}

interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: IShippingAddress;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product:        { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name:           { type: String, required: true },
    image:          { type: String, default: '' },
    quantity:       { type: Number, required: true, min: 1 },
    effectivePrice: { type: Number, required: true, min: 0 },
    lineTotal:      { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items:       { type: [orderItemSchema], required: true },
    status:      { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    subtotal:    { type: Number, required: true, min: 0 },
    tax:         { type: Number, required: true, min: 0 },
    shipping:    { type: Number, required: true, min: 0 },
    total:       { type: Number, required: true, min: 0 },
    shippingAddress: {
      street:  { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Auto-generate order number before save
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
  next();
});

export const Order: Model<IOrder> =
  (mongoose.models['Order'] as Model<IOrder>) ??
  mongoose.model<IOrder>('Order', orderSchema);
