'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  slug: string;
}

export default function BottomNav({ slug }: BottomNavProps) {
  const pathname = usePathname();

  // Helper to check if a route is active
  const isActive = (path: string) => {
    if (path === `/store/${slug}`) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="layout-bottom-nav">
      <div className="bottom-nav">
        {/* Kasir Tab */}
        <Link
          href={`/store/${slug}`}
          className={`bottom-nav__item ${isActive(`/store/${slug}`) && !pathname.includes('/produk') && !pathname.includes('/riwayat') && !pathname.includes('/member') ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="bottom-nav__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          <span className="bottom-nav__label">Kasir</span>
        </Link>

        {/* Produk Tab */}
        <Link
          href={`/store/${slug}/produk`}
          className={`bottom-nav__item ${isActive(`/store/${slug}/produk`) ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="bottom-nav__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="bottom-nav__label">Produk</span>
        </Link>

        {/* Riwayat Tab */}
        <Link
          href={`/store/${slug}/riwayat`}
          className={`bottom-nav__item ${isActive(`/store/${slug}/riwayat`) ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="bottom-nav__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v4l3 3" />
            <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
          </svg>
          <span className="bottom-nav__label">Riwayat</span>
        </Link>

        {/* Member Tab */}
        <Link
          href={`/store/${slug}/member`}
          className={`bottom-nav__item ${isActive(`/store/${slug}/member`) ? 'bottom-nav__item--active' : ''}`}
        >
          <svg
            className="bottom-nav__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="bottom-nav__label">Member</span>
        </Link>
      </div>
    </nav>
  );
}
