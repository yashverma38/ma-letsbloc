# Marketing evals

Human-judged. Every voice note we ship must pass these.

## Signature-line presence

The output MUST contain at least one of these lines, filled with real data:

- [ ] M1. `Chalo rakhti hoon. Khana kha lena. Call kar lena kabhi.` (sweet closer — the share-rate beat)
- [ ] M2. A specific-number kill shot, e.g. `{PICKUPS} baar phone uthaya. Mujhe itni baar call nahi kiya.`
- [ ] M3. A time-of-day callout, e.g. `Subah {FIRST_PICKUP} baje uthte hi phone.`
- [ ] M4. A comparison beat — Padosi ki beti / Sharma uncle ka beta / Mausi ka call.

## Tone

- [ ] M5. Funny BEFORE hurtful, never hurtful alone.
- [ ] M6. The love is audible — Maa sounds disappointed *on your behalf*, not mean.
- [ ] M7. Hinglish, not pure Hindi, not pure English.
- [ ] M8. No filmi dialogue, paraphrased or otherwise.

## Virality triggers

- [ ] V1. Output contains at least one "screenshottable" line — a sentence that reads complete in isolation.
- [ ] V2. The archetype label on the share card is share-worthy on its own (e.g. "The One Dadi Prays For").
- [ ] V3. At least one line includes a specific number (hours, pickups, notifications) — vague lines don't share.
- [ ] V4. The forward-to-WhatsApp mechanic pre-fills a message that sounds like a friend, not a brand.

## Data-point coverage contract

Every filled script (any tier, any language) must reference at least 6 of the
following, with the literal value preserved across translation:

- `{TOTAL_HOURS}` — weekly total
- `{TOP_APP}` + `{TOP_APP_HOURS}`
- `{SECOND_APP}` + `{SECOND_APP_HOURS}`
- `{PICKUPS}` — daily average
- `{FIRST_PICKUP}` — e.g. 7:45 AM
- `{NOTIFICATIONS}` — daily notifications
- `{LATE_NIGHT_APP}` — most-used after 11 PM
- `{LONGEST_SESSION}` — e.g. "2h 15m"
- `{WEEK_PCT}` — rage tier only; % change vs last week

If a translated script drops more than one of these literal values,
`/api/generate` retries once then falls back to the Hinglish original.

## Cultural safety

- [ ] C1. No body-shaming.
- [ ] C2. No caste, region, or communally divisive references.
- [ ] C3. "Shaadi mein problem" and similar joke beats read as parody of Mom clichés, not as prescriptions.
- [ ] C4. Disclosure appears on the result page AND is spoken at the end of every voice note ("Yeh voice AI hai…").

## Worked example (Yash's screenshot — 51h total, Instagram 21h, Bumble 7h, 14% week-over-week)

The sweet archetype, filled, should read approximately:

> "Hello Yash... kaise ho beta? Maine socha call kar loon, subah se tumhari yaad aa rahi thi. Dekho, maine tumhari screen time dekhi — 51 ghante is hafte. Instagram pe 21 ghante akele. Bumble pe aur 7 ghante. Subah 7:45 baje sabse pehle phone uthaya — chai tak nahi banayi hogi. Padosi ki beti ne kal LinkedIn pe post daali — naya kaam lag gaya. Tumne kya post kiya? Story? Koi baat nahi. Roz 380 notifications aati hain tumhare phone pe — tumhara phone tumse zyada busy hai. Raat ko Instagram band kar ke so jaya karo. Aankhen kharab ho rahi hain. Tumhari nahi, meri, tumhe socho-soch ke. Chalo rakhti hoon, khana thanda ho raha hai. Call kar lena kabhi. Tum theek raho, bas itna chahiye."

Pass criteria: this reads plausible, culturally resonant, and share-worthy to 4 of 5 Gen-Z Indian testers.
