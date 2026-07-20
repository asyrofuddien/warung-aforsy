import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyMidtransSignature } from '@/lib/midtrans';
import { logActivity } from '@/lib/logger';

interface MidtransNotification {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  transaction_time: string;
  settlement_time?: string;
  payment_type: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MidtransNotification = await request.json();

    const { order_id, transaction_status, status_code, gross_amount, signature_key } = body;

    if (!order_id || !transaction_status || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
    }

    // Verify signature
    const isValid = verifyMidtransSignature({
      order_id,
      status_code,
      gross_amount,
      signature_key,
    });

    if (!isValid) {
      logActivity({ action: 'midtrans_notification_invalid_signature', entityType: 'payment', details: { order_id } });
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 403 });
    }

    // Find transaction by midtrans_order_id
    const transaction = db.prepare(
      'SELECT id, store_id, person_id, midtrans_status, total, timestamp FROM transactions WHERE midtrans_order_id = ?'
    ).get(order_id) as { id: number; store_id: number; person_id: number; midtrans_status: string | null; total: number; timestamp: string } | undefined;

    if (!transaction) {
      logActivity({ action: 'midtrans_notification_unknown_order', entityType: 'payment', details: { order_id } });
      return NextResponse.json({ status: 'ok', message: 'Order not found' });
    }

    // Map Midtrans status to our status
    let newStatus: string;
    switch (transaction_status) {
      case 'capture':
      case 'settlement':
        newStatus = 'settlement';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
      case 'deny':
        newStatus = 'deny';
        break;
      case 'cancel':
        newStatus = 'cancel';
        break;
      case 'expire':
        newStatus = 'expire';
        break;
      case 'failure':
        newStatus = 'failure';
        break;
      default:
        newStatus = transaction_status;
    }

    // Update transaction status
    db.prepare(
      'UPDATE transactions SET midtrans_status = ? WHERE midtrans_order_id = ?'
    ).run(newStatus, order_id);

    // Add commission only on first settlement (not if already settled before)
    if (newStatus === 'settlement' && transaction.midtrans_status !== 'settlement') {
      const period = transaction.timestamp.substring(0, 7); // YYYY-MM
      const storeInfo = db.prepare('SELECT commission_rate FROM stores WHERE id = ?').get(transaction.store_id) as { commission_rate: number };
      const rate = storeInfo.commission_rate;

      const existingCommission = db.prepare(`
        SELECT id, total_sales, collected, collected_at_sales, amount_owed
        FROM commission_records
        WHERE store_id = ? AND period = ?
      `).get(transaction.store_id, period) as { id: number; total_sales: number; collected: number; collected_at_sales: number | null; amount_owed: number } | undefined;

      if (existingCommission) {
        const newTotalSales = existingCommission.total_sales + transaction.total;
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
        const amountOwed = Math.round((transaction.total * rate) / 100);
        db.prepare(`
          INSERT INTO commission_records (store_id, period, total_sales, rate_applied, amount_owed, collected)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(transaction.store_id, period, transaction.total, rate, amountOwed);
      }
    }

    logActivity({
      storeId: transaction.store_id,
      personId: transaction.person_id,
      action: 'midtrans_notification',
      entityType: 'transaction',
      entityId: transaction.id,
      details: {
        order_id,
        previous_status: transaction.midtrans_status,
        new_status: newStatus,
        payment_type: body.payment_type,
        fraud_status: body.fraud_status,
        gross_amount: body.gross_amount,
      },
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[MIDTRANS] Notification handler error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
