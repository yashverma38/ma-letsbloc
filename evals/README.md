# Evals

Three evaluation tracks, one folder. Run before every production change.

| Eval | File | What it checks |
|---|---|---|
| Engineering | `engineering.ts` | Gemini extraction accuracy on known screenshots |
| Product | `product.md` | Upload flow works, drop-off risks, fallbacks |
| Marketing | `marketing.md` | Maa's output makes people want to share |

## Running

```bash
# engineering (requires OpenCode CLI configured + test fixtures)
tsx evals/engineering.ts
```

Product and marketing evals are judged, not automated. Run them with 5 real users before any launch.

## Ground truth

`engineering.ts` uses `public/examples/01-week-overview.png` as the canonical test input. Expected extraction values are derived from the visible numbers in that image.
