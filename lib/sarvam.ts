import type { Archetype } from './types';

const ENDPOINT = 'https://api.sarvam.ai/text-to-speech';
const MODEL = 'bulbul:v2';

type VoiceConfig = { speaker: string; pitch: number; pace: number; loudness: number };

// Each tier gets its own intonation signature so Maa doesn't sound flat.
const VOICE: Record<Archetype, VoiceConfig> = {
  proud: { speaker: 'anushka', pitch: 0.15, pace: 1.0, loudness: 1.0 },
  sweet: { speaker: 'anushka', pitch: 0.0, pace: 0.95, loudness: 0.9 },
  rage:  { speaker: 'manisha', pitch: 0.3, pace: 1.15, loudness: 1.5 },
};

export type SupportedLang = 'hi-IN' | 'en-IN' | 'ta-IN' | 'bn-IN' | 'mr-IN' | 'pa-IN' | 'te-IN' | 'gu-IN';

export async function synthesize(
  text: string,
  lang: SupportedLang,
  archetype: Archetype,
): Promise<Buffer> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('SARVAM_API_KEY not set');

  const cfg = VOICE[archetype];

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'api-subscription-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 1500),
      target_language_code: lang,
      speaker: cfg.speaker,
      model: MODEL,
      pitch: cfg.pitch,
      pace: cfg.pace,
      loudness: cfg.loudness,
      enable_preprocessing: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sarvam ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const b64 = data?.audios?.[0];
  if (!b64) throw new Error('Sarvam: no audio in response');
  return Buffer.from(b64, 'base64');
}
