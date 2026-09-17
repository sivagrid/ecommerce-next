import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });

export const Category: Model<ICategory> =
  (mongoose.models['Category'] as Model<ICategory>) ??
  mongoose.model<ICategory>('Category', categorySchema);
