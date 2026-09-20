// Ground News Faithful Article Detail Dossier
// Complete 2-Column Desktop Experience matching reference screenshot

import { renderBiasBar } from './biasBar.js';
import { store } from './state.js';
import { SOURCES, getSourceById } from '../data/sourcesData.js';
import { NEWS_STORIES } from '../data/newsData.js';

let activeSourceFilter = 'all';

export function setModalSourceFilter(filter) {
  activeSourceFilter = filter;
}

export function renderStoryModal(story) {
  if (!story) return '';

  const state = store.getState();
  const currentPerspective = store.getStoryPerspective(story.id);
  const isBookmarked = state.bookmarks.includes(story.id);

  // Dynamic content based on perspective
  let headline = story.title;
  let activeTakeaways = [];

  if (currentPerspective === 'left' && story.perspectives?.left) {
    headline = story.perspectives.left.headline;
    activeTakeaways = [
      story.perspectives.left.framing,
      ...(story.perspectives.left.keyTakeaways || [])
    ];
  } else if (currentPerspective === 'right' && story.perspectives?.right) {
    headline = story.perspectives.right.headline;
    activeTakeaways = [
      story.perspectives.right.framing,
      ...(story.perspectives.right.keyTakeaways || [])
    ];
  } else if (currentPerspective === 'center' && story.perspectives?.center) {
    headline = story.perspectives.center.headline;
    activeTakeaways = [
      story.perspectives.center.framing,
      ...(story.perspectives.center.keyTakeaways || [])
    ];
  } else {
    // Summary comparison mode / Default Ground News dossier bullets
    if (story.id === 'story-trump-ai-force') {
      activeTakeaways = [
        `On Saturday, President Donald Trump unveiled plans to establish an "AI Force" and create an "AI Czar" to lead the administration's efforts to maintain American leadership in artificial intelligence.`,
        `Venture capitalist David Sacks reportedly held the AI composition below stepping down in the spring, remaining an external adviser to the White House on tech and AI issues.`,
        `Earlier this month, former Anthropic researcher Jacob Steinhardt warned that "progress in AI current trends could lead to catastrophic risks" by the end of the decade, advocating caution over rapid deployment.`,
        `Treasury Secretary Scott Bessent will meet Chinese Vice Premier He Lifeng in Beijing to discuss cross-border commerce and national security concerns related to semiconductors and AI.`,
        `While China and the US are competing for AI leadership, trade tensions escalate as both countries heavily subsidize domestic chip production while implementing export restrictions.`
      ];
    } else {
      activeTakeaways = [
        story.neutralSummary || story.title,
        ...(story.keyTakeaways || [
          `Key government and industry leaders are assessing national and economic implications.`,
          `Major diplomatic and commercial channels remain focused on strategic thresholds.`,
          `Independent observers note significant divergence in cross-partisan public perception.`
        ])
      ];
    }
  }

  // Calculate counts for Left, Center, Right
  const leftSourcesCount = Math.round(story.sourceCount * (story.biasDistribution.left / 100));
  const centerSourcesCount = Math.round(story.sourceCount * (story.biasDistribution.center / 100));
  const rightSourcesCount = story.sourceCount - leftSourcesCount - centerSourcesCount;

  // Authentic articles list matching reference screenshot for Trump AI Force
  const defaultStreamArticles = [
    {
      outletName: 'The Independent',
      logoText: 'IND',
      logoBg: '#cc0000',
      ownership: 'Individual',
      factuality: 'High',
      bias: 'Lean Left',
      biasType: 'left',
      headline: `Trump Announces That He Will Create an 'AI Force' and Appoint a 'Zar' to the Sector's Alerts`,
      meta: '1 hour ago · By Sarah Smith'
    },
    {
      outletName: 'USA TODAY',
      logoText: 'USA',
      logoBg: '#0055a5',
      ownership: 'Gannett',
      factuality: 'High',
      bias: 'Right',
      biasType: 'right',
      headline: `AI Danger? Trump Laughs... 'Will Create AI Unit, Tsar Announcement Soon'`,
      meta: '3 hours ago'
    },
    {
      outletName: 'The Hill',
      logoText: 'HILL',
      logoBg: '#002b66',
      ownership: 'Media Group',
      factuality: 'High',
      bias: 'Center',
      biasType: 'center',
      headline: `Trump Announces 'AI Force' on AI Regulation`,
      meta: '5 hours ago · By Brett Samuels'
    },
    {
      outletName: 'Business Times',
      logoText: 'BT',
      logoBg: '#2c3e50',
      ownership: 'Conglomerate',
      factuality: 'High',
      bias: 'Lean Right',
      biasType: 'right',
      headline: `Trump proposes 'AI Force' amid rogue-agent fears but rejects new regulations`,
      meta: '6 hours ago · New York / Singapore'
    },
    {
      outletName: 'CNBC',
      logoText: 'CNBC',
      logoBg: '#003366',
      ownership: 'Comcast',
      factuality: 'High',
      bias: 'Lean Left',
      biasType: 'left',
      headline: `Trump says he plans to form AI Force, appoint AI 'Czar'`,
      meta: '7 hours ago · By Eamon Javers'
    },
    {
      outletName: 'Wall Street Journal',
      logoText: 'WSJ',
      logoBg: '#111111',
      ownership: 'News Corp',
      factuality: 'Very High',
      bias: 'Lean Right',
      biasType: 'right',
      headline: `Trump announces 'AI Force' led by 'AI Czar' to keep US ahead as race with China intensifies`,
      meta: '9 hours ago · Washington'
    }
  ];

  // If user selected another story, generate realistic stream items
  let streamArticles = (story.id === 'story-trump-ai-force')
    ? defaultStreamArticles
    : story.sources.map((s, idx) => {
        const meta = getSourceById(s.id) || { name: s.id.toUpperCase(), color: '#1a73e8', logoText: s.id.slice(0, 3).toUpperCase() };
        const b = s.bias.toLowerCase();
        const biasType = b.includes('left') ? 'left' : (b.includes('right') ? 'right' : 'center');
        return {
          outletName: meta.name,
          logoText: meta.logoText,
          logoBg: meta.color,
          ownership: 'Media Corp',
          factuality: s.factuality || 'High',
          bias: s.bias,
          biasType: biasType,
          headline: s.headline,
          meta: `${idx + 1} hours ago · United States, News`
        };
      });

  // Filter sources for stream
  if (activeSourceFilter === 'left') {
    streamArticles = streamArticles.filter(s => s.biasType === 'left');
  } else if (activeSourceFilter === 'center') {
    streamArticles = streamArticles.filter(s => s.biasType === 'center');
  } else if (activeSourceFilter === 'right') {
    streamArticles = streamArticles.filter(s => s.biasType === 'right');
  }

  // Waterfall publisher logos grouped by bias
  const leftLogos = [
    { text: 'CNN', bg: '#cc0000', color: '#fff' },
    { text: 'NYT', bg: '#111111', color: '#fff' },
    { text: 'WaPo', bg: '#2b2b2b', color: '#fff' },
    { text: 'MSN', bg: '#0055a5', color: '#fff' },
    { text: 'Gdn', bg: '#052962', color: '#fff' },
    { text: 'Vox', bg: '#ffffff', color: '#000' }
  ];
  const centerLogos = [
    { text: 'AP', bg: '#ff322e', color: '#fff' },
    { text: 'RTR', bg: '#ff8000', color: '#fff' },
    { text: 'BBC', bg: '#bb1919', color: '#fff' },
    { text: 'Hill', bg: '#002b66', color: '#fff' },
    { text: 'Axios', bg: '#2c3e50', color: '#fff' },
    { text: 'WSJ', bg: '#000000', color: '#fff' }
  ];
  const rightLogos = [
    { text: 'FOX', bg: '#003366', color: '#fff' },
    { text: 'NYP', bg: '#cc0000', color: '#fff' },
    { text: 'NR', bg: '#0d2b45', color: '#fff' },
    { text: 'WT', bg: '#1a3c6d', color: '#fff' },
    { text: 'DW', bg: '#111111', color: '#fff' },
    { text: 'Tel', bg: '#00456e', color: '#fff' }
  ];

  // Authentic "More stories like this" items matching reference screenshot
  const moreStoriesLikeThis = [
    {
      category: 'Public Opinion Poll / AI · 3 hours ago',
      title: 'POLL: Do you believe Donald Trump is the only guardrail AI needs?',
      bias: { left: 42, center: 28, right: 30 }
    },
    {
      category: 'White House Transition / AI Policy · 5 hours ago',
      title: 'Trump says he will appoint a new AI adviser, without providing details',
      bias: { left: 35, center: 45, right: 20 }
    },
    {
      category: 'Social Media Poll / Tech · 12 hours ago',
      title: 'Trump opens poll proposing renaming artificial intelligence',
      bias: { left: 25, center: 30, right: 45 }
    },
    {
      category: 'Technology / National Security · 14 hours ago',
      title: 'US government website used AI search tool from China that FBI said copied...',
      bias: { left: 28, center: 34, right: 38 }
    },
    {
      category: 'Tech Summit / State Dept · 18 hours ago',
      title: "U.S. open to discuss AI 'shared risks' with China, Bessent says",
      bias: { left: 30, center: 50, right: 20 }
    },
    {
      category: 'Silicon Valley / Hardware · 21 hours ago',
      title: "Nvidia CEO Jensen Huang calls for AI to be developed 'as fast as we can'",
      bias: { left: 20, center: 60, right: 20 }
    }
  ];

  // Similar News Topics
  const similarTopics = [
    'Artificial Intelligence',
    'Technology',
    'Donald Trump',
    'US Politics',
    'Politics',
    'United States',
    'China'
  ];

  return `
    <div class="gn-article-detail-page">
      
      <!-- Top Breadcrumb / Navigation Action -->
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
          <span class="dossier-sources-count">${story.sourceCount} verified sources</span>
        </div>
      </div>

      <!-- 2-Column Article Body Layout -->
      <div class="gn-article-body-layout">

        <!-- ─────────────────────────────────────────────────────────────
             LEFT MAIN COLUMN: Story Takeaways, Perspective & Articles (~65%)
             ───────────────────────────────────────────────────────────── -->
        <main class="gn-article-left-main">

          <!-- Meta Row: Timestamps + Social Share Circle Buttons -->
          <div class="article-meta-row">
            <div class="meta-timestamps">
              <span>Published 10 hours ago</span>
              <span class="meta-dot">·</span>
              <span class="meta-update">Updated 29 minutes ago</span>
            </div>

            <!-- Social Utility Icons -->
            <div class="meta-social-icons">
              <button class="util-btn" title="Share on Facebook" aria-label="Facebook">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button class="util-btn" title="Share on X" aria-label="X">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              <button class="util-btn" title="Share on Reddit" aria-label="Reddit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <circle cx="9" cy="11" r="1.5"/>
                  <circle cx="15" cy="11" r="1.5"/>
                  <path d="M8 15s1.5 2 4 2 4-2 4-2" fill="none" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              <button class="util-btn" title="Share on LinkedIn" aria-label="LinkedIn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8m1.4 9.74v-8.37H5.06v8.37h2.8z"/>
                </svg>
              </button>
              <button class="util-btn" title="Email story" aria-label="Email">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </button>
              <button class="util-btn" title="Copy Link" aria-label="Copy Link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
              <button class="util-btn bookmark-util ${isBookmarked ? 'active' : ''}" 
                      data-action="toggle-bookmark" 
                      data-story-id="${story.id}" 
                      title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark story'}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button class="util-btn" title="Share" aria-label="Share">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Article Headline -->
          <h1 class="article-headline">${headline}</h1>

          <!-- Perspective Toggle Chips -->
          <div class="article-perspective-chips">
            <button class="persp-chip left ${currentPerspective === 'left' ? 'active' : ''}" 
                    data-action="modal-perspective" 
                    data-story-id="${story.id}" 
                    data-perspective="left">
              Left
            </button>
            <button class="persp-chip center ${currentPerspective === 'center' ? 'active' : ''}" 
                    data-action="modal-perspective" 
                    data-story-id="${story.id}" 
                    data-perspective="center">
              Center
            </button>
            <button class="persp-chip right ${currentPerspective === 'right' ? 'active' : ''}" 
                    data-action="modal-perspective" 
                    data-story-id="${story.id}" 
                    data-perspective="right">
              Right
            </button>
            <button class="persp-chip balanced ${currentPerspective === 'balanced' ? 'active' : ''}" 
                    data-action="modal-perspective" 
                    data-story-id="${story.id}" 
                    data-perspective="balanced">
              Summary comparison
            </button>
          </div>

          <!-- Bulleted Takeaways Box -->
          <div class="article-summary-box">
            <ul class="summary-bullet-list">
              ${activeTakeaways.map(point => `
                <li class="summary-bullet-item">
                  <span class="bullet-dot">•</span>
                  <p class="bullet-text">${point}</p>
                </li>
              `).join('')}
            </ul>

            <div class="summary-box-footer">
              <a href="#" class="summary-info-link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Explanation of bias sources</span>
              </a>
              <a href="#" class="summary-report-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-1px;margin-right:2px">
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
                </svg>
                <span>Read full summary comparison</span>
              </a>
            </div>
          </div>

          <!-- Podcasts & Opinions Section -->
          <section class="article-podcast-section">
            <h3 class="podcast-section-title">Podcasts & Opinions</h3>
            
            <div class="article-podcast-card">
              <div class="podcast-header">
                <span class="podcast-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                    <polyline points="17 2 12 7 7 2"></polyline>
                  </svg>
                  Broadcast TV Show
                </span>
                <span class="podcast-listener-bias">LISTENER BIAS: Lean Right</span>
              </div>

              <div class="podcast-body">
                <div class="podcast-source-row">
                  <div class="podcast-logo-badge" style="background-color: #bb1919;">
                    <img src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=80" alt="Global National" class="podcast-logo-img" onerror="this.style.display='none'" />
                    <span>GN</span>
                  </div>
                  <div class="podcast-outlet-info">
                    <h5 class="podcast-outlet-name">Global National</h5>
                    <span class="podcast-time">Global National: Oct. 17, 2025 • Liberals to propose major labour code changes</span>
                  </div>
                </div>

                <blockquote class="podcast-quote">
                  "Global National's coverage of Trump's plan for a U.S. AI Force and AI czar, alongside reports of Google's German coding competitor."
                </blockquote>

                <div class="podcast-actions-row">
                  <span class="podcast-duration">18 mins ago · Global Canada</span>
                  <div class="podcast-action-links">
                    <a href="#" class="podcast-listen-link" 
                       data-action="listen-podcast"
                       data-title="Global National: Oct. 17, 2025 &bull; Liberals to propose major labour code changes"
                       data-source="Global National"
                       data-source-bg="#bb1919">
                      <span>Listen to Full Episode</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </a>
                    <a href="#" class="podcast-timestamp-link"
                       data-action="jump-timestamp"
                       data-seek-to="318">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Jump to Timestamps</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Vantage Promo Banner -->
          <div class="article-vantage-banner">
            <div class="vantage-inner">
              <div class="vantage-logo-icon">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Vantage" class="vantage-avatar-img" onerror="this.style.display='none'" />
                <span>V</span>
              </div>
              <div class="vantage-text">
                <strong>Get Vantage</strong> — Podcasts, Ratings, Timestamps
              </div>
            </div>
            <button class="vantage-btn">Learn more</button>
          </div>

          <!-- ───────────────────────────────────────────────────────────
               340 ARTICLES STREAM
               ─────────────────────────────────────────────────────────── -->
          <section class="article-stream-section">
            <div class="stream-header-bar">
              <h3 class="stream-count-heading">${story.sourceCount} Articles</h3>

              <!-- Filter Tabs: All | Left | Center | Right -->
              <div class="stream-tabs-group">
                <button class="stream-tab ${activeSourceFilter === 'all' ? 'active' : ''}" 
                        data-action="modal-filter-sources" 
                        data-filter="all">
                  All
                </button>
                <button class="stream-tab ${activeSourceFilter === 'left' ? 'active' : ''}" 
                        data-action="modal-filter-sources" 
                        data-filter="left">
                  Left <span class="tab-count">${leftSourcesCount}</span>
                </button>
                <button class="stream-tab ${activeSourceFilter === 'center' ? 'active' : ''}" 
                        data-action="modal-filter-sources" 
                        data-filter="center">
                  Center <span class="tab-count">${centerSourcesCount}</span>
                </button>
                <button class="stream-tab ${activeSourceFilter === 'right' ? 'active' : ''}" 
                        data-action="modal-filter-sources" 
                        data-filter="right">
                  Right <span class="tab-count">${rightSourcesCount}</span>
                </button>
              </div>

              <!-- Search & Sort Controls + My News Chat -->
              <div class="stream-actions">
                <button class="stream-icon-btn" title="Search articles">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <button class="stream-icon-btn" title="Filter &amp; sort">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <line x1="8" y1="12" x2="20" y2="12"></line>
                    <line x1="12" y1="18" x2="20" y2="18"></line>
                  </svg>
                </button>
                <button class="stream-chat-btn" data-action="open-news-chat" title="Ask AI about this story">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  My News Chat
                </button>
              </div>

            </div>

            <!-- Articles Stack -->
            <div class="stream-articles-list">
              ${streamArticles.map((art) => `
                <div class="stream-article-card">
                  <div class="stream-card-top">
                    <div class="stream-outlet-brand">
                      <span class="stream-outlet-avatar" style="background-color:${art.logoBg}">${art.logoText}</span>
                      <span class="stream-outlet-name">${art.outletName}</span>
                    </div>

                    <div class="stream-badges">
                      <span class="stream-ownership-pill">Ownership: ${art.ownership}</span>
                      <span class="stream-dot-sep">·</span>
                      <span class="stream-fact-pill">Factuality: ${art.factuality}</span>
                      <span class="stream-bias-pill ${art.biasType}">${art.bias}</span>
                      <button class="stream-menu-btn" title="More options">⋮</button>
                    </div>
                  </div>

                  <h4 class="stream-card-headline">
                    "${art.headline}"
                  </h4>

                  <div class="stream-card-footer">
                    <span class="stream-time-loc">${art.meta}</span>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="stream-load-more">
              <button class="stream-more-btn">More articles</button>
            </div>
          </section>

        </main>


        <!-- ─────────────────────────────────────────────────────────────
             RIGHT SIDEBAR: Ground News Intelligence Dossier Widgets (~35%)
             ───────────────────────────────────────────────────────────── -->
        <aside class="gn-article-right-sidebar">

          <!-- 1. Coverage Details Table Widget -->
          <div class="sidebar-widget-card widget-coverage-details">
            <h4 class="widget-card-title">Coverage Details</h4>
            
            <div class="details-table">
              <div class="details-row">
                <span class="detail-label">Total News Sources</span>
                <span class="detail-val bold">${story.sourceCount}</span>
              </div>
              <div class="details-row">
                <span class="detail-label">Leaning Left</span>
                <span class="detail-val left">${leftSourcesCount}</span>
              </div>
              <div class="details-row">
                <span class="detail-label">Leaning Right</span>
                <span class="detail-val right">${rightSourcesCount}</span>
              </div>
              <div class="details-row">
                <span class="detail-label">Center</span>
                <span class="detail-val center">${centerSourcesCount}</span>
              </div>
              <div class="details-row">
                <span class="detail-label">Last Updated</span>
                <span class="detail-val muted">58 minutes ago</span>
              </div>
              <div class="details-row">
                <span class="detail-label">Bias Distribution</span>
                <span class="detail-val bold">${story.biasDistribution.center}% Center</span>
              </div>
            </div>
          </div>

          <!-- 2. Bias Distribution with Waterfall Matrix -->
          <div class="sidebar-widget-card widget-bias-distribution">
            <div class="widget-header-with-info">
              <h4 class="widget-card-title">Bias Distribution</h4>
              <button class="info-circle-btn" title="About bias distribution">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
            
            <p class="widget-lead-stat">• ${story.biasDistribution.center}% of stories are leaning Center</p>

            <!-- 3-Segment Spectrum Header Bar -->
            <div class="waterfall-bias-bar">
              <div class="wf-bar-seg left" style="width:${story.biasDistribution.left}%">Left</div>
              <div class="wf-bar-seg center" style="width:${story.biasDistribution.center}%">Center</div>
              <div class="wf-bar-seg right" style="width:${story.biasDistribution.right}%">Right</div>
            </div>

            <!-- 3-Column Publisher Avatar Waterfall Matrix -->
            <div class="waterfall-columns-grid">
              <!-- Left Waterfall Column -->
              <div class="waterfall-col left">
                ${leftLogos.map(l => `
                  <div class="wf-avatar" style="background-color:${l.bg};color:${l.color}" title="${l.text}">
                    ${l.text}
                  </div>
                `).join('')}
              </div>

              <!-- Center Waterfall Column -->
              <div class="waterfall-col center">
                ${centerLogos.map(l => `
                  <div class="wf-avatar" style="background-color:${l.bg};color:${l.color}" title="${l.text}">
                    ${l.text}
                  </div>
                `).join('')}
              </div>

              <!-- Right Waterfall Column -->
              <div class="waterfall-col right">
                ${rightLogos.map(l => `
                  <div class="wf-avatar" style="background-color:${l.bg};color:${l.color}" title="${l.text}">
                    ${l.text}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Embedded in video circular badge row -->
            <div class="waterfall-video-row">
              <span class="wf-video-label">Embedded in video:</span>
              <div class="wf-video-badges">
                <span class="video-avatar-badge" style="background-color:#0055a5;">NBC</span>
                <span class="video-avatar-badge" style="background-color:#111111;">ABC</span>
                <span class="video-avatar-badge" style="background-color:#003366;">CBS</span>
                <span class="video-avatar-badge" style="background-color:#002b66;">PBS</span>
                <span class="video-avatar-badge" style="background-color:#cc0000;">POL</span>
                <span class="video-avatar-badge" style="background-color:#2c3e50;">NPR</span>
                <span class="video-avatar-badge" style="background-color:#bb1919;">TIME</span>
                <span class="video-avatar-badge more">+27</span>
              </div>
            </div>
          </div>

          <!-- 3. Factuality Card -->
          <div class="sidebar-widget-card widget-factuality">
            <div class="widget-header-with-info">
              <h4 class="widget-card-title">Factuality</h4>
              <button class="info-circle-btn" title="About Factuality rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
            
            <p class="widget-lead-stat">Based on fact-checking evaluations by independent media auditors</p>
            
            <div class="fact-bar-strip">
              <div class="fact-seg high" style="width: 82%" title="High: 82%"></div>
              <div class="fact-seg mixed" style="width: 15%" title="Mixed: 15%"></div>
              <div class="fact-seg low" style="width: 3%" title="Low: 3%"></div>
            </div>
            <div class="fact-labels">
              <span class="fact-tag high">High (82%)</span>
              <span class="fact-tag mixed">Mixed (15%)</span>
              <span class="fact-tag low">Low (3%)</span>
            </div>
          </div>

          <!-- 4. Ownership Card -->
          <div class="sidebar-widget-card widget-ownership">
            <div class="widget-header-with-info">
              <h4 class="widget-card-title">Ownership</h4>
              <button class="info-circle-btn" title="About Media Ownership">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
            
            <p class="widget-lead-stat">Corporations vs. Independent vs. State media</p>
            
            <div class="ownership-bar-strip">
              <div class="own-seg corp" style="width: 64%" title="Corporate 64%"></div>
              <div class="own-seg ind" style="width: 22%" title="Independent 22%"></div>
              <div class="own-seg nonprof" style="width: 10%" title="Non-profit 10%"></div>
              <div class="own-seg state" style="width: 4%" title="State-backed 4%"></div>
            </div>
            <div class="ownership-labels">
              <span class="own-tag corp">Corporate (64%)</span>
              <span class="own-tag ind">Indep. (22%)</span>
              <span class="own-tag other">Other (14%)</span>
            </div>
          </div>

          <!-- 5. Foreign Publications Dropdown Card -->
          <div class="sidebar-widget-card widget-location-coverage">
            <div class="loc-dropdown-box">
              <div class="loc-text-col">
                <span class="loc-title">Coverage from 32 foreign audiences, translated to english.</span>
                <span class="loc-subtitle">View stories translated from French, German, Russian, etc.</span>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <!-- 6. More Stories Like This -->
          <div class="sidebar-widget-card widget-related-stories">
            <h4 class="widget-card-title">More stories like this</h4>
            
            <div class="related-stories-list">
              ${moreStoriesLikeThis.map(rel => `
                <div class="related-story-row">
                  <span class="related-story-cat-tag">${rel.category}</span>
                  <h5 class="related-story-title">${rel.title}</h5>
                  <div class="related-story-meta">
                    <div class="gn-bias-strip mini">
                      <div class="gn-seg gn-seg-left" style="width:${rel.bias.left}%"></div>
                      <div class="gn-seg gn-seg-center" style="width:${rel.bias.center}%"></div>
                      <div class="gn-seg gn-seg-right" style="width:${rel.bias.right}%"></div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 7. Similar News Topics -->
          <div class="sidebar-widget-card widget-similar-topics">
            <h4 class="widget-card-title">Similar News Topics</h4>
            
            <div class="similar-topics-list">
              ${similarTopics.map(topic => `
                <div class="similar-topic-row">
                  <span>${topic}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
              `).join('')}
            </div>

            <a href="#" class="show-all-topics-btn">Show all</a>
          </div>

        </aside>
      </div>

    </div>
  `;
}
