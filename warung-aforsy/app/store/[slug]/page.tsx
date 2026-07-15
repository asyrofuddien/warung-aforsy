import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import KasirClient from './KasirClient';

interface ProductRow {
  id: number;
  category_id: number | null;
  name: string;
  price: number;
  cost_price: number;
  barcode: string;
  in_stock: number;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // 1. Look up store by slug
  const store = db.prepare('SELECT id, name, qr_image_url FROM stores WHERE slug = ?').get(slug) as
    | { id: number; name: string; qr_image_url: string | null }
    | undefined;

  if (!store) {
    notFound();
  }

  const storeId = store.id;

  // 2. Authenticate store cashier session
  const session = await getStoreSession();
  if (!session || session.storeId !== storeId) {
    redirect(`/store/${slug}/login`);
  }

  // 3. Fetch products catalog for the store
  const products = db.prepare(`
    SELECT id, category_id, name, price, cost_price, barcode, in_stock 
    FROM products 
    WHERE store_id = ?
    ORDER BY in_stock DESC, name ASC
  `).all(storeId) as ProductRow[];

  // 4. Fetch categories
  const categories = db.prepare(`
    SELECT id, name FROM categories WHERE store_id = ? ORDER BY name ASC
  `).all(storeId) as CategoryRow[];

  return (
    <KasirClient
      storeId={storeId}
      storeName={store.name}
      storeQrUrl={store.qr_image_url}
      products={products}
      categories={categories}
    />
  );
}
