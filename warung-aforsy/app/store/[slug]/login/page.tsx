import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import LoginClient from './LoginClient';

interface LoginPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Look up store by slug
  const store = db.prepare('SELECT id, name, active FROM stores WHERE slug = ?').get(slug) as
    | { id: number; name: string; active: number }
    | undefined;

  if (!store || store.active === 0) {
    notFound();
  }

  const storeId = store.id;

  // If already logged in, redirect to cashier page
  const session = await getStoreSession();
  if (session && session.storeId === storeId) {
    redirect(`/store/${slug}`);
  }

  // Fetch staff members for this store
  const persons = db.prepare('SELECT id, name, is_owner FROM persons WHERE store_id = ?').all(storeId) as {
    id: number;
    name: string;
    is_owner: number;
  }[];

  return <LoginClient storeId={storeId} slug={slug} persons={persons} />;
}
