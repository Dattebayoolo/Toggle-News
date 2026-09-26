// Article body text shaping — turns extracted plain-text paragraphs into
// presentation-ready pieces.
//
// The extractor in server/src/pipeline/extractArticle.js stores paragraphs as
// plain text (structure is lost), so this module recovers what matters visually:
// a paragraph that is essentially one quote becomes a pull-quote card with its
// attribution, and quotes inside ordinary paragraphs are marked so the renderer
// can emphasise them. Nothing is ever dropped — the split keeps every character.
//
// Pure — no DOM, no store — so the rules can be tested directly.

const OPEN_QUOTES = '“"«';

const isOpeningQuote = (char) => OPEN_QUOTES.includes(char);
const isClosingQuote = (char) => char === '”' || char === '»' || char === '"';

/** Verbs (and phrases) that mark the non-quoted part of a quote paragraph. */
const ATTRIBUTION_RE =
  /\b(said|says|told|tell|added|adds|adding|admitted|admits|conceded|concedes|explained|explains|wrote|writes|warned|warns|noted|notes|argued|argues|stated|states|announced|announces|claimed|claims|reported|reports|insisted|insists|suggested|suggests|described|describes|called|according to|per|posted|tweeted|commented|testified|declared|urged|asked|replied|responded|confirmed|denied)\b/i;

/**
 * Split a paragraph into quoted / unquoted runs.
 * Every character of the input ends up in exactly one run, in order.
 */
export function splitQuotedSpans(text) {
  const value = String(text || '');
  const spans = [];
  let buffer = '';
  let openChar = null;

  for (const char of value) {
    if (!openChar) {
      if (isOpeningQuote(char)) {
        if (buffer) spans.push({ text: buffer, quoted: false });
        buffer = char; // keep the opening quote inside the quoted run
        openChar = char;
      } else {
        buffer += char;
      }
      continue;
    }

    buffer += char;
    if (isClosingQuote(char)) {
      spans.push({ text: buffer, quoted: true });
      buffer = '';
      openChar = null;
    }
  }

  // An unterminated quote (markup often chops one) still reads as quoted text.
  if (buffer) spans.push({ text: buffer, quoted: Boolean(openChar) });
  return spans.filter((span) => span.text.length > 0);
}

/** Trim the punctuation and connector words that glue an attribution to a quote. */
function cleanAttribution(value) {
  return String(value || '')
    .replace(/^[\s:,\u2014\u2013-]+/, '')
    .replace(/[\s:,.]+$/, '')
    // "…posted on X that" / "…saying" read badly under a quote — drop the glue.
    .replace(/\b(that|saying|adding|with|and)\s*$/i, '')
    .replace(/[\s:,.]+$/, '')
    .trim();
}

/**
 * A paragraph that is essentially one quote: `"…," she said.` or
 * `The minister said: "…"`.
 *
 * Returns `{ quote, attribution }` only when the paragraph is one quoted passage
 * that makes up most of the text *and* everything outside the quote is a single
 * attribution line. A card shows only the quote and that line, so any other
 * shape — prose on both sides, several quoted passages — stays a paragraph and
 * nothing is ever dropped or reordered.
 */
export function extractQuoteCard(text) {
  const value = String(text || '');
  const spans = splitQuotedSpans(value);
  const quotedSpans = spans.filter((span) => span.quoted);
  if (quotedSpans.length !== 1) return null;

  const quotedSpan = quotedSpans[0];
  const raw = quotedSpan.text;
  // An unterminated quote (markup often cuts one) keeps every character.
  const inner = (isClosingQuote(raw.slice(-1)) ? raw.slice(1, -1) : raw.slice(1)).trim();
  if (inner.length < 40) return null;

  // The quote must dominate the paragraph, or this is prose that happens to cite.
  if (raw.length / value.length < 0.55) return null;

  const index = spans.indexOf(quotedSpan);
  const before = cleanAttribution(spans.slice(0, index).map((span) => span.text).join(''));
  const after = cleanAttribution(spans.slice(index + 1).map((span) => span.text).join(''));

  // Text on both sides of the quote cannot be shown by a single attribution
  // line, so the paragraph keeps its natural shape instead.
  if (before && after) return null;

  const aside = after || before;
  if (!aside) return { quote: inner, attribution: '' };
  if (aside.length > 140 || !ATTRIBUTION_RE.test(aside)) return null;

  return { quote: inner, attribution: aside };
}
