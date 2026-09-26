// Wire coverage matching — the "who else covered this story" layer.
//
// Ground News groups articles into stories and shows the lean mix of the outlets
// covering each one. The wires we read ship articles ungrouped, so this module
// matches them by headline: two articles join the same story when their headlines
// share enough significant words. Only articles actually loaded from the wire are
// counted — nothing is inferred about outlets that may have covered the event
// outside our fetch window, and the UI states that.
//
// Pure — no store, no DOM — so the matching rules can be tested directly.

// Words that appear in almost every headline and carry no event identity.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'so', 'to', 'of', 'in', 'on', 'for',
  'with', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'this', 'that', 'these', 'those', 'he', 'she', 'they', 'them', 'his', 'her', 'their', 'you',
  'your', 'we', 'our', 'us', 'not', 'no', 'says', 'said', 'after', 'before', 'over', 'under',
  'into', 'about', 'up', 'out', 'off', 'new', 'more', 'most', 'will', 'would', 'can', 'could',
  'may', 'might', 'has', 'have', 'had', 'do', 'does', 'did', 'how', 'why', 'what', 'when', 'where',
  'who', 'whom', 'which', 'while', 'amid', 'among', 'during', 'per', 'via', 'also', 'just', 'now'
]);

const MIN_SHARED_TOKENS = 3;
const MIN_OVERLAP = 0.4;

/** Significant words of a headline (lowercased, stopwords and short words dropped). */
export function storyTokens(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
  );
}

function sharedTokens(a, b) {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared;
}

/** Overlap coefficient: shared significant words over the shorter headline. */
export function titleSimilarity(a, b) {
  const left = a instanceof Set ? a : storyTokens(a);
  const right = b instanceof Set ? b : storyTokens(b);
  if (!left.size || !right.size) return 0;
  return sharedTokens(left, right) / Math.min(left.size, right.size);
}

/** Same compaction the bias matcher uses — kept local to avoid an import cycle. */
function compactName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Articles from other outlets that report the same event as `story`, matched by
 * headline words. Same-outlet articles are left out — a second article from the
 * same publisher is not a second source.
 */
export function findRelatedCoverage(story, stories = [], { limit = 12 } = {}) {
  if (!story?.title) return [];
  const tokens = storyTokens(story.title);
  if (!tokens.size) return [];
  const ownOutlet = compactName(story.rating?.publisher || story.publisher);

  return (stories || [])
    .filter((candidate) => candidate && candidate.id !== story.id && candidate.title)
    .map((candidate) => {
      const other = storyTokens(candidate.title);
      const shared = sharedTokens(tokens, other);
      return {
        story: candidate,
        shared,
        overlap: Math.min(tokens.size, other.size) ? shared / Math.min(tokens.size, other.size) : 0
      };
    })
    .filter((match) => {
      const outlet = compactName(match.story.rating?.publisher || match.story.publisher);
      if (outlet && ownOutlet && outlet === ownOutlet) return false;
      return match.shared >= MIN_SHARED_TOKENS && match.overlap >= MIN_OVERLAP;
    })
    .sort((a, b) => b.overlap - a.overlap || b.shared - a.shared)
    .slice(0, limit);
}

/** Lean mix of a set of stories, counting unrated outlets separately. */
export function summarizeCoverageStories(stories = []) {
  const counts = { left: 0, center: 0, right: 0, unrated: 0 };
  for (const story of stories) {
    if (story?.rating?.hasLean && story.rating.bucket in counts) counts[story.rating.bucket] += 1;
    else counts.unrated += 1;
  }
  return { ...counts, total: counts.left + counts.center + counts.right + counts.unrated };
}

/**
 * Integer percentage breakdown of a lean mix, for the labelled bar.
 *
 * Accepts either a coverage summary ({ left, center, right, unrated, total })
 * or a bare distribution ({ left, center, right }) — the total is derived when
 * it is not supplied.
 */
export function coveragePercents(source) {
  const counts = source || {};
  const total = counts.total ?? ((counts.left || 0) + (counts.center || 0) + (counts.right || 0) + (counts.unrated || 0));
  if (!total) return { left: 0, center: 0, right: 0, unrated: 0 };

  const keys = ['left', 'center', 'right', 'unrated'];
  const parts = keys.map((key) => {
    const exact = ((counts[key] || 0) / total) * 100;
    return { key, exact, pct: Math.floor(exact) };
  });

  // Largest-remainder rounding: the leftover points go to the segments with the
  // biggest fractions, so the bar always adds up to exactly 100%.
  let remainder = 100 - parts.reduce((sum, part) => sum + part.pct, 0);
  for (const part of [...parts].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct))) {
    if (remainder <= 0) break;
    if (part.exact === 0) continue;
    part.pct += 1;
    remainder -= 1;
  }

  return Object.fromEntries(parts.map((part) => [part.key, part.pct]));
}

/** Lean with the most matched articles. */
export function dominantLean(counts) {
  return ['left', 'center', 'right'].reduce(
    (best, lean) => ((counts?.[lean] || 0) > (counts?.[best] || 0) ? lean : best),
    'center'
  );
}

/**
 * Sides with no coverage at all among the matched articles.
 *
 * Deliberately narrow: only reported with at least `minSources` matched articles
 * and only when the other side *did* cover the event, so a quiet news window is
 * never dressed up as a blindspot. The UI labels this a coverage gap, not a
 * classification.
 */
export function describeCoverageGaps(counts, { minSources = 4 } = {}) {
  if (!counts || counts.total < minSources) return [];
  const gaps = [];
  if (counts.left === 0 && counts.right > 0) gaps.push({ side: 'left', label: 'Left' });
  if (counts.right === 0 && counts.left > 0) gaps.push({ side: 'right', label: 'Right' });
  return gaps;
}

/** Lean mix of the stories the reader has opened (Ground News "My News Bias"). */
export function summarizeReadingDiet(history = []) {
  const counts = { Left: 0, Center: 0, Right: 0 };
  let total = 0;
  for (const item of history) {
    if (!item || !(item.bias in counts)) continue;
    counts[item.bias] += 1;
    total += 1;
  }
  const pct = (count) => (total ? Math.round((count / total) * 100) : 0);
  return {
    total,
    left: counts.Left,
    center: counts.Center,
    right: counts.Right,
    leftPct: pct(counts.Left),
    centerPct: pct(counts.Center),
    rightPct: pct(counts.Right)
  };
}
