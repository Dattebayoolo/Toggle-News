// Toggle News - Main Controller
// Faithfully modeled on Ground News Multi-Column Architecture & Media Literacy Engine

import { store } from './modules/state.js';
import './ui-library/audio.js'; // Toggle UI Library Sound Engine
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
import { refreshAccountSession } from './modules/accountSession.js';
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
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
const paletteBtn = document.getElementById('paletteBtn');
const paletteMenu = document.getElementById('paletteMenu');

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
        // Init the briefing carousel after each feed render
        requestAnimationFrame(() => initCarousel(document.getElementById('briefingCarousel')));
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

    case 'open-account': {
      // Navbar "Log in" (an <a href="/auth/login"> with data-action): open the
      // Toggle Account panel and suppress the fallback navigation. If this script
      // never runs, the href still takes the browser to the SSO entry point, so
      // the control can never be inert.
      e.preventDefault();
      openAccountModal(target.dataset.view || 'signin', render);
      break;
    }

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

    case 'carousel-prev': {
      const c = document.getElementById(target.dataset.target);
      if (c) carouselStep(c, -1);
      break;
    }

    case 'carousel-next': {
      const c = document.getElementById(target.dataset.target);
      if (c) carouselStep(c, +1);
      break;
    }

    case 'carousel-goto': {
      const c = document.getElementById(target.dataset.target);
      if (c) carouselGoTo(c, Number(target.dataset.slide));
      break;
    }
  }
});

// ── Briefing Carousel ────────────────────────────────────────────────────────
// Lightweight, self-contained carousel. No dependencies.
// Tracks state per-element so multiple instances on one page are independent.

const carouselState = new Map(); // carouselEl -> { current, count, autoTimer }

function carouselGetState(el) {
  if (!carouselState.has(el)) {
    const count = Number(el.dataset.count) || 1;
    carouselState.set(el, { current: 0, count });
  }
  return carouselState.get(el);
}

function carouselGoTo(el, index) {
  const state = carouselGetState(el);
  state.current = ((index % state.count) + state.count) % state.count;
  const track = el.querySelector('.briefing-carousel-track');
  if (track) track.style.transform = `translateX(-${state.current * 100}%)`;
  // Update dots
  el.querySelectorAll('.briefing-carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.current);
    dot.setAttribute('aria-selected', String(i === state.current));
  });
  // Update counter
  const counter = el.querySelector('[id$="CarouselCurrent"]');
  if (counter) counter.textContent = state.current + 1;
  // Pause & restart auto-play
  carouselRestartAuto(el);
}

function carouselStep(el, delta) {
  const state = carouselGetState(el);
  carouselGoTo(el, state.current + delta);
}

function carouselRestartAuto(el) {
  const state = carouselGetState(el);
  if (state.autoTimer) clearInterval(state.autoTimer);
  if (state.count < 2) return;
  state.autoTimer = setInterval(() => carouselStep(el, +1), 5000);
}

function initCarousel(el) {
  if (!el) return;
  // Reset state on re-render
  carouselState.delete(el);
  carouselGoTo(el, 0);
  carouselRestartAuto(el);
  // Pause on hover
  el.addEventListener('mouseenter', () => {
    const s = carouselGetState(el);
    if (s.autoTimer) { clearInterval(s.autoTimer); s.autoTimer = null; }
  }, { passive: true });
  el.addEventListener('mouseleave', () => carouselRestartAuto(el), { passive: true });
  // Touch / swipe support
  let touchStartX = 0;
  el.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) carouselStep(el, dx < 0 ? +1 : -1);
  }, { passive: true });
  // Keyboard support
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') carouselStep(el, -1);
    if (e.key === 'ArrowRight') carouselStep(el, +1);
  });
}

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
    // The delegated action handler already opened the panel for the data-action
    // link; this only covers older markup that had no action attribute.
    if (!loginBtn.dataset.action) openAccountModal('signin', render);
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

// Sound engine initialization & toggle button
function updateSoundIcon() {
  if (soundIcon && window.soundEngine) {
    soundIcon.textContent = window.soundEngine.enabled ? 'volume_up' : 'volume_off';
    soundToggleBtn?.classList.toggle('active', window.soundEngine.enabled);
  }
}
updateSoundIcon();

soundToggleBtn?.addEventListener('click', () => {
  if (window.soundEngine) {
    const isEnabled = window.soundEngine.toggleSound();
    updateSoundIcon();
    showKeyboardHint(isEnabled ? 'Sound Feedback: ON' : 'Sound Feedback: OFF');
  }
});

// Dynamic Material You Accent Color Picker
function applyPalette(h, s, l) {
  document.documentElement.style.setProperty('--md-primary-h', h);
  document.documentElement.style.setProperty('--md-primary-s', s);
  document.documentElement.style.setProperty('--md-primary-l', l);
  localStorage.setItem('toggle_palette_accent', JSON.stringify({ h, s, l }));
}

// Load saved palette accent if any
try {
  const savedPalette = JSON.parse(localStorage.getItem('toggle_palette_accent') || 'null');
  if (savedPalette) {
    applyPalette(savedPalette.h, savedPalette.s, savedPalette.l);
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.h === String(savedPalette.h));
    });
  }
} catch (e) {}

paletteBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  paletteMenu?.classList.toggle('hidden');
  window.soundEngine?.playSpring();
});

document.addEventListener('click', (e) => {
  if (paletteMenu && !paletteMenu.contains(e.target) && e.target !== paletteBtn) {
    paletteMenu.classList.add('hidden');
  }
});

paletteMenu?.addEventListener('click', (e) => {
  const swatch = e.target.closest('.color-swatch');
  if (!swatch) return;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');
  applyPalette(swatch.dataset.h, swatch.dataset.s, swatch.dataset.l);
  window.soundEngine?.playToggle(true);
  showKeyboardHint(`Accent: ${swatch.dataset.name || 'Selected'}`);
  paletteMenu.classList.add('hidden');
});

// Theme switcher with tactile sound
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = store.getState().theme;
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  store.setTheme(nextTheme);
  window.soundEngine?.playToggle(nextTheme === 'dark');
});

// Global tactile feedback for buttons, chips, tabs, and bookmarks
document.addEventListener('click', (e) => {
  const interactive = e.target.closest('button, .gn-top-link, .gn-cat-tab, .gn-live-chip, .gn-wire-card-bookmark, .gn-wire-card, .briefing-interactive-card, .toggle-btn');
  if (interactive && window.soundEngine) {
    window.soundEngine.playToggle(true);
  }
});

// ── Keyboard Shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Global search shortcut: Ctrl+K or Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    globalSearchInput?.focus();
    window.soundEngine?.playSpring();
    return;
  }
  // Slash shortcut for search when outside inputs
  if (e.key === '/' && document.activeElement !== globalSearchInput) {
    const activeTag = document.activeElement?.tagName?.toLowerCase();
    if (activeTag !== 'input' && activeTag !== 'textarea') {
      e.preventDefault();
      globalSearchInput?.focus();
      window.soundEngine?.playSpring();
      return;
    }
  }

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

// Toggle Account session: ask the news API who is signed in (the access token
// lives in an httpOnly cookie, so the page cannot read it directly). Signing in
// and out both come back through this call, which keeps the header honest.
refreshAccountSession().then(() => {
  render();

  // Returning from the auth service after the reader declined consent.
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'declined') {
    openAccountModal('signin', render);
    // Drop the marker so a reload does not re-open the dialog.
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
});

// Apply hash on initial load
applyHashToState();

// If no hash caused a state change, do initial render
if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
  render();
}

console.log('Toggle News engine active — Ground News architecture loaded. Press ? for keyboard shortcuts.');
