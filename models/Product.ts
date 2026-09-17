import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  category: Types.ObjectId;
  images: string[];
  stock: number;
  rating: { average: number; count: number };
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: {
      type: Number, min: 0,
      validate: {
        validator(this: IProduct, val: number) { return val < this.price; },
        message: 'Sale price must be less than regular price',
      },
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    images: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0, validate: { validator: Number.isInteger, message: 'Stock must be an integer' } },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count:   { type: Number, default: 0 },
    },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// ESR Rule: Equality → Sort → Range
productSchema.index({ name: 'text', description: 'text', tags: 'text' }, {
  weights: { name: 10, tags: 5, description: 1 },
  name: 'product_text_search',
});
productSchema.index({ isActive: 1, category: 1, price: 1 }, { name: 'idx_active_category_price' });
productSchema.index({ isActive: 1, stock: 1, price: 1 },    { name: 'idx_active_stock_price' });
productSchema.index({ isActive: 1, category: 1, 'rating.average': -1 }, { name: 'idx_active_category_rating' });
productSchema.index({ isActive: 1, createdAt: -1 },         { name: 'idx_active_newest' });

export const Product: Model<IProduct> =
  (mongoose.models['Product'] as Model<IProduct>) ??
  mongoose.model<IProduct>('Product', productSchema);
