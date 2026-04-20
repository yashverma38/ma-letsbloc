'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LANG_OPTIONS } from '@/lib/languages';
import { EVENTS, identifyByEmail, track, trackPageView } from '@/lib/mixpanel';

const COMMON_APPS = ['Instagram', 'YouTube', 'WhatsApp', 'Reels', 'TikTok', 'Snapchat', 'X', 'Reddit', 'Chrome'];

export default function Manual() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [emailField, setEmailField] = useState('');
  const [langKey, setLangKey] = useState(`${LANG_OPTIONS[0].code}|${LANG_OPTIONS[0].label}`);
  const [totalHours, setTotalHours] = useState(35);
  const [topApp, setTopApp] = useState('Instagram');
  const [topAppHours, setTopAppHours] = useState(18);
  const [pickups, setPickups] = useState(90);
  const [lateNightApp, setLateNightApp] = useState('Instagram');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    trackPageView('cooked_manual');
  }, []);

  async function go() {
    setErr('');
    const cleanEmail = emailField.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErr('That email looks off — Maa needs a real one, or leave blank.');
      return;
    }
    setLoading(true);

    if (cleanEmail) {
      identifyByEmail(cleanEmail, {
        source: 'cooked_manual',
        name: name.trim() || undefined,
        preferred_language: langKey,
      });
    }
    track(EVENTS.SCREENSHOT_UPLOADED, { mode: 'manual', totalHours: Number(totalHours) });

    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalHours: Number(totalHours),
          topApp,
          topAppHours: Number(topAppHours),
          pickups: Number(pickups),
          lateNightApp,
          name: name.trim() || undefined,
          lang: langKey,
          email: cleanEmail || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'generate failed');
      const { id } = await r.json();
      router.push(`/cooked/${id}?fresh=1`);
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      <div className="fixed top-5 left-5 text-[11px] uppercase tracking-[0.08em] text-white/35 z-10">
        <Link href="/cooked" className="hover:text-white/70">← back</Link>
      </div>

      <div className="w-full max-w-md fade-in">
        <h1 className="text-[26px] font-semibold text-center mb-2">Tell Maa yourself.</h1>
        <p className="text-[14px] text-white/60 text-center leading-[1.5] mb-8 max-w-sm mx-auto">
          No Digital Wellbeing? No screenshot? Just tell us the damage.
          <br />Maa will know the rest.
        </p>

        <div className="flex flex-col gap-3">
          <input
            className="field"
            placeholder="first name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />

          <input
            type="email"
            className="field"
            placeholder="email (optional — we'll send you the link)"
            value={emailField}
            onChange={(e) => setEmailField(e.target.value)}
            autoComplete="email"
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

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">weekly screen time: <strong className="text-white">{totalHours}h</strong></div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={totalHours}
              onChange={(e) => setTotalHours(Number(e.target.value))}
              className="w-full accent-[#ffb347]"
            />
          </label>

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">most-used app</div>
            <select
              className="field"
              value={topApp}
              onChange={(e) => setTopApp(e.target.value)}
            >
              {COMMON_APPS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">hours on {topApp}: <strong className="text-white">{topAppHours}h</strong></div>
            <input
              type="range"
              min={1}
              max={Math.max(totalHours, 5)}
              step={1}
              value={Math.min(topAppHours, totalHours)}
              onChange={(e) => setTopAppHours(Number(e.target.value))}
              className="w-full accent-[#ffb347]"
            />
          </label>

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">phone pickups / day: <strong className="text-white">{pickups}</strong></div>
            <input
              type="range"
              min={20}
              max={300}
              step={5}
              value={pickups}
              onChange={(e) => setPickups(Number(e.target.value))}
              className="w-full accent-[#ffb347]"
            />
          </label>

          <label className="block">
            <div className="text-[12px] text-white/60 mb-1.5">most-used app after 11pm</div>
            <select
              className="field"
              value={lateNightApp}
              onChange={(e) => setLateNightApp(e.target.value)}
            >
              {COMMON_APPS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <button onClick={go} disabled={loading} className="btn-primary mt-2">
            {loading ? 'Maa is recording...' : '📞 Get Maa on the line'}
          </button>
          <div className="text-[12px] text-center min-h-[16px] text-[#ff7a6b]">{err}</div>
        </div>
      </div>
    </div>
  );
}
