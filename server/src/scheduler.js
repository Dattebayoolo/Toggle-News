import cron from 'node-cron';
import { getFetcher } from './sources.js';
import { saveArticles, logFetch, db } from './db/sqlite.js';
import { enrichMissingImages } from './pipeline/imageEnricher.js';
import { enrichMissingContent } from './pipeline/contentEnricher.js';

const STAGGER_MS = 2000;

// Articles arrive without a picture from several wires (GDELT never sends one),
// so each pass ends with a bounded image backfill. Bounded because it makes one
// page request per article — the cron job below drains the rest gradually.
const BACKFILL_AFTER_FETCH = 30;
const BACKFILL_PER_TICK = 12;
const BACKFILL_CRON = '*/10 * * * *';

// Full-text extraction downloads whole article pages, which is heavier than the
// image pass, so it runs on the same schedule but drains more slowly.
const CONTENT_AFTER_FETCH = 8;
const CONTENT_PER_TICK = 6;

async function fetchSource(source) {
  const fetcher = await getFetcher(source.type);
  if (!fetcher) throw new Error(`No fetcher for source type "${source.type}"`);
  const rows = await fetcher(source);
  const inserted = saveArticles(rows);
  logFetch({ sourceId: source.id, status: 'ok', itemsFetched: rows.length, itemsNew: inserted, message: null });
  console.log(`[${source.id}] fetched ${rows.length}, new ${inserted}`);
  return { rows: rows.length, inserted };
}

/** Backfill article images; never throws so it cannot break a fetch pass. */
export async function backfillImages(limit = BACKFILL_PER_TICK) {
  try {
    const { checked, found, remaining } = await enrichMissingImages({ limit });
    if (checked) {
      console.log(`[images] backfilled ${found}/${checked} article images (${remaining} still pending)`);
    }
    return { checked, found, remaining };
  } catch (err) {
    console.error(`[images] backfill failed: ${err.message}`);
    return { checked: 0, found: 0, remaining: null, error: err.message };
  }
}

/** Backfill full article text; never throws so it cannot break a fetch pass. */
export async function backfillContent(limit = CONTENT_PER_TICK) {
  try {
    const { checked, found, remaining } = await enrichMissingContent({ limit });
    if (checked) {
      console.log(`[content] extracted ${found}/${checked} full articles (${remaining} still pending)`);
    }
    return { checked, found, remaining };
  } catch (err) {
    console.error(`[content] backfill failed: ${err.message}`);
    return { checked: 0, found: 0, remaining: null, error: err.message };
  }
}

export async function fetchAllSources(sources) {
  const results = [];
  for (const source of sources) {
    try {
      results.push({ sourceId: source.id, ...(await fetchSource(source)) });
    } catch (err) {
      logFetch({ sourceId: source.id, status: 'error', itemsFetched: 0, itemsNew: 0, message: String(err.message || err).slice(0, 500) });
      console.error(`[${source.id}] ERROR: ${err.message}`);
      results.push({ sourceId: source.id, error: err.message });
    }
    await new Promise((r) => setTimeout(r, STAGGER_MS)); // be polite between domains
  }

  await backfillImages(BACKFILL_AFTER_FETCH);
  await backfillContent(CONTENT_AFTER_FETCH);
  return results;
}

export function startScheduler(sources) {
  const jobs = [];
  for (const source of sources) {
    const minutes = Math.max(source.intervalMinutes || 15, 5);
    const job = cron.schedule(`*/${minutes} * * * *`, () => {
      fetchSource(source).catch((err) => {
        logFetch({ sourceId: source.id, status: 'error', itemsFetched: 0, itemsNew: 0, message: String(err.message || err).slice(0, 500) });
        console.error(`[${source.id}] ERROR: ${err.message}`);
      });
    });
    jobs.push(job);
  }

  // Drain images and full text for articles the per-source jobs discovered.
  jobs.push(cron.schedule(BACKFILL_CRON, async () => {
    await backfillImages(BACKFILL_PER_TICK);
    await backfillContent(CONTENT_PER_TICK);
  }));

  console.log(`Scheduler started: ${jobs.length} jobs registered (${sources.length} sources + image & full-text backfill).`);
  return jobs;
}
