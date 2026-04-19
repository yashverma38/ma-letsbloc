// PRD §2 — single dispatcher. Routes are hardcoded; no feature flag.
// This is the ONLY call site for synth functions; routes never import
// lib/sarvam or lib/elevenlabs directly.

import type { Archetype } from './types';
import type { SupportedLang } from './sarvam';
import { synthesize as sarvamSynth } from './sarvam';
import {
  synthesizeWithRetry,
  ElevenLabsError,
  VOICE_SETTINGS,
  DEFAULT_OUTPUT_FORMAT,
  type ElevenLabsVoiceSettings,
  type ElevenLabsOutputFormat,
} from './elevenlabs';

export type Vendor = 'elevenlabs' | 'sarvam';

// Hinglish label has no `translateTo` — it's the template-language default.
// Everything else is in LANG_OPTIONS with its own label/translateTo.
export function routeVendor(code: SupportedLang, label?: string): Vendor {
  if (code === 'hi-IN') return 'elevenlabs'; // Hinglish + Hindi (Roman)
  if (code === 'en-IN') return 'elevenlabs';
  return 'sarvam';
}

export type DispatchResult = {
  audio: Buffer;
  vendor: Vendor;
  voice_id: string;
  model_id: string;
  voice_settings: ElevenLabsVoiceSettings | SarvamVoiceSettings;
  output_format: ElevenLabsOutputFormat | 'wav';
  char_count: number;
  synth_ms: number;
  fallback_from?: Vendor;
  fallback_reason?: string;
  request_id?: string;
};

export type SarvamVoiceSettings = {
  speaker: string;
  pitch: number;
  pace: number;
  loudness: number;
};

const SARVAM_VOICE_SETTINGS: Record<Archetype, SarvamVoiceSettings> = {
  proud: { speaker: 'anushka', pitch: 0.15, pace: 1.0, loudness: 1.0 },
  sweet: { speaker: 'anushka', pitch: 0.0, pace: 0.95, loudness: 0.9 },
  rage:  { speaker: 'manisha', pitch: 0.3, pace: 1.15, loudness: 1.5 },
};

const SARVAM_MODEL = 'bulbul:v2';

export type DispatchOpts = {
  signal?: AbortSignal;
  // for tests / manual overrides
  forceVendor?: Vendor;
};

export async function synthesizeDispatched(
  text: string,
  archetype: Archetype,
  lang: { code: SupportedLang; label: string },
  opts: DispatchOpts = {},
): Promise<DispatchResult> {
  const vendor = opts.forceVendor ?? routeVendor(lang.code, lang.label);

  if (vendor === 'sarvam') {
    return await callSarvam(text, archetype, lang.code);
  }

  // PRD §4 — ElevenLabs primary.
  const t0 = Date.now();
  try {
    const r = await synthesizeWithRetry(text, archetype, { signal: opts.signal });
    return {
      audio: r.audio,
      vendor: 'elevenlabs',
      voice_id: r.voice_id,
      model_id: r.model_id,
      voice_settings: r.voice_settings,
      output_format: r.output_format,
      char_count: r.char_count,
      synth_ms: Date.now() - t0,
      request_id: r.request_id,
    };
  } catch (err) {
    const e = err as ElevenLabsError;
    // PRD §4 — hard errors propagate. Only retriable → Sarvam.
    if (!(e instanceof ElevenLabsError) || !e.retriable) throw err;

    console.warn('[tts] elevenlabs failed, falling back to sarvam', {
      code: e.code,
      status: e.status,
      request_id: e.requestId,
    });
    const fb = await callSarvam(text, archetype, lang.code);
    return { ...fb, fallback_from: 'elevenlabs', fallback_reason: e.code };
  }
}

async function callSarvam(
  text: string,
  archetype: Archetype,
  code: SupportedLang,
): Promise<DispatchResult> {
  const t0 = Date.now();
  const audio = await sarvamSynth(text, code, archetype);
  return {
    audio,
    vendor: 'sarvam',
    voice_id: SARVAM_VOICE_SETTINGS[archetype].speaker,
    model_id: SARVAM_MODEL,
    voice_settings: SARVAM_VOICE_SETTINGS[archetype],
    output_format: 'wav',
    // Sarvam caps at 1500; truncation happens inside sarvam.ts.
    char_count: Math.min(text.length, 1500),
    synth_ms: Date.now() - t0,
  };
}

export { VOICE_SETTINGS, DEFAULT_OUTPUT_FORMAT, SARVAM_VOICE_SETTINGS };
