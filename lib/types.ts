export type ScreenTimeData = {
  totalHours: number;
  topApp: string;
  topAppHours: number;
  secondApp?: string;
  secondAppHours?: number;
  socialHours?: number;
  weekOverPreviousPct?: number;

  pickups: number;
  firstPickupTime?: string;
  longestSession?: string;

  notificationsPerDay?: number;
  topNotificationApp?: string;

  lateNightApp: string;
  name?: string;
};

export type Archetype = 'proud' | 'sweet' | 'rage';

export type Tier = 'low' | 'medium' | 'high';

export const ARCHETYPE_OF: Record<Tier, Archetype> = {
  low: 'proud',
  medium: 'sweet',
  high: 'rage',
};

export type VoiceNote = {
  id: string;
  archetype: Archetype;
  tier: Tier;
  data: ScreenTimeData;
  audioUrl: string;
  lang: string;
  createdAt: string;
};
