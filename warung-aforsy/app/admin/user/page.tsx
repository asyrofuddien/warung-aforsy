import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import AdminUserClient from './AdminUserClient';

export const dynamic = 'force-dynamic';

interface PersonRow {
  id: number;
  store_id: number;
  store_name: string;
  name: string;
  is_owner: number;
}

interface StoreRow {
  id: number;
  name: string;
}

export default async function AdminUserPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect('/admin/login');

  const persons = db.prepare(`
    SELECT p.id, p.store_id, s.name as store_name, p.name, p.is_owner
    FROM persons p
    JOIN stores s ON p.store_id = s.id
    ORDER BY s.name ASC, p.is_owner DESC, p.name ASC
  `).all() as PersonRow[];

  const stores = db.prepare('SELECT id, name FROM stores ORDER BY name ASC').all() as StoreRow[];

  return <AdminUserClient persons={persons} stores={stores} />;
}
