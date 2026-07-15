'use server';

import { authenticateAdmin } from '@/lib/auth';

export async function adminLoginAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { success: false, error: 'Username dan password wajib diisi.' };
  }

  const success = await authenticateAdmin(username, password);
  if (success) {
    return { success: true };
  }
  return { success: false, error: 'Username atau password salah.' };
}
