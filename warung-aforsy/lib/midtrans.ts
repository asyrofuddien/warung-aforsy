import midtransClient from 'midtrans-client';
import crypto from 'crypto';

let snapInstance: InstanceType<typeof midtransClient.Snap> | null = null;

export function getMidtransSnap(): InstanceType<typeof midtransClient.Snap> {
  if (snapInstance) return snapInstance;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;

  if (!serverKey || !clientKey) {
    throw new Error('MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY must be set in environment variables.');
  }

  snapInstance = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_PRODUCTION === 'true',
    serverKey,
    clientKey,
  });

  return snapInstance;
}

export function generateOrderId(storeId: number, transactionId: number | bigint): string {
  const ts = Date.now();
  return `${storeId}-tx-${transactionId}-${ts}`;
}

export const MIDTRANS_ENABLED_PAYMENTS = [
  'qris',
  'bca_va',
  'mandiri_va',
  'bni_va',
  'permata_va',
  'bri_va',
  'other_va',
];

export function verifyMidtransSignature(params: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const input = `${params.order_id}${params.status_code}${params.gross_amount}${serverKey}`;
  const expectedSignature = crypto.createHash('sha512').update(input).digest('hex');
  return expectedSignature === params.signature_key;
}
