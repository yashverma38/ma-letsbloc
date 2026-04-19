import type { Archetype, ScreenTimeData } from './types';

type Slots = ScreenTimeData & { name: string };

function fill(template: string, slots: Slots): string {
  return template
    .replace(/\{NAME\}/g, slots.name)
    .replace(/\{TOTAL_HOURS\}/g, String(Math.round(slots.totalHours)))
    .replace(/\{TOP_APP\}/g, slots.topApp)
    .replace(/\{TOP_APP_HOURS\}/g, String(Math.round(slots.topAppHours)))
    .replace(/\{PICKUPS\}/g, String(slots.pickups))
    .replace(/\{LATE_NIGHT_APP\}/g, slots.lateNightApp);
}

const TEMPLATES: Record<Archetype, string> = {
  sweet: `Hello {NAME}... kaise ho beta? Maine socha call kar loon, subah se tumhari yaad aa rahi thi. Dekho, maine tumhari screen time dekhi — {TOTAL_HOURS} ghante is hafte. {TOP_APP} pe {TOP_APP_HOURS} ghante akele. Padosi ki beti ne kal LinkedIn pe post daali — naya kaam lag gaya. Tumne kya post kiya? Story? Koi baat nahi. Khaana kha liya aaj? Chai banayi subah? Tumhare papa ne pucha, kya kar raha hai phone mein itna — maine jawab nahi de paayi. Bas ek baat — raat ko {LATE_NIGHT_APP} band kar ke so jaya karo. Aankhen kharab ho rahi hain. Tumhari nahi, meri, tumhe socho-soch ke. Chalo rakhti hoon, khana thanda ho raha hai. Call kar lena kabhi. Tum theek raho, bas itna chahiye.`,

  rage: `Arre {NAME}! Yeh kya chal raha hai? {TOTAL_HOURS} ghante? Ek hafte mein? Maine chashma khoja teen din phone ke piche — aur tum {TOP_APP} pe {TOP_APP_HOURS} ghante bitaate ho? {PICKUPS} baar phone uthaaya ek din mein — mujhe {PICKUPS} baar bhi call nahi kiya mahine bhar mein. Kal Sharma uncle ka call aaya — unka beta Google mein gaya. Maine kya jawab doon? Mera bachha? Reels mein. Mausi poochti hai kya kar raha hai — maine kehti hoon job dhoondh raha hai. Aur tum? {LATE_NIGHT_APP} pe raat bhar. Tumhare papa ne aaj do baar poocha. Main kya jawab doon? Phone rakho. Abhi. Khana lag gaya hai, saat baje ka pakaya — ab dus baj rahe hain.`,

  dadi: `Aao beta, paas baitho. Humare zamane mein ek TV tha — woh bhi ek ghanta chalta tha. Aur tum... kya kehte hain... rill? Reel? {TOP_APP_HOURS} ghante. Haath-paav sun ho gaye honge. Raat ko {LATE_NIGHT_APP} pe jaagte ho — pet garm ho jayega, aankhon ke niche kaale daag aa jayenge, shaadi mein problem hogi. Bhagwan ne raat sone ke liye banayi hai. Chalo, tulsi pe pani daalo. Hanuman Chalisa sun lo ek baar. Phone mein dhyan mat lagao, pooja mein lagao. Jeete raho. Par phone kam karo, nahi toh dant padegi.`,
};

export function buildScript(archetype: Archetype, slots: Slots): string {
  return fill(TEMPLATES[archetype], slots);
}

export function signatureLine(archetype: Archetype, slots: Slots): string {
  const lines: Record<Archetype, string> = {
    sweet: `Chalo rakhti hoon. Khana kha lena. Call kar lena kabhi.`,
    rage: `Mujhe ${slots.pickups} baar bhi call nahi kiya mahine bhar mein.`,
    dadi: `Phone mein dhyan mat lagao, pooja mein lagao.`,
  };
  return lines[archetype];
}
