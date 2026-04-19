-- Run once in Supabase SQL editor.
-- Re-run is safe (idempotent).

-- Waitlist moved to Firestore (project: bloc-the-app, collection: waitlist_ma).

create table if not exists voice_notes (
  id uuid primary key default gen_random_uuid(),
  archetype text not null,
  data jsonb not null,
  audio_url text not null,
  email text,
  created_at timestamptz default now()
);

create index if not exists voice_notes_created_at_idx on voice_notes (created_at);

create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  voice_note_id uuid references voice_notes(id) on delete cascade,
  platform text,
  created_at timestamptz default now()
);

create index if not exists shares_voice_note_id_idx on shares (voice_note_id);

create table if not exists rate_limits (
  id bigserial primary key,
  key text not null,                -- usually ip + endpoint
  created_at timestamptz default now()
);

create index if not exists rate_limits_key_created_idx on rate_limits (key, created_at);

-- 24-hour data retention. Deletes expired voice notes.
-- Storage objects are cleaned up by the edge function (see supabase/cleanup.md).
create or replace function delete_expired_voice_notes()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  with d as (
    delete from voice_notes
    where created_at < now() - interval '24 hours'
    returning id
  )
  select count(*) into deleted_count from d;

  delete from rate_limits
  where created_at < now() - interval '2 hours';

  return deleted_count;
end;
$$;

-- Schedule via pg_cron. Requires the pg_cron extension enabled in Supabase
-- (Database → Extensions → pg_cron).
-- Uncomment after enabling pg_cron:
-- select cron.schedule('cleanup-voice-notes', '0 * * * *', $$select delete_expired_voice_notes()$$);

-- Storage bucket for audio files (public read).
-- Create in Supabase Dashboard → Storage → New bucket → name: maa-audio → public.

-- ----------------------------------------------------------------------------
-- Phase 1 — ElevenLabs integration + persistent audio archive (PRD §7, §10).
-- Append-only. Not touched by the 24h cleanup cron. Keep forever.
-- Storage counterpart: maa-audio-archive bucket (private, no TTL).

create table if not exists voice_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor text not null,                       -- 'elevenlabs' | 'sarvam'
  voice_id text not null,
  model_id text not null,
  archetype text not null,
  lang_code text not null,
  lang_label text not null,
  voice_settings jsonb not null,
  input_text text not null,
  input_text_chars integer not null,
  output_format text not null,
  audio_storage_path text not null,
  audio_byte_size integer not null,
  audio_duration_ms integer,
  synth_wall_ms integer not null,
  upload_wall_ms integer not null,
  voice_note_id uuid references voice_notes(id) on delete set null,
  source text not null,                       -- 'generate' | 'sample' | 'eval' | 'regenerate'
  request_id text,
  user_session_id text,
  ratings jsonb
);

create index if not exists voice_generations_created_idx on voice_generations (created_at desc);
create index if not exists voice_generations_archetype_idx on voice_generations (archetype, created_at desc);
create index if not exists voice_generations_vendor_idx on voice_generations (vendor, created_at desc);
create index if not exists voice_generations_lang_idx on voice_generations (lang_code, created_at desc);

-- Failure sidecar for archive-write failures (repair offline).
create table if not exists voice_generations_failed (
  id uuid primary key,
  created_at timestamptz not null default now(),
  stage text not null,                        -- 'audio_upload' | 'row_insert'
  error text not null,
  payload jsonb not null
);

-- Daily counters for observability + budget breaker (§10.2, §11).
create table if not exists metrics_daily (
  day date not null,
  key text not null,
  value bigint not null default 0,
  primary key (day, key)
);

-- Atomic-increment RPC used by lib/archive.ts#incrMetric.
create or replace function increment_metric_daily(p_day date, p_key text, p_value bigint)
returns void
language sql
security definer
as $$
  insert into metrics_daily (day, key, value) values (p_day, p_key, p_value)
  on conflict (day, key) do update set value = metrics_daily.value + excluded.value;
$$;
