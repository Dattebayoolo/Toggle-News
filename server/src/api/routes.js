import { Router } from 'express';
import { getArticles, getSourcesStatus, db } from '../db/sqlite.js';
import { loadSources } from '../sources.js';

export const api = Router();

api.get('/articles', (req, res) => {
  const { category, source, page, pageSize } = req.query;
  res.json(getArticles({ category, source, page, pageSize }));
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
