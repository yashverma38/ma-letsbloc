import { generateText } from 'ai';
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import type { ScreenTimeData } from './types';

const VISION_PROMPT = `
You are given 4 screenshots from iOS Screen Time (weekly view) or the Android
Digital Wellbeing equivalent. Together they form a complete picture of a user's
WEEKLY phone usage.

The four screenshots (in any order) are:
  1. Week Overview — bar chart, total weekly hours, category split (Social / Other / Games), top apps
  2. Most Used — scrolled list of apps with per-app weekly hours
  3. Pickups — total / average pickups per day, first pickup time, longest session
  4. Notifications — notifications per day, top notification-sending app

Extract a single JSON object combining all four. Return ONLY valid JSON, no
markdown, no prose:

{
  "totalHours": number,               // total weekly screen time, in hours
  "topApp": string,                    // single most-used app name
  "topAppHours": number,               // hours on topApp across the week
  "secondApp": string,                 // second most-used app name
  "secondAppHours": number,            // hours on secondApp across the week
  "socialHours": number,               // hours in the Social category (approx ok)
  "weekOverPreviousPct": number,       // % change vs previous week (negative if down)
  "pickups": number,                   // average pickups per day
  "firstPickupTime": string,           // e.g. "7:45 AM"
  "longestSession": string,            // e.g. "2h 15m"
  "notificationsPerDay": number,       // average notifications/day
  "topNotificationApp": string,        // app sending most notifications
  "lateNightApp": string               // most-used app after 11pm, else topApp
}

Rules:
- Always return weekly totals (not daily). If only daily averages are visible,
  multiply by 7.
- Pickups are reported as daily average.
- For any field you cannot determine, make a reasonable integer estimate —
  NEVER return null and NEVER omit a field.
- Return ONLY valid JSON. No code fences, no prose.

Worked example (matches a real Week Overview screenshot showing
"Last Week's Average 7h 16m" / "Total Screen Time 50h 58m" / Social 26h 17m /
Games 1h 25m / Most Used: Instagram 20h 43m, Bumble 7h 4m, with a 14% weekly
increase). Assume the Pickups screenshot shows ~140 pickups/day with first
pickup 7:45 AM and longest session 2h 15m, and Notifications shows ~380/day
with Instagram leading. Your output should look like:

{
  "totalHours": 51,
  "topApp": "Instagram",
  "topAppHours": 21,
  "secondApp": "Bumble",
  "secondAppHours": 7,
  "socialHours": 26,
  "weekOverPreviousPct": 14,
  "pickups": 140,
  "firstPickupTime": "7:45 AM",
  "longestSession": "2h 15m",
  "notificationsPerDay": 380,
  "topNotificationApp": "Instagram",
  "lateNightApp": "Instagram"
}
`.trim();

export async function analyzeScreenshots(
  images: { base64: string; mimeType: string }[],
): Promise<ScreenTimeData> {
  if (!images.length) throw new Error('no images');

  const imageBlocks = images.map((img) => ({
    type: 'image' as const,
    image: `data:${img.mimeType};base64,${img.base64}`,
  }));

  const { text } = await generateText({
    model: opencode('google/gemini-2.5-flash'),
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: VISION_PROMPT }, ...imageBlocks],
      },
    ],
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');

  const p = JSON.parse(match[0]);
  return {
    totalHours: Number(p.totalHours) || 0,
    topApp: String(p.topApp || 'Instagram'),
    topAppHours: Number(p.topAppHours) || 0,
    secondApp: p.secondApp ? String(p.secondApp) : undefined,
    secondAppHours: p.secondAppHours != null ? Number(p.secondAppHours) : undefined,
    socialHours: p.socialHours != null ? Number(p.socialHours) : undefined,
    weekOverPreviousPct: p.weekOverPreviousPct != null ? Number(p.weekOverPreviousPct) : undefined,
    pickups: Number(p.pickups) || 0,
    firstPickupTime: p.firstPickupTime ? String(p.firstPickupTime) : undefined,
    longestSession: p.longestSession ? String(p.longestSession) : undefined,
    notificationsPerDay: p.notificationsPerDay != null ? Number(p.notificationsPerDay) : undefined,
    topNotificationApp: p.topNotificationApp ? String(p.topNotificationApp) : undefined,
    lateNightApp: String(p.lateNightApp || p.topApp || 'Instagram'),
  };
}

// Back-compat for callers still importing the old single-image helper.
export async function analyzeScreenshot(imageBase64: string, mimeType: string) {
  return analyzeScreenshots([{ base64: imageBase64, mimeType }]);
}
