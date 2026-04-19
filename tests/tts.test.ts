// Node built-in test runner. Run with: npx tsx --test tests/**/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Required SDK-side env (dispatcher reads these).
process.env.ELEVENLABS_API_KEY ||= 'sk_test';
process.env.ELEVENLABS_MAA_VOICE_ID ||= 'test_voice';
process.env.ELEVENLABS_MODEL_ID ||= 'eleven_multilingual_v2';
process.env.SARVAM_API_KEY ||= 'test_sarvam';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE ||= 'test_service_role';

import { routeVendor, synthesizeDispatched } from '../lib/tts';
import { clampInput, sanitizeInput, ElevenLabsError, setClientForTests } from '../lib/elevenlabs';

// -----------------------------------------------------------
// PRD §2 — routeVendor table.
// -----------------------------------------------------------
test('routeVendor: Hinglish routes to elevenlabs', () => {
  assert.equal(routeVendor('hi-IN', 'Hinglish'), 'elevenlabs');
});
test('routeVendor: Hindi Roman routes to elevenlabs', () => {
  assert.equal(routeVendor('hi-IN', 'Hindi'), 'elevenlabs');
});
test('routeVendor: Indian English routes to elevenlabs', () => {
  assert.equal(routeVendor('en-IN', 'Indian English'), 'elevenlabs');
});
for (const code of ['ta-IN', 'bn-IN', 'mr-IN', 'pa-IN', 'te-IN', 'gu-IN'] as const) {
  test(`routeVendor: ${code} routes to sarvam`, () => {
    assert.equal(routeVendor(code, 'X'), 'sarvam');
  });
}

// -----------------------------------------------------------
// PRD §3.4 — input sanitation + clamping.
// -----------------------------------------------------------
test('sanitizeInput strips zero-width + emote tags + null bytes', () => {
  const raw = 'Hello\u200Bworld\u0000 {emote:sigh}';
  assert.equal(sanitizeInput(raw), 'Helloworld');
});

test('clampInput throws InputTooShort on <50 chars', () => {
  assert.throws(() => clampInput('too short'), (e: any) => e.code === 'invalid_input');
});

test('clampInput truncates at last period within 4500 chars', () => {
  const base = 'A'.repeat(4400) + '. ' + 'B'.repeat(300); // 4703 total
  const out = clampInput(base);
  assert.ok(out.length <= 4500);
  assert.ok(out.endsWith('.'));
});

test('clampInput passes through text between 50 and 4500 chars', () => {
  const text = 'Hello Maa, this is a normal script with enough characters to pass the minimum bar. '.repeat(3);
  const out = clampInput(text);
  assert.equal(out, text.trim());
});

// -----------------------------------------------------------
// PRD §4 — fallback chain (retriable → Sarvam, hard → propagate).
// -----------------------------------------------------------
function makeStubClient(mode: 'rate_limit' | 'unauthorized' | 'ok') {
  const err = (code: any, status: number) => {
    const e = new ElevenLabsError(`simulated ${code}`, code, { status });
    return Promise.reject(e);
  };
  // Minimal stub that matches the surface we touch.
  const stub = {
    textToSpeech: {
      stream: () => {
        const p: any = (mode === 'rate_limit')
          ? err('rate_limit', 429)
          : (mode === 'unauthorized')
            ? err('unauthorized', 401)
            : Promise.resolve({
                // ok path is unused in fallback tests (Sarvam is called instead).
              });
        p.withRawResponse = () => p;
        return p;
      },
      convert: () => {
        const p: any = Promise.resolve({});
        p.withRawResponse = () => p;
        return p;
      },
    },
  } as any;
  return stub;
}

// Monkey-patch Sarvam synth for tests — use the public API via globalThis.fetch mock.
import * as sarvamMod from '../lib/sarvam';

async function runWithMockedSarvam<T>(audio: Buffer, fn: () => Promise<T>): Promise<T> {
  const origFetch = globalThis.fetch;
  // @ts-expect-error stubbing
  globalThis.fetch = async (url: any, init: any) => {
    if (String(url).includes('sarvam')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ audios: [audio.toString('base64')] }),
        text: async () => '',
      } as any;
    }
    return origFetch(url, init);
  };
  try { return await fn(); }
  finally { globalThis.fetch = origFetch; }
}

test('dispatcher: retriable EL error → Sarvam fallback archives as sarvam', async () => {
  setClientForTests(makeStubClient('rate_limit'));
  const fakeAudio = Buffer.from('FAKE_SARVAM_WAV');
  const result = await runWithMockedSarvam(fakeAudio, () =>
    synthesizeDispatched(
      'a'.repeat(200),
      'sweet',
      { code: 'hi-IN', label: 'Hinglish' },
    ),
  );
  assert.equal(result.vendor, 'sarvam');
  assert.equal(result.fallback_from, 'elevenlabs');
  assert.equal(result.fallback_reason, 'rate_limit');
  assert.equal(result.audio.toString('utf-8'), 'FAKE_SARVAM_WAV');
  setClientForTests(null);
});

test('dispatcher: hard EL error (401) propagates — does NOT fall back', async () => {
  setClientForTests(makeStubClient('unauthorized'));
  await assert.rejects(
    synthesizeDispatched('a'.repeat(200), 'sweet', { code: 'hi-IN', label: 'Hinglish' }),
    (e: any) => e.code === 'unauthorized',
  );
  setClientForTests(null);
});

test('dispatcher: regional lang → directly Sarvam (no EL call)', async () => {
  // Even with a broken EL stub, Tamil must bypass EL entirely.
  setClientForTests(makeStubClient('unauthorized'));
  const fakeAudio = Buffer.from('TAMIL_WAV');
  const result = await runWithMockedSarvam(fakeAudio, () =>
    synthesizeDispatched('a'.repeat(200), 'sweet', { code: 'ta-IN', label: 'Tamil' }),
  );
  assert.equal(result.vendor, 'sarvam');
  assert.equal(result.fallback_from, undefined);
  setClientForTests(null);
});
