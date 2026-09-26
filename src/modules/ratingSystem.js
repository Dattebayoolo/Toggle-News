// The publication rating system — one canonical model used by every view.
//
// Two dimensions, both aggregated from published third-party reviews (AllSides,
// Ad Fontes Media, Media Bias/Fact Check) rather than invented here:
//
//   Bias        five stops from Left (-2) to Right (+2); the three buckets the
//               cards use (left / center / right) are derived from the stop.
//   Factuality  three levels — High, Mixed, Low — describing sourcing accuracy,
//               independent of bias (a center outlet can be Mixed, a partisan
//               outlet can be High).
//
// A publisher we hold no rating for is reported as *unrated*: never defaulted to
// Center, never guessed. `RATING_METHODOLOGY` is what the UI shows to explain
// the scales.
//
// Pure — no DOM, no store — so every rule and every piece of markup is testable.

export const BIAS_SCALE = [
  {
    score: -2,
    label: 'Left',
    short: 'L',
    bucket: 'left',
    color: '#1a73e8',
    description: 'Reporting and commentary that reliably favours progressive positions.'
  },
  {
    score: -1,
    label: 'Lean Left',
    short: 'LL',
    bucket: 'left',
    color: '#5c9df3',
    description: 'Solid reporting that tilts left in story selection and framing.'
  },
  {
    score: 0,
    label: 'Center',
    short: 'C',
    bucket: 'center',
    color: '#9aa0a6',
    description: 'Straight-news desks, wire services and public broadcasters aiming for the middle.'
  },
  {
    score: 1,
    label: 'Lean Right',
    short: 'LR',
    bucket: 'right',
    color: '#f2857a',
    description: 'Solid reporting that tilts right in story selection and framing.'
  },
  {
    score: 2,
    label: 'Right',
    short: 'R',
    bucket: 'right',
    color: '#ea4335',
    description: 'Reporting and commentary that reliably favours conservative positions.'
  }
];

export const FACTUALITY_SCALE = [
  {
    value: 'High',
    score: 3,
    color: '#34a853',
    chartY: 22,
    description: 'Well-sourced reporting, transparent corrections, opinion clearly labelled.'
  },
  {
    value: 'Mixed',
    score: 2,
    color: '#f9ab00',
    chartY: 72,
    description: 'Mostly accurate, with occasional unsupported claims, weak sourcing or opinion mixed into news.'
  },
  {
    value: 'Low',
    score: 1,
    color: '#ea4335',
    chartY: 88,
    description: 'Frequent inaccuracies, misleading framing or fabricated content.'
  }
];

export const UNRATED_LABEL = 'Unrated';

/** What the app tells readers about where ratings come from. */
export const RATING_METHODOLOGY = {
  sources:
    'Ratings aggregate published third-party reviews — AllSides, Ad Fontes Media and Media Bias/Fact Check — held in the outlet database.',
  bias:
    'Each publication sits on a five-stop scale from Left to Right. Cards collapse the five stops into the Left / Center / Right buckets used across the app.',
  factuality:
    'Factuality describes how reliably an outlet reports, independent of its bias: High, Mixed or Low.',
  unrated:
    'Publishers outside the database are labelled “Unrated”. No lean is claimed for them, and their articles count as unrated coverage rather than being forced into a bucket.'
};

/** Coerce anything that should be a -2…+2 bias score; null when it is not one. */
export function normalizeBiasScore(value) {
  const score = typeof value === 'string' ? Number(value) : value;
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  const rounded = Math.round(score);
  return rounded < -2 || rounded > 2 ? null : rounded;
}

/** The scale stop for a score, or null when there is no usable score. */
export function biasStopForScore(value) {
  const score = normalizeBiasScore(value);
  return score === null ? null : BIAS_SCALE.find((stop) => stop.score === score) || null;
}

/**
 * The three buckets the cards use. Unrated publishers get null on purpose — they
 * are never forced into Center.
 */
export function biasBucketForScore(value) {
  const stop = biasStopForScore(value);
  return stop ? stop.bucket : null;
}

/** Coerce factuality wording to a scale level name (case-insensitive). */
export function normalizeFactuality(value) {
  const name = String(value || '').trim().toLowerCase();
  if (!name) return null;
  const level = FACTUALITY_SCALE.find((entry) => entry.value.toLowerCase() === name);
  return level ? level.value : null;
}

/** The factuality level object for a value, or null when unrated. */
export function factualityLevel(value) {
  const name = normalizeFactuality(value);
  return name ? FACTUALITY_SCALE.find((entry) => entry.value === name) : null;
}

/**
 * Canonical rating record for a database row (or any source-like object).
 * `rated` is false when neither dimension could be established.
 */
export function ratingFor(source = {}) {
  const stop = biasStopForScore(source.biasScore);
  const factuality = normalizeFactuality(source.factuality);
  const level = factuality ? factualityLevel(factuality) : null;

  return {
    rated: Boolean(stop || level),
    publisher: source.name || source.publisher || null,
    biasScore: stop ? stop.score : null,
    biasLabel: stop ? stop.label : null,
    bucket: stop ? stop.bucket : null,
    stop,
    factuality,
    level
  };
}

/** The rating record used for publishers we hold no review for. */
export function unratedRating(publisher = null) {
  return {
    rated: false,
    publisher,
    biasScore: null,
    biasLabel: null,
    bucket: null,
    stop: null,
    factuality: null,
    level: null
  };
}

/**
 * Five-stop bias meter with the outlet's stop filled — the compact visual used on
 * directory cards, the chart inspector and the outlet dossier.
 */
export function renderBiasMeter(score, { showLabel = true, className = '' } = {}) {
  const stop = biasStopForScore(score);
  const stops = BIAS_SCALE.map((entry) => {
    const active = stop ? entry.score === stop.score : false;
    return `<span class="rating-meter-stop${active ? ' is-active' : ''}" style="--stop-color:${entry.color}" title="${entry.label}"></span>`;
  }).join('');
  const label = stop ? stop.label : UNRATED_LABEL;

  return `<span class="rating-meter${className ? ` ${className}` : ''}" role="img" aria-label="Bias: ${label}">
      <span class="rating-meter-track">${stops}</span>
      ${showLabel ? `<span class="rating-meter-label"${stop ? ` style="color:${stop.color}"` : ''}>${label}</span>` : ''}
    </span>`;
}

/** Factuality pill; unrated publishers get a neutral, clearly-unrated pill. */
export function renderFactualityBadge(value, { suffix = '' } = {}) {
  const level = factualityLevel(value);
  if (!level) {
    return `<span class="rating-fact-badge is-unrated" title="${RATING_METHODOLOGY.unrated}">${UNRATED_LABEL}</span>`;
  }
  return `<span class="rating-fact-badge" style="--fact-color:${level.color}" title="${level.description}">${level.value}${suffix}</span>`;
}

/** The scales explained — shown in the media directory and the outlet dossier. */
export function renderRatingLegend({ compact = false } = {}) {
  const biasRows = BIAS_SCALE.map((stop) => `
      <li class="rating-legend-row">
        <span class="rating-meter-stop is-active" style="--stop-color:${stop.color}"></span>
        <span class="rating-legend-name">${stop.label}</span>
        <span class="rating-legend-desc">${stop.description}</span>
      </li>`).join('');

  const factRows = FACTUALITY_SCALE.map((level) => `
      <li class="rating-legend-row">
        ${renderFactualityBadge(level.value)}
        <span class="rating-legend-desc">${level.description}</span>
      </li>`).join('');

  return `
    <div class="rating-legend${compact ? ' is-compact' : ''}">
      <div class="rating-legend-col">
        <h4 class="rating-legend-title">Bias scale</h4>
        <ul class="rating-legend-list">${biasRows}</ul>
      </div>
      <div class="rating-legend-col">
        <h4 class="rating-legend-title">Factuality levels</h4>
        <ul class="rating-legend-list">${factRows}</ul>
        <p class="rating-legend-note">${RATING_METHODOLOGY.unrated}</p>
      </div>
      <p class="rating-legend-source">${RATING_METHODOLOGY.sources}</p>
    </div>`;
}
