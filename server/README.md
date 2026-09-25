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
| `type` | Fetcher type — `rss` or `newsapi` |
| `url` | Feed URL (`rss` sources only) |
| `endpoint` | `top-headlines` (default) or `everything` (`newsapi` sources only) |
| `params` | Raw query params forwarded to the NewsAPI endpoint, e.g. `{ "country": "us", "q": "elections" }` |
| `language` | Convenience shorthand for the NewsAPI `language` param |
| `apiKey` | Literal NewsAPI key — prefer `apiKeyEnv` so the key stays out of git |
| `apiKeyEnv` | Env var holding the NewsAPI key (default `NEWSAPI_KEY`) |
| `category` | Category tag stored on articles |
| `enabled` | Set `false` to skip |
| `intervalMinutes` | Re-fetch interval (min 5) |

## NewsAPI (newsapi.org)

The `newsapi` fetcher pulls headlines from [newsapi.org](https://newsapi.org). The key is sent in the
`X-Api-Key` header (never in the URL) and is resolved from `apiKey`, else `process.env[apiKeyEnv]`,
else `process.env.NEWSAPI_KEY`.

```bash
cp .env.example .env   # then set NEWSAPI_KEY=... in .env
```

`server/.env` is git-ignored and loaded automatically by `npm start` / `npm run fetch-once`
(via `src/env.js`). Shell/CI environment variables always take precedence over the file.

```json
{
  "id": "newsapi-us-top",
  "name": "NewsAPI — US Top Headlines",
  "type": "newsapi",
  "endpoint": "top-headlines",
  "apiKeyEnv": "NEWSAPI_KEY",
  "params": { "country": "us", "pageSize": 50 },
  "category": "world",
  "enabled": true,
  "intervalMinutes": 60
}
```

> **Free plan quota:** newsapi.org's developer plan allows **100 requests/day** and returns
> articles with a **24-hour delay**. Each fetch = one request, so keep `intervalMinutes` high
> (`60` for two sources = ~48 requests/day). Articles whose title is `[Removed]` are dropped.

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
