'use server';

import { authenticatePerson, setStoreSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function loginAction(storeId: number, personId: number, pin: string) {
  try {
    const session = authenticatePerson(storeId, personId, pin);
    if (!session) {
      logActivity({ storeId, action: 'login_failed', entityType: 'person', entityId: personId, request: { personId }, response: { success: false, error: 'PIN salah' } });
      return { success: false, error: 'PIN salah, silakan coba lagi.' };
    }
    await setStoreSession(session);
    logActivity({ storeId, personId: session.personId, action: 'login', entityType: 'person', entityId: session.personId, request: { personId }, response: { name: session.personName, isOwner: session.isOwner } });
    return { success: true };
  } catch {
    return { success: false, error: 'Terjadi kesalahan sistem.' };
  }
}
