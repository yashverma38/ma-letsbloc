import { createClient } from '@supabase/supabase-js';

// Test override is parked on globalThis so that any duplicated instances of
// this module (e.g. tsx's ESM loader creating one instance for static imports
// inside lib/ and another for dynamic imports in tests/) see the same value.
const OVERRIDE_KEY = '__ma_supabase_override__';

export function serverClient() {
  const override = (globalThis as any)[OVERRIDE_KEY];
  if (override) return override;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error('Supabase env not set');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function setServerClientForTests(client: any) {
  (globalThis as any)[OVERRIDE_KEY] = client;
}

// User-facing bucket — 24h TTL cleanup cron.
export const AUDIO_BUCKET = 'maa-audio';

// Permanent archive bucket — never cleaned up. Private.
// PRD §7.1: path convention `{YYYY-MM-DD}/{generation_id}.mp3`.
export const AUDIO_ARCHIVE_BUCKET = 'maa-audio-archive';
