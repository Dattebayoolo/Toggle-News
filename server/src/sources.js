import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fetchers = {
  rss: null, // lazy-loaded below to avoid import cycles in tests
};

export function loadSources() {
  const raw = fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf-8');
  const sources = JSON.parse(raw);
  const seen = new Set();
  const valid = [];
  for (const s of sources) {
    if (!s.id || seen.has(s.id)) continue;
    if (!s.enabled) continue;
    if (!fetchers[s.type] && s.type !== 'rss') continue; // unknown type -> skip
    seen.add(s.id);
    valid.push({ intervalMinutes: 15, ...s });
  }
  return valid;
}

export async function getFetcher(type) {
  if (!fetchers[type]) {
    if (type === 'rss') {
      fetchers.rss = (await import('./fetchers/rssFetcher.js')).fetchRss;
    } else {
      return null;
    }
  }
  return fetchers[type];
}
