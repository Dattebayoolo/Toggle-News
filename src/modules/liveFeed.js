// Live Wire — real articles served by the Toggle News API (/api/articles).
//
// Everything rendered here comes straight from the server (newsapi.org + RSS
// sources). Nothing is synthesized: an article is only given a Left/Center/Right
// rating when its publisher exists in the bias database (../data/sourcesData.js)
// or when its feeding wire has a known lean. Otherwise it is labelled "Unrated"
// rather than guessed.
//
// The curated NEWS_STORIES feed remains the analysis layer — the multi-perspective
// framing, blindspot classifications, and timelines in the Matrix / Blindspot
// Radar / Dossier views are editorial work that a wire API cannot produce.

import { SOURCES } from '../data/sourcesData.js';
import { store } from './state.js';

export const LIVE_ENDPOINT = '/api/articles';
const DEFAULT_PAGE_SIZE = 100;

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
  'newsapi-tech': 'NewsAPI Technology'
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

export function biasBucketFor(biasScore) {
  if (typeof biasScore !== 'number' || Number.isNaN(biasScore)) return 'center';
  if (biasScore < 0) return 'left';
  if (biasScore > 0) return 'right';
  return 'center';
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
    isLive: true,
    title: article.title,
    category: mapServerCategory(article.category),
    serverCategory: article.category || null,
    timestamp: relativeTime(publishedAt, now),
    date: publishedAt,
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
    // A single wire story only carries its own publisher's perspective; the
    // Left/Right framing analysis lives in the curated NEWS_STORIES layer.
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

// ── Rendering ────────────────────────────────────────────────────────────────

function biasTag(rating) {
  if (!rating.hasLean) {
    return '<span class="bias-indicator-tag unrated" title="This publisher is not in the Toggle News bias database">Unrated outlet</span>';
  }
  const label = rating.rated ? rating.bias : `${rating.bias} wire`;
  return `<span class="bias-indicator-tag ${rating.bucket}" title="Bias rating: ${escapeHtml(rating.bias)}">${escapeHtml(label)}</span>`;
}

/** One live wire row — real headline, publisher, rating, and outbound link. */
export function renderLiveWireRow(story, options = {}) {
  const isBookmarked = 'isBookmarked' in options
    ? options.isBookmarked
    : store.getState().bookmarks.includes(story.id);
  const { rating } = story;

  const thumb = story.heroImage
    ? `<div class="gn-live-thumb"><img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" /></div>`
    : `<div class="gn-live-thumb gn-live-thumb-empty" aria-hidden="true">${escapeHtml(rating.logoText)}</div>`;

  return `
    <article class="gn-story-row gn-live-row" data-story-id="${story.id}">
      <div class="gn-row-inner gn-live-inner" data-action="open-modal" data-story-id="${story.id}">
        ${thumb}
        <div class="gn-row-content">
          <span class="local-row-meta">
            ${escapeHtml(story.category)} &middot; ${escapeHtml(rating.publisher)} &middot; ${escapeHtml(story.timestamp)}
          </span>
          <h2 class="gn-row-headline">${escapeHtml(story.title)}</h2>

          <div class="tn-coverage-row">
            ${biasTag(rating)}
            ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)} factuality</span>` : ''}
            <span class="gn-live-wire-id">${escapeHtml(story.feedId)}</span>
            <a class="gn-live-outbound" href="${escapeHtml(story.articleUrl)}" target="_blank" rel="noopener noreferrer"
               data-action="open-external" title="Read the full article at ${escapeHtml(rating.publisher)}">Read at publisher &nearr;</a>

            <button class="gn-bookmark-btn ${isBookmarked ? 'saved' : ''}"
                    data-action="toggle-bookmark" data-story-id="${story.id}"
                    title="${isBookmarked ? 'Remove bookmark' : 'Save'}" onclick="event.stopPropagation()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * The Live Wire rail: connection status, coverage mix, refresh control, rows.
 * `stories` should already be filtered by the active category / search.
 */
export function renderLiveWireSection(stories = [], state = {}) {
  const { status = 'idle', error = null, total = 0, updatedAt = null } = state;
  const coverage = summarizeCoverage(getLiveStories());
  const shown = stories.length;
  const connected = status === 'ready';

  const statusText = connected
    ? `Connected &middot; ${total} articles`
    : status === 'loading'
      ? 'Connecting&hellip;'
      : 'Feed offline';

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
    body = '<div class="gn-live-message">Loading articles from the wire&hellip;</div>';
  } else if (!shown) {
    body = `
      <div class="gn-live-message">
        <strong>No live articles match this filter.</strong>
        <span>Try another category, clear the search box, or refresh the wire.</span>
      </div>`;
  } else {
    body = stories.map((story) => renderLiveWireRow(story)).join('');
  }

  return `
    <section class="gn-live-wire" aria-label="Live wire articles">
      <div class="gn-live-wire-header">
        <div class="gn-live-wire-heading">
          <h2 class="gn-main-section-heading">Live Wire</h2>
          <span class="gn-live-status ${connected ? 'is-live' : status === 'loading' ? 'is-loading' : 'is-offline'}">
            <span class="gn-live-dot"></span>${statusText}
          </span>
        </div>

        <div class="gn-live-wire-meta">
          <span class="gn-live-mix" title="Bias mix of the loaded wire articles">
            <span class="gn-live-mix-item left">${coverage.left} Left</span>
            <span class="gn-live-mix-item center">${coverage.center} Center</span>
            <span class="gn-live-mix-item right">${coverage.right} Right</span>
            ${coverage.unrated ? `<span class="gn-live-mix-item unrated">${coverage.unrated} Unrated</span>` : ''}
          </span>
          <button class="gn-live-refresh" data-action="refresh-live" ${status === 'loading' ? 'disabled' : ''}>
            ${status === 'loading' ? 'Refreshing&hellip;' : 'Refresh'}
          </button>
        </div>
      </div>

      <p class="gn-live-wire-note">
        Real reporting pulled live from the connected news wires${updatedAt ? ` &middot; updated ${escapeHtml(relativeTime(updatedAt))}` : ''}.
        Bias ratings are attached only where the publisher is in the outlet database &mdash; unrated outlets are labelled, never guessed.
      </p>

      <div class="gn-live-wire-list ${shown ? '' : 'is-message'}">
        ${body}
      </div>
    </section>
  `;
}

/**
 * Full article page for a live wire story. Deliberately shows only what the API
 * actually provides — no synthesized framing — and links out to the publisher.
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
          <span class="dossier-pill">Live Wire Article</span>
          <span class="gn-live-wire-id">${escapeHtml(story.feedId)}</span>
        </div>
      </div>

      <div class="gn-live-article-body">
        <span class="local-row-meta">
          ${escapeHtml(story.category)} &middot; ${escapeHtml(rating.publisher)} &middot; ${escapeHtml(story.timestamp)}
          ${story.author ? ` &middot; By ${escapeHtml(story.author)}` : ''}
        </span>

        <h1 class="gn-live-article-title">${escapeHtml(story.title)}</h1>

        ${story.heroImage
          ? `<div class="gn-live-article-media"><img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" /></div>`
          : ''}

        <p class="gn-live-article-summary">${escapeHtml(story.neutralSummary)}</p>

        <div class="gn-live-article-rating-row">
          ${biasTag(rating)}
          ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)} factuality</span>` : ''}
          <span class="gn-live-wire-id">${escapeHtml(story.readTime)}</span>
        </div>

        <a class="gn-live-article-cta" href="${escapeHtml(story.articleUrl)}" target="_blank" rel="noopener noreferrer"
           data-action="open-external">
          Read the full article at ${escapeHtml(rating.publisher)} &nearr;
        </a>

        <div class="gn-live-article-actions">
          <button class="gn-live-secondary-btn ${isBookmarked ? 'saved' : ''}" data-action="toggle-bookmark" data-story-id="${story.id}">
            ${isBookmarked ? 'Bookmarked' : 'Bookmark article'}
          </button>
          <button class="gn-live-secondary-btn" data-action="close-modal">Close</button>
        </div>

        <p class="gn-live-article-disclaimer">
          Toggle News stores only the headline, summary, image, and publisher supplied by the wire.
          ${disclaimer}
          Multi-perspective framing analysis lives in the curated Dossier, Comparison Matrix, and Blindspot Radar views.
        </p>
      </div>
    </div>
  `;
}
