import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy-loaded fetcher implementations, keyed by the source `type`. Kept lazy to
// avoid pulling network deps into tests that only read the source list.
const loaders = {
  rss: async () => (await import('./fetchers/rssFetcher.js')).fetchRss,
  newsapi: async () => (await import('./fetchers/newsApiFetcher.js')).fetchNewsApi,
  gdelt: async () => (await import('./fetchers/gdeltFetcher.js')).fetchGdelt,
};

const fetchers = {
  rss: null,
  newsapi: null,
  gdelt: null,
};

export function loadSources() {
  const raw = fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf-8');
  const sources = JSON.parse(raw);
  const seen = new Set();
  const valid = [];
  for (const s of sources) {
    if (!s.id || seen.has(s.id)) continue;
    if (!s.enabled) continue;
    if (!loaders[s.type]) continue; // unknown type -> skip
    seen.add(s.id);
    valid.push({ intervalMinutes: 15, ...s });
  }
  return valid;
}

export async function getFetcher(type) {
  if (!fetchers[type] && loaders[type]) {
    fetchers[type] = await loaders[type]();
  }
  return fetchers[type] || null;
}
