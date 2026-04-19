import { NextRequest, NextResponse } from 'next/server';
import { pickArchetype } from '@/lib/archetype';
import { buildScript, signatureLine } from '@/lib/scripts';
import { synthesize } from '@/lib/elevenlabs';
import { serverClient, AUDIO_BUCKET } from '@/lib/supabase';
import type { ScreenTimeData } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScreenTimeData;
    if (!body || typeof body.totalHours !== 'number') {
      return NextResponse.json({ error: 'bad input' }, { status: 400 });
    }

    const name = (body.name || 'beta').trim().split(/\s+/)[0];
    const archetype = pickArchetype(body);
    const slots = { ...body, name };
    const script = buildScript(archetype, slots);
    const audioBuf = await synthesize(script);

    const supabase = serverClient();
    const id = crypto.randomUUID();
    const path = `${id}.mp3`;

    const upload = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, Buffer.from(audioBuf), { contentType: 'audio/mpeg', upsert: false });
    if (upload.error) throw upload.error;

    const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    const insert = await supabase
      .from('voice_notes')
      .insert({
        id,
        archetype,
        data: { ...body, name },
        audio_url: audioUrl,
      })
      .select()
      .single();
    if (insert.error) throw insert.error;

    return NextResponse.json({
      id,
      archetype,
      audioUrl,
      signature: signatureLine(archetype, slots),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'generate failed' }, { status: 500 });
  }
}
