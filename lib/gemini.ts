import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ScreenTimeData } from './types';

const VISION_PROMPT = `
You are given a screenshot of iOS Screen Time or Android Digital Wellbeing.
Return ONLY valid JSON in this exact shape (no markdown, no prose):
{
  "totalHours": number,
  "topApp": string,
  "topAppHours": number,
  "pickups": number,
  "lateNightApp": string
}
Rules:
- totalHours: weekly total in hours. If only daily shown, multiply by 7.
- topApp: name of the single most-used app.
- topAppHours: hours on topApp for the week (daily × 7 if needed).
- pickups: pickups per day. If only total shown, divide by 7.
- lateNightApp: most-used app after 11pm if visible, else same as topApp.
If any field is unclear, make a reasonable integer estimate. Never output null.
`.trim();

export async function analyzeScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<ScreenTimeData> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    { text: VISION_PROMPT },
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini did not return JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    totalHours: Number(parsed.totalHours) || 0,
    topApp: String(parsed.topApp || 'Instagram'),
    topAppHours: Number(parsed.topAppHours) || 0,
    pickups: Number(parsed.pickups) || 0,
    lateNightApp: String(parsed.lateNightApp || parsed.topApp || 'Instagram'),
  };
}
