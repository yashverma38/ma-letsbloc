export type ScreenTimeData = {
  // From Week Overview
  totalHours: number;
  topApp: string;
  topAppHours: number;
  secondApp?: string;
  secondAppHours?: number;
  socialHours?: number;
  weekOverPreviousPct?: number;

  // From Pickups tab
  pickups: number;
  firstPickupTime?: string;
  longestSession?: string;

  // From Notifications tab
  notificationsPerDay?: number;
  topNotificationApp?: string;

  // Derived / late-night
  lateNightApp: string;

  // User-supplied
  name?: string;
};

export type Archetype = 'sweet' | 'rage' | 'dadi';

export type VoiceNote = {
  id: string;
  archetype: Archetype;
  data: ScreenTimeData;
  audioUrl: string;
  createdAt: string;
};
