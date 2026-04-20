'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { ScreenTimeData } from '@/lib/types';
import { EVENTS, track, trackPageView } from '@/lib/mixpanel';

export default function AwareClient({ id, data }: { id: string; data: ScreenTimeData }) {
  const hoursPerDay = Math.round((data.totalHours / 7) * 10) / 10;
  const yearHoursSaved = Math.round(data.totalHours * 52);
  const yearDaysSaved = Math.round((yearHoursSaved / 24) * 10) / 10;

  useEffect(() => {
    trackPageView('aware', { generation_id: id });
    track(EVENTS.AWARENESS_CARD_VIEWED, {
      generation_id: id,
      totalHours: data.totalHours,
      pickups: data.pickups,
    });
  }, [id, data.totalHours, data.pickups]);

  function onBlocClick() {
    track(EVENTS.BLOC_REDIRECTED, { generation_id: id, from: 'aware' });
  }

  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center px-5 py-14">
      <div className="fixed top-5 left-5 text-[11px] uppercase tracking-[0.08em] text-white/35 z-10">
        <Link href={`/cooked/${id}`} className="hover:text-white/70">← back to Maa</Link>
      </div>

      <div className="w-full max-w-xl fade-in">
        <div className="text-center mb-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-white/40 mb-3">the real number</div>
          <h1 className="text-[30px] font-semibold leading-[1.15] mb-3">
            {hoursPerDay}h/day isn&apos;t a habit.
            <br />It&apos;s <span className="text-[#ffb347]">{yearDaysSaved} full days</span> a year.
          </h1>
          <p className="text-[14px] text-white/60 leading-[1.5] max-w-md mx-auto">
            {data.pickups} pickups a day. {yearHoursSaved} hours a year. Your phone isn&apos;t the villain — it&apos;s just very good at its job.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          <Card
            tag="attention"
            headline="The scroll splits your focus — even when you stop."
            body="Having a phone nearby reduces available cognitive capacity, even when it's face-down and silent. The attention leaks without you noticing."
            cite="Ward et al., Journal of the Association for Consumer Research, 2017"
          />
          <Card
            tag="sleep"
            headline="Late-night scrolling steals the sleep you think you got."
            body="Screen time in bed is associated with shorter sleep duration and poorer sleep quality — and you feel it the next day, not tonight."
            cite="Hale & Guan, Sleep Medicine Reviews, 2015"
          />
          <Card
            tag="mood"
            headline="Heavy social media use tracks with worse mental health in young adults."
            body="Longitudinal studies consistently link 3+ hours/day of social media with higher rates of depression and anxiety symptoms, especially in under-25s."
            cite="Twenge & Campbell, Preventive Medicine Reports, 2018"
          />
          <Card
            tag="dopamine"
            headline="Short-form video trains the same reward loops slot machines use."
            body="Variable-reward feeds condition rapid tolerance — the next scroll has to be slightly stronger to hit. That's not weakness. That's design."
            cite="Montag et al., Frontiers in Psychiatry, 2021"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 mb-8">
          <div className="text-[11px] uppercase tracking-[0.1em] text-white/40 mb-2">what actually works</div>
          <ul className="text-[14px] text-white/80 leading-[1.65] space-y-1.5">
            <li>— Block the 2–3 apps that own your day. Not all of them.</li>
            <li>— Friction beats willpower. Put the phone across the room at night.</li>
            <li>— Replace the habit, don&apos;t delete it. A walk, a book, a call.</li>
            <li>— Track the pickups, not the minutes. That&apos;s the real tell.</li>
          </ul>
        </div>

        <div className="text-center">
          <p className="text-[13px] text-white/60 mb-5 max-w-sm mx-auto leading-[1.5]">
            Maa made you laugh. Bloc makes the block stick. One-time ₹899. No subscription.
          </p>
          <a
            href="https://letsbloc.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onBlocClick}
            className="btn-primary inline-block"
          >
            Join the Bloc →
          </a>
          <p className="text-[11px] text-white/35 mt-5 max-w-sm mx-auto leading-[1.5]">
            Citations point to peer-reviewed work. Statements are paraphrased summaries, not direct quotes.
          </p>
        </div>
      </div>
    </div>
  );
}

function Card({ tag, headline, body, cite }: { tag: string; headline: string; body: string; cite: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#ffb347]/80 mb-1.5">{tag}</div>
      <div className="text-[16px] font-medium text-white/95 leading-[1.35] mb-2">{headline}</div>
      <p className="text-[13px] text-white/65 leading-[1.55] mb-2">{body}</p>
      <div className="text-[11px] text-white/40 italic">{cite}</div>
    </div>
  );
}
