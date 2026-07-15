import { cookies } from 'next/headers';
import crypto from 'crypto';
import db from './db';

export interface UserSession {
  storeId: number;
  personId: number;
  personName: string;
  isOwner: boolean;
}

// 6-digit PIN hashing
export function hashPIN(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Authenticate store staff member
export function authenticatePerson(storeId: number, personId: number, pin: string): UserSession | null {
  const pinHash = hashPIN(pin);
  const person = db.prepare(`
    SELECT id, name, is_owner 
    FROM persons 
    WHERE store_id = ? AND id = ? AND pin_hash = ?
  `).get(storeId, personId, pinHash) as { id: number; name: string; is_owner: number } | undefined;

  if (!person) return null;

  return {
    storeId,
    personId: person.id,
    personName: person.name,
    isOwner: person.is_owner === 1,
  };
}

// Session management
export async function getStoreSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('store_session')?.value;
  if (!sessionVal) return null;

  try {
    return JSON.parse(sessionVal) as UserSession;
  } catch {
    return null;
  }
}

export async function setStoreSession(session: UserSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('store_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearStoreSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('store_session');
}

// Platform Admin Auth
export async function authenticateAdmin(username: string, password: string): Promise<boolean> {
  // Simple hardcoded admin check (can be configured via env files)
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'adminwarung2026';

  if (username === adminUser && password === adminPass) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return true;
  }
  return false;
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}
