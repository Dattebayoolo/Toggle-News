import { loadEnv } from './env.js';

loadEnv(); // hydrate process.env from server/.env before fetching

import { loadSources } from './sources.js';
import { fetchAllSources } from './scheduler.js';

const sources = loadSources();
console.log(`Running one-shot fetch of ${sources.length} sources...`);
const results = await fetchAllSources(sources);
console.log(JSON.stringify(results, null, 2));
process.exit(0);
