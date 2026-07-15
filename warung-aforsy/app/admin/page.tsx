import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

interface StoreRow {
  id: number;
  name: string;
  slug: string;
  address: string;
  qr_image_url: string;
  commission_rate: number;
  active: number;
  total_sales: number;
  amount_owed: number;
}

export default async function AdminPage() {
  // 1. Authenticate platform admin session
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    redirect('/admin/login');
  }

  // 2. Fetch all stores with computed stats from SQLite
  const stores = db.prepare(`
    SELECT 
      s.id, 
      s.name, 
      s.slug,
      s.address, 
      s.qr_image_url, 
      s.commission_rate, 
      s.active,
      COALESCE((SELECT SUM(total_sales) FROM commission_records WHERE store_id = s.id), 0) as total_sales,
      COALESCE((SELECT SUM(amount_owed) FROM commission_records WHERE store_id = s.id AND collected = 0), 0) as amount_owed
    FROM stores s
    ORDER BY s.id DESC
  `).all() as StoreRow[];

  return <AdminClient stores={stores} />;
}
