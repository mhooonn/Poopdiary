
import {
  EFFORTS,
  STOOL_TYPES,
  SYMPTOMS,
  formatDate,
  formatTime,
} from '../bowel/model';

/** @typedef {'food'|'bowel'|'water'|'exercise'|'sleep'} DiaryKind */

/** @typedef {{key: string, id: number, localDate: string, time: string | null, title: string, summary: string}} EntryBase */

/** @typedef {(EntryBase & {kind:'food',record:import('../../data/api/client').FoodRecord}) | (EntryBase & {kind:'bowel',record:import('../bowel/model').BowelRecord}) | (EntryBase & {kind:'water',record:import('../../data/api/client').DrinkRecord}) | (EntryBase & {kind:'exercise',record:import('../../data/api/client').ExerciseRecord}) | (EntryBase & {kind:'sleep',record:import('../../data/api/client').SleepRecord})} DiaryEntry */

/** @typedef {{food: import('../../data/api/client').FoodRecord[], bowel: import('../bowel/model').BowelRecord[], water: import('../../data/api/client').DrinkRecord[], exercise?: import('../../data/api/client').ExerciseRecord[], sleep?: import('../../data/api/client').SleepRecord[] }} DiaryRecords */

export const SOURCE_LABELS = {
  food: 'Food',
  bowel: 'Bowel',
  water: 'Drinks',
  exercise: 'Exercise',
  sleep: 'Sleep',
};

export const DRINK_LABELS = {
  water: 'Water',
  coffee: 'Coffee',
  tea: 'Tea',
  soda: 'Soft drink',
  juice: 'Juice',
  milk: 'Milk',
  alcohol: 'Alcohol',
  custom: 'Other drink',
};

/** @param {string} value */
export function isDiaryDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && formatDate(date) === value;
}

/** @param {import('../../data/api/client').FoodRecord} record
 *  @returns {DiaryEntry} */
export function foodEntry(record) {
  const time = record.time &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)
    ? record.time
    : null;

  return {
    key: `food:${record.id}`,
    kind: 'food',
    id: record.id,
    localDate: record.date,
    time,
    title: record.meal_type || 'Food',
    summary: record.food_name,
    record,
  };
}

/** @param {import('../bowel/model').BowelRecord} record
 *  @returns {DiaryEntry} */
export function bowelEntry(record) {
  const date = new Date(record.occurred_at);

  return {
    key: `bowel:${record.id}`,
    kind: 'bowel',
    id: record.id,
    localDate: formatDate(date),
    time: formatTime(date),
    title: record.stool_type === null
      ? 'Not sure'
      : `Type ${record.stool_type}`,
    summary: [
      STOOL_TYPES.find(
        (option) => option.code === record.stool_type
      )?.label,
      EFFORTS.find(
        (option) => option.code === record.effort
      )?.label,
      ...record.symptoms.map(
        (code) => SYMPTOMS.find(
          (option) => option.code === code
        )?.label
      ),
    ].filter(Boolean).join(' · '),
    record,
  };
}

/** @param {import('../../data/api/client').DrinkRecord} record
 *  @returns {DiaryEntry} */
export function drinkEntry(record) {
  return {
    key: `water:${record.id}`,
    kind: 'water',
    id: record.id,
    localDate: record.local_date,
    time: formatTime(new Date(record.logged_at)),
    title: DRINK_LABELS[record.drink_type],
    summary: `${record.amount_ml} ml`,
    record,
  };
}

// NEW: Exercise entries
/** @param {import('../../data/api/client').ExerciseRecord} record
 *  @returns {DiaryEntry} */
export function exerciseEntry(record) {
  const occurredAt = new Date(record.occurred_at);

  return {
    key: `exercise:${record.id}`,
    kind: 'exercise',
    id: record.id,
    localDate: record.local_date,
    time: formatTime(occurredAt),
    title: record.exercise_type,
    summary: `${record.duration_minutes} minutes`,
    record,
  };
}

/** @type {Record<number,string>} */
export const SLEEP_QUALITY_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'OK', 4: 'Good', 5: 'Great' };

/** @type {Record<number,string>} */
export const MORNING_ENERGY_LABELS = { 1: 'Exhausted', 2: 'Tired', 3: 'OK', 4: 'Rested', 5: 'Energised' };

/** @param {number} minutes */
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** @param {import('../../data/api/client').SleepRecord} record */
export function sleepMinutes(record) {
  return Math.round(
    (new Date(record.sleep_end).getTime() - new Date(record.sleep_start).getTime()) / 60000
  );
}

/** @param {import('../../data/api/client').SleepRecord} record
 *  @returns {DiaryEntry} */
export function sleepEntry(record) {
  const wokeAt = new Date(record.sleep_end);
  return {
    key: `sleep:${record.id}`,
    kind: 'sleep',
    id: record.id,
    localDate: record.local_date,
    time: formatTime(wokeAt),
    title: formatDuration(sleepMinutes(record)),
    summary: [
      record.quality === null ? null : `Quality ${record.quality}/5`,
      record.awakenings === 0
        ? 'No wake-ups'
        : `${record.awakenings} wake-up${record.awakenings === 1 ? '' : 's'}`,
    ].filter(Boolean).join(' · '),
    record,
  };
}

/**
 * Combine all records into one chronological Diary.
 * @param {DiaryRecords} records
 * @param {string} date
 * @returns {DiaryEntry[]}
 */
export function diaryEntries(records, date) {
  return [
    ...records.food.map(foodEntry),
    ...records.bowel.map(bowelEntry),
    ...records.water.map(drinkEntry),
    ...(records.exercise ?? []).map(exerciseEntry),
    ...(records.sleep ?? []).map(sleepEntry),
  ]
    .filter((entry) => entry.localDate === date)
    .sort(
      (a, b) =>
        (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
        a.key.localeCompare(b.key)
    );
}

/** @param {DiaryEntry} entry */
export function editDestination(entry) {
  const pathname = /** @type {'/food'|'/bowel'|'/water'|'/exercise'|'/sleep'} */ ({
    food: '/food',
    bowel: '/bowel',
    water: '/water',
    exercise: '/exercise',
    sleep: '/sleep',
  }[entry.kind]);

  return {
    pathname,
    params: { edit: String(entry.id) },
  };
}
