import { formatDate, SYMPTOMS, STOOL_TYPES } from '../bowel/model';

/** @typedef {{food: any[], bowel: any[], water: any[], exercise: any[]}} InsightRecords */

/** @param {Date} date @param {number} offset @returns {Date} */
function shiftLocalDay(date, offset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
}

/** @param {Date} date @returns {string} */
function localDateFromTimestamp(date) {
  return formatDate(date);
}

/** @param {string} date @returns {string} */
export function shortDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** @param {string} date @returns {string} */
export function dayLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);
}

/** @param {Date} now @param {number} days @returns {string[]} */
export function dateWindow(now, days) {
  const count = days === 30 ? 30 : 7;
  return Array.from({ length: count }, (_, index) => formatDate(shiftLocalDay(now, index - count + 1)));
}

/** @param {string} kind @param {any} record @returns {string|null} */
function recordDate(kind, record) {
  if (kind === 'food') return typeof record.date === 'string' ? record.date : null;
  if (kind === 'water' || kind === 'exercise') return typeof record.local_date === 'string' ? record.local_date : null;
  if (typeof record.occurred_at !== 'string') return null;
  const date = new Date(record.occurred_at);
  return Number.isFinite(date.getTime()) ? localDateFromTimestamp(date) : null;
}

/** @param {InsightRecords} records @param {number} days @param {Date} [now] */
export function summarizeInsights(records, days, now = new Date()) {
  const dates = dateWindow(now, days);
  const dateSet = new Set(dates);
  // The APIs use different date fields, so convert them to one local-day key first.
  const sources = /** @type {const} */ (['food', 'bowel', 'water', 'exercise']);
  const scoped = Object.fromEntries(sources.map((kind) => [
    kind,
    (records[kind] ?? []).filter((record) => dateSet.has(recordDate(kind, record) ?? '')),
  ]));
  const daily = dates.map((date) => ({
    date,
    food: scoped.food.filter((record) => recordDate('food', record) === date).length,
    bowel: scoped.bowel.filter((record) => recordDate('bowel', record) === date).length,
    water: scoped.water.filter((record) => recordDate('water', record) === date).length,
    exercise: scoped.exercise.filter((record) => recordDate('exercise', record) === date).length,
  }));

  const typeDistribution = [
    { code: null, label: 'Not sure', description: '', count: scoped.bowel.filter((record) => record.stool_type == null).length },
    ...STOOL_TYPES.filter((option) => option.code !== null).map((option) => ({
      code: option.code,
      label: `Type ${option.code}`,
      description: option.label,
      count: scoped.bowel.filter((record) => record.stool_type === option.code).length,
    })),
  ];
  const symptoms = SYMPTOMS.map((option) => ({
    code: option.code,
    label: option.label,
    count: scoped.bowel.filter((record) => Array.isArray(record.symptoms) && record.symptoms.includes(option.code)).length,
  }));

  const foodCount = scoped.food.length;
  const bowelCount = scoped.bowel.length;
  const drinkCount = scoped.water.length;
  const exerciseCount = scoped.exercise.length;
  const drinkMl = scoped.water.reduce((total, record) => total + (Number(record.amount_ml) || 0), 0);
  const waterMl = scoped.water.reduce((total, record) => total + (record.drink_type === 'water' ? (Number(record.amount_ml) || 0) : 0), 0);
  const exerciseMinutes = scoped.exercise.reduce((total, record) => total + (Number(record.duration_minutes) || 0), 0);

  return {
    dates,
    daily,
    typeDistribution,
    symptoms,
    totals: {
      entries: foodCount + bowelCount + drinkCount + exerciseCount,
      food: foodCount,
      bowel: bowelCount,
      drinks: drinkCount,
      drinkMl,
      waterMl,
      exercise: exerciseCount,
      exerciseMinutes,
    },
  };
}

