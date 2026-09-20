// Media Bias & Factuality Directory with 2D Interactive Scatter Chart
// Modeled on Ground News and AllSides Media Ratings Chart

import { SOURCES } from '../data/sourcesData.js';

let activeBiasFilter = 'all';
let activeFactualityFilter = 'all';
let searchFilter = '';
let directoryViewMode = 'chart'; // 'chart' | 'grid'
let selectedSourceForChart = SOURCES[0];

export function renderMediaDirectory() {
  let filtered = SOURCES.filter(s => {
    // Bias filter
    if (activeBiasFilter !== 'all') {
      if (activeBiasFilter === 'left' && s.biasScore > -1) return false;
      if (activeBiasFilter === 'center' && s.biasScore !== 0) return false;
      if (activeBiasFilter === 'right' && s.biasScore < 1) return false;
    }
    // Factuality filter
    if (activeFactualityFilter !== 'all' && s.factuality.toLowerCase() !== activeFactualityFilter) {
      return false;
    }
    // Search
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchOwner = s.ownership.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchDesc) return false;
    }
    return true;
  });

  return `
    <div class="directory-container">
      <div class="directory-hero">
        <div class="hero-badge">
          <span>INDEPENDENT THIRD-PARTY AUDIT</span>
        </div>
        <h2>🏢 Media Bias & Reliability Ratings</h2>
        <p>Ground News aggregates bias and reliability ratings from AllSides, Ad Fontes Media, and Media Bias Fact Check to evaluate over 30 leading global publications.</p>

        <!-- View Mode Switcher (Chart vs Grid) -->
        <div class="dir-view-mode-toggle">
          <button class="dir-mode-btn ${directoryViewMode === 'chart' ? 'active' : ''}" data-dir-mode="chart">
            🧭 Interactive 2D Bias Chart
          </button>
          <button class="dir-mode-btn ${directoryViewMode === 'grid' ? 'active' : ''}" data-dir-mode="grid">
            📋 Publications Directory (${filtered.length})
          </button>
        </div>

        <div class="directory-controls">
          <div class="dir-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="dirSearchInput" placeholder="Filter by publication name or owner (e.g. Reuters, Murdoch, Bezos)..." value="${searchFilter}" />
          </div>

          <div class="dir-filters-row">
            <div class="filter-group">
              <span class="filter-label">Political Lean:</span>
              <button class="dir-pill ${activeBiasFilter === 'all' ? 'active' : ''}" data-dir-bias="all">All</button>
              <button class="dir-pill dir-pill-left ${activeBiasFilter === 'left' ? 'active' : ''}" data-dir-bias="left">Left</button>
              <button class="dir-pill dir-pill-center ${activeBiasFilter === 'center' ? 'active' : ''}" data-dir-bias="center">Center</button>
              <button class="dir-pill dir-pill-right ${activeBiasFilter === 'right' ? 'active' : ''}" data-dir-bias="right">Right</button>
            </div>

            <div class="filter-group">
              <span class="filter-label">Factuality:</span>
              <button class="dir-pill ${activeFactualityFilter === 'all' ? 'active' : ''}" data-dir-fact="all">All</button>
              <button class="dir-pill ${activeFactualityFilter === 'high' ? 'active' : ''}" data-dir-fact="high">High Only</button>
              <button class="dir-pill ${activeFactualityFilter === 'mixed' ? 'active' : ''}" data-dir-fact="mixed">Mixed</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive 2D Chart View -->
      ${directoryViewMode === 'chart' ? render2DChart(filtered) : renderGridView(filtered)}
    </div>
  `;
}

function render2DChart(sourcesList) {
  return `
    <div class="gn-2d-chart-container">
      <div class="chart-legend-top">
        <div class="chart-axis-indicator x-axis">
          <span>⟵ FAR LEFT</span>
          <span>LEAN LEFT</span>
          <span class="center-tag">CENTER (NEUTRAL)</span>
          <span>LEAN RIGHT</span>
          <span>FAR RIGHT ⟶</span>
        </div>
      </div>

      <div class="gn-2d-scatter-canvas">
        <div class="canvas-grid-lines">
          <div class="grid-col left-zone"></div>
          <div class="grid-col center-zone"></div>
          <div class="grid-col right-zone"></div>
        </div>

        <div class="canvas-y-axis-labels">
          <span class="y-label high">HIGH FACTUALITY</span>
          <span class="y-label mixed">MIXED FACTUALITY</span>
        </div>

        <!-- Dots representing media outlets -->
        <div class="canvas-points-layer">
          ${sourcesList.map(src => {
            // Map biasScore (-2 to +2) to X percent (8% to 92%)
            const xPct = ((src.biasScore + 2) / 4) * 84 + 8;
            // Map factuality to Y percent (High = 22%, Mixed = 72%)
            const yBase = src.factuality === 'High' ? 22 : 72;
            // Add slight deterministic jitter based on name length to prevent overlap
            const jitterX = ((src.name.length % 5) - 2) * 2.5;
            const jitterY = ((src.founded % 5) - 2) * 3;
            const finalX = Math.max(5, Math.min(95, xPct + jitterX));
            const finalY = Math.max(10, Math.min(88, yBase + jitterY));

            const isSelected = selectedSourceForChart && selectedSourceForChart.id === src.id;

            return `
              <div class="chart-outlet-node ${isSelected ? 'selected' : ''}" 
                   style="left: ${finalX}%; top: ${finalY}%; background-color: ${src.color};" 
                   data-chart-source-id="${src.id}" 
                   title="${src.name} (${src.bias} | ${src.factuality} Factuality)">
                <span class="node-abbr">${src.logoText}</span>
                <span class="node-hover-label">${src.name}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Detail Card for Selected Outlet in Chart -->
      ${selectedSourceForChart ? `
        <div class="chart-inspector-card">
          <div class="inspector-left">
            <div class="inspector-avatar" style="background-color: ${selectedSourceForChart.color};">
              ${selectedSourceForChart.logoText}
            </div>
            <div>
              <h3 class="inspector-name">${selectedSourceForChart.name}</h3>
              <span class="inspector-meta">${selectedSourceForChart.country} • Founded ${selectedSourceForChart.founded}</span>
            </div>
          </div>

          <div class="inspector-badges">
            <span class="badge-pill bias-${selectedSourceForChart.biasScore < 0 ? 'left' : (selectedSourceForChart.biasScore > 0 ? 'right' : 'center')}">
              ${selectedSourceForChart.bias}
            </span>
            <span class="badge-pill factuality-${selectedSourceForChart.factuality.toLowerCase()}">
              ${selectedSourceForChart.factuality} Factuality
            </span>
          </div>

          <div class="inspector-owner">
            <span class="owner-label">Ownership:</span>
            <strong>${selectedSourceForChart.ownership}</strong> (${selectedSourceForChart.ownershipType})
          </div>

          <p class="inspector-desc">${selectedSourceForChart.description}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderGridView(filtered) {
  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <h3>No publications match your filter</h3>
        <p>Try resetting the bias or factuality filters above.</p>
      </div>
    `;
  }

  return `
    <div class="sources-grid">
      ${filtered.map(source => {
        let biasClass = 'center';
        if (source.biasScore <= -1) biasClass = 'left';
        if (source.biasScore >= 1) biasClass = 'right';

        return `
          <div class="source-card">
            <div class="source-card-top">
              <div class="source-avatar" style="background-color: ${source.color};">
                ${source.logoText}
              </div>
              <div class="source-main-info">
                <h4 class="source-name">${source.name}</h4>
                <span class="source-country">${source.country} • Est. ${source.founded}</span>
              </div>
            </div>

            <div class="source-ratings-strip">
              <div class="rating-badge-item">
                <span class="badge-mini-label">BIAS RATING</span>
                <span class="badge-pill bias-${biasClass}">
                  ${source.bias}
                </span>
              </div>
              <div class="rating-badge-item">
                <span class="badge-mini-label">FACTUALITY</span>
                <span class="badge-pill factuality-${source.factuality.toLowerCase()}">
                  ${source.factuality}
                </span>
              </div>
            </div>

            <div class="source-ownership-box">
              <span class="ownership-title">Ownership & Transparency:</span>
              <p class="ownership-text">
                <strong>${source.ownership}</strong> (${source.ownershipType})
              </p>
            </div>

            <p class="source-description">
              ${source.description}
            </p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachDirectoryEvents(container, onUpdate) {
  const searchInput = container.querySelector('#dirSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFilter = e.target.value;
      onUpdate();
    });
  }

  container.querySelectorAll('[data-dir-bias]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeBiasFilter = e.currentTarget.dataset.dirBias;
      onUpdate();
    });
  });

  container.querySelectorAll('[data-dir-fact]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeFactualityFilter = e.currentTarget.dataset.dirFact;
      onUpdate();
    });
  });

  container.querySelectorAll('[data-dir-mode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      directoryViewMode = e.currentTarget.dataset.dirMode;
      onUpdate();
    });
  });

  container.querySelectorAll('[data-chart-source-id]').forEach(node => {
    node.addEventListener('click', (e) => {
      const srcId = e.currentTarget.dataset.chartSourceId;
      selectedSourceForChart = SOURCES.find(s => s.id === srcId);
      onUpdate();
    });
  });
}
