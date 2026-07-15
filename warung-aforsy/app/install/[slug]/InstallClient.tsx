'use client';

import { useState } from 'react';

interface InstallClientProps {
  storeName: string;
  storeSlug: string;
}

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export default function InstallClient({ storeName, storeSlug }: InstallClientProps) {
  const [platform] = useState<Platform>(detectPlatform);
  const [copied, setCopied] = useState(false);

  const storeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/store/${storeSlug}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const iosSteps = [
    { num: 1, text: 'Tekan tombol "Buka Aplikasi" di bawah ini' },
    { num: 2, text: 'Di Safari, tekan ikon Share (kotak dengan panah ke atas) di bagian bawah' },
    { num: 3, text: 'Gulir ke bawah, pilih "Tambah ke Layar Utama"' },
    { num: 4, text: 'Tekan "Tambah" di pojok kanan atas' },
    { num: 5, text: 'Aplikasi sudah terpasang di layar utama Anda!' },
  ];

  const androidSteps = [
    { num: 1, text: 'Tekan tombol "Buka Aplikasi" di bawah ini' },
    { num: 2, text: 'Di Chrome, tekan menu titik tiga (⋮) di pojok kanan atas' },
    { num: 3, text: 'Pilih "Tambahkan ke Layar Utama"' },
    { num: 4, text: 'Tekan "Tambah" untuk konfirmasi' },
    { num: 5, text: 'Aplikasi sudah terpasang di layar utama Anda!' },
  ];

  const renderSteps = (steps: { num: number; text: string }[]) => (
    <div className="flex flex-col gap-3">
      {steps.map((step) => (
        <div key={step.num} className="flex items-start gap-3">
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warung-green)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {step.num}
          </div>
          <span style={{ fontSize: '14px', lineHeight: '1.5', paddingTop: '3px' }}>{step.text}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-paper)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: '4px', backgroundColor: 'var(--color-warung-green)' }} />

      <div style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '480px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-warung-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '32px', height: '32px' }}
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <h1
            className="text-heading"
            style={{ fontSize: '22px', marginBottom: 'var(--space-1)' }}
          >
            Kasir {storeName}
          </h1>
          <p className="text-meta" style={{ fontSize: '13px' }}>
            Install aplikasi ini ke layar utama Anda untuk akses cepat
          </p>
        </div>

        {/* Open App Button */}
        <a
          href={storeUrl}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-warung-green)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '16px',
            textDecoration: 'none',
            marginBottom: 'var(--space-2)',
          }}
        >
          Buka Aplikasi
        </a>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            padding: 'var(--space-3)',
            backgroundColor: 'transparent',
            color: 'var(--color-warung-green)',
            border: '2px solid var(--color-warung-green)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: 'var(--space-6)',
          }}
        >
          {copied ? 'Link Disalin!' : 'Salin Link'}
        </button>

        {/* Platform-specific instructions */}
        {platform === 'ios' && (
          <div
            className="card bg-white border"
            style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: '20px', height: '20px' }}
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="text-heading" style={{ fontSize: '16px' }}>
                iPhone (Safari)
              </span>
            </div>
            {renderSteps(iosSteps)}
          </div>
        )}

        {platform === 'android' && (
          <div
            className="card bg-white border"
            style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: '20px', height: '20px' }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="text-heading" style={{ fontSize: '16px' }}>
                Android (Chrome)
              </span>
            </div>
            {renderSteps(androidSteps)}
          </div>
        )}

        {platform === 'other' && (
          <>
            <div
              className="card bg-white border"
              style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: '20px', height: '20px' }}
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span className="text-heading" style={{ fontSize: '16px' }}>
                  iPhone (Safari)
                </span>
              </div>
              {renderSteps(iosSteps)}
            </div>

            <div
              className="card bg-white border"
              style={{ padding: 'var(--space-5)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: '20px', height: '20px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span className="text-heading" style={{ fontSize: '16px' }}>
                  Android (Chrome)
                </span>
              </div>
              {renderSteps(androidSteps)}
            </div>
          </>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <p className="text-meta" style={{ fontSize: '11px' }}>
            Setelah terpasang, buka aplikasi dari layar utama Anda
          </p>
          <p className="text-meta" style={{ fontSize: '11px', marginTop: '4px' }}>
            {storeName}
          </p>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div style={{ height: '4px', backgroundColor: 'var(--color-warung-green)', position: 'fixed', bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}
