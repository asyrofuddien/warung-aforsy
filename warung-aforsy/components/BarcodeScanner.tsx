"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ isOpen, onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let scanner: Html5Qrcode | null = null;
    let stopped = false;

    async function startScanner() {
      if (!containerRef.current) return;

      setIsStarting(true);
      setError(null);

      try {
        scanner = new Html5Qrcode("barcode-scanner-viewfinder");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (stopped) return;
            navigator.vibrate?.(100);
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        if (!stopped) {
          if (err instanceof Error) {
            if (err.name === "NotAllowedError") {
              setError("Akses kamera ditolak. Berikan izin kamera di pengaturan browser.");
            } else if (err.name === "NotFoundError") {
              setError("Tidak ditemukan kamera pada perangkat ini.");
            } else {
              setError("Gagal mengakses kamera. Pastikan kamera tersedia.");
            }
          } else {
            setError("Gagal memulai scanner.");
          }
        }
      } finally {
        if (!stopped) setIsStarting(false);
      }
    }

    startScanner();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-jakarta text-sm font-medium text-paper">
          Arahkan kamera ke barcode
        </p>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-paper"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div id="barcode-scanner-viewfinder" ref={containerRef} className="h-full w-full" />

        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-paper border-t-transparent" />
              <p className="font-jakarta text-sm text-paper">Memulai kamera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/90 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="font-jakarta text-sm text-paper">{error}</p>
              <button
                onClick={onClose}
                className="rounded-lg bg-warung-green px-6 py-2.5 font-jakarta text-sm font-bold text-paper"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[160px] w-[280px] rounded-lg border-2 border-paper/60" />
        </div>
      </div>
    </div>
  );
}
