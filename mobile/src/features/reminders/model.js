// Reminder settings and date calculations. Notification permissions and scheduling are in service.js.
export const REMINDER_STORAGE_KEY = 'poop-diary.logging-reminder.v1';

export const DEFAULT_REMINDER_SETTINGS = Object.freeze({
  enabled: false,
  time: '21:00',
  weekdays: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
});

/** @typedef {{enabled:boolean,time:string,weekdays:number[]}} ReminderSettings */
/** @typedef {{available:boolean,granted:boolean,canAskAgain:boolean,channelEnabled:boolean}} ReminderAccess */
/** @typedef {{available:boolean,scheduled:number,reason:'platform'|'disabled'|'permission'|'data'|'ready'|'none'}} ReminderScheduleResult */

export const REMINDER_WEEKDAYS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'Tu', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'Th', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'Sa', label: 'Saturday' },
  { value: 0, short: 'Su', label: 'Sunday' },
];

/** @param {unknown} value */
export function normalizeReminderSettings(value) {
  // Use defaults if the saved settings are missing or invalid.
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_REMINDER_SETTINGS, weekdays: [...DEFAULT_REMINDER_SETTINGS.weekdays] };
  }
  const settings = /** @type {{enabled?:unknown,time?:unknown,weekdays?:unknown}} */ (value);
  const time = typeof settings.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.time)
    ? settings.time
    : DEFAULT_REMINDER_SETTINGS.time;
  const weekdays = Array.isArray(settings.weekdays)
    ? [...new Set(settings.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [...DEFAULT_REMINDER_SETTINGS.weekdays];
  return {
    enabled: settings.enabled === true,
    time,
    weekdays: weekdays.length > 0 ? weekdays : [...DEFAULT_REMINDER_SETTINGS.weekdays],
  };
}

/** @param {string | null} serialized */
export function parseReminderSettings(serialized) {
  if (serialized === null) return normalizeReminderSettings(null);
  try {
    return normalizeReminderSettings(JSON.parse(serialized));
  } catch {
    return normalizeReminderSettings(null);
  }
}

/** @param {Date} date */
export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** @param {string} timestamp */
export function localDateFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? localDateKey(date) : null;
}

/**
 * Plan the next few reminders in local time. The app refreshes them when opened,
 * so reminders stop after this list runs out if the user doesn't come back.
 * @param {{now:Date,time:string,weekdays:number[],recordedDates:Set<string>,limit?:number,lookAheadDays?:number}} options
 */
export function upcomingReminderDates({ now, time, weekdays, recordedDates, limit = 3, lookAheadDays = 90 }) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || weekdays.length === 0) return [];
  const [hour, minute] = time.split(':').map(Number);
  const dates = [];
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let offset = 0; offset < lookAheadDays && dates.length < limit; offset += 1) {
    // Build each reminder from its local date instead of adding 24 hours.
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, hour, minute);
    const key = localDateKey(date);
    if (date <= now || !weekdays.includes(date.getDay()) || recordedDates.has(key)) continue;
    dates.push(date);
  }

  return dates;
}
