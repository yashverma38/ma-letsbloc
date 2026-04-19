import { notFound } from 'next/navigation';
import { serverClient } from '@/lib/supabase';
import type { ScreenTimeData } from '@/lib/types';
import AwareClient from './AwareClient';

export const dynamic = 'force-dynamic';

export default async function Aware({ params }: { params: { id: string } }) {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from('voice_notes')
    .select('id, data')
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  const screen = data.data as ScreenTimeData;

  return <AwareClient id={data.id} data={screen} />;
}
