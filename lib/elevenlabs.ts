import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ElevenLabsError as SdkElevenLabsError } from '@elevenlabs/elevenlabs-js/errors';
import type { Archetype } from './types';
import { applyEmotionalMarkup } from './emote';

// PRD §3 — ElevenLabs v2 client.
// Single voice (hnKzg0jArhzTMMkNbrXJ) with three archetype-scoped voice_settings.
// We always stream then collect to a Buffer (§5).

export type ElevenLabsOutputFormat =
  | 'mp3_44100_128'
  | 'mp3_44100_64'
  | 'mp3_22050_32';

export type ElevenLabsVoiceSettings = {
  stability: number;
  style: number;
  similarityBoost: number;
  useSpeakerBoost: boolean;
};

// PRD §3.2 — sealed per-archetype brand decisions. Do NOT move to env.
export const VOICE_SETTINGS: Record<Archetype, ElevenLabsVoiceSettings> = {
  proud: { stability: 0.70, style: 0.20, similarityBoost: 0.85, useSpeakerBoost: true },
  sweet: { stability: 0.55, style: 0.35, similarityBoost: 0.85, useSpeakerBoost: true },
  rage:  { stability: 0.30, style: 0.75, similarityBoost: 0.80, useSpeakerBoost: true },
};

export const DEFAULT_OUTPUT_FORMAT: ElevenLabsOutputFormat = 'mp3_44100_128';

// PRD §3.5 — error taxonomy.
export type ElevenLabsErrorCode =
  | 'rate_limit'
  | 'unauthorized'
  | 'voice_not_found'
  | 'model_deprecated'
  | 'server'
  | 'quota_exceeded'
  | 'invalid_input'
  | 'abort'
  | 'unknown';

export class ElevenLabsError extends Error {
  code: ElevenLabsErrorCode;
  status?: number;
  requestId?: string;
  retriable: boolean;
  constructor(message: string, code: ElevenLabsErrorCode, opts: { status?: number; requestId?: string } = {}) {
    super(message);
    this.name = 'ElevenLabsError';
    this.code = code;
    this.status = opts.status;
    this.requestId = opts.requestId;
    // PRD §4 — only 429 / 5xx / abort fall back to Sarvam.
    this.retriable = code === 'rate_limit' || code === 'server' || code === 'abort';
  }
}

export type SynthesisResult = {
  audio: Buffer;
  char_count: number;
  duration_ms?: number;
  vendor: 'elevenlabs';
  model_id: string;
  voice_id: string;
  voice_settings: ElevenLabsVoiceSettings;
  output_format: ElevenLabsOutputFormat;
  request_id?: string;
};

const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\uFEFF]/g;
const EMOTE_TAG_RE = /\{emote:[^}]*\}/gi;

// PRD §3.4 — input sanitation.
export function sanitizeInput(raw: string): string {
  return raw
    .replace(ZERO_WIDTH_RE, '')
    .replace(EMOTE_TAG_RE, '')
    .replace(/\u0000/g, '')
    .normalize('NFC')
    .trim();
}

const MIN_CHARS = 50;
const MAX_CHARS = 4500;

// PRD §3.4 — truncate at last `.` within budget; never chunk.
export function clampInput(text: string): string {
  const t = sanitizeInput(text);
  if (t.length < MIN_CHARS) {
    throw new ElevenLabsError(
      `input too short: ${t.length} < ${MIN_CHARS}`,
      'invalid_input',
    );
  }
  if (t.length <= MAX_CHARS) return t;
  const slice = t.slice(0, MAX_CHARS);
  const lastDot = slice.lastIndexOf('.');
  if (lastDot >= MIN_CHARS) return slice.slice(0, lastDot + 1);
  return slice; // no period boundary — hard cut
}

function mapSdkError(err: unknown): ElevenLabsError {
  if (err instanceof ElevenLabsError) return err;

  // Abort from upstream
  if (err && typeof err === 'object' && (err as any).name === 'AbortError') {
    return new ElevenLabsError('aborted', 'abort');
  }

  if (err instanceof SdkElevenLabsError) {
    const status = err.statusCode;
    const body = (err.body as any) ?? {};
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const requestId = (err.rawResponse as any)?.headers?.get?.('x-request-id');
    const detailStatus = body?.detail?.status as string | undefined;

    if (status === 401) return new ElevenLabsError('unauthorized', 'unauthorized', { status, requestId });
    if (status === 402) return new ElevenLabsError('payment required', 'quota_exceeded', { status, requestId });
    if (status === 404) return new ElevenLabsError('voice not found', 'voice_not_found', { status, requestId });
    if (status === 422) {
      // Could be invalid_input OR model deprecated.
      if (/model/i.test(bodyStr) && /not_found|deprecated|unknown/i.test(bodyStr)) {
        return new ElevenLabsError('model deprecated', 'model_deprecated', { status, requestId });
      }
      return new ElevenLabsError(`invalid input: ${bodyStr.slice(0, 200)}`, 'invalid_input', { status, requestId });
    }
    if (status === 429) return new ElevenLabsError('rate limited', 'rate_limit', { status, requestId });
    if (detailStatus === 'quota_exceeded') return new ElevenLabsError('quota exceeded', 'quota_exceeded', { status, requestId });
    if (status && status >= 500) return new ElevenLabsError(`server ${status}`, 'server', { status, requestId });
    return new ElevenLabsError(`elevenlabs ${status ?? '?'}`, 'unknown', { status, requestId });
  }

  const msg = err instanceof Error ? err.message : String(err);
  // Opaque network / stream errors treated as server-class so we fall back.
  return new ElevenLabsError(msg || 'unknown', 'server');
}

let _client: ElevenLabsClient | null = null;
function getClient(): ElevenLabsClient {
  if (_client) return _client;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new ElevenLabsError('ELEVENLABS_API_KEY not set', 'unauthorized');
  _client = new ElevenLabsClient({ apiKey });
  return _client;
}

export function resetClientForTests() {
  _client = null;
}

export function setClientForTests(client: ElevenLabsClient | null) {
  _client = client;
}

const CHUNK_TIMEOUT_MS = 10_000;

async function collectStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      // PRD §5 — chunk stall detection.
      const timeout = new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new ElevenLabsError('stream stalled', 'server')), CHUNK_TIMEOUT_MS);
        signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new ElevenLabsError('aborted', 'abort'));
        }, { once: true });
      });
      const { value, done } = (await Promise.race([reader.read(), timeout])) as ReadableStreamReadResult<Uint8Array>;
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export type SynthesizeOpts = {
  stream?: boolean;
  signal?: AbortSignal;
  outputFormat?: ElevenLabsOutputFormat;
};

export async function synthesize(
  text: string,
  archetype: Archetype,
  opts: SynthesizeOpts = {},
): Promise<SynthesisResult> {
  const voiceId = process.env.ELEVENLABS_MAA_VOICE_ID;
  if (!voiceId) throw new ElevenLabsError('ELEVENLABS_MAA_VOICE_ID not set', 'voice_not_found');
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const outputFormat = (opts.outputFormat
    || (process.env.ELEVENLABS_OUTPUT_FORMAT as ElevenLabsOutputFormat | undefined)
    || DEFAULT_OUTPUT_FORMAT);

  // P2 — prosody markup layered over the clamped script. Idempotent.
  const clean = applyEmotionalMarkup(clampInput(text), archetype, modelId);
  const voiceSettings = VOICE_SETTINGS[archetype];
  const client = getClient();

  const useStream = opts.stream !== false; // default true

  try {
    const pending = useStream
      ? client.textToSpeech.stream(voiceId, {
          text: clean,
          modelId,
          outputFormat: outputFormat as any,
          voiceSettings,
        }, { abortSignal: opts.signal as any })
      : client.textToSpeech.convert(voiceId, {
          text: clean,
          modelId,
          outputFormat: outputFormat as any,
          voiceSettings,
        }, { abortSignal: opts.signal as any });

    const wrapped = await pending.withRawResponse();
    const body = wrapped.data as ReadableStream<Uint8Array>;
    // PRD §14 — 200 with empty body → server error → retry/fallback chain.
    const rawHeaders: any = (wrapped as any).rawResponse?.headers;
    const requestId = typeof rawHeaders?.get === 'function' ? rawHeaders.get('x-request-id') : undefined;
    const audio = await collectStream(body, opts.signal);
    if (audio.length === 0) {
      throw new ElevenLabsError('empty audio body', 'server', { requestId });
    }
    return {
      audio,
      char_count: clean.length,
      vendor: 'elevenlabs',
      model_id: modelId,
      voice_id: voiceId,
      voice_settings: voiceSettings,
      output_format: outputFormat,
      request_id: requestId,
    };
  } catch (err) {
    throw mapSdkError(err);
  }
}

// PRD §4 — 5xx retry once with 250ms backoff. Used by the dispatcher.
export async function synthesizeWithRetry(
  text: string,
  archetype: Archetype,
  opts: SynthesizeOpts = {},
): Promise<SynthesisResult> {
  try {
    return await synthesize(text, archetype, opts);
  } catch (err) {
    const e = err as ElevenLabsError;
    if (e.code === 'server') {
      await new Promise((r) => setTimeout(r, 250));
      return await synthesize(text, archetype, opts);
    }
    throw err;
  }
}
