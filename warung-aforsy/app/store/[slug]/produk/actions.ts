'use server';

import db from '@/lib/db';
import { getStoreSession, hashPIN } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

function getSlug(storeId: number): string {
  const row = db.prepare('SELECT slug FROM stores WHERE id = ?').get(storeId) as { slug: string } | undefined;
  return row?.slug ?? '';
}

// ---------- PRODUCT ACTIONS ----------

export async function toggleStockAction(storeId: number, productId: number, currentStockStatus: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    const newStockStatus = currentStockStatus === 1 ? 0 : 1;
    
    db.prepare('UPDATE products SET in_stock = ? WHERE id = ? AND store_id = ?').run(
      newStockStatus,
      productId,
      storeId
    );

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/produk`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah status stok.';
    return { success: false, error: message };
  }
}

export async function addProductAction(
  storeId: number,
  name: string,
  price: number,
  costPrice: number,
  barcode: string,
  categoryId: number | null
) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    if (!name.trim()) return { success: false, error: 'Nama produk harus diisi.' };
    if (price <= 0) return { success: false, error: 'Harga jual harus lebih besar dari 0.' };

    db.prepare(`
      INSERT INTO products (store_id, category_id, name, price, cost_price, barcode, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(storeId, categoryId, name, price, costPrice || 0, barcode || '');

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/produk`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan produk.';
    return { success: false, error: message };
  }
}

export async function editProductAction(
  storeId: number,
  productId: number,
  name: string,
  price: number,
  costPrice: number,
  barcode: string,
  categoryId: number | null
) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    if (!name.trim()) return { success: false, error: 'Nama produk harus diisi.' };
    if (price <= 0) return { success: false, error: 'Harga jual harus lebih besar dari 0.' };

    db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, cost_price = ?, barcode = ?, category_id = ?
      WHERE id = ? AND store_id = ?
    `).run(name, price, costPrice || 0, barcode || '', categoryId, productId, storeId);

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/produk`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengubah produk.';
    return { success: false, error: message };
  }
}

export async function deleteProductAction(storeId: number, productId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    db.prepare('DELETE FROM products WHERE id = ? AND store_id = ?').run(productId, storeId);

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/produk`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus produk.';
    return { success: false, error: message };
  }
}

// ---------- STAFF MANAGEMENT ACTIONS (OWNER ONLY) ----------

export async function addStaffAction(storeId: number, name: string, pin: string, isOwner: boolean) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId || !session.isOwner) {
      return { success: false, error: 'Hanya pemilik yang dapat mengelola karyawan.' };
    }

    if (!name.trim()) return { success: false, error: 'Nama harus diisi.' };
    if (!/^\d{6}$/.test(pin)) return { success: false, error: 'PIN harus berupa 6 digit angka.' };

    const pinHash = hashPIN(pin);

    db.prepare(`
      INSERT INTO persons (store_id, name, pin_hash, is_owner)
      VALUES (?, ?, ?, ?)
    `).run(storeId, name, pinHash, isOwner ? 1 : 0);

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/produk`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan karyawan.';
    return { success: false, error: message };
  }
}

export async function resetStaffPinAction(storeId: number, staffId: number, newPin: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId || !session.isOwner) {
      return { success: false, error: 'Hanya pemilik yang dapat mengelola karyawan.' };
    }

    if (!/^\d{6}$/.test(newPin)) return { success: false, error: 'PIN baru harus berupa 6 digit angka.' };

    const pinHash = hashPIN(newPin);

    db.prepare('UPDATE persons SET pin_hash = ? WHERE id = ? AND store_id = ?').run(
      pinHash,
      staffId,
      storeId
    );

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyetel ulang PIN.';
    return { success: false, error: message };
  }
}

export async function deleteStaffAction(storeId: number, staffId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId || !session.isOwner) {
      return { success: false, error: 'Hanya pemilik yang dapat mengelola karyawan.' };
    }

    // Prevent owner from deleting themselves
    if (staffId === session.personId) {
      return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' };
    }

    db.prepare('DELETE FROM persons WHERE id = ? AND store_id = ?').run(staffId, storeId);

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/produk`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus karyawan.';
    return { success: false, error: message };
  }
}

// ---------- CATEGORY ACTIONS ----------

export async function addCategoryAction(storeId: number, name: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId || !session.isOwner) {
      return { success: false, error: 'Hanya pemilik yang dapat mengelola kategori.' };
    }

    if (!name.trim()) return { success: false, error: 'Nama kategori harus diisi.' };

    const existing = db.prepare('SELECT id FROM categories WHERE store_id = ? AND name = ?').get(storeId, name.trim());
    if (existing) return { success: false, error: 'Kategori sudah ada.' };

    db.prepare('INSERT INTO categories (store_id, name) VALUES (?, ?)').run(storeId, name.trim());

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/produk`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan kategori.';
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(storeId: number, categoryId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId || !session.isOwner) {
      return { success: false, error: 'Hanya pemilik yang dapat mengelola kategori.' };
    }

    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?').run(categoryId, storeId);
    db.prepare('DELETE FROM categories WHERE id = ? AND store_id = ?').run(categoryId, storeId);

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/produk`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus kategori.';
    return { success: false, error: message };
  }
}

// ---------- BARCODE LOOKUP ACTION ----------

export async function barcodeLookupAction(barcode: string) {
  const trimmed = barcode.trim();
  console.log(`[BARCODE] Lookup started for: ${trimmed}`);

  if (!trimmed) {
    console.log(`[BARCODE] Empty barcode, skipping`);
    return { name: '', brand: '', category: '' };
  }

  // 1. Try Indonesian Product Database
  try {
    console.log(`[BARCODE] Querying Indonesian DB...`);
    const res = await fetch(
      `https://api-products.alpha-projects.cloud/api/v1/products-barcode?barcode=${trimmed}`,
      { signal: AbortSignal.timeout(5000) }
    );
    console.log(`[BARCODE] Indonesian DB response status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[BARCODE] Indonesian DB data:`, JSON.stringify(data).substring(0, 300));
      if (data && data.product_name) {
        console.log(`[BARCODE] Found in Indonesian DB: ${data.product_name}`);
        return {
          name: data.product_name,
          brand: data.brand || '',
          category: data.category || '',
        };
      }
    }
  } catch (err) {
    console.log(`[BARCODE] Indonesian DB error:`, err instanceof Error ? err.message : err);
  }

  // 2. Try Open Food / Products Facts
  try {
    console.log(`[BARCODE] Querying Open Food Facts...`);
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${trimmed}?product_type=all`,
      { signal: AbortSignal.timeout(5000) }
    );
    console.log(`[BARCODE] Open Facts response status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[BARCODE] Open Facts status: ${data.status}`);
      if (data.status === 1 && data.product) {
        const name = data.product.product_name || '';
        console.log(`[BARCODE] Found in Open Facts: ${name}`);
        return {
          name,
          brand: data.product.brands || '',
          category: data.product.categories || '',
        };
      }
    }
  } catch (err) {
    console.log(`[BARCODE] Open Facts error:`, err instanceof Error ? err.message : err);
  }

  console.log(`[BARCODE] Not found in any database for: ${trimmed}`);
  return { name: '', brand: '', category: '' };
}
