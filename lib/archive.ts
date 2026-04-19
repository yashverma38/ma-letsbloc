// PRD §7 — append-only archive: audio in maa-audio-archive, metadata in voice_generations.
// Fire-and-forget from the route; failures recorded in voice_generations_failed.

import { serverClient, AUDIO_ARCHIVE_BUCKET } from './supabase';
import type { Vendor } from './tts';
import type { ElevenLabsVoiceSettings } from './elevenlabs';
import type { SarvamVoiceSettings } from './tts';
import type { Archetype } from './types';

export type ArchiveInput = {
  generationId: string;
  vendor: Vendor;
  voiceId: string;
  modelId: string;
  archetype: Archetype;
  langCode: string;
  langLabel: string;
  voiceSettings: ElevenLabsVoiceSettings | SarvamVoiceSettings;
  inputText: string;
  outputFormat: string;       // 'mp3_44100_128' | 'wav'
  audioBuf: Buffer;
  synthWallMs: number;
  uploadWallMs: number;
  voiceNoteId?: string | null;
  source: 'generate' | 'sample' | 'eval' | 'regenerate';
  requestId?: string | null;
  userSessionId?: string | null;
};

export type ArchiveResult = { ok: true; archive_ms: number; storage_path: string }
                          | { ok: false; stage: 'audio_upload' | 'row_insert'; error: string };

function datePrefix(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sanitizeText(s: string): string {
  // PRD §14 — Postgres text rejects \u0000.
  return s.replace(/\u0000/g, '');
}

function contentTypeFor(fmt: string): string {
  if (fmt === 'wav') return 'audio/wav';
  return 'audio/mpeg';
}

function extensionFor(fmt: string): string {
  return fmt === 'wav' ? 'wav' : 'mp3';
}

export async function archiveGeneration(input: ArchiveInput): Promise<ArchiveResult> {
  const supabase = serverClient();
  const t0 = Date.now();
  const ext = extensionFor(input.outputFormat);
  const storagePath = `${datePrefix()}/${input.generationId}.${ext}`;

  // Step 1 — upload audio to archive bucket.
  const up = await supabase.storage
    .from(AUDIO_ARCHIVE_BUCKET)
    .upload(storagePath, input.audioBuf, {
      contentType: contentTypeFor(input.outputFormat),
      upsert: false,
    });
  if (up.error) {
    await recordFailure(input, 'audio_upload', up.error.message);
    return { ok: false, stage: 'audio_upload', error: up.error.message };
  }

  // Step 2 — insert metadata row.
  const row = {
    id: input.generationId,
    vendor: input.vendor,
    voice_id: input.voiceId,
    model_id: input.modelId,
    archetype: input.archetype,
    lang_code: input.langCode,
    lang_label: input.langLabel,
    voice_settings: input.voiceSettings as any,
    input_text: sanitizeText(input.inputText),
    input_text_chars: input.inputText.length,
    output_format: input.outputFormat,
    audio_storage_path: storagePath,
    audio_byte_size: input.audioBuf.byteLength,
    audio_duration_ms: null,
    synth_wall_ms: input.synthWallMs,
    upload_wall_ms: input.uploadWallMs,
    voice_note_id: input.voiceNoteId ?? null,
    source: input.source,
    request_id: input.requestId ?? null,
    user_session_id: input.userSessionId ?? null,
    ratings: null,
  };
  const ins = await supabase.from('voice_generations').insert(row);
  if (ins.error) {
    await recordFailure(input, 'row_insert', ins.error.message, row);
    return { ok: false, stage: 'row_insert', error: ins.error.message };
  }

  return { ok: true, archive_ms: Date.now() - t0, storage_path: storagePath };
}

async function recordFailure(
  input: ArchiveInput,
  stage: 'audio_upload' | 'row_insert',
  error: string,
  payload?: unknown,
) {
  try {
    const supabase = serverClient();
    await supabase.from('voice_generations_failed').insert({
      id: input.generationId,
      stage,
      error: error.slice(0, 2000),
      payload: (payload ?? {
        vendor: input.vendor,
        voice_id: input.voiceId,
        model_id: input.modelId,
        archetype: input.archetype,
        lang_code: input.langCode,
        input_text_chars: input.inputText.length,
        source: input.source,
      }) as any,
    });
  } catch (e) {
    // PRD §14 — if even the failure sidecar fails, log and move on.
    console.error('[archive] failure-row insert failed', (e as Error).message);
  }
}

// PRD §10.2 — atomic daily counters.
export async function incrMetric(key: string, value: number = 1): Promise<void> {
  try {
    const supabase = serverClient();
    // upsert-add via rpc-less path: two-step is fine — this is observability.
    const today = datePrefix();
    const { error } = await supabase.rpc('increment_metric_daily', {
      p_day: today, p_key: key, p_value: value,
    });
    if (error) {
      // Fallback if RPC doesn't exist: direct upsert.
      const { data: existing } = await supabase
        .from('metrics_daily')
        .select('value')
        .eq('day', today)
        .eq('key', key)
        .maybeSingle();
      const next = Number(existing?.value ?? 0) + value;
      await supabase
        .from('metrics_daily')
        .upsert({ day: today, key, value: next }, { onConflict: 'day,key' });
    }
  } catch (e) {
    // PRD §14 — metrics_daily write failures MUST NOT fail the request.
    console.warn('[metrics] incr failed', key, (e as Error).message);
  }
}

// PRD §11 — read today's char count to enforce the daily cap.
export async function todaysElevenLabsChars(): Promise<number> {
  try {
    const supabase = serverClient();
    const { data } = await supabase
      .from('metrics_daily')
      .select('value')
      .eq('day', datePrefix())
      .eq('key', 'chars.elevenlabs')
      .maybeSingle();
    return Number(data?.value ?? 0);
  } catch {
    return 0;
  }
}

export function secondsUntilMidnightUtc(now = new Date()): number {
  const end = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
  ));
  return Math.max(1, Math.floor((end.getTime() - now.getTime()) / 1000));
}
