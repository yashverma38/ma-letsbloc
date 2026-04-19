import type { Archetype, ScreenTimeData } from './types';

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

const TEMPLATES: Record<Archetype, string> = {
  sweet: `Hello {NAME}... kaise ho beta? Maine socha call kar loon, subah se tumhari yaad aa rahi thi. Dekho, maine tumhari screen time dekhi — {TOTAL_HOURS} ghante is hafte. {TOP_APP} pe {TOP_APP_HOURS} ghante akele. {SECOND_APP} pe aur {SECOND_APP_HOURS} ghante. Subah {FIRST_PICKUP} baje sabse pehle phone uthaya — chai tak nahi banayi hogi. Padosi ki beti ne kal LinkedIn pe post daali — naya kaam lag gaya. Tumne kya post kiya? Story? Koi baat nahi. Roz {NOTIFICATIONS} notifications aati hain tumhare phone pe — tumhara phone tumse zyada busy hai. Raat ko {LATE_NIGHT_APP} band kar ke so jaya karo. Aankhen kharab ho rahi hain. Tumhari nahi, meri, tumhe socho-soch ke. Chalo rakhti hoon, khana thanda ho raha hai. Call kar lena kabhi. Tum theek raho, bas itna chahiye.`,

  rage: `Arre {NAME}! Yeh kya chal raha hai? {TOTAL_HOURS} ghante ek hafte mein? {WEEK_PCT} percent zyada pichhle hafte se! Maine chashma khoja teen din phone ke piche — aur tum {TOP_APP} pe {TOP_APP_HOURS} ghante bitaate ho? {PICKUPS} baar phone uthaaya ek din mein — mujhe {PICKUPS} baar bhi call nahi kiya mahine bhar mein. Subah {FIRST_PICKUP} baje se phone chalu — namaste, pooja, naashta, kuch nahi — seedha phone. Kal Sharma uncle ka call aaya — unka beta Google mein gaya. Maine kya jawab doon? Mera bachha? Reels mein. {NOTIFICATIONS} notifications rozana — tumhara phone bol raha hai, tum nahi. Tumhare papa ne aaj do baar poocha. Main kya jawab doon? Phone rakho. Abhi. Khana lag gaya hai.`,

  dadi: `Aao beta, paas baitho. Humare zamane mein ek TV tha — woh bhi ek ghanta chalta tha. Aur tum... kya kehte hain... rill? Reel? {TOP_APP_HOURS} ghante {TOP_APP} pe. Ek hafte mein {TOTAL_HOURS} ghante — yeh toh poora din beth-beth ke kat jaata hai. Subah {FIRST_PICKUP} baje uthte hi phone — Bhagwan ka naam leti hoon pehle main. Sabse lambi session {LONGEST_SESSION} — aankhen toh bachpan mein hi kharab karvaa lega. Raat ko {LATE_NIGHT_APP} pe jaagte ho — pet garm ho jayega, aankhon ke niche kaale daag aa jayenge. Chalo, tulsi pe pani daalo. Hanuman Chalisa sun lo ek baar. Phone mein dhyan mat lagao, pooja mein lagao. Jeete raho. Par phone kam karo, nahi toh dant padegi.`,
};

export function buildScript(archetype: Archetype, slots: Slots): string {
  return fill(TEMPLATES[archetype], slots);
}

export function signatureLine(archetype: Archetype, slots: Slots): string {
  const lines: Record<Archetype, string> = {
    sweet: `Chalo rakhti hoon. Khana kha lena. Call kar lena kabhi.`,
    rage: `${slots.pickups} baar phone uthaya. Mujhe ${slots.pickups} baar bhi call nahi kiya mahine bhar mein.`,
    dadi: `Phone mein dhyan mat lagao, pooja mein lagao.`,
  };
  return lines[archetype];
}
