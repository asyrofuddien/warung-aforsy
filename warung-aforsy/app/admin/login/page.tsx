'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginAction } from './actions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await adminLoginAction(formData);

    if (result.success) {
      router.replace('/admin');
      router.refresh();
    } else {
      setError(result.error || 'Login gagal.');
      setLoading(false);
    }
  };

  return (
    <div className="card bg-white shadow-card p-6 rounded-md">
      <h2 className="text-heading text-center mb-6">Login Platform Admin</h2>
      
      {error && (
        <div className="text-red text-meta text-center mb-4" style={{ fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack stack--3">
        <div className="flex flex-col gap-1">
          <label className="text-meta" style={{ fontWeight: 600 }}>Username</label>
          <input
            type="text"
            name="username"
            required
            placeholder="admin"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-meta" style={{ fontWeight: 600 }}>Password</label>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className="input"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn--full mt-4"
          disabled={loading}
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
