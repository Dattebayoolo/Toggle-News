import { toNewsApiArticleRow } from '../pipeline/normalize.js';

export const DEFAULT_API_KEY_ENV = 'NEWSAPI_KEY';

const API_BASE = 'https://newsapi.org/v2';
const TIMEOUT_MS = 15000;
const VALID_ENDPOINTS = new Set(['top-headlines', 'everything']);

/**
 * Resolve the newsapi.org key for a source.
 * Precedence: `apiKey` on the source config > environment variable.
 * The env var name defaults to NEWSAPI_KEY and is overridable via `apiKeyEnv`.
 */
export function resolveApiKey(source = {}) {
  if (source.apiKey) return source.apiKey;
  const envName = source.apiKeyEnv || DEFAULT_API_KEY_ENV;
  return process.env[envName] || process.env[DEFAULT_API_KEY_ENV] || null;
}

function buildRequestUrl(source, endpoint) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  const params = { pageSize: 50, ...(source.params || {}) };
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  if (source.language && !url.searchParams.has('language')) {
    url.searchParams.set('language', source.language);
  }
  return url;
}

/**
 * Fetch articles from newsapi.org for a `newsapi` source config.
 *
 * Source config fields (see sources.json):
 *   endpoint     "top-headlines" (default) | "everything"
 *   params       raw NewsAPI query params, e.g. { country: 'us', pageSize: 50 }
 *   language     convenience shorthand for the `language` param
 *   apiKey       literal key (avoid committing this)
 *   apiKeyEnv    env var holding the key (default NEWSAPI_KEY)
 */
export async function fetchNewsApi(source) {
  const apiKey = resolveApiKey(source);
  if (!apiKey) {
    throw new Error(
      `Missing NewsAPI key for "${source.id}" — set ${source.apiKeyEnv || DEFAULT_API_KEY_ENV} in server/.env or add "apiKey" to the source config.`
    );
  }

  const endpoint = VALID_ENDPOINTS.has(source.endpoint) ? source.endpoint : 'top-headlines';
  const url = buildRequestUrl(source, endpoint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let payload;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey, // header keeps the key out of URLs and access logs
        Accept: 'application/json',
        'User-Agent': 'ToggleNewsBot/1.0 (+https://example.com; contact: admin@example.com)',
      },
      signal: controller.signal,
    });
    payload = await res.json().catch(() => null);
    if (!res.ok || payload?.status === 'error' || !payload) {
      const detail = payload?.message || `HTTP ${res.status}`;
      throw new Error(`NewsAPI ${payload?.code || res.status}: ${detail}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`NewsAPI request for "${source.id}" timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  return (payload.articles || [])
    .filter((article) => article?.url && article?.title && article.title !== '[Removed]')
    .map((article) => toNewsApiArticleRow(source, article))
    .filter(Boolean);
}
