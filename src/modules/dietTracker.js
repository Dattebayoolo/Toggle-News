// My News Diet Tracker Component
// Personalized media diet analytics modeled on Ground News's Bias Tracker

import { store } from './state.js';
import { NEWS_STORIES } from '../data/newsData.js';

export function renderDietTracker() {
  const stats = store.calculateDietStats();
  const history = store.getState().dietHistory;

  return `
    <div class="diet-container">
      <div class="diet-hero-banner">
        <div class="hero-badge">
          <span>PERSONAL MEDIA LITERACY DASHBOARD</span>
        </div>
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-4px">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Your Media Reading Diet
        </h2>
        <p>Ground News analyzes the political bias of the articles you read to help you spot echo chambers and balance your news consumption.</p>
      </div>

      <!-- Diet Gauge Card -->
      <div class="diet-summary-card">
        <div class="diet-meter-block">
          <div class="diet-pie-wrapper">
            <div class="diet-metric-circle">
              <span class="metric-number">${stats.total}</span>
              <span class="metric-label">Stories Read</span>
            </div>
          </div>

          <div class="diet-breakdown-details">
            <h3>Current Exposure Balance</h3>
            <div class="diet-bars">
              <div class="diet-bar-row">
                <div class="bar-name">
                  <span class="dot left"></span> Left Sources
                </div>
                <div class="bar-outer">
                  <div class="bar-fill left" style="width: ${stats.left}%;"></div>
                </div>
                <span class="bar-pct">${stats.left}%</span>
              </div>

              <div class="diet-bar-row">
                <div class="bar-name">
                  <span class="dot center"></span> Center Sources
                </div>
                <div class="bar-outer">
                  <div class="bar-fill center" style="width: ${stats.center}%;"></div>
                </div>
                <span class="bar-pct">${stats.center}%</span>
              </div>

              <div class="diet-bar-row">
                <div class="bar-name">
                  <span class="dot right"></span> Right Sources
                </div>
                <div class="bar-outer">
                  <div class="bar-fill right" style="width: ${stats.right}%;"></div>
                </div>
                <span class="bar-pct">${stats.right}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Alert Banner if Echo Chamber Detected -->
        ${stats.alert ? `
          <div class="diet-alert-box ${stats.alert.type}">
            <div class="alert-icon">
              ${stats.alert.type === 'balanced'
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
              }
            </div>
            <div class="alert-content">
              <h4>${stats.alert.title}</h4>
              <p>${stats.alert.message}</p>
              ${stats.alert.actionLabel ? `
              <button class="diet-action-btn" data-action="navigate-blindspot" data-view="${stats.alert.actionView}" data-filter="${stats.alert.actionFilter}">
                ${stats.alert.actionLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Reading History List -->
      <div class="diet-history-section">
        <div class="history-header">
          <h3>Your Reading History (${history.length})</h3>
          ${history.length > 0 ? `
            <button class="diet-reset-btn" data-action="reset-diet">Clear History</button>
          ` : ''}
        </div>

        ${history.length === 0 ? `
          <div class="empty-state">
            <p>You haven't read any stories yet. Explore stories in the feed to build your media diet profile!</p>
          </div>
        ` : `
          <div class="history-list">
            ${history.map(item => {
              const story = NEWS_STORIES.find(s => s.id === item.storyId);
              if (!story) return '';

              const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return `
                <div class="history-item" data-story-id="${story.id}">
                  <div class="history-left">
                    <span class="bias-indicator-tag ${item.bias.toLowerCase()}">${item.bias} Dominant</span>
                    <h5 class="history-title" data-action="open-modal" data-story-id="${story.id}">${story.title}</h5>
                  </div>
                  <div class="history-right">
                    <span class="history-time">${timeStr}</span>
                    <button class="history-open-btn" data-action="open-modal" data-story-id="${story.id}">Review</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}
