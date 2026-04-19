// PRD P2 — emotional markup invariants.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyEmotionalMarkup } from '../lib/emote';

const V2 = 'eleven_multilingual_v2';
const V3 = 'eleven_v3';

// ----- v2 prosody -----------------------------------------------------------

test('v2 proud: uppercases "proud" and pauses before signature', () => {
  const src = 'Arre Rohit... beta, proud hoon. Proud hoon tujhpe.';
  const out = applyEmotionalMarkup(src, 'proud', V2);
  assert.match(out, /beta\.\.\./);
  assert.match(out, /PROUD hoon/);
  assert.match(out, /\.\.\. Proud hoon/);
});

test('v2 sweet: softens first question + appends haan? at sentence end', () => {
  const src = 'Kaise ho beta? Chalo rakhti hoon. Khana kha lena.';
  const out = applyEmotionalMarkup(src, 'sweet', V2);
  assert.match(out, /\?\.\.\. /);
  assert.match(out, /haan\?$/);
});

test('v2 rage: uppercases rage triggers', () => {
  const src = 'Yeh kya chal raha hai? Phone rakho. Abhi.';
  const out = applyEmotionalMarkup(src, 'rage', V2);
  assert.match(out, /YEH KYA/);
  assert.match(out, /PHONE RAKHO/);
});

test('v2 idempotency: double application equals single', () => {
  for (const arch of ['proud', 'sweet', 'rage'] as const) {
    const src = 'Arre Rohit beta, proud hoon? Phone rakho. Abhi. Proud hoon.';
    const once  = applyEmotionalMarkup(src, arch, V2);
    const twice = applyEmotionalMarkup(once, arch, V2);
    assert.equal(twice, once, `archetype=${arch} was not idempotent`);
  }
});

test('v2 preserves protected numeric/app-name tokens exactly once', () => {
  const src = 'Instagram pe 14 ghante. Proud hoon tujhpe. Beta, chalo.';
  const out = applyEmotionalMarkup(src, 'proud', V2);
  assert.equal((out.match(/Instagram/g) || []).length, 1);
  assert.equal((out.match(/\b14\b/g) || []).length, 1);
  // tokens must still read byte-identical
  assert.ok(out.includes('Instagram pe 14 ghante'));
});

// ----- v3 audio tags --------------------------------------------------------

test('v3 proud: opens with [gentle], tags signature, places [sighs] on mid-line', () => {
  const src = 'Arre beta. itne kam pe rukna mat. Proud hoon tujhpe.';
  const out = applyEmotionalMarkup(src, 'proud', V3);
  assert.match(out, /^\[gentle\] /);
  assert.match(out, /\[sighs\] itne kam pe rukna mat/);
  assert.match(out, /\[warm\] Proud hoon/);
});

test('v3 sweet: opens with [soft], closes with [affectionate]', () => {
  const src = 'Hello beta. aankhen kharab. Chalo rakhti hoon.';
  const out = applyEmotionalMarkup(src, 'sweet', V3);
  assert.match(out, /^\[soft\] /);
  assert.match(out, /\[concerned\] aankhen kharab/);
  assert.match(out, /\[affectionate\] Chalo rakhti hoon/);
});

test('v3 rage: opens [angry], tags Sharma mention + Phone rakho', () => {
  const src = 'Arre beta. Sharma uncle ka call aaya. Phone rakho. Abhi.';
  const out = applyEmotionalMarkup(src, 'rage', V3);
  assert.match(out, /^\[angry\] /);
  assert.match(out, /\[exasperated\] Sharma uncle ka call/);
  assert.match(out, /\[firm\] Phone rakho\. Abhi/);
});

test('v3 idempotency: double application equals single', () => {
  for (const arch of ['proud', 'sweet', 'rage'] as const) {
    const src = 'Arre beta. itne kam pe rukna mat. Proud hoon. aankhen kharab. Chalo rakhti hoon. Sharma uncle ka call. Phone rakho. Abhi.';
    const once  = applyEmotionalMarkup(src, arch, V3);
    const twice = applyEmotionalMarkup(once, arch, V3);
    assert.equal(twice, once, `archetype=${arch} was not idempotent`);
  }
});

test('v3 preserves Instagram / numeric tokens exactly once', () => {
  const src = 'Instagram pe 14 ghante. Proud hoon tujhpe. Beta.';
  const out = applyEmotionalMarkup(src, 'proud', V3);
  assert.equal((out.match(/Instagram/g) || []).length, 1);
  assert.equal((out.match(/\b14\b/g) || []).length, 1);
  assert.ok(out.includes('Instagram pe 14 ghante'));
});

test('empty string passes through unchanged', () => {
  assert.equal(applyEmotionalMarkup('', 'rage', V2), '');
  assert.equal(applyEmotionalMarkup('', 'rage', V3), '');
});

test('unknown model id defaults to v2 behavior', () => {
  const out = applyEmotionalMarkup('proud hoon', 'proud', 'something-else');
  assert.match(out, /PROUD hoon/);
});
