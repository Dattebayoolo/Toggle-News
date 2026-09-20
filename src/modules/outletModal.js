// Outlet Intelligence Dossier — Publisher Transparency Modal
// Opens when user clicks any publisher avatar or source badge

import { SOURCES } from '../data/sourcesData.js';

// Supplementary data for outlet dossiers
const OUTLET_EXTENDED = {
  'cnn': {
    adFontes: 42.5,
    mbfc: 'High',
    allsidesScore: 'Lean Left',
    founded: 1980,
    hq: 'Atlanta, Georgia, USA',
    recentHeadlines: [
      'Trump signals possible reversal on Canada tariffs amid economic pressure',
      'Federal Reserve holds rates steady as inflation ticks up slightly',
      'Democrats split on AI regulation strategy ahead of 2026 midterms',
    ]
  },
  'nyt': {
    adFontes: 50.2,
    mbfc: 'Very High',
    allsidesScore: 'Lean Left',
    founded: 1851,
    hq: 'New York City, USA',
    recentHeadlines: [
      'Inside the White House debate over AI military deployment',
      'Trump\'s "AI Czar" search narrows to three candidates',
      'What the AI Force means for Silicon Valley\'s defense contracts',
    ]
  },
  'fox-news': {
    adFontes: 26.2,
    mbfc: 'Mixed',
    allsidesScore: 'Right',
    founded: 1996,
    hq: 'New York City, USA',
    recentHeadlines: [
      'Trump announces AI Force to counter China\'s growing dominance',
      'Democrats slam administration AI plan as "government overreach"',
      'Border security tech: How AI is reshaping enforcement on the southern border',
    ]
  },
  'reuters': {
    adFontes: 56.7,
    mbfc: 'Very High',
    allsidesScore: 'Center',
    founded: 1851,
    hq: 'London, United Kingdom',
    recentHeadlines: [
      'US, China to hold rare AI security talks in Washington',
      'Bessent confirms diplomatic channel open for semiconductor trade',
      'Global AI regulation summit set for November in Geneva',
    ]
  },
  'bbc': {
    adFontes: 53.8,
    mbfc: 'High',
    allsidesScore: 'Center',
    founded: 1927,
    hq: 'London, United Kingdom',
    recentHeadlines: [
      'Trump AI Force: What the plan means for US tech strategy',
      'UK warns of risks in unregulated AI military applications',
      'China responds to US AI Force announcement with "deep concern"',
    ]
  },
  'wsj': {
    adFontes: 46.1,
    mbfc: 'High',
    allsidesScore: 'Lean Right',
    founded: 1889,
    hq: 'New York City, USA',
    recentHeadlines: [
      'Trump\'s AI Force: A regulatory win for big tech or a new bureaucracy?',
      'Markets rally on AI policy clarity from White House',
      'Semiconductor stocks surge as AI military spending signals boost demand',
    ]
  }
};

const BIAS_LABELS = {
  '-2': { text: 'Left', color: '#2563eb', pct: 10 },
  '-1': { text: 'Lean Left', color: '#60a5fa', pct: 30 },
  '0':  { text: 'Center', color: '#64748b', pct: 50 },
  '1':  { text: 'Lean Right', color: '#f97316', pct: 70 },
  '2':  { text: 'Right', color: '#dc2626', pct: 90 },
};

const FACTUALITY_CONFIG = {
  'Very High': { pct: 95, color: '#10b981' },
  'High':      { pct: 78, color: '#34d399' },
  'Mixed':     { pct: 50, color: '#eab308' },
  'Low':       { pct: 20, color: '#f87171' },
  'Very Low':  { pct: 5,  color: '#dc2626' },
};

export function openOutletDossier(outletId) {
  const source = SOURCES.find(s => s.id === outletId);
  if (!source) return;
  const ext = OUTLET_EXTENDED[outletId] || {};
  renderOutletModal(source, ext);
}

function renderOutletModal(source, ext) {
  closeOutletDossier();

  const biasKey = String(source.biasScore ?? 0);
  const biasConf = BIAS_LABELS[biasKey] || BIAS_LABELS['0'];
  const factConf = FACTUALITY_CONFIG[source.factuality] || FACTUALITY_CONFIG['Mixed'];
  const adFontes = ext.adFontes ?? '—';
  const headlines = ext.recentHeadlines ?? [
    'No recent headlines available for this outlet.',
  ];

  const ownershipTypeColors = {
    'Corporate Conglomerate': '#eab308',
    'Publicly Traded / Family Trust': '#8b5cf6',
    'Billionaire Individual': '#f97316',
    'Government / State-Backed': '#3b82f6',
    'Independent Trust': '#10b981',
    'Non-Profit': '#06b6d4',
    'Private Equity': '#ec4899',
  };
  const ownerColor = ownershipTypeColors[source.ownershipType] || '#64748b';

  const overlay = document.createElement('div');
  overlay.id = 'outlet-dossier-overlay';
  overlay.className = 'outlet-dossier-overlay';
  overlay.innerHTML = `
    <div class="outlet-dossier-modal" role="dialog" aria-modal="true">
      
      <!-- Header -->
      <div class="od-header">
        <div class="od-outlet-brand">
          <div class="od-outlet-avatar" style="background-color:${source.color}">
            ${source.logoText}
          </div>
          <div class="od-outlet-name-block">
            <h2 class="od-outlet-name">${source.name}</h2>
            <span class="od-outlet-country">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              ${source.country} · Est. ${source.founded}${ext.hq ? ' · ' + ext.hq : ''}
            </span>
          </div>
        </div>
        <button class="od-close-btn" data-action="close-outlet-dossier" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Description -->
      <p class="od-description">${source.description || 'A major news media outlet.'}</p>

      <!-- Metrics Grid -->
      <div class="od-metrics-grid">

        <!-- Bias Rating -->
        <div class="od-metric-card">
          <div class="od-metric-header">
            <span class="od-metric-label">Media Bias</span>
            <span class="od-metric-badge" style="background:${biasConf.color}20;color:${biasConf.color};border-color:${biasConf.color}40">
              ${biasConf.text}
            </span>
          </div>
          <div class="od-bias-spectrum">
            <span class="od-spec-end left">Left</span>
            <div class="od-spec-track">
              <div class="od-spec-marker" style="left:${biasConf.pct}%;background:${biasConf.color}"></div>
            </div>
            <span class="od-spec-end right">Right</span>
          </div>
          <p class="od-metric-note">Source: AllSides Media Bias Rating${ext.allsidesScore ? ' — ' + ext.allsidesScore : ''}</p>
        </div>

        <!-- Factuality -->
        <div class="od-metric-card">
          <div class="od-metric-header">
            <span class="od-metric-label">Factuality</span>
            <span class="od-metric-badge" style="background:${factConf.color}20;color:${factConf.color};border-color:${factConf.color}40">
              ${source.factuality}
            </span>
          </div>
          <div class="od-fact-bar-track">
            <div class="od-fact-bar-fill" style="width:${factConf.pct}%;background:${factConf.color}"></div>
          </div>
          <p class="od-metric-note">Ad Fontes Score: <strong>${adFontes}</strong>${ext.mbfc ? ' · MBFC: ' + ext.mbfc : ''}</p>
        </div>

      </div>

      <!-- Ownership -->
      <div class="od-section">
        <h3 class="od-section-title">Ownership</h3>
        <div class="od-ownership-row">
          <div class="od-ownership-badge" style="border-color:${ownerColor};color:${ownerColor}">
            ${source.ownershipType || 'Unknown'}
          </div>
          <span class="od-ownership-name">${source.ownership || 'Unknown'}</span>
        </div>
      </div>

      <!-- Recent Headlines -->
      <div class="od-section">
        <h3 class="od-section-title">Recent Headlines</h3>
        <ul class="od-headlines-list">
          ${headlines.map(h => `
            <li class="od-headline-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>${h}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Footer Actions -->
      <div class="od-footer">
        <button class="od-action-btn secondary" data-action="close-outlet-dossier">Close</button>
        <a href="#" class="od-action-btn primary">View Full Profile</a>
      </div>

    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOutletDossier();
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

export function closeOutletDossier() {
  const overlay = document.getElementById('outlet-dossier-overlay');
  if (overlay) overlay.remove();
}
