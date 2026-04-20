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
    ...readUtmAndReferrer(),
  });
  initialized = true;
}

// UTM + referrer captured once at init, registered as super-props so every
// downstream event carries attribution. Instagram story taps land with
// referrer=instagram.com (mobile) or l.instagram.com (link shim).
function readUtmAndReferrer(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const out: Record<string, string> = {};
  try {
    const url = new URL(window.location.href);
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = url.searchParams.get(k);
      if (v) out[k] = v;
    }
    const ref = document.referrer;
    if (ref) {
      out.referrer = ref;
      try { out.referrer_domain = new URL(ref).hostname; } catch {}
    }
  } catch {}
  return out;
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
  PAGE_VIEWED: 'Page Viewed',
  SIGNUP_SUBMITTED: 'Signup Submitted',
  SCREENSHOT_UPLOADED: 'Screenshot Uploaded',
  VOICE_NOTE_GENERATED: 'Voice Note Generated',
  AWARENESS_CARD_VIEWED: 'Awareness Card Viewed',
  BLOC_REDIRECTED: 'Bloc Redirected',
} as const;

// Page-view tracker. Call once per page mount with a short, stable page name.
// Attribution (utm_*, referrer) is already on every event as super-props.
export function trackPageView(page: string, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  initMixpanel();
  if (!initialized) return;
  mixpanel.track(EVENTS.PAGE_VIEWED, {
    page,
    path: window.location.pathname,
    ...extra,
  });
}
