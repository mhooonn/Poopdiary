const test = require('node:test');
const assert = require('node:assert/strict');
const { aiModelModule } = require('./modules.cjs');

test('AI payload keeps useful diary signals and excludes private fields', async () => {
  const { buildAiDataPayload } = await aiModelModule;
  const payload = buildAiDataPayload({
    food: [{ id: 99, date: '2026-10-20', food_name: 'Oats', meal_type: 'Breakfast', notes: 'private', photo: 'file://secret' }],
    bowel: [{ id: 98, occurred_at: '2026-10-20T12:00:00Z', stool_type: 2, effort: 'difficult', symptoms: ['bloating'], notes: 'private' }],
    water: [{ id: 97, local_date: '2026-10-20', amount_ml: 300, drink_type: 'water', note: 'private' }],
    exercise: [{ id: 96, local_date: '2026-10-20', exercise_type: 'Walk', duration_minutes: 20, notes: 'private' }],
  }, 7, new Date(2026, 9, 20, 12));

  const serialized = JSON.stringify(payload);
  assert.match(serialized, /Oats/);
  assert.match(serialized, /difficult/);
  assert.match(serialized, /300/);
  assert.match(serialized, /20/);
  assert.doesNotMatch(serialized, /private|secret|"id"|file:\/\//);
  assert.equal(payload.coverage.bowelRecords, 1);
  assert.equal(payload.coverage.daysWithAnyLog, 1);
  assert.equal(payload.bowel[0].stoolShape, 'Lumpy sausage');
  assert.equal(payload.bowel[0].stoolDescription, 'Sausage-shaped, with lumps');
  assert.equal(Object.hasOwn(payload.bowel[0], 'stoolType'), false);
});

test('AI receives distinct descriptions for all seven shapes and preserves unknown shapes', async () => {
  const { buildAiDataPayload } = await aiModelModule;
  const payload = buildAiDataPayload({
    food: [], water: [], exercise: [],
    bowel: [1, 2, 3, 4, 5, 6, 7, null, 99].map((stool_type) => ({ occurred_at: '2026-10-20T12:00:00Z', stool_type })),
  }, 7, new Date(2026, 9, 20, 12));

  assert.deepEqual(payload.bowel.map(({ stoolShape, stoolDescription }) => [stoolShape, stoolDescription]), [
    ['Hard pellets', 'Separate hard lumps'],
    ['Lumpy sausage', 'Sausage-shaped, with lumps'],
    ['Cracked sausage', 'Sausage-shaped, with cracks'],
    ['Smooth and soft', 'Smooth, soft sausage or snake'],
    ['Soft blobs', 'Soft pieces with clear edges'],
    ['Mushy', 'Fluffy pieces with ragged edges'],
    ['Watery', 'Liquid, with no solid pieces'],
    ['Not sure', 'Shape not recorded'],
    ['Not sure', 'Shape not recorded'],
  ]);
});

test('7-day and 30-day payloads include only their own local calendar window', async () => {
  const { buildAiDataPayload } = await aiModelModule;
  const now = new Date(2026, 9, 23, 12);
  const dates = ['2026-09-23', '2026-09-24', '2026-10-16', '2026-10-17', '2026-10-23', '2026-10-24'];
  const records = {
    food: dates.map((date) => ({ date, food_name: `Food ${date}` })),
    bowel: dates.map((date) => ({ occurred_at: `${date}T12:00:00`, stool_type: 4 })),
    water: dates.map((local_date) => ({ local_date, amount_ml: 250 })),
    exercise: dates.map((local_date) => ({ local_date, exercise_type: 'Walk', duration_minutes: 20 })),
  };
  const week = buildAiDataPayload(records, 7, now);
  const month = buildAiDataPayload(records, 30, now);

  assert.equal(week.periodDays, 7);
  assert.equal(month.periodDays, 30);
  for (const kind of ['bowel', 'food', 'drinks', 'exercise']) {
    assert.deepEqual(week[kind].map((record) => record.day), [1, 7]);
    assert.deepEqual(month[kind].map((record) => record.day), [1, 23, 24, 30]);
  }
  assert.equal(week.coverage.daysWithAnyLog, 2);
  assert.equal(week.coverage.daysWithoutLogs, 5);
  assert.equal(month.coverage.daysWithAnyLog, 4);
  assert.equal(month.coverage.daysWithoutLogs, 26);
  assert.equal(week.coverage.foodRecords, 2);
  assert.equal(month.coverage.foodRecords, 4);
});

test('AI report parser accepts valid JSON and rejects incomplete output', async () => {
  const { parseInsightReport } = await aiModelModule;
  const report = parseInsightReport(JSON.stringify({
    headline: 'Low water and low activity appear together on harder stool days.',
    summary: 'The logged pattern is worth testing over the next week.',
    patterns: [{ title: 'Harder stool on low-water days', evidence: '2 of 3 harder days were below the usual water amount.', interpretation: 'Water may be contributing.', confidence: 'moderate' }],
    recommendations: [{ title: 'Add two water check-ins', action: 'Log one drink with breakfast and lunch for 7 days.', reason: 'This tests the clearest difference in the current data.' }],
    nextCheck: 'Compare stool shape on days with both check-ins.',
    dataGaps: ['Food logging is incomplete on two days.'],
  }));
  assert.equal(report.patterns[0].confidence, 'moderate');
  assert.throws(() => parseInsightReport('{"headline":"Only a headline"}'), /incomplete report/);
});

test('AI report parser keeps the final report short and focused', async () => {
  const { parseInsightReport } = await aiModelModule;
  const report = parseInsightReport({
    headline: 'A '.repeat(80),
    summary: 'A '.repeat(180),
    patterns: [1, 2, 3].map((number) => ({ title: `Pattern ${number}`, evidence: 'Evidence', interpretation: 'Interpretation', confidence: 'early' })),
    recommendations: [1, 2, 3].map((number) => ({ title: `Action ${number}`, action: 'Do this', reason: 'To test it' })),
    nextCheck: 'Compare the next week with this week.',
    dataGaps: ['Gap one', 'Gap two', 'Gap three'],
  });
  assert.equal(report.patterns.length, 2);
  assert.equal(report.recommendations.length, 2);
  assert.equal(report.dataGaps.length, 2);
  assert.ok(report.headline.length <= 90);
  assert.ok(report.summary.length <= 160);
  assert.ok(report.patterns[0].evidence.length <= 120);
  assert.ok(report.recommendations[0].action.length <= 110);
});
