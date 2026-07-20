'use server';

import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { getMidtransSnap, generateOrderId, MIDTRANS_ENABLED_PAYMENTS, updateSnapDisplayName } from '@/lib/midtrans';

function getSlug(storeId: number): string {
  const row = db.prepare('SELECT slug FROM stores WHERE id = ?').get(storeId) as { slug: string } | undefined;
  return row?.slug ?? '';
}

export interface CartItemInput {
  productId: number;
  quantity: number;
}

// ---------- MEMBER ACTIONS ----------

export async function findMemberAction(storeId: number, query: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    const trimmed = query.trim();
    if (!trimmed) return { success: true, members: [] };

    const q = `%${trimmed}%`;
    const members = db.prepare(
      'SELECT id, phone, name FROM members WHERE store_id = ? AND (phone LIKE ? OR name LIKE ?) ORDER BY name ASC LIMIT 10'
    ).all(storeId, q, q) as { id: number; phone: string; name: string }[];

    logActivity({
      storeId,
      personId: session.personId,
      action: 'search_member',
      entityType: 'member',
      request: { query: trimmed },
      response: { count: members.length, members },
    });

    return { success: true, members };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mencari member.';
    return { success: false, error: message, members: [] };
  }
}

export async function upsertMemberAction(storeId: number, phone: string, name: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    if (!trimmedPhone) return { success: false, error: 'Nomor HP harus diisi.' };

    const existing = db.prepare(
      'SELECT id FROM members WHERE store_id = ? AND phone = ?'
    ).get(storeId, trimmedPhone) as { id: number } | undefined;

    if (existing) {
      if (trimmedName) {
        db.prepare('UPDATE members SET name = ? WHERE id = ? AND store_id = ?').run(trimmedName, existing.id, storeId);
      }
      const member = db.prepare('SELECT id, phone, name FROM members WHERE id = ?').get(existing.id) as { id: number; phone: string; name: string };
      return { success: true, member };
    }

    const result = db.prepare(
      'INSERT INTO members (store_id, phone, name) VALUES (?, ?, ?)'
    ).run(storeId, trimmedPhone, trimmedName);

    const member = { id: result.lastInsertRowid as number, phone: trimmedPhone, name: trimmedName };
    logActivity({
      storeId,
      personId: session.personId,
      action: 'create_member',
      entityType: 'member',
      entityId: member.id,
      request: { phone: trimmedPhone, name: trimmedName },
      response: { id: member.id, phone: member.phone, name: member.name },
    });
    return { success: true, member };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan member.';
    return { success: false, error: message };
  }
}

export async function searchMembersAction(storeId: number, query: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.', members: [] };
    }

    const q = `%${query.trim()}%`;
    const members = db.prepare(
      'SELECT id, phone, name FROM members WHERE store_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC LIMIT 20'
    ).all(storeId, q, q) as { id: number; phone: string; name: string }[];

    return { success: true, members };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mencari member.';
    return { success: false, error: message, members: [] };
  }
}

export async function getMemberStatsAction(storeId: number, memberId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    const stats = db.prepare(`
      SELECT COUNT(*) as totalTransactions, COALESCE(SUM(total), 0) as totalSpent
      FROM transactions WHERE store_id = ? AND member_id = ?
    `).get(storeId, memberId) as { totalTransactions: number; totalSpent: number };

    return { success: true, stats };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil statistik.';
    return { success: false, error: message };
  }
}

export async function getAllMembersAction(storeId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.', members: [] };
    }

    const members = db.prepare(`
      SELECT m.id, m.phone, m.name, m.created_at,
             COUNT(t.id) as totalTransactions,
             COALESCE(SUM(t.total), 0) as totalSpent
      FROM members m
      LEFT JOIN transactions t ON t.member_id = m.id
      WHERE m.store_id = ?
      GROUP BY m.id
      ORDER BY m.name ASC
    `).all(storeId) as { id: number; phone: string; name: string; created_at: string; totalTransactions: number; totalSpent: number }[];

    return { success: true, members };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data member.';
    return { success: false, error: message, members: [] };
  }
}

export async function getMemberTransactionsAction(storeId: number, memberId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.', transactions: [] };
    }

    const transactions = db.prepare(`
      SELECT t.id, t.timestamp, t.total, t.payment_method
      FROM transactions t
      WHERE t.store_id = ? AND t.member_id = ?
      ORDER BY t.timestamp DESC
    `).all(storeId, memberId) as { id: number; timestamp: string; total: number; payment_method: string }[];

    return { success: true, transactions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil riwayat transaksi.';
    return { success: false, error: message, transactions: [] };
  }
}

export async function updateMemberAction(storeId: number, memberId: number, name: string, phone: string) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return { success: false, error: 'Nomor HP harus diisi.' };

    // Check for phone conflict
    const existing = db.prepare(
      'SELECT id FROM members WHERE store_id = ? AND phone = ? AND id != ?'
    ).get(storeId, trimmedPhone, memberId) as { id: number } | undefined;
    if (existing) return { success: false, error: 'Nomor HP sudah digunakan member lain.' };

    db.prepare('UPDATE members SET name = ?, phone = ? WHERE id = ? AND store_id = ?').run(trimmedName, trimmedPhone, memberId, storeId);

    logActivity({ storeId, personId: session.personId, action: 'update_member', entityType: 'member', entityId: memberId, details: { name: trimmedName, phone: trimmedPhone } });

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/member`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengupdate member.';
    return { success: false, error: message };
  }
}

export async function deleteMemberAction(storeId: number, memberId: number) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    // Unlink transactions before deleting
    db.prepare('UPDATE transactions SET member_id = NULL WHERE member_id = ? AND store_id = ?').run(memberId, storeId);
    db.prepare('DELETE FROM members WHERE id = ? AND store_id = ?').run(memberId, storeId);

    logActivity({ storeId, personId: session.personId, action: 'delete_member', entityType: 'member', entityId: memberId });

    const slug = getSlug(storeId);
    revalidatePath(`/store/${slug}/member`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus member.';
    return { success: false, error: message };
  }
}

export async function createTransactionAction(
  storeId: number,
  items: CartItemInput[],
  paymentMethod: 'cash' | 'qr',
  memberId?: number | null
) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    if (items.length === 0) {
      return { success: false, error: 'Keranjang belanja kosong.' };
    }

    // Execute inside an SQLite transaction
    const transactionRunner = db.transaction(() => {
      // 1. Calculate total and check products
      let total = 0;
      const verifiedItems: {
        productId: number;
        name: string;
        price: number;
        costPrice: number;
        quantity: number;
      }[] = [];

      for (const item of items) {
        const product = db.prepare('SELECT id, name, price, cost_price, in_stock FROM products WHERE id = ? AND store_id = ?').get(item.productId, storeId) as {
          id: number;
          name: string;
          price: number;
          cost_price: number;
          in_stock: number;
        } | undefined;

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }
        if (product.in_stock === 0) {
          throw new Error(`Produk "${product.name}" sedang habis.`);
        }

        total += product.price * item.quantity;
        verifiedItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.cost_price,
          quantity: item.quantity,
        });
      }

      // 2. Insert transaction row
      const timestamp = new Date().toISOString();
      const insertTxResult = db.prepare(`
        INSERT INTO transactions (store_id, person_id, member_id, timestamp, payment_method, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(storeId, session.personId, memberId ?? null, timestamp, paymentMethod, total);
      
      const transactionId = insertTxResult.lastInsertRowid;

      // 3. Insert transaction items (snapshots)
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, product_id, name_snapshot, price_snapshot, cost_price_snapshot, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vi of verifiedItems) {
        insertItem.run(
          transactionId,
          vi.productId,
          vi.name,
          vi.price,
          vi.costPrice,
          vi.quantity
        );
      }

      // 4. Update or insert monthly commission record
      const period = timestamp.substring(0, 7); // Format: YYYY-MM
      
      // Get store commission rate
      const storeInfo = db.prepare('SELECT commission_rate FROM stores WHERE id = ?').get(storeId) as { commission_rate: number };
      const rate = storeInfo.commission_rate;

      // Check if commission record exists for this period
      const existingCommission = db.prepare(`
        SELECT id, total_sales, collected, collected_at_sales, amount_owed
        FROM commission_records 
        WHERE store_id = ? AND period = ?
      `).get(storeId, period) as { id: number; total_sales: number; collected: number; collected_at_sales: number | null; amount_owed: number } | undefined;

      if (existingCommission) {
        const newTotalSales = existingCommission.total_sales + total;
        let newAmountOwed: number;
        let newCollected = existingCommission.collected;
        const newCollectedAtSales = existingCommission.collected_at_sales;

        if (existingCommission.collected === 1 && existingCommission.collected_at_sales !== null && newTotalSales > existingCommission.collected_at_sales) {
          // Admin already collected, but new sales arrived — flag as pending for the unpaid portion only
          newCollected = 0;
          const unpaidSales = newTotalSales - existingCommission.collected_at_sales;
          newAmountOwed = Math.round((unpaidSales * rate) / 100);
        } else if (existingCommission.collected === 0 || existingCommission.collected_at_sales === null) {
          // Not yet collected — calculate full amount
          newAmountOwed = Math.round((newTotalSales * rate) / 100);
        } else {
          // Still collected, no new sales beyond what was already paid
          newAmountOwed = existingCommission.amount_owed;
        }

        db.prepare(`
          UPDATE commission_records 
          SET total_sales = ?, amount_owed = ?, collected = ?, collected_at_sales = ?
          WHERE id = ?
        `).run(newTotalSales, newAmountOwed, newCollected, newCollectedAtSales, existingCommission.id);
      } else {
        const amountOwed = Math.round((total * rate) / 100);
        db.prepare(`
          INSERT INTO commission_records (store_id, period, total_sales, rate_applied, amount_owed, collected)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(storeId, period, total, rate, amountOwed);
      }

      return {
        transactionId,
        timestamp,
        total,
        cashierName: session.personName,
        paymentMethod,
        memberId: memberId ?? null,
        items: verifiedItems,
      };
    });

    const result = transactionRunner();

    logActivity({
      storeId,
      personId: session.personId,
      action: 'create_transaction',
      entityType: 'transaction',
      entityId: result.transactionId as number,
      request: { paymentMethod, itemCount: items.length, memberId: memberId ?? null, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      response: { transactionId: result.transactionId, total: result.total, cashierName: result.cashierName, paymentMethod: result.paymentMethod, items: result.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })) },
    });

    const storeRow = db.prepare('SELECT slug FROM stores WHERE id = ?').get(storeId) as { slug: string };
    revalidatePath(`/store/${storeRow.slug}/riwayat`);

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses transaksi.';
    return {
      success: false,
      error: message,
    };
  }
}

export async function createMidtransTransactionAction(
  storeId: number,
  items: CartItemInput[],
  memberId?: number | null
) {
  try {
    const session = await getStoreSession();
    if (!session || session.storeId !== storeId) {
      return { success: false, error: 'Sesi tidak valid.' };
    }

    if (items.length === 0) {
      return { success: false, error: 'Keranjang belanja kosong.' };
    }

    const snap = getMidtransSnap();

    // Execute inside an SQLite transaction
    const transactionRunner = db.transaction(() => {
      // 1. Calculate total and check products
      let total = 0;
      const verifiedItems: {
        productId: number;
        name: string;
        price: number;
        costPrice: number;
        quantity: number;
      }[] = [];

      for (const item of items) {
        const product = db.prepare('SELECT id, name, price, cost_price, in_stock FROM products WHERE id = ? AND store_id = ?').get(item.productId, storeId) as {
          id: number;
          name: string;
          price: number;
          cost_price: number;
          in_stock: number;
        } | undefined;

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }
        if (product.in_stock === 0) {
          throw new Error(`Produk "${product.name}" sedang habis.`);
        }

        total += product.price * item.quantity;
        verifiedItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.cost_price,
          quantity: item.quantity,
        });
      }

      // 2. Insert transaction row with 'online' payment method
      const timestamp = new Date().toISOString();
      const insertTxResult = db.prepare(`
        INSERT INTO transactions (store_id, person_id, member_id, timestamp, payment_method, total, midtrans_status)
        VALUES (?, ?, ?, ?, 'online', ?, 'pending')
      `).run(storeId, session.personId, memberId ?? null, timestamp, total);

      const transactionId = insertTxResult.lastInsertRowid;
      const orderId = generateOrderId(storeId, transactionId);

      // Update transaction with midtrans_order_id
      db.prepare('UPDATE transactions SET midtrans_order_id = ? WHERE id = ?').run(orderId, transactionId);

      // 3. Insert transaction items (snapshots)
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, product_id, name_snapshot, price_snapshot, cost_price_snapshot, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vi of verifiedItems) {
        insertItem.run(
          transactionId,
          vi.productId,
          vi.name,
          vi.price,
          vi.costPrice,
          vi.quantity
        );
      }

      // 4. Update or insert monthly commission record
      const period = timestamp.substring(0, 7); // Format: YYYY-MM

      // Get store commission rate
      const storeInfo = db.prepare('SELECT commission_rate FROM stores WHERE id = ?').get(storeId) as { commission_rate: number };
      const rate = storeInfo.commission_rate;

      // Check if commission record exists for this period
      const existingCommission = db.prepare(`
        SELECT id, total_sales, collected, collected_at_sales, amount_owed
        FROM commission_records
        WHERE store_id = ? AND period = ?
      `).get(storeId, period) as { id: number; total_sales: number; collected: number; collected_at_sales: number | null; amount_owed: number } | undefined;

      if (existingCommission) {
        const newTotalSales = existingCommission.total_sales + total;
        let newAmountOwed: number;
        let newCollected = existingCommission.collected;
        const newCollectedAtSales = existingCommission.collected_at_sales;

        if (existingCommission.collected === 1 && existingCommission.collected_at_sales !== null && newTotalSales > existingCommission.collected_at_sales) {
          newCollected = 0;
          const unpaidSales = newTotalSales - existingCommission.collected_at_sales;
          newAmountOwed = Math.round((unpaidSales * rate) / 100);
        } else if (existingCommission.collected === 0 || existingCommission.collected_at_sales === null) {
          newAmountOwed = Math.round((newTotalSales * rate) / 100);
        } else {
          newAmountOwed = existingCommission.amount_owed;
        }

        db.prepare(`
          UPDATE commission_records
          SET total_sales = ?, amount_owed = ?, collected = ?, collected_at_sales = ?
          WHERE id = ?
        `).run(newTotalSales, newAmountOwed, newCollected, newCollectedAtSales, existingCommission.id);
      } else {
        const amountOwed = Math.round((total * rate) / 100);
        db.prepare(`
          INSERT INTO commission_records (store_id, period, total_sales, rate_applied, amount_owed, collected)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(storeId, period, total, rate, amountOwed);
      }

      return {
        transactionId,
        orderId,
        timestamp,
        total,
        cashierName: session.personName,
        memberId: memberId ?? null,
        items: verifiedItems,
      };
    });

    const result = transactionRunner();

    // 5. Create Midtrans Snap transaction
    const storeRow = db.prepare('SELECT slug, name FROM stores WHERE id = ?').get(storeId) as { slug: string; name: string };

    // Update Snap display name to show this store's name (production only — sandbox doesn't support this API)
    if (process.env.NODE_ENV === 'production') {
      await updateSnapDisplayName(storeRow.name);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
      : 'http://localhost:3000';

    const snapResponse = await snap.createTransaction({
      transaction_details: {
        order_id: result.orderId,
        gross_amount: result.total,
      },
      enabled_payments: MIDTRANS_ENABLED_PAYMENTS,
      customer_details: result.memberId
        ? (() => {
            const member = db.prepare('SELECT phone, name FROM members WHERE id = ?').get(result.memberId) as { phone: string; name: string } | undefined;
            return {
              phone: member?.phone || '',
              first_name: member?.name || '',
            };
          })()
        : undefined,
      callbacks: {
        finish: `${baseUrl}/store/${storeRow.slug}`,
      },
    });

    logActivity({
      storeId,
      personId: session.personId,
      action: 'create_midtrans_transaction',
      entityType: 'transaction',
      entityId: result.transactionId as number,
      request: { itemCount: items.length, memberId: memberId ?? null, orderId: result.orderId },
      response: { transactionId: result.transactionId, total: result.total, orderId: result.orderId },
    });

    revalidatePath(`/store/${storeRow.slug}/riwayat`);

    return {
      success: true,
      snapToken: snapResponse.token,
      orderId: result.orderId,
      data: {
        transactionId: result.transactionId,
        timestamp: result.timestamp,
        total: result.total,
        cashierName: result.cashierName,
        paymentMethod: 'online',
        memberId: result.memberId,
        items: result.items,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses transaksi.';
    console.error('[MIDTRANS] Create transaction error:', error);
    return {
      success: false,
      error: message,
    };
  }
}
