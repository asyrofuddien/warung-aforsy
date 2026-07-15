import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import RiwayatClient from './RiwayatClient';

interface TransactionRow {
  id: number;
  timestamp: string;
  payment_method: 'cash' | 'qr';
  total: number;
  cashier_name: string;
  cashier_id: number;
  member_id: number | null;
  member_name: string | null;
  member_phone: string | null;
}

interface TransactionItemRow {
  transaction_id: number;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

interface CashierRow {
  id: number;
  name: string;
}

interface RiwayatPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RiwayatPage({ params }: RiwayatPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Look up store by slug
  const store = db.prepare('SELECT id, name FROM stores WHERE slug = ?').get(slug) as
    | { id: number; name: string }
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

  // 2. Fetch transactions list
  const transactions = db.prepare(`
    SELECT t.id, t.timestamp, t.payment_method, t.total, p.name as cashier_name, p.id as cashier_id,
           t.member_id, m.name as member_name, m.phone as member_phone
    FROM transactions t
    LEFT JOIN persons p ON t.person_id = p.id
    LEFT JOIN members m ON t.member_id = m.id
    WHERE t.store_id = ?
    ORDER BY t.timestamp DESC
  `).all(storeId) as TransactionRow[];

  // 3. Fetch all line items snapshots
  const transactionItems = db.prepare(`
    SELECT ti.transaction_id, ti.name_snapshot, ti.price_snapshot, ti.quantity
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    WHERE t.store_id = ?
  `).all(storeId) as TransactionItemRow[];

  // 4. Fetch cashiers list for filtering
  const cashiers = db.prepare(`
    SELECT id, name 
    FROM persons 
    WHERE store_id = ?
    ORDER BY name ASC
  `).all(storeId) as CashierRow[];

  return (
    <div>
      <h2 className="text-heading my-4">Riwayat Transaksi</h2>
      <RiwayatClient
        transactions={transactions}
        transactionItems={transactionItems}
        cashiers={cashiers}
        storeName={store.name}
      />
    </div>
  );
}
