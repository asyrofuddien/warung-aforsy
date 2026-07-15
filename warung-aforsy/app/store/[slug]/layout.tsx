import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
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

  const session = await getStoreSession();
  const isLoggedIn = session && session.storeId === storeId;

  // Sign out server action
  const handleLogout = async () => {
    'use server';
    const { cookies } = await import('next/headers');
    (await cookies()).delete('store_session');
    const { redirect } = await import('next/navigation');
    redirect(`/store/${slug}/login`);
  };

  return (
    <div className="layout-page">
      {/* Top Bar (§5) */}
      <header className="layout-top-bar">
        <span className="layout-top-bar__title">{store.name}</span>
        {isLoggedIn && (
          <div className="layout-top-bar__actions">
            <span className="text-meta" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              {session.personName}
            </span>
            <form action={handleLogout}>
              <button
                type="submit"
                className="btn btn-ghost btn--sm"
                style={{ minHeight: 'auto', padding: 'var(--space-1) var(--space-2)' }}
              >
                Keluar
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className={`layout-main ${isLoggedIn ? 'layout-main--with-footer-and-nav' : ''}`}>
        {children}
      </main>

      {/* Bottom Nav (§5) */}
      {isLoggedIn && <BottomNav slug={slug} />}
    </div>
  );
}
