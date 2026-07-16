import db from './db';

export interface LogOptions {
  storeId?: number | null;
  personId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  request?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
}

export function logActivity(options: LogOptions): void {
  const { storeId = null, personId = null, action, entityType = null, entityId = null, details = null, request = null, response = null } = options;

  const payload: Record<string, unknown> = {};
  if (details) payload.details = details;
  if (request) payload.request = request;
  if (response) payload.response = response;
  const detailsJson = Object.keys(payload).length > 0 ? JSON.stringify(payload) : null;

  try {
    db.prepare(
      `INSERT INTO activity_logs (store_id, person_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(storeId, personId, action, entityType, entityId, detailsJson);

    const ts = new Date().toISOString();
    const parts = [`[ACTIVITY] ${ts}`, `action=${action}`];
    if (storeId) parts.push(`store=${storeId}`);
    if (personId) parts.push(`person=${personId}`);
    if (entityType && entityId) parts.push(`${entityType}#${entityId}`);
    if (detailsJson) parts.push(detailsJson);
    console.log(parts.join(' | '));
  } catch (err) {
    console.error('[ACTIVITY] Failed to log:', err instanceof Error ? err.message : err);
  }
}

export function devLog(tag: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const prefix = `[${tag}] ${ts}`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}
