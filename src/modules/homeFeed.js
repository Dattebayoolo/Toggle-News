// Home feed — assembled entirely from live API articles.
//
// The previous version of this page was a hand-authored mock-up: invented "Daily
// Briefing" cards, spotlight rails, and hardcoded story lists tied to sample data.
// Everything rendered here is derived from the articles the server actually
// returned, and each block explains itself when there is nothing to show.

import { SOURCES } from '../data/sourcesData.js';
import {
  renderLiveWireSection,
  filterLiveStories,
  summarizeCoverage,
  renderBiasTag,
  renderCoverageBlock,
  renderOutletMonogram,
  escapeHtml
} from './liveFeed.js';
import { renderLocalNewsWidget } from './localNews.js';

const BRIEFING_SIZE = 3;
const CARD_SLOTS = ['left', 'center', 'right'];

function renderBriefingCard(story, slot) {
  const { rating } = story;
  const showSnippet = Boolean(story.neutralSummary) && story.neutralSummary !== story.title;

  return `
    <article class="briefing-col-${slot} briefing-interactive-card" data-action="open-modal" data-story-id="${story.id}">
      <div class="briefing-card-media">
        ${story.heroImage
          ? `<img src="${escapeHtml(story.heroImage)}" alt="" loading="lazy" decoding="async"
                  onerror="this.style.display='none';var m=this.nextElementSibling;if(m)m.style.display='flex';" />
             ${renderOutletMonogram(rating, 'gn-briefing-monogram')}`
          : renderOutletMonogram(rating, 'gn-briefing-monogram')}
      </div>

      <div class="briefing-card-content">
        <div class="briefing-card-metaline">
          <span class="gn-cat-tag">${escapeHtml(story.category)}</span>
          <span class="gn-sep">&middot;</span>
          <span class="gn-live-outlet">${escapeHtml(rating.publisher)}</span>
          <span class="gn-sep">&middot;</span>
          <span class="gn-row-time">${escapeHtml(story.timestamp)}</span>
        </div>

        <h3 class="briefing-card-title">${escapeHtml(story.title)}</h3>
        ${showSnippet ? `<p class="briefing-card-snippet">${escapeHtml(story.neutralSummary)}</p>` : ''}

        ${renderCoverageBlock(story)}

        <div class="briefing-card-footer">
          ${renderBiasTag(rating)}
          ${rating.factuality ? `<span class="gn-live-fact">${escapeHtml(rating.factuality)}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

/** Coverage mix of the articles currently loaded from the wire. */
export function renderCoveragePanel(coverage, liveState = {}) {
  const total = coverage.left + coverage.center + coverage.right + coverage.unrated;
  const pct = (count) => (total ? Math.round((count / total) * 100) : 0);
  const row = (key, label) => `
      <div class="gn-coverage-row">
        <span class="gn-coverage-label ${key}">${label}</span>
        <div class="gn-coverage-track"><div class="gn-coverage-fill ${key}" style="width:${pct(coverage[key])}%"></div></div>
        <span class="gn-coverage-val">${coverage[key]}</span>
      </div>`;

  return `
    <aside class="gn-coverage-panel" aria-label="Wire coverage">
      <h2 class="gn-coverage-title">Wire Coverage</h2>
      <p class="gn-coverage-sub">
        ${total} of ${liveState.total || total} articles loaded, by outlet lean.
      </p>
      ${row('left', 'Left')}
      ${row('center', 'Center')}
      ${row('right', 'Right')}
      ${coverage.unrated ? row('unrated', 'Unrated') : ''}
      <p class="gn-coverage-note">
        Ratings come from the outlet database (${SOURCES.length} publications). Publishers with no
        left/right rating — trade, gaming, and consumer-tech titles — are counted as Unrated.
      </p>
    </aside>
  `;
}

/** Main feed: briefing highlights + the live wire list + a coverage sidebar. */
export function renderHomeFeedView({
  liveStories = [],
  category = 'All',
  query = '',
  liveState = {},
  bookmarksOnly = false,
  bookmarkedIds = []
} = {}) {
  const filtered = filterLiveStories(liveStories, { category, query })
    .filter(story => !bookmarksOnly || bookmarkedIds.includes(story.id));

  const featured = filtered.slice(0, BRIEFING_SIZE);
  const featuredIds = new Set(featured.map(story => story.id));
  const wireList = filtered.filter(story => !featuredIds.has(story.id));

  return `
    <div class="gn-home-layout">
      <div class="gn-home-main">
        ${featured.length ? `
        <section class="gn-briefing-section" aria-label="Daily Briefing">
          <div class="briefing-header-bar">
            <h2 class="briefing-section-title">${bookmarksOnly ? 'Your Saved Articles' : 'Daily Briefing'}</h2>
            <span class="briefing-header-note">Newest articles from the connected wires</span>
          </div>
          <div class="briefing-trio-grid">
            ${featured.map((story, index) => renderBriefingCard(story, CARD_SLOTS[index] || 'center')).join('')}
          </div>
        </section>` : ''}

        ${renderLiveWireSection(wireList, liveState)}
      </div>

      <aside class="gn-home-aside">
        ${renderCoveragePanel(summarizeCoverage(liveStories), liveState)}
        ${renderLocalNewsWidget()}
      </aside>
    </div>
  `;
}

/** Local feed view — no local source is connected, so the desk says so. */
export function renderLocalFeedView(state = {}) {
  return `
    <section class="gn-local-page" aria-label="Local news feed">
      <div class="local-page-header">
        <div class="local-page-title-block">
          <span class="local-page-eyebrow">${state.edition?.flag || ''} ${state.edition?.label || ''} edition</span>
          <h1 class="local-page-title">Daily Local News</h1>
          <p class="local-page-sub">No local source is connected to this desk.</p>
        </div>
        <div class="local-page-actions">
          <button class="local-page-btn secondary" data-action="open-location-picker">Change location</button>
          <button class="local-page-btn" data-action="navigate-view" data-view="feed">Back to top stories</button>
        </div>
      </div>

      <div class="editorial-unavailable-panel">
        <span class="editorial-unavailable-badge">NO LOCAL SOURCE</span>
        <h3>Local coverage is not connected</h3>
        <p>
          Toggle News reads national and international wires. None of them are geotagged, so there is
          no way to tell which articles happened in your city.
        </p>
        <p>
          Rather than file national stories under a local heading, this desk stays empty until a local
          feed is wired in.
        </p>
        <div class="editorial-unavailable-actions">
          <button class="editorial-unavailable-btn" data-action="navigate-view" data-view="feed">Browse the live wire</button>
        </div>
      </div>
    </section>
  `;
}