// Blindspot Radar Feed Component
// Identifies news echo chambers where one side of the political spectrum underreports a story
//
// Blindspot classification requires same-event grouping, which wire articles do
// not have. The radar therefore renders an explicit empty state explaining that
// rather than presenting sampling noise as a signal.

import { store } from './state.js';

/**
 * Shown when no story carries a blindspot classification — which is always the
 * case while the app runs on wire articles alone.
 *
 * A blindspot means "covered heavily by one side, ignored by the other". Deciding
 * that requires the full set of outlets covering a given event, which comes from
 * grouping articles by story. Wire articles arrive ungrouped, so a "blindspot"
 * derived here would just be an outlet that happened not to publish in our pull —
 * a sampling artefact, not a finding. This page explains that rather than
 * presenting noise as a signal.
 */
export function renderBlindspotRadarUnavailable() {
  return `
    <div class="blindspot-radar-container">
      <div class="blindspot-hero-card">
        <div class="hero-badge">
          <span class="radar-pulse"></span>
          <span>ECHO CHAMBER DETECTOR</span>
        </div>
        <h2>
          <svg class="heading-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 1 0 10 10"></path>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
          Blindspot Radar
        </h2>
        <p>A "Blindspot" is a significant news story covered disproportionately by one political side while being largely ignored or underreported by the other.</p>
      </div>

      <div class="editorial-unavailable-panel">
        <span class="editorial-unavailable-badge">NOT AVAILABLE FROM WIRE DATA</span>
        <h3>No blindspots have been classified</h3>
        <p>
          Calling something a blindspot means one side covered an event heavily while the other
          ignored it. You can only say that once you know <strong>every outlet covering that
          event</strong> — which means first grouping articles that describe the same story.
        </p>
        <p>
          Toggle News currently holds individual wire articles with no same-event grouping. An outlet
          that simply didn't publish inside our fetch window would look like a blindspot, so the
          asymmetry figures would be a sampling artefact rather than a real finding. Nothing is shown
          here instead of publishing that as a signal.
        </p>
        <div class="editorial-unavailable-actions">
          <button class="editorial-unavailable-btn" data-action="navigate-view" data-view="feed">Browse the live wire</button>
          <button class="editorial-unavailable-btn secondary" data-action="navigate-view" data-view="directory">See outlet bias ratings</button>
        </div>
      </div>
    </div>
  `;
}

export function renderBlindspotRadar(stories) {
  // Blindspot classification is editorial analysis, not a field the wires provide,
  // so this renders an explicit explanation rather than a misleading empty filter.
  if (!stories.some(s => s.isBlindspot)) return renderBlindspotRadarUnavailable();

  const currentFilter = store.getState().blindspotFilter;

  // Filter blindspot stories
  let filtered = stories.filter(s => s.isBlindspot);
  if (currentFilter === 'left-blindspots') {
    filtered = filtered.filter(s => s.blindspotType === 'left');
  } else if (currentFilter === 'right-blindspots') {
    filtered = filtered.filter(s => s.blindspotType === 'right');
  }

  const leftCount = stories.filter(s => s.isBlindspot && s.blindspotType === 'left').length;
  const rightCount = stories.filter(s => s.isBlindspot && s.blindspotType === 'right').length;

  return `
    <div class="blindspot-radar-container">
      <div class="blindspot-hero-card">
        <div class="hero-badge">
          <span class="radar-pulse"></span>
          <span>ECHO CHAMBER DETECTOR</span>
        </div>
        <h2>
          <svg class="heading-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 1 0 10 10"></path>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
          Ground News Blindspot Radar
        </h2>
        <p>A "Blindspot" is a significant news story covered disproportionately by one political side while being largely ignored or underreported by the other.</p>

        <!-- Blindspot Filter Pills -->
        <div class="blindspot-filter-pills" role="tablist">
          <button class="b-pill ${currentFilter === 'all' ? 'active' : ''}" data-action="set-blindspot-filter" data-filter="all">
            All Blindspots (${leftCount + rightCount})
          </button>
          <button class="b-pill b-pill-left ${currentFilter === 'left-blindspots' ? 'active' : ''}" data-action="set-blindspot-filter" data-filter="left-blindspots">
            <span class="pill-dot blue"></span> Left Blindspots (${leftCount})
            <span class="b-sub">Ignored by Left Media</span>
          </button>
          <button class="b-pill b-pill-right ${currentFilter === 'right-blindspots' ? 'active' : ''}" data-action="set-blindspot-filter" data-filter="right-blindspots">
            <span class="pill-dot red"></span> Right Blindspots (${rightCount})
            <span class="b-sub">Ignored by Right Media</span>
          </button>
        </div>
      </div>

      <div class="blindspot-cards-grid">
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <h3>No stories match this blindspot filter</h3>
            <p>Try switching to "All Blindspots" or check back later.</p>
          </div>
        ` : filtered.map(story => {
          const isLeftBlind = story.blindspotType === 'left';
          const dominantPct = isLeftBlind ? story.biasDistribution.right : story.biasDistribution.left;
          const neglectedPct = isLeftBlind ? story.biasDistribution.left : story.biasDistribution.right;
          const dominantSide = isLeftBlind ? 'Right-leaning' : 'Left-leaning';
          const neglectedSide = isLeftBlind ? 'Left' : 'Right';

          return `
            <div class="blindspot-radar-card ${isLeftBlind ? 'theme-left-blind' : 'theme-right-blind'}" data-story-id="${story.id}">
              <div class="radar-card-alert-header">
                <div class="alert-tag ${isLeftBlind ? 'alert-left' : 'alert-right'}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>${isLeftBlind ? 'LEFT BLINDSPOT' : 'RIGHT BLINDSPOT'}</span>
                </div>
                <span class="asymmetry-metric">
                  ${dominantPct}% vs ${neglectedPct}% Asymmetry
                </span>
              </div>

              <div class="radar-content-split">
                <div class="radar-image-holder">
                  <img src="${story.heroImage}" alt="${story.title}" />
                  <span class="radar-cat-tag">${story.category}</span>
                </div>

                <div class="radar-info">
                  <h3 class="radar-title" data-action="open-modal" data-story-id="${story.id}">
                    ${story.title}
                  </h3>

                  <div class="asymmetry-explainer">
                    <div class="meter-col">
                      <span class="meter-label">${dominantSide} Coverage:</span>
                      <div class="meter-bar-outer">
                        <div class="meter-bar-fill ${isLeftBlind ? 'right-fill' : 'left-fill'}" style="width: ${dominantPct}%;"></div>
                      </div>
                      <span class="meter-val">${dominantPct}%</span>
                    </div>

                    <div class="meter-col">
                      <span class="meter-label">${neglectedSide} Coverage:</span>
                      <div class="meter-bar-outer">
                        <div class="meter-bar-fill ${isLeftBlind ? 'left-fill' : 'right-fill'}" style="width: ${neglectedPct}%;"></div>
                      </div>
                      <span class="meter-val muted">${neglectedPct}%</span>
                    </div>
                  </div>

                  <p class="radar-notice">${story.blindspotNotice}</p>

                  <div class="radar-actions">
                    <div class="radar-source-meta">
                      <span>${story.sourceCount} Sources Analyzed</span>
                      <span>•</span>
                      <span>${story.factualityDistribution.high}% High Factuality</span>
                    </div>
                    <button class="radar-inspect-btn" data-action="open-modal" data-story-id="${story.id}">
                      <span>Inspect Coverage Breakdown</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
