import type { Json } from '@dental/types';

/** Strip PostGIS / unknown fields so audit_logs.before matches Supabase `Json`. */
export function toAuditJson(value: unknown): Json | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Json;
}
