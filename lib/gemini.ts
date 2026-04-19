import { chat } from './opencode';
import type { ScreenTimeData } from './types';

// OpenCode's Gemini route is flaking with OVERLOADED_CREDENTIALS on Google's side.
// Claude Haiku 4.5 is multimodal, cheap, and works reliably through the same endpoint.
const MODEL = process.env.OPENCODE_MODEL || 'claude-haiku-4-5';

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

import { extractProtectedTokens } from './scripts';

export async function translateScript(
  script: string,
  targetLangLabel: string,
  extraProtected: string[] = [],
): Promise<string> {
  const mustKeep = Array.from(
    new Set([...extractProtectedTokens(script), ...extraProtected.filter(Boolean)]),
  );
  const tokenList = mustKeep.length ? mustKeep.join('  |  ') : '(none)';

  const prompt = `Translate the following voice-note script into ${targetLangLabel}.
It is dialogue spoken by a warm, guilt-tripping Indian mother to her child.

HARD RULES (a violation means the output is invalid):
1. PRESERVE these exact strings verbatim, unchanged, in the output:
   ${tokenList}
2. Every sentence / beat from the original MUST appear in the translation — no additions, no omissions, no reordering.
3. Keep pauses and ellipses ("...") exactly as they appear.
4. Tone stays casual, spoken, motherly, emotionally specific — never formal.
5. Write in ROMAN (LATIN) script only. Do NOT use Devanagari, Tamil, Bengali, or any native script.
6. Return ONLY the translated script text. No labels, no quotes, no commentary.

Script to translate:
${script}`;

  return (await chat({
    model: MODEL,
    temperature: 0.25,
    maxTokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })).trim();
}

export function validateTranslation(
  original: string,
  translated: string,
  extraProtected: string[] = [],
): { ok: boolean; missing: string[] } {
  const origTokens = Array.from(
    new Set([...extractProtectedTokens(original), ...extraProtected.filter(Boolean)]),
  );
  const lower = translated.toLowerCase();
  const missing = origTokens.filter((t) => !lower.includes(t.toLowerCase()));
  // tolerate at most one drifted token
  return { ok: missing.length <= 1, missing };
}
