// Toggle News - Main Controller
// Faithfully modeled on Ground News Multi-Column Architecture & Media Literacy Engine

import { store } from './modules/state.js';
import { NEWS_STORIES } from './data/newsData.js';
import { renderStoryCard } from './modules/storyCard.js';
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

// ── Ground News–style Homepage Feed ──────────────────────────────────────────
function renderHomeFeed(stories) {
  if (stories.length === 0) {
    return `
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

  return `
    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 1: DAILY BRIEFING (Ground News 3-Column Top Hero Grid)
         ══════════════════════════════════════════════════════════════════ -->
    <section class="gn-briefing-section" aria-label="Daily Briefing">
      <div class="briefing-header-bar">
        <h2 class="briefing-section-title">Daily Briefing</h2>
      </div>

      <div class="briefing-trio-grid">

        <!-- Left Column: Ukraine Guided Munitions Story -->
        <div class="briefing-col-left briefing-interactive-card" data-action="open-modal" data-story-id="${ukraineStory.id}">
          <div class="briefing-card-media">
            <img src="${ukraineStory.heroImage}" alt="${ukraineStory.title}" loading="lazy" />
            <div class="briefing-media-tag">${ukraineStory.category}</div>
          </div>
          <div class="briefing-card-content">
            <h3 class="briefing-card-title">${ukraineStory.title}</h3>
            <p class="briefing-card-snippet">Ukraine has pressed the US for the Army Tactical Missile Systems (ATACMS) to strike deeper behind Russian lines, as defense officials evaluate strategic stockpile thresholds.</p>
            
            <div class="briefing-bias-bar-wrap">
              <div class="gn-bias-strip">
                <div class="gn-seg gn-seg-left"   style="width:${ukraineStory.biasDistribution.left}%"   title="Left ${ukraineStory.biasDistribution.left}%"></div>
                <div class="gn-seg gn-seg-center" style="width:${ukraineStory.biasDistribution.center}%" title="Center ${ukraineStory.biasDistribution.center}%"></div>
                <div class="gn-seg gn-seg-right"  style="width:${ukraineStory.biasDistribution.right}%"  title="Right ${ukraineStory.biasDistribution.right}%"></div>
              </div>
              <div class="briefing-sources-count-line">
                <span class="src-count-num">${ukraineStory.sourceCount} sources</span>
                <span class="src-dot-sep">·</span>
                <span class="src-lean-info">${ukraineStory.biasDistribution.left}% from Left</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Center Column: Trump AI Force Main Hero + 2 Stacked Items -->
        <div class="briefing-col-center">
          <!-- Main Large Hero Card -->
          <div class="briefing-hero-card briefing-interactive-card" data-action="open-modal" data-story-id="${trumpStory.id}">
            <div class="briefing-hero-img-wrap">
              <img src="${trumpStory.heroImage}" alt="${trumpStory.title}" loading="lazy" />
              <div class="briefing-hero-overlay">
                <span class="hero-cat-tag">${trumpStory.category}</span>
                <h2 class="briefing-hero-headline">${trumpStory.title}</h2>
                <div class="briefing-hero-bias-row">
                  <div class="gn-bias-strip">
                    <div class="gn-seg gn-seg-left"   style="width:${trumpStory.biasDistribution.left}%"   title="Left ${trumpStory.biasDistribution.left}%"></div>
                    <div class="gn-seg gn-seg-center" style="width:${trumpStory.biasDistribution.center}%" title="Center ${trumpStory.biasDistribution.center}%"></div>
                    <div class="gn-seg gn-seg-right"  style="width:${trumpStory.biasDistribution.right}%"  title="Right ${trumpStory.biasDistribution.right}%"></div>
                  </div>
                  <div class="briefing-hero-meta-line">
                    <span>${trumpStory.sourceCount} sources</span>
                    <span>·</span>
                    <span>${trumpStory.biasDistribution.right}% Right lean</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Two Stacked News Items Directly Below Hero -->
          <div class="briefing-sub-items">
            <!-- Sub item 1: Trump Tax Plan -->
            <div class="briefing-sub-item briefing-interactive-card" data-action="open-modal" data-story-id="${subStory1.id}">
              <div class="sub-item-text">
                <h4 class="sub-item-title">${subStory1.title}</h4>
                <div class="sub-item-meta">
                  <div class="gn-bias-strip mini">
                    <div class="gn-seg gn-seg-left"   style="width:${subStory1.biasDistribution.left}%"></div>
                    <div class="gn-seg gn-seg-center" style="width:${subStory1.biasDistribution.center}%"></div>
                    <div class="gn-seg gn-seg-right"  style="width:${subStory1.biasDistribution.right}%"></div>
                  </div>
                  <span class="sub-src-count">${subStory1.sourceCount} sources</span>
                </div>
              </div>
              <img class="sub-item-thumb" src="${subStory1.heroImage}" alt="" loading="lazy" />
            </div>

            <!-- Sub item 2: Metro Gunman -->
            <div class="briefing-sub-item briefing-interactive-card" data-action="open-modal" data-story-id="${subStory2.id}">
              <div class="sub-item-text">
                <h4 class="sub-item-title">${subStory2.title}</h4>
                <div class="sub-item-meta">
                  <div class="gn-bias-strip mini">
                    <div class="gn-seg gn-seg-left"   style="width:${subStory2.biasDistribution.left}%"></div>
                    <div class="gn-seg gn-seg-center" style="width:${subStory2.biasDistribution.center}%"></div>
                    <div class="gn-seg gn-seg-right"  style="width:${subStory2.biasDistribution.right}%"></div>
                  </div>
                  <span class="sub-src-count">${subStory2.sourceCount} sources</span>
                </div>
              </div>
              <img class="sub-item-thumb" src="${subStory2.heroImage}" alt="" loading="lazy" />
            </div>
          </div>
        </div>

        <!-- Right Column: Ground News Blindspot Widget -->
        <div class="briefing-col-blindspot">
          <div class="blindspot-col-header">
            <div class="blindspot-brand-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>BLINDSPOT™</span>
            </div>
            <p class="blindspot-col-subtitle">News stories from the left, center, or right that are getting significantly less coverage from the other side.</p>
          </div>

          <div class="blindspot-stacked-cards">
            <!-- Blindspot Card 1: Left Blindspot (Hormuz Ocean) -->
            <div class="blindspot-stack-card briefing-interactive-card" data-action="open-modal" data-story-id="${bsLeft.id}">
              <div class="stack-card-img">
                <img src="${bsLeft.heroImage}" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video coverage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="stack-blindspot-badge badge-left-blind">Left Blindspot</span>
              </div>
              <div class="stack-card-body">
                <h4 class="stack-card-headline">${bsLeft.title}</h4>
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left"   style="width:${bsLeft.biasDistribution.left}%"></div>
                  <div class="gn-seg gn-seg-center" style="width:${bsLeft.biasDistribution.center}%"></div>
                  <div class="gn-seg gn-seg-right"  style="width:${bsLeft.biasDistribution.right}%"></div>
                </div>
                <div class="stack-card-meta">
                  <span class="lean-stat right-heavy">${bsLeft.biasDistribution.right}% Right</span>
                  <span class="stat-sep">vs</span>
                  <span class="lean-stat left-light">${bsLeft.biasDistribution.left}% Left</span>
                </div>
              </div>
            </div>

            <!-- Blindspot Card 2: Right Blindspot (Michigan Rally) -->
            <div class="blindspot-stack-card briefing-interactive-card" data-action="open-modal" data-story-id="${bsRight.id}">
              <div class="stack-card-img">
                <img src="${bsRight.heroImage}" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video coverage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="stack-blindspot-badge badge-right-blind">Right Blindspot</span>
              </div>
              <div class="stack-card-body">
                <h4 class="stack-card-headline">${bsRight.title}</h4>
                <div class="gn-bias-strip mini">
                  <div class="gn-seg gn-seg-left"   style="width:${bsRight.biasDistribution.left}%"></div>
                  <div class="gn-seg gn-seg-center" style="width:${bsRight.biasDistribution.center}%"></div>
                  <div class="gn-seg gn-seg-right"  style="width:${bsRight.biasDistribution.right}%"></div>
                </div>
                <div class="stack-card-meta">
                  <span class="lean-stat left-heavy">${bsRight.biasDistribution.left}% Left</span>
                  <span class="stat-sep">vs</span>
                  <span class="lean-stat right-light">${bsRight.biasDistribution.right}% Right</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 2: TOP NEWS STORIES (Header, Sub-filter Pills, & Feed)
         ══════════════════════════════════════════════════════════════════ -->
    <div class="gn-feed-section-header">
      <div class="section-title-wrap">
        <h2 class="gn-main-section-heading">Top News Stories</h2>
      </div>
    </div>

    <!-- HORIZONTAL SUB-FILTER PILLS (Matching Ground News reference) -->
    <div class="gn-secondary-filter-bar">
      <div class="filter-pills-track">
        <button class="gn-pill-chip active">All</button>
        <button class="gn-pill-chip">Breaking News (1)</button>
        <button class="gn-pill-chip">Free to Read (10)</button>
        <button class="gn-pill-chip">Blindspots (4)</button>
        <button class="gn-pill-chip">Fact Checked</button>
        <button class="gn-pill-chip">Ground AI</button>
        <button class="gn-pill-chip">High Reliability</button>
        <button class="gn-pill-chip">Deep Dives</button>
      </div>
    </div>

    <!-- Two-column layout: Main Feed + Sidebar -->
    <div class="gn-homepage-columns">

      <!-- LEFT: Main story feed rows with right thumbnails -->
      <section class="gn-main-column" aria-label="Top stories feed">
        <div class="gn-cards-stream">
          ${mainFeedStories.map(story => renderStoryCard(story)).join('')}
        </div>
      </section>

      <!-- RIGHT: Ground News Intelligence Sidebar -->
      <aside class="gn-sidebar-column" aria-label="News intelligence widgets">

        <!-- Sidebar Top Action Button -->
        <button class="gn-sidebar-customize-btn" data-action="navigate-view" data-view="diet">
          <span>Customize your feed</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <!-- Widget 1: My News Chat (Ground News AI) -->
        <div class="gn-sidebar-widget widget-news-chat">
          <div class="chat-widget-header">
            <div class="chat-title-group">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="chat-widget-title">My News Chat</span>
            </div>
            <span class="chat-ai-pill">AI</span>
          </div>
          <p class="chat-widget-desc">Understand both sides of any news story. Ask any question.</p>
          
          <div class="chat-spectrum-meter">
            <span class="spec-label left">Left</span>
            <div class="spec-bar">
              <div class="spec-half left" style="width:50%"></div>
              <div class="spec-half right" style="width:50%"></div>
            </div>
            <span class="spec-label right">Right</span>
          </div>

          <button class="chat-action-btn" data-action="open-modal" data-story-id="${trumpStory.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Chat with News AI
          </button>
        </div>

        <!-- Widget 2: Daily Local News -->
        <div class="gn-sidebar-widget widget-local-news">
          <div class="local-news-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="local-title">Daily Local News</span>
          </div>
          <p class="local-desc">Get stories and local alerts in your neighborhood &amp; country.</p>
          
          <div class="local-input-row">
            <input type="text" class="local-zip-input" placeholder="Enter zip or city..." aria-label="Enter zip code" />
            <button class="local-submit-btn">Subscribe</button>
          </div>

          <button class="local-gps-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            Use Current Location
          </button>
        </div>

      </aside>
    </div>


    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 3: ISRAEL-GAZA NEWS (Dedicated Ground News Topic Spotlight)
         ══════════════════════════════════════════════════════════════════ -->
    <section class="gn-topic-spotlight-section" aria-label="Israel-Gaza News">
      <!-- Section Header -->
      <div class="spotlight-header-bar">
        <h2 class="spotlight-title">Israel-Gaza News</h2>
        <div class="spotlight-actions">
          <button class="spotlight-follow-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Follow
          </button>
          <button class="spotlight-viewall-btn" data-action="open-modal" data-story-id="${gazaStory.id}">
            View all (42) <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>

      <!-- Top Spotlight 2-column: Big Story on Left, Blindspots & Analysis on Right -->
      <div class="spotlight-trio-layout">
        <!-- Left Sub-column: Large Featured Card -->
        <div class="spotlight-main-featured briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
          <span class="spotlight-col-subheading">Latest Israel-Gaza News</span>
          <div class="spotlight-featured-card">
            <div class="spotlight-img-wrap">
              <img src="${gazaStory.heroImage}" alt="${gazaStory.title}" loading="lazy" />
              <div class="spotlight-overlay-meta">
                <span class="spotlight-src-count">${gazaStory.sourceCount} sources</span>
              </div>
            </div>
            <div class="spotlight-card-body">
              <div class="gn-bias-strip">
                <div class="gn-seg gn-seg-left"   style="width:${gazaStory.biasDistribution.left}%"></div>
                <div class="gn-seg gn-seg-center" style="width:${gazaStory.biasDistribution.center}%"></div>
                <div class="gn-seg gn-seg-right"  style="width:${gazaStory.biasDistribution.right}%"></div>
              </div>
              <h3 class="spotlight-card-headline">${gazaStory.title}</h3>
              <p class="spotlight-card-desc">${gazaStory.neutralSummary.slice(0, 140)}…</p>
            </div>
          </div>
        </div>

        <!-- Right Sub-column: 2 Blindspot Cards + On The Ground Box -->
        <div class="spotlight-side-blindspots">
          <span class="spotlight-col-subheading">Israel-Gaza Blindspots</span>
          
          <div class="spotlight-blindspot-cards-row">
            <!-- Blindspot 1 -->
            <div class="spotlight-mini-blindspot briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <div class="mini-bs-thumb">
                <img src="https://images.unsplash.com/photo-1579547621113-e4bb2a08f51a?auto=format&fit=crop&w=400&q=80" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video footage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="mini-bs-badge left">72% Left Blindspot</span>
              </div>
              <h5 class="mini-bs-title">Civilian police prepare to regulate wheat distribution in North Gaza</h5>
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:28%"></div>
                <div class="gn-seg gn-seg-center" style="width:18%"></div>
                <div class="gn-seg gn-seg-right" style="width:54%"></div>
              </div>
            </div>

            <!-- Blindspot 2 -->
            <div class="spotlight-mini-blindspot briefing-interactive-card" data-action="open-modal" data-story-id="${gazaStory.id}">
              <div class="mini-bs-thumb">
                <img src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80" alt="" loading="lazy" />
                <span class="media-cam-icon" title="Video footage available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98z"/></svg>
                </span>
                <span class="mini-bs-badge right">81% Right Blindspot</span>
              </div>
              <h5 class="mini-bs-title">Hostage families stage sit-in in Tel Aviv pressing for Cairo compromise</h5>
              <div class="gn-bias-strip mini">
                <div class="gn-seg gn-seg-left" style="width:68%"></div>
                <div class="gn-seg gn-seg-center" style="width:19%"></div>
                <div class="gn-seg gn-seg-right" style="width:13%"></div>
              </div>
            </div>
          </div>

          <!-- On the Ground Box -->
          <div class="on-the-ground-box">
            <div class="otg-text">
              <h4 class="otg-title">On the Ground</h4>
              <p class="otg-desc">Get the daily 360-degree briefing on the Israel-Gaza war and what each side is downplaying.</p>
            </div>
            <button class="otg-action-btn" data-action="open-modal" data-story-id="${gazaStory.id}">Read analysis</button>
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
          <button class="spotlight-follow-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Follow
          </button>
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
    const selectedStory = NEWS_STORIES.find(s => s.id === state.selectedStoryId);
    appView.innerHTML = renderStoryModal(selectedStory);
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
      const story = NEWS_STORIES.find(s => s.id === storyId);
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
      if (document.getElementById('outlet-dossier-overlay')) {
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
    const story = NEWS_STORIES.find(s => s.id === storyId);
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
      ? NEWS_STORIES.find(s => s.id === state.selectedStoryId)
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

// ── Boot app ────────────────────────────────────────────────────────────────
store.subscribe(() => render());

// Apply hash on initial load
applyHashToState();

// If no hash caused a state change, do initial render
if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
  render();
}

console.log('Toggle News engine active — Ground News architecture loaded. Press ? for keyboard shortcuts.');
