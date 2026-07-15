'use client';

import { useState } from 'react';
import { User, Phone, Edit3, Trash2, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateMemberAction,
  deleteMemberAction,
  getMemberTransactionsAction,
} from '../actions';

interface Member {
  id: number;
  phone: string;
  name: string;
  created_at: string;
  totalTransactions: number;
  totalSpent: number;
}

interface MemberTx {
  id: number;
  timestamp: string;
  total: number;
  payment_method: string;
}

interface MemberClientProps {
  storeId: number;
  storeName: string;
  initialMembers: Member[];
  nonMemberStats: { count: number; total: number };
}

export default function MemberClient({
  storeId,
  initialMembers,
  nonMemberStats,
}: MemberClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [memberTxs, setMemberTxs] = useState<MemberTx[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.phone.includes(q);
  });

  const totalMembers = members.length;
  const totalMemberSpent = members.reduce((a, m) => a + m.totalSpent, 0);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      }).replace(/\//g, '-') + ' WIB';
    } catch { return iso; }
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    setLoading(true);
    const result = await updateMemberAction(storeId, selectedMember.id, editName, editPhone);
    if (result.success) {
      setMembers((prev) =>
        prev.map((m) => m.id === selectedMember.id ? { ...m, name: editName.trim(), phone: editPhone.trim() } : m)
      );
      toast.success('Member berhasil diupdate!');
      setIsEditOpen(false);
    } else {
      toast.error(result.error || 'Gagal update member.');
    }
    setLoading(false);
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Hapus member "${member.name || member.phone}"? Transaksi terkait tidak akan dihapus.`)) return;
    const result = await deleteMemberAction(storeId, member.id);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Member berhasil dihapus.');
    } else {
      toast.error(result.error || 'Gagal menghapus member.');
    }
  };

  const handleViewTx = async (member: Member) => {
    setSelectedMember(member);
    const result = await getMemberTransactionsAction(storeId, member.id);
    if (result.success) {
      setMemberTxs(result.transactions);
      setIsTxOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: '100px' }}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(15, 122, 92, 0.08)', border: '1px solid rgba(15, 122, 92, 0.2)' }}>
          <div className="text-numeral" style={{ fontSize: '22px', color: 'var(--color-warung-green)', fontWeight: 700 }}>{totalMembers}</div>
          <div className="text-meta" style={{ fontSize: '11px', color: 'var(--color-warung-green)' }}>Total Member</div>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
          <div className="text-numeral" style={{ fontSize: '22px', fontWeight: 700 }}>{formatCurrency(totalMemberSpent)}</div>
          <div className="text-meta" style={{ fontSize: '11px' }}>Total Belanja Member</div>
        </div>
      </div>

      {/* Non-member stats */}
      <div className="p-3 rounded-lg" style={{ background: 'rgba(232, 163, 61, 0.06)', border: '1px solid rgba(232, 163, 61, 0.2)' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-meta" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-marigold)' }}>Non-Member</div>
            <div className="text-meta" style={{ fontSize: '11px' }}>{nonMemberStats.count} transaksi</div>
          </div>
          <div className="text-numeral" style={{ fontWeight: 700 }}>{formatCurrency(nonMemberStats.total)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Cari member by nama atau HP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input--search"
        />
        <svg
          className="absolute"
          style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--color-muted-ink)', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Member List */}
      <div className="stack stack--2">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <User className="empty-state__icon" />
            <div className="empty-state__title">Belum Ada Member</div>
            <div className="empty-state__text">Member akan otomatis terdaftar saat transaksi dengan nomor HP.</div>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="p-3 border rounded-md bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: '40px', height: '40px', background: 'rgba(15, 122, 92, 0.1)', flexShrink: 0 }}
                  >
                    <User size={18} style={{ color: 'var(--color-warung-green)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-body truncate" style={{ fontWeight: 600, fontSize: '14px' }}>
                      {m.name || '(Tanpa Nama)'}
                    </div>
                    <div className="text-meta flex items-center gap-1" style={{ fontSize: '12px' }}>
                      <Phone size={11} />
                      {m.phone}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleViewTx(m)}
                  className="btn btn-ghost btn--sm"
                  style={{ padding: '4px', minHeight: 'auto' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--color-line)' }}>
                <div className="flex gap-3">
                  <span className="text-meta" style={{ fontSize: '11px' }}>{m.totalTransactions} transaksi</span>
                  <span className="text-numeral" style={{ fontSize: '11px', fontWeight: 600 }}>{formatCurrency(m.totalSpent)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(m)} className="btn btn-ghost btn--sm" style={{ padding: '4px', minHeight: 'auto' }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => handleDelete(m)} className="btn btn-ghost btn--sm" style={{ padding: '4px', minHeight: 'auto', color: 'var(--color-signal-red)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Member Modal */}
      {isEditOpen && selectedMember && (
        <div className="overlay overlay-enter" onClick={() => setIsEditOpen(false)}>
          <div className="modal modal-enter" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-heading">Edit Member</h3>
              <button className="btn btn-ghost btn--sm" onClick={() => setIsEditOpen(false)}>Tutup</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-meta mb-1 block" style={{ fontSize: '12px', fontWeight: 600 }}>Nama</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  placeholder="Nama member"
                />
              </div>
              <div>
                <label className="text-meta mb-1 block" style={{ fontSize: '12px', fontWeight: 600 }}>Nomor HP</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input"
                  placeholder="Nomor HP"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-secondary btn--full" onClick={() => setIsEditOpen(false)}>Batal</button>
                <button className="btn btn-primary btn--full" onClick={handleSaveEdit} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Transaction History Modal */}
      {isTxOpen && selectedMember && (
        <div className="overlay overlay-enter" onClick={() => setIsTxOpen(false)}>
          <div className="modal modal-enter" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-heading">Riwayat Member</h3>
                <span className="text-meta" style={{ fontSize: '12px' }}>{selectedMember.name || selectedMember.phone}</span>
              </div>
              <button className="btn btn-ghost btn--sm" onClick={() => setIsTxOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Member stats */}
            <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(15, 122, 92, 0.06)', border: '1px solid rgba(15, 122, 92, 0.15)' }}>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-numeral" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-warung-green)' }}>{selectedMember.totalTransactions}</div>
                  <div className="text-meta" style={{ fontSize: '11px' }}>Transaksi</div>
                </div>
                <div>
                  <div className="text-numeral" style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(selectedMember.totalSpent)}</div>
                  <div className="text-meta" style={{ fontSize: '11px' }}>Total Belanja</div>
                </div>
              </div>
            </div>

            <div className="stack stack--2" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
              {memberTxs.length === 0 ? (
                <div className="text-meta text-center py-6">Belum ada transaksi.</div>
              ) : (
                memberTxs.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 border rounded-md bg-white">
                    <div>
                      <span className="text-numeral" style={{ fontWeight: 600, fontSize: '13px' }}>Nota #{tx.id}</span>
                      <div className="text-meta" style={{ fontSize: '11px' }}>{formatDate(tx.timestamp)}</div>
                    </div>
                    <span className={`badge ${tx.payment_method === 'qr' ? 'badge--green' : 'badge--marigold'}`} style={{ fontSize: '10px' }}>
                      {formatCurrency(tx.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
