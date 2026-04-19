import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, source } = (await req.json()) as { email?: string; source?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      console.log('[waitlist:unconfigured]', { email, source });
      return NextResponse.json({ ok: true, queued: 'console' });
    }

    const supabase = serverClient();
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email, source: source || 'ma.letsbloc.com' }, { onConflict: 'email' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'waitlist failed' }, { status: 500 });
  }
}
