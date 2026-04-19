import { NextRequest, NextResponse } from 'next/server';
import { analyzeScreenshot } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'no image' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const data = await analyzeScreenshot(buf.toString('base64'), file.type || 'image/png');
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'analyze failed' }, { status: 500 });
  }
}
