export type ScreenTimeData = {
  totalHours: number;
  topApp: string;
  topAppHours: number;
  pickups: number;
  lateNightApp: string;
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
