const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');

const clientModule = fs.readFile(path.join(__dirname, '../src/data/api/client.js'), 'utf8')
  .then((source) => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`));

test('reads current API routes and preserves server values', async () => {
  const { createApiClient } = await clientModule;
  const entries = [{ id: 1, date: '2026-10-05', water: 2, symptoms: 'Bloating' }, { id: 2, date: '2026-10-04', water: null, symptoms: null }];
  const calls = [];
  const api = createApiClient({
    baseUrl: ' https://api.example.test/ ',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json(url.endsWith('/api/health') ? { status: 'ok', message: 'Ready' } : entries);
    },
  });
  assert.deepEqual(await api.getHealth(), { status: 'ok', message: 'Ready' });
  assert.deepEqual(await api.getDiary(), entries);
  assert.deepEqual(calls.map(({ url }) => url), ['https://api.example.test/api/health', 'https://api.example.test/api/diary']);
  assert.ok(calls.every(({ options }) => options.method === 'GET' && options.headers.Accept === 'application/json' && options.signal instanceof AbortSignal));
});

test('missing or invalid configuration never makes a request', async () => {
  const { createApiClient } = await clientModule;
  for (const baseUrl of [undefined, '', 'file:///private/data', 'not a URL']) {
    const api = createApiClient({ baseUrl, fetchImpl: async () => assert.fail('Must not fetch') });
    await assert.rejects(api.getHealth(), { code: 'configuration' });
  }
});

test('rejects network, HTTP, invalid JSON and malformed endpoint responses', async () => {
  const { createApiClient } = await clientModule;
  const cases = [
    { fetchImpl: async () => { throw new TypeError('Failed to fetch'); }, code: 'network' },
    { fetchImpl: async () => new Response('Unavailable', { status: 503 }), code: 'http' },
    { fetchImpl: async () => new Response('not JSON'), code: 'response' },
    { fetchImpl: async () => Response.json({ status: 'bad', message: 'No' }), code: 'response' },
  ];
  for (const { fetchImpl, code } of cases) {
    const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl });
    await assert.rejects(api.getHealth(), { code });
  }
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => Response.json([{ id: 1, date: '2026-10-05', water: '2', symptoms: null }]) });
  await assert.rejects(api.getDiary(), { code: 'response' });
});

test('timeout and caller cancellation abort pending requests', async () => {
  const { createApiClient } = await clientModule;
  let requestSignal;
  const api = createApiClient({
    baseUrl: 'https://api.example.test', timeoutMs: 20,
    fetchImpl: async (_, options) => {
      requestSignal = options.signal;
      return new Promise(() => {});
    },
  });
  await assert.rejects(api.getDiary(), { code: 'timeout' });
  assert.equal(requestSignal.aborted, true);

  const controller = new AbortController();
  const pending = api.getHealth({ signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: 'cancelled' });
  assert.equal(requestSignal.aborted, true);

  await assert.rejects(api.getHealth({ signal: controller.signal }), { code: 'cancelled' });
});

test('timeout includes a stalled response body', async () => {
  const { createApiClient } = await clientModule;
  const api = createApiClient({
    baseUrl: 'https://api.example.test', timeoutMs: 20,
    fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }),
  });
  await assert.rejects(api.getHealth(), { code: 'timeout' });
});
