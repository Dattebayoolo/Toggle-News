import { Router } from 'express';
import { getArticles, getArticleById, getSourcesStatus, db } from '../db/sqlite.js';
import { loadSources } from '../sources.js';
import { ensureArticleContent } from '../pipeline/contentEnricher.js';

export const api = Router();

// How long an article request waits for a first-time full-text extraction before
// answering without it. The extraction keeps running in the background, so the
// next request finds the text already stored.
const CONTENT_WAIT_MS = 9000;

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

api.get('/articles', (req, res) => {
  const { category, source, page, pageSize } = req.query;
  res.json(getArticles({ category, source, page, pageSize }));
});

/**
 * One article, including its extracted full text. `pending: true` means the
 * body is being fetched right now (or not fetched yet) — the client should ask
 * again shortly. Rows whose extraction was already attempted return
 * `pending: false` and `content: null` rather than retrying a dead link.
 */
api.get('/articles/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const row = getArticleById(id);
  if (!row) return res.status(404).json({ error: 'not_found' });

  let content = row.content || null;
  let pending = false;

  if (!content && !row.content_checked_at) {
    const result = await withTimeout(ensureArticleContent({ id: row.id, url: row.url }), CONTENT_WAIT_MS);
    content = result?.text || null;
    pending = !content;
  }

  res.json({
    id: row.id,
    url: row.url,
    title: row.title,
    publisher: row.publisher,
    author: row.author,
    summary: row.summary,
    image_url: row.image_url,
    category: row.category,
    published_at: row.published_at,
    content,
    has_content: Boolean(content),
    pending
  });
});

api.get('/sources', (req, res) => {
  const configured = loadSources();
  const status = getSourcesStatus();
  const byId = Object.fromEntries(status.map((s) => [s.source_id, s]));
  res.json(
    configured.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      category: s.category,
      intervalMinutes: s.intervalMinutes,
      ...(byId[s.id]
        ? { latestArticle: byId[s.id].latest_article, lastStatus: byId[s.id].last_status, lastFetchAt: byId[s.id].last_fetch_at, articleCount: byId[s.id].article_count }
        : { latestArticle: null, lastStatus: 'never', lastFetchAt: null, articleCount: 0 }),
    }))
  );
});

api.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT category, COUNT(*) AS count FROM articles WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC').all();
  res.json(rows);
});
