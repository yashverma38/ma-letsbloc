import { NextRequest, NextResponse } from 'next/server';
import { pickArchetype, pickTier } from '@/lib/archetype';
import { buildScript, signatureLine } from '@/lib/scripts';
import { synthesize } from '@/lib/sarvam';
import { translateScript, validateTranslation } from '@/lib/gemini';
import { findLang } from '@/lib/languages';
import { serverClient, AUDIO_BUCKET } from '@/lib/supabase';
import type { ScreenTimeData } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = ScreenTimeData & { lang?: string };

async function translateWithRetry(baseScript: string, targetLabel: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const candidate = await translateScript(baseScript, targetLabel);
      const { ok, missing } = validateTranslation(baseScript, candidate);
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
  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body.totalHours !== 'number') {
      return NextResponse.json({ error: 'bad input' }, { status: 400 });
    }

    const name = (body.name || 'beta').trim().split(/\s+/)[0];
    const tier = pickTier(body);
    const archetype = pickArchetype(body);
    const lang = findLang(body.lang || '');
    const slots = { ...body, name };

    const baseScript = buildScript(archetype, slots);
    let script = baseScript;

    if (lang.translateTo) {
      script = await translateWithRetry(baseScript, lang.translateTo);
    }

    const audioBuf = await synthesize(script, lang.code, archetype);

    const supabase = serverClient();
    const id = crypto.randomUUID();
    const path = `${id}.wav`;

    const upload = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, audioBuf, { contentType: 'audio/wav', upsert: false });
    if (upload.error) throw upload.error;

    const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    const insert = await supabase
      .from('voice_notes')
      .insert({
        id,
        archetype,
        data: { ...body, name, tier, lang: lang.code, langLabel: lang.label },
        audio_url: audioUrl,
      })
      .select()
      .single();
    if (insert.error) throw insert.error;

    return NextResponse.json({
      id,
      archetype,
      tier,
      lang: lang.code,
      audioUrl,
      signature: signatureLine(archetype, slots),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'generate failed' }, { status: 500 });
  }
}
