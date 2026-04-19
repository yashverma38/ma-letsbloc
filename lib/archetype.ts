import type { Archetype, ScreenTimeData } from './types';

export function pickArchetype(data: Pick<ScreenTimeData, 'totalHours' | 'pickups'>): Archetype {
  const hoursPerDay = data.totalHours / 7;
  if (hoursPerDay >= 8) return 'dadi';
  if (hoursPerDay >= 6 || data.pickups >= 120) return 'rage';
  return 'sweet';
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  sweet: 'The Sweet Guilt Receiver',
  rage: 'The One Who Ignored Her Calls',
  dadi: 'The One Dadi Prays For',
};
