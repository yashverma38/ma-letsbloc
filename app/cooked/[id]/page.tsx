import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverClient } from '@/lib/supabase';
import { ARCHETYPE_LABEL } from '@/lib/archetype';
import { signatureLine } from '@/lib/scripts';
import type { Archetype, ScreenTimeData } from '@/lib/types';
import ResultClient from '@/components/ResultClient';

export const dynamic = 'force-dynamic';

export default async function Result({ params }: { params: { id: string } }) {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from('voice_notes')
    .select('id, archetype, audio_url, data')
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  const archetype = data.archetype as Archetype;
  const screen = data.data as ScreenTimeData;
  const sig = signatureLine(archetype, { ...screen, name: screen.name?.trim() || 'bachha' });
  const label = ARCHETYPE_LABEL[archetype];

  return (
    <ResultClient
      id={data.id}
      archetype={archetype}
      label={label}
      audioUrl={data.audio_url}
      signature={sig}
      data={screen}
    />
  );
}
