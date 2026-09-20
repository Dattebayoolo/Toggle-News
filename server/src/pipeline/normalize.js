import crypto from 'node:crypto';

/** Normalize a URL: lowercase host, strip tracking params, default ports. */
export function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.protocol = 'https:';
    u.hash = '';
    const drop = [];
    for (const key of u.searchParams.keys()) {
      if (/^(utm_|fbclid|gclid|ref|referrer|mc_cid|mc_eid|at_medium|at_campaign|at_creation)/i.test(key)) drop.push(key);
    }
    drop.forEach((k) => u.searchParams.delete(k));
    if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) {
      u.port = '';
    }
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

/** Normalize a title for dedup: lowercase, strip punctuation, collapse whitespace. */
export function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

/** Strip HTML tags and collapse whitespace. */
export function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coerce a date to ISO-8601 or null. */
export function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Map an RSS item + source config to a DB-ready row. */
export function toArticleRow(source, item) {
  const url = normalizeUrl(item.link || '');
  if (!url || !item.title) return null;
  const title = stripHtml(item.title);
  const summary = stripHtml(item.contentSnippet || item.content || item.summary || '').slice(0, 1000);
  const imageUrl =
    item.enclosure?.url ||
    item['media:content']?.$?.url ||
    item['media:thumbnail']?.$?.url ||
    null;
  return {
    sourceId: source.id,
    url,
    urlHash: sha1(url),
    title,
    titleHash: sha1(normalizeTitle(title)),
    author: item.creator || item['dc:creator'] || null,
    summary: summary || null,
    imageUrl,
    category: source.category || null,
    publishedAt: toIsoDate(item.isoDate || item.pubDate),
  };
}
