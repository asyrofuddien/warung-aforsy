'use server';

import db from '@/lib/db';
import { getStoreSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface CartItemInput {
  productId: number;
  quantity: number;
}

export async function createTransactionAction(
  storeId: number,
  items: CartItemInput[],
  paymentMethod: 'cash' | 'qr'
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
        INSERT INTO transactions (store_id, person_id, timestamp, payment_method, total)
        VALUES (?, ?, ?, ?, ?)
      `).run(storeId, session.personId, timestamp, paymentMethod, total);
      
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
        SELECT id, total_sales 
        FROM commission_records 
        WHERE store_id = ? AND period = ?
      `).get(storeId, period) as { id: number; total_sales: number } | undefined;

      if (existingCommission) {
        const newTotalSales = existingCommission.total_sales + total;
        const newAmountOwed = Math.round((newTotalSales * rate) / 100);
        db.prepare(`
          UPDATE commission_records 
          SET total_sales = ?, amount_owed = ? 
          WHERE id = ?
        `).run(newTotalSales, newAmountOwed, existingCommission.id);
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
        items: verifiedItems,
      };
    });

    const result = transactionRunner();

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
