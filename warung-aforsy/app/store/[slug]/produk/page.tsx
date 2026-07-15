import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import ProdukClient from './ProdukClient';

interface ProductRow {
  id: number;
  category_id: number | null;
  name: string;
  price: number;
  cost_price: number;
  barcode: string;
  in_stock: number;
}

interface PersonRow {
  id: number;
  name: string;
  is_owner: number;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface ProdukPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProdukPage({ params }: ProdukPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Look up store by slug
  const store = db.prepare('SELECT id FROM stores WHERE slug = ?').get(slug) as
    | { id: number }
    | undefined;

  if (!store) {
    notFound();
  }

  const storeId = store.id;

  // 1. Authenticate store cashier session
  const session = await getStoreSession();
  if (!session || session.storeId !== storeId) {
    redirect(`/store/${slug}/login`);
  }

  // 2. Fetch products
  const products = db.prepare(`
    SELECT id, category_id, name, price, cost_price, barcode, in_stock 
    FROM products 
    WHERE store_id = ?
    ORDER BY name ASC
  `).all(storeId) as ProductRow[];

  // 3. Fetch categories
  const categories = db.prepare(`
    SELECT id, name FROM categories WHERE store_id = ? ORDER BY name ASC
  `).all(storeId) as CategoryRow[];

  // 4. Fetch staff members (needed if user is owner)
  const staff = db.prepare(`
    SELECT id, name, is_owner 
    FROM persons 
    WHERE store_id = ?
    ORDER BY is_owner DESC, name ASC
  `).all(storeId) as PersonRow[];

  return (
    <div>
      <h2 className="text-heading my-4">Katalog Produk</h2>
      <ProdukClient
        storeId={storeId}
        products={products}
        categories={categories}
        staff={staff}
        isOwner={session.isOwner}
      />
    </div>
  );
}
