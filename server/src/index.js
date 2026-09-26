import { loadEnv } from './env.js';

loadEnv(); // hydrate process.env from server/.env before anything reads it

import express from 'express';
import { loadSources } from './sources.js';
import { fetchAllSources, startScheduler } from './scheduler.js';
import { api } from './api/routes.js';
import { authRoutes } from './api/authRoutes.js';
import { getSsoConfig } from './auth/config.js';

const app = express();
app.use(express.json());

// Toggle Account System: /auth/* (sign-in, callback, session, logout) and the
// protected /api/me. The news APIs stay public — reading never needs an account.
app.use(authRoutes);
app.use('/api', api);

const PORT = process.env.PORT || 8787;

async function main() {
  const sources = loadSources();
  console.log(`Loaded ${sources.length} enabled sources.`);

  const sso = getSsoConfig();
  console.log(
    `Toggle Account SSO: client "${sso.clientId}" → ${sso.authBaseUrl} (redirect ${sso.redirectUri})`
  );

  // Initial fetch at boot (non-blocking), then start the cron schedules.
  fetchAllSources(sources).catch((err) => console.error('Initial fetch failed:', err));
  startScheduler(sources);

  app.listen(PORT, () => console.log(`Toggle News API listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
