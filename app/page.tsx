import { redirect } from 'next/navigation';

// Root → redirect to products listing
export default function HomePage() {
  redirect('/products');
}
