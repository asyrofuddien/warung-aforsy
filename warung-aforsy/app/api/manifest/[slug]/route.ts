import { NextResponse } from 'next/server';
import db from '@/lib/db';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'warung.aforsy.net';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = db.prepare('SELECT name FROM stores WHERE slug = ? AND active = 1').get(slug) as
    | { name: string }
    | undefined;

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Detect subdomain access via Host header
  const host = request.headers.get('host') || '';
  const isSubdomain = host !== BASE_DOMAIN && host !== `www.${BASE_DOMAIN}` && host.endsWith(`.${BASE_DOMAIN}`);

  const manifest = {
    name: `Kasir ${store.name}`,
    short_name: store.name,
    description: `Aplikasi Kasir ${store.name}`,
    start_url: isSubdomain ? '/' : `/store/${slug}`,
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#0F7A5C',
    orientation: 'portrait',
    scope: isSubdomain ? '/' : `/store/${slug}/`,
    id: isSubdomain ? '/' : `/store/${slug}`,
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json',
    },
  });
}
