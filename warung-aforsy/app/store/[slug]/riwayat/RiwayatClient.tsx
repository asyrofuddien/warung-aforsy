'use client';

import { useState } from 'react';

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
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD format
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Group transaction items by transaction ID
  const itemsByTxId = transactionItems.reduce((acc, item) => {
    if (!acc[item.transaction_id]) {
      acc[item.transaction_id] = [];
    }
    acc[item.transaction_id].push(item);
    return acc;
  }, {} as { [txId: number]: TransactionItem[] });

  // Filter transactions
  const filteredTxs = transactions.filter((tx) => {
    const matchCashier = filterCashier === 'all' || tx.cashier_id.toString() === filterCashier;
    
    let matchDate = true;
    if (filterDate) {
      const txLocalDate = tx.timestamp.split('T')[0]; // Extract YYYY-MM-DD
      matchDate = txLocalDate === filterDate;
    }
    
    return matchCashier && matchDate;
  });

  // Calculate totals for the filtered list
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
      }).replace(/\//g, '-');
    } catch {
      return isoStr;
    }
  };

  const getWhatsAppShareLink = (receipt: Transaction) => {
    const items = itemsByTxId[receipt.id] || [];
    
    let text = `*${storeName.toUpperCase()}*\n`;
    text += `Nota Belanja - #${receipt.id}\n`;
    text += `Tanggal: ${formatIndoDate(receipt.timestamp)}\n`;
    text += `Kasir: ${receipt.cashier_name}\n`;
    text += `------------------------------------\n`;
    
    items.forEach((item) => {
      text += `- ${item.quantity}x ${item.name_snapshot} @ Rp ${item.price_snapshot.toLocaleString('id-ID')} = Rp ${(item.quantity * item.price_snapshot).toLocaleString('id-ID')}\n`;
    });
    
    text += `------------------------------------\n`;
    text += `*TOTAL: Rp ${receipt.total.toLocaleString('id-ID')}*\n`;
    text += `Metode Pembayaran: ${receipt.payment_method === 'qr' ? 'QRIS (Gopay)' : 'Tunai (Cash)'}\n\n`;
    text += `Terima Kasih atas Kunjungan Anda!`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: '100px' }}>
      {/* Filters Card */}
      <div className="card bg-white border p-4">
        <span className="text-meta mb-2 block" style={{ fontWeight: 600 }}>Filter Riwayat</span>
        <div className="grid grid-cols-2 gap-2">
          {/* Cashier Filter */}
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

          {/* Date Filter */}
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

      {/* Receipt Dialog Overlay */}
      {selectedTx && (
        <div className="overlay overlay-enter" onClick={() => setSelectedTx(null)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', padding: 'var(--space-2)' }}
          >
            <div className="receipt-stub" style={{ boxShadow: 'none' }}>
              <h2 className="text-heading" style={{ fontSize: '20px', margin: 'var(--space-3) 0' }}>
                {storeName}
              </h2>
              <div className="text-meta">No. Nota: #{selectedTx.id}</div>
              <div className="text-meta">Waktu: {formatIndoDate(selectedTx.timestamp)}</div>
              <div className="text-meta">Kasir: {selectedTx.cashier_name}</div>

              <hr className="receipt-stub__separator" />

              <div className="stack stack--2 text-left my-4">
                {(itemsByTxId[selectedTx.id] || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-meta">
                    <span>
                      {item.quantity}x {item.name_snapshot}
                    </span>
                    <span className="text-numeral">
                      Rp {(item.quantity * item.price_snapshot).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="receipt-stub__separator" />

              <div className="receipt-stub__total-label">TOTAL BELANJA</div>
              <div className="receipt-stub__total" style={{ fontSize: '28px' }}>
                Rp {selectedTx.total.toLocaleString('id-ID')}
              </div>

              <div className="receipt-stub__status">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: '16px', height: '16px' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Pembayaran {selectedTx.payment_method === 'qr' ? 'QRIS' : 'Tunai'} Berhasil
              </div>

              <div className="receipt-stub__actions">
                <a
                  href={getWhatsAppShareLink(selectedTx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn--full"
                >
                  Bagikan ke WhatsApp
                </a>
                
                <button className="btn btn-secondary btn--full" onClick={() => setSelectedTx(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
