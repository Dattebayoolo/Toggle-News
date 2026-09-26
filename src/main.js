// Toggle News - Main Controller
// Faithfully modeled on Ground News Multi-Column Architecture & Media Literacy Engine

import { store } from './modules/state.js';
import { renderHomeFeedView, renderLocalFeedView } from './modules/homeFeed.js';
import { renderHeadlineMatrix } from './modules/headlineMatrix.js';
import { renderBlindspotRadar } from './modules/blindspotRadar.js';
import { renderMediaDirectory, attachDirectoryEvents } from './modules/mediaDirectory.js';
import { renderDietTracker } from './modules/dietTracker.js';
import { renderStoryModal, setModalSourceFilter } from './modules/storyModal.js';
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
  handleLocalCitySubmit,
  openLocationPicker,
  closeLocationPicker,
  isLocationPickerOpen
} from './modules/localNews.js';
import { handleNewsletterSubmit, renderNewsletterForm, NEWSLETTERS } from './modules/newsletterSignup.js';
import {
  refreshLiveFeed,
  subscribeLiveFeed,
  getLiveStories,
  getLiveState,
  findLiveStory,
  setLeanFilter,
  renderLiveArticleModal,
  loadArticleContent
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
// Curated stories have been removed - every story now comes from the wire.
// One lookup keeps bookmarks, hash routing, and the article page consistent.
function findStory(id) {
  return findLiveStory(id);
}

/**
 * Open an article page and pull its full text in the background. The page shows
 * a skeleton first and is re-rendered as soon as the body arrives.
 */
function openStoryWithContent(story) {
  store.openStoryModal(story.id, story.biasDistribution);
  loadArticleContent(story).then((record) => {
    if (!record) return; // no article id, or fetching is unavailable
    if (store.getState().selectedStoryId !== story.id) return; // reader moved on
    render();
  });
}

function render() {
  const state = store.getState();

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
        // Framing comparison needs curated per-event write-ups. None exist, so the
        // view renders its explanatory empty state.
        appView.innerHTML = renderHeadlineMatrix([]);
        break;

      case 'blindspots':
        // Blindspot classification needs same-event grouping. None exists, so the
        // view renders its explanatory empty state.
        appView.innerHTML = renderBlindspotRadar([]);
        break;

      case 'directory':
        appView.innerHTML = renderMediaDirectory();
        attachDirectoryEvents(appView, () => render());
        break;

      case 'diet':
        appView.innerHTML = renderDietTracker();
        break;

      case 'local':
        appView.innerHTML = renderLocalFeedView(state);
        break;

      case 'feed':
      default:
        appView.innerHTML = renderHomeFeedView({
          liveStories: getLiveStories(),
          category: state.activeCategory,
          query: state.searchQuery,
          liveState: getLiveState(),
          bookmarksOnly: showBookmarksOnly,
          bookmarkedIds: state.bookmarks
        });
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
      // Perspective framing only ever existed for curated stories. The preference
      // is still stored, but there is nothing to re-frame on wire articles.
      store.setGlobalPerspective(target.dataset.perspective);
      render();
      break;
    }

    case 'open-modal': {
      const storyId = target.dataset.storyId;
      const story = findStory(storyId);
      if (story) {
        openStoryWithContent(story);
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

    case 'filter-lean': {
      setLeanFilter(target.dataset.lean);
      render();
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
      openStoryWithContent(story);
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
      title: listenBtn.dataset.title || null,
      source: listenBtn.dataset.source || null,
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
