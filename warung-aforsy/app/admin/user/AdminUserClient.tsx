'use client';

import { useState } from 'react';
import { addUserAction, editUserAction, resetPinAction, deleteUserAction } from '../actions';

interface Person {
  id: number;
  store_id: number;
  store_name: string;
  name: string;
  is_owner: number;
}

interface Store {
  id: number;
  name: string;
}

interface AdminUserClientProps {
  persons: Person[];
  stores: Store[];
}

export default function AdminUserClient({ persons, stores }: AdminUserClientProps) {
  const [filterStore, setFilterStore] = useState<number | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [resetPinPerson, setResetPinPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add form state
  const [addStoreId, setAddStoreId] = useState<number>(stores[0]?.id || 0);
  const [addName, setAddName] = useState('');
  const [addPin, setAddPin] = useState('');
  const [addIsOwner, setAddIsOwner] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIsOwner, setEditIsOwner] = useState(false);

  // Reset PIN form state
  const [newPin, setNewPin] = useState('');

  const filtered = persons.filter((p) =>
    filterStore === 'all' || p.store_id === filterStore
  );

  const handleAdd = async () => {
    setLoading(true);
    setError('');
    const res = await addUserAction(addStoreId, addName, addPin, addIsOwner);
    setLoading(false);
    if (res.success) {
      setShowAddModal(false);
      setAddName('');
      setAddPin('');
      setAddIsOwner(false);
    } else {
      setError(res.error || 'Gagal menambahkan user.');
    }
  };

  const handleEdit = async () => {
    if (!editPerson) return;
    setLoading(true);
    setError('');
    const res = await editUserAction(editPerson.id, editName, editIsOwner);
    setLoading(false);
    if (res.success) {
      setEditPerson(null);
    } else {
      setError(res.error || 'Gagal mengubah user.');
    }
  };

  const handleResetPin = async () => {
    if (!resetPinPerson) return;
    setLoading(true);
    setError('');
    const res = await resetPinAction(resetPinPerson.id, newPin);
    setLoading(false);
    if (res.success) {
      setResetPinPerson(null);
      setNewPin('');
    } else {
      setError(res.error || 'Gagal reset PIN.');
    }
  };

  const handleDelete = async (person: Person) => {
    if (!confirm(`Hapus user "${person.name}"?`)) return;
    setLoading(true);
    const res = await deleteUserAction(person.id);
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Gagal menghapus user.');
    }
  };

  const openEdit = (p: Person) => {
    setEditPerson(p);
    setEditName(p.name);
    setEditIsOwner(p.is_owner === 1);
    setError('');
  };

  const openResetPin = (p: Person) => {
    setResetPinPerson(p);
    setNewPin('');
    setError('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading" style={{ fontSize: '26px' }}>Kelola User</h1>
          <p className="text-meta">Kelola pemilik dan karyawan di setiap warung</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setError(''); }}
          className="btn btn-primary btn--sm"
        >
          + Tambah User
        </button>
      </div>

      {/* Filter */}
      <div className="card bg-white border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-meta" style={{ fontSize: '11px' }}>Filter Warung</label>
          <select
            value={filterStore === 'all' ? 'all' : String(filterStore)}
            onChange={(e) => setFilterStore(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="input"
            style={{ minHeight: '40px', padding: 'var(--space-2)', maxWidth: '300px' }}
          >
            <option value="all">Semua Warung</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="card bg-white overflow-hidden p-0" style={{ border: '1px solid var(--color-line)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Warung</th>
                <th>Akses</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-meta">
                    Tidak ada data user.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.store_name}</td>
                    <td>
                      <span className={`badge ${p.is_owner === 1 ? 'badge--green' : 'badge--marigold'}`}>
                        {p.is_owner === 1 ? 'Pemilik' : 'Kasir'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="btn btn-secondary btn--sm"
                          style={{ fontSize: '11px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openResetPin(p)}
                          className="btn btn-secondary btn--sm"
                          style={{ fontSize: '11px' }}
                        >
                          Reset PIN
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="btn btn--sm"
                          style={{ fontSize: '11px', color: 'var(--color-signal-red)' }}
                        >
                          Hapus
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="overlay overlay-enter" onClick={() => setShowAddModal(false)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-5)' }}
          >
            <h3 className="text-heading mb-4">Tambah User Baru</h3>
            {error && <div className="badge badge--red mb-3" style={{ width: '100%', textAlign: 'center' }}>{error}</div>}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontSize: '11px' }}>Warung *</label>
                <select
                  value={addStoreId}
                  onChange={(e) => setAddStoreId(Number(e.target.value))}
                  className="input"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontSize: '11px' }}>Nama *</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="input"
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontSize: '11px' }}>PIN (6 digit) *</label>
                <input
                  value={addPin}
                  onChange={(e) => setAddPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addIsOwner}
                  onChange={(e) => setAddIsOwner(e.target.checked)}
                  id="add-owner"
                />
                <label htmlFor="add-owner" className="text-meta" style={{ fontSize: '12px', cursor: 'pointer' }}>
                  Jadikan Pemilik (bisa reset PIN karyawan)
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn--sm" style={{ flex: 1 }}>
                  Batal
                </button>
                <button onClick={handleAdd} className="btn btn-primary btn--sm" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Proses...' : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editPerson && (
        <div className="overlay overlay-enter" onClick={() => setEditPerson(null)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-5)' }}
          >
            <h3 className="text-heading mb-4">Edit User</h3>
            {error && <div className="badge badge--red mb-3" style={{ width: '100%', textAlign: 'center' }}>{error}</div>}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontSize: '11px' }}>Nama</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editIsOwner}
                  onChange={(e) => setEditIsOwner(e.target.checked)}
                  id="edit-owner"
                />
                <label htmlFor="edit-owner" className="text-meta" style={{ fontSize: '12px', cursor: 'pointer' }}>
                  Jadikan Pemilik
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditPerson(null)} className="btn btn-ghost btn--sm" style={{ flex: 1 }}>
                  Batal
                </button>
                <button onClick={handleEdit} className="btn btn-primary btn--sm" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Proses...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetPinPerson && (
        <div className="overlay overlay-enter" onClick={() => setResetPinPerson(null)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-5)' }}
          >
            <h3 className="text-heading mb-2">Reset PIN</h3>
            <p className="text-meta mb-4">PIN baru untuk <strong>{resetPinPerson.name}</strong> ({resetPinPerson.store_name})</p>
            {error && <div className="badge badge--red mb-3" style={{ width: '100%', textAlign: 'center' }}>{error}</div>}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontSize: '11px' }}>PIN Baru (6 digit) *</label>
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setResetPinPerson(null)} className="btn btn-ghost btn--sm" style={{ flex: 1 }}>
                  Batal
                </button>
                <button onClick={handleResetPin} className="btn btn-primary btn--sm" style={{ flex: 1 }} disabled={loading || newPin.length !== 6}>
                  {loading ? 'Proses...' : 'Reset PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
