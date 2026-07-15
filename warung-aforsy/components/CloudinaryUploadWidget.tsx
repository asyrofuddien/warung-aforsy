'use client';

import { useEffect, useRef } from 'react';

interface CloudinaryUploadWidgetProps {
  onUpload: (url: string) => void;
  buttonText?: string;
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: { event: string; info: { secure_url?: string } }) => void
      ) => { open: () => void; close: () => void };
    };
  }
}

export default function CloudinaryUploadWidget({ onUpload, buttonText = 'Upload Gambar' }: CloudinaryUploadWidgetProps) {
  const widgetRef = useRef<ReturnType<typeof window.cloudinary.createUploadWidget> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openWidget = () => {
    if (typeof window === 'undefined' || !window.cloudinary) return;

    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'warung_qr',
          folder: 'warung-qr',
          sources: ['local', 'camera'],
          multiple: false,
          maxFiles: 1,
          cropping: false,
          styles: {
            palette: {
              window: '#FFFFFF',
              sourceBg: '#F4F4F5',
              windowBorder: '#DDDDDD',
              tabIcon: '#0F7A5C',
              inactiveTabIcon: '#555A5F',
              menuIcons: '#0F7A5C',
              link: '#0F7A5C',
              action: '#0F7A5C',
              inactive: '#555A5F',
            },
          },
        },
        (error: unknown, result: { event: string; info: { secure_url?: string } }) => {
          if (!error && result.event === 'success' && result.info?.secure_url) {
            onUpload(result.info.secure_url);
          }
        }
      );
    }

    widgetRef.current.open();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={openWidget}
      className="btn btn-secondary"
      style={{ width: '100%', justifyContent: 'center' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {buttonText}
    </button>
  );
}
