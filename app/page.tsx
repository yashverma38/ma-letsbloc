'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
      await addDoc(collection(db, 'waitlist_ma'), {
        email: email.trim().toLowerCase(),
        source: 'landing',
        createdAt: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      });
      const cur = Number(localStorage.getItem('ma_count_boost') || 0);
      localStorage.setItem('ma_count_boost', String(cur + 1));
      setDone(true);
    } catch {
      setError('Line busy. Try once more.');
    } finally {
      setLoading(false);
    }
  }

  const shareMsg = "Maa is calling. She's seen your screen time. 📞 ma.letsbloc.com";
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
          <div className="flex-1 flex flex-col items-center justify-between py-10 text-center">
            <div className="text-[13px] text-white/50 tracking-[0.04em] mb-5 fade-in">incoming call</div>

            <div className="flex flex-col items-center">
              <div className="avatar mb-4">मा</div>
              <div className="text-[30px] font-semibold tracking-tight">Maa</div>
              <div className="text-[13px] text-white/45 mt-1">mobile · favourites</div>
            </div>

            <p className="text-[14px] text-white/70 leading-[1.5] max-w-[260px] mt-6">
              She&apos;s seen your screen time.
              <br />
              <strong className="text-white font-semibold">Pick up before she calls your friends.</strong>
            </p>

            <form onSubmit={submit} className="w-full flex flex-col gap-2.5 px-1 mt-6" noValidate>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="your email (don't lie)"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Connecting to Maa...' : "📞 Answer Maa's call"}
              </button>
              <div className="text-[12px] text-center min-h-[16px] text-[#ff7a6b]">{error}</div>
              <div className="text-center mt-1">
                <Link href="/cooked" className="text-[12px] text-white/50 hover:text-white/80">
                  or get your voice note now →
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 fade-in">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ffb347] to-[#c85028] flex items-center justify-center text-[26px] mb-5">✓</div>
            <h3 className="text-[20px] font-semibold mb-2">Maa will call you first.</h3>
            <p className="text-[13px] text-white/55 leading-[1.5] max-w-[240px] mb-5">
              You&apos;re on the list. She&apos;ll ring when the line opens. Tell a friend who needs it more.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
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
                🔗 Copy
              </button>
            </div>
            <Link href="/cooked" className="mt-6 text-[12px] text-white/60 hover:text-white/90 underline underline-offset-4">
              Skip waiting — get your voice note now
            </Link>
          </div>
        )}
      </div>

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.06em] text-white/30 z-10">
        <strong className="text-white/75 font-semibold">{count?.toLocaleString('en-IN') ?? '—'}</strong> already on Maa&apos;s list
      </div>
    </div>
  );
}
