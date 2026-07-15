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

// --- User Management Actions ---

export async function addUserAction(
  storeId: number,
  name: string,
  pin: string,
  isOwner: boolean
) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    if (!name.trim()) return { success: false, error: 'Nama harus diisi.' };
    if (!/^\d{6}$/.test(pin)) return { success: false, error: 'PIN harus 6 digit angka.' };

    const pinHash = hashPIN(pin);
    db.prepare(`
      INSERT INTO persons (store_id, name, pin_hash, is_owner)
      VALUES (?, ?, ?, ?)
    `).run(storeId, name.trim(), pinHash, isOwner ? 1 : 0);

    revalidatePath('/admin/user');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan user.';
    return { success: false, error: message };
  }
}

export async function editUserAction(
  personId: number,
  name: string,
  isOwner: boolean
) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    if (!name.trim()) return { success: false, error: 'Nama harus diisi.' };

    db.prepare(`
      UPDATE persons SET name = ?, is_owner = ? WHERE id = ?
    `).run(name.trim(), isOwner ? 1 : 0, personId);

    revalidatePath('/admin/user');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah user.';
    return { success: false, error: message };
  }
}

export async function resetPinAction(
  personId: number,
  newPin: string
) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    if (!/^\d{6}$/.test(newPin)) return { success: false, error: 'PIN harus 6 digit angka.' };

    const pinHash = hashPIN(newPin);
    db.prepare('UPDATE persons SET pin_hash = ? WHERE id = ?').run(pinHash, personId);

    revalidatePath('/admin/user');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal reset PIN.';
    return { success: false, error: message };
  }
}

export async function deleteUserAction(personId: number) {
  try {
    const isAdmin = await getAdminSession();
    if (!isAdmin) return { success: false, error: 'Akses tidak sah.' };

    // Check if this is the only owner for the store
    const person = db.prepare('SELECT store_id, is_owner FROM persons WHERE id = ?').get(personId) as { store_id: number; is_owner: number } | undefined;
    if (!person) return { success: false, error: 'User tidak ditemukan.' };

    if (person.is_owner === 1) {
      const ownerCount = db.prepare('SELECT COUNT(*) as cnt FROM persons WHERE store_id = ? AND is_owner = 1').get(person.store_id) as { cnt: number };
      if (ownerCount.cnt <= 1) return { success: false, error: 'Tidak bisa menghapus satu-satunya pemilik toko.' };
    }

    db.prepare('DELETE FROM persons WHERE id = ?').run(personId);

    revalidatePath('/admin/user');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus user.';
    return { success: false, error: message };
  }
}
