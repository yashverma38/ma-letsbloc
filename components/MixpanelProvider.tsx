'use client';

import { useEffect } from 'react';
import { initMixpanel } from '@/lib/mixpanel';

// Warms up Mixpanel once at layout mount. Page Viewed events are fired from
// each route's own client component with a stable `page` label — see
// lib/mixpanel.ts#trackPageView.
export default function MixpanelProvider() {
  useEffect(() => { initMixpanel(); }, []);
  return null;
}
