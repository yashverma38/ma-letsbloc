'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Upload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [step, setStep] = useState<'idle' | 'analyzing' | 'generating' | 'error'>('idle');
  const [err, setErr] = useState('');

  function onPick(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function go() {
    if (!file) {
      setErr('Pick a screenshot first.');
      return;
    }
    setErr('');
    setStep('analyzing');
    try {
      const form = new FormData();
      form.append('image', file);
      const r1 = await fetch('/api/analyze', { method: 'POST', body: form });
      if (!r1.ok) throw new Error((await r1.json()).error || 'analyze failed');
      const data = await r1.json();

      setStep('generating');
      const r2 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, name: name.trim() || undefined }),
      });
      if (!r2.ok) throw new Error((await r2.json()).error || 'generate failed');
      const { id } = await r2.json();

      router.push(`/cooked/${id}`);
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
      setStep('error');
    }
  }

  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      <div className="fixed top-5 left-5 text-[11px] uppercase tracking-[0.08em] text-white/35 z-10">
        <Link href="/" className="hover:text-white/70">← back</Link>
      </div>

      <div className="w-full max-w-md fade-in">
        <h1 className="text-[26px] font-semibold text-center mb-2">Drop your week.</h1>
        <p className="text-[14px] text-white/60 text-center leading-[1.5] mb-6 max-w-sm mx-auto">
          Upload your <strong className="text-white">weekly</strong> screen time — 7 days, not today.
          Daily views give Maa only half the story.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 mb-6 max-w-sm mx-auto text-[12px] text-white/60 leading-[1.6]">
          <div className="text-white/80 font-medium mb-1.5">How to grab the week view:</div>
          <div><strong className="text-white/80">iOS:</strong> Settings → Screen Time → See All Activity → tap <em>Week</em> → screenshot</div>
          <div className="mt-1"><strong className="text-white/80">Android:</strong> Settings → Digital Wellbeing → Dashboard → weekly bar chart → screenshot</div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] || null)}
            />
            <div className="field flex items-center justify-center min-h-[180px] flex-col gap-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-[260px] rounded-lg object-contain" />
              ) : (
                <>
                  <div className="text-3xl">📱</div>
                  <div className="text-sm text-white/70">Tap to upload weekly screenshot</div>
                  <div className="text-[11px] text-white/40">7-day view · PNG / JPG · deleted in 24hr</div>
                </>
              )}
            </div>
          </label>

          <input
            type="text"
            className="field"
            placeholder="first name (optional — Maa will use it)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />

          <button
            onClick={go}
            className="btn-primary"
            disabled={step === 'analyzing' || step === 'generating'}
          >
            {step === 'analyzing' && 'Maa is reading your screen time...'}
            {step === 'generating' && 'Maa is recording her voice note...'}
            {(step === 'idle' || step === 'error') && '📞 Get Maa on the line'}
          </button>
          <div className="text-[12px] text-center min-h-[16px] text-[#ff7a6b]">{err}</div>
        </div>

        <div className="text-center mt-6">
          <Link href="/cooked/manual" className="text-[12px] text-white/50 hover:text-white/80 underline underline-offset-4">
            no screenshot? tell Maa yourself →
          </Link>
        </div>

        <p className="text-[11px] text-white/40 text-center mt-8 max-w-sm mx-auto leading-[1.5]">
          All voices are AI-generated. No real mothers were used in the making of this product.
          Your screen time is processed in-browser and deleted within 24 hours. No account required.
        </p>
      </div>
    </div>
  );
}
