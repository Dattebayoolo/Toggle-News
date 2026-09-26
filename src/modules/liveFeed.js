// Live Wire — real articles served by the Toggle News API (/api/articles).
//
// Everything rendered here comes straight from the server (newsapi.org + RSS
// sources). Nothing is synthesized: an article is only given a Left/Center/Right
// rating when its publisher exists in the bias database (../data/sourcesData.js)
// or when its feeding wire has a known lean. Otherwise it is labelled "Unrated"
// rather than guessed.
//
// The analysis layer that used to sit beside this — multi-perspective framing,
// blindspot classification, timelines — has been removed along with its
// fabricated dataset. Those views now render explicit empty states explaining
// why a wire API cannot produce that content.

import { SOURCES } from '../data/sourcesData.js';
import { store } from './state.js';
import {
  findRelatedCoverage,
  summarizeCoverageStories,
  coveragePercents,
  dominantLean,
  describeCoverageGaps,
  summarizeReadingDiet
} from './storyCoverage.js';
import { splitQuotedSpans, extractQuoteCard } from './articleText.js';
import { biasBucketForScore } from './ratingSystem.js';

export const LIVE_ENDPOINT = '/api/articles';
const DEFAULT_PAGE_SIZE = 100;

// An article published inside this window is badged "NEW".
const FRESH_WINDOW_MS = 90 * 60 * 1000;

// Lean filter for the wire list: 'all' | 'left' | 'center' | 'right' | 'unrated'
let leanFilter = 'all';

export const LEAN_FILTERS = ['all', 'left', 'center', 'right', 'unrated'];

export const LEAN_CHIP_LABELS = {
  all: 'All',
  left: 'Left',
  center: 'Center',
  right: 'Right',
  unrated: 'Unrated'
};

export function setLeanFilter(next) {
  leanFilter = LEAN_FILTERS.includes(next) ? next : 'all';
  return leanFilter;
}

export function getLeanFilter() {
  return leanFilter;
}

/** Narrow stories to one lean bucket; 'unrated' = publishers we hold no rating for. */
export function filterByLean(stories, filter = leanFilter) {
  if (filter === 'all') return stories;
  if (filter === 'unrated') return stories.filter((s) => !s.rating?.hasLean);
  return stories.filter((s) => s.rating?.hasLean && s.rating.bucket === filter);
}

// Lean of each configured wire (server/src/sources.json). Used only when a
// publisher is not present in the bias database.
const FEED_LEAN = {
  'bbc-top': 'center',
  'bbc-tech': 'center',
  'guardian-world': 'left',
  'techcrunch': 'center',
  'hn-front': 'center'
};

// Display names for the configured wires, used when an article carries no
// publisher of its own (rows stored before the publisher column existed).
const FEED_LABELS = {
  'bbc-top': 'BBC News',
  'bbc-tech': 'BBC News',
  'guardian-world': 'The Guardian',
  'techcrunch': 'TechCrunch',
  'hn-front': 'Hacker News',
  'newsapi-us-top': 'NewsAPI US Top Headlines',
  'newsapi-tech': 'NewsAPI Technology',
  'gdelt-world': 'GDELT',
  'gdelt-technology': 'GDELT',
  'gdelt-climate': 'GDELT'
};

// Server category values -> the header tab labels in index.html
const CATEGORY_LABELS = {
  world: 'World',
  general: 'World',
  politics: 'Politics',
  economy: 'Economy',
  business: 'Economy',
  technology: 'Technology',
  tech: 'Technology',
  science: 'Science',
  health: 'Health',
  entertainment: 'Entertainment',
  sports: 'Sports',
  climate: 'Climate & Energy'
};

export const BIAS_LABELS = { left: 'Left', center: 'Center', right: 'Right' };

/**
 * Compact an outlet name for matching.
 *
 * Wires report the same publisher many ways — "Fox News", "foxnews.com",
 * "The Washington Post", "washingtonpost.com". Normalising to bare alphanumerics
 * (and dropping a leading "The") makes those all collapse to one key.
 */
export function normalizeOutletName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|co|uk|us|news|io|tv|fm|info|biz|media)$/, '')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^the/, '')
    .trim();
}

/** Exact name match, then declared aliases, then a guarded prefix match. */
export function findSourceBias(publisher) {
  const needle = normalizeOutletName(publisher);
  if (!needle) return null;

  const exact = SOURCES.find((s) => normalizeOutletName(s.name) === needle);
  if (exact) return exact;

  const aliased = SOURCES.find((s) => (s.aliases || []).some((a) => normalizeOutletName(a) === needle));
  if (aliased) return aliased;

  // Prefix matching is conservative (min 5 chars) so short names like "IGN"
  // cannot latch onto an unrelated outlet.
  if (needle.length < 5) return null;
  return (
    SOURCES.find((s) => {
      const known = normalizeOutletName(s.name);
      return known.length >= 5 && (known.startsWith(needle) || needle.startsWith(known));
    }) || null
  );
}

/**
 * Left / center / right bucket for a bias score.
 * The scale itself lives in ./ratingSystem.js — this keeps one source of truth.
 */
export function biasBucketFor(biasScore) {
  return biasBucketForScore(biasScore) ?? 'center';
}

/** Server category -> display label used by the header tabs. */
export function mapServerCategory(raw) {
  const key = String(raw || '').toLowerCase().trim();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  if (!key) return 'World';
  return key.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** ISO timestamp -> "28 mins ago" (matches the curated rows' wording). */
export function relativeTime(value, now = Date.now()) {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return 'Recently';
  const mins = Math.floor(Math.max(now - ts, 0) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins === 1 ? '1 min ago' : `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Display label for a configured feed. */
export function feedLabel(sourceId) {
  return FEED_LABELS[sourceId] || sourceId || '';
}

/**
 * Publisher for an article.
 *
 * The stored column always wins. Failing that, only the newsapi.org feeds get
 * the trailing " - Publisher" suffix treatment, since they append it reliably —
 * RSS headlines contain dashes naturally ("… - as it happened"), so those fall
 * back to the feed label instead of extracting nonsense.
 */
export function extractPublisher(article = {}) {
  if (article.publisher) return String(article.publisher).trim();
  if (!String(article.source_id || '').startsWith('newsapi')) return '';
  const match = String(article.title || '').match(/\s[-–—|]\s([^\-–—|]{2,60})$/);
  return match ? match[1].trim() : '';
}

/**
 * Bias rating for an article.
 * hasLean=false means no rating could be established — render it as Unrated.
 */
export function resolveBias(article = {}) {
  const publisher = extractPublisher(article) || feedLabel(article.source_id);
  const known = findSourceBias(publisher);

  if (known) {
    return {
      publisher: known.name,
      outletId: known.id,
      hasLean: true,
      rated: true,
      bias: known.bias,
      bucket: biasBucketFor(known.biasScore),
      factuality: known.factuality,
      logoText: known.logoText,
      color: known.color
    };
  }

  const bucket = FEED_LEAN[article.source_id] || null;
  if (bucket) {
    return {
      publisher: publisher || article.source_id,
      outletId: null,
      hasLean: true,
      rated: false,
      bias: BIAS_LABELS[bucket],
      bucket,
      factuality: null,
      logoText: (publisher || article.source_id).slice(0, 3).toUpperCase(),
      color: '#6366f1'
    };
  }

  return {
    publisher: publisher || 'Unknown outlet',
    outletId: null,
    hasLean: false,
    rated: false,
    bias: 'Unrated',
    bucket: 'center',
    factuality: null,
    logoText: (publisher || '???').slice(0, 3).toUpperCase(),
    color: '#6366f1'
  };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Adapt one API article into the story shape the UI components understand.
 * Returns null for unusable rows (no stable URL, no title).
 */
export function articleToStory(article, now = Date.now()) {
  if (!article || !article.url || !article.title) return null;

  const rating = resolveBias(article);
  const publishedAt = article.published_at || article.first_seen_at || null;
  const summary = article.summary || '';
  const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;

  const biasDistribution = rating.hasLean
    ? {
        left: rating.bucket === 'left' ? 100 : 0,
        center: rating.bucket === 'center' ? 100 : 0,
        right: rating.bucket === 'right' ? 100 : 0
      }
    : { left: 33, center: 34, right: 33 };

  return {
    id: `live-${article.url_hash || article.id}`,
    // Numeric row id, used to fetch the extracted full text on demand.
    articleId: Number.isInteger(article.id) ? article.id : null,
    hasContent: Boolean(article.has_content) || Boolean(typeof article.content === 'string' && article.content.trim()),
    isLive: true,
    title: article.title,
    category: mapServerCategory(article.category),
    serverCategory: article.category || null,
    timestamp: relativeTime(publishedAt, now),
    date: publishedAt,
    // Drives the "NEW" badge; computed here so it is deterministic per load.
    isFresh: (() => {
      const parsed = Date.parse(publishedAt || '');
      return Number.isFinite(parsed) && now - parsed < FRESH_WINDOW_MS;
    })(),
    heroImage: article.image_url || '',
    readTime: `${Math.max(1, Math.ceil(words / 200))} min read`,
    neutralSummary: summary || article.title,
    author: article.author || null,
    articleUrl: article.url,
    feedId: article.source_id,
    rating,
    publisher: rating.publisher,
    sourceCount: 1,
    isBlindspot: false,
    blindspotType: null,
    biasDistribution,
    sources: [
      {
        id: rating.outletId || article.source_id,
        headline: article.title,
        bias: rating.bias,
        factuality: rating.factuality || 'Unrated',
        quote: summary,
        url: article.url
      }
    ],
    // A single wire story carries only its own publisher's perspective. There is no
    // curated Left/Right framing layer any more, so no other perspective is claimed.
    perspectives: rating.rated
      ? {
          [rating.bucket]: {
            headline: article.title,
            framing: summary,
            featuredSource: rating.publisher,
            featuredSourceId: rating.outletId,
            keyTakeaways: []
          }
        }
      : {}
  };
}

/** Apply the active category tab and search box to live articles. */
export function filterLiveStories(stories, { category = 'All', query = '' } = {}) {
  let list = Array.isArray(stories) ? [...stories] : [];

  if (category && category !== 'All') {
    const needle = category.toLowerCase();
    list = list.filter((s) => s.category.toLowerCase() === needle);
  }

  const term = String(query || '').trim().toLowerCase();
  if (term) {
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        (s.neutralSummary || '').toLowerCase().includes(term) ||
        (s.publisher || '').toLowerCase().includes(term)
    );
  }

  return list;
}

/** Coverage mix across live articles (newest-first order preserved). */
export function summarizeCoverage(stories) {
  const counts = { left: 0, center: 0, right: 0, unrated: 0 };
  for (const s of stories || []) {
    if (!s.rating?.hasLean) counts.unrated += 1;
    else counts[s.rating.bucket] += 1;
  }
  return counts;
}

// ── Loader state ─────────────────────────────────────────────────────────────

let feedState = { status: 'idle', stories: [], error: null, updatedAt: null, total: 0 };
const listeners = new Set();

export function getLiveState() {
  return { ...feedState };
}

export function getLiveStories() {
  return feedState.stories;
}

export function findLiveStory(id) {
  return feedState.stories.find((s) => s.id === id) || null;
}

export function subscribeLiveFeed(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener(getLiveState());
}

const RETRY_DELAYS_MS = [5000, 10000, 20000];

let inFlight = null;
let retryTimer = null;
let retryAttempt = 0;

function cancelRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

/**
 * The API runs as a separate process. If it is not up yet, retry a bounded
 * number of times so the rail connects on its own once the backend starts.
 */
function scheduleRetry() {
  if (retryTimer || retryAttempt >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[retryAttempt];
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    refreshLiveFeed();
  }, delay);
  // Don't hold the Node process open (browser timers return a number).
  if (typeof retryTimer?.unref === 'function') retryTimer.unref();
}

async function doRefresh({ pageSize, fetchImpl, now, autoRetry }) {
  if (!fetchImpl) {
    feedState = { ...feedState, status: 'error', error: 'Fetch API unavailable in this environment.' };
    emit();
    return getLiveState();
  }

  feedState = { ...feedState, status: 'loading', error: null };
  emit();

  try {
    const res = await fetchImpl(`${LIVE_ENDPOINT}?pageSize=${pageSize}`, {
      headers: { Accept: 'application/json' }
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      throw new Error(
        payload?.message || `API responded ${res.status} ${res.statusText || ''}`.trim()
      );
    }
    const stories = (payload.items || []).map((a) => articleToStory(a, now)).filter(Boolean);
    feedState = {
      status: 'ready',
      stories,
      error: null,
      updatedAt: new Date(now).toISOString(),
      total: typeof payload.total === 'number' ? payload.total : stories.length
    };
    cancelRetry();
  } catch (err) {
    feedState = { ...feedState, status: 'error', error: String(err?.message || err) };
    if (autoRetry) scheduleRetry();
  }

  emit();
  return getLiveState();
}

/**
 * Pull the newest articles from the API and adapt them. Never throws — failures
 * land in `getLiveState().error` so the feed degrades gracefully. Concurrent
 * callers share a single in-flight request, so a down API cannot cause a storm.
 */
export function refreshLiveFeed(options = {}) {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    fetchImpl = typeof fetch === 'function' ? fetch : null,
    now = Date.now(),
    autoRetry = true
  } = options;

  if (inFlight) return inFlight;
  inFlight = doRefresh({ pageSize, fetchImpl, now, autoRetry }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// ── Full article text ────────────────────────────────────────────────────────
//
// The feed API ships headlines and summaries only. The article body is fetched
// on demand when a reader opens a story — the server extracts it from the
// publisher page — and cached here for the session.

const ARTICLE_RETRY_MS = 5000;
const ARTICLE_MAX_POLLS = 3; // initial request + retries while the server extracts

const articleContent = new Map(); // story id -> { status, paragraphs?, error? }

export function getArticleContent(storyId) {
  return articleContent.get(storyId) || null;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function splitParagraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

async function fetchArticleContent(story, fetchImpl) {
  try {
    const res = await fetchImpl(`/api/articles/${story.articleId}`);
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const payload = await res.json();
    const text = typeof payload?.content === 'string' ? payload.content.trim() : '';
    if (text) {
      const paragraphs = splitParagraphs(text);
      return {
        status: 'ready',
        paragraphs,
        wordCount: paragraphs.join(' ').split(/\s+/).filter(Boolean).length
      };
    }
    // No text yet: the server may still be extracting it right now.
    if (payload?.pending) return { status: 'loading' };
    return { status: 'empty' };
  } catch (err) {
    return { status: 'error', error: String(err?.message || err) };
  }
}

/**
 * Load the full text for an article the reader has opened.
 *
 * Resolves with the cached record. While the server reports the extraction as
 * pending the request is retried a couple of times, then the record is parked
 * as `pending` so the page can explain itself instead of spinning forever.
 */
export function loadArticleContent(story, options = {}) {
  const { fetchImpl = typeof fetch === 'function' ? fetch : null, retryMs = ARTICLE_RETRY_MS } = options;
  if (!story?.id || !story.articleId || !fetchImpl) return Promise.resolve(null);

  const existing = articleContent.get(story.id);
  if (existing) return existing.promise || Promise.resolve(existing);

  const record = { status: 'loading' };
  record.promise = (async () => {
    let result = { status: 'empty' };
    for (let attempt = 1; attempt <= ARTICLE_MAX_POLLS; attempt += 1) {
      result = await fetchArticleContent(story, fetchImpl);
      if (result.status !== 'loading') break;
      if (attempt < ARTICLE_MAX_POLLS) await delay(retryMs);
    }
    const final = result.status === 'loading' ? { status: 'pending' } : result;
    articleContent.set(story.id, final);
    return final;
  })();

  articleContent.set(story.id, record);
  return record.promise;
}

/** Placeholder lines shown while the article body is being fetched. */
function renderArticleTextSkeleton() {
  return `
    <div class="gn-article-fulltext-skeleton" aria-hidden="true">
      <span></span><span></span><span></span><span></span><span class="short"></span>
    </div>`;
}

/** Emphasis for quotes that sit inside an otherwise ordinary paragraph. */
function renderInlineQuotes(text) {
  return splitQuotedSpans(text)
    .map((span) => (span.quoted
      ? `<span class="gn-article-inline-quote">${escapeHtml(span.text)}</span>`
      : escapeHtml(span.text)))
    .join('');
}

/**
 * One body paragraph: a quote-dominant paragraph becomes a pull-quote card with
 * its attribution, everything else stays a paragraph with its quotes marked.
 */
function renderArticleParagraph(text) {
  const card = extractQuoteCard(text);
  if (card) {
    return `
      <blockquote class="gn-article-quote">
        <span class="gn-article-quote-mark" aria-hidden="true">&ldquo;</span>
        <p class="gn-article-quote-text">${escapeHtml(card.quote)}</p>
        ${card.attribution ? `<cite class="gn-article-quote-cite">${escapeHtml(card.attribution)}</cite>` : ''}
      </blockquote>`;
  }
  return `<p>${renderInlineQuotes(text)}</p>`;
}

/**
 * The body of the article. `record` comes from the content cache — a pure
 * renderer so every state (loading, ready, unavailable) can be tested.
 */
export function renderArticleFullText(story, record) {
  const publisher = escapeHtml(story?.rating?.publisher || 'the publisher');

  if (!record) {
    return story?.hasContent ? renderArticleTextSkeleton() : '';
  }

  switch (record.status) {
    case 'loading':
      return renderArticleTextSkeleton();

    case 'ready':
      return `
    <section class="gn-article-fulltext" aria-label="Full article">
      ${record.paragraphs.map((paragraph) => renderArticleParagraph(paragraph)).join('\n      ')}
    </section>`;

    case 'pending':
      return `
    <p class="gn-article-fulltext-note">
      The full article is still being fetched from ${publisher}. Open this story again in a
      moment to read it here.
    </p>`;

    case 'error':
      return `
    <p class="gn-article-fulltext-note">
      The full text could not be loaded (${escapeHtml(record.error || 'network error')}).
      Try opening this story again later.
    </p>`;

    case 'empty':
    default:
      return `
    <p class="gn-article-fulltext-note">
      ${publisher} does not expose the article body to readers, so only the summary above is
      shown here.
    </p>`;
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

/**
 * Bias badge for a single publisher. Exported so the briefing cards can reuse it.
 */
export function renderBiasTag(rating) {
  if (!rating.hasLean) {
    return '<span class="bias-indicator-tag unrated" title="This publisher is not in the Toggle News bias database">Unrated outlet</span>';
  }
  const label = rating.rated ? rating.bias : `${rating.bias} wire`;
  return `<span class="bias-indicator-tag ${rating.bucket}" title="Bias rating: ${escapeHtml(rating.bias)}">${escapeHtml(label)}</span>`;
}

/**
 * Monogram tile shown when an article has no image. Branded in the outlet's own
 * colour when we hold a rating for it, neutral otherwise.
 */
export function renderOutletMonogram(rating, className) {
  const text = rating.logoText || String(rating.publisher || '??').slice(0, 3).toUpperCase();
  const branded = rating.rated ? ' is-branded' : '';
  const style = rating.rated ? ` style="background:${escapeHtml(rating.color)}"` : '';
  return `<span class="${className}${branded}"${style} aria-hidden="true">${escapeHtml(text)}</span>`;
}

const COVERAGE_LABELS = { left: 'Left', center: 'Center', right: 'Right' };

/** How many outlets this story stacks, phrased as Ground News phrases it. */
function sourceCountLabel(story) {
  const count = Math.max(1, Number(story.sourceCount) || 1);
  return `${count} source${count === 1 ? '' : 's'}`;
}

/**
 * Ground News-style labelled coverage bar: one segment per lean with the
 * L / Center / R percentages written inside. A publisher we hold no rating for
 * gets a single neutral "Unrated" segment instead of a fake three-way split.
 */
export function renderCoverageBar(story) {
  const { rating } = story || {};

  if (!rating?.hasLean) {
    return `<span class="gn-bias-strip mini labeled" role="img" aria-label="No lean rating for this publisher">
      <span class="gn-seg gn-seg-unrated" style="width:100%"><span>Unrated</span></span>
    </span>`;
  }

  const { left, center, right } = coveragePercents(story.biasDistribution);
  return `<span class="gn-bias-strip mini labeled" role="img" aria-label="Left ${left}%, Center ${center}%, Right ${right}%">
      <span class="gn-seg gn-seg-left" style="width:${left}%"><span>L ${left}%</span></span>
      <span class="gn-seg gn-seg-center" style="width:${center}%"><span>Center ${center}%</span></span>
      <span class="gn-seg gn-seg-right" style="width:${right}%"><span>R ${right}%</span></span>
    </span>`;
}

/** The "43% Center coverage: 2 sources" line that sits under the bar. */
export function renderCoverageLine(story) {
  const { rating } = story || {};
  const sources = sourceCountLabel(story);

  if (!rating?.hasLean) {
    return `<span class="gn-cov-line">No lean rating &middot; ${sources}</span>`;
  }

  const percents = coveragePercents(story.biasDistribution);
  const dominant = ['left', 'center', 'right'].reduce(
    (best, key) => (percents[key] > percents[best] ? key : best),
    'center'
  );

  return `<span class="gn-cov-line">
      <strong class="gn-cov-pct ${dominant}">${percents[dominant]}% ${COVERAGE_LABELS[dominant]}</strong>
      coverage: ${sources}
    </span>`;
}

/**
 * Bar + source-count line + the ⓘ affordance, bundled as the block that closes
 * every card — the signature element of a groundnews.com story card.
 */
export function renderCoverageBlock(story) {
  const { rating } = story || {};
  const tip = rating?.hasLean
    ? `Coverage mix across the ${sourceCountLabel(story)} rated for this story.`
    : 'This publisher is not in the Toggle News bias database, so no lean is claimed.';

  return `
    <div class="gn-cov-block">
      ${renderCoverageBar(story)}
      <div class="gn-cov-meta">
        ${renderCoverageLine(story)}
        <span class="gn-cov-info" title="${escapeHtml(tip)}" aria-label="Coverage information">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5"></circle>
            <line x1="12" y1="11" x2="12" y2="16.5"></line>
            <line x1="12" y1="7.5" x2="12.01" y2="7.5"></line>
          </svg>
        </span>
      </div>
    </div>`;
}

/**
 * One wire article card, laid out like a groundnews.com story card: category
 * meta on top, headline + standfirst on the left with the outlet thumbnail on
 * the right, then the labelled coverage bar, source line and actions underneath.
 */
export function renderLiveWireRow(story, options = {}) {
  const isBookmarked = 'isBookmarked' in options
    ? options.isBookmarked
    : store.getState().bookmarks.includes(story.id);
  const { rating } = story;
  const showSnippet = Boolean(story.neutralSummary) && story.neutralSummary !== story.title;

  return `
    <article class="gn-story-row gn-live-row" data-story-id="${story.id}">
      <div class="gn-row-inner gn-live-inner" data-action="open-modal" data-story-id="${story.id}">
        <div class="gn-row-content gn-live-body">
          ${renderStoryMeta(story)}

          <div class="gn-live-main">
            <div class="gn-live-text">
              <h2 class="gn-live-headline">${escapeHtml(story.title)}</h2>
              ${showSnippet ? `<p class="gn-live-snippet">${escapeHtml(story.neutralSummary)}</p>` : ''}
            </div>

            <div class="gn-live-thumb">
              ${story.heroImage
                ? `<img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" decoding="async"
                        onerror="this.style.display='none';var m=this.nextElementSibling;if(m)m.style.display='flex';" />
                   ${renderOutletMonogram(rating, 'gn-live-monogram')}`
                : renderOutletMonogram(rating, 'gn-live-monogram')}
            </div>
          </div>

          <div class="gn-live-footer">
            ${renderCoverageBlock(story)}

            <div class="gn-live-tags">
              ${renderBiasTag(rating)}
              ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)}</span>` : ''}
              <span class="gn-live-feed">${escapeHtml(story.feedId)}</span>
            </div>

            <div class="gn-live-actions">
              <a class="gn-live-outbound" href="${escapeHtml(story.articleUrl)}" target="_blank" rel="noopener noreferrer"
                 data-action="open-external" title="Read the full article at ${escapeHtml(rating.publisher)}">
                <span>Read</span><span class="gn-live-outbound-arrow">&nearr;</span>
              </a>

              ${renderBookmarkButton(story.id, isBookmarked)}
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

/** Shared bookmark control. */
function renderBookmarkButton(storyId, isBookmarked, extraClass = '') {
  return `<button class="gn-bookmark-btn ${isBookmarked ? 'saved' : ''} ${extraClass}"
                  data-action="toggle-bookmark" data-story-id="${storyId}"
                  title="${isBookmarked ? 'Remove bookmark' : 'Save'}" onclick="event.stopPropagation()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>`;
}

// ── Sectioned wire layout ───────────────────────────────────────────────────
//
// A single flat list of identical cards is hard to scan, so the wire is broken
// into sections that each get their own treatment:
//
//   Lead      one hero card with a large image and its own call to action
//   Just In   the freshest articles, as compact rows under a green header
//   By lean   Left / Center / Right / Unrated as image-top cards in a grid,
//             each section colour-coded, with Unrated deliberately muted

const LEAN_SECTIONS = ['left', 'center', 'right', 'unrated'];

const LEAN_SECTION_LABELS = {
  left: 'From the Left',
  center: 'From the Center',
  right: 'From the Right',
  unrated: 'Unrated outlets'
};

const JUST_IN_MAX = 4;

/** Media block with the shared monogram fallback. */
function renderCardMedia(story, monogramClass) {
  const { rating } = story;
  return story.heroImage
    ? `<img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" decoding="async"
             onerror="this.style.display='none';var m=this.nextElementSibling;if(m)m.style.display='flex';" />
       ${renderOutletMonogram(rating, monogramClass)}`
    : renderOutletMonogram(rating, monogramClass);
}

/** Category / outlet / time line shared by every card size. */
function renderStoryMeta(story) {
  const { rating } = story;
  return `
    <div class="gn-live-meta">
      ${story.isFresh ? '<span class="gn-live-new">New</span>' : ''}
      <span class="gn-cat-tag">${escapeHtml(story.category)}</span>
      <span class="gn-sep">&middot;</span>
      <span class="gn-live-outlet">
        <span class="gn-live-outlet-dot${rating.hasLean ? ` ${rating.bucket}` : ''}"></span>${escapeHtml(rating.publisher)}
      </span>
      <span class="gn-sep">&middot;</span>
      <span class="gn-row-time">${escapeHtml(story.timestamp)}</span>
    </div>`;
}

/** Hero card for the newest article on the wire. */
export function renderLeadCard(story, options = {}) {
  const isBookmarked = 'isBookmarked' in options
    ? options.isBookmarked
    : store.getState().bookmarks.includes(story.id);
  const { rating } = story;
  const showSnippet = Boolean(story.neutralSummary) && story.neutralSummary !== story.title;

  return `
    <article class="gn-wire-lead" data-story-id="${story.id}">
      <div class="gn-wire-lead-inner" data-action="open-modal" data-story-id="${story.id}">
        <div class="gn-wire-lead-media">
          ${renderCardMedia(story, 'gn-live-monogram')}
          <span class="gn-wire-lead-flag">Top Story</span>
        </div>

        <div class="gn-wire-lead-body">
          ${renderStoryMeta(story)}
          <h3 class="gn-wire-lead-headline">${escapeHtml(story.title)}</h3>
          ${showSnippet ? `<p class="gn-wire-lead-snippet">${escapeHtml(story.neutralSummary)}</p>` : ''}

          <div class="gn-live-footer">
            ${renderCoverageBlock(story)}

            <div class="gn-live-tags">
              ${renderBiasTag(rating)}
              ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)}</span>` : ''}
            </div>
          </div>

          <div class="gn-wire-lead-actions">
            <a class="gn-wire-btn" href="${escapeHtml(story.articleUrl)}" target="_blank" rel="noopener noreferrer"
               data-action="open-external">Read at ${escapeHtml(rating.publisher)} &nearr;</a>
            ${renderBookmarkButton(story.id, isBookmarked, 'gn-wire-btn-ghost')}
          </div>
        </div>
      </div>
    </article>`;
}

/** Image-top card used inside the lean sections. */
export function renderSectionCard(story, lean, options = {}) {
  const isBookmarked = 'isBookmarked' in options
    ? options.isBookmarked
    : store.getState().bookmarks.includes(story.id);
  const { rating } = story;
  const showSnippet = Boolean(story.neutralSummary) && story.neutralSummary !== story.title;

  return `
    <article class="gn-wire-card theme-${lean}" data-story-id="${story.id}">
      <div class="gn-wire-card-inner" data-action="open-modal" data-story-id="${story.id}">
        <div class="gn-wire-card-media">${renderCardMedia(story, 'gn-live-monogram')}</div>
        <div class="gn-wire-card-body">
          ${renderStoryMeta(story)}
          <h4 class="gn-wire-card-headline">${escapeHtml(story.title)}</h4>
          ${showSnippet ? `<p class="gn-wire-card-snippet">${escapeHtml(story.neutralSummary)}</p>` : ''}
          ${renderCoverageBlock(story)}
          <div class="gn-wire-card-foot">
            ${renderBiasTag(rating)}
            ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)}</span>` : ''}
            ${renderBookmarkButton(story.id, isBookmarked, 'gn-wire-card-bookmark')}
          </div>
        </div>
      </div>
    </article>`;
}

/**
 * Split the (already filtered) wire into a lead story, a "Just In" strip of the
 * freshest articles, and one group per lean bucket. Pure — easy to test.
 */
export function groupWireStories(stories = []) {
  const [lead = null, ...rest] = stories;
  const justIn = [];
  const remaining = [];

  for (const story of rest) {
    if (story.isFresh && justIn.length < JUST_IN_MAX) justIn.push(story);
    else remaining.push(story);
  }

  const sections = LEAN_SECTIONS
    .map((lean) => ({
      lean,
      label: LEAN_SECTION_LABELS[lean],
      stories: remaining.filter((s) =>
        lean === 'unrated' ? !s.rating?.hasLean : s.rating?.hasLean && s.rating.bucket === lean
      )
    }))
    .filter((section) => section.stories.length);

  return { lead, justIn, sections };
}

/** Render the sectioned wire: hero lead, fresh strip, then one block per lean. */
export function renderWireSections(stories = [], options = {}) {
  const { lead, justIn, sections } = groupWireStories(stories);

  return `
    ${lead ? `
    <section class="gn-wire-block gn-wire-block-lead" aria-label="Top story">
      ${renderLeadCard(lead, options)}
    </section>` : ''}

    ${justIn.length ? `
    <section class="gn-wire-block" aria-label="Just in">
      <div class="gn-wire-head tone-fresh">
        <span class="gn-wire-dot fresh"></span>
        <h3>Just In</h3>
        <span class="gn-wire-count">${justIn.length}</span>
        <span class="gn-wire-head-note">published in the last 90 minutes</span>
      </div>
      <div class="gn-wire-list">
        ${justIn.map((story) => renderLiveWireRow(story, options)).join('')}
      </div>
    </section>` : ''}

    ${sections.map((section) => `
    <section class="gn-wire-block" aria-label="${escapeHtml(section.label)}">
      <div class="gn-wire-head tone-${section.lean}">
        <span class="gn-wire-dot ${section.lean}"></span>
        <h3>${escapeHtml(section.label)}</h3>
        <span class="gn-wire-count">${section.stories.length}</span>
      </div>
      <div class="gn-wire-grid">
        ${section.stories.map((story) => renderSectionCard(story, section.lean, options)).join('')}
      </div>
    </section>`).join('')}
  `;
}

/** Placeholder cards shown while the first page of articles is loading. */
function renderWireSkeletons(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="gn-live-skeleton" aria-hidden="true">
      <div class="gn-live-skeleton-thumb"></div>
      <div class="gn-live-skeleton-lines">
        <span class="gn-live-skeleton-line w40"></span>
        <span class="gn-live-skeleton-line w90"></span>
        <span class="gn-live-skeleton-line w70"></span>
      </div>
    </div>`).join('');
}

/**
 * The article feed: a plain section heading, the lean filter row, and the card
 * list. `stories` should already be filtered by the active category / search.
 */
export function renderLiveWireSection(stories = [], state = {}) {
  const { status = 'idle', error = null } = state;

  // The lean chips narrow the already category/search-filtered list further.
  const activeLean = getLeanFilter();
  const countBy = (predicate) => stories.filter(predicate).length;
  const leanCounts = {
    all: stories.length,
    left: countBy((s) => s.rating?.hasLean && s.rating.bucket === 'left'),
    center: countBy((s) => s.rating?.hasLean && s.rating.bucket === 'center'),
    right: countBy((s) => s.rating?.hasLean && s.rating.bucket === 'right'),
    unrated: countBy((s) => !s.rating?.hasLean)
  };
  const visible = filterByLean(stories, activeLean);
  const shown = visible.length;

  let body;
  if (status === 'error') {
    body = `
      <div class="gn-live-message gn-live-message-error">
        <strong>Could not reach the Toggle News API.</strong>
        <span>${escapeHtml(error || 'Unknown error')}</span>
        <span class="gn-live-hint">
          Start the backend with <code>cd server &amp;&amp; npm start</code> &mdash; it serves
          <code>${escapeHtml(LIVE_ENDPOINT)}</code> through the Vite proxy.
        </span>
        <button class="gn-live-refresh" data-action="refresh-live">Retry</button>
      </div>`;
  } else if (status === 'loading' && !shown) {
    body = renderWireSkeletons(4);
  } else if (!shown) {
    const filteredOut = activeLean !== 'all' && stories.length;
    body = `
      <div class="gn-live-message">
        <strong>No articles match this filter.</strong>
        <span>${filteredOut
          ? `${stories.length} article${stories.length === 1 ? '' : 's'} in this selection ${stories.length === 1 ? 'is' : 'are'} not from ${activeLean === 'unrated' ? 'an unrated' : `a ${activeLean}-leaning`} outlet.`
          : 'Try another category or clear the search box.'}</span>
        ${filteredOut
          ? '<button class="gn-live-refresh" data-action="filter-lean" data-lean="all">Show all leans</button>'
          : ''}
      </div>`;
  } else {
    body = renderWireSections(visible);
  }

  return `
    <section class="gn-live-wire" aria-label="Latest news stories">
      <div class="gn-live-wire-header">
        <h2 class="gn-main-section-heading">Latest News Stories</h2>
      </div>

      ${stories.length ? `
      <div class="gn-live-chips" role="tablist" aria-label="Filter by outlet lean">
        ${LEAN_FILTERS.map((lean) => `
          <button class="gn-live-chip ${lean} ${activeLean === lean ? 'active' : ''}"
                  role="tab" aria-selected="${activeLean === lean}"
                  data-action="filter-lean" data-lean="${lean}">
            <span class="gn-live-chip-dot"></span>${LEAN_CHIP_LABELS[lean]}
            <span class="gn-live-chip-count">${leanCounts[lean]}</span>
          </button>`).join('')}
      </div>` : ''}

      <div class="gn-live-wire-list ${shown ? '' : 'is-message'}">
        ${body}
      </div>
    </section>
  `;
}

/** Up to four other loaded articles a reader can jump to from a story page. */
function pickRelatedStories(story, limit = 4) {
  const others = getLiveStories().filter((s) => s.id !== story.id);
  const ranked = [
    ...others.filter((s) => s.feedId === story.feedId),
    ...others.filter((s) => s.feedId !== story.feedId && s.category === story.category),
    ...others
  ];

  const picked = [];
  const seen = new Set();
  for (const candidate of ranked) {
    if (picked.length >= limit) break;
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    picked.push(candidate);
  }
  return picked;
}

/** Compact related-story row for the article sidebar. */
function renderRelatedRow(story) {
  const { rating } = story;
  return `
    <article class="gn-article-more-item" data-action="open-modal" data-story-id="${story.id}">
      <div class="gn-article-more-thumb">
        ${story.heroImage
          ? `<img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" decoding="async"
                  onerror="this.style.display='none';var m=this.nextElementSibling;if(m)m.style.display='flex';" />
             ${renderOutletMonogram(rating, 'gn-live-monogram')}`
          : renderOutletMonogram(rating, 'gn-live-monogram')}
      </div>
      <div class="gn-article-more-body">
        <h3 class="gn-article-more-title">${escapeHtml(story.title)}</h3>
        <span class="gn-article-more-meta">
          <span class="gn-live-outlet-dot${rating.hasLean ? ` ${rating.bucket}` : ''}"></span>${escapeHtml(rating.publisher)} &middot; ${escapeHtml(story.timestamp)}
        </span>
      </div>
    </article>`;
}

const COVERAGE_LEAN_ORDER = ['left', 'center', 'right', 'unrated'];
const COVERAGE_LEAN_LABELS = { left: 'Left', center: 'Center', right: 'Right', unrated: 'Unrated' };

/**
 * Labelled lean bar for an aggregate coverage summary — the story's own outlet
 * plus every other outlet matched to the same event.
 */
function renderAggregateBar(counts) {
  const pct = coveragePercents(counts);
  const label = `Left ${pct.left}%, Center ${pct.center}%, Right ${pct.right}%${counts.unrated ? `, Unrated ${pct.unrated}%` : ''}`;
  const unratedSeg = counts.unrated
    ? `<span class="gn-seg gn-seg-unrated" style="width:${pct.unrated}%"><span>Unrated ${pct.unrated}%</span></span>`
    : '';

  return `<span class="gn-bias-strip mini labeled" role="img" aria-label="${label}">
      <span class="gn-seg gn-seg-left" style="width:${pct.left}%"><span>L ${pct.left}%</span></span>
      <span class="gn-seg gn-seg-center" style="width:${pct.center}%"><span>Center ${pct.center}%</span></span>
      <span class="gn-seg gn-seg-right" style="width:${pct.right}%"><span>R ${pct.right}%</span></span>
      ${unratedSeg}
    </span>`;
}

const COVERAGE_INFO_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5"></circle>
            <line x1="12" y1="11" x2="12" y2="16.5"></line>
            <line x1="12" y1="7.5" x2="12.01" y2="7.5"></line>
          </svg>`;

/**
 * "Coverage across the wire" — the Ground News idea, computed only from articles
 * actually loaded: every outlet matched to this event, grouped by lean, with a
 * gap note when a side never appeared (and a caveat saying how it was counted).
 *
 * Also carries this article's own bias/factuality badges, so the story page has
 * exactly one coverage block instead of a sidebar duplicate.
 *
 * Exported so the matching rules can be exercised against fixtures.
 */
export function renderCoverageAcrossWire(story, related, counts) {
  const { rating } = story;
  const selfRow = `
      <div class="gn-article-rating-row">
        <span class="gn-article-coverage-self-label">This article</span>
        ${renderBiasTag(rating)}
        ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)} factuality</span>` : ''}
      </div>`;

  if (related.length === 0) {
    return `
    <section class="gn-article-section gn-article-coverage-section" aria-label="Coverage across the wire">
      <h2 class="gn-article-section-title">Coverage across the wire</h2>
      <p class="gn-article-coverage-empty">
        No other outlet in the loaded wire has published this event yet. As outlets report it,
        their headlines and leans appear here.
      </p>
      ${selfRow}
    </section>`;
  }

  const matched = counts.total;
  const pct = coveragePercents(counts);
  const dominant = dominantLean(counts);
  const gaps = describeCoverageGaps(counts);

  const groups = COVERAGE_LEAN_ORDER
    .map((lean) => ({
      lean,
      label: COVERAGE_LEAN_LABELS[lean],
      matches: related.filter(({ story: match }) => (lean === 'unrated'
        ? !match.rating?.hasLean
        : match.rating?.hasLean && match.rating.bucket === lean))
    }))
    .filter((group) => group.matches.length);

  return `
    <section class="gn-article-section gn-article-coverage-section" aria-label="Coverage across the wire">
      <div class="gn-article-coverage-head-row">
        <h2 class="gn-article-section-title">Coverage across the wire</h2>
        <span class="gn-article-coverage-count">${matched} outlet${matched === 1 ? '' : 's'}</span>
      </div>

      <div class="gn-cov-block gn-article-coverage-summary">
        ${renderAggregateBar(counts)}
        <div class="gn-cov-meta">
          <span class="gn-cov-line">
            <strong class="gn-cov-pct ${dominant}">${pct[dominant]}% ${COVERAGE_LEAN_LABELS[dominant]}</strong>
            coverage across ${matched} matched outlet${matched === 1 ? '' : 's'}
          </span>
          <span class="gn-cov-info" aria-label="How coverage is counted"
                title="Counts every article in the loaded wire whose headline was matched to this event, including this one.">
            ${COVERAGE_INFO_SVG}
          </span>
        </div>
        ${selfRow}
      </div>

      ${gaps.map((gap) => `
      <div class="gn-blindspot-banner banner-${gap.side} gn-article-coverage-gap">
        <strong>Coverage gap</strong>
        <span>No ${gap.label}-leaning outlet among the ${matched} articles matched to this event in our fetch window.</span>
      </div>`).join('')}

      <div class="gn-article-coverage-groups">
        ${groups.map((group) => `
        <div class="gn-article-coverage-group group-${group.lean}">
          <div class="gn-article-coverage-head">
            <span class="gn-live-outlet-dot${group.lean === 'unrated' ? '' : ` ${group.lean}`}"></span>
            <span class="gn-article-coverage-lean">${group.label}</span>
            <span class="gn-wire-count">${group.matches.length}</span>
          </div>
          ${group.matches.map(({ story: match }) => `
          <article class="gn-article-coverage-item" data-action="open-modal" data-story-id="${match.id}">
            <span class="gn-article-coverage-tile">${renderOutletMonogram(match.rating, 'gn-live-monogram')}</span>
            <span class="gn-article-coverage-text">
              <span class="gn-article-coverage-title">${escapeHtml(match.title)}</span>
              <span class="gn-article-coverage-meta">${escapeHtml(match.publisher)} &middot; ${escapeHtml(match.timestamp)}</span>
            </span>
          </article>`).join('')}
        </div>`).join('')}
      </div>

      <p class="gn-article-coverage-note">
        Matched automatically by headline words among the articles loaded from this wire &mdash;
        outlets that covered the event outside our fetch window are not counted.
      </p>
    </section>`;
}

/**
 * Ground News "My News Bias": the lean mix of the stories this reader has opened,
 * read from the local diet history — no server round-trip, nothing inferred.
 */
function renderReadingDietCard() {
  const diet = summarizeReadingDiet(store.getState().dietHistory);
  const openButton = '<button class="gn-live-secondary-btn" data-action="navigate-view" data-view="diet">Open My News Diet</button>';

  if (!diet.total) {
    return `
          <section class="gn-article-card" aria-label="Your news diet">
            <h2 class="gn-article-card-title">Your news diet</h2>
            <p class="gn-article-diet-empty">
              Every story you open is counted here, so you can see how balanced your reading is.
            </p>
            ${openButton}
          </section>`;
  }

  return `
          <section class="gn-article-card" aria-label="Your news diet">
            <h2 class="gn-article-card-title">Your news diet</h2>
            <span class="gn-bias-strip gn-article-diet-bar" role="img" aria-label="Left ${diet.leftPct}%, Center ${diet.centerPct}%, Right ${diet.rightPct}%">
              <span class="gn-seg gn-seg-left" style="width:${diet.leftPct}%"></span>
              <span class="gn-seg gn-seg-center" style="width:${diet.centerPct}%"></span>
              <span class="gn-seg gn-seg-right" style="width:${diet.rightPct}%"></span>
            </span>
            <p class="gn-article-diet-line">
              ${diet.total} stor${diet.total === 1 ? 'y' : 'ies'} opened &middot;
              <strong>${diet.leftPct}%</strong> Left &middot;
              <strong>${diet.centerPct}%</strong> Center &middot;
              <strong>${diet.rightPct}%</strong> Right
            </p>
            ${openButton}
          </section>`;
}

/**
 * Article page for a live wire story — laid out like a groundnews.com story
 * page: breadcrumb, kicker, headline, hero image and summary in the main
 * column; the coverage bar, outlet card and related wire stories in the
 * sidebar. Deliberately shows only what the API provides — no synthesized
 * framing — and links out to the publisher.
 */
export function renderLiveArticleModal(story) {
  if (!story) return '';
  const isBookmarked = store.getState().bookmarks.includes(story.id);
  const { rating } = story;

  const disclaimer = rating.rated
    ? `The <strong>${escapeHtml(rating.bias)}</strong> rating and <strong>${escapeHtml(rating.factuality || 'unrated')}</strong> factuality score come from our outlet database.`
    : rating.hasLean
      ? `No rating exists for this publisher yet, so the <strong>${escapeHtml(rating.bias)}</strong> lean of its feeding wire (<code>${escapeHtml(story.feedId)}</code>) is shown instead.`
      : 'This publisher is not in our outlet database, so no bias rating is claimed.';

  const related = pickRelatedStories(story);
  const relatedCoverage = findRelatedCoverage(story, getLiveStories());
  const coverageSummary = summarizeCoverageStories([story, ...relatedCoverage.map((match) => match.story)]);
  const outletSub = rating.rated
    ? `${escapeHtml(rating.bias)} &middot; ${escapeHtml(rating.factuality || 'unrated')} factuality`
    : rating.hasLean
      ? `${escapeHtml(rating.bias)} wire lean &middot; not yet rated`
      : 'Not yet in the bias database';

  return `
    <div class="gn-article-detail-page gn-live-article-page">
      <div class="article-breadcrumb-bar">
        <button class="article-back-btn" data-action="close-modal" title="Return to news feed">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Top Stories</span>
        </button>

        <div class="article-breadcrumb-meta">
          <span class="dossier-pill">Article</span>
        </div>
      </div>

      <div class="gn-live-article-layout">
        <article class="gn-live-article-main">
          <div class="gn-article-kicker">
            <span class="gn-cat-tag">${escapeHtml(story.category)}</span>
            <span class="gn-sep">&middot;</span>
            <span>${escapeHtml(rating.publisher)}</span>
            <span class="gn-sep">&middot;</span>
            <span>${escapeHtml(story.timestamp)}</span>
            <span class="gn-sep">&middot;</span>
            <span>${escapeHtml(story.readTime)}</span>
            ${story.isFresh ? '<span class="gn-live-new">New</span>' : ''}
          </div>

          <h1 class="gn-live-article-title">${escapeHtml(story.title)}</h1>
          ${story.author ? `<p class="gn-article-byline">By ${escapeHtml(story.author)}</p>` : ''}

          ${story.heroImage
            ? `<div class="gn-live-article-media"><img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" decoding="async"
                     onerror="this.parentElement.style.display='none';" /></div>`
            : ''}

          <section class="gn-article-section">
            <h2 class="gn-article-section-title">About this story</h2>
            <p class="gn-live-article-summary">${escapeHtml(story.neutralSummary)}</p>
          </section>

          ${renderCoverageAcrossWire(story, relatedCoverage, coverageSummary)}

          ${renderArticleFullText(story, getArticleContent(story.id))}

          <div class="gn-live-article-actions">
            <button class="gn-live-secondary-btn ${isBookmarked ? 'saved' : ''}" data-action="toggle-bookmark" data-story-id="${story.id}">
              ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button class="gn-live-secondary-btn" data-action="close-modal">Close</button>
          </div>

          <p class="gn-live-article-disclaimer">
            Toggle News stores only the headline, summary, image, and publisher supplied by the wire.
            ${disclaimer}
            Multi-perspective framing analysis lives in the curated Dossier, Comparison Matrix, and Blindspot Radar views.
          </p>
        </article>

        <aside class="gn-live-article-aside">
          <section class="gn-article-card" aria-label="Outlet">
            <h2 class="gn-article-card-title">Outlet</h2>
            <div class="gn-article-outlet-row">
              <span class="gn-article-outlet-tile">${renderOutletMonogram(rating, 'gn-live-monogram')}</span>
              <div class="gn-article-outlet-text">
                <span class="gn-article-outlet-name">${escapeHtml(rating.publisher)}</span>
                <span class="gn-article-outlet-sub">${outletSub}</span>
              </div>
            </div>
            ${rating.outletId
              ? `<button class="gn-live-secondary-btn" data-outlet-id="${escapeHtml(rating.outletId)}">Open outlet profile</button>`
              : ''}
          </section>

          ${related.length ? `
          <section class="gn-article-card" aria-label="More from the wire">
            <h2 class="gn-article-card-title">More from the wire</h2>
            <div class="gn-article-more-list">
              ${related.map(renderRelatedRow).join('')}
            </div>
          </section>` : ''}

          ${renderReadingDietCard()}
        </aside>
      </div>
    </div>
  `;
}
