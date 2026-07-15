import { getAdminSession } from '@/lib/auth';
import Link from 'next/link';
import AdminMobileNav from '@/components/AdminMobileNav';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const isAdmin = await getAdminSession();

  // Admin sign out action
  const handleAdminLogout = async () => {
    'use server';
    const { cookies } = await import('next/headers');
    (await cookies()).delete('admin_session');
    const { redirect } = await import('next/navigation');
    redirect('/admin/login');
  };

  return (
    <div className="bg-paper min-h-screen">
      {isAdmin ? (
        <>
          {/* Mobile: horizontal top nav (hidden on desktop via CSS) */}
          <AdminMobileNav />

          <div className="admin-layout">
            {/* Desktop: sidebar navigation (hidden on mobile via CSS) */}
            <aside className="admin-sidebar">
              <div className="admin-sidebar__logo">
                Warungku <span style={{ fontSize: '11px', color: 'var(--color-warung-green)' }}>Admin</span>
              </div>
              
              <nav className="admin-sidebar__nav">
                <Link href="/admin" className="admin-sidebar__item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  Kelola Warung
                </Link>
                
                <Link href="/admin/komisi" className="admin-sidebar__item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Laporan Komisi
                </Link>

                <div className="divider" style={{ margin: 'var(--space-4) 0' }}></div>

                <form action={handleAdminLogout} style={{ padding: '0 var(--space-5)' }}>
                  <button
                    type="submit"
                    className="btn btn-ghost btn--sm btn--full"
                    style={{ justifyContent: 'flex-start', color: 'var(--color-signal-red)', paddingLeft: 0 }}
                  >
                    Keluar Admin
                  </button>
                </form>
              </nav>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">{children}</main>
          </div>
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full" style={{ maxWidth: '400px' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
