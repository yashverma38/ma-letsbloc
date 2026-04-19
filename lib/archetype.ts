import type { Archetype, ScreenTimeData, Tier } from './types';
import { ARCHETYPE_OF } from './types';

// 3-tier model based on weekly screen time (hours per day average).
// low    : < 3 hrs/day   → Proud Maa   (warm, a little suspicious she hasn't heard from you)
// medium : 3–6 hrs/day   → Sweet Guilt (the default — disappointed on your behalf)
// high   : > 6 hrs/day, or 120+ pickups/day → Rage Maa
export function pickTier(data: Pick<ScreenTimeData, 'totalHours' | 'pickups'>): Tier {
  const perDay = data.totalHours / 7;
  if (perDay >= 6 || data.pickups >= 120) return 'high';
  if (perDay < 3) return 'low';
  return 'medium';
}

export function pickArchetype(data: Pick<ScreenTimeData, 'totalHours' | 'pickups'>): Archetype {
  return ARCHETYPE_OF[pickTier(data)];
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  proud: 'The One Who Might Be Sick',
  sweet: 'The Sweet Guilt Receiver',
  rage: 'The One Who Ignored Her Calls',
};

export const TIER_LABEL: Record<Tier, string> = {
  low: 'low screen time',
  medium: 'medium screen time',
  high: 'high screen time',
};
