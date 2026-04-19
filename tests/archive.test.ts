import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE ||= 'test_service_role';

// -----------------------------------------------------------
// PRD §7.3 — archive success path + failure-row fallback.
// We stub createClient by swapping global fetch; easier to directly
// monkey-patch serverClient via module cache.
// -----------------------------------------------------------

type StoredRow = { table: string; row: any };

function makeFakeClient(opts: {
  uploadError?: string;
  insertError?: Record<string, string>;
  captured: { storage: any[]; rows: StoredRow[] };
}) {
  const { captured } = opts;
  return {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, body: Buffer, options: any) {
            captured.storage.push({ bucket, path, size: body.byteLength, options });
            if (opts.uploadError) return { error: { message: opts.uploadError } };
            return { error: null, data: { path } };
          },
        };
      },
    },
    from(table: string) {
      return {
        async insert(row: any) {
          captured.rows.push({ table, row });
          const err = opts.insertError?.[table];
          if (err) return { error: { message: err } };
          return { error: null };
        },
      };
    },
    rpc: async () => ({ error: null }),
  } as any;
}

async function withStubbedClient<T>(
  stub: any,
  fn: () => Promise<T>,
): Promise<T> {
  const { setServerClientForTests } = await import('../lib/supabase');
  setServerClientForTests(stub);
  try { return await fn(); }
  finally { setServerClientForTests(null); }
}

test('archiveGeneration: happy path writes bucket + row', async () => {
  const captured: { storage: any[]; rows: StoredRow[] } = { storage: [], rows: [] };
  const stub = makeFakeClient({ captured });
  const { archiveGeneration } = await import('../lib/archive');
  const result = await withStubbedClient(stub, () => archiveGeneration({
    generationId: 'gen-1' + Date.now(),
    vendor: 'elevenlabs',
    voiceId: 'vox',
    modelId: 'mdl',
    archetype: 'sweet',
    langCode: 'hi-IN',
    langLabel: 'Hinglish',
    voiceSettings: { stability: 0.5, style: 0.3, similarityBoost: 0.85, useSpeakerBoost: true } as any,
    inputText: 'x'.repeat(120),
    outputFormat: 'mp3_44100_128',
    audioBuf: Buffer.from('AUDIO'),
    synthWallMs: 1000,
    uploadWallMs: 200,
    voiceNoteId: 'vn-1',
    source: 'generate',
    requestId: 'req-1',
  }));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.storage_path, /^\d{4}-\d{2}-\d{2}\/gen-1\d*\.mp3$/);
  }
  assert.equal(captured.storage.length, 1);
  assert.equal(captured.rows.length, 1);
  assert.equal(captured.rows[0].table, 'voice_generations');
  assert.equal(captured.rows[0].row.vendor, 'elevenlabs');
  assert.equal(captured.rows[0].row.input_text_chars, 120);
});

test('archiveGeneration: upload failure writes to voice_generations_failed', async () => {
  const captured: { storage: any[]; rows: StoredRow[] } = { storage: [], rows: [] };
  const stub = makeFakeClient({ captured, uploadError: 'bucket exploded' });
  const { archiveGeneration } = await import('../lib/archive');
  const result = await withStubbedClient(stub, () => archiveGeneration({
    generationId: 'gen-2',
    vendor: 'elevenlabs',
    voiceId: 'vox',
    modelId: 'mdl',
    archetype: 'rage',
    langCode: 'hi-IN',
    langLabel: 'Hinglish',
    voiceSettings: { stability: 0.3, style: 0.75, similarityBoost: 0.8, useSpeakerBoost: true } as any,
    inputText: 'x'.repeat(60),
    outputFormat: 'mp3_44100_128',
    audioBuf: Buffer.from('AUDIO'),
    synthWallMs: 1,
    uploadWallMs: 1,
    voiceNoteId: null,
    source: 'generate',
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.stage, 'audio_upload');
  const fail = captured.rows.find((r) => r.table === 'voice_generations_failed');
  assert.ok(fail, 'expected a voice_generations_failed row');
  assert.equal(fail!.row.stage, 'audio_upload');
});

test('archiveGeneration: row insert failure also writes failure row', async () => {
  const captured: { storage: any[]; rows: StoredRow[] } = { storage: [], rows: [] };
  const stub = makeFakeClient({
    captured,
    insertError: { voice_generations: 'permission denied' },
  });
  const { archiveGeneration } = await import('../lib/archive');
  const result = await withStubbedClient(stub, () => archiveGeneration({
    generationId: 'gen-3',
    vendor: 'sarvam',
    voiceId: 'anushka',
    modelId: 'bulbul:v2',
    archetype: 'sweet',
    langCode: 'ta-IN',
    langLabel: 'Tamil',
    voiceSettings: { speaker: 'anushka', pitch: 0, pace: 1, loudness: 1 } as any,
    inputText: 'x'.repeat(60),
    outputFormat: 'wav',
    audioBuf: Buffer.from('AUDIO'),
    synthWallMs: 1,
    uploadWallMs: 1,
    voiceNoteId: null,
    source: 'generate',
  }));
  assert.equal(result.ok, false);
  const fail = captured.rows.find((r) => r.table === 'voice_generations_failed');
  assert.ok(fail, 'expected a voice_generations_failed row');
  assert.equal(fail!.row.stage, 'row_insert');
});
