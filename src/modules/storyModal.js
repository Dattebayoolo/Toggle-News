// Curated Story Dossier.
//
// This view used to carry a hand-authored media-literacy dossier: Left / Center /
// Right framing write-ups, a fabricated source stream, a community poll, a
// chronology, and "more stories like this". That was illustrative sample data and
// has been removed. Real articles are now rendered by the live article page
// (see ./liveFeed.js → renderLiveArticleModal).
//
// The dossier view is kept rather than deleted so curated reporting can be wired
// back in later. Until a story actually carries that analysis, the page explains
// what is missing instead of showing stand-in framing. The poll and timeline
// sections remain mounted so those features stay present with their own empty
// states.
//
// Exports are unchanged so existing callers (main.js) keep working.

import { renderStoryTimeline } from './storyTimeline.js';
import { renderCommunityPoll } from './communityPoll.js';

// Current dossier source-stream filter ('all' | 'left' | 'center' | 'right').
// Retained so the existing filter control and event handler stay valid.
let activeSourceFilter = 'all';

export function setModalSourceFilter(filter) {
  activeSourceFilter = filter;
}

export function getModalSourceFilter() {
  return activeSourceFilter;
}

export function renderStoryModal(story) {
  const title = story?.title || 'This story';

  return `
    <div class="gn-article-detail-page gn-curated-dossier">
      <div class="article-breadcrumb-bar">
        <button class="article-back-btn" data-action="close-modal" title="Return to news feed">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Top Stories</span>
        </button>

        <div class="article-breadcrumb-meta">
          <span class="dossier-pill">Media Literacy Dossier</span>
        </div>
      </div>

      <div class="gn-live-article-body">
        <h1 class="gn-live-article-title">${title}</h1>

        <div class="editorial-unavailable-panel">
          <span class="editorial-unavailable-badge">CURATED DOSSIER UNAVAILABLE</span>
          <h3>This story has no curated dossier</h3>
          <p>
            A dossier requires editorial work: Left / Center / Right framing write-ups of the
            <strong>same event</strong>, a reviewed source stream, a reader poll, and a chronology.
            Toggle News currently renders articles straight from the news wires, so none of that
            exists for this story.
          </p>
          <p>
            Nothing is substituted in its place. Open the live article page for the verified facts —
            the real headline, the publisher, that outlet's bias rating, and a link to the original
            report.
          </p>
          <div class="editorial-unavailable-actions">
            <button class="editorial-unavailable-btn" data-action="close-modal">Back to the live wire</button>
            <button class="editorial-unavailable-btn secondary" data-action="navigate-view" data-view="directory">See outlet bias ratings</button>
          </div>
        </div>

        ${renderCommunityPoll(story)}
        ${renderStoryTimeline(story)}
      </div>
    </div>
  `;
}