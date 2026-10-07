const assert = require('node:assert/strict');
const { test } = require('node:test');
const { modelModule } = require('./modules.cjs');

const record = {
  id: 7, occurred_at: '2026-10-06T08:32:19.721Z', stool_type: 4, effort: 'normal',
  symptoms: ['pain', 'bloating'], bloating_level: 'moderate', pain_level: 7,
  pain_location: 'lower_left', urgency_level: null, notes: 'After breakfast',
  created_at: '2026-10-06T08:33:00.000Z', updated_at: '2026-10-06T08:33:00.000Z',
};

test('a new log needs an explicit shape, including Not sure', async () => {
  const { createForm, createPayload } = await modelModule;
  const form = createForm(undefined, new Date('2026-10-06T08:00:00Z'));
  assert.throws(() => createPayload(form), /stool type/);
  form.stoolType = null;
  const payload = createPayload(form);
  assert.equal(payload.stool_type, null);
  assert.deepEqual(payload.symptoms, []);
  assert.equal(payload.bloating_level, null);
  assert.equal(payload.pain_level, null);
  assert.equal(payload.pain_location, null);
  assert.equal(payload.urgency_level, null);
});

test('editing preserves recorded values and the exact original instant', async () => {
  const { createForm, createPayload } = await modelModule;
  const form = createForm(record);
  form.stoolType = 3;
  const { id, created_at, updated_at, ...expected } = record;
  assert.deepEqual(createPayload(form, record), { ...expected, stool_type: 3 });
  const unknownDetails = { ...record, bloating_level: null, pain_level: null, pain_location: null };
  assert.deepEqual(createPayload(createForm(unknownDetails), unknownDetails), {
    ...expected, bloating_level: null, pain_level: null, pain_location: null,
  });
  assert.notStrictEqual(form.symptoms, record.symptoms);
});

test('removing a symptom clears its details and route, without removing other symptoms', async () => {
  const { createForm, createPayload, toggleSymptom, adjacentStep, detailSteps } = await modelModule;
  let form = createForm(record);
  assert.deepEqual(detailSteps(form.symptoms), ['bloating', 'pain']);
  assert.equal(adjacentStep('symptoms', form), 'bloating');
  form = toggleSymptom(form, 'pain');
  form = toggleSymptom(form, 'urgency');
  assert.deepEqual(detailSteps(form.symptoms), ['bloating', 'urgency']);
  assert.equal(adjacentStep('bloating', form), 'urgency');
  assert.equal(adjacentStep('time', form, 'previous'), 'urgency');
  assert.equal(adjacentStep('shape', form, 'previous'), null);
  assert.equal(adjacentStep('time', form), null);
  const payload = createPayload(form, record);
  assert.equal(payload.pain_level, null);
  assert.equal(payload.pain_location, null);
  assert.equal(payload.bloating_level, 'moderate');
  assert.equal(payload.urgency_level, 'mild');
});

test('invalid calendar dates and DST gaps cannot silently become another time', async () => {
  const { createForm, createPayload } = await modelModule;
  const form = { ...createForm(record), date: '2026-02-30', time: '08:00' };
  assert.throws(() => createPayload(form), /does not exist/);
  for (const time of ['24:00', '10:65', '9:30']) assert.throws(() => createPayload({ ...form, date: '2026-10-06', time }));
  // Pin the process timezone only within this test so the spring-forward gap is deterministic.
  const priorTimezone = process.env.TZ;
  process.env.TZ = 'Europe/Helsinki';
  try {
    assert.throws(() => createPayload({ ...form, date: '2026-03-29', time: '03:30' }), /does not exist/);
    assert.equal(createPayload({ ...form, date: '2026-03-29', time: '04:00' }).occurred_at, '2026-03-29T01:00:00.000Z');
  } finally {
    if (priorTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = priorTimezone;
  }
});

test('date controls clamp month changes to real days and keep leap years', async () => {
  const { daysInMonth, updateDatePart } = await modelModule;
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(updateDatePart('2026-01-31', 'month', 2), '2026-02-28');
  assert.equal(updateDatePart('2028-02-29', 'year', 2027), '2027-02-28');
  assert.throws(() => updateDatePart('2026-10-06', 'month', 13));
});

test('API data keeps stable codes and rejects invalid timestamp or detail values', async () => {
  const { isBowelRecord, createForm, createPayload } = await modelModule;
  assert.equal(isBowelRecord(record), true);
  for (const changes of [
    { id: 0 }, { stool_type: 8 }, { effort: 'Easy' }, { symptoms: ['bloating', 'bloating'] },
    { pain_level: 10.5 }, { bloating_level: 'medium' }, { notes: 'x'.repeat(1001) },
    { occurred_at: '2026-02-30T08:00:00Z' }, { occurred_at: '2026-10-06T08:00:00+02:00' },
  ]) assert.equal(isBowelRecord({ ...record, ...changes }), false);
  const form = createForm(record);
  form.painLevel = 11;
  assert.throws(() => createPayload(form, record));
});
