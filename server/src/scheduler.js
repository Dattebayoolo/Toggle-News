import cron from 'node-cron';
import { getFetcher } from './sources.js';
import { saveArticles, logFetch, db } from './db/sqlite.js';

const STAGGER_MS = 2000;

async function fetchSource(source) {
  const fetcher = await getFetcher(source.type);
  if (!fetcher) throw new Error(`No fetcher for source type "${source.type}"`);
  const rows = await fetcher(source);
  const inserted = saveArticles(rows);
  logFetch({ sourceId: source.id, status: 'ok', itemsFetched: rows.length, itemsNew: inserted, message: null });
  console.log(`[${source.id}] fetched ${rows.length}, new ${inserted}`);
  return { rows: rows.length, inserted };
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
  console.log(`Scheduler started: ${jobs.length} sources registered.`);
  return jobs;
}
