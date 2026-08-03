import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmUpdatesThrough, getUpdates } from './telegram.mjs';

process.env.TELEGRAM_BOT_TOKEN = 'test-token';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('getUpdates retries a transient Telegram 502 response', async () => {
  let attempts = 0;
  const delays = [];
  const result = await getUpdates({
    retryDelaysMs: [0],
    sleepImpl: async (ms) => delays.push(ms),
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return jsonResponse({ ok: false, error_code: 502, description: 'Bad Gateway' }, 502);
      }
      return jsonResponse({ ok: true, result: [{ update_id: 42 }] });
    },
  });

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [0]);
  assert.deepEqual(result, [{ update_id: 42 }]);
});

test('getUpdates does not retry a permanent Telegram 401 response', async () => {
  let attempts = 0;
  await assert.rejects(
    getUpdates({
      retryDelaysMs: [0, 0],
      sleepImpl: async () => {},
      fetchImpl: async () => {
        attempts += 1;
        return jsonResponse({ ok: false, error_code: 401, description: 'Unauthorized' }, 401);
      },
    }),
    /Telegram getUpdates failed/,
  );

  assert.equal(attempts, 1);
});

test('confirmUpdatesThrough advances the Telegram offset', async () => {
  let requestedUrl;
  await confirmUpdatesThrough(99, {
    retryDelaysMs: [],
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return jsonResponse({ ok: true, result: [] });
    },
  });

  assert.equal(requestedUrl.searchParams.get('offset'), '100');
  assert.equal(requestedUrl.searchParams.get('timeout'), '0');
});
