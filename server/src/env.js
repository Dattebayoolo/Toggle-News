import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENV_PATH = path.join(__dirname, '..', '.env'); // server/.env

/**
 * Load KEY=VALUE pairs from a .env file into process.env.
 *
 * Uses the built-in `process.loadEnvFile()` (Node >= 20.12); variables already
 * present in the environment always win, so shell/CI config can override the file.
 * A missing file is not an error — the server still starts and reports the
 * missing key per-source in `fetch_log`.
 */
export function loadEnv(envFile = process.env.ENV_FILE || DEFAULT_ENV_PATH) {
  if (!fs.existsSync(envFile)) return false;
  try {
    process.loadEnvFile(envFile);
    return true;
  } catch (err) {
    console.warn(`[env] Could not load ${envFile}: ${err.message}`);
    return false;
  }
}
