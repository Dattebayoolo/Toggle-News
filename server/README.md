# Toggle News Server

RSS news scraper + API. Fetches articles from configured feeds, deduplicates, stores in SQLite, and serves them over REST.

**Requires Node.js >= 22.5** (uses built-in `node:sqlite`).

## Run

```bash
npm install
npm run fetch-once   # one-shot fetch of all sources
npm start            # starts scheduler + API on http://localhost:8787
```

The server fetches all sources at boot, then re-fetches each source on its own cron schedule (`intervalMinutes`, min 5).

## Configuration

Edit `src/sources.json`:

| Field | Description |
|---|---|
| `id` | Unique source identifier |
| `name` | Display name |
| `type` | Fetcher type — `rss` (only type implemented) |
| `url` | Feed URL |
| `category` | Category tag stored on articles |
| `enabled` | Set `false` to skip |
| `intervalMinutes` | Re-fetch interval (min 5) |

## API

- `GET /api/articles?category=&source=&page=1&pageSize=25` — paginated articles, newest first (pageSize max 100)
- `GET /api/sources` — configured sources with last-fetch status
- `GET /api/categories` — category counts

## Data

SQLite DB at `data/news.db` (WAL mode). Tables:

- `articles` — one row per unique article (deduped by normalized URL hash + title hash)
- `fetch_log` — per-fetch outcome per source (status, counts, errors)

## Frontend integration

Vite dev server runs on :5173, API on :8787 — add a proxy in `vite.config.js` or call `http://localhost:8787/api/...` directly.
