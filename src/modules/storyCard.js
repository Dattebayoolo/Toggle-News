// Ground News Style — Compact Article Row with bias intelligence
// Faithfully models Ground News story list rows with bias strip, source bubbles, perspective toggles

import { store } from './state.js';
import { getSourceById } from '../data/sourcesData.js';

export function renderStoryCard(story) {
  const currentPerspective = store.getStoryPerspective(story.id);
  const isBookmarked = store.getState().bookmarks.includes(story.id);

  // Dynamic perspective content
  let headline = story.title;
  let perspectiveBiasClass = 'center';
  let activeFeaturedOutlet = story.perspectives.center ? story.perspectives.center.featuredSource : 'Reuters';

  if (currentPerspective === 'left' && story.perspectives.left) {
    headline = story.perspectives.left.headline;
    perspectiveBiasClass = 'left';
    activeFeaturedOutlet = story.perspectives.left.featuredSource;
  } else if (currentPerspective === 'right' && story.perspectives.right) {
    headline = story.perspectives.right.headline;
    perspectiveBiasClass = 'right';
    activeFeaturedOutlet = story.perspectives.right.featuredSource;
  } else if (currentPerspective === 'center' && story.perspectives.center) {
    headline = story.perspectives.center.headline;
    perspectiveBiasClass = 'center';
    activeFeaturedOutlet = story.perspectives.center.featuredSource;
  }

  const previewSources = story.sources.slice(0, 6);
  const remainingCount = story.sourceCount - previewSources.length;
  const leftPct = story.biasDistribution.left;
  const centerPct = story.biasDistribution.center;
  const rightPct = story.biasDistribution.right;

  return `
    <article class="gn-story-row" data-story-id="${story.id}">

      <!-- Ground News row body -->
      <div class="gn-row-inner">
        <!-- Main content -->
        <div class="gn-row-content">
          <!-- Meta line -->
          <div class="gn-row-meta-line">
            <span class="gn-cat-tag">${story.category}</span>
            <span class="gn-sep">·</span>
            <span class="gn-row-time">${story.timestamp}</span>
            ${story.isBlindspot ? `<span class="gn-sep">·</span><span class="gn-bs-pill ${story.blindspotType}-bs">${story.blindspotType === 'left' ? 'Left' : 'Right'} Blindspot</span>` : ''}
          </div>

          <!-- Perspective-switched headline -->
          <h2 class="gn-row-headline" data-action="open-modal" data-story-id="${story.id}">
            ${headline}
          </h2>

          <!-- Ground News 3-segment bias strip -->
          <div class="gn-bias-strip-row">
            <div class="gn-bias-strip">
              <div class="gn-seg gn-seg-left"  style="width:${leftPct}%"   title="Left ${leftPct}%"></div>
              <div class="gn-seg gn-seg-center" style="width:${centerPct}%" title="Center ${centerPct}%"></div>
              <div class="gn-seg gn-seg-right"  style="width:${rightPct}%"  title="Right ${rightPct}%"></div>
            </div>
            <div class="gn-bias-nums">
              <span class="gn-bnum left">${leftPct}% <span class="gn-bnum-label">Left</span></span>
              <span class="gn-bnum center">${centerPct}% <span class="gn-bnum-label">Center</span></span>
              <span class="gn-bnum right">${rightPct}% <span class="gn-bnum-label">Right</span></span>
            </div>
          </div>

          <!-- Footer: sources + actions -->
          <div class="gn-row-footer">
            <!-- Source count and avatars -->
            <div class="gn-bubbles-row">
              <div class="gn-source-avatars-mini">
                ${previewSources.slice(0, 3).map(s => {
                  const meta = getSourceById(s.id);
                  return `<span class="gn-avatar-dot" style="background:${meta.color}" title="${meta.name}"></span>`;
                }).join('')}
              </div>
              <span class="gn-src-count">${story.sourceCount} sources</span>
              <span class="gn-sep">·</span>
              <span class="gn-src-dominant">${leftPct >= 50 ? `${leftPct}% from Left` : rightPct >= 50 ? `${rightPct}% from Right` : 'Balanced'}</span>
            </div>

            <!-- Right-side actions -->
            <div class="gn-row-actions">
              <!-- Compact perspective toggles (L/C/R) -->
              <div class="gn-persp-row" role="group" aria-label="Perspective toggle" onclick="event.stopPropagation()">
                <button class="gn-persp-btn ${currentPerspective === 'left' ? 'active-left' : ''}"
                        data-action="set-perspective" data-story-id="${story.id}" data-perspective="left"
                        title="Left perspective">
                  <span class="persp-dot left-dot"></span>L
                </button>
                <button class="gn-persp-btn ${(currentPerspective === 'center' || currentPerspective === 'balanced') ? 'active-center' : ''}"
                        data-action="set-perspective" data-story-id="${story.id}" data-perspective="center"
                        title="Center / Neutral">
                  <span class="persp-dot center-dot"></span>C
                </button>
                <button class="gn-persp-btn ${currentPerspective === 'right' ? 'active-right' : ''}"
                        data-action="set-perspective" data-story-id="${story.id}" data-perspective="right"
                        title="Right perspective">
                  <span class="persp-dot right-dot"></span>R
                </button>
              </div>

              <!-- Full Coverage button -->
              <button class="gn-full-cov-btn" data-action="open-modal" data-story-id="${story.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="2" y="7" width="16" height="14" rx="2"></rect>
                  <path d="M6 3h14a2 2 0 0 1 2 2v12"></path>
                </svg>
                Coverage
              </button>

              <!-- Bookmark -->
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

        <!-- Thumbnail Image on Right -->
        ${story.heroImage ? `
        <div class="gn-row-thumb" data-action="open-modal" data-story-id="${story.id}">
          <img src="${story.heroImage}" alt="${story.title}" loading="lazy" />
        </div>` : ''}
      </div>
    </article>
  `;
}
