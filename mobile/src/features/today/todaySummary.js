import { EFFORTS, STOOL_TYPES, SYMPTOMS } from '../bowel/model';
import { DRINK_LABELS } from '../diary/model';

export const WATER_GOAL_ML = 2000;
export const WATER_TYPE = 'water';

/**
 * @typedef {Object} TimelineItem
 * @property {string} key
 * @property {string | null} time
 * @property {string} title
 * @property {string} detail
 */

/**
 * @typedef {Object} SymptomItem
 * @property {string} key
 * @property {string} text
 * @property {number} rank
 */

/**
 * @param {number} ml
 * @returns {string}
 */
export function formatLitres(ml) {
  return (ml / 1000).toFixed(1);
}

/**
 * @param {string} type
 * @returns {string}
 */
export function drinkLabel(type) {
  const drink = Object.entries(DRINK_LABELS).find(
    ([key]) => key === type
  );

  if (drink) {
    return String(drink[1]);
  }

  return type;
}

/**
 * @param {string} value
 * @returns {string}
 */
function capitalize(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * @param {number} pain
 * @returns {number}
 */
function painRank(pain) {
  if (pain >= 7) {
    return 3;
  }

  if (pain >= 4) {
    return 2;
  }

  return 1;
}

/**
 * @param {string} level
 * @returns {number}
 */
function getLevelRank(level) {
  if (level === 'severe') {
    return 3;
  }

  if (level === 'moderate') {
    return 2;
  }

  return 1;
}

/**
 * @param {import('../bowel/model').BowelRecord} record
 * @returns {SymptomItem[]}
 */
function bowelSymptoms(record) {
  /** @type {SymptomItem[]} */
  const symptoms = [];

  if (record.bloating_level) {
    symptoms.push({
      key: 'bloating',
      text: `Bloating, ${record.bloating_level}`,
      rank: getLevelRank(record.bloating_level),
    });
  }

  if (record.pain_level) {
    symptoms.push({
      key: 'pain',
      text: `Pain ${record.pain_level}/10`,
      rank: painRank(record.pain_level),
    });
  }

  if (record.urgency_level) {
    symptoms.push({
      key: 'urgency',
      text: `Urgency, ${record.urgency_level}`,
      rank: getLevelRank(record.urgency_level),
    });
  }

  for (const code of record.symptoms) {
    const symptom = SYMPTOMS.find((item) => item.code === code);

    symptoms.push({
      key: String(code),
      text: symptom ? symptom.label : String(code),
      rank: 1,
    });
  }

  return symptoms;
}

/**
 * @param {import('../diary/model').DiaryEntry[]} entries
 * @returns {SymptomItem[]}
 */
function collectSymptoms(entries) {
  /** @type {SymptomItem[]} */
  const symptoms = [];

  for (const entry of entries) {
    if (entry.kind !== 'bowel') {
      continue;
    }

    for (const symptom of bowelSymptoms(entry.record)) {
      const existing = symptoms.find((item) => item.key === symptom.key);

      if (!existing) {
        symptoms.push(symptom);
      } else if (symptom.rank > existing.rank) {
        existing.rank = symptom.rank;
        existing.text = symptom.text;
      }
    }
  }

  symptoms.sort((a, b) => b.rank - a.rank);

  return symptoms;
}

/**
 * @param {import('../diary/model').DiaryEntry[]} entries
 * @returns {{
 *   waterMl: number,
 *   otherDrinks: {type: string, ml: number}[],
 *   meals: TimelineItem[],
 *   exercise: TimelineItem[],
 *   movements: TimelineItem[],
 *   bowelCount: number,
 *   symptoms: SymptomItem[]
 * }}
 */
export function summarizeToday(entries) {
  const food = entries.filter((entry) => entry.kind === 'food');
  const bowel = entries.filter((entry) => entry.kind === 'bowel');
  const drinks = entries.filter((entry) => entry.kind === 'water');
  const exercise = entries.filter((entry) => entry.kind === 'exercise');

  let waterMl = 0;

  /** @type {{type: string, ml: number}[]} */
  const otherDrinks = [];

  for (const entry of drinks) {
    const type = entry.record.drink_type;
    const ml = entry.record.amount_ml;

    if (type === WATER_TYPE) {
      waterMl += ml;
    } else {
      const existing = otherDrinks.find((drink) => drink.type === type);

      if (existing) {
        existing.ml += ml;
      } else {
        otherDrinks.push({ type, ml });
      }
    }
  }

  otherDrinks.sort((a, b) => b.ml - a.ml);

  /** @type {TimelineItem[]} */
  const meals = food.map((entry) => ({
    key: entry.key,
    time: entry.time,
    title: capitalize(entry.title),
    detail: entry.summary,
  }));

  const exercises = exercise.map((entry) => ({
    key: entry.key,
    time: entry.time,
    title: capitalize(entry.title),
    detail: entry.summary,
  }));

  /** @type {TimelineItem[]} */
  const movements = bowel.map((entry) => {
    const record = entry.record;

    const stool = STOOL_TYPES.find((item) => item.code === record.stool_type);
    const effort = EFFORTS.find((item) => item.code === record.effort);

    let detail = '';

    if (stool) {
      detail = stool.label;
    }

    if (effort) {
      if (detail !== '') {
        detail += ' · ';
      }

      detail += effort.label;
    }

    return {
      key: entry.key,
      time: entry.time,
      title: entry.title,
      detail,
    };
  });

  return {
    waterMl,
    otherDrinks,
    meals,
    movements,
    bowelCount: movements.length,
    symptoms: collectSymptoms(entries),
    exercise: exercises
  };
}