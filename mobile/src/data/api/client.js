import { isBowelDraft, isBowelRecord, isUtcTimestamp } from '../../features/bowel/model';

const recordChangeListeners = new Set();

/** @param {() => void} listener */
export function subscribeRecordChanges(listener) {
  recordChangeListeners.add(listener);
  return () => recordChangeListeners.delete(listener);
}

function publishRecordChange() {
  for (const listener of recordChangeListeners) {
    try {
      listener();
    } catch {
      // A subscriber must not make a successful API write appear to fail.
    }
  }
}



/** @typedef {import('../../features/bowel/model').BowelDraft} BowelDraft */
/** @typedef {import('../../features/bowel/model').BowelRecord} BowelRecord */
/** @typedef {'configuration' | 'network' | 'timeout' | 'http' | 'response' | 'cancelled' | 'validation'} ApiErrorCode */
/** @typedef {{status: 'ok', message: string}} HealthResponse */
/** @typedef {{signal?: AbortSignal}} RequestOptions */
/** @typedef {RequestOptions & {from?:string, to?:string}} ListBowelOptions */
/** @typedef {'water'|'coffee'|'tea'|'soda'|'juice'|'milk'|'alcohol'|'custom'} DrinkType */
/** @typedef {{amount_ml:number,drink_type:DrinkType,note?:string|null}} DrinkChanges */
/** @typedef {DrinkChanges & {logged_at:string,local_date:string}} DrinkDraft */
/** @typedef {DrinkDraft & {id:number,note:string|null}} DrinkRecord */
/** @typedef {RequestOptions & {date?:string}} ListDrinksOptions */

// Food types
/** @typedef {{id: number, food_name: string, meal_type: string | null, date: string, time: string | null, notes: string | null}} FoodRecord */
/** @typedef {{id: number, foodName: string, mealType?: string | null, date: string, time?: string | null, notes?: string | null}} FoodResponse */
/** @typedef {{foodName: string, mealType?: string | null, date: string, time?: string | null, notes?: string}} FoodDraft */
/** @typedef {{message: string}} FoodDeleteResponse */

// Exercise
/** @typedef {{exercise_type: string, duration_minutes: number, occurred_at: string, local_date: string, notes?: string | null}} ExerciseDraft */
/** @typedef {ExerciseDraft & {id: number, notes: string | null}} ExerciseRecord */
/** @typedef {RequestOptions & {date?: string}} ListExerciseOptions */

// symptoms
/** @typedef {{symptom_type: string, severity: number, occurred_at: string, local_date: string, notes?: string | null}} SymptomDraft */
/** @typedef {SymptomDraft & {id: number, notes: string | null}} SymptomRecord */
/** @typedef {RequestOptions & {date?: string}} ListSymptomsOptions */

// sleep
/** @typedef {{sleep_start: string, sleep_end: string, local_date: string, quality?: number | null, awakenings: number, morning_energy?: number | null, notes?: string | null}} SleepDraft */
/** @typedef {SleepDraft & {id: number, quality: number | null, morning_energy: number | null, notes: string | null}} SleepRecord */
/** @typedef {RequestOptions & {date?: string}} ListSleepOptions */

/** @typedef {RequestOptions & {method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: BowelDraft | FoodDraft | DrinkDraft | DrinkChanges | ExerciseDraft | SymptomDraft | SleepDraft, empty?: boolean}} ApiRequestOptions */

export class ApiError extends Error {
  /** @param {ApiErrorCode} code @param {string} message @param {number} [status] */
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is HealthResponse} */
function isHealth(value) {
  return isObject(value) && value.status === 'ok' && typeof value.message === 'string';
}

/** @param {unknown} value @returns {value is string} */
function isLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const drinkTypes = ['water', 'coffee', 'tea', 'soda', 'juice', 'milk', 'alcohol', 'custom'];

/** @param {unknown} value @returns {value is DrinkChanges} */
function isDrinkChanges(value) {
  return isObject(value) && Number.isSafeInteger(value.amount_ml) && /** @type {number} */ (value.amount_ml) > 0
    && typeof value.drink_type === 'string' && drinkTypes.includes(value.drink_type)
    && (value.note == null || (typeof value.note === 'string' && value.note.length <= 1000));
}

/** @param {unknown} value @returns {value is DrinkDraft} */
function isDrinkDraft(value) {
  return isDrinkChanges(value) && isUtcTimestamp(/** @type {DrinkDraft} */ (value).logged_at)
    && isLocalDate(/** @type {DrinkDraft} */ (value).local_date);
}

/** @param {unknown} value @returns {value is DrinkRecord} */
function isDrinkRecord(value) {
  return isDrinkDraft(value) && Number.isSafeInteger(/** @type {DrinkRecord} */ (value).id)
    && /** @type {DrinkRecord} */ (value).id > 0
    && (value.note === null || typeof value.note === 'string');
}



/** @param {unknown} value @returns {value is FoodRecord} */
function isFoodRecord(value) {
  return isObject(value)
    && Number.isSafeInteger(value.id)
    && typeof value.food_name === 'string'
    && typeof value.date === 'string'
    && (value.time == null || typeof value.time === 'string')
    && (value.meal_type == null || typeof value.meal_type === 'string')
    && (value.notes == null || typeof value.notes === 'string');
}


/** @param {unknown} value @returns {value is FoodRecord[]} */
function isFoodList(value) {
  return Array.isArray(value) && value.every(isFoodRecord);
}

/** @param {unknown} value @returns {value is FoodResponse} */
function isFoodCreated(value) {
  return isObject(value)
    && Number.isSafeInteger(value.id)
    && typeof value.foodName === 'string'
    && typeof value.date === 'string';
}

/** @param {unknown} value @returns {value is FoodDeleteResponse} */
function isFoodDeleted(value) {
  return isObject(value)
    && value.message === 'Food entry deleted';
}


// exercise functions
/** @param {unknown} value @returns {value is ExerciseDraft} */
function isExerciseDraft(value) {
  return isObject(value)
    && typeof value.exercise_type === 'string'
    && value.exercise_type.trim().length > 0
    && value.exercise_type.length <= 100
    && typeof value.duration_minutes === 'number'
    && Number.isSafeInteger(value.duration_minutes)
    && value.duration_minutes > 0
    && isUtcTimestamp(value.occurred_at)
    && isLocalDate(value.local_date)
    && (value.notes == null ||
      (typeof value.notes === 'string' && value.notes.length <= 1000));
}

/** @param {unknown} value @returns {value is ExerciseRecord} */
function isExerciseRecord(value) {
  return isObject(value)
    && typeof value.id === 'number'
    && Number.isSafeInteger(value.id)
    && value.id > 0
    && isExerciseDraft(value)
    && (value.notes === null || typeof value.notes === 'string');
}

/** @param {unknown} value @returns {value is ExerciseRecord[]} */
function isExerciseList(value) {
  return Array.isArray(value) && value.every(isExerciseRecord);
}

// symptom functions
/** @param {unknown} value @returns {value is SymptomDraft} */
function isSymptomDraft(value) {
  return isObject(value)
    && typeof value.symptom_type === 'string'
    && value.symptom_type.trim().length > 0
    && value.symptom_type.length <= 100
    && Number.isInteger(value.severity)
    && /** @type {number} */ (value.severity) >= 1
    && /** @type {number} */ (value.severity) <= 10
    && isUtcTimestamp(value.occurred_at)
    && isLocalDate(value.local_date)
    && (
      value.notes == null ||
      (typeof value.notes === 'string' && value.notes.length <= 1000)
    );
}

/** @param {unknown} value @returns {value is SymptomRecord} */
function isSymptomRecord(value) {
  return isObject(value)
    && Number.isSafeInteger(value.id)
    && /** @type {number} */ (value.id) > 0
    && isSymptomDraft(value)
    && (
      value.notes === null ||
      typeof value.notes === 'string'
    );
}

/** @param {unknown} value @returns {value is SymptomRecord[]} */
function isSymptomList(value) {
  return Array.isArray(value) && value.every(isSymptomRecord);
}

/** @param {unknown} value @param {number} max @returns {boolean} */
function isOptionalScale(value, max) {
  return value == null || (
    typeof value === 'number' && Number.isInteger(value) &&
    value >= 1 && value <= max
  );
}

/** @param {unknown} value @returns {value is SleepDraft} */
function isSleepDraft(value) {
  return isObject(value)
    && isUtcTimestamp(value.sleep_start)
    && isUtcTimestamp(value.sleep_end)
    && new Date(/** @type {string} */ (value.sleep_end)).getTime() >
      new Date(/** @type {string} */ (value.sleep_start)).getTime()
    && isLocalDate(value.local_date)
    && isOptionalScale(value.quality, 5)
    && typeof value.awakenings === 'number'
    && Number.isInteger(value.awakenings)
    && value.awakenings >= 0
    && value.awakenings <= 20
    && isOptionalScale(value.morning_energy, 5)
    && (value.notes == null ||
      (typeof value.notes === 'string' && value.notes.length <= 1000));
}

/** @param {unknown} value @returns {value is SleepRecord} */
function isSleepRecord(value) {
  return isObject(value)
    && Number.isSafeInteger(value.id)
    && /** @type {number} */ (value.id) > 0
    && isSleepDraft(value)
    && (value.quality === null || typeof value.quality === 'number')
    && (value.morning_energy === null || typeof value.morning_energy === 'number')
    && (value.notes === null || typeof value.notes === 'string');
}

/** @param {unknown} value @returns {value is SleepRecord[]} */
function isSleepList(value) {
  return Array.isArray(value) && value.every(isSleepRecord);
}

/**
 * Adapter for the team's API. Values remain in the server's units.
 * @param {{baseUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number}} options
 */
export function createApiClient({ baseUrl, fetchImpl = fetch, timeoutMs = 10000 }) {
  /**
   * @template T
   * @param {string} path
   * @param {(value: unknown) => value is T} validate
   * @param {ApiRequestOptions} options
   * @returns {Promise<T>}
   */
  async function request(path, validate, { signal, method = 'GET', body, empty = false } = {}) {
    if (!baseUrl?.trim()) {
      throw new ApiError('configuration', 'Set EXPO_PUBLIC_API_URL in mobile/.env.local, then reload the app.');
    }

    let url;
    try {
      url = new URL(`${baseUrl.trim().replace(/\/+$/, '')}${path}`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    } catch {
      throw new ApiError('configuration', 'EXPO_PUBLIC_API_URL must be an HTTP or HTTPS URL.');
    }
    if (signal?.aborted) throw new ApiError('cancelled', 'Request cancelled.');

    const controller = new AbortController();
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    /** @type {(() => void) | undefined} */
    let cancel;

    const stopped = new Promise((_, reject) => {
      cancel = () => {
        controller.abort();
        reject(new ApiError('cancelled', 'Request cancelled.'));
      };
      signal?.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => {
        controller.abort();
        reject(new ApiError('timeout', 'The API did not respond in time. Check the server and try again.'));
      }, timeoutMs);
    });

    const request = (async () => {
      let response;
      try {
        response = await fetchImpl(url.toString(), {
          method,
          headers: body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: controller.signal,
        });
      } catch {
        throw new ApiError('network', 'Could not reach the API. Check the server, address, network and browser CORS settings.');
      }
      if (!response.ok) throw new ApiError('http', `The API returned HTTP ${response.status}.`, response.status);

      if (empty && response.status === 204) {
        if (method !== 'GET') publishRecordChange();
        return undefined;
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new ApiError('response', 'The API returned invalid JSON.');
      }
      if (!validate(result)) throw new ApiError('response', 'The API response does not match the current endpoint format.');
      if (method !== 'GET') publishRecordChange();
      return result;
    })();

    try {
      return /** @type {T} */ (await Promise.race([request, stopped]));
    } finally {
      clearTimeout(timer);
      if (cancel) signal?.removeEventListener('abort', cancel);
    }
  }

  /** @param {number} id */
  function bowelPath(id) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError('validation', 'Choose a valid bowel movement.');
    return `/api/bowel/${id}`;
  }

  /** @param {BowelDraft} value */
  function draft(value) {
    if (!isBowelDraft(value)) throw new ApiError('validation', 'Check the bowel movement before saving.');
    return value;
  }

  /** @param {number} id */
  function drinkPath(id) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError('validation', 'Choose a valid drink entry.');
    return `/api/drinks/${id}`;
  }

  /** @param {number} id */
  function exercisePath(id) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new ApiError('validation', 'Choose a valid exercise entry.');
    }
    return `/api/exercise/${id}`;
  }

  /** @param {number} id */
  function symptomPath(id) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new ApiError('validation', 'Choose a valid symptom entry.');
    }

    return `/api/symptoms/${id}`;
  }

    /** @param {number} id */
  function sleepPath(id) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new ApiError('validation', 'Choose a valid sleep entry.');
    }
    return `/api/sleep/${id}`;
  }

  return {
  /** @param {RequestOptions} [options] */
  getHealth: (options = {}) => request('/api/health', isHealth, options),

  // FOOD API

    /** @param {RequestOptions} [options] @returns {Promise<FoodRecord[]>} */
    listFood: (options = {}) =>
      request('/api/food', isFoodList, options),

    /** @param {FoodDraft} food @param {RequestOptions} [options] @returns {Promise<FoodResponse>} */
    createFood: (food, options = {}) =>
      request('/api/food', isFoodCreated, {
        ...options,
        method: 'POST',
        body: food,
      }),

    /** @param {number} id @param {FoodDraft} food @param {RequestOptions} [options] @returns {Promise<FoodResponse>} */
    updateFood: (id, food, options = {}) =>
      request(`/api/food/${id}`, isFoodCreated, {
        ...options,
        method: 'PUT',
        body: food,
      }),

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<FoodDeleteResponse>} */
    deleteFood: (id, options = {}) =>
      request(`/api/food/${id}`, isFoodDeleted, {
        ...options,
        method: 'DELETE',
      }),

    /** @param {number} id */
    exercisePath: undefined,

        // SLEEP API
    /** @param {ListSleepOptions} [options] @returns {Promise<SleepRecord[]>} */
    async listSleep(options = {}) {
      if (options.date !== undefined && !isLocalDate(options.date)) {
        throw new ApiError('validation', 'Choose a valid date.');
      }
      const query = options.date === undefined
        ? '' : `?date=${encodeURIComponent(options.date)}`;
      return request(`/api/sleep${query}`, isSleepList, options);
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<SleepRecord>} */
    async getSleep(id, options = {}) {
      return request(sleepPath(id), isSleepRecord, options);
    },

    /** @param {SleepDraft} value @param {RequestOptions} [options] @returns {Promise<SleepRecord>} */
    async createSleep(value, options = {}) {
      if (!isSleepDraft(value)) {
        throw new ApiError('validation', 'Check the sleep entry before saving.');
      }
      return request('/api/sleep', isSleepRecord, { ...options, method: 'POST', body: value });
    },

    /** @param {number} id @param {SleepDraft} value @param {RequestOptions} [options] @returns {Promise<SleepRecord>} */
    async updateSleep(id, value, options = {}) {
      if (!isSleepDraft(value)) {
        throw new ApiError('validation', 'Check the sleep entry before saving.');
      }
      return request(sleepPath(id), isSleepRecord, { ...options, method: 'PUT', body: value });
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<void>} */
    async deleteSleep(id, options = {}) {
      return request(sleepPath(id), (value) => value === undefined, {
        ...options, method: 'DELETE', empty: true,
      });
    },
    
    // EXERCISE API

    /** @param {ListExerciseOptions} [options] @returns {Promise<ExerciseRecord[]>} */
    async listExercise(options = {}) {
      if (options.date !== undefined && !isLocalDate(options.date)) {
        throw new ApiError('validation', 'Choose a valid date.');
      }

      const query = options.date === undefined
        ? ''
        : `?date=${encodeURIComponent(options.date)}`;

      return request(`/api/exercise${query}`, isExerciseList, options);
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<ExerciseRecord>} */
    async getExercise(id, options = {}) {
      return request(exercisePath(id), isExerciseRecord, options);
    },

    /** @param {ExerciseDraft} value @param {RequestOptions} [options] @returns {Promise<ExerciseRecord>} */
    async createExercise(value, options = {}) {
      if (!isExerciseDraft(value)) {
        throw new ApiError('validation', 'Check the exercise before saving.');
      }

      return request('/api/exercise', isExerciseRecord, {
        ...options,
        method: 'POST',
        body: value,
      });
    },

    /** @param {number} id @param {ExerciseDraft} value @param {RequestOptions} [options] @returns {Promise<ExerciseRecord>} */
    async updateExercise(id, value, options = {}) {
      if (!isExerciseDraft(value)) {
        throw new ApiError('validation', 'Check the exercise before saving.');
      }

      return request(exercisePath(id), isExerciseRecord, {
        ...options,
        method: 'PUT',
        body: value,
      });
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<void>} */
    async deleteExercise(id, options = {}) {
      return request(
        exercisePath(id),
        (value) => value === undefined,
        {
          ...options,
          method: 'DELETE',
          empty: true,
        }
      );
    },

    
    // SYMPTOMS API

    /** @param {ListSymptomsOptions} [options] @returns {Promise<SymptomRecord[]>} */
    async listSymptoms(options = {}) {
      if (options.date !== undefined && !isLocalDate(options.date)) {
        throw new ApiError('validation', 'Choose a valid date.');
      }

      const query = options.date === undefined
        ? ''
        : `?date=${encodeURIComponent(options.date)}`;

      return request(`/api/symptoms${query}`, isSymptomList, options);
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<SymptomRecord>} */
    async getSymptom(id, options = {}) {
      return request(symptomPath(id), isSymptomRecord, options);
    },

    /** @param {SymptomDraft} value @param {RequestOptions} [options] @returns {Promise<SymptomRecord>} */
    async createSymptom(value, options = {}) {
      if (!isSymptomDraft(value)) {
        throw new ApiError('validation', 'Check the symptom before saving.');
      }

      return request('/api/symptoms', isSymptomRecord, {
        ...options,
        method: 'POST',
        body: value,
      });
    },

    /** @param {number} id @param {SymptomDraft} value @param {RequestOptions} [options] @returns {Promise<SymptomRecord>} */
    async updateSymptom(id, value, options = {}) {
      if (!isSymptomDraft(value)) {
        throw new ApiError('validation', 'Check the symptom before saving.');
      }

      return request(symptomPath(id), isSymptomRecord, {
        ...options,
        method: 'PUT',
        body: value,
      });
    },

    /** @param {number} id @param {RequestOptions} [options] @returns {Promise<void>} */
    async deleteSymptom(id, options = {}) {
      return request(
        symptomPath(id),
        (value) => value === undefined,
        {
          ...options,
          method: 'DELETE',
          empty: true,
        }
      );
    },


    // DRINKS API

  /** @param {ListDrinksOptions} [options] @returns {Promise<DrinkRecord[]>} */
  async listDrinks(options = {}) {
    if (options.date !== undefined && !isLocalDate(options.date)) throw new ApiError('validation', 'Choose a valid date.');
    const query = options.date === undefined ? '' : `?date=${encodeURIComponent(options.date)}`;
    return request(`/api/drinks${query}`, (value) => Array.isArray(value) && value.every(isDrinkRecord), options);
  },

  /** @param {number} id @param {RequestOptions} [options] @returns {Promise<DrinkRecord>} */
  async getDrink(id, options = {}) {
    return request(drinkPath(id), isDrinkRecord, options);
  },

  /** @param {DrinkDraft} value @param {RequestOptions} [options] @returns {Promise<DrinkRecord>} */
  async createDrink(value, options = {}) {
    if (!isDrinkDraft(value)) throw new ApiError('validation', 'Check the drink before saving.');
    return request('/api/drinks', isDrinkRecord, { ...options, method: 'POST', body: value });
  },

  /** @param {number} id @param {DrinkChanges} value @param {RequestOptions} [options] @returns {Promise<DrinkRecord>} */
  async updateDrink(id, value, options = {}) {
    if (!isDrinkChanges(value)) throw new ApiError('validation', 'Check the drink before saving.');
    return request(drinkPath(id), isDrinkRecord, { ...options, method: 'PUT', body: value });
  },

  /** @param {number} id @param {RequestOptions} [options] @returns {Promise<void>} */
  async deleteDrink(id, options = {}) {
    return request(drinkPath(id), (value) => value === undefined, { ...options, method: 'DELETE', empty: true });
  },

  // BOWEL API (existing code)

  /** @param {ListBowelOptions} [options] @returns {Promise<BowelRecord[]>} */
  async listBowel(options = {}) {
    const query = new URLSearchParams();
    for (const key of /** @type {const} */ (['from', 'to'])) {
      const value = options[key];
      if (value !== undefined) {
        if (!isUtcTimestamp(value)) throw new ApiError('validation', 'Choose a valid date range.');
        query.set(key, value);
      }
    }
    if (options.from && options.to && new Date(options.from) > new Date(options.to)) {
      throw new ApiError('validation', 'The date range must end after it starts.');
    }
    const range = query.toString();
    return request(`/api/bowel${range ? `?${range}` : ''}`, (value) => Array.isArray(value) && value.every(isBowelRecord), options);
  },

  /** @param {number} id @param {RequestOptions} [options] @returns {Promise<BowelRecord>} */
  async getBowel(id, options = {}) {
    return request(bowelPath(id), isBowelRecord, options);
  },

  /** @param {BowelDraft} value @param {RequestOptions} [options] @returns {Promise<BowelRecord>} */
  async createBowel(value, options = {}) {
    return request('/api/bowel', isBowelRecord, {
      ...options,
      method: 'POST',
      body: draft(value),
    });
  },

  /** @param {number} id @param {BowelDraft} value @param {RequestOptions} [options] @returns {Promise<BowelRecord>} */
  async updateBowel(id, value, options = {}) {
    return request(bowelPath(id), isBowelRecord, {
      ...options,
      method: 'PUT',
      body: draft(value),
    });
  },

  /** @param {number} id @param {RequestOptions} [options] @returns {Promise<void>} */
  async deleteBowel(id, options = {}) {
    return request(bowelPath(id), (value) => value === undefined, {
      ...options,
      method: 'DELETE',
      empty: true,
    });
  },
};
}
