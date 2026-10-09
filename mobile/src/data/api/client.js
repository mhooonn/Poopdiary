import { isBowelDraft, isBowelRecord, isUtcTimestamp } from '../../features/bowel/model';



/** @typedef {import('../../features/bowel/model').BowelDraft} BowelDraft */
/** @typedef {import('../../features/bowel/model').BowelRecord} BowelRecord */
/** @typedef {'configuration' | 'network' | 'timeout' | 'http' | 'response' | 'cancelled' | 'validation'} ApiErrorCode */
/** @typedef {{status: 'ok', message: string}} HealthResponse */
/** @typedef {{id: number, date: string, water: number | null, symptoms: string | null}} DiaryEntry */
/** @typedef {{signal?: AbortSignal}} RequestOptions */
/** @typedef {RequestOptions & {from?:string, to?:string}} ListBowelOptions */

// Food types
/** @typedef {{id: number, food_name: string, meal_type: string | null, date: string, time: string | null, notes: string | null}} FoodRecord */

/** @typedef {{id: number, foodName: string, mealType?: string | null, date: string, time?: string | null, notes?: string | null}} FoodResponse */

/** @typedef {{foodName: string, mealType?: string, date: string, time?: string | null, notes?: string}} FoodDraft */

/** @typedef {{message: string}} FoodDeleteResponse */

/** @typedef {RequestOptions & {method?:'GET'|'POST'|'PUT'|'DELETE', body?:BowelDraft | FoodDraft, empty?:boolean}} ApiRequestOptions */




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

/** @param {unknown} value @returns {value is DiaryEntry[]} */
function isDiary(value) {
  return Array.isArray(value) && value.every((entry) =>
    isObject(entry)
    && typeof entry.id === 'number' && Number.isFinite(entry.id)
    && typeof entry.date === 'string' && entry.date.length > 0
    && (entry.water === null || (typeof entry.water === 'number' && Number.isFinite(entry.water)))
    && (entry.symptoms === null || typeof entry.symptoms === 'string'));
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

      if (empty && response.status === 204) return undefined;

      let result;
      try {
        result = await response.json();
      } catch {
        throw new ApiError('response', 'The API returned invalid JSON.');
      }
      if (!validate(result)) throw new ApiError('response', 'The API response does not match the current endpoint format.');
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

  return {
  /** @param {RequestOptions} [options] */
  getHealth: (options = {}) => request('/api/health', isHealth, options),

  /** @param {RequestOptions} [options] */
  getDiary: (options = {}) => request('/api/diary', isDiary, options),

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
