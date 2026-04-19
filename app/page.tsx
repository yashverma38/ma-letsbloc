'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EVENTS, identifyByEmail, track } from '@/lib/mixpanel';

export default function Landing() {
  const [clock, setClock] = useState('9:41');
  const [count, setCount] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const base = 847;
    const bumped = Number(typeof window !== 'undefined' ? localStorage.getItem('ma_count_boost') : 0) || 0;
    setCount(base + bumped);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Maa needs a real email, beta.');
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await addDoc(collection(db, 'waitlist_ma'), {
        email: cleanEmail,
        source: 'landing',
        createdAt: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      });
      identifyByEmail(cleanEmail, { source: 'landing_waitlist' });
      track(EVENTS.SIGNUP_SUBMITTED, { source: 'landing' });
      const cur = Number(localStorage.getItem('ma_count_boost') || 0);
      localStorage.setItem('ma_count_boost', String(cur + 1));
      setDone(true);
    } catch {
      setError('Line busy. Try once more.');
    } finally {
      setLoading(false);
    }
  }

  const shareMsg = "Got a voice note from Maa. She's seen my screen time. ma.letsbloc.com";
  const shareUrl = 'https://ma.letsbloc.com';

  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center justify-center px-5 pt-6 pb-10">
      <div className="fixed top-5 left-5 text-[11px] uppercase tracking-[0.08em] text-white/35 z-10">
        <Link href="https://letsbloc.com" className="hover:text-white/70">letsbloc</Link>
      </div>

      <div className="phone">
        <div className="flex justify-between items-center px-3.5 text-[14px] font-semibold text-white/90 mb-2">
          <span>{clock}</span>
          <span className="text-[11px] opacity-90">●●●● 📶 🔋</span>
        </div>

        {!done ? (
          <div className="flex-1 flex flex-col items-center justify-between py-8 text-center">
            <div className="text-[13px] text-white/50 tracking-[0.04em] mb-5 fade-in">voice note from</div>

            <div className="flex flex-col items-center">
              <div className="avatar mb-4">मा</div>
              <div className="text-[30px] font-semibold tracking-tight">Maa</div>
              <div className="text-[13px] text-white/45 mt-1">90 seconds · in your language</div>
            </div>

            <p className="text-[14px] text-white/70 leading-[1.5] max-w-[260px] mt-5">
              She&apos;s seen your screen time.
              <br />
              <strong className="text-white font-semibold">Hear what she has to say.</strong>
            </p>

            <Link href="/cooked" className="btn-primary w-full mt-6 inline-flex items-center justify-center">
              🎧 Get your voice note
            </Link>

            <form
              onSubmit={submit}
              className="w-full flex flex-col gap-2 px-1 mt-6 pt-5 border-t border-white/10"
              noValidate
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-white/40">
                or keep me posted
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="your email"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={loading} className="btn-ghost">
                {loading ? 'Adding you…' : 'Notify me of new voices'}
              </button>
              <div className="text-[12px] text-center min-h-[16px] text-[#ff7a6b]">{error}</div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 fade-in">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ffb347] to-[#c85028] flex items-center justify-center text-[26px] mb-5">✓</div>
            <h3 className="text-[20px] font-semibold mb-2">You&apos;re on the list.</h3>
            <p className="text-[13px] text-white/55 leading-[1.5] max-w-[240px] mb-5">
              We&apos;ll ping you when Maa adds new voices. Meanwhile, she&apos;s ready now.
            </p>
            <Link href="/cooked" className="btn-primary max-w-[260px]">
              🎧 Get your voice note
            </Link>
            <div className="flex gap-2 justify-center flex-wrap mt-5">
              <a
                className="btn-ghost"
                href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📲 WhatsApp
              </a>
              <a
                className="btn-ghost"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                𝕏 Post
              </a>
              <button
                type="button"
                className="btn-ghost"
                onClick={async (e) => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    (e.currentTarget as HTMLButtonElement).textContent = '✓ copied';
                  } catch {}
                }}
              >
                🔗 Copy link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.06em] text-white/30 z-10">
        <strong className="text-white/75 font-semibold">{count?.toLocaleString('en-IN') ?? '—'}</strong> already on Maa&apos;s list
      </div>
    </div>
  );
}
