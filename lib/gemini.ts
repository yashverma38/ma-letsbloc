import { generateText } from 'ai';
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import type { ScreenTimeData } from './types';

const VISION_PROMPT = `
You are given a screenshot of a WEEKLY screen time report.

The user is uploading their 7-day screen time summary from one of:
- iOS: Settings → Screen Time → See All Activity → "Week" tab
- Android: Settings → Digital Wellbeing → Dashboard (weekly view)

Extract these WEEKLY AGGREGATES and return ONLY valid JSON:
{
  "totalHours": number,        // TOTAL screen time across all 7 days, in hours
  "topApp": string,             // single most-used app across the whole week
  "topAppHours": number,        // hours on topApp across the whole week
  "pickups": number,            // AVERAGE pickups per day over the week
  "lateNightApp": string        // app most-used after 11pm, or topApp if unclear
}

Rules:
- If only daily averages are visible, MULTIPLY by 7 to get weekly totals for totalHours and topAppHours.
- If pickups are shown as a weekly total, DIVIDE by 7 to get the daily average.
- If the screenshot is a daily view (not weekly), multiply visible daily values by 7 to estimate weekly totals.
- Return ONLY valid JSON. No markdown, no code fences, no prose.
- Never return null. Always estimate reasonable integers when unclear.
`.trim();

export async function analyzeScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<ScreenTimeData> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const { text } = await generateText({
    model: opencode('google/gemini-2.5-flash'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_PROMPT },
          { type: 'image', image: dataUrl },
        ],
      },
    ],
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');

  const parsed = JSON.parse(match[0]);
  return {
    totalHours: Number(parsed.totalHours) || 0,
    topApp: String(parsed.topApp || 'Instagram'),
    topAppHours: Number(parsed.topAppHours) || 0,
    pickups: Number(parsed.pickups) || 0,
    lateNightApp: String(parsed.lateNightApp || parsed.topApp || 'Instagram'),
  };
}
