import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import AdminLaporanClient from './AdminLaporanClient';

export const dynamic = 'force-dynamic';

interface StoreProfitRow {
  store_id: number;
  store_name: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface StoreMonthlyRow {
  store_id: number;
  store_name: string;
  period: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

export default async function AdminLaporanPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect('/admin/login');

  // Per-store profit summary (all time)
  const storeSummaries = db.prepare(`
    SELECT
      t.store_id,
      s.name as store_name,
      COUNT(DISTINCT t.id) as total_transactions,
      COALESCE(SUM(t.total), 0) as total_revenue,
      COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_cost,
      COALESCE(SUM(t.total), 0) - COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_profit
    FROM transactions t
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    GROUP BY t.store_id
    ORDER BY total_profit DESC
  `).all() as StoreProfitRow[];

  // Per-store per-month breakdown
  const monthlyData = db.prepare(`
    SELECT
      t.store_id,
      s.name as store_name,
      SUBSTR(t.timestamp, 1, 7) as period,
      COUNT(DISTINCT t.id) as total_transactions,
      COALESCE(SUM(t.total), 0) as total_revenue,
      COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_cost,
      COALESCE(SUM(t.total), 0) - COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_profit
    FROM transactions t
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    GROUP BY t.store_id, period
    ORDER BY period DESC, total_profit DESC
  `).all() as StoreMonthlyRow[];

  // Global totals
  const globalTotals = db.prepare(`
    SELECT
      COUNT(DISTINCT t.id) as total_transactions,
      COALESCE(SUM(t.total), 0) as total_revenue,
      COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_cost,
      COALESCE(SUM(t.total), 0) - COALESCE(SUM(ti.cost_price_snapshot * ti.quantity), 0) as total_profit
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
  `).get() as { total_transactions: number; total_revenue: number; total_cost: number; total_profit: number } | undefined;

  const storeNames = db.prepare('SELECT id, name FROM stores ORDER BY name ASC').all() as { id: number; name: string }[];

  return (
    <AdminLaporanClient
      storeSummaries={storeSummaries}
      monthlyData={monthlyData}
      globalTotals={globalTotals || { total_transactions: 0, total_revenue: 0, total_cost: 0, total_profit: 0 }}
      storeNames={storeNames}
    />
  );
}
