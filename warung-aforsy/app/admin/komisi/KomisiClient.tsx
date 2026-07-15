'use client';

import { useState } from 'react';
import { toggleCommissionCollectedAction } from '../actions';

interface CommissionRecord {
  id: number;
  store_name: string;
  store_id: number;
  period: string;
  total_sales: number;
  rate_applied: number;
  amount_owed: number;
  collected: number;
}

interface KomisiClientProps {
  records: CommissionRecord[];
}

export default function KomisiClient({ records }: KomisiClientProps) {
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, pending, collected

  // Unique billing periods in the database for dropdown filter
  const periods = Array.from(new Set(records.map((r) => r.period))).sort().reverse();

  // Handle toggling collected status
  const handleToggleCollected = async (record: CommissionRecord) => {
    await toggleCommissionCollectedAction(record.id, record.collected);
  };

  // Filter commission records
  const filteredRecords = records.filter((r) => {
    const matchPeriod = filterPeriod === 'all' || r.period === filterPeriod;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'collected' && r.collected === 1) ||
      (filterStatus === 'pending' && r.collected === 0);
    return matchPeriod && matchStatus;
  });

  // Computed dashboard totals
  const totalSalesFiltered = filteredRecords.reduce((acc, curr) => acc + curr.total_sales, 0);
  const totalOwedFiltered = filteredRecords.reduce((acc, curr) => acc + curr.amount_owed, 0);
  const totalCollectedFiltered = filteredRecords
    .filter((r) => r.collected === 1)
    .reduce((acc, curr) => acc + curr.amount_owed, 0);
  const totalPendingFiltered = filteredRecords
    .filter((r) => r.collected === 0)
    .reduce((acc, curr) => acc + curr.amount_owed, 0);

  const formatPeriodLabel = (periodStr: string) => {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-heading" style={{ fontSize: '26px' }}>Laporan Komisi</h1>
        <p className="text-meta">Kelola tagihan dan status penagihan komisi tiap toko kelontong mitra</p>
      </div>

      {/* Filters Card */}
      <div className="card bg-white border p-4">
        <span className="text-meta mb-2 block" style={{ fontWeight: 600 }}>Filter Laporan</span>
        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* Period Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Periode Bulan</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="input"
              style={{ minHeight: '40px', padding: 'var(--space-2)' }}
            >
              <option value="all">Semua Periode</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-meta" style={{ fontSize: '11px' }}>Status Penagihan</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
              style={{ minHeight: '40px', padding: 'var(--space-2)' }}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Belum Ditagih / Belum Lunas (Pending)</option>
              <option value="collected">Sudah Diterima (Lunas)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card bg-white p-4">
          <span className="text-meta block">Volume Penjualan Periode</span>
          <span className="text-total block mt-1" style={{ fontSize: '24px' }}>
            Rp {totalSalesFiltered.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="card bg-white p-4">
          <span className="text-meta block">Total Komisi Periode</span>
          <span className="text-total block mt-1" style={{ fontSize: '24px' }}>
            Rp {totalOwedFiltered.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="card bg-white p-4">
          <span className="text-meta block" style={{ color: 'var(--color-warung-green)' }}>Komisi Diterima</span>
          <span className="text-total block mt-1" style={{ fontSize: '24px', color: 'var(--color-warung-green)' }}>
            Rp {totalCollectedFiltered.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="card bg-white p-4">
          <span className="text-meta block" style={{ color: 'var(--color-signal-red)' }}>Komisi Pending</span>
          <span className="text-total block mt-1" style={{ fontSize: '24px', color: 'var(--color-signal-red)' }}>
            Rp {totalPendingFiltered.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Commission Data Table */}
      <div className="card bg-white overflow-hidden p-0" style={{ border: '1px solid var(--color-line)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Nama Warung</th>
                <th>Total Penjualan</th>
                <th>Tarif Komisi</th>
                <th>Komisi Owed</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-meta">
                    Tidak ada laporan komisi yang sesuai dengan filter ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="text-numeral" style={{ fontWeight: 'bold' }}>
                      {formatPeriodLabel(r.period)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.store_name}</td>
                    <td className="text-numeral">Rp {r.total_sales.toLocaleString('id-ID')}</td>
                    <td className="text-numeral">{r.rate_applied}%</td>
                    <td className="text-numeral" style={{ fontWeight: 'bold', color: r.collected === 0 ? 'var(--color-signal-red)' : 'var(--color-warung-green)' }}>
                      Rp {r.amount_owed.toLocaleString('id-ID')}
                    </td>
                    <td>
                      <span className={`badge ${r.collected === 1 ? 'badge--green' : 'badge--marigold'}`}>
                        {r.collected === 1 ? 'Lunas (Diterima)' : 'Belum Ditagih (Pending)'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleCollected(r)}
                        className={`btn ${r.collected === 1 ? 'btn-secondary' : 'btn-primary'} btn--sm`}
                      >
                        {r.collected === 1 ? 'Tandai Belum Lunas' : 'Tandai Lunas'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
