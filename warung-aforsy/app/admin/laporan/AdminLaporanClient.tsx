'use client';

import { useState } from 'react';
import { generateLaporanPDF } from '@/lib/admin-laporan-pdf';

interface StoreProfitSummary {
  store_id: number;
  store_name: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface StoreMonthlyRow {
  store_id: number;
  store_name: string;
  period: string;
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface GlobalTotals {
  total_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface AdminLaporanClientProps {
  storeSummaries: StoreProfitSummary[];
  monthlyData: StoreMonthlyRow[];
  globalTotals: GlobalTotals;
  storeNames: { id: number; name: string }[];
}

export default function AdminLaporanClient({
  storeSummaries,
  monthlyData,
  globalTotals,
  storeNames,
}: AdminLaporanClientProps) {
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const months = Array.from(new Set(monthlyData.map((m) => m.period))).sort().reverse();

  const formatMonthLabel = (periodStr: string) => {
    try {
      const [year, month] = periodStr.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    } catch {
      return periodStr;
    }
  };

  const toggleStore = (storeId: number) => {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const toggleAll = () => {
    if (selectedStores.length === storeNames.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(storeNames.map((s) => s.id));
    }
  };

  // Filter data based on selection
  const filteredSummaries = storeSummaries.filter((s) =>
    selectedStores.length === 0 || selectedStores.includes(s.store_id)
  );

  const filteredMonthly = monthlyData.filter((m) => {
    const matchStore = selectedStores.length === 0 || selectedStores.includes(m.store_id);
    const matchMonth = selectedMonth === 'all' || m.period === selectedMonth;
    return matchStore && matchMonth;
  });

  const totals = filteredSummaries.reduce(
    (acc, s) => ({
      total_transactions: acc.total_transactions + s.total_transactions,
      total_revenue: acc.total_revenue + s.total_revenue,
      total_cost: acc.total_cost + s.total_cost,
      total_profit: acc.total_profit + s.total_profit,
    }),
    { total_transactions: 0, total_revenue: 0, total_cost: 0, total_profit: 0 }
  );

  const handleDownloadPdf = () => {
    if (filteredSummaries.length === 0) return;

    const selectedStoreLabels = selectedStores.length === 0
      ? []
      : storeNames.filter((s) => selectedStores.includes(s.id)).map((s) => s.name);

    generateLaporanPDF(
      filteredSummaries,
      filteredMonthly,
      selectedMonth,
      selectedStoreLabels,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading" style={{ fontSize: '26px' }}>Laporan Keuntungan</h1>
        <p className="text-meta">Keuntungan bersih per warung berdasarkan selisih harga jual dan harga modal</p>
      </div>

      {/* Filters Card */}
      <div className="card bg-white border p-4">
        <span className="text-meta mb-2 block" style={{ fontWeight: 600 }}>Filter Laporan</span>
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* Month Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Periode Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
              style={{ minHeight: '40px', padding: 'var(--space-2)' }}
            >
              <option value="all">Semua Periode</option>
              {months.map((m) => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Store multi-select */}
          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Pilih Warung</label>
            <div
              className="input flex flex-wrap gap-1"
              style={{ minHeight: '40px', padding: 'var(--space-2)', alignItems: 'flex-start' }}
            >
              <button
                onClick={toggleAll}
                className={`badge cursor-pointer ${selectedStores.length === storeNames.length ? 'badge--green' : 'badge--marigold'}`}
                style={{ fontSize: '11px' }}
              >
                {selectedStores.length === storeNames.length ? 'Batal Pilih' : 'Pilih Semua'}
              </button>
              {storeNames.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStore(s.id)}
                  className={`badge cursor-pointer ${selectedStores.includes(s.id) ? 'badge--green' : ''}`}
                  style={{ fontSize: '11px' }}
                >
                  {s.name}
                </button>
              ))}
              {storeNames.length === 0 && (
                <span className="text-meta" style={{ fontSize: '11px' }}>Belum ada warung</span>
              )}
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-3">
          <button
            onClick={handleDownloadPdf}
            className="btn btn-secondary btn--sm"
            disabled={filteredSummaries.length === 0}
          >
            Unduh PDF
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card bg-white p-4">
          <span className="text-meta block">Total Pendapatan Global</span>
          <span className="text-total block mt-1" style={{ fontSize: '22px' }}>
            Rp {globalTotals.total_revenue.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="card bg-white p-4">
          <span className="text-meta block">Total Modal Global</span>
          <span className="text-total block mt-1" style={{ fontSize: '22px' }}>
            Rp {globalTotals.total_cost.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="card bg-white p-4">
          <span className="text-meta block" style={{ color: 'var(--color-warung-green)' }}>Total Keuntungan Global</span>
          <span className="text-total block mt-1" style={{ fontSize: '22px', color: 'var(--color-warung-green)' }}>
            Rp {globalTotals.total_profit.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="card bg-white p-4">
          <span className="text-meta block">Total Transaksi Global</span>
          <span className="text-total block mt-1" style={{ fontSize: '22px' }}>
            {globalTotals.total_transactions.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Filtered Totals */}
      {(selectedStores.length > 0 || selectedMonth !== 'all') && (
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="card bg-white p-4" style={{ border: '2px solid var(--color-warung-green)' }}>
            <span className="text-meta block">Pendapatan Filtered</span>
            <span className="text-total block mt-1" style={{ fontSize: '20px' }}>
              Rp {totals.total_revenue.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="card bg-white p-4" style={{ border: '2px solid var(--color-warung-green)' }}>
            <span className="text-meta block">Modal Filtered</span>
            <span className="text-total block mt-1" style={{ fontSize: '20px' }}>
              Rp {totals.total_cost.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="card bg-white p-4" style={{ border: '2px solid var(--color-warung-green)' }}>
            <span className="text-meta block" style={{ color: 'var(--color-warung-green)' }}>Keuntungan Filtered</span>
            <span className="text-total block mt-1" style={{ fontSize: '20px', color: 'var(--color-warung-green)' }}>
              Rp {totals.total_profit.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="card bg-white p-4" style={{ border: '2px solid var(--color-warung-green)' }}>
            <span className="text-meta block">Transaksi Filtered</span>
            <span className="text-total block mt-1" style={{ fontSize: '20px' }}>
              {totals.total_transactions.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="card bg-white overflow-hidden p-0" style={{ border: '1px solid var(--color-line)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Warung</th>
                <th>Total Transaksi</th>
                <th>Total Pendapatan</th>
                <th>Total Modal</th>
                <th>Total Keuntungan</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-meta">
                    Tidak ada data keuntungan.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => (
                  <tr key={s.store_id}>
                    <td style={{ fontWeight: 600 }}>{s.store_name}</td>
                    <td className="text-numeral">{s.total_transactions}</td>
                    <td className="text-numeral">Rp {s.total_revenue.toLocaleString('id-ID')}</td>
                    <td className="text-numeral">Rp {s.total_cost.toLocaleString('id-ID')}</td>
                    <td
                      className="text-numeral"
                      style={{ fontWeight: 700, color: s.total_profit >= 0 ? 'var(--color-warung-green)' : 'var(--color-signal-red)' }}
                    >
                      Rp {s.total_profit.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {filteredMonthly.length > 0 && (
        <div className="card bg-white overflow-hidden p-0" style={{ border: '1px solid var(--color-line)' }}>
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-line)' }}>
            <span className="text-meta" style={{ fontWeight: 600 }}>Rincian Bulanan</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Warung</th>
                  <th>Periode</th>
                  <th>Transaksi</th>
                  <th>Pendapatan</th>
                  <th>Modal</th>
                  <th>Keuntungan</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.map((m, idx) => (
                  <tr key={`${m.store_id}-${m.period}-${idx}`}>
                    <td style={{ fontWeight: 600 }}>{m.store_name}</td>
                    <td className="text-numeral" style={{ fontWeight: 'bold' }}>
                      {formatMonthLabel(m.period)}
                    </td>
                    <td className="text-numeral">{m.total_transactions}</td>
                    <td className="text-numeral">Rp {m.total_revenue.toLocaleString('id-ID')}</td>
                    <td className="text-numeral">Rp {m.total_cost.toLocaleString('id-ID')}</td>
                    <td
                      className="text-numeral"
                      style={{ fontWeight: 700, color: m.total_profit >= 0 ? 'var(--color-warung-green)' : 'var(--color-signal-red)' }}
                    >
                      Rp {m.total_profit.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
