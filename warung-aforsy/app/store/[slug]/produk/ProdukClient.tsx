'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Camera, Upload, Download, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
  barcodeLookupAction,
  parseCsvAction,
  importCsvAction,
  type ParsedCsvRow,
  type CsvProductRow,
} from './actions';
import {
  toggleStockAction,
  addProductAction,
  editProductAction,
  deleteProductAction,
  addStaffAction,
  resetStaffPinAction,
  deleteStaffAction,
  addCategoryAction,
  deleteCategoryAction,
} from './actions';

interface Product {
  id: number;
  category_id: number | null;
  name: string;
  price: number;
  cost_price: number;
  barcode: string;
  in_stock: number;
}

interface Category {
  id: number;
  name: string;
}

interface Person {
  id: number;
  name: string;
  is_owner: number;
}

interface ProdukClientProps {
  storeId: number;
  products: Product[];
  categories: Category[];
  staff: Person[];
  isOwner: boolean;
}

export default function ProdukClient({ storeId, products, categories, staff, isOwner }: ProdukClientProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  
  // Product modals / forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState<number | null>(null);

  // Staff modals / forms
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffIsOwner, setStaffIsOwner] = useState(false);

  // Reset PIN modal
  const [resettingStaff, setResettingStaff] = useState<Person | null>(null);
  const [newStaffPin, setNewStaffPin] = useState('');

  // Category management
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Barcode scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // CSV Import
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([]);
  const [csvActions, setCsvActions] = useState<{ rowName: string; action: 'import' | 'replace' | 'skip' }[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setIsScannerOpen(false);
    setIsLookupLoading(true);
    setProdBarcode(barcode);

    try {
      const result = await barcodeLookupAction(barcode);
      if (result.found) {
        setProdName(result.name);
        toast.success(`Produk ditemukan: ${result.name}`);
      } else {
        toast.warning(`Barcode ${barcode} tidak ditemukan. Silakan isi nama produk manual.`, {
          duration: 6000,
        });
      }
    } catch {
      toast.error('Gagal menghubungi server. Silakan coba lagi.', { duration: 4000 });
    } finally {
      setIsLookupLoading(false);
    }
  }, []);

  // ---------- CSV IMPORT FUNCTIONS ----------

  const downloadCsvTemplate = () => {
    const header = 'nama,harga_jual,harga_modal,barcode,kategori';
    const example = 'Indomie Goreng,3500,2800,8999999002041,Mie Instan';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-produk-warungku.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingCsv(true);
    try {
      const content = await file.text();
      const result = await parseCsvAction(storeId, content);
      if (result.success && result.rows.length > 0) {
        setCsvRows(result.rows);
        setCsvActions(
          result.rows.map((row) => ({
            rowName: row.name,
            action: row.duplicateOf ? ('skip' as const) : ('import' as const),
          }))
        );
      } else {
        toast.error(result.error || 'Gagal parse CSV.');
      }
    } catch {
      toast.error('Gagal membaca file CSV.');
    }
    setIsParsingCsv(false);
    if (csvFileRef.current) csvFileRef.current.value = '';
  };

  const setCsvAction = (index: number, action: 'import' | 'replace' | 'skip') => {
    setCsvActions((prev) => prev.map((a, i) => (i === index ? { ...a, action } : a)));
  };

  const handleImportCsv = async () => {
    setIsImportingCsv(true);
    try {
      const validIndices = csvRows
        .map((r, i) => (r.error ? -1 : i))
        .filter((i) => i !== -1);

      const importRows: CsvProductRow[] = validIndices.map((i) => ({
        name: csvRows[i].name,
        price: csvRows[i].price,
        cost_price: csvRows[i].cost_price,
        barcode: csvRows[i].barcode,
        category: csvRows[i].category,
      }));

      const importActions = validIndices.map((i) => csvActions[i]);
      const result = await importCsvAction(storeId, importRows, importActions);
      if (result.success) {
        toast.success(`Import selesai: ${result.imported} baru, ${result.replaced} diganti, ${result.skipped} dilewati.`);
        setIsCsvOpen(false);
        setCsvRows([]);
        setCsvActions([]);
      } else {
        toast.error(result.error || 'Gagal import.');
      }
    } catch {
      toast.error('Gagal import CSV.');
    }
    setIsImportingCsv(false);
  };

  // ---------- PRODUCT FUNCTIONS ----------
  
  const handleToggleStock = async (p: Product) => {
    await toggleStockAction(storeId, p.id, p.in_stock);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const price = parseInt(prodPrice, 10);
    const cost = parseInt(prodCost, 10) || 0;

    const res = await addProductAction(storeId, prodName, price, cost, prodBarcode, prodCategoryId);
    if (res.success) {
      setIsAddOpen(false);
      setProdName('');
      setProdPrice('');
      setProdCost('');
      setProdBarcode('');
      setProdCategoryId(null);
    } else {
      setError(res.error || 'Gagal menambahkan produk.');
    }
    setLoading(false);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);
    setError(null);

    const price = parseInt(prodPrice, 10);
    const cost = parseInt(prodCost, 10) || 0;

    const res = await editProductAction(storeId, editingProduct.id, prodName, price, cost, prodBarcode, prodCategoryId);
    if (res.success) {
      setEditingProduct(null);
      setProdName('');
      setProdPrice('');
      setProdCost('');
      setProdBarcode('');
      setProdCategoryId(null);
    } else {
      setError(res.error || 'Gagal mengubah produk.');
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    await deleteProductAction(storeId, productId);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.price.toString());
    setProdCost(p.cost_price.toString());
    setProdBarcode(p.barcode);
    setProdCategoryId(p.category_id);
    setError(null);
  };

  // ---------- STAFF FUNCTIONS ----------

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await addStaffAction(storeId, staffName, staffPin, staffIsOwner);
    if (res.success) {
      setStaffName('');
      setStaffPin('');
      setStaffIsOwner(false);
      toast.success('Karyawan berhasil ditambahkan!');
    } else {
      setError(res.error || 'Gagal menambahkan karyawan.');
    }
    setLoading(false);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStaff) return;
    setLoading(true);
    setError(null);

    const res = await resetStaffPinAction(storeId, resettingStaff.id, newStaffPin);
    if (res.success) {
      setResettingStaff(null);
      setNewStaffPin('');
      toast.success('PIN karyawan berhasil disetel ulang!');
    } else {
      setError(res.error || 'Gagal menyetel ulang PIN.');
    }
    setLoading(false);
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) return;
    setError(null);
    const res = await deleteStaffAction(storeId, staffId);
    if (!res.success) {
      toast.error(res.error);
    }
  };

  // ---------- CATEGORY FUNCTIONS ----------

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await addCategoryAction(storeId, newCatName);
    if (res.success) {
      setNewCatName('');
      toast.success('Kategori berhasil ditambahkan!');
    } else {
      setError(res.error || 'Gagal menambahkan kategori.');
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (catId: number) => {
    if (!confirm('Produk di kategori ini akan dipindahkan ke "Tanpa Kategori". Lanjutkan?')) return;
    const res = await deleteCategoryAction(storeId, catId);
    if (!res.success) {
      toast.error(res.error);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCategory = filterCategory === 'all' || p.category_id === filterCategory;
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.barcode && p.barcode.toLowerCase().includes(s));
    return matchCategory && matchSearch;
  });

  // Helper to get category name
  const getCategoryName = (catId: number | null) => {
    if (!catId) return 'Tanpa Kategori';
    return categories.find((c) => c.id === catId)?.name ?? 'Tanpa Kategori';
  };

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: '100px' }}>
      {/* Search & Add Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari produk di katalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input--search"
          />
          <svg
            className="absolute"
            style={{
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              color: 'var(--color-muted-ink)',
              pointerEvents: 'none',
            }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          + Tambah
        </button>
        <button className="btn btn-secondary" onClick={() => setIsCsvOpen(true)}>
          <Upload size={16} />
        </button>
      </div>

      {/* CSV Import hint */}
      {products.length === 0 && (
        <div className="text-meta text-center py-2" style={{ fontSize: '12px', color: 'var(--color-muted-ink)' }}>
          Punya data produk dalam file CSV?{' '}
          <button
            onClick={() => setIsCsvOpen(true)}
            style={{ color: 'var(--color-warung-green)', fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
          >
            Import CSV
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setFilterCategory('all')}
            className={`btn btn--sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', minHeight: '32px' }}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
              className={`btn btn--sm ${filterCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', minHeight: '32px' }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Owner-only buttons */}
      {isOwner && (
        <div className="flex gap-2">
          <button
            className="btn btn-secondary btn--full"
            onClick={() => setIsStaffOpen(true)}
            style={{ justifyContent: 'center' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: '18px', height: '18px' }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Karyawan
          </button>
          <button
            className="btn btn-secondary btn--full"
            onClick={() => setIsCatOpen(true)}
            style={{ justifyContent: 'center' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: '18px', height: '18px' }}
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Kategori
          </button>
        </div>
      )}

      {/* Products list catalog */}
      <div className="stack stack--3">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">Katalog Kosong</div>
            <div className="empty-state__text">Tambahkan produk baru dengan menekan tombol &quot;+ Tambah&quot;.</div>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div key={p.id} className="product-card" style={{ cursor: 'default' }}>
              <div className="product-card__info flex-1 min-w-0">
                <span className="product-card__name truncate" style={{ fontWeight: 600, fontSize: '17px' }}>
                  {p.name}
                </span>
                
                <div className="inline inline--3 mt-1">
                  <span className="product-card__price">
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                  {p.cost_price > 0 && (
                    <span className="text-meta whitespace-nowrap">
                      (Modal: Rp {p.cost_price.toLocaleString('id-ID')})
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <span className="badge badge--green" style={{ fontSize: '10px' }}>
                    {getCategoryName(p.category_id)}
                  </span>
                  {p.barcode && (
                    <span className="text-meta text-numeral">
                      {p.barcode}
                    </span>
                  )}
                </div>
              </div>

              <div className="product-card__actions flex-shrink-0">
                {/* Stock toggle button */}
                <button
                  type="button"
                  onClick={() => handleToggleStock(p)}
                  className={`stock-pill ${p.in_stock === 1 ? 'stock-pill--ada' : 'stock-pill--habis'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  {p.in_stock === 1 ? 'Ada' : 'Habis'}
                </button>

                <div className="inline inline--2 mt-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="btn btn-secondary btn--sm btn--icon"
                    style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: '16px', height: '16px' }}
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="btn btn-danger btn--sm btn--icon"
                    style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: '16px', height: '16px' }}
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      {isAddOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsAddOpen(false)}>
          <form
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddProduct}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-4">Tambah Produk Baru</h3>

            {error && <div className="text-red text-meta text-center mb-3">{error}</div>}

            <div className="stack stack--3">
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Indomie Goreng"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Harga Jual (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 3500"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Harga Modal / Beli (Rp)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Contoh: 2900"
                  value={prodCost}
                  onChange={(e) => setProdCost(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Barcode / SKU</label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="btn btn-secondary btn--full"
                  disabled={isLookupLoading}
                  style={{ justifyContent: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <Camera size={18} />
                  {isLookupLoading ? 'Mencari produk...' : 'Scan Barcode dengan Kamera'}
                </button>
                <input
                  type="text"
                  placeholder="Atau ketik manual"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  className="input"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-meta" style={{ fontWeight: 600 }}>Kategori</label>
                  <select
                    value={prodCategoryId ?? ''}
                    onChange={(e) => setProdCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                className="btn btn-secondary btn--full"
                onClick={() => setIsAddOpen(false)}
                disabled={loading}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn--full" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="overlay overlay-enter" onClick={() => setEditingProduct(null)}>
          <form
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEditProduct}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-4">Edit Produk</h3>

            {error && <div className="text-red text-meta text-center mb-3">{error}</div>}

            <div className="stack stack--3">
              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Nama Produk *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Harga Jual (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Harga Modal / Beli (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={prodCost}
                  onChange={(e) => setProdCost(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-meta" style={{ fontWeight: 600 }}>Barcode / SKU</label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="btn btn-secondary btn--full"
                  disabled={isLookupLoading}
                  style={{ justifyContent: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <Camera size={18} />
                  {isLookupLoading ? 'Mencari produk...' : 'Scan Barcode dengan Kamera'}
                </button>
                <input
                  type="text"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  className="input"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-meta" style={{ fontWeight: 600 }}>Kategori</label>
                  <select
                    value={prodCategoryId ?? ''}
                    onChange={(e) => setProdCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                className="btn btn-secondary btn--full"
                onClick={() => setEditingProduct(null)}
                disabled={loading}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn--full" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kelola Karyawan Modal (Staff) */}
      {isStaffOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsStaffOpen(false)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', maxHeight: '85vh' }}
          >
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-heading">Kelola Karyawan</h3>
              <button className="btn btn-ghost btn--sm" onClick={() => setIsStaffOpen(false)}>
                Tutup
              </button>
            </div>

            {/* Add Employee Form */}
            <form onSubmit={handleAddStaff} className="card bg-paper p-3 my-3">
              <span className="text-meta" style={{ fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                Tambah Karyawan / Kasir Baru
              </span>
              <div className="stack stack--2">
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="input"
                  style={{ minHeight: '40px' }}
                />
                
                <input
                  type="text"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="PIN 6-Digit (Angka saja)"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  style={{ minHeight: '40px' }}
                />

                <label className="inline inline--2 my-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffIsOwner}
                    onChange={(e) => setStaffIsOwner(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span className="text-meta" style={{ fontWeight: 600 }}>Jadikan Pemilik (Bisa reset PIN staff lain)</span>
                </label>

                <button type="submit" className="btn btn-primary btn--sm" disabled={loading}>
                  {loading ? 'Proses...' : 'Tambah Karyawan'}
                </button>
              </div>
            </form>

            {/* List Employees */}
            <span className="text-meta" style={{ fontWeight: 700, display: 'block', margin: '16px 0 8px' }}>
              Daftar Karyawan Aktif
            </span>
            <div className="stack stack--2 my-3" style={{ maxHeight: '25vh', overflowY: 'auto' }}>
              {staff.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3 border rounded-md bg-white">
                  <div>
                    <div className="text-body" style={{ fontWeight: 600 }}>{s.name}</div>
                    <span className="text-meta">
                      Akses: {s.is_owner === 1 ? 'Pemilik (Owner)' : 'Kasir'}
                    </span>
                  </div>
                  
                  <div className="inline inline--2">
                    <button
                      onClick={() => {
                        setResettingStaff(s);
                        setError(null);
                      }}
                      className="btn btn-secondary btn--sm"
                      style={{ fontSize: '12px', minHeight: '32px', padding: '0 12px' }}
                    >
                      Reset PIN
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="btn btn-danger btn--sm btn--icon"
                      style={{ minWidth: '32px', minHeight: '32px', padding: 0 }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ width: '14px', height: '14px' }}
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resettingStaff && (
        <div className="overlay overlay-enter" style={{ zIndex: 60 }} onClick={() => setResettingStaff(null)}>
          <form
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleResetPin}
            style={{ maxWidth: '420px', zIndex: 70 }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-2">Reset PIN Karyawan</h3>
            <p className="text-meta text-center mb-4">
              Menyetel ulang PIN untuk <strong>{resettingStaff.name}</strong>
            </p>

            {error && <div className="text-red text-meta text-center mb-3">{error}</div>}

            <div className="flex flex-col gap-1">
              <label className="text-meta" style={{ fontWeight: 600 }}>PIN 6-Digit Baru *</label>
              <input
                type="text"
                required
                pattern="\d{6}"
                maxLength={6}
                placeholder="Masukkan 6 angka PIN baru"
                value={newStaffPin}
                onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                className="input"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                className="btn btn-secondary btn--full"
                onClick={() => setResettingStaff(null)}
                disabled={loading}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn--full" disabled={loading}>
                {loading ? 'Memproses...' : 'Ubah PIN'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kelola Kategori Modal */}
      {isCatOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsCatOpen(false)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', maxHeight: '85vh' }}
          >
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-heading">Kelola Kategori</h3>
              <button className="btn btn-ghost btn--sm" onClick={() => setIsCatOpen(false)}>
                Tutup
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="card bg-paper p-3 my-3">
              <span className="text-meta" style={{ fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                Tambah Kategori Baru
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nama kategori"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="input"
                  style={{ minHeight: '40px', flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn--sm" disabled={loading}>
                  {loading ? '...' : 'Tambah'}
                </button>
              </div>
            </form>

            {/* List Categories */}
            <span className="text-meta" style={{ fontWeight: 700, display: 'block', margin: '16px 0 8px' }}>
              Daftar Kategori
            </span>
            <div className="stack stack--2 my-3" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
              {categories.length === 0 ? (
                <div className="text-meta text-center py-4">Belum ada kategori.</div>
              ) : (
                categories.map((cat) => {
                  const count = products.filter((p) => p.category_id === cat.id).length;
                  return (
                    <div key={cat.id} className="flex justify-between items-center p-3 border rounded-md bg-white">
                      <div>
                        <div className="text-body" style={{ fontWeight: 600 }}>{cat.name}</div>
                        <span className="text-meta">{count} produk</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="btn btn-danger btn--sm btn--icon"
                        style={{ minWidth: '32px', minHeight: '32px', padding: 0 }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ width: '14px', height: '14px' }}
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvOpen && (
        <div className="overlay overlay-enter" onClick={() => { setIsCsvOpen(false); setCsvRows([]); setCsvActions([]); }}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-heading" style={{ fontSize: '18px' }}>Import Produk dari CSV</h3>
              <button className="btn btn-ghost btn--sm" onClick={() => { setIsCsvOpen(false); setCsvRows([]); setCsvActions([]); }}>
                Tutup
              </button>
            </div>

            {csvRows.length === 0 ? (
              /* Step 1: Upload */
              <div className="flex flex-col gap-4">
                {/* Instructions */}
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-white)', border: '1px solid var(--color-line)' }}>
                  <p className="text-body" style={{ fontWeight: 600, marginBottom: '12px' }}>Format CSV:</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', minWidth: '100px' }}>nama*</span>
                      <span className="text-meta" style={{ fontSize: '12px' }}>Nama produk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', minWidth: '100px' }}>harga_jual*</span>
                      <span className="text-meta" style={{ fontSize: '12px' }}>Harga jual (angka)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', minWidth: '100px' }}>harga_modal</span>
                      <span className="text-meta" style={{ fontSize: '12px' }}>Harga modal (opsional)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', minWidth: '100px' }}>barcode</span>
                      <span className="text-meta" style={{ fontSize: '12px' }}>Barcode (opsional)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-numeral" style={{ fontSize: '12px', minWidth: '100px' }}>kategori</span>
                      <span className="text-meta" style={{ fontSize: '12px' }}>Nama kategori (opsional)</span>
                    </div>
                  </div>
                </div>

                {/* Template download */}
                <button
                  className="btn btn-secondary btn--full"
                  onClick={downloadCsvTemplate}
                  style={{ justifyContent: 'center', gap: '8px', height: '48px' }}
                >
                  <Download size={18} />
                  <span style={{ fontWeight: 600 }}>Download Template CSV</span>
                </button>

                {/* Upload area */}
                <div
                  className="rounded-lg text-center"
                  style={{
                    border: '2px dashed var(--color-warung-green)',
                    background: 'rgba(15, 122, 92, 0.03)',
                    cursor: 'pointer',
                    padding: '32px 16px',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => csvFileRef.current?.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 122, 92, 0.08)';
                    e.currentTarget.style.borderColor = 'var(--color-warung-green)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 122, 92, 0.03)';
                  }}
                >
                  <FileSpreadsheet size={40} style={{ color: 'var(--color-warung-green)', margin: '0 auto 12px' }} />
                  <p className="text-body" style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {isParsingCsv ? 'Memproses file...' : 'Pilih file CSV'}
                  </p>
                  <p className="text-meta" style={{ fontSize: '12px', color: 'var(--color-muted-ink)' }}>
                    .csv, maksimal 1000 baris
                  </p>
                </div>
                <input
                  ref={csvFileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              /* Step 2: Preview & Conflict Resolution */
              <div className="flex flex-col gap-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(15, 122, 92, 0.08)', border: '1px solid rgba(15, 122, 92, 0.2)' }}>
                    <div className="text-numeral" style={{ fontSize: '20px', color: 'var(--color-warung-green)', fontWeight: 700 }}>
                      {csvActions.filter((a) => a.action === 'import').length}
                    </div>
                    <div className="text-meta" style={{ fontSize: '11px', color: 'var(--color-warung-green)' }}>Baru</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(232, 163, 61, 0.08)', border: '1px solid rgba(232, 163, 61, 0.2)' }}>
                    <div className="text-numeral" style={{ fontSize: '20px', color: 'var(--color-marigold)', fontWeight: 700 }}>
                      {csvActions.filter((a) => a.action === 'replace').length}
                    </div>
                    <div className="text-meta" style={{ fontSize: '11px', color: 'var(--color-marigold)' }}>Ganti</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(198, 64, 47, 0.08)', border: '1px solid rgba(198, 64, 47, 0.2)' }}>
                    <div className="text-numeral" style={{ fontSize: '20px', color: 'var(--color-signal-red)', fontWeight: 700 }}>
                      {csvActions.filter((a) => a.action === 'skip').length}
                    </div>
                    <div className="text-meta" style={{ fontSize: '11px', color: 'var(--color-signal-red)' }}>Lewati</div>
                  </div>
                </div>

                {/* Product list */}
                <div className="stack stack--2">
                  {csvRows.map((row, idx) => {
                    const action = csvActions[idx]?.action || 'skip';
                    const isError = !!row.error;
                    const isDuplicate = !!row.duplicateOf && !isError;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg"
                        style={{
                          border: '1px solid',
                          borderColor: isError
                            ? 'var(--color-signal-red)'
                            : isDuplicate
                              ? 'var(--color-marigold)'
                              : 'var(--color-line)',
                          background: 'var(--color-white)',
                        }}
                      >
                        {/* Status bar */}
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
                          style={{
                            background: isError
                              ? 'rgba(198, 64, 47, 0.1)'
                              : isDuplicate
                                ? 'rgba(232, 163, 61, 0.1)'
                                : 'rgba(15, 122, 92, 0.1)',
                          }}
                        >
                          {isError ? (
                            <XCircle size={14} style={{ color: 'var(--color-signal-red)', flexShrink: 0 }} />
                          ) : isDuplicate ? (
                            <AlertCircle size={14} style={{ color: 'var(--color-marigold)', flexShrink: 0 }} />
                          ) : (
                            <CheckCircle2 size={14} style={{ color: 'var(--color-warung-green)', flexShrink: 0 }} />
                          )}
                          <span
                            className="text-meta"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isError
                                ? 'var(--color-signal-red)'
                                : isDuplicate
                                  ? 'var(--color-marigold)'
                                  : 'var(--color-warung-green)',
                            }}
                          >
                            {isError ? 'Error' : isDuplicate ? 'Duplikat' : 'Baru'}
                          </span>
                          <span className="text-meta" style={{ fontSize: '11px', color: 'var(--color-muted-ink)', marginLeft: 'auto' }}>
                            Baris {row.rowNumber}
                          </span>
                        </div>

                        {/* Product info */}
                        <div className="p-3">
                          <div className="text-body" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                            {row.name || '(Nama kosong)'}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            <span className="text-numeral" style={{ fontSize: '13px' }}>
                              Rp {row.price.toLocaleString('id-ID')}
                            </span>
                            {row.barcode && (
                              <span className="text-meta" style={{ fontSize: '12px', background: 'var(--color-paper)', padding: '2px 6px', borderRadius: '4px' }}>
                                {row.barcode}
                              </span>
                            )}
                            {row.category && (
                              <span className="text-meta" style={{ fontSize: '12px' }}>
                                {row.category}
                              </span>
                            )}
                          </div>
                          {isError && (
                            <div className="text-meta" style={{ fontSize: '12px', color: 'var(--color-signal-red)', marginTop: '8px', fontWeight: 500 }}>
                              {row.error}
                            </div>
                          )}
                          {isDuplicate && (
                            <div className="text-meta" style={{ fontSize: '12px', color: 'var(--color-marigold)', marginTop: '8px', fontWeight: 500 }}>
                              <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                              Cocok dengan: {row.duplicateOf!.name}
                            </div>
                          )}

                          {/* Action selector - full width on its own line */}
                          {!isError && (
                            <select
                              value={action}
                              onChange={(e) => setCsvAction(idx, e.target.value as 'import' | 'replace' | 'skip')}
                              className="input mt-2"
                              style={{
                                width: '100%',
                                fontSize: '13px',
                                fontWeight: 600,
                                minHeight: '40px',
                                background: action === 'import'
                                  ? 'rgba(15, 122, 92, 0.1)'
                                  : action === 'replace'
                                    ? 'rgba(232, 163, 61, 0.1)'
                                    : 'var(--color-paper)',
                                borderColor: action === 'import'
                                  ? 'var(--color-warung-green)'
                                  : action === 'replace'
                                    ? 'var(--color-marigold)'
                                    : 'var(--color-line)',
                              }}
                            >
                              {isDuplicate ? (
                                <>
                                  <option value="replace">Ganti data yang ada</option>
                                  <option value="skip">Lewati (tidak diimport)</option>
                                </>
                              ) : (
                                <option value="import">Import sebagai baru</option>
                              )}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-2">
                  <button
                    className="btn btn-secondary btn--full"
                    onClick={() => { setCsvRows([]); setCsvActions([]); }}
                    disabled={isImportingCsv}
                    style={{ height: '48px' }}
                  >
                    Batal
                  </button>
                  <button
                    className="btn btn-primary btn--full"
                    onClick={handleImportCsv}
                    disabled={isImportingCsv}
                    style={{ justifyContent: 'center', height: '48px', gap: '8px' }}
                  >
                    {isImportingCsv ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Import {csvActions.filter((a, i) => a.action !== 'skip' && !csvRows[i]?.error).length} Produk</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BarcodeScanner
        isOpen={isScannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
