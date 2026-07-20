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
    isProduction: process.env.NODE_ENV === 'production',
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

export async function updateSnapDisplayName(storeName: string): Promise<void> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY not set');

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  const auth = Buffer.from(serverKey + ':').toString('base64');

  const res = await fetch(`${baseUrl}/snap/v3/merchant-preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ display_name: storeName }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[MIDTRANS] Failed to update display_name:', err);
    throw new Error(`Failed to update Snap display name: ${res.status}`);
  }
}
