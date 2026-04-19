-- Run once in Supabase SQL editor.

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);

create table if not exists voice_notes (
  id uuid primary key default gen_random_uuid(),
  archetype text not null,
  data jsonb not null,
  audio_url text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  voice_note_id uuid references voice_notes(id) on delete cascade,
  platform text,
  created_at timestamptz default now()
);

-- Storage bucket for audio files (public read).
-- Create in Supabase Dashboard → Storage → New bucket → name: maa-audio → public.
