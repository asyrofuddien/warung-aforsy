'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from './actions';

interface Person {
  id: number;
  name: string;
  is_owner: number;
}

interface LoginClientProps {
  storeId: number;
  slug: string;
  persons: Person[];
}

export default function LoginClient({ storeId, slug, persons }: LoginClientProps) {
  const router = useRouter();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (loading) return;
    setError(null);
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setError(null);
    setPin('');
    setSelectedPerson(null);
  };

  // Submit automatically when PIN length reaches 6 digits
  useEffect(() => {
    if (pin.length === 6 && selectedPerson) {
      const submitPin = async () => {
        setLoading(true);
        const result = await loginAction(storeId, selectedPerson.id, pin);
        if (result.success) {
          router.replace(`/store/${slug}`);
          router.refresh();
        } else {
          setError(result.error || 'Login gagal.');
          setPin(''); // Clear PIN on error so they can retry
          setLoading(false);
        }
      };
      submitPin();
    }
  }, [pin, selectedPerson, storeId, slug, router]);

  return (
    <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: '60vh' }}>
      {!selectedPerson ? (
        <div className="w-full" style={{ maxWidth: '400px' }}>
          <h2 className="text-heading text-center my-6">Pilih Akun Kasir</h2>
          <div className="stack stack--3">
            {persons.map((person) => (
              <button
                key={person.id}
                onClick={() => { setPin(''); setError(null); setSelectedPerson(person); }}
                className="btn btn-secondary btn--full"
                style={{
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  textAlign: 'left',
                }}
              >
                <span>{person.name}</span>
                <span className="text-meta" style={{ fontWeight: 600 }}>
                  {person.is_owner === 1 ? 'Pemilik' : 'Kasir'} &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="overlay overlay-enter">
          <div className="modal modal-enter" style={{ maxWidth: '420px', minHeight: '80vh' }}>
            <div className="modal__handle"></div>
            
            <div className="pin-pad">
              <div className="pin-pad__user">
                {selectedPerson.name}
                <div className="text-meta mt-1">
                  Masukkan PIN 6-Digit
                </div>
              </div>

              {/* 6-dot indicator */}
              <div className="pin-pad__dots">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`pin-dot ${idx < pin.length ? 'pin-dot--filled' : ''}`}
                  ></div>
                ))}
              </div>

              {/* Error display */}
              {error && (
                <div className="text-red text-meta text-center" style={{ fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {/* Keypad Grid */}
              <div className="pin-pad__grid">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    disabled={loading}
                    className="pin-pad__key"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Cancel Button */}
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="pin-pad__key pin-pad__key--action"
                >
                  Batal
                </button>

                {/* '0' Button */}
                <button
                  onClick={() => handleKeyPress('0')}
                  disabled={loading}
                  className="pin-pad__key"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  onClick={handleBackspace}
                  disabled={loading}
                  className="pin-pad__key pin-pad__key--action"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
