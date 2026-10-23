import { formatDate, SYMPTOMS, STOOL_TYPES } from '../bowel/model';

/** @typedef {{title:string,evidence:string,interpretation:string,confidence:'early'|'moderate'|'strong'}} AiInsightPattern */
/** @typedef {{title:string,action:string,reason:string}} AiInsightRecommendation */
/** @typedef {{headline:string,summary:string,patterns:AiInsightPattern[],recommendations:AiInsightRecommendation[],nextCheck:string,dataGaps:string[]}} AiInsightReport */

export const DEFAULT_AI_ENDPOINT = 'https://790053500.com/v1';
export const DEFAULT_AI_MODEL = 'gpt-6.1-sol';
export const AI_SETTINGS_KEY = 'gutlog.insights.ai-settings.v1';
export const AI_CONSENT_KEY = 'gutlog.insights.ai-consent.v1';

/** @param {unknown} value */
export function normalizeAiSettings(value) {
  const settings = typeof value === 'object' && value !== null ? /** @type {Record<string, unknown>} */ (value) : {};
  const endpoint = typeof settings.endpoint === 'string' && settings.endpoint.trim()
    ? settings.endpoint.trim().replace(/\/+$/, '')
    : DEFAULT_AI_ENDPOINT;
  const model = typeof settings.model === 'string' && settings.model.trim()
    ? settings.model.trim()
    : DEFAULT_AI_MODEL;
  const apiKey = typeof settings.apiKey === 'string' ? settings.apiKey.trim() : '';

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('Enter a valid AI endpoint URL.');
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('The AI endpoint must use HTTPS or HTTP.');
  if (!model || model.length > 120) throw new Error('Enter a valid model ID.');
  if (apiKey.length > 500) throw new Error('The API key is too long.');
  return { endpoint, model, apiKey };
}

/** @param {Date} date @param {number} offset @returns {Date} */
function shiftLocalDay(date, offset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
}

/** @param {Date} now @param {number} days @returns {string[]} */
function aiDateWindow(now, days) {
  const count = days === 7 ? 7 : 30;
  return Array.from({ length: count }, (_, index) => formatDate(shiftLocalDay(now, index - count + 1)));
}

/** @param {string} kind @param {any} record @returns {string|null} */
function recordDate(kind, record) {
  if (kind === 'food') return typeof record.date === 'string' ? record.date : null;
  if (kind === 'water' || kind === 'exercise') return typeof record.local_date === 'string' ? record.local_date : null;
  if (typeof record.occurred_at !== 'string') return null;
  const parsed = new Date(record.occurred_at);
  return Number.isFinite(parsed.getTime()) ? formatDate(parsed) : null;
}

/** @param {unknown} text @param {number} [max] */
function shortText(text, max = 80) {
  return typeof text === 'string' ? text.trim().slice(0, max) : '';
}

/**
 * Keep analysis useful while removing free text, database identifiers, and exact calendar dates.
 * @param {{food:any[],bowel:any[],water:any[],exercise:any[]}} records
 * @param {number} days
 * @param {Date} [now]
 */
export function buildAiDataPayload(records, days, now = new Date()) {
  const dates = aiDateWindow(now, days);
  const indexByDate = new Map(dates.map((date, index) => [date, index + 1]));
  /** @param {string} kind @param {any[]} source */
  const inRange = (kind, source) => (source ?? [])
    .filter((record) => indexByDate.has(recordDate(kind, record) ?? ''));
  const bowelRecords = inRange('bowel', records.bowel);
  const foods = inRange('food', records.food);
  const drinks = inRange('water', records.water);
  const exercises = inRange('exercise', records.exercise);
  /** @param {string} kind @param {any} record @returns {number|null} */
  const dayIndex = (kind, record) => indexByDate.get(recordDate(kind, record) ?? '') ?? null;
  const loggedDayIndexes = new Set([
    ...foods.map((record) => dayIndex('food', record)),
    ...bowelRecords.map((record) => dayIndex('bowel', record)),
    ...drinks.map((record) => dayIndex('water', record)),
    ...exercises.map((record) => dayIndex('exercise', record)),
  ]);
  const stoolShapes = new Map(STOOL_TYPES.map((shape) => [shape.code, shape]));
  const symptomLabels = new Map(SYMPTOMS.map(({ code, label }) => [code, label]));

  return {
    periodDays: dates.length,
    dayNumbering: 'Day 1 is the oldest day; the final day is today.',
    coverage: {
      daysWithAnyLog: loggedDayIndexes.size,
      daysWithoutLogs: dates.length - loggedDayIndexes.size,
      bowelRecords: bowelRecords.length,
      foodRecords: foods.length,
      drinkRecords: drinks.length,
      exerciseRecords: exercises.length,
    },
    // Send the same shape names the user picked, without Bristol numbers in the report data.
    bowel: bowelRecords.slice(-180).map((record) => ({
      day: dayIndex('bowel', record),
      stoolShape: stoolShapes.get(record.stool_type)?.label ?? 'Not sure',
      stoolDescription: stoolShapes.get(record.stool_type)?.description || 'Shape not recorded',
      effort: record.effort ?? null,
      symptoms: Array.isArray(record.symptoms)
        ? record.symptoms.map((/** @type {'bloating'|'pain'|'nausea'|'urgency'|'other'} */ code) => symptomLabels.get(code)).filter(Boolean)
        : [],
      bloating: record.bloating_level ?? null,
      painLevel: record.pain_level ?? null,
      urgency: record.urgency_level ?? null,
    })),
    food: foods.slice(-240).map((record) => ({
      day: dayIndex('food', record),
      food: shortText(record.food_name),
      meal: shortText(record.meal_type, 24),
    })),
    drinks: drinks.slice(-300).map((record) => ({
      day: dayIndex('water', record),
      type: shortText(record.drink_type, 24),
      amountMl: Number.isFinite(Number(record.amount_ml)) ? Number(record.amount_ml) : null,
    })),
    exercise: exercises.slice(-180).map((record) => ({
      day: dayIndex('exercise', record),
      activity: shortText(record.exercise_type, 60),
      minutes: Number.isFinite(Number(record.duration_minutes)) ? Number(record.duration_minutes) : null,
    })),
    excluded: ['record IDs', 'notes', 'food photos', 'exact calendar dates'],
  };
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value */
function requiredText(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1200;
}

/** Keep the report readable when a model ignores the requested field limits. */
/** @param {unknown} value @param {number} max @returns {string} */
function compactText(value, max) {
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  const room = Math.max(1, max - 3);
  const boundary = text.slice(0, room).lastIndexOf(' ');
  return `${text.slice(0, boundary > 20 ? boundary : room).trim()}...`;
}

/** @param {unknown} value */
/** @param {unknown} value @returns {AiInsightReport} */
export function parseInsightReport(value) {
  let parsed = value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('The model returned a report in an unreadable format. Try again.');
    }
  }
  if (!isObject(parsed)
    || !requiredText(parsed.headline)
    || !requiredText(parsed.summary)
    || !Array.isArray(parsed.patterns)
    || !Array.isArray(parsed.recommendations)
    || !requiredText(parsed.nextCheck)
    || !Array.isArray(parsed.dataGaps)) {
    throw new Error('The model returned an incomplete report. Try again.');
  }

  const patterns = parsed.patterns.slice(0, 2).map((pattern) => {
    if (!isObject(pattern)
      || !requiredText(pattern.title)
      || !requiredText(pattern.evidence)
      || !requiredText(pattern.interpretation)
      || !['early', 'moderate', 'strong'].includes(String(pattern.confidence))) {
      throw new Error('The model returned an incomplete pattern. Try again.');
    }
    return {
      title: compactText(pattern.title, 65),
      evidence: compactText(pattern.evidence, 120),
      interpretation: compactText(pattern.interpretation, 100),
      confidence: /** @type {'early'|'moderate'|'strong'} */ (pattern.confidence),
    };
  });
  const recommendations = parsed.recommendations.slice(0, 2).map((recommendation) => {
    if (!isObject(recommendation)
      || !requiredText(recommendation.title)
      || !requiredText(recommendation.action)
      || !requiredText(recommendation.reason)) {
      throw new Error('The model returned an incomplete recommendation. Try again.');
    }
    return {
      title: compactText(recommendation.title, 55),
      action: compactText(recommendation.action, 110),
      reason: compactText(recommendation.reason, 80),
    };
  });

  return {
    headline: compactText(parsed.headline, 90),
    summary: compactText(parsed.summary, 160),
    patterns,
    recommendations,
    nextCheck: compactText(parsed.nextCheck, 100),
    dataGaps: parsed.dataGaps.filter((gap) => typeof gap === 'string').slice(0, 2).map((gap) => compactText(gap, 80)),
  };
}
