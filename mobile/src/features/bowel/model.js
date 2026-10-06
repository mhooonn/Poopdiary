/** @typedef {1 | 2 | 3 | 4 | 5 | 6 | 7} StoolType */
/** @typedef {'easy' | 'normal' | 'some_difficulty' | 'difficult'} Effort */
/** @typedef {'bloating' | 'pain' | 'nausea' | 'urgency' | 'other'} Symptom */
/** @typedef {'mild' | 'moderate' | 'severe'} Level */
/** @typedef {'upper_left' | 'upper_right' | 'center' | 'lower_left' | 'lower_right' | 'whole'} PainLocation */
/** @typedef {{occurred_at:string, stool_type:StoolType|null, effort:Effort|null, symptoms:Symptom[], bloating_level:Level|null, pain_level:number|null, pain_location:PainLocation|null, urgency_level:Level|null, notes:string}} BowelDraft */
/** @typedef {BowelDraft & {id:number, created_at:string, updated_at:string}} BowelRecord */
/** @typedef {{stoolType:StoolType|null|undefined, effort:Effort|null, symptoms:Symptom[], bloatingLevel:Level|null, painLevel:number|null, painLocation:PainLocation|null, urgencyLevel:Level|null, notes:string, date:string, time:string}} BowelForm */
/** @typedef {'shape' | 'effort' | 'symptoms' | 'bloating' | 'pain' | 'urgency' | 'time'} BowelStep */

/** @type {{code:StoolType|null, label:string, description:string}[]} */
export const STOOL_TYPES = [
  { code: 1, label: 'Hard pellets', description: 'Separate hard lumps' },
  { code: 2, label: 'Lumpy sausage', description: 'Sausage-shaped, with lumps' },
  { code: 3, label: 'Cracked sausage', description: 'Sausage-shaped, with cracks' },
  { code: 4, label: 'Smooth and soft', description: 'Smooth, soft sausage or snake' },
  { code: 5, label: 'Soft blobs', description: 'Soft pieces with clear edges' },
  { code: 6, label: 'Mushy', description: 'Fluffy pieces with ragged edges' },
  { code: 7, label: 'Watery', description: 'Liquid, with no solid pieces' },
  { code: null, label: 'Not sure', description: '' },
];

/** @type {{code:Effort, label:string}[]} */
export const EFFORTS = [
  { code: 'easy', label: 'Easy' },
  { code: 'normal', label: 'Normal' },
  { code: 'some_difficulty', label: 'Some difficulty' },
  { code: 'difficult', label: 'Difficult' },
];

/** @type {{code:Symptom, label:string}[]} */
export const SYMPTOMS = [
  { code: 'bloating', label: 'Bloating' },
  { code: 'pain', label: 'Abdominal pain' },
  { code: 'nausea', label: 'Nausea' },
  { code: 'urgency', label: 'Urgency' },
  { code: 'other', label: 'Other' },
];

/** @type {{code:Level, label:string}[]} */
export const LEVELS = [
  { code: 'mild', label: 'Mild' },
  { code: 'moderate', label: 'Moderate' },
  { code: 'severe', label: 'Severe' },
];

/** @type {{code:PainLocation, label:string}[]} */
export const PAIN_LOCATIONS = [
  { code: 'upper_left', label: 'Upper left' },
  { code: 'upper_right', label: 'Upper right' },
  { code: 'center', label: 'Centre' },
  { code: 'lower_left', label: 'Lower left' },
  { code: 'lower_right', label: 'Lower right' },
  { code: 'whole', label: 'Whole abdomen' },
];

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

/** @param {Date} date */
export function formatDate(date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** @param {Date} date */
export function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** @param {number} year @param {number} month Month from 1 to 12. */
export function daysInMonth(year, month) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
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

/** @param {BowelRecord} [record] @param {Date} [now] @returns {BowelForm} */
export function createForm(record, now = new Date()) {
  const date = record ? new Date(record.occurred_at) : now;
  return {
    stoolType: record?.stool_type,
    effort: record?.effort ?? null,
    symptoms: [...(record?.symptoms ?? [])],
    bloatingLevel: record ? record.bloating_level : 'mild',
    painLevel: record ? record.pain_level : 4,
    painLocation: record ? record.pain_location : 'center',
    urgencyLevel: record ? record.urgency_level : 'mild',
    notes: record?.notes ?? '',
    date: formatDate(date),
    time: formatTime(date),
  };
}

/** @param {BowelForm} form @param {Symptom} code @returns {BowelForm} */
export function toggleSymptom(form, code) {
  if (form.symptoms.includes(code)) return { ...form, symptoms: form.symptoms.filter((item) => item !== code) };
  return {
    ...form,
    symptoms: [...form.symptoms, code],
    ...(code === 'bloating' ? { bloatingLevel: form.bloatingLevel ?? 'mild' } : {}),
    ...(code === 'pain' ? { painLevel: form.painLevel ?? 4, painLocation: form.painLocation ?? 'center' } : {}),
    ...(code === 'urgency' ? { urgencyLevel: form.urgencyLevel ?? 'mild' } : {}),
  };
}

/** @param {Symptom[]} symptoms @returns {BowelStep[]} */
export function detailSteps(symptoms) {
  return /** @type {BowelStep[]} */ (['bloating', 'pain', 'urgency'].filter((code) => symptoms.includes(/** @type {Symptom} */ (code))));
}

/** @param {BowelStep} step @param {BowelForm} form @param {'next'|'previous'} [direction] @returns {BowelStep | null} */
export function adjacentStep(step, form, direction = 'next') {
  /** @type {BowelStep[]} */
  const steps = ['shape', 'effort', 'symptoms', ...detailSteps(form.symptoms), 'time'];
  const index = steps.indexOf(step);
  return index < 0 ? null : steps[index + (direction === 'next' ? 1 : -1)] ?? null;
}

/** @param {unknown} value @returns {value is string} */
export function isUtcTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const object = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** @template T @param {unknown} value @param {{code:T}[]} choices */
const nullableChoice = (value, choices) => value === null || choices.some(({ code }) => code === value);

/** @param {unknown} value @returns {value is BowelDraft} */
export function isBowelDraft(value) {
  return object(value) && isUtcTimestamp(value.occurred_at)
    && nullableChoice(value.stool_type, STOOL_TYPES)
    && nullableChoice(value.effort, EFFORTS)
    && Array.isArray(value.symptoms) && new Set(value.symptoms).size === value.symptoms.length
    && value.symptoms.every((item) => SYMPTOMS.some(({ code }) => code === item))
    && nullableChoice(value.bloating_level, LEVELS)
    && (value.pain_level === null || (typeof value.pain_level === 'number' && Number.isInteger(value.pain_level) && value.pain_level >= 0 && value.pain_level <= 10))
    && nullableChoice(value.pain_location, PAIN_LOCATIONS)
    && nullableChoice(value.urgency_level, LEVELS)
    && typeof value.notes === 'string' && value.notes.length <= 1000;
}

/** @param {unknown} value @returns {value is BowelRecord} */
export function isBowelRecord(value) {
  return object(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0
    && isUtcTimestamp(value.created_at) && isUtcTimestamp(value.updated_at) && isBowelDraft(value);
}

/** @param {string} date @param {string} time */
function localTimestamp(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Choose a valid date and time.');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(hour, minute, 0, 0);
  if (year < 1 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day || parsed.getHours() !== hour || parsed.getMinutes() !== minute) {
    throw new Error('This date or time does not exist. Choose another time.');
  }
  return parsed.toISOString();
}

/** @param {BowelForm} form @param {BowelRecord} [original] @returns {BowelDraft} */
export function createPayload(form, original) {
  if (form.stoolType === undefined) throw new Error('Choose a stool type or Not sure.');
  const unchangedTime = original && formatDate(new Date(original.occurred_at)) === form.date && formatTime(new Date(original.occurred_at)) === form.time;
  /** @type {BowelDraft} */
  const payload = {
    occurred_at: unchangedTime ? original.occurred_at : localTimestamp(form.date, form.time),
    stool_type: form.stoolType,
    effort: form.effort,
    symptoms: [...form.symptoms],
    bloating_level: form.symptoms.includes('bloating') ? form.bloatingLevel : null,
    pain_level: form.symptoms.includes('pain') ? form.painLevel : null,
    pain_location: form.symptoms.includes('pain') ? form.painLocation : null,
    urgency_level: form.symptoms.includes('urgency') ? form.urgencyLevel : null,
    notes: form.notes,
  };
  if (!isBowelDraft(payload)) throw new Error('Check the selected values and keep notes under 1,000 characters.');
  return payload;
}
