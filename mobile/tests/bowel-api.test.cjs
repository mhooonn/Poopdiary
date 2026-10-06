const assert = require('node:assert/strict');
const { test } = require('node:test');
const { clientModule } = require('./modules.cjs');

const draft = {
  occurred_at: '2026-10-06T08:00:00.000Z', stool_type: 4, effort: 'normal',
  symptoms: [], bloating_level: null, pain_level: null, pain_location: null, urgency_level: null, notes: '',
};
const record = { ...draft, id: 1, created_at: '2026-10-06T08:01:00.000Z', updated_at: '2026-10-06T08:01:00.000Z' };

test('bowel CRUD uses correct endpoints, JSON writes and empty DELETE responses', async () => {
  const { createApiClient } = await clientModule;
  const calls = [];
  const api = createApiClient({
    baseUrl: 'https://api.example.test',
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      if (options.method === 'DELETE') return new Response(null, { status: 204 });
      return Response.json(url.endsWith('/api/bowel') && options.method === 'GET' ? [record] : record, { status: options.method === 'POST' ? 201 : 200 });
    },
  });
  assert.deepEqual(await api.listBowel(), [record]);
  assert.deepEqual(await api.getBowel(1), record);
  assert.deepEqual(await api.createBowel(draft), record);
  assert.deepEqual(await api.updateBowel(1, draft), record);
  assert.equal(await api.deleteBowel(1), undefined);
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'GET', 'POST', 'PUT', 'DELETE']);
  assert.deepEqual(calls.map(({ url }) => new URL(url).pathname), ['/api/bowel', '/api/bowel/1', '/api/bowel', '/api/bowel/1', '/api/bowel/1']);
  for (const request of calls.filter(({ body }) => body)) {
    assert.equal(request.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.body), draft);
  }
});

test('invalid IDs and payloads never reach the server', async () => {
  const { createApiClient } = await clientModule;
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => assert.fail('Must not fetch') });
  for (const id of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, '1/2']) {
    await assert.rejects(api.getBowel(id), { code: 'validation' });
    await assert.rejects(api.updateBowel(id, draft), { code: 'validation' });
    await assert.rejects(api.deleteBowel(id), { code: 'validation' });
  }
  await assert.rejects(api.createBowel({ ...draft, stool_type: undefined }), { code: 'validation' });
  await assert.rejects(api.listBowel({ from: 'not a date' }), { code: 'validation' });
  await assert.rejects(api.listBowel({ from: '2026-10-07T00:00:00Z', to: '2026-10-06T00:00:00Z' }), { code: 'validation' });
});

test('server errors and malformed writes never report a successful save', async () => {
  const { createApiClient } = await clientModule;
  for (const [response, expected] of [
    [new Response(null, { status: 404 }), { code: 'http', status: 404 }],
    [Response.json({ ...record, id: '1' }), { code: 'response' }],
    [new Response('not JSON'), { code: 'response' }],
  ]) {
    const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => response });
    await assert.rejects(api.createBowel(draft), expected);
  }
});

test('list date ranges encode UTC boundaries without reinterpreting timestamps', async () => {
  const { createApiClient } = await clientModule;
  let requestedUrl;
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async (url) => { requestedUrl = new URL(url); return Response.json([]); } });
  const from = '2026-10-05T21:00:00.000Z';
  const to = '2026-10-06T20:59:59.999Z';
  await api.listBowel({ from, to });
  assert.equal(requestedUrl.searchParams.get('from'), from);
  assert.equal(requestedUrl.searchParams.get('to'), to);
});

test('write timeouts include stalled response bodies and cancellation aborts writes', async () => {
  const { createApiClient } = await clientModule;
  const stalled = createApiClient({ baseUrl: 'https://api.example.test', timeoutMs: 20, fetchImpl: async () => ({ ok: true, status: 201, json: () => new Promise(() => {}) }) });
  await assert.rejects(stalled.createBowel(draft), { code: 'timeout' });
  let signal;
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async (_, options) => { signal = options.signal; return new Promise(() => {}); } });
  const controller = new AbortController();
  const pending = api.updateBowel(1, draft, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: 'cancelled' });
  assert.equal(signal.aborted, true);
});
