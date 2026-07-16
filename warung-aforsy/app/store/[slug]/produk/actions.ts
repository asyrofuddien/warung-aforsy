'use server';

import db from '@/lib/db';
import { getStoreSession, hashPIN } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
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

    logActivity({ storeId, personId: session.personId, action: 'toggle_stock', entityType: 'product', entityId: productId, details: { newStatus: newStockStatus } });

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

    logActivity({ storeId, personId: session.personId, action: 'create_product', entityType: 'product', entityId: undefined, details: { name, price, barcode } });

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

    logActivity({ storeId, personId: session.personId, action: 'update_product', entityType: 'product', entityId: productId, details: { name, price, barcode } });

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

    logActivity({ storeId, personId: session.personId, action: 'delete_product', entityType: 'product', entityId: productId });

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

    logActivity({ storeId, personId: session.personId, action: 'create_staff', entityType: 'person', details: { name, isOwner } });

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

    logActivity({ storeId, personId: session.personId, action: 'delete_staff', entityType: 'person', entityId: staffId });

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

    logActivity({ storeId, personId: session.personId, action: 'create_category', entityType: 'category', details: { name: name.trim() } });

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

    logActivity({ storeId, personId: session.personId, action: 'delete_category', entityType: 'category', entityId: categoryId });

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
    return { name: '', brand: '', category: '', found: false, reason: 'empty' };
  }

  // 1. Try Open Food / Products Facts
  try {
    console.log(`[BARCODE] Querying Open Food Facts...`);
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${trimmed}?product_type=all`,
      { signal: AbortSignal.timeout(8000) }
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
          found: true,
          reason: 'ok',
        };
      }
    }
  } catch (err) {
    console.log(`[BARCODE] Open Facts error:`, err instanceof Error ? err.message : err);
  }

  console.log(`[BARCODE] Not found in any database for: ${trimmed}`);
  return { name: '', brand: '', category: '', found: false, reason: 'not_found' };
}

// ---------- CSV IMPORT ACTIONS ----------

export interface CsvProductRow {
  name: string;
  price: number;
  cost_price: number;
  barcode: string;
  category: string;
}

export interface ParsedCsvRow extends CsvProductRow {
  rowNumber: number;
  duplicateOf?: { id: number; name: string } | null;
  error?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseCsvAction(storeId: number, csvContent: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.', rows: [] as ParsedCsvRow[] };
    }

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV kosong atau hanya berisi header.', rows: [] as ParsedCsvRow[] };
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, '_'));
    const nameIdx = header.indexOf('nama');
    const priceIdx = header.indexOf('harga_jual');
    const costIdx = header.indexOf('harga_modal');
    const barcodeIdx = header.indexOf('barcode');
    const categoryIdx = header.indexOf('kategori');

    if (nameIdx === -1 || priceIdx === -1) {
      return { success: false, error: 'CSV harus memiliki kolom "nama" dan "harga_jual".', rows: [] as ParsedCsvRow[] };
    }

    // Fetch existing products for duplicate detection
    const existingProducts = db.prepare(
      'SELECT id, name, barcode FROM products WHERE store_id = ?'
    ).all(storeId) as { id: number; name: string; barcode: string }[];

    // Fetch existing categories
    const existingCategories = db.prepare(
      'SELECT id, name FROM categories WHERE store_id = ?'
    ).all(storeId) as { id: number; name: string }[];

    const rows: ParsedCsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      const name = (cols[nameIdx] || '').trim();
      const priceStr = (cols[priceIdx] || '').trim();
      const costStr = costIdx >= 0 ? (cols[costIdx] || '').trim() : '0';
      const barcode = barcodeIdx >= 0 ? (cols[barcodeIdx] || '').trim() : '';
      const category = categoryIdx >= 0 ? (cols[categoryIdx] || '').trim() : '';

      if (!name) {
        rows.push({ name: '', price: 0, cost_price: 0, barcode: '', category: '', rowNumber: i + 1, error: 'Nama produk kosong' });
        continue;
      }

      const price = parseInt(priceStr, 10);
      if (isNaN(price) || price <= 0) {
        rows.push({ name, price: 0, cost_price: 0, barcode, category, rowNumber: i + 1, error: 'Harga jual harus angka > 0' });
        continue;
      }

      const costPrice = parseInt(costStr, 10) || 0;

      // Check for duplicate by name or barcode
      let duplicateOf: { id: number; name: string } | null = null;
      if (barcode) {
        const dupByBarcode = existingProducts.find((p) => p.barcode === barcode);
        if (dupByBarcode) {
          duplicateOf = { id: dupByBarcode.id, name: dupByBarcode.name };
        }
      }
      if (!duplicateOf) {
        const dupByName = existingProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (dupByName) {
          duplicateOf = { id: dupByName.id, name: dupByName.name };
        }
      }

      rows.push({ name, price, cost_price: costPrice, barcode, category, rowNumber: i + 1, duplicateOf });
    }

    console.log(`[CSV] Parsed ${rows.length} rows for store ${storeId}`);
    return { success: true, rows, categories: existingCategories };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal parse CSV.';
    return { success: false, error: message, rows: [] as ParsedCsvRow[] };
  }
}

export async function importCsvAction(
  storeId: number,
  rows: CsvProductRow[],
  actions: { rowName: string; action: 'import' | 'replace' | 'skip' }[]
) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.', imported: 0, skipped: 0, replaced: 0 };
    }

    // Fetch existing categories for auto-create
    const existingCategories = db.prepare(
      'SELECT id, name FROM categories WHERE store_id = ?'
    ).all(storeId) as { id: number; name: string }[];

    let imported = 0;
    let skipped = 0;
    let replaced = 0;

    const insertProduct = db.prepare(`
      INSERT INTO products (store_id, category_id, name, price, cost_price, barcode, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const updateProduct = db.prepare(`
      UPDATE products SET name = ?, price = ?, cost_price = ?, barcode = ?, category_id = ?
      WHERE id = ? AND store_id = ?
    `);

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const actionEntry = actions[i];
      if (!actionEntry || actionEntry.action === 'skip') {
        skipped++;
        continue;
      }

      // Resolve category
      let categoryId: number | null = null;
      if (row.category) {
        const existingCat = existingCategories.find((c) => c.name.toLowerCase() === row.category.toLowerCase());
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          // Auto-create category
          const result = db.prepare('INSERT INTO categories (store_id, name) VALUES (?, ?)').run(storeId, row.category);
          const newCatId = result.lastInsertRowid as number;
          existingCategories.push({ id: newCatId, name: row.category });
          categoryId = newCatId;
        }
      }

      if (actionEntry.action === 'replace') {
        // Find existing product by name or barcode
        const existing = db.prepare(
          'SELECT id FROM products WHERE store_id = ? AND (name = ? OR (barcode != "" AND barcode = ?))'
        ).get(storeId, row.name, row.barcode) as { id: number } | undefined;

        if (existing) {
          updateProduct.run(row.name, row.price, row.cost_price, row.barcode, categoryId, existing.id, storeId);
          replaced++;
        } else {
          insertProduct.run(storeId, categoryId, row.name, row.price, row.cost_price, row.barcode);
          imported++;
        }
      } else {
        insertProduct.run(storeId, categoryId, row.name, row.price, row.cost_price, row.barcode);
        imported++;
      }
    }

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/produk`);

    console.log(`[CSV] Import done for store ${storeId}: ${imported} new, ${replaced} replaced, ${skipped} skipped`);

    logActivity({ storeId, personId: session.personId, action: 'csv_import', entityType: 'product', details: { imported, replaced, skipped } });

    return { success: true, imported, replaced, skipped };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal import CSV.';
    return { success: false, error: message, imported: 0, skipped: 0, replaced: 0 };
  }
}
