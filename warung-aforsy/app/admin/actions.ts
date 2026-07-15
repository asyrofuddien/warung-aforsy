'use server';

import db from '@/lib/db';
import { getAdminSession, hashPIN } from '@/lib/auth';
import { generateSlug } from '@/lib/slug';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function adminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/admin/login');
}

export async function addWarungAction(
  name: string,
  address: string,
  qrImageUrl: string,
  commissionRate: number,
  ownerName: string,
  ownerPin: string
) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    if (!name.trim()) return { success: false, error: 'Nama warung harus diisi.' };
    if (!ownerName.trim()) return { success: false, error: 'Nama pemilik harus diisi.' };
    if (!/^\d{6}$/.test(ownerPin)) return { success: false, error: 'PIN pemilik harus 6 digit angka.' };

    // Execute in a transaction to ensure store and owner are both created or failed
    const createStoreTransaction = db.transaction(() => {
      // 1. Insert store
      const slug = generateSlug(name);
      const storeResult = db.prepare(`
        INSERT INTO stores (name, slug, address, qr_image_url, commission_rate, active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(name, slug, address || '', qrImageUrl || '/images/qr-berkah-demo.png', commissionRate || 0);

      const storeId = storeResult.lastInsertRowid;

      // 2. Hash PIN and insert owner person
      const pinHash = hashPIN(ownerPin);
      db.prepare(`
        INSERT INTO persons (store_id, name, pin_hash, is_owner)
        VALUES (?, ?, ?, 1)
      `).run(storeId, ownerName, pinHash);

      return storeId;
    });

    const storeId = createStoreTransaction();

    revalidatePath('/admin');
    return { success: true, storeId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan warung.';
    return { success: false, error: message };
  }
}

export async function editWarungAction(
  storeId: number,
  name: string,
  address: string,
  qrImageUrl: string,
  commissionRate: number
) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    if (!name.trim()) return { success: false, error: 'Nama warung harus diisi.' };

    const slug = generateSlug(name);
    db.prepare(`
      UPDATE stores 
      SET name = ?, slug = ?, address = ?, qr_image_url = ?, commission_rate = ?
      WHERE id = ?
    `).run(name, slug, address, qrImageUrl || '/images/qr-berkah-demo.png', commissionRate, storeId);

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah warung.';
    return { success: false, error: message };
  }
}

export async function toggleWarungActiveAction(storeId: number, currentStatus: number) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    const newStatus = currentStatus === 1 ? 0 : 1;
    db.prepare('UPDATE stores SET active = ? WHERE id = ?').run(newStatus, storeId);

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal merubah status keaktifan.';
    return { success: false, error: message };
  }
}

export async function toggleCommissionCollectedAction(recordId: number, currentCollected: number) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    const newCollected = currentCollected === 1 ? 0 : 1;
    db.prepare('UPDATE commission_records SET collected = ? WHERE id = ?').run(
      newCollected,
      recordId
    );

    revalidatePath('/admin/komisi');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal merubah status komisi.';
    return { success: false, error: message };
  }
}
