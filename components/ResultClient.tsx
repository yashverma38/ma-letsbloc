'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Archetype, ScreenTimeData } from '@/lib/types';
import { EVENTS, setProfile, track, trackPageView } from '@/lib/mixpanel';

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
  const [igBusy, setIgBusy] = useState(false);
  const forward = FORWARDS[Math.floor(Math.random() * FORWARDS.length)];
  const searchParams = useSearchParams();
  const isFresh = searchParams?.get('fresh') === '1';

  useEffect(() => {
    trackPageView('cooked_result', { generation_id: id, archetype, fresh: isFresh });
  }, [id, archetype, isFresh]);

  useEffect(() => {
    if (!isFresh) return;
    track(EVENTS.VOICE_NOTE_GENERATED, {
      generation_id: id,
      archetype,
      totalHours: data.totalHours,
      topApp: data.topApp,
      topAppHours: data.topAppHours,
      pickups: data.pickups,
      lateNightApp: data.lateNightApp,
    });
    setProfile({
      last_archetype: archetype,
      last_total_hours: data.totalHours,
      last_top_app: data.topApp,
      last_pickups: data.pickups,
      last_generated_at: new Date().toISOString(),
    });
  }, [isFresh, id, archetype, data]);

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

  function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function buildCard(): Promise<Blob | null> {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a05');
    bg.addColorStop(1, '#05030a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, 620, 0, W / 2, 620, 900);
    glow.addColorStop(0, 'rgba(255, 140, 70, 0.38)');
    glow.addColorStop(1, 'rgba(255, 140, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    const sans = '-apple-system, "Helvetica Neue", Inter, Arial, sans-serif';

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 34px ${sans}`;
    ctx.fillText('MAA CALLED', W / 2, 210);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `500 22px ${sans}`;
    ctx.fillText('mobile · favourites', W / 2, 250);

    const cx = W / 2;
    const cy = 500;
    const r = 150;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,179,71,0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();
    const av = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    av.addColorStop(0, '#ffb347');
    av.addColorStop(1, '#c85028');
    ctx.fillStyle = av;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 140px ${sans}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('मा', cx, cy + 8);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#fff';
    ctx.font = `700 160px ${sans}`;
    ctx.fillText(`${Math.round(data.totalHours)}h`, W / 2, 900);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `500 36px ${sans}`;
    ctx.fillText('this week · on your phone', W / 2, 960);

    ctx.fillStyle = '#ffb347';
    ctx.font = `600 44px ${sans}`;
    ctx.fillText(label, W / 2, 1050);

    ctx.fillStyle = '#fff';
    ctx.font = `italic 48px Georgia, "Times New Roman", serif`;
    const quote = `“${signature}”`;
    const lines = wrapLines(ctx, quote, 880).slice(0, 5);
    let y = 1260;
    for (const ln of lines) {
      ctx.fillText(ln, W / 2, y);
      y += 68;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `500 28px ${sans}`;
    const stats = `${data.topApp} ${Math.round(data.topAppHours)}h  ·  ${data.pickups} pickups/day`;
    ctx.fillText(stats, W / 2, 1720);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `700 34px ${sans}`;
    ctx.fillText('ma.letsbloc.com', W / 2, 1830);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );
  }

  async function shareInstagram() {
    setIgBusy(true);
    try {
      const blob = await buildCard();
      if (!blob) return;
      const file = new File([blob], 'maa-called.jpg', { type: 'image/jpeg' });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: 'Maa called. ma.letsbloc.com' });
          return;
        } catch {}
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'maa-called.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIgBusy(false);
    }
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
            📲 WhatsApp
          </a>
          <button
            type="button"
            className="btn-ghost"
            onClick={shareInstagram}
            disabled={igBusy}
          >
            {igBusy ? 'Cooking card…' : '📸 Instagram'}
          </button>
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
          href={`/aware/${id}`}
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
