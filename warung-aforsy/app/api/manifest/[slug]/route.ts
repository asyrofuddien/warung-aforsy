import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = db.prepare('SELECT name FROM stores WHERE slug = ? AND active = 1').get(slug) as
    | { name: string }
    | undefined;

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const manifest = {
    name: `Kasir ${store.name}`,
    short_name: store.name,
    description: `Aplikasi Kasir ${store.name}`,
    start_url: `/store/${slug}`,
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#0F7A5C',
    orientation: 'portrait',
    scope: `/store/${slug}/`,
    id: `/store/${slug}`,
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
