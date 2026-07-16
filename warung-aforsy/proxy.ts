import { NextRequest, NextResponse } from 'next/server';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'warung.aforsy.net';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Extract subdomain: "kontol.warung.aforsy.net" → "kontol"
  const subdomain = host.replace(`.${BASE_DOMAIN}`, '').replace(BASE_DOMAIN, '');

  // Only rewrite if there's a valid subdomain (not www, not empty, not the base domain itself)
  if (!subdomain || subdomain === 'www' || subdomain === BASE_DOMAIN) {
    return NextResponse.next();
  }

  // Pass through system routes — no rewrite
  if (
    pathname.startsWith('/store/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/install/')
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (pathname === '/manifest.json') {
    // Rewrite manifest.json to dynamic manifest route
    url.pathname = `/api/manifest/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === '/') {
    // Root → store cashier page
    url.pathname = `/store/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  // Everything else → store subpage (e.g. /produk → /store/kontol/produk)
  url.pathname = `/store/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Match all paths except static internals
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon|icon-|vercel.svg).*)',
  ],
};
