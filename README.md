# ma.letsbloc.com

**Maa is calling.** An AI voice note from Maa, built to roast your screen time.

Upload a Screen Time / Digital Wellbeing screenshot → Gemini reads it → an archetype is chosen → ElevenLabs speaks Maa's voice note → share to WhatsApp.

## Stack

- **Next.js 14** (app router, TypeScript)
- **Tailwind CSS**
- **Google Gemini 2.5 Flash** (Vision OCR)
- **ElevenLabs multilingual v2** (Hindi / Hinglish TTS)
- **Supabase** (Postgres + Storage)
- **Vercel** (hosting)

## Run locally

```bash
# 1. install
npm install

# 2. env
cp .env.example .env.local
# fill in GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE

# 3. supabase setup (one time)
#   - create a project
#   - open SQL editor, paste supabase/schema.sql, run it
#   - Storage → new bucket named "maa-audio" → public read
#   - paste the project URL + service role key into .env.local

# 4. dev
npm run dev
# open http://localhost:3000
```

## Deploy

```bash
npx vercel --prod
```

Set the same env vars in Vercel Settings → Environment Variables. Add `ma.letsbloc.com` under Domains.

## Routes

| Path | Purpose |
|---|---|
| `/` | Landing page + waitlist |
| `/cooked` | Upload Screen Time screenshot |
| `/cooked/[id]` | Play voice note + share |
| `/api/waitlist` | POST `{ email }` → `waitlist` |
| `/api/analyze` | POST `image` (multipart) → Gemini JSON |
| `/api/generate` | POST JSON → ElevenLabs audio + DB row |

## Structure

```
app/
├── page.tsx                  # landing (waitlist)
├── cooked/
│   ├── page.tsx              # upload
│   └── [id]/page.tsx         # result
├── api/
│   ├── waitlist/route.ts
│   ├── analyze/route.ts
│   └── generate/route.ts
└── layout.tsx · globals.css · not-found.tsx
components/
└── ResultClient.tsx
lib/
├── types.ts · archetype.ts · scripts.ts
├── gemini.ts · elevenlabs.ts · supabase.ts
supabase/
└── schema.sql
```

## Archetype selection

Simple rule-based (see `lib/archetype.ts`):

- `dadi` — ≥ 8 hrs/day average
- `rage` — ≥ 6 hrs/day, or ≥ 120 pickups/day
- `sweet` — everything else (default)

## Notes

- Voices are AI-generated. Always disclose this.
- Never clone a real person's voice without explicit consent.
- Screenshot processing should not persist the raw image — only the extracted numeric data is stored.

## License

MIT
