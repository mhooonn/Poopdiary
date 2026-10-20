const assert = require('node:assert/strict');
const { test } = require('node:test');
const { reminderModelModule } = require('./modules.cjs');

test('reminder settings default off and recover malformed stored values', async () => {
  const { DEFAULT_REMINDER_SETTINGS, normalizeReminderSettings, parseReminderSettings } = await reminderModelModule;
  assert.deepEqual(normalizeReminderSettings(null), {
    enabled: false,
    time: '21:00',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  });
  assert.deepEqual(parseReminderSettings('{broken'), normalizeReminderSettings(DEFAULT_REMINDER_SETTINGS));
  assert.deepEqual(normalizeReminderSettings({ enabled: true, time: '25:99', weekdays: [1, 1, 9, -1] }), {
    enabled: true,
    time: '21:00',
    weekdays: [1],
  });
});

test('schedule skips days with entries and respects selected weekdays', async () => {
  const { localDateKey, upcomingReminderDates } = await reminderModelModule;
  const now = new Date(2026, 9, 20, 20, 0);
  const today = localDateKey(now);
  const nextTuesday = new Date(2026, 9, 27, 20, 0);
  const scheduled = upcomingReminderDates({
    now,
    time: '21:00',
    weekdays: [now.getDay(), nextTuesday.getDay()],
    recordedDates: new Set([today]),
    limit: 3,
    lookAheadDays: 30,
  });
  assert.deepEqual(scheduled.map(localDateKey), ['2026-10-27', '2026-11-03', '2026-11-10']);
});

test('schedule starts today only before the selected time and caps the rolling window', async () => {
  const { localDateKey, upcomingReminderDates } = await reminderModelModule;
  const now = new Date(2026, 9, 20, 20, 30);
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  const upcoming = upcomingReminderDates({ now, time: '21:00', weekdays, recordedDates: new Set() });
  assert.deepEqual(upcoming.map(localDateKey), ['2026-10-20', '2026-10-21', '2026-10-22']);

  const afterTime = upcomingReminderDates({
    now: new Date(2026, 9, 20, 21, 1),
    time: '21:00',
    weekdays,
    recordedDates: new Set(),
  });
  assert.deepEqual(afterTime.map(localDateKey), ['2026-10-21', '2026-10-22', '2026-10-23']);
});

test('invalid times or an empty weekday selection produce no reminders', async () => {
  const { upcomingReminderDates } = await reminderModelModule;
  const options = { now: new Date(2026, 9, 20, 20, 0), recordedDates: new Set() };
  assert.deepEqual(upcomingReminderDates({ ...options, time: '9pm', weekdays: [1] }), []);
  assert.deepEqual(upcomingReminderDates({ ...options, time: '21:00', weekdays: [] }), []);
});
