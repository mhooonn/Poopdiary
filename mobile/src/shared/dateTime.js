/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

/** @param {Date} value */
export function formatDate(value) {
  return `${String(value.getFullYear()).padStart(4, '0')}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** @param {Date} value */
export function formatTime(value) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** @param {string} value */
export function formatDisplayDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** @param {number} year @param {number} month */
export function daysInMonth(year, month) {
  const value = new Date(0);
  value.setUTCFullYear(year, month, 0);
  return value.getUTCDate();
}

/** @param {string} date @param {'year'|'month'|'day'} part @param {number} value */
export function updateDatePart(date, part, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(value)) throw new Error('Choose a valid date.');
  let [year, month, day] = date.split('-').map(Number);
  if (part === 'year') year = value;
  if (part === 'month') month = value;
  if (part === 'day') day = value;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) throw new Error('Choose a valid date.');
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`;
}
