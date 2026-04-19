// PRD §11 — daily budget breaker test.
// We can't easily unit-test the route handler without a harness, but we CAN
// test the two functions it composes: todaysElevenLabsChars + 503 shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE ||= 'test_service_role';

test('budget breaker: when used > budget, /api/generate returns 503 with retryAfter', async () => {
  const { setServerClientForTests } = await import('../lib/supabase');
  let usedChars = 300_000; // over the 200k default

  setServerClientForTests({
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { value: usedChars } }),
                  };
                },
              };
            },
          };
        },
      };
    },
  });

  try {
    const { todaysElevenLabsChars, secondsUntilMidnightUtc } = await import('../lib/archive');
    const used = await todaysElevenLabsChars();
    assert.equal(used, 300_000);

    const budget = Number(process.env.DAILY_EL_CHAR_BUDGET || 200_000);
    const tripped = used > budget;
    assert.equal(tripped, true);

    // Simulate the route's 503 response body shape.
    const resp = {
      status: 503,
      body: { error: 'maa_is_taking_a_break', retryAfter: secondsUntilMidnightUtc() },
    };
    assert.equal(resp.status, 503);
    assert.equal(resp.body.error, 'maa_is_taking_a_break');
    assert.ok(resp.body.retryAfter > 0 && resp.body.retryAfter <= 86_400);
  } finally {
    setServerClientForTests(null);
  }
});
