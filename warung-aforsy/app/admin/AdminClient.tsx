'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { addWarungAction, editWarungAction, toggleWarungActiveAction } from './actions';
import CloudinaryUploadWidget from '@/components/CloudinaryUploadWidget';

interface Store {
  id: number;
  name: string;
  slug: string;
  address: string;
  qr_image_url: string;
  commission_rate: number;
  active: number;
  total_sales: number;
  amount_owed: number;
}

interface AdminClientProps {
  stores: Store[];
}

export default function AdminClient({ stores }: AdminClientProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Add form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [rate, setRate] = useState('1.0');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPin, setOwnerPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overall dashboard stats
  const totalStores = stores.length;
  const activeStores = stores.filter((s) => s.active === 1).length;
  const totalSalesAllTime = stores.reduce((acc, curr) => acc + (curr.total_sales || 0), 0);
  const totalCommissionOwed = stores.reduce((acc, curr) => acc + (curr.amount_owed || 0), 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const commissionRate = parseFloat(rate) || 0;
    const res = await addWarungAction(name, address, qrUrl, commissionRate, ownerName, ownerPin);

    if (res.success) {
      setIsAddOpen(false);
      setName('');
      setAddress('');
      setQrUrl('');
      setRate('1.0');
      setOwnerName('');
      setOwnerPin('');
      toast.success('Warung berhasil didaftarkan!');
    } else {
      setError(res.error || 'Gagal menambahkan warung.');
    }
    setLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setLoading(true);
    setError(null);

    const commissionRate = parseFloat(rate) || 0;
    const res = await editWarungAction(editingStore.id, name, address, qrUrl, commissionRate);

    if (res.success) {
      setEditingStore(null);
      setName('');
      setAddress('');
      setQrUrl('');
      setRate('1.0');
      toast.success('Perubahan warung disimpan!');
    } else {
      setError(res.error || 'Gagal mengubah warung.');
    }
    setLoading(false);
  };

  const startEdit = (s: Store) => {
    setEditingStore(s);
    setName(s.name);
    setAddress(s.address);
    setQrUrl(s.qr_image_url);
    setRate(s.commission_rate.toString());
    setError(null);
  };

  const handleToggleActive = async (s: Store) => {
    await toggleWarungActiveAction(s.id, s.active);
  };

  const handleCopyLink = (s: Store) => {
    const url = `${window.location.origin}/store/${s.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(`Link PWA ${s.name} berhasil disalin!`);
    }).catch(() => {
      toast.error('Gagal menyalin link.');
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title & Onboarding Button */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-heading" style={{ fontSize: '26px' }}>Kelola Warung</h1>
          <p className="text-meta">Daftar warung kelontong mitra platform Warung Aforsy</p>
        </div>
        
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          + Daftarkan Warung Baru
        </button>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card bg-white p-4">
          <span className="text-meta block">Total Toko Mitra</span>
          <span className="text-total block mt-1" style={{ fontSize: '28px', color: 'var(--color-warung-green)' }}>
            {totalStores} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-muted-ink)' }}>mitra</span>
          </span>
          <span className="text-meta" style={{ fontSize: '11px' }}>Aktif: {activeStores} toko</span>
        </div>

        <div className="card bg-white p-4">
          <span className="text-meta block">Total Penjualan Mitra (All-time)</span>
          <span className="text-total block mt-1" style={{ fontSize: '28px' }}>
            Rp {totalSalesAllTime.toLocaleString('id-ID')}
          </span>
          <span className="text-meta" style={{ fontSize: '11px' }}>Terhitung dari transaksi terdaftar</span>
        </div>

        <div className="card bg-white p-4">
          <span className="text-meta block">Total Estimasi Komisi Kebutuhan</span>
          <span className="text-total block mt-1" style={{ fontSize: '28px', color: 'var(--color-marigold)' }}>
            Rp {totalCommissionOwed.toLocaleString('id-ID')}
          </span>
          <span className="text-meta" style={{ fontSize: '11px' }}>Akumulasi tagihan komisi belum dibayar</span>
        </div>
      </div>

      {/* Stores Data Table */}
      <div className="card bg-white overflow-hidden p-0" style={{ border: '1px solid var(--color-line)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama Warung</th>
                <th>Alamat</th>
                <th>Komisi %</th>
                <th>Status</th>
                <th>Total Penjualan</th>
                <th>Estimasi Owed</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                    <td colSpan={7} className="text-center py-6 text-meta">
                    Belum ada warung yang didaftarkan. Klik tombol &quot;+ Daftarkan Warung Baru&quot;.
                  </td>
                </tr>
              ) : (
                stores.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <a
                          href={`/store/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-meta"
                          style={{ textDecoration: 'underline', color: 'var(--color-warung-green)' }}
                        >
                          Buka Kasir PWA &rarr;
                        </a>
                      </div>
                    </td>
                    <td className="text-meta">{s.address || '-'}</td>
                    <td className="text-numeral">{s.commission_rate}%</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`badge ${s.active === 1 ? 'badge--green' : 'badge--red'}`}
                        style={{ border: 'none', cursor: 'pointer', padding: '4px 10px' }}
                      >
                        {s.active === 1 ? 'Aktif' : 'Non-aktif'}
                      </button>
                    </td>
                    <td className="text-numeral">Rp {(s.total_sales || 0).toLocaleString('id-ID')}</td>
                    <td className="text-numeral" style={{ fontWeight: 'bold', color: s.amount_owed > 0 ? 'var(--color-signal-red)' : 'inherit' }}>
                      Rp {(s.amount_owed || 0).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn--sm"
                          onClick={() => handleCopyLink(s)}
                          style={{ fontSize: '11px' }}
                        >
                          Salin Link
                        </button>
                        <button className="btn btn-secondary btn--sm" onClick={() => startEdit(s)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard New Warung Modal */}
      {isAddOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsAddOpen(false)}>
          <form
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddSubmit}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-4">Daftarkan Warung Baru</h3>

            {error && <div className="text-red text-meta text-center mb-3">{error}</div>}

            <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="admin-form__group">
                <label className="admin-form__label">Nama Warung *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Warung Sejahtera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Tarif Komisi (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="Contoh: 1.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group" style={{ gridColumn: 'span 2' }}>
                <label className="admin-form__label">Alamat Warung</label>
                <input
                  type="text"
                  placeholder="Masukkan alamat lengkap toko"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group" style={{ gridColumn: 'span 2' }}>
                <label className="admin-form__label">Foto QRIS Toko</label>
                {qrUrl ? (
                  <div className="flex flex-col gap-2">
                    <div style={{ width: '120px', height: '120px', border: '1px solid var(--color-line)', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <button type="button" className="btn btn-ghost btn--sm" onClick={() => setQrUrl('')} style={{ padding: 0, minHeight: 'auto', alignSelf: 'flex-start' }}>
                      Hapus &amp; Upload Ulang
                    </button>
                  </div>
                ) : (
                  <CloudinaryUploadWidget onUpload={(url) => setQrUrl(url)} buttonText="Upload Foto QRIS" />
                )}
              </div>

              <div className="divider" style={{ gridColumn: 'span 2', margin: 'var(--space-2) 0' }}></div>

              <h4 style={{ gridColumn: 'span 2', margin: 0, fontWeight: 700 }}>Akun Pemilik Pertama (First Owner)</h4>

              <div className="admin-form__group">
                <label className="admin-form__label">Nama Pemilik *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Slamet"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">PIN Login Pemilik *</label>
                <input
                  type="text"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="6 Digit PIN pemilik"
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddOpen(false)}
                disabled={loading}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Mendaftarkan...' : 'Daftarkan Warung'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Store Modal */}
      {editingStore && (
        <div className="overlay overlay-enter" onClick={() => setEditingStore(null)}>
          <form
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEditSubmit}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-4">Edit Warung</h3>

            {error && <div className="text-red text-meta text-center mb-3">{error}</div>}

            <div className="stack stack--3">
              <div className="admin-form__group">
                <label className="admin-form__label">Nama Warung *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Tarif Komisi (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Alamat Warung</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input"
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Foto QRIS Toko</label>
                {qrUrl ? (
                  <div className="flex flex-col gap-2">
                    <div style={{ width: '120px', height: '120px', border: '1px solid var(--color-line)', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <button type="button" className="btn btn-ghost btn--sm" onClick={() => setQrUrl('')} style={{ padding: 0, minHeight: 'auto', alignSelf: 'flex-start' }}>
                      Hapus &amp; Upload Ulang
                    </button>
                  </div>
                ) : (
                  <CloudinaryUploadWidget onUpload={(url) => setQrUrl(url)} buttonText="Upload Foto QRIS" />
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingStore(null)}
                disabled={loading}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
