// Shared article-page fetcher for the enrichment pipelines.
//
// News sites routinely reject unfamiliar clients, so every request presents as a
// normal browser. Both the image backfill (reads the social-preview tags in
// <head>) and the full-text extractor (needs the whole document) share this one
// bounded fetcher: a single GET per page, a hard byte cap, a short timeout, and
// a small redirect budget — so no publisher can stall a backfill pass.

import https from 'node:https';

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const DEFAULT_MAX_BYTES = 300000;
export const DEFAULT_TIMEOUT_MS = 12000;
export const DEFAULT_MAX_REDIRECTS = 3;

/** One GET, reading at most `maxBytes` so a huge page cannot stall the pass. */
function requestOnce(url, { maxBytes, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      },
      (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          const next = new URL(location, url).toString();
          resolve({ redirect: next });
          return;
        }

        let body = '';
        let truncated = false;
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (truncated) return;
          body += chunk;
          if (body.length >= maxBytes) {
            // Social-preview tags live in <head>, so stop reading rather than
            // downloading a whole page. Resolve immediately — destroying the
            // stream emits neither 'end' nor an error, which would hang the pass.
            truncated = true;
            body = body.slice(0, maxBytes);
            res.destroy();
            resolve({ status, type: res.headers['content-type'] || '', body, truncated: true });
          }
        });
        res.on('end', () => {
          if (!truncated) resolve({ status, type: res.headers['content-type'] || '', body });
        });
        res.on('error', reject);
      }
    );

    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
  });
}

/** Follow redirects, then return the HTML of the final page. */
export async function fetchArticleHtml(url, options = {}) {
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const res = await requestOnce(current, { maxBytes, timeoutMs });
    if (res.redirect) {
      current = res.redirect;
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    if (res.type && !/html|xhtml/i.test(res.type)) throw new Error(`not HTML (${res.type})`);
    return { html: res.body, finalUrl: current };
  }
  throw new Error('too many redirects');
}

/** Run `worker` across `items` with a fixed number of parallel workers. */
export async function runPool(items, worker, concurrency) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(workers);
}
