# ma.letsbloc.com

Waitlist landing page for **Maa is calling** — an AI-generated WhatsApp voice note from Maa, built to roast your screen time.

The page is a single `index.html` file designed as a fake iPhone lockscreen with an incoming call from "Maa." Visitors "answer" by entering their email.

## Stack

- Plain HTML, CSS, vanilla JS — no build step, no framework
- Google Fonts (Inter, Noto Sans Devanagari)
- Form submissions via [Formspree](https://formspree.io)
- Static hosting (Vercel / Netlify / Cloudflare Pages / any static host)

## Run locally

```bash
# just open it
open index.html

# or serve it
npx serve .
```

## Deploy

### 1. Create a Formspree form
Sign up at [formspree.io](https://formspree.io), create a form, copy its endpoint URL (e.g. `https://formspree.io/f/xxxxxxx`).

### 2. Wire the endpoint
In `index.html`, find:

```js
const FORMSPREE_URL = "%%FORMSPREE_URL%%";
```

Replace the placeholder with your Formspree URL.

### 3. Ship it
Any static host works. Example with Vercel:

```bash
npx vercel --prod
```

Then point your domain at the deployed URL via your host's dashboard.

## Structure

```
.
├── index.html    # entire site (markup + styles + script inline)
├── LICENSE
└── README.md
```

## Notes

- If `FORMSPREE_URL` is left as the placeholder, the form still shows a success state for local preview — emails are only logged to console, not captured.
- Waitlist counter is currently a static base + local increments. Swap to a real count when a backend exists.
- Mobile-first: the phone-frame visual is the whole point; it reads as a 3D iPhone on desktop and full-frame on mobile.

## License

MIT
