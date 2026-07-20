'use client';

import { useState } from 'react';
import { Download, FileImage, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReceiptDocument from '@/components/ReceiptDocument';
import { downloadReceiptPDF, downloadReceiptImage, shareReceiptWhatsApp } from '@/lib/receipt';

interface Transaction {
  id: number;
  timestamp: string;
  payment_method: 'cash' | 'qr' | 'online';
  total: number;
  cashier_name: string;
  cashier_id: number;
  member_id: number | null;
  member_name: string | null;
  member_phone: string | null;
  midtrans_status: string | null;
}

interface TransactionItem {
  transaction_id: number;
  name_snapshot: string;
  price_snapshot: number;
  cost_price_snapshot: number;
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
  isOwner: boolean;
}

interface MonthlyData {
  period: string;
  label: string;
  txCount: number;
  totalRevenue: number;
  totalProfit: number;
  topProducts: { name: string; qty: number }[];
  avgPerDay: number;
  prevRevenue: number | null;
  prevProfit: number | null;
}

function formatMonthLabel(periodStr: string): string {
  try {
    const [year, month] = periodStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  } catch {
    return periodStr;
  }
}

export default function RiwayatClient({
  transactions,
  transactionItems,
  cashiers,
  storeName,
  isOwner,
}: RiwayatClientProps) {
  const [filterCashier, setFilterCashier] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // --- Monthly Report (Owner Only) ---
  const monthlyData: MonthlyData[] = (() => {
    const monthMap: {
      [period: string]: {
        txs: Transaction[];
        items: TransactionItem[];
      };
    } = {};

    transactions.forEach((tx) => {
      const period = tx.timestamp.substring(0, 7);
      if (!monthMap[period]) monthMap[period] = { txs: [], items: [] };
      monthMap[period].txs.push(tx);
    });

    transactionItems.forEach((item) => {
      const tx = transactions.find((t) => t.id === item.transaction_id);
      if (tx) {
        const period = tx.timestamp.substring(0, 7);
        if (monthMap[period]) monthMap[period].items.push(item);
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, data]) => {
        const txCount = data.txs.length;
        const totalRevenue = data.txs.reduce((acc, tx) => acc + tx.total, 0);
        const totalProfit = data.items.reduce(
          (acc, item) => acc + (item.price_snapshot - item.cost_price_snapshot) * item.quantity,
          0
        );

        // Top 5 products by quantity
        const productQty: { [name: string]: number } = {};
        data.items.forEach((item) => {
          productQty[item.name_snapshot] = (productQty[item.name_snapshot] || 0) + item.quantity;
        });
        const topProducts = Object.entries(productQty)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));

        // Days in month for avg
        const [year, month] = period.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const avgPerDay = Math.round(txCount / daysInMonth);

        return { period, label: formatMonthLabel(period), txCount, totalRevenue, totalProfit, topProducts, avgPerDay, prevRevenue: null as number | null, prevProfit: null as number | null };
      })
      .map((entry, idx, arr) => {
        if (idx < arr.length - 1) {
          entry.prevRevenue = arr[idx + 1].totalRevenue;
          entry.prevProfit = arr[idx + 1].totalProfit;
        }
        return entry;
      });
  })();

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

  // Calculate profit per transaction
  const profitByTxId = transactionItems.reduce((acc, item) => {
    const profit = (item.price_snapshot - item.cost_price_snapshot) * item.quantity;
    acc[item.transaction_id] = (acc[item.transaction_id] || 0) + profit;
    return acc;
  }, {} as { [txId: number]: number });

  const totalFilteredProfit = filteredTxs.reduce((acc, tx) => acc + (profitByTxId[tx.id] || 0), 0);

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

      {/* Laporan Bulanan (Owner Only) */}
      {isOwner && monthlyData.length > 0 && (
        <div className="card bg-white border p-0 overflow-hidden">
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-line)' }}>
            <span className="text-meta" style={{ fontWeight: 700, fontSize: '14px' }}>Laporan Bulanan</span>
            <span className="text-meta block" style={{ fontSize: '11px', marginTop: '2px' }}>
              Ringkasan penjualan per bulan (klik untuk detail)
            </span>
          </div>

          {/* Table Header */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: '1fr 80px 100px 100px',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: '2px solid var(--color-line)',
              fontWeight: 700,
              fontSize: '11px',
              color: 'var(--color-muted-ink)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            <span>Bulan</span>
            <span style={{ textAlign: 'right' }}>Transaksi</span>
            <span style={{ textAlign: 'right' }}>Pendapatan</span>
            <span style={{ textAlign: 'right' }}>Keuntungan</span>
          </div>

          {/* Table Rows */}
          {monthlyData.map((m) => {
            const isExpanded = expandedMonth === m.period;
            const revenueDiff = m.prevRevenue !== null ? ((m.totalRevenue - m.prevRevenue) / m.prevRevenue) * 100 : null;
            const profitDiff = m.prevProfit !== null ? ((m.totalProfit - m.prevProfit) / m.prevProfit) * 100 : null;

            return (
              <div key={m.period}>
                <div
                  onClick={() => setExpandedMonth(isExpanded ? null : m.period)}
                  className="grid cursor-pointer hover:bg-white"
                  style={{
                    gridTemplateColumns: '1fr 80px 100px 100px',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-line)',
                    backgroundColor: isExpanded ? 'rgba(15, 122, 92, 0.04)' : undefined,
                    transition: 'background-color 0.15s',
                  }}
                >
                  <span className="text-meta" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-ink)' }}>
                    {m.label}
                  </span>
                  <span className="text-numeral" style={{ textAlign: 'right', fontSize: '13px' }}>
                    {m.txCount}
                  </span>
                  <span className="text-numeral" style={{ textAlign: 'right', fontSize: '13px' }}>
                    Rp {m.totalRevenue.toLocaleString('id-ID')}
                  </span>
                  <span className="text-numeral" style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--color-warung-green)' }}>
                    Rp {m.totalProfit.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--color-line)',
                      backgroundColor: 'rgba(15, 122, 92, 0.04)',
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                      {/* Rata-rata per hari */}
                      <div className="card bg-white p-3" style={{ boxShadow: 'none', border: '1px solid var(--color-line)' }}>
                        <span className="text-meta" style={{ fontSize: '10px' }}>Rata-rata/Hari</span>
                        <span className="text-numeral block" style={{ fontSize: '16px', fontWeight: 700 }}>
                          {m.avgPerDay} tx
                        </span>
                      </div>

                      {/* Perbandingan bulan lalu */}
                      <div className="card bg-white p-3" style={{ boxShadow: 'none', border: '1px solid var(--color-line)' }}>
                        <span className="text-meta" style={{ fontSize: '10px' }}>vs Bulan Lalu</span>
                        {revenueDiff !== null ? (
                          <span
                            className="text-numeral block"
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: revenueDiff >= 0 ? 'var(--color-warung-green)' : 'var(--color-signal-red)',
                            }}
                          >
                            {revenueDiff >= 0 ? '+' : ''}{revenueDiff.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-numeral block" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-muted-ink)' }}>
                            -
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Top Produk */}
                    {m.topProducts.length > 0 && (
                      <div>
                        <span className="text-meta block mb-1" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                          Top Produk Terlaris
                        </span>
                        <div className="flex flex-col gap-1">
                          {m.topProducts.map((p, idx) => (
                            <div key={idx} className="flex justify-between" style={{ fontSize: '12px' }}>
                              <span className="text-meta">{idx + 1}. {p.name}</span>
                              <span className="text-numeral" style={{ fontWeight: 600 }}>{p.qty}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Profit detail */}
                    {profitDiff !== null && (
                      <div className="mt-2" style={{ fontSize: '11px', color: 'var(--color-muted-ink)' }}>
                        Keuntungan bulan lalu: Rp {(m.prevProfit || 0).toLocaleString('id-ID')} (
                        <span style={{ color: profitDiff >= 0 ? 'var(--color-warung-green)' : 'var(--color-signal-red)', fontWeight: 600 }}>
                          {profitDiff >= 0 ? '+' : ''}{profitDiff.toFixed(1)}%
                        </span>)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Box */}
      <div className="card bg-green text-white p-4 text-center">
        <span className="text-meta text-white opacity-80" style={{ fontSize: '12px', fontWeight: 600 }}>
          TOTAL TRANSAKSI FILTERED
        </span>
        <div className="text-total mt-1" style={{ fontSize: '28px' }}>
          Rp {totalFilteredSales.toLocaleString('id-ID')}
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-meta text-white opacity-80" style={{ fontSize: '11px' }}>
            {filteredTxs.length} Transaksi
          </span>
          <span className="text-meta text-white opacity-80" style={{ fontSize: '11px' }}>
            Keuntungan: Rp {totalFilteredProfit.toLocaleString('id-ID')}
          </span>
        </div>
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
                {tx.member_name && (
                  <div className="text-meta" style={{ fontSize: '11px', color: 'var(--color-warung-green)', fontWeight: 600, marginTop: '2px' }}>
                    Member: {tx.member_name}
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-numeral block" style={{ fontWeight: 700, fontSize: '15px' }}>
                  Rp {tx.total.toLocaleString('id-ID')}
                </span>
                <span className="text-meta" style={{ fontSize: '11px', color: 'var(--color-warung-green)' }}>
                  +Rp {(profitByTxId[tx.id] || 0).toLocaleString('id-ID')}
                </span>
                <span
                  className={`badge ${tx.payment_method === 'online' && tx.midtrans_status !== 'settlement' ? 'badge--marigold' : tx.payment_method !== 'cash' ? 'badge--green' : 'badge--marigold'} mt-1`}
                  style={{ fontSize: '10px' }}
                >
                  {tx.payment_method === 'online'
                    ? (tx.midtrans_status === 'settlement' || tx.midtrans_status === 'capture' ? 'Online' : tx.midtrans_status === 'pending' ? 'Pending' : tx.midtrans_status === 'cancel' ? 'Dibatalkan' : tx.midtrans_status === 'expire' ? 'Expired' : 'Gagal')
                    : tx.payment_method === 'qr' ? 'QRIS' : 'Tunai'}
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
              midtransStatus={selectedTx.midtrans_status}
              items={(itemsByTxId[selectedTx.id] || []).map((item) => ({
                name: item.name_snapshot,
                price: item.price_snapshot,
                quantity: item.quantity,
              }))}
              total={selectedTx.total}
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {selectedTx.member_id && (
                <button
                  className="btn btn-primary btn--full"
                  onClick={async () => {
                    try {
                      const el = document.getElementById('receipt-document');
                      if (el) await shareReceiptWhatsApp(el, storeName, selectedTx.id, selectedTx.member_phone ?? undefined);
                    } catch {
                      toast.error('Gagal membagikan nota.');
                    }
                  }}
                  style={{ justifyContent: 'center', gap: '8px', minHeight: '48px' }}
                >
                  <MessageCircle size={18} />
                  Share WhatsApp
                </button>
              )}

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
