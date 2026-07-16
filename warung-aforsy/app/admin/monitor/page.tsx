import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import MonitorClient from './MonitorClient';

interface ActivityRow {
  id: number;
  store_id: number | null;
  person_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  timestamp: string;
  store_name: string | null;
  person_name: string | null;
}

interface StoreRow {
  id: number;
  name: string;
}

interface CashierStatsRow {
  person_id: number;
  person_name: string;
  store_name: string;
  total_transactions: number;
  total_revenue: number;
  avg_items: number;
}

interface HourlyRow {
  hour: number;
  count: number;
}

interface DailyTotalRow {
  date: string;
  count: number;
  revenue: number;
}

interface TopProductRow {
  name: string;
  total_sold: number;
  revenue: number;
}

interface MemberStatsRow {
  total_members: number;
  members_with_tx: number;
  total_member_revenue: number;
  total_non_member_revenue: number;
}

export default async function MonitorPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect('/admin/login');

  const stores = db.prepare('SELECT id, name FROM stores ORDER BY name ASC').all() as StoreRow[];

  const activities = db.prepare(`
    SELECT a.*, s.name as store_name, p.name as person_name
    FROM activity_logs a
    LEFT JOIN stores s ON a.store_id = s.id
    LEFT JOIN persons p ON a.person_id = p.id
    ORDER BY a.timestamp DESC
    LIMIT 200
  `).all() as ActivityRow[];

  const cashierStats = db.prepare(`
    SELECT
      t.person_id,
      COALESCE(p.name, 'Unknown') as person_name,
      COALESCE(s.name, 'Unknown') as store_name,
      COUNT(t.id) as total_transactions,
      SUM(t.total) as total_revenue,
      ROUND(AVG(ti.total_items), 1) as avg_items
    FROM transactions t
    LEFT JOIN persons p ON t.person_id = p.id
    LEFT JOIN stores s ON t.store_id = s.id
    LEFT JOIN (
      SELECT transaction_id, SUM(quantity) as total_items
      FROM transaction_items
      GROUP BY transaction_id
    ) ti ON ti.transaction_id = t.id
    GROUP BY t.person_id, t.store_id
    ORDER BY total_transactions DESC
  `).all() as CashierStatsRow[];

  const hourlyStats = db.prepare(`
    SELECT
      CAST(strftime('%H', timestamp) AS INTEGER) as hour,
      COUNT(*) as count
    FROM transactions
    GROUP BY hour
    ORDER BY hour ASC
  `).all() as HourlyRow[];

  const dailyTotals = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', timestamp) as date,
      COUNT(*) as count,
      SUM(total) as revenue
    FROM transactions
    WHERE timestamp >= date('now', '-30 days')
    GROUP BY date
    ORDER BY date DESC
  `).all() as DailyTotalRow[];

  const topProducts = db.prepare(`
    SELECT
      ti.name_snapshot as name,
      SUM(ti.quantity) as total_sold,
      SUM(ti.price_snapshot * ti.quantity) as revenue
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    GROUP BY ti.name_snapshot
    ORDER BY total_sold DESC
    LIMIT 10
  `).all() as TopProductRow[];

  const memberStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM members) as total_members,
      (SELECT COUNT(DISTINCT member_id) FROM transactions WHERE member_id IS NOT NULL) as members_with_tx,
      (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE member_id IS NOT NULL) as total_member_revenue,
      (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE member_id IS NULL) as total_non_member_revenue
  `).get() as MemberStatsRow;

  return (
    <MonitorClient
      stores={stores}
      initialActivities={activities}
      cashierStats={cashierStats}
      hourlyStats={hourlyStats}
      dailyTotals={dailyTotals}
      topProducts={topProducts}
      memberStats={memberStats}
    />
  );
}
