// Toggle News - Main Controller
// Faithfully modeled on Ground News Multi-Column Architecture & Media Literacy Engine

import { store } from './modules/state.js';
import { NEWS_STORIES } from './data/newsData.js';
import { renderStoryCard } from './modules/storyCard.js';
import { STORY_LOCATIONS } from './modules/storyLocations.js';
import { renderHeadlineMatrix } from './modules/headlineMatrix.js';
import { renderBlindspotRadar } from './modules/blindspotRadar.js';
import { renderMediaDirectory, attachDirectoryEvents } from './modules/mediaDirectory.js';
import { renderDietTracker } from './modules/dietTracker.js';
import { renderStoryModal, setModalSourceFilter } from './modules/storyModal.js';
import { SOURCES } from './data/sourcesData.js';
import { renderBiasBar } from './modules/biasBar.js';
import { openAudioPlayer, closeAudioPlayer, handleAudioPlayerClick } from './modules/audioPlayer.js';
import { openOutletDossier, closeOutletDossier } from './modules/outletModal.js';
import { openNewsChatDrawer, closeNewsChatDrawer, handleChatClick } from './modules/newsChatDrawer.js';
import {
  openAccountModal,
  closeAccountModal,
  isAccountModalOpen,
  getInitials,
  getPlan
} from './modules/accountModals.js';
import {
  renderLocalNewsWidget,
  handleLocalCitySubmit,
  openLocationPicker,
  closeLocationPicker,
  isLocationPickerOpen,
  findCity,
  getLocalStories,
  formatCity
} from './modules/localNews.js';
import { handleNewsletterSubmit, renderNewsletterForm, NEWSLETTERS } from './modules/newsletterSignup.js';
import {
  refreshLiveFeed,
  subscribeLiveFeed,
  getLiveStories,
  getLiveState,
  findLiveStory,
  filterLiveStories,
  renderLiveWireSection,
  renderLiveArticleModal
} from './modules/liveFeed.js';

let showBookmarksOnly = false;

// DOM Elements
const appView = document.getElementById('app-view');
const modalContainer = document.getElementById('modal-container');
const categoryStrip = document.getElementById('categoryStrip');
const globalSearchInput = document.getElementById('globalSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIconDark = document.getElementById('themeIconDark');
const themeIconLight = document.getElementById('themeIconLight');
const bookmarksNavBtn = document.getElementById('bookmarksNavBtn');
const bookmarksCounterBadge = document.getElementById('bookmarksCounterBadge');

// Filter Stories based on category, search, and bookmarks
function getFilteredStories() {
  const state = store.getState();
  let list = [...NEWS_STORIES];

  // Category filter
  if (state.activeCategory && state.activeCategory !== 'All') {
    list = list.filter(s => s.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  // Bookmarks filter
  if (showBookmarksOnly) {
    list = list.filter(s => state.bookmarks.includes(s.id));
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(s => {
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchSummary = s.neutralSummary.toLowerCase().includes(q);
      const matchCategory = s.category.toLowerCase().includes(q);
      const matchSources = s.sources.some(src => 
        src.headline.toLowerCase().includes(q) || 
        src.id.toLowerCase().includes(q)
      );
      return matchTitle || matchSummary || matchCategory || matchSources;
    });
  }

  return list;
}

// Live wire articles and curated stories share one lookup, so bookmarks, hash
// routing, and the article page behave identically for both kinds of story.
function findStory(id) {
  return NEWS_STORIES.find(s => s.id === id) || findLiveStory(id);
}

// Live Wire rail for the current category / search filters.
function renderLiveWire() {
  const state = store.getState();
  return renderLiveWireSection(
    filterLiveStories(getLiveStories(), { category: state.activeCategory, query: state.searchQuery }),
    getLiveState()
  );
}

// Reusable topic follow toggle for each Topic Spotlight header
function renderFollowButton(topic) {
  const isFollowing = store.isFollowingTopic(topic);
  return `
          <button class="spotlight-follow-btn ${isFollowing ? 'active' : ''}"
                  data-action="toggle-follow-topic"
                  data-topic="${topic}"
                  title="${isFollowing ? `Stop following ${topic}` : `Follow ${topic}`}">
            ${isFollowing
              ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'}
            ${isFollowing ? 'Following' : 'Follow'}
          </button>`;
}

// ── Ground News–style Homepage Feed ──────────────────────────────────────────
function renderHomeFeed(stories) {
  if (stories.length === 0) {
    return `
      ${renderLiveWire()}

      <div class="gn-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 16px;display:block;opacity:0.3">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No matching stories found</h3>
        <p>Try adjusting your search terms or category selection.</p>
      </div>
    `;
  }

  const blindspots = NEWS_STORIES.filter(s => s.isBlindspot);
  const dietStats = store.calculateDietStats();
  const sampleSources = SOURCES.slice(0, 5);

  // Key spotlight stories matching Ground News reference screenshot
  const trumpStory    = NEWS_STORIES.find(s => s.id === 'story-trump-ai-force') || stories[0];
  const ukraineStory  = NEWS_STORIES.find(s => s.id === 'story-ukraine-weapons') || stories[1];
  const subStory1     = NEWS_STORIES.find(s => s.id === 'story-trump-tax-plan') || stories[2];
  const subStory2     = NEWS_STORIES.find(s => s.id === 'story-metro-gunman') || stories[3];
  const bsLeft        = NEWS_STORIES.find(s => s.id === 'story-hormuz-blockade') || blindspots[0];
  const bsRight       = NEWS_STORIES.find(s => s.id === 'story-michigan-school-holidays') || blindspots[1];
  const gazaStory     = NEWS_STORIES.find(s => s.id === 'story-gaza-four-killed') || stories[4];
  const nhlStory      = NEWS_STORIES.find(s => s.id === 'story-nhl-putin') || stories[5];
  const sfStory       = NEWS_STORIES.find(s => s.id === 'story-san-francisco-homeless') || stories[6] || stories[0];

  // Specific stories for the Top News Stories stream matching Ground News screenshot
  const mainFeedStoryIds = [
    'story-uk-russia-narrative',
    'story-trump-ai-force',
    'story-navy-alcohol',
    'story-ed-sheeran-vegas',
    'story-houthi-drone',
    'story-michigan-school-holidays',
    'story-lawsuit-ai-conduct',
    'story-oil-iran-surge',
    'story-hormuz-blockade'
  ];
  const mainFeedStories = mainFeedStoryIds
    .map(id => NEWS_STORIES.find(s => s.id === id))
    .filter(Boolean);

  // Similar news topic categories
  const similarTopics = [
    { title: 'Middle East Conflict' },
    { title: 'United States' },
    { title: 'Russia' },
    { title: 'NATO' },
    { title: 'International Relations' },
    { title: 'Defense and Security' },
    { title: 'More...' }
  ];

  // Reference-style helpers: shortened related-link titles + compact read time
  const shortTitle = (t) => t.split(' ').slice(0, 6).join(' ');
  const shortRead = (r) => (r || '').replace(' min read', 'm read').replace(' mins read', 'm read');

  // Category · Location meta lines (reference style)
  const storyLocationMap = STORY_LOCATIONS;

  // Topic follow state (Israel-Gaza spotlight)
  const localCityEntry = findCity(store.getState().localCity);

  return `
    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 1: DAILY BRIEFING (Ground News 3-Column Top Hero Grid)
         ══════════════════════════════════════════════════════════════════ -->
    ${renderLiveWire()}

    <section class="gn-briefing-section" aria-label="Daily Briefing">
      <div class="briefing-header-bar">
        <h2 class="briefing-section-title">Daily Briefing</h2>
      </div>

      <div class="briefing-trio-grid">

        <!-- Left Column: Ukraine Guided Munitions Story -->
        <div class="briefing-col-left">
          <div class="briefing-left-card briefing-interactive-card" data-action="open-modal" data-story-id="${ukraineStory.id}">
          <div class="briefing-card-media">
            <img src="${ukraineStory.heroImage}" alt="${ukraineStory.title}" loading="lazy" />
          </div>
          <div class="briefing-card-content">
            <div class="briefing-card-metaline">${ukraineStory.sources.length} stories &bull; ${ukraineStory.sourceCount} articles &bull; ${shortRead(ukraineStory.readTime)}</div>
            <h3 class="briefing-card-title">${ukraineStory.title}</h3>
            <p class="briefing-card-snippet">${ukraineStory.neutralSummary}</p>

            <p class="briefing-card-links">+ <a data-action="open-modal" data-story-id="${subStory1.id}">${shortTitle(subStory1.title)}</a>; <a data-action="open-modal" data-story-id="${subStory2.id}">${shortTitle(subStory2.title)}</a>; <a data-action="open-modal" data-story-id="${sfStory.id}">${shortTitle(sfStory.title)}</a>; and more.</p>
          </div>
          </div>

          <!-- Top News Stories list inside the left briefing column -->
          <h2 class="gn-main-section-heading tn-col-heading">Top News Stories</h2>
          <div class="tn-col-list">
            ${mainFeedStories.slice(0, 5).map(story => renderStoryCard(story)).join('')}
          </div>
        </div>

        <!-- Center Column: Trump AI Force Main Hero + 2 Stacked Items -->
        <div class="briefing-col-center">
          <!-- Main Large Hero Card -->
          <div class="briefing-hero-card briefing-interactive-card" data-action="open-modal" data-story-id="${trumpStory.id}">
            <div class="briefing-hero-img-wrap">
              <img src="${trumpStory.heroImage}" alt="${trumpStory.title}" loading="lazy" />
              <span class="hero-info-icon" title="About this coverage">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </span>
              <div class="briefing-hero-overlay">
                <h2 class="briefing-hero-headline">${trumpStory.title}</h2>
                <div class="gn-bias-strip labeled lg">
                  <div class="gn-seg gn-seg-left"   style="width:${trumpStory.biasDistribution.left}%"><span>L ${trumpStory.biasDistribution.left}%</span></div>
                  <div class="gn-seg gn-seg-center" style="width:${trumpStory.biasDistribution.center}%"><span>Center ${trumpStory.biasDistribution.center}%</span></div>
                  <div class="gn-seg gn-seg-right"  style="width:${trumpStory.biasDistribution.right}%"><span>Right ${trumpStory.biasDistribution.right}%</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Two Stacked News Items Directly Below Hero -->
          <div class="briefing-sub-items">
            ${[subStory1, subStory2, gazaStory, nhlStory].map(s => {
              const dist = s.biasDistribution;
              const leanEntry = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
              const leanName = leanEntry[0] === 'left' ? 'Left' : leanEntry[0] === 'right' ? 'Right' : 'Center';
              const loc = storyLocationMap[s.id] || 'United States';
              return `
              <div class="briefing-sub-item briefing-interactive-card" data-action="open-modal" data-story-id="${s.id}">
                <div class="sub-item-text">
                  <span class="local-row-meta">${s.category} &middot; ${loc}</span>
                  <h4 class="sub-item-title">${s.title}</h4>
                  <div class="sub-item-meta">
                    <div class="gn-bias-strip mini">
                      <div class="gn-seg gn-seg-left"   style="width:${dist.left}%"></div>
                      <div class="gn-seg gn-seg-center" style="width:${dist.center}%"></div>
                      <div class="gn-seg gn-seg-right"  style="width:${dist.right}%"></div>
                    </div>
                    <span class="sub-src-count"><strong>${leanEntry[1]}%</strong> ${leanName} coverage: ${s.sourceCount} sources</span>
                  </div>
                </div>
                <img class="sub-item-thumb" src="${s.heroImage}" alt="" loading="lazy" />
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Right Column: Ground News Blindspot Widget -->
        <div class="briefing-col-blindspot">
          <div class="blindspot-col-header">
            <div class="blindspot-brand-title">
              <svg width="20" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="8" cy="7" r="5.5"></circle><circle cx="18" cy="7" r="5.5"></circle>
              </svg>
              <span>BLINDSPOT&trade;</span>
            </div>
            <p class="blindspot-col-subtitle">Stories disproportionately covered by one side of the political spectrum. <a class="blindspot-learn-link" data-action="navigate-view" data-view="blindspots">Learn more about political bias in news coverage.</a></p>
          </div>

          <div class="blindspot-stacked-cards">
            <!-- Blindspot Card 1: Left Blindspot (Hormuz Ocean) -->
            <div class="blindspot-stack-card briefing-interactive-card" data-action="open-modal" data-story-id="${bsLeft.id}">
              <div class="stack-card-img">
                <img src="${bsLeft.heroImage}" alt="" loading="lazy" />
                <span class="hero-info-icon" title="About this coverage">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
              </div>
              <div class="stack-card-body">
                <div class="bs-coverage-meta">
                  <svg class="bs-circles-icon" width="20" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="7" r="5.5"></circle><circle cx="18" cy="7" r="5.5"></circle></svg>
                  <span class="bs-coverage-text ${bsLeft.blindspotType === 'left' ? 'left' : 'right'}">Low coverage from ${bsLeft.blindspotType === 'left' ? 'Left' : 'Right'} Sources</span>
                  <span class="bs-meta-sep">&middot;</span>
                  <span class="bs-time">11h ago</span>
                </div>
                <div class="gn-bias-strip labeled">
                  <div class="gn-seg gn-seg-left"   style="width:${bsLeft.biasDistribution.left}%"><span>${bsLeft.biasDistribution.left}%</span></div>
                  <div class="gn-seg gn-seg-center" style="width:${bsLeft.biasDistribution.center}%"><span>Center ${bsLeft.biasDistribution.center}%</span></div>
                  <div class="gn-seg gn-seg-right"  style="width:${bsLeft.biasDistribution.right}%"><span>Right ${bsLeft.biasDistribution.right}%</span></div>
                </div>
                <h4 class="stack-card-headline">${bsLeft.title}</h4>
              </div>
            </div>

            <!-- Blindspot Card 2: Right Blindspot (Michigan Rally) -->
            <div class="blindspot-stack-card briefing-interactive-card" data-action="open-modal" data-story-id="${bsRight.id}">
              <div class="stack-card-img">
                <img src="${bsRight.heroImage}" alt="" loading="lazy" />
                <span class="hero-info-icon" title="About this coverage">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
              </div>
              <div class="stack-card-body">
                <div class="bs-coverage-meta">
                  <svg class="bs-circles-icon" width="20" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="7" r="5.5"></circle><circle cx="18" cy="7" r="5.5"></circle></svg>
                  <span class="bs-coverage-text ${bsRight.blindspotType === 'right' ? 'right' : 'left'}">No coverage from ${bsRight.blindspotType === 'right' ? 'Right' : 'Left'} Sources</span>
                  <span class="bs-meta-sep">&middot;</span>
                  <span class="bs-time">21h ago</span>
                </div>
                <div class="gn-bias-strip labeled">
                  <div class="gn-seg gn-seg-left"   style="width:${bsRight.biasDistribution.left}%"><span>${bsRight.biasDistribution.left}%</span></div>
                  <div class="gn-seg gn-seg-center" style="width:${bsRight.biasDistribution.center}%"><span>Center ${bsRight.biasDistribution.center}%</span></div>
                  <div class="gn-seg gn-seg-right"  style="width:${bsRight.biasDistribution.right}%"><span>Right ${bsRight.biasDistribution.right}%</span></div>
                </div>
                <h4 class="stack-card-headline">${bsRight.title}</h4>
              </div>
            </div>
          </div>

          <!-- View Blindspot Feed Button -->
          <button class="bs-view-feed-btn" data-action="navigate-view" data-view="blindspots">View Blindspot Feed</button>

          <!-- My News Bias Widget -->
          <div class="my-news-bias-widget">
            <h3 class="mnb-title">My News Bias</h3>
            <div class="mnb-user-name">Linda B. (Sample user)</div>
            <div class="mnb-user-stats">0 Stories - 0 Articles</div>
            <div class="mnb-bias-bar">
              <div class="mnb-seg mnb-left"><span>?</span></div>
              <div class="mnb-seg mnb-center"><span>?</span></div>
              <div class="mnb-seg mnb-right"><span>?</span></div>
            </div>
            <button class="mnb-demo-btn" data-action="navigate-view" data-view="diet">See the demo</button>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 2: SIDEBAR WIDGETS (Top stories list now lives in the Daily Briefing left column)
         ══════════════════════════════════════════════════════════════════ -->
    <!-- Two-column layout: Sidebar -->
    <div class="gn-homepage-columns">

      <!-- RIGHT: Ground News Intelligence Sidebar -->
      <aside class="gn-sidebar-column" aria-label="News intelligence widgets">

        <!-- Sidebar Top Action Button -->
        <button class="gn-sidebar-customize-btn" data-action="navigate-view" data-view="diet">
          <span>Customize your feed</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

      </aside>
    </div>


    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 2.5: LOCAL NEWS ROWS + DAILY LOCAL NEWS WIDGET
         ══════════════════════════════════════════════════════════════════ -->
    <section class="gn-local-section" aria-label="Local news and Daily Local News">
      <div class="local-rows-col">
        <div class="local-rows-heading-row">
          <h2 class="gn-main-section-heading">${localCityEntry ? `Local News near ${localCityEntry.city}` : 'Local News near you'}</h2>
          ${localCityEntry ? `<button class="local-see-all-btn" data-action="view-local-feed">See all local stories &rsaquo;</button>` : ''}
        </div>
        ${[
          { s: NEWS_STORIES.find(x => x.id === 'story-michigan-school-holidays'), loc: 'Dearborn' },
          { s: NEWS_STORIES.find(x => x.id === 'story-lawsuit-ai-conduct'), loc: 'United States' },
          { s: NEWS_STORIES.find(x => x.id === 'story-oil-iran-surge'), loc: 'United States' },
          { s: NEWS_STORIES.find(x => x.id === 'story-hormuz-blockade'), loc: 'United States' }
        ].filter(item => item.s).map(({ s, loc }) => {
          const dist = s.biasDistribution;
          const leanEntry = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
          const leanName = leanEntry[0] === 'left' ? 'Left' : leanEntry[0] === 'right' ? 'Right' : 'Center';
          const rowLoc = localCityEntry && loc === 'Dearborn' ? localCityEntry.city : loc;
          return `
          <article class="local-row" data-action="open-modal" data-story-id="${s.id}">
            <div class="local-row-text">
              <span class="local-row-meta">${s.category} &middot; ${rowLoc}</span>
              <h3 class="local-row-headline">${s.title}</h3>
              <div class="tn-coverage-row">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left"   style="width:${dist.left}%"  title="Left ${dist.left}%"></div>
                  <div class="gn-seg gn-seg-center" style="width:${dist.center}%" title="Center ${dist.center}%"></div>
                  <div class="gn-seg gn-seg-right"  style="width:${dist.right}%" title="Right ${dist.right}%"></div>
                </div>
                <span class="sub-src-count"><strong>${leanEntry[1]}%</strong> ${leanName} coverage: ${s.sourceCount} sources</span>
              </div>
            </div>
            <img class="local-row-thumb" src="${s.heroImage}" alt="" loading="lazy" />
          </article>`;
        }).join('')}
      </div>

      <!-- Daily Local News Widget -->
      ${renderLocalNewsWidget()}
    </section>


    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 3: ISRAEL-GAZA NEWS (Dedicated Ground News Topic Spotlight)
         ══════════════════════════════════════════════════════════════════ -->
    <section class="gn-topic-spotlight-section" aria-label="Israel-Gaza News">
      <!-- Section Header -->
      <div class="spotlight-header-bar">
        <h2 class="spotlight-title">Israel-Gaza News</h2>
        <div class="spotlight-actions">
          ${renderFollowButton('Israel-Gaza News')}
          <button class="spotlight-viewall-btn" data-action="navigate-view" data-view="blindspots">Read More</button>
        </div>
      </div>

      <!-- Reference layout: Big story (left, divider) | Blindspots (right) -->
      <div class="ig-two-col">
        <!-- Left: Latest Israel-Gaza News -->
        <div class="ig-latest-col">
          <span class="spotlight-col-subheading">Latest Israel-Gaza News</span>
          <div class="ig-hero briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
            <div class="ig-hero-img-wrap">
              <img src="${gazaStory.heroImage}" alt="${gazaStory.title}" loading="lazy" />
            </div>
            <div class="ig-labeled-bar">
              <span class="ig-seg-label ig-left"  style="width:${gazaStory.biasDistribution.left}%">Left ${gazaStory.biasDistribution.left}%</span>
              <span class="ig-seg-label ig-center" style="width:${gazaStory.biasDistribution.center}%">Center ${gazaStory.biasDistribution.center}%</span>
              <span class="ig-seg-label ig-right" style="width:${gazaStory.biasDistribution.right}%">Right ${gazaStory.biasDistribution.right}%</span>
            </div>
            <h3 class="ig-hero-headline">${gazaStory.title}</h3>
          </div>
        </div>

        <!-- Right: Israel-Gaza Blindspots -->
        <div class="ig-blindspot-col">
          <span class="spotlight-col-subheading">Israel-Gaza Blindspots</span>

          <div class="ig-bs-cards-row">
            <!-- Blindspot card 1 -->
            <div class="ig-bs-card briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <div class="ig-bs-img-wrap">
                <img src="https://images.unsplash.com/photo-1579547621113-e4bb2a08f51a?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" />
              </div>
              <div class="ig-bs-body">
                <div class="ig-bs-meta">
                  <span class="bs-circles-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="6"></circle><circle cx="15" cy="12" r="6"></circle></svg>
                  </span>
                  <span class="ig-bs-no cov-left">No coverage from Left Sources</span>
                  <span class="ig-bs-time">· 12h ago</span>
                </div>
                <div class="ig-labeled-bar two-seg">
                  <span class="ig-seg-label ig-center" style="width:36%">Center 36%</span>
                  <span class="ig-seg-label ig-right"  style="width:64%">Right 64%</span>
                </div>
                <h5 class="ig-bs-title">Israeli Attacks Kill at Least Four in Gaza</h5>
              </div>
            </div>

            <!-- Blindspot card 2 (highlighted) -->
            <div class="ig-bs-card ig-bs-card-hl briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <div class="ig-bs-img-wrap">
                <img src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video footage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
              </div>
              <div class="ig-bs-body">
                <div class="ig-bs-meta">
                  <span class="bs-circles-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="6"></circle><circle cx="15" cy="12" r="6"></circle></svg>
                  </span>
                  <span class="ig-bs-no cov-right">No coverage from Right Sources</span>
                  <span class="ig-bs-time">· 5d ago</span>
                </div>
                <div class="ig-labeled-bar two-seg">
                  <span class="ig-seg-label ig-left"   style="width:64%">Left 64%</span>
                  <span class="ig-seg-label ig-center" style="width:36%">Center 36%</span>
                </div>
                <h5 class="ig-bs-title ig-title-underlined">Action needed to ensure groups aren't unduly 'de-banked' over terror risks: report</h5>
                <div class="ig-bs-factuality">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6c0 5.05 3.41 9.76 8 11 4.59-1.24 8-5.95 8-11V5l-8-3zm-1.1 13.5l-3-3 1.06-1.06 1.94 1.94 4.44-4.44L16.4 10l-5.5 5.5z"/></svg>
                  <span><strong>100%</strong> of Sources are High Factuality</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Blindspot signup card -->
          <div class="ig-signup-card">
            <div class="ig-signup-brand">
              <span class="bs-circles-icon lg" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="6"></circle><circle cx="15" cy="12" r="6"></circle></svg>
              </span>
              <h4>Blindspot</h4>
            </div>
            <p class="ig-signup-desc">Get the weekly Blindspot report sent to your inbox and stay up to date with your bias blindspot.</p>
            ${renderNewsletterForm({
              newsletterId: 'blindspot-weekly',
              inputClass: 'ig-signup-input',
              buttonClass: 'ig-signup-btn'
            })}
          </div>
        </div>
      </div>

      <!-- Lower Sub-section: Latest Stories (Left) + Similar News Topics (Right) -->
      <div class="spotlight-lower-layout">
        <!-- Left: Clean list of latest stories -->
        <div class="spotlight-latest-list-wrap">
          <h4 class="lower-subheading">Latest Stories</h4>
          <div class="spotlight-compact-rows">
            <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <h5 class="compact-row-title">UN Agency reports critical fuel shortages at central Gaza water desalination facilities</h5>
              <div class="compact-row-meta">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left" style="width:58%"></div>
                  <div class="gn-seg gn-seg-center" style="width:24%"></div>
                  <div class="gn-seg gn-seg-right" style="width:18%"></div>
                </div>
                <span class="compact-time">1 hour ago · 38 sources</span>
              </div>
            </div>

            <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <h5 class="compact-row-title">Israeli Supreme Court delays hearing on military drafting of ultra-Orthodox seminary students</h5>
              <div class="compact-row-meta">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left" style="width:35%"></div>
                  <div class="gn-seg gn-seg-center" style="width:30%"></div>
                  <div class="gn-seg gn-seg-right" style="width:35%"></div>
                </div>
                <span class="compact-time">2 hours ago · 29 sources</span>
              </div>
            </div>

            <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <h5 class="compact-row-title">US, Egyptian, and Qatari mediators convene closed session in Doha to bridge border control gaps</h5>
              <div class="compact-row-meta">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left" style="width:40%"></div>
                  <div class="gn-seg gn-seg-center" style="width:35%"></div>
                  <div class="gn-seg gn-seg-right" style="width:25%"></div>
                </div>
                <span class="compact-time">3 hours ago · 44 sources</span>
              </div>
            </div>

            <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <h5 class="compact-row-title">Progressive lawmakers push to condition foreign military financing on humanitarian corridors</h5>
              <div class="compact-row-meta">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left" style="width:62%"></div>
                  <div class="gn-seg gn-seg-center" style="width:20%"></div>
                  <div class="gn-seg gn-seg-right" style="width:18%"></div>
                </div>
                <span class="compact-time">4 hours ago · 51 sources</span>
              </div>
            </div>

            <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <h5 class="compact-row-title">Sunday Call: White House and Israeli leadership discuss Rafah security protocols</h5>
              <div class="compact-row-meta">
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left" style="width:45%"></div>
                  <div class="gn-seg gn-seg-center" style="width:30%"></div>
                  <div class="gn-seg gn-seg-right" style="width:25%"></div>
                </div>
                <span class="compact-time">5 hours ago · 62 sources</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Similar News Topics accordion / list -->
        <div class="spotlight-topics-sidebar">
          <h4 class="lower-subheading">Similar News Topics</h4>
          <div class="topics-accordion-list">
            ${similarTopics.map(topic => `
              <div class="topic-accordion-row">
                <span class="topic-name">${topic.title}</span>
                <svg class="topic-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>


    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 4: US POLITICS NEWS (Dedicated Spotlight 2)
         ══════════════════════════════════════════════════════════════════ -->
    <section class="gn-topic-spotlight-section" aria-label="US Politics News">
      <!-- Section Header -->
      <div class="spotlight-header-bar">
        <h2 class="spotlight-title">US Politics News</h2>
        <div class="spotlight-actions">
          ${renderFollowButton('US Politics News')}
          <button class="spotlight-viewall-btn" data-action="open-modal" data-story-id="${nhlStory.id}">
            View all <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>

      <!-- Top Spotlight 2-column -->
      <div class="spotlight-trio-layout">
        <!-- Left: Featured Card -->
        <div class="spotlight-main-featured briefing-interactive-card" data-action="open-modal" data-story-id="${nhlStory.id}">
          <span class="spotlight-col-subheading">Latest US Politics News</span>
          <div class="spotlight-featured-card">
            <div class="spotlight-img-wrap">
              <img src="${nhlStory.heroImage}" alt="${nhlStory.title}" loading="lazy" />
              <div class="spotlight-overlay-meta">
                <span class="spotlight-src-count">${nhlStory.sourceCount} sources</span>
              </div>
            </div>
            <div class="spotlight-card-body">
              <div class="gn-bias-strip">
                <div class="gn-seg gn-seg-left"   style="width:${nhlStory.biasDistribution.left}%"></div>
                <div class="gn-seg gn-seg-center" style="width:${nhlStory.biasDistribution.center}%"></div>
                <div class="gn-seg gn-seg-right"  style="width:${nhlStory.biasDistribution.right}%"></div>
              </div>
              <h3 class="spotlight-card-headline">${nhlStory.title}</h3>
              <p class="spotlight-card-desc">${nhlStory.neutralSummary.slice(0, 140)}…</p>
            </div>
          </div>
        </div>

        <!-- Right: 2 Blindspot Cards + On the Ground Box -->
        <div class="spotlight-side-blindspots">
          <span class="spotlight-col-subheading">US Politics Blindspots</span>
          
          <div class="spotlight-blindspot-cards-row">
            <!-- Blindspot 1 -->
            <div class="spotlight-mini-blindspot briefing-interactive-card" data-action="open-modal" data-story-id="${subStory1.id}">
              <div class="mini-bs-thumb">
                <img src="${subStory1.heroImage}" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video footage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="mini-bs-badge left">64% Left Blindspot</span>
              </div>
              <h5 class="mini-bs-title">${subStory1.title}</h5>
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:${subStory1.biasDistribution.left}%"></div>
                <div class="gn-seg gn-seg-center" style="width:${subStory1.biasDistribution.center}%"></div>
                <div class="gn-seg gn-seg-right" style="width:${subStory1.biasDistribution.right}%"></div>
              </div>
            </div>

            <!-- Blindspot 2 -->
            <div class="spotlight-mini-blindspot briefing-interactive-card" data-action="open-modal" data-story-id="${sfStory.id}">
              <div class="mini-bs-thumb">
                <img src="${sfStory.heroImage}" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video footage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="mini-bs-badge right">58% Right Blindspot</span>
              </div>
              <h5 class="mini-bs-title">${sfStory.title}</h5>
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:${sfStory.biasDistribution.left}%"></div>
                <div class="gn-seg gn-seg-center" style="width:${sfStory.biasDistribution.center}%"></div>
                <div class="gn-seg gn-seg-right" style="width:${sfStory.biasDistribution.right}%"></div>
              </div>
            </div>
          </div>

          <!-- On the Ground Box -->
          <div class="on-the-ground-box">
            <div class="otg-text">
              <h4 class="otg-title">On the Ground</h4>
              <p class="otg-desc">Get the daily 360-degree briefing on 2026 election campaigns and federal policy battles.</p>
            </div>
            <button class="otg-action-btn" data-action="open-modal" data-story-id="${nhlStory.id}">Read analysis</button>
          </div>
        </div>
      </div>

      <!-- Lower Sub-section: Clean Text Rows + Load More -->
      <div class="spotlight-lower-full">
        <h4 class="lower-subheading">Latest News Stories</h4>
        <div class="spotlight-compact-rows">
          <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${sfStory.id}">
            <h5 class="compact-row-title">San Francisco passes measures to clear homeless encampments and enforce shelter beds</h5>
            <div class="compact-row-meta">
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:32%"></div>
                <div class="gn-seg gn-seg-center" style="width:30%"></div>
                <div class="gn-seg gn-seg-right" style="width:38%"></div>
              </div>
              <span class="compact-time">2 hours ago · 62 sources</span>
            </div>
          </div>

          <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${subStory2.id}">
            <h5 class="compact-row-title">Search underway for suspected gunman outside Metro station near White House</h5>
            <div class="compact-row-meta">
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:35%"></div>
                <div class="gn-seg gn-seg-center" style="width:35%"></div>
                <div class="gn-seg gn-seg-right" style="width:30%"></div>
              </div>
              <span class="compact-time">3 hours ago · 34 sources</span>
            </div>
          </div>

          <div class="compact-text-row briefing-interactive-card" data-action="open-modal" data-story-id="${trumpStory.id}">
            <h5 class="compact-row-title">George Santos: Ex-Congressman Pleads Guilty to Aggravated Identity Theft in Federal Court</h5>
            <div class="compact-row-meta">
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:48%"></div>
                <div class="gn-seg gn-seg-center" style="width:32%"></div>
                <div class="gn-seg gn-seg-right" style="width:20%"></div>
              </div>
              <span class="compact-time">4 hours ago · 89 sources</span>
            </div>
          </div>
        </div>

        <div class="spotlight-load-more-wrap">
          <button class="spotlight-load-more-btn">Load more stories</button>
        </div>
      </div>
    </section>
  `;
}

// Master Render Function
// ── Local News Page (reached from the Daily Local News widget) ───────────────
function renderLocalFeed() {
  const entry = findCity(store.getState().localCity);

  if (!entry) {
    return `
      <div class="gn-empty-state">
        <h3>Set your location to see local coverage</h3>
        <p>We match local outlets, coverage counts, and bias data for your city.</p>
        <button class="local-empty-btn" data-action="open-location-picker">Set Location</button>
      </div>`;
  }

  const state = store.getState();
  const term = state.searchQuery.toLowerCase().trim();
  const localStories = getLocalStories(entry).filter(story =>
    !term ||
    story.title.toLowerCase().includes(term) ||
    story.neutralSummary.toLowerCase().includes(term)
  );

  return `
    <section class="gn-local-page" aria-label="Local news feed">
      <div class="local-page-header">
        <div class="local-page-title-block">
          <span class="local-page-eyebrow">${state.edition.flag} ${state.edition.label} edition</span>
          <h1 class="local-page-title">Daily Local News &middot; ${entry.city}</h1>
          <p class="local-page-sub">
            ${entry.region}, ${entry.country} &middot;
            ${localStories.length} stories tracked across Left, Center, and Right outlets
            ${term ? ` matching "${state.searchQuery}"` : ''}.
          </p>
        </div>
        <div class="local-page-actions">
          <button class="local-page-btn secondary" data-action="open-location-picker">Change location</button>
          <button class="local-page-btn" data-action="navigate-view" data-view="feed">Back to top stories</button>
        </div>
      </div>

      <div class="local-page-grid">
        <div class="local-page-list">
          ${localStories.map(story => renderStoryCard(story)).join('')}
        </div>
        <div class="local-page-aside">
          ${renderLocalNewsWidget()}
        </div>
      </div>
    </section>`;
}

function render() {
  const state = store.getState();
  const filteredStories = getFilteredStories();

  // Update Theme
  document.documentElement.setAttribute('data-theme', state.theme);
  if (state.theme === 'dark') {
    themeIconDark.classList.remove('hidden');
    themeIconLight.classList.add('hidden');
  } else {
    themeIconDark.classList.add('hidden');
    themeIconLight.classList.remove('hidden');
  }

  // Bookmarks Badge
  if (state.bookmarks.length > 0) {
    bookmarksCounterBadge.textContent = state.bookmarks.length;
    bookmarksCounterBadge.classList.remove('hidden');
  } else {
    bookmarksCounterBadge.classList.add('hidden');
  }
  bookmarksNavBtn.classList.toggle('active', showBookmarksOnly);

  // Header account state: Log in / avatar, Subscribe pill, edition flag
  const loginBtn = document.querySelector('.gn-login-text-btn');
  if (loginBtn) {
    if (state.account) {
      loginBtn.textContent = getInitials(state.account.name);
      loginBtn.classList.add('signed-in');
      loginBtn.title = `${state.account.name} · ${getPlan(state.account.plan).name} plan`;
    } else {
      loginBtn.textContent = 'Log in';
      loginBtn.classList.remove('signed-in');
      loginBtn.title = 'Log in or create an account';
    }
  }

  const subscribeBtn = document.querySelector('.gn-subscribe-pill-btn');
  if (subscribeBtn) {
    const paidPlan = state.account && state.account.plan !== 'free';
    subscribeBtn.textContent = paidPlan ? `${getPlan(state.account.plan).name} ✓` : 'Subscribe';
    subscribeBtn.classList.toggle('active', Boolean(paidPlan));
  }

  const flagBtn = document.querySelector('.gn-country-flag-btn');
  if (flagBtn) {
    flagBtn.textContent = state.edition.flag;
    flagBtn.title = `Edition: ${state.edition.label}`;
  }

  const footerCountryBtn = document.querySelector('.country-selector-btn span');
  if (footerCountryBtn) {
    footerCountryBtn.textContent = `${state.edition.flag} ${state.edition.label}`;
  }

  // Update Navigation Tabs (gn-nav-item, gn-top-link)
  document.querySelectorAll('.gn-nav-item, .gn-top-link').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === state.activeView);
  });

  // Update Category Chips (m3-filter-chip, gn-cat-tab)
  document.querySelectorAll('.m3-filter-chip, .gn-cat-tab').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === state.activeCategory);
  });

  // Show Category Strip on feed & matrix
  if (categoryStrip) {
    categoryStrip.style.display =
      (state.activeView === 'feed' || state.activeView === 'matrix') ? 'block' : 'none';
  }

  // Update Lens buttons
  document.querySelectorAll('.lens-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.perspective === state.globalPerspective);
  });

  // Render View Content
  if (state.selectedStoryId) {
    const liveStory = findLiveStory(state.selectedStoryId);
    appView.innerHTML = liveStory
      ? renderLiveArticleModal(liveStory)
      : renderStoryModal(findStory(state.selectedStoryId));
    modalContainer.innerHTML = '';
    document.body.style.overflow = '';
  } else {
    modalContainer.innerHTML = '';
    document.body.style.overflow = '';
    switch (state.activeView) {
      case 'matrix':
        appView.innerHTML = renderHeadlineMatrix(filteredStories);
        break;

      case 'blindspots':
        appView.innerHTML = renderBlindspotRadar(NEWS_STORIES);
        break;

      case 'directory':
        appView.innerHTML = renderMediaDirectory();
        attachDirectoryEvents(appView, () => render());
        break;

      case 'diet':
        appView.innerHTML = renderDietTracker();
        break;

      case 'local':
        appView.innerHTML = renderLocalFeed();
        break;

      case 'feed':
      default:
        appView.innerHTML = renderHomeFeed(filteredStories);
        break;
    }
  }
}

// Global Event Delegation
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action], [data-category]');
  if (!target) return;

  // Category filter click
  if (target.dataset.category) {
    if (store.getState().selectedStoryId) {
      store.closeStoryModal();
    }
    store.setCategory(target.dataset.category);
    // Footer topic links also carry a target view
    if (target.dataset.view && store.getState().activeView !== target.dataset.view) {
      store.setView(target.dataset.view);
    }
    return;
  }

  const action = target.dataset.action;

  switch (action) {
    case 'navigate-view': {
      const view = target.dataset.view;
      showBookmarksOnly = false;
      store.setView(view);
      break;
    }

    case 'toggle-bookmarks-filter': {
      showBookmarksOnly = !showBookmarksOnly;
      if (showBookmarksOnly && store.getState().activeView !== 'feed') {
        store.setView('feed');
      } else {
        render();
      }
      break;
    }

    case 'set-perspective': {
      const storyId = target.dataset.storyId;
      const perspective = target.dataset.perspective;
      store.setStoryPerspective(storyId, perspective);
      render();
      break;
    }

    case 'set-global-perspective': {
      const perspective = target.dataset.perspective;
      store.setGlobalPerspective(perspective);
      // Synchronize all stories
      NEWS_STORIES.forEach(s => store.setStoryPerspective(s.id, perspective));
      render();
      break;
    }

    case 'open-modal': {
      const storyId = target.dataset.storyId;
      const story = findStory(storyId);
      if (story) {
        store.openStoryModal(storyId, story.biasDistribution);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      break;
    }

    case 'close-modal':
    case 'close-modal-backdrop': {
      if (action === 'close-modal-backdrop' && e.target !== target) return;
      store.closeStoryModal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    }

    case 'refresh-live': {
      refreshLiveFeed().then(() => render());
      break;
    }

    case 'open-external':
      // Outbound publisher links keep their default browser behaviour.
      break;

    case 'toggle-bookmark': {
      const storyId = target.dataset.storyId;
      store.toggleBookmark(storyId);
      break;
    }

    case 'modal-perspective': {
      const storyId = target.dataset.storyId;
      const perspective = target.dataset.perspective;
      store.setStoryPerspective(storyId, perspective);
      render();
      break;
    }

    case 'modal-filter-sources': {
      const filter = target.dataset.filter;
      setModalSourceFilter(filter);
      render();
      break;
    }

    case 'vote-poll': {
      const storyId = target.dataset.storyId;
      const answer = target.dataset.answer;
      store.recordPollVote(storyId, answer);
      render();
      break;
    }

    case 'clear-poll-vote': {
      store.clearPollVote(target.dataset.storyId);
      render();
      break;
    }

    case 'set-blindspot-filter': {
      const filter = target.dataset.filter;
      store.setBlindspotFilter(filter);
      render();
      break;
    }

    case 'navigate-blindspot': {
      const view = target.dataset.view;
      const filter = target.dataset.filter;
      store.setBlindspotFilter(filter);
      store.setView(view);
      break;
    }

    case 'reset-diet': {
      store.resetDiet();
      render();
      break;
    }

    case 'toggle-follow-topic': {
      store.toggleFollowTopic(target.dataset.topic);
      break;
    }

    case 'open-subscribe':
      openAccountModal('subscribe', render);
      break;

    case 'open-signin':
      openAccountModal('signin', render);
      break;

    case 'open-edition':
      openAccountModal('edition', render);
      break;

    case 'unsubscribe-newsletter': {
      store.unsubscribeNewsletter(target.dataset.newsletterId);
      break;
    }

    case 'open-location-picker':
      openLocationPicker(render);
      break;

    case 'set-local-city': {
      store.setLocalCity(target.dataset.city);
      closeLocationPicker();
      break;
    }

    case 'clear-local-city': {
      store.clearLocalCity();
      if (store.getState().activeView === 'local') store.setView('feed');
      break;
    }

    case 'view-local-feed': {
      if (!store.getState().localCity) {
        openLocationPicker(render);
      } else {
        store.setView('local');
      }
      break;
    }
  }
});

// Newsletter signups + local city form submissions
document.addEventListener('submit', (e) => {
  const newsletterForm = e.target.closest('[data-newsletter-id]');
  if (newsletterForm) {
    e.preventDefault();
    handleNewsletterSubmit(newsletterForm);
    return;
  }

  const cityForm = e.target.closest('[data-local-city-form]');
  if (cityForm) {
    e.preventDefault();
    handleLocalCitySubmit(cityForm, render);
  }
});

// Header + footer account / edition triggers (inert controls before this pass)
document.addEventListener('click', (e) => {
  const subscribePill = e.target.closest('.gn-subscribe-pill-btn');
  if (subscribePill) {
    openAccountModal('subscribe', render);
    return;
  }

  const loginBtn = e.target.closest('.gn-login-text-btn');
  if (loginBtn) {
    openAccountModal('signin', render);
    return;
  }

  const editionTrigger = e.target.closest('.gn-country-flag-btn, .country-selector-btn');
  if (editionTrigger) {
    openAccountModal('edition', render);
  }
});

// Modal slider input
document.addEventListener('input', (e) => {
  if (e.target && e.target.dataset.action === 'modal-slider') {
    const val = parseInt(e.target.value, 10);
    const storyId = e.target.dataset.storyId;
    let perspective = 'center';
    if (val <= 33) perspective = 'left';
    else if (val >= 67) perspective = 'right';
    store.setStoryPerspective(storyId, perspective);
    render();
  }
});

// Search input handling
let searchDebounce = null;
globalSearchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  clearSearchBtn.classList.toggle('hidden', !query);

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    store.setSearch(query);
  }, 180);
});

clearSearchBtn.addEventListener('click', () => {
  globalSearchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  store.setSearch('');
  globalSearchInput.focus();
});

// Theme switcher
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = store.getState().theme;
  store.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ── Keyboard Shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Skip if focus is inside an input, textarea, or contenteditable
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;

  const state = store.getState();

  switch (e.key) {
    case 'Escape':
      if (isAccountModalOpen()) {
        closeAccountModal();
      } else if (isLocationPickerOpen()) {
        closeLocationPicker();
      } else if (document.getElementById('outlet-dossier-overlay')) {
        closeOutletDossier();
      } else if (document.getElementById('news-chat-drawer')) {
        closeNewsChatDrawer();
      } else if (document.getElementById('vantage-audio-player')) {
        closeAudioPlayer();
      } else if (state.selectedStoryId) {
        store.closeStoryModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      break;

    // Perspective shortcuts — only active on article detail page
    case 'l': case 'L':
      if (state.selectedStoryId) {
        store.setStoryPerspective(state.selectedStoryId, 'left');
        render();
        showKeyboardHint('Perspective: Left');
      }
      break;

    case 'c': case 'C':
      if (state.selectedStoryId) {
        store.setStoryPerspective(state.selectedStoryId, 'center');
        render();
        showKeyboardHint('Perspective: Center');
      }
      break;

    case 'r': case 'R':
      if (state.selectedStoryId) {
        store.setStoryPerspective(state.selectedStoryId, 'right');
        render();
        showKeyboardHint('Perspective: Right');
      }
      break;

    case 'b': case 'B':
      if (state.selectedStoryId) {
        store.setStoryPerspective(state.selectedStoryId, 'balanced');
        render();
        showKeyboardHint('Perspective: Balanced');
      }
      break;

    case '?':
      showKeyboardShortcutsHint();
      break;
  }
});

// Keyboard hint toast
let hintTimeout = null;
function showKeyboardHint(text) {
  let hint = document.getElementById('keyboard-hint-toast');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'keyboard-hint-toast';
    hint.className = 'keyboard-hint-toast';
    document.body.appendChild(hint);
  }
  hint.textContent = text;
  hint.classList.add('visible');
  clearTimeout(hintTimeout);
  hintTimeout = setTimeout(() => hint.classList.remove('visible'), 1800);
}

function showKeyboardShortcutsHint() {
  let panel = document.getElementById('keyboard-shortcuts-panel');
  if (panel) { panel.remove(); return; }
  panel = document.createElement('div');
  panel.id = 'keyboard-shortcuts-panel';
  panel.className = 'keyboard-shortcuts-panel';
  panel.innerHTML = `
    <div class="ks-inner">
      <div class="ks-header">
        <h3>Keyboard Shortcuts</h3>
        <button onclick="this.closest('#keyboard-shortcuts-panel').remove()">&times;</button>
      </div>
      <div class="ks-grid">
        <div class="ks-row"><kbd>L</kbd><span>Left perspective</span></div>
        <div class="ks-row"><kbd>C</kbd><span>Center perspective</span></div>
        <div class="ks-row"><kbd>R</kbd><span>Right perspective</span></div>
        <div class="ks-row"><kbd>B</kbd><span>Balanced / Summary</span></div>
        <div class="ks-row"><kbd>Esc</kbd><span>Close / Go back</span></div>
        <div class="ks-row"><kbd>?</kbd><span>Toggle this panel</span></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('visible'));
  setTimeout(() => { if (panel.parentNode) panel.remove(); }, 5000);
}

// ── URL Hash Routing ────────────────────────────────────────────────────────
const HASH_VIEW_MAP = {
  'feed': 'feed',
  'matrix': 'matrix',
  'blindspots': 'blindspots',
  'directory': 'directory',
  'diet': 'diet',
};

function syncHashFromState() {
  const state = store.getState();
  if (state.selectedStoryId) {
    history.replaceState(null, '', `#/story/${state.selectedStoryId}`);
  } else {
    const view = state.activeView || 'feed';
    history.replaceState(null, '', view === 'feed' ? '#/' : `#/${view}`);
  }
}

function applyHashToState() {
  const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
  if (!hash || hash === '/') {
    store.setView('feed');
    return;
  }
  if (hash.startsWith('story/')) {
    const storyId = hash.replace('story/', '');
    const story = findStory(storyId);
    if (story) {
      store.openStoryModal(storyId, story.biasDistribution);
    } else {
      store.setView('feed');
    }
    return;
  }
  const view = HASH_VIEW_MAP[hash];
  if (view) store.setView(view);
}

window.addEventListener('hashchange', applyHashToState);
store.subscribe(syncHashFromState);

// ── Audio player global clicks ──────────────────────────────────────────────
document.addEventListener('click', (e) => {
  // Audio player control clicks
  if (handleAudioPlayerClick(e)) return;
  // News chat clicks
  if (handleChatClick(e)) return;
});

// ── Outlet dossier: clicks on wf-avatar or stream outlet badges ─────────────
document.addEventListener('click', (e) => {
  const outletTrigger = e.target.closest('[data-outlet-id]');
  if (outletTrigger) {
    const outletId = outletTrigger.dataset.outletId;
    openOutletDossier(outletId);
    return;
  }

  const closeDossier = e.target.closest('[data-action="close-outlet-dossier"]');
  if (closeDossier) {
    closeOutletDossier();
    return;
  }

  // Open news chat from sidebar or article page
  const chatBtn = e.target.closest('[data-action="open-news-chat"]');
  if (chatBtn) {
    const state = store.getState();
    const storyCtx = state.selectedStoryId
      ? findStory(state.selectedStoryId)
      : null;
    openNewsChatDrawer(storyCtx);
    return;
  }

  // Open audio player from podcast listen button
  const listenBtn = e.target.closest('[data-action="listen-podcast"]');
  if (listenBtn) {
    openAudioPlayer({
      title: listenBtn.dataset.title || 'Global National: Oct. 17, 2025 • AI Force & Tech Cold War',
      source: listenBtn.dataset.source || 'Global National',
      sourceBg: listenBtn.dataset.sourceBg || '#bb1919',
    });
    return;
  }

  // Jump to timestamp
  const timestampBtn = e.target.closest('[data-action="jump-timestamp"]');
  if (timestampBtn) {
    const seekTo = parseInt(timestampBtn.dataset.seekTo || '318', 10);
    openAudioPlayer({ seekTo });
    return;
  }
});

// ── Footer newsletter (outside the re-rendered app view) ─────────────────────
function mountFooterNewsletter() {
  const container = document.getElementById('footerNewsletter');
  if (!container) return;

  const newsletterState = JSON.stringify(store.getState().newsletters);
  if (container.dataset.newsletterState === newsletterState) return;
  container.dataset.newsletterState = newsletterState;

  container.innerHTML = `
    <span class="footer-nav-heading">Toggle Daily</span>
    <p class="footer-newsletter-desc">${NEWSLETTERS['toggle-daily'].description}</p>
    ${renderNewsletterForm({ newsletterId: 'toggle-daily', label: 'Sign up' })}
  `;
}

// ── Boot app ────────────────────────────────────────────────────────────────
store.subscribe(() => render());
store.subscribe(() => mountFooterNewsletter());
mountFooterNewsletter();

// Live wire: pull real articles from the API, then re-render on every update.
subscribeLiveFeed(() => render());
refreshLiveFeed();

// Apply hash on initial load
applyHashToState();

// If no hash caused a state change, do initial render
if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
  render();
}

console.log('Toggle News engine active — Ground News architecture loaded. Press ? for keyboard shortcuts.');
