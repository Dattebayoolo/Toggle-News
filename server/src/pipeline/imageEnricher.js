// Image backfill — gives wire articles a picture when the feed didn't supply one.
//
// GDELT's artlist mode carries no image for most articles, several NewsAPI
// publishers omit `urlToImage`, and the RSS feeds only expose an image when the
// item happens to include one. For every article still without an image we fetch
// the article page once and read its social-preview tag (og:image /
// twitter:image / link[rel=image_src]) — the same image a link preview would show.
//
// Deliberately conservative: bounded concurrency, a short timeout, a small read
// cap (the tags live in <head>), and an `image_checked_at` stamp so a dead link is
// never retried in a loop.

import { fetchArticleHtml, runPool } from './pageFetch.js';
import {
  getArticlesNeedingImages,
  setArticleImage,
  countArticlesMissingImages
} from '../db/sqlite.js';

// The page fetcher in ./pageFetch.js presents as a normal browser and only ever
// performs a single GET per article. The image pass reads just the <head>.
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_LIMIT = 20;
const IMAGE_MAX_BYTES = 300000;

// Preference order matters: og:image is the canonical link-preview image, so it
// wins over twitter:image even when the twitter tag appears first in the markup.
const IMAGE_META_PRIORITY = [
  'og:image',
  'og:image:secure_url',
  'og:image:url',
  'twitter:image',
  'twitter:image:src',
  'image_src'
];

/** Resolve a possibly-relative image URL; reject data: URLs and non-http schemes. */
function resolveImageUrl(candidate, baseUrl) {
  if (!candidate) return null;
  const value = String(candidate).trim();
  if (!value || /^data:/i.test(value)) return null;
  try {
    const resolved = new URL(value, baseUrl);
    return /^https?:$/.test(resolved.protocol) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Extract the social-preview image from an HTML document.
 * Pure function — no I/O — so it can be tested against saved markup.
 */
export function extractOgImage(html, baseUrl) {
  if (!html) return null;

  // Collect the first value seen for each supported key, then pick by priority
  // rather than by document order.
  const byKey = new Map();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!key) continue;
    const normalised = key.trim().toLowerCase();
    if (!IMAGE_META_PRIORITY.includes(normalised) || byKey.has(normalised)) continue;
    const content = (tag.match(/content\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (content) byKey.set(normalised, content);
  }

  for (const key of IMAGE_META_PRIORITY) {
    const resolved = resolveImageUrl(byKey.get(key), baseUrl);
    if (resolved) return resolved;
  }

  const linkTag = html.match(/<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i);
  if (linkTag) {
    const href = (linkTag[0].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    const resolved = resolveImageUrl(href, baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

/** Fetch one article page and return its social-preview image (or null). */
export async function enrichArticleImage(article) {
  const { html, finalUrl } = await fetchArticleHtml(article.url, { maxBytes: IMAGE_MAX_BYTES });
  return extractOgImage(html, finalUrl);
}

/**
 * Backfill images for up to `limit` articles that have none.
 *
 * Never throws — each article's failure is recorded on the row and reported
 * through `onResult`, so one unreachable publisher cannot break the pass.
 */
export async function enrichMissingImages({
  limit = DEFAULT_LIMIT,
  concurrency = DEFAULT_CONCURRENCY,
  onResult
} = {}) {
  const pending = getArticlesNeedingImages({ limit });
  if (!pending.length) {
    return { checked: 0, found: 0, remaining: countArticlesMissingImages() };
  }

  let found = 0;

  await runPool(
    pending,
    async (article) => {
      let imageUrl = null;
      let error = null;
      try {
        imageUrl = await enrichArticleImage(article);
      } catch (err) {
        error = String(err?.message || err);
      }

      // Stamp the attempt either way so a dead or image-less page is not retried.
      setArticleImage(article.id, imageUrl);
      if (imageUrl) found += 1;
      if (onResult) onResult({ article, imageUrl, error });
    },
    concurrency
  );

  return { checked: pending.length, found, remaining: countArticlesMissingImages() };
}
