// Ground News Style — Top News Stories reference row: bold headline + mini bias bar + lean coverage text
// Divider-separated, text-only rows (no thumbnails), matching the reference screenshot

import { store } from './state.js';
import { STORY_LOCATIONS } from './storyLocations.js';

export function renderStoryCard(story) {
  const currentPerspective = store.getStoryPerspective(story.id);
  const isBookmarked = store.getState().bookmarks.includes(story.id);

  // Dynamic perspective content
  let headline = story.title;
  if (currentPerspective === 'left' && story.perspectives.left) {
    headline = story.perspectives.left.headline;
  } else if (currentPerspective === 'right' && story.perspectives.right) {
    headline = story.perspectives.right.headline;
  }

  const dist = story.biasDistribution;
  const leanEntry = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  const leanName = leanEntry[0] === 'left' ? 'Left' : leanEntry[0] === 'right' ? 'Right' : 'Center';

  return `
    <article class="gn-story-row" data-story-id="${story.id}">
      ${story.isBlindspot ? `
      <div class="gn-blindspot-banner banner-${story.blindspotType}">
        <svg width="18" height="10" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="7" r="5.5"></circle><circle cx="18" cy="7" r="5.5"></circle></svg>
        ${story.blindspotType === 'left' ? 'Left' : 'Right'} Blindspot
      </div>` : ''}

      <div class="gn-row-inner" data-action="open-modal" data-story-id="${story.id}">
        <div class="gn-row-content">
          <span class="local-row-meta">${story.category} &middot; ${STORY_LOCATIONS[story.id] || 'United States'}</span>
          <h2 class="gn-row-headline">${headline}</h2>

          <div class="tn-coverage-row">
            <div class="gn-bias-strip mini">
              <div class="gn-seg gn-seg-left"   style="width:${dist.left}%"  title="Left ${dist.left}%"></div>
              <div class="gn-seg gn-seg-center" style="width:${dist.center}%" title="Center ${dist.center}%"></div>
              <div class="gn-seg gn-seg-right"  style="width:${dist.right}%" title="Right ${dist.right}%"></div>
            </div>
            <span class="sub-src-count"><strong>${leanEntry[1]}%</strong> ${leanName} coverage: ${story.sourceCount} sources</span>

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
