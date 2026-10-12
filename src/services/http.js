/**
 * Layer: services (rank 2) — base HTTP client.
 *
 * Thin, dependency-free JSON fetch wrapper. Relative URLs are used so the
 * Vite dev proxy (and production co-hosting) route `/api` and `/health` to
 * the Express backend. Unlike `fetch`, this throws a typed `ApiError` on
 * network/timeout failures so callers can render a single error state.
 *
 * By default it does NOT throw on non-2xx responses (callers may receive an
 * error payload such as `{ states: [], error }`); pass `throwOnHttpError` to
 * opt into strict handling.
 */
import { HTTP_CONFIG, API_BASE } from '../config/http.js'

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, url?: string, cause?: unknown }} [info]
   */
  constructor(message, { status = 0, url = '', cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
    if (cause !== undefined) this.cause = cause
  }
}

/**
 * @param {string} path
 * @param {Record<string, string|number|boolean|null|undefined>} [params]
 * @returns {string}
 */
function buildUrl(path, params) {
  const base =
    API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const url = new URL(path, base)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Perform a JSON request. Returns the parsed body, or `null` for empty bodies.
 *
 * @param {string} path
 * @param {{
 *   params?: Record<string, string|number|boolean|null|undefined>,
 *   method?: string,
 *   body?: unknown,
 *   headers?: Record<string, string>,
 *   timeoutMs?: number,
 *   signal?: AbortSignal,
 *   throwOnHttpError?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
export async function requestJson(path, options = {}) {
  const {
    params,
    method = 'GET',
    body,
    headers,
    timeoutMs = HTTP_CONFIG.defaultTimeoutMs,
    signal,
    throwOnHttpError = false
  } = options

  const url = buildUrl(path, params)
  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onExternalAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      method,
      headers: { ...HTTP_CONFIG.jsonHeaders, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    throw new ApiError(aborted ? `Request timed out: ${path}` : `Network error: ${path}`, {
      url,
      cause: error
    })
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      throw new ApiError(`Invalid JSON from ${path}`, {
        status: response.status,
        url,
        cause: error
      })
    }
  }

  if (throwOnHttpError && !response.ok) {
    throw new ApiError(
      (data && data.error) || `HTTP ${response.status} from ${path}`,
      { status: response.status, url }
    )
  }

  return data
}
