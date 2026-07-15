"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, ScanBarcode } from "lucide-react";

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
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      } catch {
        // Scanner already stopped or DOM removed — safe to ignore
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-line)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--color-warung-green)" }}
          >
            <ScanBarcode size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <p
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
            >
              Scan Barcode
            </p>
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-muted-ink)" }}
            >
              Arahkan kamera ke barcode produk
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--color-line)", color: "var(--color-ink)" }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <div id="barcode-scanner-viewfinder" ref={containerRef} className="h-full w-full" />

        {/* Scan Frame Overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {/* Top dim */}
          <div className="w-full flex-1" style={{ background: "rgba(0,0,0,0.55)" }} />

          {/* Scan zone */}
          <div className="relative flex items-center justify-center" style={{ height: "200px", width: "100%" }}>
            <div style={{ background: "rgba(0,0,0,0.55)", width: "100%", height: "100%", position: "absolute", left: 0, top: 0 }} />

            {/* Clear cutout */}
            <div
              className="relative"
              style={{
                width: "280px",
                height: "160px",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            >
              {/* Corner marks */}
              <div className="absolute" style={{ top: "-2px", left: "-2px", width: "32px", height: "32px", borderTop: "3px solid var(--color-warung-green)", borderLeft: "3px solid var(--color-warung-green)", borderTopLeftRadius: "var(--radius-md)" }} />
              <div className="absolute" style={{ top: "-2px", right: "-2px", width: "32px", height: "32px", borderTop: "3px solid var(--color-warung-green)", borderRight: "3px solid var(--color-warung-green)", borderTopRightRadius: "var(--radius-md)" }} />
              <div className="absolute" style={{ bottom: "-2px", left: "-2px", width: "32px", height: "32px", borderBottom: "3px solid var(--color-warung-green)", borderLeft: "3px solid var(--color-warung-green)", borderBottomLeftRadius: "var(--radius-md)" }} />
              <div className="absolute" style={{ bottom: "-2px", right: "-2px", width: "32px", height: "32px", borderBottom: "3px solid var(--color-warung-green)", borderRight: "3px solid var(--color-warung-green)", borderBottomRightRadius: "var(--radius-md)" }} />

              {/* Scanning line animation */}
              <div
                className="absolute left-2 right-2"
                style={{
                  height: "2px",
                  background: "var(--color-warung-green)",
                  boxShadow: "0 0 8px var(--color-warung-green)",
                  animation: "scanLine 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Bottom dim */}
          <div className="w-full flex-1" style={{ background: "rgba(0,0,0,0.55)" }} />
        </div>

        {/* Loading overlay */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(15, 122, 92, 0.2)" }}
              >
                <div className="h-8 w-8 animate-spin rounded-full" style={{ border: "3px solid var(--color-line)", borderTopColor: "var(--color-warung-green)" }} />
              </div>
              <p
                className="text-sm font-medium"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-paper)" }}
              >
                Memulai kamera...
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: "rgba(0,0,0,0.9)" }}>
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(198, 64, 47, 0.15)" }}
              >
                <Camera size={28} style={{ color: "var(--color-signal-red)" }} />
              </div>
              <p
                className="text-sm font-medium leading-relaxed"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-paper)", maxWidth: "280px" }}
              >
                {error}
              </p>
              <button
                onClick={onClose}
                className="rounded-lg px-8 py-3 text-sm font-bold"
                style={{
                  fontFamily: "var(--font-body)",
                  background: "var(--color-warung-green)",
                  color: "#fff",
                  minHeight: "48px",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div
        className="flex items-center justify-center gap-2 py-4"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-line)" }}
      >
        <ScanBarcode size={16} style={{ color: "var(--color-muted-ink)" }} />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted-ink)" }}
        >
          Barcode otomatis terdeteksi
        </p>
      </div>
    </div>
  );
}
