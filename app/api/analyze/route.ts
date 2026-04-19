import { NextRequest, NextResponse } from 'next/server';
import { analyzeScreenshots } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('images').filter((v): v is File => v instanceof File);

    if (files.length < 1) {
      return NextResponse.json({ error: 'at least one image required' }, { status: 400 });
    }
    if (files.length > 4) {
      return NextResponse.json({ error: 'max 4 images' }, { status: 400 });
    }

    const images = await Promise.all(
      files.map(async (f) => ({
        base64: Buffer.from(await f.arrayBuffer()).toString('base64'),
        mimeType: f.type || 'image/png',
      })),
    );

    const data = await analyzeScreenshots(images);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'analyze failed' }, { status: 500 });
  }
}
