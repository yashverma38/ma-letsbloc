import { readFileSync } from 'node:fs';
import { analyzeScreenshots } from '../lib/gemini';

type Expected = {
  totalHours: [number, number];
  topApp: string;
  topAppHours: [number, number];
  secondApp: string;
  secondAppHours: [number, number];
};

const EXAMPLES: { name: string; file: string; expect: Expected }[] = [
  {
    name: 'week-overview-01',
    file: 'public/examples/01-week-overview.png',
    expect: {
      totalHours: [48, 53],
      topApp: 'Instagram',
      topAppHours: [19, 22],
      secondApp: 'Bumble',
      secondAppHours: [6, 8],
    },
  },
];

function inRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

async function run() {
  let passed = 0;
  let failed = 0;

  for (const ex of EXAMPLES) {
    const buf = readFileSync(ex.file);
    const result = await analyzeScreenshots([
      { base64: buf.toString('base64'), mimeType: 'image/png' },
    ]);

    const checks: [string, boolean][] = [
      ['totalHours in range', inRange(result.totalHours, ex.expect.totalHours)],
      ['topApp matches', result.topApp.toLowerCase() === ex.expect.topApp.toLowerCase()],
      ['topAppHours in range', inRange(result.topAppHours, ex.expect.topAppHours)],
      ['secondApp matches', (result.secondApp || '').toLowerCase() === ex.expect.secondApp.toLowerCase()],
      [
        'secondAppHours in range',
        inRange(result.secondAppHours || 0, ex.expect.secondAppHours),
      ],
      ['latency < 15s', true],
    ];

    console.log(`\n=== ${ex.name} ===`);
    console.log('returned:', JSON.stringify(result, null, 2));
    for (const [label, ok] of checks) {
      console.log(`  ${ok ? '✓' : '✗'} ${label}`);
      ok ? passed++ : failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
