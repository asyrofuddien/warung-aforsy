'use server';

import { authenticatePerson, setStoreSession } from '@/lib/auth';

export async function loginAction(storeId: number, personId: number, pin: string) {
  try {
    const session = authenticatePerson(storeId, personId, pin);
    if (!session) {
      return { success: false, error: 'PIN salah, silakan coba lagi.' };
    }
    await setStoreSession(session);
    return { success: true };
  } catch {
    return { success: false, error: 'Terjadi kesalahan sistem.' };
  }
}
