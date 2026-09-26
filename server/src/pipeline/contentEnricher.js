// Full-text backfill — gives wire articles their body text, not just a headline.
//
// Feeds carry a headline and a one-line summary; the article body lives on the
// publisher's page. For every article whose text has never been attempted we
// fetch the page once and run it through the extractor in ./extractArticle.js,
// then store the result on the row. Deliberately conservative: low concurrency,
// a longer timeout (full documents, not just <head>), a byte cap, and a
// `content_checked_at` stamp so paywalled or dead links are never retried.

import { fetchArticleHtml, runPool } from './pageFetch.js';
import { extractArticleText } from './extractArticle.js';
import {
  getArticlesNeedingContent,
  setArticleContent,
  countArticlesMissingContent
} from '../db/sqlite.js';

// A page that yields less than this is a paywall, a login wall, or a
// JavaScript-only shell — not an article body worth storing.
export const MIN_CONTENT_CHARS = 400;

const MAX_PAGE_BYTES = 900000;
const TIMEOUT_MS = 15000;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_LIMIT = 8;

/** Fetch one article page and return its extracted body. */
export async function extractArticleFromUrl(url) {
  const { html } = await fetchArticleHtml(url, { maxBytes: MAX_PAGE_BYTES, timeoutMs: TIMEOUT_MS });
  const result = extractArticleText(html);
  if (result.text.length < MIN_CONTENT_CHARS) {
    throw new Error(`no article body found (${result.text.length} chars)`);
  }
  return result;
}

// One extraction per article at a time, no matter how many callers ask.
const inFlight = new Map();

/**
 * Extract and store the full text for one article.
 * Resolves with `{ text, wordCount }` on success and `null` on failure (the
 * attempt is stamped on the row either way). Repeated calls while a run is in
 * flight share the same promise.
 */
export function ensureArticleContent(article) {
  if (!article?.id || !article?.url) return Promise.resolve(null);
  if (inFlight.has(article.id)) return inFlight.get(article.id);

  const job = extractArticleFromUrl(article.url)
    .then((result) => {
      setArticleContent(article.id, result.text);
      return result;
    })
    .catch(() => {
      setArticleContent(article.id, null);
      return null;
    })
    .finally(() => inFlight.delete(article.id));

  inFlight.set(article.id, job);
  return job;
}

export function countContentInFlight() {
  return inFlight.size;
}

/**
 * Backfill full text for up to `limit` articles that have none.
 *
 * Never throws — each article's failure is recorded on the row and reported
 * through `onResult`, so one unreachable publisher cannot break the pass.
 */
export async function enrichMissingContent({
  limit = DEFAULT_LIMIT,
  concurrency = DEFAULT_CONCURRENCY,
  onResult
} = {}) {
  const pending = getArticlesNeedingContent({ limit });
  if (!pending.length) {
    return { checked: 0, found: 0, remaining: countArticlesMissingContent() };
  }

  let found = 0;
  await runPool(
    pending,
    async (article) => {
      const result = await ensureArticleContent(article);
      if (result) found += 1;
      if (onResult) onResult({ article, wordCount: result?.wordCount || 0, found: Boolean(result) });
    },
    concurrency
  );

  return { checked: pending.length, found, remaining: countArticlesMissingContent() };
}
