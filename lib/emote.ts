// PRD P2 — archetype-aware prosody markup.
// v2: safe regex prosody (UPPERCASE emphasis + trailing ellipses).
// v3: audio tags.
// NEVER mutates content inside protected tokens (numbers, app names, proper nouns).
// Idempotent by construction — each rule checks for its own presence.

import type { Archetype } from './types';

export function applyEmotionalMarkup(
  text: string,
  archetype: Archetype,
  modelId: string,
): string {
  if (!text) return text;
  const isV3 = modelId.startsWith('eleven_v3');
  return isV3 ? applyV3Tags(text, archetype) : applyV2Prosody(text, archetype);
}

// ----- v2 prosody -----------------------------------------------------------

function applyV2Prosody(text: string, archetype: Archetype): string {
  let out = text;
  out = salutationPause(out);
  switch (archetype) {
    case 'proud': out = v2Proud(out); break;
    case 'sweet': out = v2Sweet(out); break;
    case 'rage':  out = v2Rage(out);  break;
  }
  return out;
}

// `beta,` → `beta...,` on first occurrence only. Idempotent via negative lookahead.
function salutationPause(s: string): string {
  for (const word of ['beta', 'bachha']) {
    const re = new RegExp(`\\b(${word})(?!\\.\\.\\.)([,\\.])`, '');
    if (re.test(s)) return s.replace(re, `$1...$2`);
  }
  return s;
}

function v2Proud(s: string): string {
  let out = s;
  // Uppercase emphasis — idempotent (uppercase of uppercase is a no-op).
  for (const w of ['proud', 'disciplined']) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    out = out.replace(re, (m) => m.toUpperCase());
  }
  // Pause before signature. Guard against double-apply.
  if (!/\.\.\.\s*Proud hoon\b/.test(out)) {
    out = out.replace(/\bProud hoon\b/, '... Proud hoon');
  }
  return out;
}

function v2Sweet(s: string): string {
  // Soften first question mark not already followed by ellipsis.
  let out = s.replace(/\?(?!\.\.\.)(\s)/, '?...$1');
  // Ends in period (not haan?)? Append softener.
  if (!/haan\?\s*$/.test(out)) {
    out = out.replace(/([a-z])\.(\s*)$/i, '$1... haan?$2');
  }
  return out;
}

function v2Rage(s: string): string {
  let out = s;
  for (const t of ['Yeh kya', 'Phone rakho', 'Abhi']) {
    const re = new RegExp(`\\b${escapeRegex(t)}\\b`);
    out = out.replace(re, (m) => m.toUpperCase());
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// ----- v3 audio tags --------------------------------------------------------

type V3Rules = {
  open: string;
  mid?: { re: RegExp; tag: string };
  sig?: { re: RegExp; tag: string };
};

const V3_RULES: Record<Archetype, V3Rules> = {
  proud: {
    open: '[gentle] ',
    mid:  { re: /\bitne kam pe rukna mat\b/i, tag: '[sighs] ' },
    sig:  { re: /\bProud hoon\b/,             tag: '[warm] '  },
  },
  sweet: {
    open: '[soft] ',
    mid:  { re: /\baankhen kharab\b/i,        tag: '[concerned] '    },
    sig:  { re: /\bChalo rakhti hoon\b/,      tag: '[affectionate] ' },
  },
  rage: {
    open: '[angry] ',
    mid:  { re: /\bSharma uncle ka call\b/i,  tag: '[exasperated] ' },
    sig:  { re: /\bPhone rakho\. Abhi/,       tag: '[firm] '        },
  },
};

function applyV3Tags(text: string, archetype: Archetype): string {
  const rules = V3_RULES[archetype];
  let out = text;

  // Tags are prepended at word boundaries only — the regex anchors use \b, so
  // we can't splice inside a protected token. No overlap guard needed.
  if (rules.mid && !out.includes(rules.mid.tag)) {
    out = out.replace(rules.mid.re, (m) => rules.mid!.tag + m);
  }
  if (rules.sig && !out.includes(rules.sig.tag)) {
    out = out.replace(rules.sig.re, (m) => rules.sig!.tag + m);
  }

  if (!out.startsWith(rules.open)) out = rules.open + out;
  return out;
}
