import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ecommerce_next';

// ─── Schema definitions (inline to avoid Next.js module resolution) ───────────

const userSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true },
  password: String, role: { type: String, default: 'CUSTOMER' },
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: String, slug: { type: String, unique: true },
  description: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String, slug: { type: String, unique: true },
  description: String, price: Number, salePrice: Number,
  images: [String], category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  stock: Number, isActive: { type: Boolean, default: true },
  tags: [String], rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
}, { timestamps: true });

const UserModel     = mongoose.model('User',     userSchema);
const CategoryModel = mongoose.model('Category', categorySchema);
const ProductModel  = mongoose.model('Product',  productSchema);

// ─── Seed data ─────────────────────────────────────────────────────────────────

const categories = [
  { name: 'Electronics',  slug: 'electronics',  description: 'Gadgets and devices' },
  { name: 'Clothing',     slug: 'clothing',      description: 'Apparel and accessories' },
  { name: 'Books',        slug: 'books',         description: 'Print and digital books' },
  { name: 'Home & Garden',slug: 'home-garden',   description: 'Furniture and garden tools' },
  { name: 'Sports',       slug: 'sports',        description: 'Fitness and outdoor gear' },
];

type CatDoc = { name: string; slug: string; description: string; _id: mongoose.Types.ObjectId };

function makeProducts(cats: CatDoc[]) {
  const el = cats.find((c) => c.slug === 'electronics')!._id;
  const cl = cats.find((c) => c.slug === 'clothing')!._id;
  const bk = cats.find((c) => c.slug === 'books')!._id;
  const hg = cats.find((c) => c.slug === 'home-garden')!._id;
  const sp = cats.find((c) => c.slug === 'sports')!._id;

  return [
    { name: 'Wireless Headphones Pro', slug: 'wireless-headphones-pro', description: 'Premium noise-cancelling wireless headphones with 30-hour battery life and spatial audio.', price: 299.99, salePrice: 249.99, category: el, stock: 45, tags: ['audio', 'wireless', 'noise-cancelling'], rating: { average: 4.7, count: 312 } },
    { name: 'Mechanical Keyboard RGB', slug: 'mechanical-keyboard-rgb', description: 'Full-size mechanical keyboard with Cherry MX switches and per-key RGB lighting.', price: 149.99, category: el, stock: 78, tags: ['keyboard', 'gaming', 'rgb'], rating: { average: 4.5, count: 189 } },
    { name: '4K Webcam Ultra HD',      slug: '4k-webcam-ultra-hd',      description: '4K 30fps webcam with built-in ring light and noise-cancelling microphone.', price: 199.99, salePrice: 159.99, category: el, stock: 32, tags: ['webcam', 'streaming', '4k'], rating: { average: 4.3, count: 97 } },
    { name: 'Smart Watch Series X',    slug: 'smart-watch-series-x',    description: 'Advanced fitness tracking, ECG monitor, GPS, and 7-day battery.', price: 399.99, category: el, stock: 0, tags: ['wearable', 'fitness', 'gps'], rating: { average: 4.6, count: 445 } },

    { name: 'Classic Oxford Shirt',    slug: 'classic-oxford-shirt',    description: 'Premium cotton oxford shirt with a modern slim fit. Available in 8 colours.', price: 79.99, category: cl, stock: 120, tags: ['shirt', 'cotton', 'formal'], rating: { average: 4.4, count: 231 } },
    { name: 'Slim Fit Chinos',         slug: 'slim-fit-chinos',         description: 'Stretch twill chinos with a comfortable slim fit. Machine washable.', price: 89.99, salePrice: 69.99, category: cl, stock: 95, tags: ['chinos', 'pants', 'casual'], rating: { average: 4.2, count: 156 } },
    { name: 'Merino Wool Sweater',     slug: 'merino-wool-sweater',     description: '100% extra-fine merino wool, lightweight and naturally temperature-regulating.', price: 119.99, category: cl, stock: 60, tags: ['sweater', 'wool', 'knitwear'], rating: { average: 4.8, count: 88 } },

    { name: 'Clean Code',              slug: 'clean-code',              description: 'A handbook of agile software craftsmanship by Robert C. Martin.', price: 39.99, category: bk, stock: 200, tags: ['programming', 'software', 'engineering'], rating: { average: 4.9, count: 1204 } },
    { name: 'Designing Data-Intensive Applications', slug: 'ddia', description: 'The definitive guide to scalable, reliable, and maintainable systems by Martin Kleppmann.', price: 54.99, category: bk, stock: 150, tags: ['databases', 'distributed-systems', 'engineering'], rating: { average: 4.9, count: 892 } },
    { name: 'The Pragmatic Programmer', slug: 'pragmatic-programmer',   description: '20th Anniversary Edition. Your journey to mastery.', price: 44.99, salePrice: 34.99, category: bk, stock: 175, tags: ['programming', 'career', 'engineering'], rating: { average: 4.8, count: 567 } },

    { name: 'Bamboo Standing Desk',    slug: 'bamboo-standing-desk',    description: 'Electric height-adjustable bamboo desk. 3-memory positions. 120×60cm surface.', price: 599.99, salePrice: 499.99, category: hg, stock: 18, tags: ['desk', 'ergonomic', 'bamboo'], rating: { average: 4.6, count: 143 } },
    { name: 'Ergonomic Office Chair',  slug: 'ergonomic-office-chair',  description: 'Full lumbar support, adjustable armrests, breathable mesh back.', price: 449.99, category: hg, stock: 25, tags: ['chair', 'ergonomic', 'office'], rating: { average: 4.5, count: 278 } },

    { name: 'Adjustable Dumbbell Set', slug: 'adjustable-dumbbell-set', description: 'Space-saving adjustable dumbbells, 5–52.5 lbs per hand. Fast dial-change.', price: 349.99, category: sp, stock: 40, tags: ['weights', 'fitness', 'home-gym'], rating: { average: 4.7, count: 389 } },
    { name: 'Yoga Mat Premium',        slug: 'yoga-mat-premium',        description: '6mm natural rubber mat with non-slip texture and alignment lines.', price: 79.99, salePrice: 59.99, category: sp, stock: 110, tags: ['yoga', 'mat', 'fitness'], rating: { average: 4.4, count: 612 } },
    { name: 'Running Shoes Lite',      slug: 'running-shoes-lite',      description: 'Ultra-lightweight responsive foam midsole. Breathable mesh upper.', price: 129.99, category: sp, stock: 85, tags: ['running', 'shoes', 'sport'], rating: { average: 4.6, count: 734 } },
  ];
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);

  console.log('Clearing existing data…');
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    ProductModel.deleteMany({}),
  ]);

  console.log('Seeding users…');
  const hashedAdmin    = await bcrypt.hash('Admin@123!', 12);
  const hashedCustomer = await bcrypt.hash('Customer@123!', 12);
  await UserModel.insertMany([
    { name: 'Admin User',    email: 'admin@shopnext.dev',    password: hashedAdmin,    role: 'ADMIN' },
    { name: 'Jane Customer', email: 'jane@shopnext.dev',     password: hashedCustomer, role: 'CUSTOMER' },
  ]);

  console.log('Seeding categories…');
  const insertedCats = await CategoryModel.insertMany(categories);

  console.log('Seeding products…');
  const products = makeProducts(insertedCats as unknown as CatDoc[]);
  await ProductModel.insertMany(products);

  console.log(`\n✅ Seed complete!`);
  console.log(`   Users:      2  (admin@shopnext.dev / Admin@123!)`);
  console.log(`   Categories: ${insertedCats.length}`);
  console.log(`   Products:   ${products.length}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
