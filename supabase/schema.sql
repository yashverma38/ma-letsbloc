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
