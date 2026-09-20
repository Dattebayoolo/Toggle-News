// Side-by-Side Headline & Framing Comparison Matrix
// Modelled on Ground News's flagship multi-perspective framing table

import { renderBiasBar } from './biasBar.js';

export function renderHeadlineMatrix(stories) {
  if (!stories.length) {
    return `
      <div class="empty-state">
        <h3>No matching stories found</h3>
        <p>Try adjusting your category or search filter.</p>
      </div>
    `;
  }

  return `
    <div class="matrix-container">
      <div class="matrix-header-banner">
        <div class="matrix-banner-text">
          <h2>⚖️ Side-by-Side Headline Matrix</h2>
          <p>Examine how different newsrooms frame the exact same event. Notice the tone, vocabulary, and rhetoric differences between Left, Center, and Right reporting.</p>
        </div>
        <div class="matrix-legend">
          <span class="legend-badge left">🔵 Left Framing</span>
          <span class="legend-badge center">🟣 Center / Wire</span>
          <span class="legend-badge right">🔴 Right Framing</span>
        </div>
      </div>

      <div class="matrix-stories-list">
        ${stories.map(story => {
          const leftData = story.perspectives.left;
          const centerData = story.perspectives.center;
          const rightData = story.perspectives.right;

          return `
            <div class="matrix-row-card" data-story-id="${story.id}">
              <div class="matrix-row-meta">
                <div class="meta-left">
                  <span class="matrix-category">${story.category}</span>
                  <span class="matrix-time">${story.timestamp}</span>
                  <span class="matrix-sources">${story.sourceCount} Sources Analyzed</span>
                </div>
                <div class="meta-right">
                  ${renderBiasBar(story.biasDistribution, { showLabels: false, height: 6, interactive: true })}
                  <button class="matrix-dossier-btn" data-action="open-modal" data-story-id="${story.id}">
                    Full Dossier ➔
                  </button>
                </div>
              </div>

              <div class="matrix-columns-grid">
                <!-- Left Column -->
                <div class="matrix-col matrix-col-left">
                  <div class="col-header">
                    <span class="col-outlet-tag">${leftData.featuredSource}</span>
                    <span class="bias-indicator-tag left">Left Angle</span>
                  </div>
                  <h4 class="col-headline" data-action="open-modal" data-story-id="${story.id}">
                    "${leftData.headline}"
                  </h4>
                  <div class="col-framing-box">
                    <span class="framing-title">Key Framing Angle:</span>
                    <p>${leftData.framing}</p>
                  </div>
                  <ul class="col-bullet-points">
                    ${leftData.keyTakeaways.map(pt => `<li>${pt}</li>`).join('')}
                  </ul>
                </div>

                <!-- Center Column -->
                <div class="matrix-col matrix-col-center">
                  <div class="col-header">
                    <span class="col-outlet-tag">${centerData.featuredSource}</span>
                    <span class="bias-indicator-tag center">Neutral Wire</span>
                  </div>
                  <h4 class="col-headline" data-action="open-modal" data-story-id="${story.id}">
                    "${centerData.headline}"
                  </h4>
                  <div class="col-framing-box">
                    <span class="framing-title">Factual Synthesis:</span>
                    <p>${centerData.framing}</p>
                  </div>
                  <ul class="col-bullet-points">
                    ${centerData.keyTakeaways.map(pt => `<li>${pt}</li>`).join('')}
                  </ul>
                </div>

                <!-- Right Column -->
                <div class="matrix-col matrix-col-right">
                  <div class="col-header">
                    <span class="col-outlet-tag">${rightData.featuredSource}</span>
                    <span class="bias-indicator-tag right">Right Angle</span>
                  </div>
                  <h4 class="col-headline" data-action="open-modal" data-story-id="${story.id}">
                    "${rightData.headline}"
                  </h4>
                  <div class="col-framing-box">
                    <span class="framing-title">Key Framing Angle:</span>
                    <p>${rightData.framing}</p>
                  </div>
                  <ul class="col-bullet-points">
                    ${rightData.keyTakeaways.map(pt => `<li>${pt}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
