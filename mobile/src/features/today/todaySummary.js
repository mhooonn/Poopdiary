import { EFFORTS, STOOL_TYPES, SYMPTOMS } from '../bowel/model';
import { DRINK_LABELS } from '../diary/model';

// Daily water goal used by the UI when displaying water intake
export const WATER_GOAL_ML = 2000;

// Identifies plain water separately from other drink types
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
// Converts millilitres to litres with one decimal
export function formatLitres(ml) {
  return (ml / 1000).toFixed(1);
}

/**
 * @param {string} type
 * @returns {string}
 */
// Converts a drink type code into a readable label.
// DRINK_LABELS comes from the diary model and connects drink types to the names displayed in the UI
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
// Makes the first letter uppercase
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
// Turns a pain level (0 to 10) into a rank: 7 or more is 3, 4 to 6 is 2, otherwise 1
// Higher pain scores receive a higher rank so they appear first when symptoms are sorted
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
// Turns "mild", "moderate" or "severe" into 1, 2 or 3
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
// Collects symptoms from one bowel movement record
function bowelSymptoms(record) {
  /** @type {SymptomItem[]} */
  const symptoms = [];

  // Add bloating when a bloating level has been recorded
  if (record.bloating_level) {
    symptoms.push({
      key: 'bloating',
      text: `Bloating, ${record.bloating_level}`,
      rank: getLevelRank(record.bloating_level),
    });
  }

  // Add pain with its score and severity rank
  if (record.pain_level) {
    symptoms.push({
      key: 'pain',
      text: `Pain ${record.pain_level}/10`,
      rank: painRank(record.pain_level),
    });
  }

  // Add urgency when an urgency level has been recorded
  if (record.urgency_level) {
    symptoms.push({
      key: 'urgency',
      text: `Urgency, ${record.urgency_level}`,
      rank: getLevelRank(record.urgency_level),
    });
  }

  // Convert symptom codes into readable labels using the bowel model
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
 * Collects symptoms from all diary entries for the selected day.
 * If the same symptom appears several times, only one item is kept.
 * The highest recorded rank is used, and the final list is sorted
 * so that higher-ranked symptoms appear first.
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

    // Extract symptoms from this bowel movement
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

  // Sort symptoms from highest rank to lowest rank
  symptoms.sort((a, b) => b.rank - a.rank);

  return symptoms;
}

/**
 * Creates a summary of the diary entries for one day
 * Separates entries by type, calculates drink totals and converts the records into simpler objects that the UI can display
 *
 * The function receives diary entries and returns a summary
 * It does not fetch data from the server or save anything to the database
/**
 * @param {import('../diary/model').DiaryEntry[]} entries
 * @returns {{
 *   waterMl: number,
 *   otherDrinks: {type: string, ml: number}[],
 *   meals: TimelineItem[],
 *   exercise: TimelineItem[],
 *   movements: TimelineItem[],
 *   bowelCount: number,
 *   symptoms: SymptomItem[],
 *   sleep: TimelineItem[],
 * }}
 */
export function summarizeToday(entries) {
  // Separate the entries by their kind so each section can be processed
  const food = entries.filter((entry) => entry.kind === 'food');
  const bowel = entries.filter((entry) => entry.kind === 'bowel');
  const drinks = entries.filter((entry) => entry.kind === 'water');
  const exercise = entries.filter((entry) => entry.kind === 'exercise');
    const sleep = entries.filter((entry) => entry.kind === 'sleep');

  // Calculate the total amount of plain water separately from other drinks
  let waterMl = 0;

  // Store the total amount for each non-water drink type
  /** @type {{type: string, ml: number}[]} */
  const otherDrinks = [];

  for (const entry of drinks) {
    const type = entry.record.drink_type;
    const ml = entry.record.amount_ml;

    if (type === WATER_TYPE) {
      // Plain water is added straight to the water total
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

  // Display the drink types with the largest total amounts first
  otherDrinks.sort((a, b) => b.ml - a.ml);

  // Convert food entries into timeline items for the diary view.
  /** @type {TimelineItem[]} */
  const meals = food.map((entry) => ({
    key: entry.key,
    time: entry.time,
    title: capitalize(entry.title),
    detail: entry.summary,
  }));

  // Convert exercise entries into timeline items in the same way.
  const exercises = exercise.map((entry) => ({
    key: entry.key,
    time: entry.time,
    title: capitalize(entry.title),
    detail: entry.summary,
  }));

    // Convert sleep entries into timeline items in the same way.
  const sleepItems = sleep.map((entry) => ({
    key: entry.key,
    time: entry.time,
    title: entry.title,
    detail: entry.summary,
  }));

  // Convert bowel movement entries into timeline items.
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

  // Return all calculated values in one object for the TodayScreen to use
  return {
    waterMl,
    otherDrinks,
    meals,
    movements,
    bowelCount: movements.length,
    symptoms: collectSymptoms(entries),
    exercise: exercises,
    sleep: sleepItems,
  };
}