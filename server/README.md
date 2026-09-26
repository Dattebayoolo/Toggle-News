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
| `query` | GDELT query expression (`gdelt` sources only), e.g. `sourcelang:english "artificial intelligence"` |
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

## GDELT (gdeltproject.org)

The `gdelt` fetcher pulls from the [GDELT 2.0 DOC API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/),
a free open index of global news coverage. **No API key is required.**

```json
{
  "id": "gdelt-world",
  "name": "GDELT — Global English coverage",
  "type": "gdelt",
  "query": "sourcelang:english",
  "params": { "maxrecords": 75, "timespan": "1d", "sort": "datedesc" },
  "category": "world",
  "enabled": true,
  "intervalMinutes": 60
}
```

| `params` key | Notes |
|---|---|
| `maxrecords` | API caps this at 250; enforced here too |
| `timespan` | `1d`, `24h`, `7d`, … — or use `startdatetime` / `enddatetime` |
| `sort` | `datedesc` (default), `dateasc`, `hybridrel`, `tonedesc`, `toneasc` |

Query expressions support GDELT operators — `sourcelang:english`, `domain:cnn.com`,
`theme:TAX_ECON_POLICY`, `sourcecountry:US`, `tone<-5` — combined with quotes, `OR`, and
parentheses, e.g. `sourcelang:english ("artificial intelligence" OR semiconductor)`.

### What GDELT provides — and what it does not

- **`publisher` is the reporting domain** (e.g. `cnn.com`). The frontend outlet matcher already
  normalises domains, so `cnn.com` resolves to CNN's bias rating automatically. Long-tail domains
  absent from the outlet database are labelled **Unrated** rather than guessed.
- **`seendate`** uses GDELT's `YYYYMMDDTHHMMSSZ` format and is converted by `parseGdeltDate()`.
- **There is no summary or description.** `artlist` mode returns headline, URL, domain, image and
  timestamp only, so rows are stored with `summary = null` and the UI falls back to the headline.

### Reality check: GDELT is mostly long-tail

GDELT indexes tens of thousands of small, local, and trade publishers. A search such as
`sourcelang:english` returns outlets like `wmnf.org`, `falmouthpacket.co.uk` or `standardmedia.co.ke`
— none of which are in our ~45-outlet bias database. In practice **most GDELT articles therefore
render as "Unrated outlet"**, which the UI states plainly rather than guessing a lean.

Narrowing GDELT to mainstream publishers is only partly possible: GDELT rejects over-long queries
with *"Your query was too short or too long"* — a 12-domain `domainis:` OR chain (309 characters)
was refused — so only a handful of domains can be filtered per source:

```json
"query": "sourcelang:english (domainis:cnn.com OR domainis:reuters.com OR domainis:bbc.com)"
```

If you want a feed that is fully rated by the bias engine, prefer the `rss` and `newsapi` sources and
treat GDELT as breadth.

> A malformed or over-long GDELT query is reported as
> `GDELT rejected the query: Your query was too short or too long.` in `fetch_log`.

### Rate limits (important)

GDELT allows **one request every 5 seconds** and answers HTTP 429 with a plain-text body when
exceeded. Two protections are built in:

1. **Serialised requests** — every GDELT call passes through a queue that enforces the 5-second
   spacing, so the boot fetch, the hourly cron jobs, and `npm run fetch-once` cannot stampede it.
2. **Backoff + retry** — 429s and transient socket errors are retried after 10s, then 30s.

> GDELT is requested via `node:https` rather than the global `fetch`. On networks running TLS
> inspection, undici's handshake to `api.gdeltproject.org` stalls until it hits the connect
> timeout (`UND_ERR_CONNECT_TIMEOUT`), while `node:https` negotiates normally.

## Article images

Wires are inconsistent about pictures: GDELT's `artlist` never returns one, several NewsAPI
publishers omit `urlToImage`, and RSS only includes an image when the item happens to carry one.

For every article still without an image, `src/pipeline/imageEnricher.js` fetches the article page
once and reads its social-preview tag — `og:image`, falling back to `og:image:secure_url` →
`twitter:image` → `link[rel=image_src]` (priority order, not document order).

| Guard | Value |
|---|---|
| Requests per article | one GET, 3 redirects max |
| Read cap | 300 KB — the tags live in `<head>`, so the page is not downloaded in full |
| Timeout | 12 s |
| Parallelism | 4 |

- Outcomes are cached on the row: `image_url` is set when found, and `image_checked_at` is stamped
  **either way**, so a dead link is never retried in a loop. Clear `image_checked_at` to retry.
- Runs at the end of every full fetch (`BACKFILL_AFTER_FETCH = 30` articles) and on a
  `*/10 * * * *` cron (`BACKFILL_PER_TICK = 12`), so a backlog drains gradually.
- Publishers that reject non-browser clients (403) or only render images via JavaScript are skipped;
  those cards fall back to a branded monogram tile in the UI.

Measured hit rate on a sample of 12 previously image-less articles: **9 recovered** — BBC,
TechCrunch, The Guardian and PR Newswire all yielded real images; 3 were skipped (403 or no tag).

## Article text (full articles)

Feeds only carry a headline and a one-line summary. For every article whose body has never been
attempted, `src/pipeline/contentEnricher.js` fetches the article page and runs it through
`src/pipeline/extractArticle.js` — a small readability pass that drops scripts / nav / ads / footers,
prefers the page's own `<article>` / `<main>` container, keeps the paragraphs that read like prose,
decodes entities, and caps the result.

| Guard | Value |
|---|---|
| Requests per article | one GET, 3 redirects max |
| Read cap | 900 KB |
| Timeout | 15 s |
| Parallelism | 2 |
| Minimum body | 400 chars — anything shorter is treated as a paywall / JS-only shell |
| First-time wait | `GET /api/articles/:id` holds the request up to 9 s while extracting |

- Stored in `articles.content` as plain-text paragraphs separated by a blank line;
  `content_checked_at` is stamped **either way**, so a paywalled or dead link is never retried in a
  loop. Clear `content_checked_at` to retry.
- Runs at the end of every full fetch (`CONTENT_AFTER_FETCH = 8` articles) and on the same
  `*/10 * * * *` cron as the image backfill (`CONTENT_PER_TICK = 6`) — a backlog drains gradually.
- The reader also triggers it: opening an article whose text was never attempted starts the
  extraction immediately. If it is still running when the request times out the response sets
  `pending: true`, the job finishes in the background, and the client asks again.
- Measured on the first 25 articles: **23 bodies stored** (BBC, Guardian, TechCrunch, Hacker News
  links); the 2 misses were pages with no server-rendered body.

## API

- `GET /api/articles?category=&source=&page=1&pageSize=25` — paginated articles, newest first (pageSize max 100). The list payload stays lean: it carries `has_content` instead of every article's full text.
- `GET /api/articles/:id` — one article including `content` (the extracted full text). `pending: true` means the body is still being fetched; ask again shortly.
- `GET /api/sources` — configured sources with last-fetch status
- `GET /api/categories` — category counts

## Data

SQLite DB at `data/news.db` (WAL mode). Tables:

- `articles` — one row per unique article (deduped by normalized URL hash + title hash), including the
  extracted `content` and the `content_checked_at` attempt stamp
- `fetch_log` — per-fetch outcome per source (status, counts, errors)

## Frontend integration

Vite dev server runs on :5173, API on :8787 — add a proxy in `vite.config.js` or call `http://localhost:8787/api/...` directly.
