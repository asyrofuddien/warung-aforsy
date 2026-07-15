import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import db from '@/lib/db';
import InstallClient from './InstallClient';

interface InstallPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = db.prepare('SELECT name FROM stores WHERE slug = ? AND active = 1').get(slug) as { name: string } | undefined;
  if (!store) return {};

  return {
    title: `Install Kasir ${store.name}`,
    description: `Cara menginstall aplikasi Kasir ${store.name} di HP Anda`,
  };
}

export default async function InstallPage({ params }: InstallPageProps) {
  const { slug } = await params;

  const store = db.prepare('SELECT id, name FROM stores WHERE slug = ? AND active = 1').get(slug) as
    | { id: number; name: string }
    | undefined;

  if (!store) {
    notFound();
  }

  return <InstallClient storeName={store.name} storeSlug={slug} />;
}
