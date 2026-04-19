import { createClient } from '@supabase/supabase-js';

export function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error('Supabase env not set');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const AUDIO_BUCKET = 'maa-audio';
