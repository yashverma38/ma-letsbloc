import { NextRequest, NextResponse } from 'next/server';
import { pickArchetype, pickTier } from '@/lib/archetype';
import { buildScript, signatureLine } from '@/lib/scripts';
import { translateScript, validateTranslation } from '@/lib/gemini';
import { findLang } from '@/lib/languages';
import { serverClient, AUDIO_BUCKET } from '@/lib/supabase';
import { synthesizeDispatched, routeVendor } from '@/lib/tts';
import {
  archiveGeneration,
  incrMetric,
  todaysElevenLabsChars,
  secondsUntilMidnightUtc,
} from '@/lib/archive';
import { ElevenLabsError } from '@/lib/elevenlabs';
import type { ScreenTimeData } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = ScreenTimeData & { lang?: string; email?: string };

async function translateWithRetry(
  baseScript: string,
  targetLabel: string,
  extraProtected: string[] = [],
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const candidate = await translateScript(baseScript, targetLabel, extraProtected);
      const { ok, missing } = validateTranslation(baseScript, candidate, extraProtected);
      if (ok) return candidate;
      console.warn(`translation attempt ${attempt + 1} dropped tokens:`, missing);
    } catch (e) {
      console.warn(`translation attempt ${attempt + 1} errored:`, (e as Error).message);
    }
  }
  console.warn('falling back to Hinglish after failed translation attempts');
  return baseScript;
}

export async function POST(req: NextRequest) {
  const generationId = crypto.randomUUID();
  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body.totalHours !== 'number') {
      return NextResponse.json({ error: 'bad input' }, { status: 400 });
    }

    const name = (body.name?.trim() || 'bachha').split(/\s+/)[0];
    const email = body.email?.trim().toLowerCase() || undefined;
    const tier = pickTier(body);
    const archetype = pickArchetype(body);
    const lang = findLang(body.lang || '');
    const slots = { ...body, name };

    const baseScript = buildScript(archetype, slots);
    let script = baseScript;

    if (lang.translateTo) {
      script = await translateWithRetry(baseScript, lang.translateTo, [name]);
    }

    // PRD §14 — zero-length script → hard error, don't waste a TTS call.
    if (!script || script.trim().length === 0) {
      return NextResponse.json({ error: 'bad_script' }, { status: 500 });
    }

    // PRD §11 — daily budget breaker (only trips on the EL path).
    const plannedVendor = routeVendor(lang.code, lang.label);
    if (plannedVendor === 'elevenlabs') {
      const budget = Number(process.env.DAILY_EL_CHAR_BUDGET || 200000);
      const used = await todaysElevenLabsChars();
      if (used > budget) {
        console.warn('[synth] budget tripped', { used, budget });
        return NextResponse.json(
          { error: 'maa_is_taking_a_break', retryAfter: secondsUntilMidnightUtc() },
          { status: 503 },
        );
      }
    }

    // PRD §4 — dispatcher handles EL → Sarvam fallback internally.
    let dispatched;
    try {
      dispatched = await synthesizeDispatched(script, archetype, lang, { signal: req.signal });
    } catch (err) {
      // PRD §4 — both vendors dead (or hard EL error): return 500.
      const e = err as Error;
      const isHardEL = err instanceof ElevenLabsError && !(err as ElevenLabsError).retriable;
      console.error('[synth] fatal', { code: (err as ElevenLabsError)?.code, msg: e.message });
      await incrMetric(isHardEL ? 'synth.elevenlabs.hard_fail' : 'synth.sarvam.fail');
      return NextResponse.json({
        error: 'synth_failed',
        vendor_chain: isHardEL ? ['elevenlabs'] : ['elevenlabs', 'sarvam'],
        detail: e.message,
      }, { status: 500 });
    }

    const supabase = serverClient();
    const id = generationId;
    const ext = dispatched.output_format === 'wav' ? 'wav' : 'mp3';
    const mime = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const path = `${id}.${ext}`;

    const uT0 = Date.now();
    const upload = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, dispatched.audio, { contentType: mime, upsert: false });
    if (upload.error) throw upload.error;
    const uploadMs = Date.now() - uT0;

    const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    const insert = await supabase
      .from('voice_notes')
      .insert({
        id,
        archetype,
        data: { ...body, name, email, tier, lang: lang.code, langLabel: lang.label, vendor: dispatched.vendor },
        audio_url: audioUrl,
      })
      .select()
      .single();
    if (insert.error) throw insert.error;

    // PRD §10.1 — structured log.
    console.log(JSON.stringify({
      event: 'synth.complete',
      generation_id: id,
      vendor: dispatched.vendor,
      archetype,
      lang: lang.code,
      chars: dispatched.char_count,
      synth_ms: dispatched.synth_ms,
      upload_ms: uploadMs,
      voice_note_id: id,
      request_id: dispatched.request_id,
      fallback_from: dispatched.fallback_from,
      fallback_reason: dispatched.fallback_reason,
    }));

    // PRD §7.3 — fire-and-forget archive + metrics.
    const archivePromise = archiveGeneration({
      generationId: id,
      vendor: dispatched.vendor,
      voiceId: dispatched.voice_id,
      modelId: dispatched.model_id,
      archetype,
      langCode: lang.code,
      langLabel: lang.label,
      voiceSettings: dispatched.voice_settings,
      inputText: script,
      outputFormat: dispatched.output_format,
      audioBuf: dispatched.audio,
      synthWallMs: dispatched.synth_ms,
      uploadWallMs: uploadMs,
      voiceNoteId: id,
      source: 'generate',
      requestId: dispatched.request_id ?? null,
    }).then(async (res) => {
      if (res.ok) {
        console.log(JSON.stringify({
          event: 'archive.ok',
          generation_id: id,
          archive_ms: res.archive_ms,
          storage_path: res.storage_path,
        }));
        await incrMetric('archive.ok');
      } else {
        console.error(JSON.stringify({
          event: 'archive.failed',
          generation_id: id,
          stage: res.stage,
          error: res.error,
        }));
        await incrMetric('archive.failed');
      }
    }).catch((err) => console.error('[archive]', err));

    // Metrics — counters + char totals.
    const metricKeys: Array<[string, number]> = [];
    if (dispatched.vendor === 'elevenlabs') {
      metricKeys.push(['synth.elevenlabs.ok', 1]);
      metricKeys.push(['chars.elevenlabs', dispatched.char_count]);
    } else {
      metricKeys.push(['synth.sarvam.ok', 1]);
      metricKeys.push(['chars.sarvam', dispatched.char_count]);
      if (dispatched.fallback_from === 'elevenlabs') {
        metricKeys.push(['synth.elevenlabs.fallback_to_sarvam', 1]);
      }
    }
    // Non-blocking; errors are swallowed inside incrMetric.
    Promise.all(metricKeys.map(([k, v]) => incrMetric(k, v))).catch(() => {});

    // Vercel serverless freezes the function once the response is sent, so
    // fire-and-forget promises get truncated. Await before returning — costs
    // ~1s of wall time, guarantees every synth is archived.
    await archivePromise;

    return NextResponse.json({
      id,
      archetype,
      tier,
      lang: lang.code,
      audioUrl,
      signature: signatureLine(archetype, slots),
      vendor: dispatched.vendor,
    });
  } catch (e: any) {
    console.error('[generate] fatal', e?.message, e?.stack);
    return NextResponse.json({ error: e.message || 'generate failed' }, { status: 500 });
  }
}
