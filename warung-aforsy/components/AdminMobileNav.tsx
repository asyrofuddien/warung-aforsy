'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminLogoutAction } from '@/app/admin/actions';

export default function AdminMobileNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <nav className="admin-mobile-nav">
      <span className="admin-mobile-nav__logo">
        Warung Aforsy <span style={{ fontSize: '11px', color: 'var(--color-warung-green)' }}>Admin</span>
      </span>

      <div className="admin-mobile-nav__links">
        <Link
          href="/admin"
          className={`admin-mobile-nav__link ${isActive('/admin') && !isActive('/admin/komisi') && !isActive('/admin/laporan') ? 'admin-mobile-nav__link--active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          <span>Warung</span>
        </Link>

        <Link
          href="/admin/komisi"
          className={`admin-mobile-nav__link ${isActive('/admin/komisi') ? 'admin-mobile-nav__link--active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>Komisi</span>
        </Link>

        <Link
          href="/admin/laporan"
          className={`admin-mobile-nav__link ${isActive('/admin/laporan') ? 'admin-mobile-nav__link--active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Laporan</span>
        </Link>

        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="admin-mobile-nav__logout"
            title="Keluar Admin"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </nav>
  );
}
