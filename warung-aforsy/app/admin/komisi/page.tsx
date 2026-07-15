import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import KomisiClient from './KomisiClient';

export const dynamic = 'force-dynamic';

interface CommissionRow {
  id: number;
  store_id: number;
  store_name: string;
  period: string;
  total_sales: number;
  rate_applied: number;
  amount_owed: number;
  collected: number;
}

export default async function KomisiPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    redirect('/admin/login');
  }

  const records = db.prepare(`
    SELECT 
      cr.id,
      cr.store_id,
      s.name as store_name,
      cr.period,
      cr.total_sales,
      cr.rate_applied,
      cr.amount_owed,
      cr.collected
    FROM commission_records cr
    JOIN stores s ON cr.store_id = s.id
    ORDER BY cr.period DESC, s.name ASC
  `).all() as CommissionRow[];

  return <KomisiClient records={records} />;
}
