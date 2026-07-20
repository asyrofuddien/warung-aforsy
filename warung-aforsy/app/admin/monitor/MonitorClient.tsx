'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

interface Activity {
  id: number;
  store_id: number | null;
  person_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  timestamp: string;
  store_name: string | null;
  person_name: string | null;
}

interface Store {
  id: number;
  name: string;
}

interface CashierStat {
  person_id: number;
  person_name: string;
  store_name: string;
  total_transactions: number;
  total_revenue: number;
  avg_items: number;
}

interface HourlyStat {
  hour: number;
  count: number;
}

interface DailyTotal {
  date: string;
  count: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  total_sold: number;
  revenue: number;
}

interface MemberStats {
  total_members: number;
  members_with_tx: number;
  total_member_revenue: number;
  total_non_member_revenue: number;
}

interface MonitorClientProps {
  stores: Store[];
  initialActivities: Activity[];
  cashierStats: CashierStat[];
  hourlyStats: HourlyStat[];
  dailyTotals: DailyTotal[];
  topProducts: TopProduct[];
  memberStats: MemberStats;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  login_failed: 'Login Gagal',
  search_member: 'Cari Member',
  create_transaction: 'Transaksi Baru',
  create_member: 'Member Baru',
  update_member: 'Update Member',
  delete_member: 'Hapus Member',
  create_product: 'Produk Baru',
  update_product: 'Update Produk',
  delete_product: 'Hapus Produk',
  toggle_stock: 'Ubah Stok',
  csv_import: 'Import CSV',
  create_staff: 'Tambah Karyawan',
  delete_staff: 'Hapus Karyawan',
  create_category: 'Tambah Kategori',
  delete_category: 'Hapus Kategori',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'var(--color-warung-green)',
  login_failed: 'var(--color-signal-red)',
  search_member: '#6b7280',
  create_transaction: 'var(--color-warung-green)',
  create_member: '#3b82f6',
  update_member: '#f59e0b',
  delete_member: 'var(--color-signal-red)',
  create_product: '#3b82f6',
  update_product: '#f59e0b',
  delete_product: 'var(--color-signal-red)',
  toggle_stock: '#8b5cf6',
  csv_import: '#06b6d4',
  create_staff: '#3b82f6',
  delete_staff: 'var(--color-signal-red)',
  create_category: '#3b82f6',
  delete_category: 'var(--color-signal-red)',
};

const ITEMS_PER_PAGE = 10;

function JsonBlock({ label, data }: { label: string; data: string }) {
  const [copied, setCopied] = useState(false);

  let formatted = data;
  try {
    formatted = JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    // keep original
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      toast.success('Berhasil dicopy!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal copy');
    }
  };

  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-line)' }}>
      <div
        className="flex justify-between items-center px-3 py-1"
        style={{ background: '#1e1e2e', borderBottom: '1px solid #313244' }}
      >
        <span style={{ color: '#a6adc8', fontSize: '11px', fontWeight: 600 }}>{label}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? '#a6e3a1' : '#a6adc8',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#313244')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          background: '#11111b',
          color: '#cdd6f4',
          padding: '12px',
          margin: 0,
          fontSize: '11px',
          lineHeight: '1.5',
          overflowX: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        {formatted}
      </pre>
    </div>
  );
}

export default function MonitorClient({
  stores,
  initialActivities,
  cashierStats,
  hourlyStats,
  dailyTotals,
  topProducts,
  memberStats,
}: MonitorClientProps) {
  const [filterStore, setFilterStore] = useState<number | 'all'>('all');
  const [filterAction, setFilterAction] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'activity' | 'cashier' | 'sales' | 'member'>('activity');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const uniqueActions = useMemo(() => Array.from(new Set(initialActivities.map((a) => a.action))).sort(), [initialActivities]);

  const filteredActivities = useMemo(() => {
    return initialActivities.filter((a) => {
      if (filterStore !== 'all' && a.store_id !== filterStore) return false;
      if (filterAction !== 'all' && a.action !== filterAction) return false;
      return true;
    });
  }, [initialActivities, filterStore, filterAction]);

  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const paginatedActivities = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredActivities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredActivities, page]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalTransactions = dailyTotals.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = dailyTotals.reduce((sum, d) => sum + d.revenue, 0);
  const maxHourlyCount = Math.max(...hourlyStats.map((h) => h.count), 1);

  const formatAction = (action: string) => ACTION_LABELS[action] || action;
  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const parseDetails = (json: string | null): { request?: Record<string, unknown>; response?: Record<string, unknown>; details?: Record<string, unknown> } | null => {
    if (!json) return null;
    try {
      return JSON.parse(json) as { request?: Record<string, unknown>; response?: Record<string, unknown>; details?: Record<string, unknown> };
    } catch {
      return null;
    }
  };

  const tabs = [
    { key: 'activity' as const, label: 'Activity Feed' },
    { key: 'cashier' as const, label: 'Kasir' },
    { key: 'sales' as const, label: 'Penjualan' },
    { key: 'member' as const, label: 'Member' },
  ];

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-heading mb-4">Monitor</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4" style={{ overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn--sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== ACTIVITY FEED ========== */}
      {activeTab === 'activity' && (
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <select
              value={filterStore}
              onChange={(e) => { setFilterStore(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
              className="input"
              style={{ minHeight: '36px', fontSize: '13px' }}
            >
              <option value="all">Semua Toko</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="input"
              style={{ minHeight: '36px', fontSize: '13px' }}
            >
              <option value="all">Semua Aksi</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{formatAction(a)}</option>
              ))}
            </select>
            <span className="text-meta self-center">{filteredActivities.length} log</span>
          </div>

          {/* Activity List */}
          <div className="stack stack--2">
            {paginatedActivities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Belum ada aktivitas</div>
                <div className="empty-state__text">Aktivitas akan tercatat saat ada transaksi, login, atau perubahan data.</div>
              </div>
            ) : (
              paginatedActivities.map((a) => {
                const isExpanded = expandedIds.has(a.id);
                const parsed = parseDetails(a.details);
                const hasDetails = !!(parsed && (parsed.request || parsed.response || parsed.details));

                return (
                  <div
                    key={a.id}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}
                  >
                    <div
                      className="flex items-start gap-3 p-3"
                      style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                      onClick={() => hasDetails && toggleExpand(a.id)}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: ACTION_COLORS[a.action] || '#6b7280',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body" style={{ fontWeight: 600, fontSize: '13px' }}>
                            {formatAction(a.action)}
                          </span>
                          {a.entity_type && a.entity_id && (
                            <span className="text-meta" style={{ fontSize: '11px' }}>
                              {a.entity_type}#{a.entity_id}
                            </span>
                          )}
                          {hasDetails && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                color: 'var(--color-muted-ink)',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          )}
                        </div>
                        <div className="text-meta" style={{ fontSize: '11px', marginTop: '2px' }}>
                          {a.person_name || 'System'} {a.store_name && `di ${a.store_name}`}
                        </div>
                      </div>
                      <span className="text-meta" style={{ fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatTimestamp(a.timestamp)}
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && parsed && (
                      <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--color-line)' }}>
                        {parsed.request && (
                          <JsonBlock label="Request" data={JSON.stringify(parsed.request)} />
                        )}
                        {parsed.response && (
                          <JsonBlock label="Response" data={JSON.stringify(parsed.response)} />
                        )}
                        {!parsed.request && !parsed.response && parsed.details && (
                          <JsonBlock label="Details" data={JSON.stringify(parsed.details)} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn--sm"
                style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
              >
                &lsaquo;
              </button>
              <span className="text-meta" style={{ fontSize: '13px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn--sm"
                style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
              >
                &rsaquo;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== CASHIER STATS ========== */}
      {activeTab === 'cashier' && (
        <div>
          <div className="stack stack--3">
            {cashierStats.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Belum ada data kasir</div>
                <div className="empty-state__text">Data akan muncul setelah ada transaksi.</div>
              </div>
            ) : (
              cashierStats.map((cs) => (
                <div
                  key={`${cs.person_id}-${cs.store_name}`}
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-body" style={{ fontWeight: 600 }}>{cs.person_name}</span>
                      <span className="text-meta" style={{ fontSize: '12px', marginLeft: '8px' }}>{cs.store_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-meta" style={{ fontSize: '11px' }}>Transaksi</div>
                      <div className="text-numeral" style={{ fontSize: '18px', fontWeight: 700 }}>{cs.total_transactions}</div>
                    </div>
                    <div>
                      <div className="text-meta" style={{ fontSize: '11px' }}>Total Omset</div>
                      <div className="text-numeral" style={{ fontSize: '18px', fontWeight: 700 }}>Rp {cs.total_revenue.toLocaleString('id-ID')}</div>
                    </div>
                    <div>
                      <div className="text-meta" style={{ fontSize: '11px' }}>Rata-rata Item</div>
                      <div className="text-numeral" style={{ fontSize: '18px', fontWeight: 700 }}>{cs.avg_items}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== SALES PATTERNS ========== */}
      {activeTab === 'sales' && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Total Transaksi (30 hari)</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>{totalTransactions}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Total Omset (30 hari)</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>Rp {totalRevenue.toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Hourly Heatmap */}
          <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
            <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '12px' }}>Aktivitas per Jam</h3>
            <div className="flex gap-1 items-end" style={{ height: '100px' }}>
              {Array.from({ length: 24 }, (_, i) => {
                const stat = hourlyStats.find((h) => h.hour === i);
                const count = stat?.count || 0;
                const height = maxHourlyCount > 0 ? (count / maxHourlyCount) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col items-center flex-1" style={{ height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          minHeight: count > 0 ? '4px' : '0',
                          background: 'var(--color-warung-green)',
                          borderRadius: '2px',
                          opacity: 0.7 + (count / maxHourlyCount) * 0.3,
                        }}
                        title={`${i}:00 - ${count} transaksi`}
                      />
                    </div>
                    <span className="text-meta" style={{ fontSize: '8px', marginTop: '2px' }}>{i}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Totals */}
          <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
            <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '12px' }}>Transaksi Harian</h3>
            <div className="stack stack--2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {dailyTotals.length === 0 ? (
                <div className="text-meta text-center py-3">Belum ada data</div>
              ) : (
                dailyTotals.map((d) => (
                  <div key={d.date} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--color-line)' }}>
                    <span className="text-body" style={{ fontSize: '13px' }}>{d.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-meta" style={{ fontSize: '12px' }}>{d.count} tx</span>
                      <span className="text-numeral" style={{ fontSize: '13px', fontWeight: 600 }}>Rp {d.revenue.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
            <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '12px' }}>Produk Terlaris</h3>
            <div className="stack stack--2">
              {topProducts.length === 0 ? (
                <div className="text-meta text-center py-3">Belum ada data</div>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--color-line)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-warung-green)', minWidth: '20px' }}>
                        {i + 1}.
                      </span>
                      <span className="text-body" style={{ fontSize: '13px' }}>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-meta" style={{ fontSize: '12px' }}>{p.total_sold} pcs</span>
                      <span className="text-numeral" style={{ fontSize: '13px', fontWeight: 600 }}>Rp {p.revenue.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MEMBER STATS ========== */}
      {activeTab === 'member' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Total Member</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>{memberStats.total_members}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Member Aktif (pernah transaksi)</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>{memberStats.members_with_tx}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Omset Member</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>Rp {memberStats.total_member_revenue.toLocaleString('id-ID')}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <div className="text-meta" style={{ fontSize: '11px' }}>Omset Non-Member</div>
              <div className="text-numeral" style={{ fontSize: '20px', fontWeight: 700 }}>Rp {memberStats.total_non_member_revenue.toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Member vs Non-Member Bar */}
          {(memberStats.total_member_revenue + memberStats.total_non_member_revenue) > 0 && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
              <h3 className="text-body" style={{ fontWeight: 600, marginBottom: '12px' }}>Komposisi Omset</h3>
              <div style={{ height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
                <div
                  style={{
                    width: `${(memberStats.total_member_revenue / (memberStats.total_member_revenue + memberStats.total_non_member_revenue)) * 100}%`,
                    background: 'var(--color-warung-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: memberStats.total_member_revenue > 0 ? '40px' : '0',
                  }}
                >
                  Member
                </div>
                <div
                  style={{
                    width: `${(memberStats.total_non_member_revenue / (memberStats.total_member_revenue + memberStats.total_non_member_revenue)) * 100}%`,
                    background: '#d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: memberStats.total_non_member_revenue > 0 ? '40px' : '0',
                  }}
                >
                  Non-Member
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-meta" style={{ fontSize: '11px' }}>
                  {((memberStats.total_member_revenue / (memberStats.total_member_revenue + memberStats.total_non_member_revenue)) * 100).toFixed(1)}% Member
                </span>
                <span className="text-meta" style={{ fontSize: '11px' }}>
                  {((memberStats.total_non_member_revenue / (memberStats.total_member_revenue + memberStats.total_non_member_revenue)) * 100).toFixed(1)}% Non-Member
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
