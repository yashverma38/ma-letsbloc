'use client';

import { useEffect } from 'react';
import { initMixpanel, track } from '@/lib/mixpanel';

export default function MixpanelProvider() {
  useEffect(() => {
    initMixpanel();
    track('Page Viewed', {
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });
  }, []);
  return null;
}
