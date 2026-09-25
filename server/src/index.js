import { loadEnv } from './env.js';

loadEnv(); // hydrate process.env from server/.env before anything reads it

import express from 'express';
import { loadSources } from './sources.js';
import { fetchAllSources, startScheduler } from './scheduler.js';
import { api } from './api/routes.js';

const app = express();
app.use('/api', api);

const PORT = process.env.PORT || 8787;

async function main() {
  const sources = loadSources();
  console.log(`Loaded ${sources.length} enabled sources.`);

  // Initial fetch at boot (non-blocking), then start the cron schedules.
  fetchAllSources(sources).catch((err) => console.error('Initial fetch failed:', err));
  startScheduler(sources);

  app.listen(PORT, () => console.log(`Toggle News API listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
