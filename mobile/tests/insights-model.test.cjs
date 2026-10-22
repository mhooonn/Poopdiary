const test = require('node:test');
const assert = require('node:assert/strict');
const { insightsModelModule } = require('./modules.cjs');

test('Insights includes today and uses local calendar days across month boundaries', async () => {
  const { dateWindow } = await insightsModelModule;
  const dates = dateWindow(new Date(2026, 9, 2, 23), 7);
  assert.deepEqual(dates, ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
});

test('Insights aggregates only records in range and preserves source-specific dates', async () => {
  const { summarizeInsights } = await insightsModelModule;
  const summary = summarizeInsights({
    food: [
      { id: 1, date: '2026-10-20' },
      { id: 2, date: '2026-10-13' },
    ],
    bowel: [
      { id: 1, occurred_at: '2026-10-20T12:00:00Z', stool_type: 4, symptoms: ['bloating'] },
      { id: 2, occurred_at: '2026-10-19T10:00:00Z', stool_type: null, symptoms: ['pain', 'bloating'] },
      { id: 3, occurred_at: '2026-10-01T10:00:00Z', stool_type: 7, symptoms: [] },
    ],
    water: [
      { id: 1, local_date: '2026-10-20', amount_ml: 500, drink_type: 'water' },
      { id: 2, local_date: '2026-10-19', amount_ml: 250, drink_type: 'tea' },
    ],
    exercise: [
      { id: 1, local_date: '2026-10-19', duration_minutes: 25 },
    ],
  }, 7, new Date(2026, 9, 20, 12));

  assert.equal(summary.totals.entries, 6);
  assert.equal(summary.totals.food, 1);
  assert.equal(summary.totals.bowel, 2);
  assert.equal(summary.totals.waterMl, 500);
  assert.equal(summary.totals.drinkMl, 750);
  assert.equal(summary.totals.exerciseMinutes, 25);
  assert.equal(summary.typeDistribution.find((row) => row.code === 4).count, 1);
  assert.equal(summary.typeDistribution.find((row) => row.code === 4).description, 'Smooth and soft');
  assert.equal(summary.typeDistribution.find((row) => row.code === null).count, 1);
  assert.equal(summary.symptoms.find((row) => row.code === 'bloating').count, 2);
});

