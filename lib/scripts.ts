import type { Archetype, ScreenTimeData } from './types';

// Data-point coverage contract.
// Every script below SHOULD reference at least 6 of these, so that regardless
// of tier the voice note feels specific and roast-worthy. Translations are
// validated to preserve every literal value filled into these slots.
export const SLOT_NAMES = [
  'NAME',
  'TOTAL_HOURS',
  'TOP_APP',
  'TOP_APP_HOURS',
  'SECOND_APP',
  'SECOND_APP_HOURS',
  'PICKUPS',
  'FIRST_PICKUP',
  'NOTIFICATIONS',
  'LATE_NIGHT_APP',
  'LONGEST_SESSION',
  'WEEK_PCT',
  'SOCIAL_HOURS',
] as const;

type Slots = ScreenTimeData & { name: string };

function fill(template: string, slots: Slots): string {
  return template
    .replace(/\{NAME\}/g, slots.name)
    .replace(/\{TOTAL_HOURS\}/g, String(Math.round(slots.totalHours)))
    .replace(/\{TOP_APP\}/g, slots.topApp)
    .replace(/\{TOP_APP_HOURS\}/g, String(Math.round(slots.topAppHours)))
    .replace(/\{SECOND_APP\}/g, slots.secondApp || slots.topApp)
    .replace(/\{SECOND_APP_HOURS\}/g, String(Math.round(slots.secondAppHours || 0)))
    .replace(/\{SOCIAL_HOURS\}/g, String(Math.round(slots.socialHours || 0)))
    .replace(/\{PICKUPS\}/g, String(slots.pickups))
    .replace(/\{FIRST_PICKUP\}/g, slots.firstPickupTime || 'subah 8 baje')
    .replace(/\{LONGEST_SESSION\}/g, slots.longestSession || '1 ghanta')
    .replace(/\{NOTIFICATIONS\}/g, String(slots.notificationsPerDay || 200))
    .replace(/\{LATE_NIGHT_APP\}/g, slots.lateNightApp)
    .replace(/\{WEEK_PCT\}/g, String(Math.abs(slots.weekOverPreviousPct || 0)));
}

// Every template covers: totalHours, topApp, topAppHours, secondApp, pickups,
// firstPickupTime, notificationsPerDay + at least one tier-specific beat.
const TEMPLATES: Record<Archetype, string> = {
  proud: `Arre {NAME}... kya hua beta? Tabiyat theek hai? Maine tumhari screen time dekhi — sirf {TOTAL_HOURS} ghante is hafte. Itna kam? Kuch ho toh nahi gaya? {TOP_APP} pe bas {TOP_APP_HOURS} ghante. {SECOND_APP} pe bhi sirf {SECOND_APP_HOURS} ghante. Sirf {PICKUPS} baar phone uthaya rozana — seedhi zindagi jee rahe ho. Subah {FIRST_PICKUP} baje pehli baar dekha phone — disciplined lagte ho. Roz sirf {NOTIFICATIONS} notifications aati hain — tumhare dost bhool toh nahi gaye tumhe? Raat ko {LATE_NIGHT_APP} bhi zyada nahi chalaya. Padosi ki Maa ne pucha, aapka beta theek hai na — maine kaha, shaayad padh raha hai, shaayad office. Par ek baat sun lo — itne kam pe rukna mat. Phone band rakhna acchi baat hai, par Maa ko bhi call kar liya karo. Mausi ne pucha tha pichhle hafte. Shaam ko time milta hai toh ek minute ke liye chai pe aa jana. Khaana kha liya aaj? Proud hoon tujhpe. Par call kar liya karo. Bas itna chahiye.`,

  sweet: `Hello {NAME}... kaise ho beta? Maine socha call kar loon, subah se tumhari yaad aa rahi thi. Dekho, maine tumhari screen time dekhi — {TOTAL_HOURS} ghante is hafte. {TOP_APP} pe {TOP_APP_HOURS} ghante akele. {SECOND_APP} pe aur {SECOND_APP_HOURS} ghante. {PICKUPS} baar phone uthaya rozana. Sabse lambi session {LONGEST_SESSION} — ek movie bhi itni lambi nahi hoti. Subah {FIRST_PICKUP} baje sabse pehle phone uthaya — chai tak nahi banayi hogi. Padosi ki beti ne kal LinkedIn pe post daali — naya kaam lag gaya. Tumne kya post kiya? Story? Koi baat nahi. Roz {NOTIFICATIONS} notifications aati hain tumhare phone pe — tumhara phone tumse zyada busy hai. Raat ko {LATE_NIGHT_APP} band kar ke so jaya karo. Aankhen kharab ho rahi hain. Tumhari nahi, meri, tumhe socho-soch ke. Chalo rakhti hoon, khana thanda ho raha hai. Call kar lena kabhi. Tum theek raho, bas itna chahiye.`,

  rage: `Arre {NAME}! Yeh kya chal raha hai? {TOTAL_HOURS} ghante ek hafte mein? {WEEK_PCT} percent zyada pichhle hafte se! Maine chashma khoja teen din phone ke piche — aur tum {TOP_APP} pe {TOP_APP_HOURS} ghante bitaate ho? {SECOND_APP} pe aur {SECOND_APP_HOURS} ghante. {PICKUPS} baar phone uthaaya ek din mein — mujhe {PICKUPS} baar bhi call nahi kiya mahine bhar mein. Sabse lambi session {LONGEST_SESSION} — ek poora natak chalaya phone pe. Subah {FIRST_PICKUP} baje se phone chalu — namaste, pooja, naashta, kuch nahi — seedha phone. Kal Sharma uncle ka call aaya — unka beta Google mein gaya. Maine kya jawab doon? Mera bachha? Reels mein. {NOTIFICATIONS} notifications rozana — tumhara phone bol raha hai, tum nahi. Raat ko {LATE_NIGHT_APP} pe jaagte ho. Tumhare papa ne aaj do baar poocha. Main kya jawab doon? Phone rakho. Abhi. Khaana lag gaya hai.`,
};

export function buildScript(archetype: Archetype, slots: Slots): string {
  return fill(TEMPLATES[archetype], slots);
}

export function signatureLine(archetype: Archetype, slots: Slots): string {
  const lines: Record<Archetype, string> = {
    proud: `Proud hoon tujhpe. Par call kar liya karo. Bas itna chahiye.`,
    sweet: `Chalo rakhti hoon. Khana kha lena. Call kar lena kabhi.`,
    rage: `${slots.pickups} baar phone uthaya. Mujhe ${slots.pickups} baar bhi call nahi kiya mahine bhar mein.`,
  };
  return lines[archetype];
}

// List of protected nouns that must NEVER be translated out.
// App + brand + proper-noun names. Extend as scripts expand.
export const PROTECTED_NAMES = [
  'Instagram', 'Bumble', 'LinkedIn', 'Reels', 'YouTube', 'WhatsApp',
  'TikTok', 'Snapchat', 'X', 'Reddit', 'Chrome', 'Twitter', 'Facebook',
  'Sharma', 'Padosi', 'Mausi', 'Google', 'Goldman Sachs',
];

// Extracts every literal that must survive translation: numbers, clock times,
// durations (2h 15m style), and protected proper nouns.
export function extractProtectedTokens(script: string): string[] {
  const tokens = new Set<string>();
  for (const m of script.match(/\b\d+(?:\.\d+)?\b/g) || []) tokens.add(m);
  for (const m of script.match(/\b\d{1,2}:\d{2}\s*[AP]M\b/gi) || []) tokens.add(m);
  for (const m of script.match(/\b\d+h\s*\d*m?\b/gi) || []) tokens.add(m);
  for (const n of PROTECTED_NAMES) if (script.includes(n)) tokens.add(n);
  return [...tokens];
}
