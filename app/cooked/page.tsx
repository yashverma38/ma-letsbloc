'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LANG_OPTIONS } from '@/lib/languages';

type Slot = 'overview' | 'mostUsed' | 'pickups' | 'notifications';

const SLOTS: { key: Slot; title: string; hint: string }[] = [
  {
    key: 'overview',
    title: '1. Week Overview',
    hint: 'The bar chart + Total Screen Time',
  },
  {
    key: 'mostUsed',
    title: '2. Most Used',
    hint: 'Scroll down to the per-app list',
  },
  {
    key: 'pickups',
    title: '3. Pickups',
    hint: 'Tap the Pickups tab',
  },
  {
    key: 'notifications',
    title: '4. Notifications',
    hint: 'Tap the Notifications tab',
  },
];

export default function Upload() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<Slot, File | null>>({
    overview: null,
    mostUsed: null,
    pickups: null,
    notifications: null,
  });
  const [previews, setPreviews] = useState<Record<Slot, string | null>>({
    overview: null,
    mostUsed: null,
    pickups: null,
    notifications: null,
  });
  const [name, setName] = useState('');
  const [langKey, setLangKey] = useState(`${LANG_OPTIONS[0].code}|${LANG_OPTIONS[0].label}`);
  const [step, setStep] = useState<'idle' | 'analyzing' | 'generating' | 'error'>('idle');
  const [err, setErr] = useState('');

  function pick(slot: Slot, f: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: f }));
    setPreviews((prev) => ({ ...prev, [slot]: f ? URL.createObjectURL(f) : null }));
  }

  const uploaded = Object.values(files).filter(Boolean).length;
  const ready = uploaded >= 1;

  async function go() {
    if (!ready) {
      setErr('Upload at least the Week Overview screenshot.');
      return;
    }
    setErr('');
    setStep('analyzing');
    try {
      const form = new FormData();
      for (const slot of SLOTS) {
        const f = files[slot.key];
        if (f) form.append('images', f);
      }
      const r1 = await fetch('/api/analyze', { method: 'POST', body: form });
      if (!r1.ok) throw new Error((await r1.json()).error || 'analyze failed');
      const data = await r1.json();

      setStep('generating');
      const r2 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, name: name.trim() || undefined, lang: langKey }),
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

      <div className="w-full max-w-xl fade-in">
        <h1 className="text-[26px] font-semibold text-center mb-2">Drop your week.</h1>
        <p className="text-[14px] text-white/60 text-center leading-[1.5] mb-6 max-w-md mx-auto">
          Upload your <strong className="text-white">weekly</strong> Screen Time — 4 screenshots,
          one week of damage. The more Maa sees, the more she has to say.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 mb-6 text-[12px] text-white/60 leading-[1.6]">
          <div className="text-white/80 font-medium mb-1.5">Where to find each view (iOS):</div>
          <div>Settings → Screen Time → See All Activity → tap <em>Week</em></div>
          <div>Then screenshot: the overview, the Most Used list, the Pickups tab, the Notifications tab.</div>
          <div className="mt-2 text-white/50">Android (Digital Wellbeing): the weekly dashboard + the per-category drilldowns for app times, unlocks, and notifications.</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {SLOTS.map((slot) => {
            const preview = previews[slot.key];
            const isExample = slot.key === 'overview' && !preview;
            return (
              <label key={slot.key} className="relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pick(slot.key, e.target.files?.[0] || null)}
                />
                <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors overflow-hidden">
                  <div className="aspect-[9/16] flex items-center justify-center bg-black/40 relative">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={slot.title} className="w-full h-full object-contain" />
                    ) : isExample ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/examples/01-week-overview.png"
                          alt="example week overview"
                          className="w-full h-full object-contain opacity-40"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                          <div className="text-xl">📱</div>
                          <div className="text-[11px] text-white/70">tap to upload</div>
                          <div className="text-[9px] text-white/50 uppercase tracking-wider">example shown</div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 opacity-70">
                        <div className="text-2xl">📱</div>
                        <div className="text-[11px] text-white/60">tap to upload</div>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5 border-t border-white/5">
                    <div className="text-[12px] text-white/85 font-medium">{slot.title}</div>
                    <div className="text-[10px] text-white/45 leading-tight mt-0.5">{slot.hint}</div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 max-w-md mx-auto">
          <input
            type="text"
            className="field"
            placeholder="first name (optional — Maa will use it)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">Which language should Maa call in?</div>
            <select
              className="field"
              value={langKey}
              onChange={(e) => setLangKey(e.target.value)}
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={`${opt.code}|${opt.label}`} value={`${opt.code}|${opt.label}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={go}
            className="btn-primary"
            disabled={!ready || step === 'analyzing' || step === 'generating'}
          >
            {step === 'analyzing' && 'Maa is reading your week...'}
            {step === 'generating' && 'Maa is recording her voice note...'}
            {(step === 'idle' || step === 'error') &&
              (ready ? `📞 Get Maa on the line (${uploaded}/4)` : 'Upload at least 1 screenshot')}
          </button>
          <div className="text-[12px] text-center min-h-[16px] text-[#ff7a6b]">{err}</div>
        </div>

        <div className="text-center mt-6">
          <Link href="/cooked/manual" className="text-[12px] text-white/50 hover:text-white/80 underline underline-offset-4">
            no screenshots? tell Maa yourself →
          </Link>
        </div>

        <p className="text-[11px] text-white/40 text-center mt-8 max-w-md mx-auto leading-[1.5]">
          All voices are AI-generated. No real mothers were used in the making of this product.
          Screenshots are processed once and deleted within 24 hours. No account required.
        </p>
      </div>
    </div>
  );
}
