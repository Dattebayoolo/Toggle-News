import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data'); // server/data
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'news.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  publisher TEXT,
  url TEXT NOT NULL UNIQUE,
  url_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_hash TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  image_url TEXT,
  category TEXT,
  published_at TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles (source_id);

CREATE TABLE IF NOT EXISTS fetch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  items_fetched INTEGER NOT NULL DEFAULT 0,
  items_new INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

/** Add a column when a newer release introduced it (no-op on fresh databases). */
function ensureColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (exists) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

// Migrate databases created before articles carried the originating publisher.
// This must run before the statements below are prepared — SQLite validates
// column names against the live schema at prepare time.
ensureColumn('articles', 'publisher', 'TEXT');
// Set once an image backfill has been attempted, so dead links are not retried forever.
ensureColumn('articles', 'image_checked_at', 'TEXT');
// Full article text (paragraphs separated by a blank line) extracted from the
// publisher page, plus the stamp that records an extraction attempt either way.
ensureColumn('articles', 'content', 'TEXT');
ensureColumn('articles', 'content_checked_at', 'TEXT');

// Speed up the "articles still missing an image" backfill query.
db.exec('CREATE INDEX IF NOT EXISTS idx_articles_image_missing ON articles (id) WHERE image_url IS NULL;');

// Speed up the "articles still missing full text" backfill query.
db.exec('CREATE INDEX IF NOT EXISTS idx_articles_content_missing ON articles (id) WHERE content IS NULL;');

const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles
    (source_id, publisher, url, url_hash, title, title_hash, author, summary, image_url, category, published_at)
  VALUES
    (@sourceId, @publisher, @url, @urlHash, @title, @titleHash, @author, @summary, @imageUrl, @category, @publishedAt)
`);

const insertLog = db.prepare(`
  INSERT INTO fetch_log (source_id, status, items_fetched, items_new, message)
  VALUES (@sourceId, @status, @itemsFetched, @itemsNew, @message)
`);

const selectNeedingImages = db.prepare(`
  SELECT id, url, publisher FROM articles
  WHERE image_url IS NULL AND image_checked_at IS NULL
  ORDER BY id DESC
  LIMIT @limit
`);

const updateArticleImage = db.prepare(`
  UPDATE articles
  SET image_url = @imageUrl, image_checked_at = datetime('now'), updated_at = datetime('now')
  WHERE id = @id
`);

const countMissingImages = db.prepare(
  'SELECT COUNT(1) AS c FROM articles WHERE image_url IS NULL AND image_checked_at IS NULL'
);

const selectNeedingContent = db.prepare(`
  SELECT id, url, publisher FROM articles
  WHERE content IS NULL AND content_checked_at IS NULL
  ORDER BY id DESC
  LIMIT @limit
`);

const updateArticleContent = db.prepare(`
  UPDATE articles
  SET content = @content, content_checked_at = datetime('now'), updated_at = datetime('now')
  WHERE id = @id
`);

const countMissingContent = db.prepare(
  'SELECT COUNT(1) AS c FROM articles WHERE content IS NULL AND content_checked_at IS NULL'
);

const selectArticleById = db.prepare('SELECT * FROM articles WHERE id = @id');

/** Articles whose image has never been attempted, newest first. */
export function getArticlesNeedingImages({ limit = 20 } = {}) {
  return selectNeedingImages.all({ limit });
}

/**
 * Record an image-backfill result. `imageUrl` may be null when the page carried
 * no social-preview image — `image_checked_at` is still set so a dead or
 * image-less link is not retried on every pass.
 */
export function setArticleImage(id, imageUrl) {
  return updateArticleImage.run({ id, imageUrl: imageUrl || null }).changes;
}

export function countArticlesMissingImages() {
  return countMissingImages.get().c;
}

/** Articles whose full text has never been attempted, newest first. */
export function getArticlesNeedingContent({ limit = 8 } = {}) {
  return selectNeedingContent.all({ limit });
}

/**
 * Record a full-text extraction result. `content` may be null when the page
 * carried no usable article body — `content_checked_at` is still set so a
 * paywalled or dead link is not retried on every pass.
 */
export function setArticleContent(id, content) {
  return updateArticleContent.run({ id, content: content || null }).changes;
}

export function countArticlesMissingContent() {
  return countMissingContent.get().c;
}

/** One article with every column, including the extracted full text. */
export function getArticleById(id) {
  return selectArticleById.get({ id }) || null;
}

export function saveArticles(rows) {
  let inserted = 0;
  db.exec('BEGIN');
  try {
    for (const item of rows) {
      inserted += insertArticle.run(item).changes;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return inserted;
}

export function logFetch(entry) {
  insertLog.run(entry);
}

export function getArticles({ category, source, page = 1, pageSize = 25 }) {
  const where = [];
  const params = {};
  if (category) { where.push('category = @category'); params.category = category; }
  if (source) { where.push('source_id = @source'); params.source = source; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 100);
  const offset = (pageNum - 1) * limit;
  const rows = db.prepare(`
    SELECT id, source_id, publisher, url, url_hash, title, author, summary, image_url, category,
           published_at, first_seen_at, updated_at, (content IS NOT NULL) AS has_content
    FROM articles ${whereSql}
    ORDER BY COALESCE(published_at, first_seen_at) DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM articles ${whereSql}`).get(params).c;
  return { items: rows, total, page: pageNum, pageSize: limit };
}

export function getSourcesStatus() {
  return db.prepare(`
    SELECT a.source_id, MAX(a.first_seen_at) AS latest_article,
           (SELECT status FROM fetch_log f WHERE f.source_id = a.source_id ORDER BY f.id DESC LIMIT 1) AS last_status,
           (SELECT logged_at FROM fetch_log f WHERE f.source_id = a.source_id ORDER BY f.id DESC LIMIT 1) AS last_fetch_at,
           COUNT(*) AS article_count
    FROM articles a GROUP BY a.source_id
  `).all();
}
