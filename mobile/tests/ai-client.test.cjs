const test = require('node:test');
const assert = require('node:assert/strict');
const { aiClientModule } = require('./modules.cjs');

const settings = { endpoint: 'https://ai.example/v1', model: 'gpt-6.1-sol', apiKey: 'test-secret' };
const reportContent = JSON.stringify({
  headline: 'Could juice be upsetting your stomach?',
  summary: 'You recorded bloating more often on days with juice. A small change is worth trying.',
  patterns: [{ title: 'More bloating on days with juice', evidence: 'Bloating appeared on 4 of 6 days with juice, and 2 of 6 without a juice entry.', interpretation: 'Juice may be worth a closer look, though other foods could play a part.', confidence: 'early' }],
  recommendations: [{ title: 'Try a week without juice', action: 'Swap your usual juice for water for a week. Keep your other habits similar.', reason: 'This helps you see whether juice makes a difference.' }],
  nextCheck: 'Does your stomach feel less bloated after a week without juice?',
  dataGaps: ['The diary does not show whether you drank juice before the bloating.'],
});

test('model discovery uses the configured endpoint and authorization header', async () => {
  const { listAiModels } = await aiClientModule;
  let request;
  const models = await listAiModels(settings, async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ data: [{ id: 'gpt-6.1-sol' }, { id: 'gpt-6-sol' }] }), { status: 200 });
  });
  assert.equal(request.url, 'https://ai.example/v1/models');
  assert.equal(request.init.headers.Authorization, 'Bearer test-secret');
  assert.deepEqual(models, ['gpt-6-sol', 'gpt-6.1-sol']);
});

test('report generation sends the selected model and validates the structured response', async () => {
  const { generateInsightReport } = await aiClientModule;
  let request;
  const report = await generateInsightReport(settings, { periodDays: 7 }, undefined, async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ choices: [{ message: { content: reportContent } }] }), { status: 200 });
  });
  const body = JSON.parse(request.init.body);
  assert.equal(request.url, 'https://ai.example/v1/chat/completions');
  assert.equal(body.model, 'gpt-6.1-sol');
  assert.equal(body.temperature, 0.25);
  assert.equal(body.messages[0].role, 'system');
  assert.match(body.messages[1].content, /Create a 7-day report using the last 7 days only/);
  assert.equal(JSON.parse(body.messages[1].content.split('\n').at(-1)).periodDays, 7);
  assert.equal(report.recommendations[0].title, 'Try a week without juice');
  assert.deepEqual(report, JSON.parse(reportContent));
});

test('30-day generation asks for patterns across the whole month and sends the monthly payload', async () => {
  const { generateInsightReport } = await aiClientModule;
  const payload = { periodDays: 30, bowel: [{ day: 1, stoolShape: 'Hard pellets' }, { day: 30, stoolShape: 'Smooth and soft' }] };
  let messages;
  await generateInsightReport(settings, payload, undefined, async (_url, init) => {
    messages = JSON.parse(init.body).messages;
    return new Response(JSON.stringify({ choices: [{ message: { content: reportContent } }] }), { status: 200 });
  });
  assert.match(messages[1].content, /Create a 30-day report using all 30 days/);
  assert.match(messages[1].content, /Do not reduce the analysis to the latest 7 days/);
  assert.deepEqual(JSON.parse(messages[1].content.split('\n').at(-1)), payload);
});

test('unsupported report periods fail before making an AI request', async () => {
  const { generateInsightReport } = await aiClientModule;
  let requested = false;
  await assert.rejects(generateInsightReport(settings, { periodDays: 14 }, undefined, async () => {
    requested = true;
    return new Response('{}');
  }), /Choose a 7-day or 30-day report/);
  assert.equal(requested, false);
});

test('AI errors never expose the configured key', async () => {
  const { listAiModels } = await aiClientModule;
  await assert.rejects(
    listAiModels(settings, async () => new Response('{}', { status: 401 })),
    (error) => error.message.includes('API key was rejected') && !error.message.includes(settings.apiKey),
  );
});
