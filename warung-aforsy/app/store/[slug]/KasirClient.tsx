'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/BarcodeScanner';
import { createTransactionAction } from './actions';
import { toDirectImageUrl } from '@/lib/gdrive';

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

interface ReceiptData {
  transactionId: number | bigint;
  timestamp: string;
  total: number;
  cashierName: string;
  paymentMethod: string;
  items: {
    productId: number;
    name: string;
    price: number;
    quantity: number;
  }[];
}

interface KasirClientProps {
  storeId: number;
  storeName: string;
  storeQrUrl: string | null;
  products: Product[];
  categories: Category[];
}

export default function KasirClient({ storeId, storeName, storeQrUrl, products, categories }: KasirClientProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<{ [productId: number]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Barcode scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const addToCart = useCallback((product: Product) => {
    if (product.in_stock === 0) return;
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
  }, []);

  const handleCashierScan = useCallback((barcode: string) => {
    setIsScannerOpen(false);
    const matchedProduct = products.find((p) => p.barcode && p.barcode.trim() === barcode.trim());
    
    if (matchedProduct) {
      if (matchedProduct.in_stock === 1) {
        addToCart(matchedProduct);
        navigator.vibrate?.(100);
        toast.success(`${matchedProduct.name} ditambahkan ke keranjang`);
      } else {
        setError(`Produk "${matchedProduct.name}" sedang habis.`);
        setTimeout(() => setError(null), 3000);
      }
    } else {
      setError('Barcode tidak ditemukan di produk.');
      setTimeout(() => setError(null), 3000);
    }
  }, [products, addToCart]);

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId] > 1) {
        updated[productId] -= 1;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  };

  const deleteFromCart = (productId: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const clearCart = () => {
    setCart({});
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setReceipt(null);
  };

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Barcode scanner detection is handled inline in the search onChange handler
  const lastBarcodeRef = useRef('');

  // Compute cart summary
  const cartItems = Object.entries(cart).map(([idStr, qty]) => {
    const id = parseInt(idStr, 10);
    const product = products.find((p) => p.id === id)!;
    return {
      product,
      quantity: qty,
      subtotal: product.price * qty,
    };
  });

  const totalItems = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cartItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchCategory = filterCategory === 'all' || p.category_id === filterCategory;
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.barcode && p.barcode.toLowerCase().includes(s));
    return matchCategory && matchSearch;
  });

  // Handle Checkout submission
  const handleCheckoutSubmit = async () => {
    if (totalItems === 0) return;
    setLoading(true);
    setError(null);

    const itemsInput = Object.entries(cart).map(([productId, quantity]) => ({
      productId: parseInt(productId, 10),
      quantity,
    }));

    const response = await createTransactionAction(storeId, itemsInput, paymentMethod);

    if (response.success && response.data) {
      setReceipt(response.data as ReceiptData);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    } else {
      setError(response.error || 'Gagal memproses transaksi.');
    }
    setLoading(false);
  };

  // Formats date into standard Indonesian format
  const formatIndoDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-');
    } catch {
      return isoStr;
    }
  };

  // Create WhatsApp sharing text link
  const getWhatsAppShareLink = () => {
    if (!receipt) return '#';
    
    let text = `*${storeName.toUpperCase()}*\n`;
    text += `Nota Belanja - #${receipt.transactionId}\n`;
    text += `Tanggal: ${formatIndoDate(receipt.timestamp)}\n`;
    text += `Kasir: ${receipt.cashierName}\n`;
    text += `------------------------------------\n`;
    
    receipt.items.forEach((item) => {
      text += `- ${item.quantity}x ${item.name} @ Rp ${item.price.toLocaleString('id-ID')} = Rp ${(item.quantity * item.price).toLocaleString('id-ID')}\n`;
    });
    
    text += `------------------------------------\n`;
    text += `*TOTAL: Rp ${receipt.total.toLocaleString('id-ID')}*\n`;
    text += `Metode Pembayaran: ${receipt.paymentMethod === 'qr' ? 'QRIS (Gopay)' : 'Tunai (Cash)'}\n\n`;
    text += `Terima Kasih atas Kunjungan Anda!`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Barcode scanner: detect exact barcode match on each keystroke
  const handleSearchChange = (value: string) => {
    setSearch(value);

    if (!value) return;
    const matchedProduct = products.find(
      (p) => p.barcode && p.barcode.trim() === value.trim()
    );

    if (matchedProduct && lastBarcodeRef.current !== value) {
      lastBarcodeRef.current = value;
      if (matchedProduct.in_stock === 1) {
        addToCart(matchedProduct);
      } else {
        setError(`Produk "${matchedProduct.name}" sedang habis.`);
        setTimeout(() => setError(null), 3000);
      }
      setSearch('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input Zone (§5) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari produk atau scan barcode..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="btn btn-secondary"
          style={{ minWidth: '48px', justifyContent: 'center', padding: '0 12px' }}
          title="Scan Barcode"
        >
          <Camera size={20} />
        </button>
      </div>

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

      {/* Product List Grid */}
      <div className="stack stack--3" style={{ paddingBottom: '120px' }}>
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <svg
              className="empty-state__icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <div className="empty-state__title">Produk Tidak Ditemukan</div>
            <div className="empty-state__text">Coba kata kunci lain atau scan barcode kembali.</div>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isOutOfStock = p.in_stock === 0;
            const quantityInCart = cart[p.id] || 0;
            
            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`product-card ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: quantityInCart > 0 ? 'rgba(15, 122, 92, 0.02)' : 'var(--color-white)',
                  borderColor: quantityInCart > 0 ? 'var(--color-warung-green)' : 'var(--color-line)',
                }}
              >
                <div className="product-card__info">
                  <span className="product-card__name" style={{ fontWeight: 600 }}>
                    {p.name}
                  </span>
                  <span className="product-card__price">
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                  {p.barcode && (
                    <span className="product-card__meta text-numeral">
                      {p.barcode}
                    </span>
                  )}
                </div>
                
                <div className="product-card__actions">
                  {!isOutOfStock ? (
                    <span className="stock-pill stock-pill--ada">
                      Ada
                    </span>
                  ) : (
                    <span className="stock-pill stock-pill--habis">
                      Habis
                    </span>
                  )}
                  {quantityInCart > 0 && (
                    <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeFromCart(p.id)}
                        className="btn btn-secondary btn--icon"
                        style={{ minWidth: '32px', minHeight: '32px', padding: 0, fontSize: '16px', fontWeight: 700 }}
                      >
                        −
                      </button>
                      <span className="text-numeral" style={{ minWidth: '28px', textAlign: 'center', fontSize: '15px', fontWeight: 700 }}>
                        {quantityInCart}
                      </span>
                      <button
                        onClick={() => addToCart(p)}
                        className="btn btn-secondary btn--icon"
                        style={{ minWidth: '32px', minHeight: '32px', padding: 0, fontSize: '16px', fontWeight: 700 }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => deleteFromCart(p.id)}
                        className="btn btn-danger btn--icon"
                        style={{ minWidth: '32px', minHeight: '32px', padding: 0, marginLeft: '4px' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Footer for Checkout (§5, §7) */}
      {totalItems > 0 && (
        <div className="layout-sticky-footer layout-sticky-footer--above-nav">
          <div className="cart-footer cursor-pointer" onClick={() => setIsCartOpen(true)}>
            <div className="cart-footer__summary">
              <span className="cart-footer__item-count">{totalItems} Barang</span>
              <span className="cart-footer__total">
                Rp {totalPrice.toLocaleString('id-ID')}
              </span>
            </div>
            <button
              className="btn btn-primary cart-footer__action"
              onClick={(e) => {
                e.stopPropagation();
                setIsCheckoutOpen(true);
              }}
            >
              Bayar
            </button>
          </div>
        </div>
      )}

      {/* Cart Detail Sheet / Modal */}
      {isCartOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsCartOpen(false)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal__handle"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-heading">Keranjang Belanja</h3>
              <button className="btn btn-ghost btn--sm" onClick={() => setIsCartOpen(false)}>
                Tutup
              </button>
            </div>

            <div className="stack stack--3 my-4" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
              {cartItems.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-white"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-body truncate" style={{ fontWeight: 600 }}>
                      {product.name}
                    </span>
                    <span className="text-meta">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="btn btn-secondary btn--sm btn--icon"
                      style={{ minWidth: '32px', minHeight: '32px', padding: 0 }}
                    >
                      -
                    </button>
                    <span className="text-numeral px-2" style={{ fontSize: '16px' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      className="btn btn-secondary btn--sm btn--icon"
                      style={{ minWidth: '32px', minHeight: '32px', padding: 0 }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => deleteFromCart(product.id)}
                      className="btn btn-danger btn--sm btn--icon ml-2"
                      style={{ minWidth: '32px', minHeight: '32px', padding: 0 }}
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
              ))}
            </div>

            <div className="divider"></div>

            <div className="flex justify-between items-center my-4">
              <span className="text-body">Total Belanja</span>
              <span className="text-total" style={{ fontSize: '24px' }}>
                Rp {totalPrice.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn--full"
                onClick={() => {
                  setCart({});
                  setIsCartOpen(false);
                }}
              >
                Kosongkan
              </button>
              <button
                className="btn btn-primary btn--full"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
              >
                Lanjut Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Screen / Payment Modal */}
      {isCheckoutOpen && (
        <div className="overlay overlay-enter" onClick={() => setIsCheckoutOpen(false)}>
          <div
            className="modal modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal__handle"></div>
            <h3 className="text-heading text-center mb-4">Pembayaran</h3>

            {error && (
              <div className="text-red text-meta text-center mb-3" style={{ fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Payment Method Toggle (§7) */}
            <div className="payment-tabs my-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`payment-tab ${paymentMethod === 'cash' ? 'payment-tab--active' : ''}`}
              >
                <svg
                  className="payment-tab__icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                Tunai
              </button>
              
              <button
                onClick={() => setPaymentMethod('qr')}
                className={`payment-tab ${paymentMethod === 'qr' ? 'payment-tab--active' : ''}`}
              >
                <svg
                  className="payment-tab__icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <rect x="7" y="7" width="3" height="3" />
                  <rect x="14" y="7" width="3" height="3" />
                  <rect x="7" y="14" width="3" height="3" />
                  <rect x="14" y="14" width="3" height="3" />
                </svg>
                QRIS
              </button>
            </div>

            <div className="text-center my-4">
              <span className="text-meta">Jumlah Tagihan</span>
              <div className="text-total mt-1">
                Rp {totalPrice.toLocaleString('id-ID')}
              </div>
            </div>

            {/* QRIS Code display (§5.3) */}
            {paymentMethod === 'qr' && (
              <div className="flex flex-col items-center p-4 border rounded-md bg-white my-4">
                <span className="text-meta mb-2">Scan QR Code Di Bawah Ini:</span>
                {storeQrUrl ? (
                  <div
                    style={{
                      width: '200px',
                      height: '200px',
                      backgroundColor: 'var(--color-line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toDirectImageUrl(storeQrUrl)}
                      alt={`QRIS ${storeName}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'text-center p-3';
                          fallback.innerHTML = `<div style="font-size:24px;font-weight:bold;color:var(--color-warung-green)">QRIS</div><div class="text-meta mt-2" style="font-size:10px">${storeName}</div><div class="mt-1" style="width:80px;height:80px;border:4px solid black;margin:0 auto"></div>`;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-meta text-center py-6">QR Code Toko belum diunggah.</div>
                )}
                <span className="text-meta mt-3 text-center" style={{ fontSize: '11px' }}>
                  Konfirmasi pembayaran setelah dana masuk di handphone Anda.
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                className="btn btn-secondary btn--full"
                onClick={() => setIsCheckoutOpen(false)}
                disabled={loading}
              >
                Batal
              </button>
              <button
                className="btn btn-primary btn--full"
                onClick={handleCheckoutSubmit}
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Receipt Stub Modal (§6) */}
      {receipt && (
        <div className="overlay overlay-enter">
          <div
            className="modal modal-enter"
            style={{ maxWidth: '400px', padding: 'var(--space-2)' }}
          >
            <div className="receipt-stub receipt-enter">
              <h2 className="text-heading" style={{ fontSize: '22px', margin: 'var(--space-3) 0' }}>
                {storeName}
              </h2>
              <div className="text-meta">No. Nota: #{receipt.transactionId}</div>
              <div className="text-meta">Waktu: {formatIndoDate(receipt.timestamp)}</div>
              <div className="text-meta">Kasir: {receipt.cashierName}</div>

              <hr className="receipt-stub__separator" />

              <div className="stack stack--2 text-left my-4">
                {receipt.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-meta">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-numeral">
                      Rp {(item.quantity * item.price).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="receipt-stub__separator" />

              <div className="receipt-stub__total-label">TOTAL BELANJA</div>
              <div className="receipt-stub__total">
                Rp {receipt.total.toLocaleString('id-ID')}
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
                Pembayaran Berhasil
              </div>

              <div className="receipt-stub__actions">
                <a
                  href={getWhatsAppShareLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn--full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Bagikan ke WhatsApp
                </a>
                
                <button className="btn btn-secondary btn--full" onClick={clearCart}>
                  Selesai & Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        isOpen={isScannerOpen}
        onScan={handleCashierScan}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}
