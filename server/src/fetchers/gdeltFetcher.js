import https from 'node:https';
import { toGdeltArticleRow } from '../pipeline/normalize.js';

export const GDELT_API_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';

const USER_AGENT = 'ToggleNewsBot/1.0 (+https://example.com; contact: admin@example.com)';
const TIMEOUT_MS = 20000;
const DEFAULT_MAX_RECORDS = 75;
const MAX_RECORDS_LIMIT = 250;

// GDELT asks for at most one request every 5 seconds and answers with HTTP 429
// plus a plain-text explanation when that is exceeded. Requests are serialised
// through this queue so the boot fetch, the per-source cron jobs, and a manual
// `npm run fetch-once` can never overlap or stampede the API.
const MIN_INTERVAL_MS = 5000;

// GDELT answers HTTP 429 (and occasionally resets the socket) when a client is
// too eager. Back off well past the 5s window before trying again.
const RETRY_DELAYS_MS = [10000, 30000];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TRANSIENT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE']);

function isTransient(err) {
  return TRANSIENT_CODES.has(err?.code) || /socket hang up|timed out/i.test(err?.message || '');
}

let lastRequestAt = 0;
let queue = Promise.resolve();

function reserveSlot() {
  const slot = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  queue = slot.catch(() => {}); // keep the chain alive if a caller rejects
  return slot;
}

/** Build the DOC 2.0 artlist URL for a source config. */
export function buildGdeltUrl(source) {
  const url = new URL(GDELT_API_BASE);
  const params = {
    query: source.query || 'sourcelang:english',
    mode: 'artlist',
    format: 'json',
    sort: 'datedesc',
    maxrecords: DEFAULT_MAX_RECORDS,
    ...(source.params || {})
  };
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('maxrecords', String(Math.min(Number(url.searchParams.get('maxrecords')) || DEFAULT_MAX_RECORDS, MAX_RECORDS_LIMIT)));
  return url;
}

/**
 * Plain HTTP GET via node:https.
 *
 * GDELT is fetched with node:https instead of the global `fetch`: on networks
 * running TLS inspection the undici handshake to api.gdeltproject.org stalls
 * until it hits the connect timeout (UND_ERR_CONNECT_TIMEOUT), while node:https
 * negotiates normally. The request itself is identical.
 */
function requestText(url, source) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode || 0, body }));
        res.on('error', reject);
      }
    );

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`GDELT request for "${source.id}" timed out after ${TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
  });
}

async function requestArticles(url, source, attempt = 1) {
  // GDELT replies with plain text (not JSON) for both rate limits and bad queries,
  // so read the body as text and decide from there.
  let result;
  try {
    result = await requestText(url, source);
  } catch (err) {
    if (attempt <= RETRY_DELAYS_MS.length && isTransient(err)) {
      await reserveSlot();
      await delay(RETRY_DELAYS_MS[attempt - 1]);
      return requestArticles(url, source, attempt + 1);
    }
    throw err;
  }

  const { status, body } = result;

  if (status === 429) {
    if (attempt <= RETRY_DELAYS_MS.length) {
      await reserveSlot();
      await delay(RETRY_DELAYS_MS[attempt - 1]);
      return requestArticles(url, source, attempt + 1);
    }
    throw new Error(`GDELT rate limit reached: ${body.slice(0, 160).trim()}`);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`GDELT ${status}: ${body.slice(0, 160).trim() || 'request failed'}`);
  }

  if (!body.trim().startsWith('{')) {
    throw new Error(`GDELT rejected the query: ${body.slice(0, 160).trim()}`);
  }

  try {
    return JSON.parse(body).articles || [];
  } catch {
    throw new Error(`GDELT returned unparseable JSON for "${source.id}"`);
  }
}

/**
 * Fetch articles from the GDELT 2.0 DOC API for a `gdelt` source config.
 *
 * Source config fields (see sources.json):
 *   query    GDELT query expression, e.g. `sourcelang:english "artificial intelligence"`
 *   params   raw DOC 2.0 params (maxrecords, timespan, startdatetime, sort, …)
 *
 * No API key is required. Note the artlist mode returns no summary text, so rows
 * are stored with `summary = null` and the UI falls back to the headline.
 */
export async function fetchGdelt(source) {
  const url = buildGdeltUrl(source);
  const articles = await reserveSlot().then(() => requestArticles(url, source, 1));
  return articles.map((article) => toGdeltArticleRow(source, article)).filter(Boolean);
}
