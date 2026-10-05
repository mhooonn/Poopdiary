/** @typedef {'configuration' | 'network' | 'timeout' | 'http' | 'response' | 'cancelled'} ApiErrorCode */
/** @typedef {{status: 'ok', message: string}} HealthResponse */
/** @typedef {{id: number, date: string, water: number | null, symptoms: string | null}} DiaryEntry */
/** @typedef {{signal?: AbortSignal}} RequestOptions */

export class ApiError extends Error {
  /** @param {ApiErrorCode} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
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

/**
 * Read-only adapter for the team's current API. Values remain in the server's units.
 * @param {{baseUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number}} options
 */
export function createApiClient({ baseUrl, fetchImpl = fetch, timeoutMs = 10000 }) {
  /**
   * @template T
   * @param {string} path
   * @param {(value: unknown) => value is T} validate
   * @param {RequestOptions} options
   * @returns {Promise<T>}
   */
  async function read(path, validate, { signal } = {}) {
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
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch {
        throw new ApiError('network', 'Could not reach the API. Check the server, address, network and browser CORS settings.');
      }
      if (!response.ok) throw new ApiError('http', `The API returned HTTP ${response.status}.`);

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

  return {
    /** @param {RequestOptions} [options] */
    getHealth: (options = {}) => read('/api/health', isHealth, options),
    /** @param {RequestOptions} [options] */
    getDiary: (options = {}) => read('/api/diary', isDiary, options),
  };
}
