'use client';

import mixpanel from 'mixpanel-browser';

let initialized = false;

export function initMixpanel() {
  if (initialized) return;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    if (typeof window !== 'undefined') console.warn('[mixpanel] NEXT_PUBLIC_MIXPANEL_TOKEN not set');
    return;
  }
  mixpanel.init(token, {
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: false,
  });
  mixpanel.register({
    app: 'ma.letsbloc.com',
  });
  initialized = true;
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  initMixpanel();
  if (!initialized) return;
  mixpanel.track(event, props);
}

export function identifyByEmail(email: string, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  initMixpanel();
  if (!initialized) return;
  const clean = email.trim().toLowerCase();
  mixpanel.identify(clean);
  mixpanel.people.set({
    $email: clean,
    last_seen_at: new Date().toISOString(),
    ...extra,
  });
  mixpanel.people.set_once({
    first_seen_at: new Date().toISOString(),
  });
}

export function setProfile(props: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  initMixpanel();
  if (!initialized) return;
  mixpanel.people.set(props);
}

export function incrementProfile(prop: string, by = 1) {
  if (typeof window === 'undefined') return;
  initMixpanel();
  if (!initialized) return;
  mixpanel.people.increment(prop, by);
}

// Canonical funnel event names — keep these stable for dashboards.
export const EVENTS = {
  SIGNUP_SUBMITTED: 'Signup Submitted',
  SCREENSHOT_UPLOADED: 'Screenshot Uploaded',
  VOICE_NOTE_GENERATED: 'Voice Note Generated',
  AWARENESS_CARD_VIEWED: 'Awareness Card Viewed',
  BLOC_REDIRECTED: 'Bloc Redirected',
} as const;
