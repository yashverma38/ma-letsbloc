import { chat } from './opencode';
import type { ScreenTimeData } from './types';

const MODEL = 'gemini-3-flash';

const VISION_PROMPT = `
You are given up to 4 screenshots from iOS Screen Time (weekly view) or the
Android Digital Wellbeing equivalent. Together they form a complete picture of
a user's WEEKLY phone usage.

The screenshots may include (in any order):
  1. Week Overview — bar chart, total weekly hours, category split, top apps
  2. Most Used — scrolled list of apps with per-app weekly hours
  3. Pickups — total / average pickups per day, first pickup time, longest session
  4. Notifications — notifications per day, top notification-sending app

Return ONLY valid JSON, no markdown, no prose:

{
  "totalHours": number,               // total weekly screen time, in hours
  "topApp": string,
  "topAppHours": number,
  "secondApp": string,
  "secondAppHours": number,
  "socialHours": number,
  "weekOverPreviousPct": number,
  "pickups": number,
  "firstPickupTime": string,
  "longestSession": string,
  "notificationsPerDay": number,
  "topNotificationApp": string,
  "lateNightApp": string
}

Rules:
- Always return weekly totals. If only daily averages are visible, multiply by 7.
- Pickups are reported as the daily average.
- Estimate any missing field with a reasonable integer — NEVER return null, NEVER omit a field.
- Return ONLY valid JSON.

Worked example (matches a Week Overview with "Last Week's Average 7h 16m",
"Total Screen Time 50h 58m", Social 26h 17m, Games 1h 25m, Most Used:
Instagram 20h 43m, Bumble 7h 4m, 14% weekly increase, pickups ~140/day with
first pickup 7:45 AM and longest session 2h 15m, notifications ~380/day with
Instagram leading):

{"totalHours":51,"topApp":"Instagram","topAppHours":21,"secondApp":"Bumble","secondAppHours":7,"socialHours":26,"weekOverPreviousPct":14,"pickups":140,"firstPickupTime":"7:45 AM","longestSession":"2h 15m","notificationsPerDay":380,"topNotificationApp":"Instagram","lateNightApp":"Instagram"}
`.trim();

export async function analyzeScreenshots(
  images: { base64: string; mimeType: string }[],
): Promise<ScreenTimeData> {
  if (!images.length) throw new Error('no images');

  const imageParts = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
  }));

  const text = await chat({
    model: MODEL,
    temperature: 0.1,
    maxTokens: 512,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: VISION_PROMPT }, ...imageParts],
      },
    ],
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('model did not return JSON');

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

export async function analyzeScreenshot(imageBase64: string, mimeType: string) {
  return analyzeScreenshots([{ base64: imageBase64, mimeType }]);
}

export async function translateScript(script: string, targetLangLabel: string): Promise<string> {
  const prompt = `Translate the following voice-note script into ${targetLangLabel}.
It is dialogue spoken by a warm, slightly guilt-tripping Indian mother to her child.

Rules:
- Keep the tone: warm, teasing, emotionally specific. Not formal.
- Preserve ALL numbers, app names, and specific times exactly as given.
- Preserve pauses ("...") and the natural rhythm of speech.
- Do not add or remove beats. Same structure.
- Write in Roman (Latin) script — do not use Devanagari or other native scripts.
- Return ONLY the translated script, no explanation.

Original:
${script}`;

  return (await chat({
    model: MODEL,
    temperature: 0.3,
    maxTokens: 900,
    messages: [{ role: 'user', content: prompt }],
  })).trim();
}
