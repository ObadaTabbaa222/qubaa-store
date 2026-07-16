import { db } from '@/lib/supabase';
import { ProductsClient } from './ui';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const { data: products } = await db()
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  return <ProductsClient products={products ?? []} />;
}
