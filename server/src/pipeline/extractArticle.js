// Article text extraction — turns a publisher's HTML page into the story body.
//
// Wire feeds only carry a headline and a one-line summary, so the full text is
// recovered from the article page itself. This is a deliberately small,
// dependency-free readability pass: drop the chrome that is never story text,
// prefer the page's own <article> / <main> container, keep the paragraphs that
// read like prose, and throw the rest away.
//
// Pure — no I/O, no database — so it can be tested against saved markup. The
// network side lives in ./contentEnricher.js.

const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  times: '×', laquo: '«', raquo: '»', middot: '·', bull: '•', deg: '°', pound: '£', euro: '€'
};

/** Decode named and numeric HTML entities. Unknown entities collapse to a space. */
export function decodeEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ' '; }
    })
    .replace(/&#(\d+);/g, (match, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return ' '; }
    })
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? ' ');
}

/** Strip tags + decode entities and collapse whitespace into flowing text. */
export function htmlToText(fragment) {
  return decodeEntities(String(fragment || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Containers that never hold story body text.
const DROP_BLOCKS = [
  'script', 'style', 'noscript', 'svg', 'iframe', 'template', 'form',
  'nav', 'header', 'footer', 'aside', 'button', 'select', 'option',
  'canvas', 'video', 'audio', 'figcaption'
];

/** Remove comments and non-content blocks (repeated until the markup settles). */
function dropChrome(html) {
  const pattern = new RegExp(`<(${DROP_BLOCKS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1>`, 'gi');
  let out = String(html || '').replace(/<!--[\s\S]*?-->/g, ' ');
  let previous;
  do {
    previous = out;
    out = out.replace(pattern, ' ');
  } while (out !== previous);
  return out;
}

/**
 * Pick the container most likely to hold the story: the longest <article>, then
 * the longest <main>, then a role="main" block, else the whole document.
 */
function pickContainer(html) {
  const candidates = [];
  for (const tag of ['article', 'main']) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    let match;
    while ((match = re.exec(html))) candidates.push(match[0]);
  }
  const roleMain = html.match(/<div\b[^>]*role\s*=\s*["']main["'][^>]*>[\s\S]*<\/div>/i);
  if (roleMain) candidates.push(roleMain[0]);
  if (!candidates.length) return html;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

// Paragraph openers that signal site furniture rather than reporting.
const BOILERPLATE_RE =
  /^(subscribe|sign ?up|sign ?in|log ?in|advertisement|ad\b|read more|share\b|follow us|listen to|watch\b|download|related|more from|photo|image|credit|caption|getty|copyright|all rights reserved|terms\b|privacy|cookie|we use cookies|enable javascript|comment)/i;

const SENTENCE_RE = /[.!?]["')\]]?(\s|$)/;

/** Does this paragraph read like a sentence of reporting? */
function isArticleParagraph(text) {
  if (text.length < 60) return false;
  const words = text.split(' ').filter(Boolean);
  if (words.length < 10) return false;
  if (BOILERPLATE_RE.test(text)) return false;
  if (!/[a-zA-Z]/.test(text)) return false;
  // Long lines can get away without terminal punctuation; short ones cannot.
  return SENTENCE_RE.test(text) || text.length > 160;
}

/**
 * Extract the article body from a publisher page.
 * Returns `{ text, paragraphs, wordCount }` — `text` is '' when nothing usable
 * was found (paywall, login wall, JavaScript-only page).
 */
export function extractArticleText(html, { maxChars = 12000, maxParagraphs = 80 } = {}) {
  const empty = { text: '', paragraphs: [], wordCount: 0 };
  if (!html) return empty;

  const container = pickContainer(dropChrome(html));
  const blocks = container.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];

  const seen = new Set();
  const paragraphs = [];
  let total = 0;

  for (const block of blocks) {
    const text = htmlToText(block);
    if (!isArticleParagraph(text)) continue;

    const key = text.slice(0, 120).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (total + text.length > maxChars) break;
    total += text.length + 2;
    paragraphs.push(text);
    if (paragraphs.length >= maxParagraphs) break;
  }

  const text = paragraphs.join('\n\n');
  return {
    text,
    paragraphs,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0
  };
}
