const assert = require('node:assert/strict');
const { test } = require('node:test');
const { clientModule } = require('./modules.cjs');

const draft = { amount_ml: 250, drink_type: 'water', note: null, local_date: '2026-10-09', logged_at: '2026-10-09T08:30:00.000Z' };
const record = { ...draft, id: 1 };

test('drinks CRUD uses /api/drinks and preserves complete snake_case records', async () => {
  const { createApiClient } = await clientModule;
  const calls = [];
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json(options.method === 'GET' && !url.endsWith('/1') ? [record] : record);
  } });
  assert.deepEqual(await api.listDrinks(), [record]);
  assert.deepEqual(await api.getDrink(1), record);
  assert.deepEqual(await api.createDrink(draft), record);
  const changes = { amount_ml: 250, drink_type: 'water', note: null };
  assert.deepEqual(await api.updateDrink(1, changes), record);
  assert.equal(await api.deleteDrink(1), undefined);
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'GET', 'POST', 'PUT', 'DELETE']);
  assert.deepEqual(calls.map(({ url }) => new URL(url).pathname), ['/api/drinks', '/api/drinks/1', '/api/drinks', '/api/drinks/1', '/api/drinks/1']);
  assert.deepEqual(JSON.parse(calls[2].body), draft);
  assert.deepEqual(JSON.parse(calls[3].body), changes);
  assert.equal(calls[2].headers['Content-Type'], 'application/json');
});

test('drinks date filtering sends the selected local date without conversion', async () => {
  const { createApiClient } = await clientModule;
  let requestedUrl;
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async (url) => {
    requestedUrl = new URL(url);
    return Response.json([]);
  } });
  await api.listDrinks({ date: '2026-10-09' });
  assert.equal(requestedUrl.pathname, '/api/drinks');
  assert.equal(requestedUrl.searchParams.get('date'), '2026-10-09');
});

test('invalid drink IDs, fields and dates never reach the server', async () => {
  const { createApiClient } = await clientModule;
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => assert.fail('Must not fetch') });
  for (const id of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, '1/2']) {
    await assert.rejects(api.getDrink(id), { code: 'validation' });
    await assert.rejects(api.updateDrink(id, draft), { code: 'validation' });
    await assert.rejects(api.deleteDrink(id), { code: 'validation' });
  }
  for (const value of [
    { ...draft, amount_ml: 0 }, { ...draft, amount_ml: 1.5 }, { ...draft, drink_type: 'invalid' },
    { ...draft, logged_at: '2026-02-30T08:30:00Z' }, { ...draft, local_date: '2026-02-30' },
    { ...draft, note: 42 }
  ]) await assert.rejects(api.createDrink(value), { code: 'validation' });
  await assert.rejects(api.listDrinks({ date: '2026-02-30' }), { code: 'validation' });
});

test('drinks reject failed reads and incomplete write responses', async () => {
  const { createApiClient } = await clientModule;
  for (const [response, expected] of [
    [new Response(null, { status: 404 }), { code: 'http', status: 404 }],
    [Response.json({ ...record, id: '1' }), { code: 'response' }],
    [Response.json({ id: 1, amount_ml: 250, drink_type: 'water', note: null }), { code: 'response' }],
    [new Response('not JSON'), { code: 'response' }]
  ]) {
    const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => response });
    await assert.rejects(api.updateDrink(1, { amount_ml: 250, drink_type: 'water' }), expected);
  }
  const api = createApiClient({ baseUrl: 'https://api.example.test', fetchImpl: async () => Response.json({ error: 'No' }) });
  await assert.rejects(api.listDrinks(), { code: 'response' });
});
