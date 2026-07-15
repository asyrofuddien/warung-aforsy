'use client';

import { useState } from 'react';
import { Download, FileImage, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReceiptDocument from '@/components/ReceiptDocument';
import { downloadReceiptPDF, downloadReceiptImage, shareReceiptWhatsApp } from '@/lib/receipt';

interface Transaction {
  id: number;
  timestamp: string;
  payment_method: 'cash' | 'qr';
  total: number;
  cashier_name: string;
  cashier_id: number;
}

interface TransactionItem {
  transaction_id: number;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

interface Cashier {
  id: number;
  name: string;
}

interface RiwayatClientProps {
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  cashiers: Cashier[];
  storeName: string;
}

export default function RiwayatClient({
  transactions,
  transactionItems,
  cashiers,
  storeName,
}: RiwayatClientProps) {
  const [filterCashier, setFilterCashier] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const itemsByTxId = transactionItems.reduce((acc, item) => {
    if (!acc[item.transaction_id]) {
      acc[item.transaction_id] = [];
    }
    acc[item.transaction_id].push(item);
    return acc;
  }, {} as { [txId: number]: TransactionItem[] });

  const filteredTxs = transactions.filter((tx) => {
    const matchCashier = filterCashier === 'all' || tx.cashier_id.toString() === filterCashier;
    let matchDate = true;
    if (filterDate) {
      const txLocalDate = tx.timestamp.split('T')[0];
      matchDate = txLocalDate === filterDate;
    }
    return matchCashier && matchDate;
  });

  const totalFilteredSales = filteredTxs.reduce((acc, curr) => acc + curr.total, 0);

  const formatIndoDate = (isoStr: string, includeTime = true) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: includeTime ? '2-digit' : undefined,
        minute: includeTime ? '2-digit' : undefined,
        timeZone: 'Asia/Jakarta',
      }).replace(/\//g, '-') + (includeTime ? ' WIB' : '');
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: '100px' }}>
      {/* Filters Card */}
      <div className="card bg-white border p-4">
        <span className="text-meta mb-2 block" style={{ fontWeight: 600 }}>Filter Riwayat</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Kasir</label>
            <select
              value={filterCashier}
              onChange={(e) => setFilterCashier(e.target.value)}
              className="input"
              style={{ minHeight: '40px', padding: 'var(--space-2)' }}
            >
              <option value="all">Semua Kasir</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Tanggal</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="input"
              style={{ minHeight: '40px', padding: 'var(--space-2)' }}
            />
          </div>
        </div>

        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className="btn btn-ghost btn--sm mt-2"
            style={{ padding: 0, minHeight: 'auto', alignSelf: 'flex-start' }}
          >
            Hapus Filter Tanggal
          </button>
        )}
      </div>

      {/* Summary Box */}
      <div className="card bg-green text-white p-4 text-center">
        <span className="text-meta text-white opacity-80" style={{ fontSize: '12px', fontWeight: 600 }}>
          TOTAL TRANSAKSI FILTERED
        </span>
        <div className="text-total mt-1" style={{ fontSize: '28px' }}>
          Rp {totalFilteredSales.toLocaleString('id-ID')}
        </div>
        <span className="text-meta text-white opacity-80 block mt-1" style={{ fontSize: '11px' }}>
          Jumlah: {filteredTxs.length} Transaksi
        </span>
      </div>

      {/* Transactions List */}
      <div className="stack stack--2">
        {filteredTxs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">Belum Ada Transaksi</div>
            <div className="empty-state__text">Transaksi yang dilakukan dengan filter ini akan muncul di sini.</div>
          </div>
        ) : (
          filteredTxs.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="flex justify-between items-center p-3 border rounded-md bg-white cursor-pointer hover:shadow-card"
            >
              <div>
                <span className="text-numeral" style={{ fontWeight: 700, fontSize: '15px' }}>
                  Nota #{tx.id}
                </span>
                <div className="text-meta mt-1">
                  {formatIndoDate(tx.timestamp)} &bull; {tx.cashier_name}
                </div>
              </div>

              <div className="text-right">
                <span className="text-numeral block" style={{ fontWeight: 700, fontSize: '15px' }}>
                  Rp {tx.total.toLocaleString('id-ID')}
                </span>
                <span
                  className={`badge ${tx.payment_method === 'qr' ? 'badge--green' : 'badge--marigold'} mt-1`}
                  style={{ fontSize: '10px' }}
                >
                  {tx.payment_method === 'qr' ? 'QRIS' : 'Tunai'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal */}
      {selectedTx && (
        <div className="overlay overlay-enter" onClick={() => setSelectedTx(null)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '400px',
              width: '100%',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <ReceiptDocument
              storeName={storeName}
              transactionId={selectedTx.id}
              timestamp={selectedTx.timestamp}
              cashierName={selectedTx.cashier_name}
              paymentMethod={selectedTx.payment_method}
              items={(itemsByTxId[selectedTx.id] || []).map((item) => ({
                name: item.name_snapshot,
                price: item.price_snapshot,
                quantity: item.quantity,
              }))}
              total={selectedTx.total}
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-primary btn--full"
                onClick={async () => {
                  try {
                    const el = document.getElementById('receipt-document');
                    if (el) await shareReceiptWhatsApp(el, storeName, selectedTx.id);
                  } catch {
                    toast.error('Gagal membagikan nota.');
                  }
                }}
                style={{ justifyContent: 'center', gap: '8px', minHeight: '48px' }}
              >
                <MessageCircle size={18} />
                Share WhatsApp
              </button>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-secondary btn--full"
                  onClick={async () => {
                    try {
                      const el = document.getElementById('receipt-document');
                      if (el) await downloadReceiptPDF(el, `nota-${storeName}-${selectedTx.id}.pdf`, storeName);
                      toast.success('PDF berhasil diunduh!');
                    } catch {
                      toast.error('Gagal membuat PDF.');
                    }
                  }}
                  style={{ justifyContent: 'center', gap: '8px', minHeight: '48px' }}
                >
                  <Download size={16} />
                  PDF
                </button>
                <button
                  className="btn btn-secondary btn--full"
                  onClick={async () => {
                    try {
                      const el = document.getElementById('receipt-document');
                      if (el) await downloadReceiptImage(el, `nota-${storeName}-${selectedTx.id}.png`);
                      toast.success('Gambar berhasil diunduh!');
                    } catch {
                      toast.error('Gagal membuat gambar.');
                    }
                  }}
                  style={{ justifyContent: 'center', gap: '8px', minHeight: '48px' }}
                >
                  <FileImage size={16} />
                  Gambar
                </button>
              </div>

              <button
                className="btn btn-secondary btn--full"
                onClick={() => setSelectedTx(null)}
                style={{ justifyContent: 'center', minHeight: '48px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
