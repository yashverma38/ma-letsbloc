'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Archetype, ScreenTimeData } from '@/lib/types';

const FORWARDS = [
  'Bhai, Maa ne abhi call kiya. Tujhe bhi karegi. → ma.letsbloc.com',
  'Tumhari Maa ne kuch bheja hai 👀 ma.letsbloc.com',
  'Just got cooked by an AI Maa. Ab tera number. ma.letsbloc.com',
  'Maa called. I cried. Try it. ma.letsbloc.com',
  'Yeh sun, phone band kar dega tu. ma.letsbloc.com',
];

export default function ResultClient({
  id,
  archetype,
  label,
  audioUrl,
  signature,
  data,
}: {
  id: string;
  archetype: Archetype;
  label: string;
  audioUrl: string;
  signature: string;
  data: ScreenTimeData;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const forward = FORWARDS[Math.floor(Math.random() * FORWARDS.length)];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://ma.letsbloc.com/cooked/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      <div className="fixed top-5 left-5 text-[11px] uppercase tracking-[0.08em] text-white/35 z-10">
        <Link href="/" className="hover:text-white/70">letsbloc</Link>
      </div>

      <div className="w-full max-w-md fade-in flex flex-col items-center">
        <div className="text-[12px] text-white/50 uppercase tracking-[0.08em] mb-2">voice note from</div>

        <button
          onClick={toggle}
          aria-label="play"
          className="avatar mb-5"
          style={{ cursor: 'pointer' }}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <div className="text-[28px] font-semibold mb-1">Maa</div>
        <div className="text-[13px] text-white/50 mb-6">{label}</div>

        <audio ref={audioRef} src={audioUrl} preload="auto" />

        <button onClick={toggle} className="btn-primary max-w-[280px]">
          {playing ? 'Pause' : '▶  Listen to Maa'}
        </button>

        <div className="mt-8 w-full max-w-sm p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="text-[11px] uppercase tracking-[0.08em] text-white/40 mb-2">Maa said</div>
          <p className="text-[15px] leading-[1.6] text-white/90 italic">&ldquo;{signature}&rdquo;</p>
          <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-[12px] text-white/50">
            <span>{Math.round(data.totalHours)}h / week</span>
            <span>·</span>
            <span>{data.topApp}: {Math.round(data.topAppHours)}h</span>
            <span>·</span>
            <span>{data.pickups} pickups/day</span>
          </div>
        </div>

        <div className="mt-6 text-[12px] text-white/50 text-center">tag 3 friends more cooked than you</div>
        <div className="mt-3 flex gap-2 flex-wrap justify-center">
          <a
            className="btn-ghost"
            href={`https://wa.me/?text=${encodeURIComponent(forward)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📲 Forward on WhatsApp
          </a>
          <a
            className="btn-ghost"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Maa called. I cried. Try it. ma.letsbloc.com')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            𝕏 Post
          </a>
          <button className="btn-ghost" onClick={copyLink} type="button">
            {copied ? '✓ copied' : '🔗 Copy link'}
          </button>
        </div>

        <Link
          href="https://letsbloc.com"
          className="mt-10 text-[13px] text-white/60 hover:text-white underline underline-offset-4"
        >
          Ready to uncook? Join the Bloc →
        </Link>

        <p className="text-[11px] text-white/35 text-center mt-10 max-w-sm leading-[1.5]">
          Yeh voice AI hai, tumhari asli Maa nahi. Par baat sahi keh rahi hai.
          <br />
          All voices are AI-generated. Data deleted within 24 hours.
        </p>
      </div>
    </div>
  );
}
