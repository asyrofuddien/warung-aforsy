import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import MemberClient from './MemberClient';

interface MemberRow {
  id: number;
  phone: string;
  name: string;
  created_at: string;
  totalTransactions: number;
  totalSpent: number;
}

interface MemberPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MemberPage({ params }: MemberPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const store = db.prepare('SELECT id, name FROM stores WHERE slug = ?').get(slug) as
    | { id: number; name: string }
    | undefined;

  if (!store) notFound();

  const storeId = store.id;

  const session = await getStoreSession();
  if (!session || session.storeId !== storeId) {
    redirect(`/store/${slug}/login`);
  }

  const members = db.prepare(`
    SELECT m.id, m.phone, m.name, m.created_at,
           COUNT(t.id) as totalTransactions,
           COALESCE(SUM(t.total), 0) as totalSpent
    FROM members m
    LEFT JOIN transactions t ON t.member_id = m.id
    WHERE m.store_id = ?
    GROUP BY m.id
    ORDER BY m.name ASC
  `).all(storeId) as MemberRow[];

  const nonMemberStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM transactions WHERE store_id = ? AND member_id IS NULL
  `).get(storeId) as { count: number; total: number };

  return (
    <div>
      <h2 className="text-heading my-4">Member Toko</h2>
      <MemberClient
        storeId={storeId}
        storeName={store.name}
        initialMembers={members}
        nonMemberStats={nonMemberStats}
      />
    </div>
  );
}
