const assert = require('node:assert/strict');
const { test } = require('node:test');
const { diaryModelModule } = require('./modules.cjs');

const selectedDate = '2026-10-09';
const localInstant = (hour, minute, day = 9) => new Date(2026, 9, day, hour, minute).toISOString();
const food = { id: 1, food_name: 'Oats', meal_type: 'Breakfast', date: selectedDate, time: '10:15', notes: null };
const bowel = () => ({
  id: 1, occurred_at: localInstant(8, 45), stool_type: 4, effort: 'normal', symptoms: [],
  bloating_level: null, pain_level: null, pain_location: null, urgency_level: null, notes: '',
  created_at: localInstant(8, 46), updated_at: localInstant(8, 46),
});
const drink = () => ({ id: 1, amount_ml: 250, drink_type: 'water', note: null, local_date: selectedDate, logged_at: localInstant(9, 30) });

test('Diary mixes all sources in chronological order without changing their records', async () => {
  const { diaryEntries } = await diaryModelModule;
  const bowelRecord = bowel();
  const drinkRecord = drink();
  const records = { food: [food], bowel: [bowelRecord], water: [drinkRecord] };
  const before = structuredClone(records);
  const entries = diaryEntries(records, selectedDate);
  assert.deepEqual(entries.map((entry) => entry.kind), ['bowel', 'water', 'food']);
  assert.deepEqual(entries.map((entry) => entry.time), ['08:45', '09:30', '10:15']);
  assert.strictEqual(entries[0].record, bowelRecord);
  assert.strictEqual(entries[1].record, drinkRecord);
  assert.strictEqual(entries[2].record, food);
  assert.deepEqual(records, before);
});

test('Diary date filtering uses local bowel dates and stored food/drink dates', async () => {
  const { diaryEntries } = await diaryModelModule;
  const records = {
    food: [food, { ...food, id: 2, date: '2026-10-08' }],
    bowel: [bowel(), { ...bowel(), id: 2, occurred_at: localInstant(23, 50, 8) }],
    water: [drink(), { ...drink(), id: 2, local_date: '2026-10-08' }],
  };
  assert.deepEqual(diaryEntries(records, selectedDate).map((entry) => entry.id), [1, 1, 1]);
  assert.equal(diaryEntries(records, '2026-10-08').length, 3);
  assert.deepEqual(diaryEntries(records, '2026-10-07'), []);
});

test('bowel records crossing UTC midnight stay on the device local day', async () => {
  const { bowelEntry, diaryEntries } = await diaryModelModule;
  const previousTimezone = process.env.TZ;
  try {
    for (const [timezone, hour, minute, utcDate] of [
      ['Europe/Helsinki', 0, 30, '2026-10-08'],
      ['America/Los_Angeles', 23, 30, '2026-10-10'],
    ]) {
      process.env.TZ = timezone;
      const occurred_at = new Date(2026, 9, 9, hour, minute).toISOString();
      assert.equal(occurred_at.slice(0, 10), utcDate);
      const record = { ...bowel(), occurred_at };
      assert.equal(bowelEntry(record).localDate, selectedDate);
      const records = { food: [], bowel: [record], water: [] };
      assert.equal(diaryEntries(records, selectedDate).length, 1);
      assert.deepEqual(diaryEntries(records, utcDate), []);
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('records sharing numeric IDs have distinct keys and matching editor destinations', async () => {
  const { diaryEntries, editDestination } = await diaryModelModule;
  const entries = diaryEntries({ food: [food], bowel: [bowel()], water: [drink()] }, selectedDate);
  assert.equal(new Set(entries.map((entry) => entry.key)).size, 3);
  assert.deepEqual(entries.map((entry) => entry.key), ['bowel:1', 'water:1', 'food:1']);
  assert.deepEqual(entries.map(editDestination), [
    { pathname: '/bowel', params: { edit: '1' } },
    { pathname: '/water', params: { edit: '1' } },
    { pathname: '/food', params: { edit: '1' } },
  ]);
});

test('food without a valid time stays unknown and follows timed records', async () => {
  const { diaryEntries, foodEntry } = await diaryModelModule;
  const untimed = [null, '', '24:00', '9:30'].map((time, index) => ({ ...food, id: index + 2, time }));
  for (const record of untimed) assert.equal(foodEntry(record).time, null);
  const entries = diaryEntries({ food: [...untimed, food], bowel: [bowel()], water: [drink()] }, selectedDate);
  assert.deepEqual(entries.slice(0, 3).map((entry) => entry.time), ['08:45', '09:30', '10:15']);
  assert.ok(entries.slice(3).every((entry) => entry.time === null));
  assert.equal(entries.length, 7);
});

test('Diary rejects missing, malformed and impossible requested dates', async () => {
  const { isDiaryDate } = await diaryModelModule;
  for (const value of [undefined, null, '', 'Oct 9', '2026-10-9', '2026-02-30', '2026-02-29', '2026-13-01']) {
    assert.equal(isDiaryDate(value), false);
  }
  assert.equal(isDiaryDate(selectedDate), true);
  assert.equal(isDiaryDate('2028-02-29'), true);
});
