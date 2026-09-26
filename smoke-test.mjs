// Smoke test for the frontend modules — run with:  node smoke-test.mjs
//
// Covers the live-wire data layer (now the only source of stories), the
// empty-state renderers that replaced the fabricated content, feed composition,
// and the account / newsletter / local-desk modules.
//
// No mock story fixtures are used: articles are built in the exact shape the
// server returns from GET /api/articles.

const storage = new Map();
globalThis.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};

const fs = await import('node:fs');

const { store } = await import('./src/modules/state.js');
const { renderCommunityPoll, renderCommunityPollUnavailable } = await import('./src/modules/communityPoll.js');
const { renderStoryTimeline, renderStoryTimelineUnavailable, getTimelineEvents } =
  await import('./src/modules/storyTimeline.js');
const { renderStoryModal } = await import('./src/modules/storyModal.js');
const { renderHeadlineMatrix } = await import('./src/modules/headlineMatrix.js');
const { renderBlindspotRadar } = await import('./src/modules/blindspotRadar.js');
const { renderLocalNewsWidget, getLocalStories, findCity, CITY_DIRECTORY } =
  await import('./src/modules/localNews.js');
const { renderDietTracker } = await import('./src/modules/dietTracker.js');
const { renderNewsletterForm, handleNewsletterSubmit } = await import('./src/modules/newsletterSignup.js');
const { renderHomeFeedView, renderLocalFeedView } = await import('./src/modules/homeFeed.js');
const { extractArticleText } = await import('./server/src/pipeline/extractArticle.js');
const {
  findRelatedCoverage,
  summarizeCoverageStories,
  coveragePercents,
  describeCoverageGaps,
  summarizeReadingDiet,
  titleSimilarity
} = await import('./src/modules/storyCoverage.js');
const { splitQuotedSpans, extractQuoteCard } = await import('./src/modules/articleText.js');
const { SOURCES } = await import('./src/data/sourcesData.js');

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures += 1;
};

// ── The fabricated dataset must stay deleted ────────────────────────────────
check('fabricated story dataset (newsData.js) is gone', !fs.existsSync('./src/data/newsData.js'));
check('mock story-location map is gone', !fs.existsSync('./src/modules/storyLocations.js'));
check('mock story-card renderer is gone', !fs.existsSync('./src/modules/storyCard.js'));

const shippedGrep = ['src/main.js', 'src/modules/storyModal.js', 'src/modules/outletModal.js', 'src/modules/newsChatDrawer.js']
  .map(f => fs.readFileSync(f, 'utf8'))
  .join('\n');
check('no fabricated story ids remain in shipped modules',
  !/story-trump|story-ukraine|story-gaza|story-hormuz|story-santos/.test(shippedGrep));
check('no simulated AI copy remains in the chat drawer',
  !/AI_RESPONSES|I'm analyzing \*\*/.test(shippedGrep));

// ── Live wire data layer ────────────────────────────────────────────────────
const {
  LIVE_ENDPOINT,
  normalizeOutletName,
  findSourceBias,
  mapServerCategory,
  relativeTime,
  extractPublisher,
  resolveBias,
  articleToStory,
  filterLiveStories,
  summarizeCoverage,
  renderLiveWireRow,
  renderLiveWireSection,
  renderLeadCard,
  renderSectionCard,
  renderWireSections,
  groupWireStories,
  renderLiveArticleModal,
  refreshLiveFeed,
  subscribeLiveFeed,
  setLeanFilter,
  getLeanFilter,
  filterByLean,
  LEAN_FILTERS,
  getLiveState,
  getLiveStories,
  findLiveStory,
  loadArticleContent,
  getArticleContent,
  renderArticleFullText,
  renderCoverageAcrossWire
} = await import('./src/modules/liveFeed.js');

// An article exactly as server/src/db/sqlite.js returns it over /api/articles
const apiArticle = {
  id: 1,
  source_id: 'newsapi-us-top',
  publisher: 'CNN',
  url: 'https://example.com/story-one',
  url_hash: 'abc123',
  title: 'Senate passes funding bill after overnight session',
  summary: 'Lawmakers approved the measure 68-30 following a marathon debate.',
  image_url: 'https://example.com/one.jpg',
  category: 'world',
  author: 'Jane Doe',
  published_at: '2026-09-25T10:00:00.000Z'
};

check('live endpoint points at the server API', LIVE_ENDPOINT === '/api/articles');
check('normalizeOutletName compacts names and drops a leading "The"',
  normalizeOutletName('The New York Times') === 'newyorktimes' && normalizeOutletName('CNN') === 'cnn');
check('normalizeOutletName folds domain forms onto the same key',
  normalizeOutletName('washingtonpost.com') === normalizeOutletName('The Washington Post') &&
  normalizeOutletName('foxnews.com') === normalizeOutletName('Fox News'));
check('findSourceBias resolves domain forms and aliases',
  findSourceBias('washingtonpost.com')?.id === 'washington-post' &&
  findSourceBias('NBC News')?.id === 'nbc-news' && findSourceBias('BBC')?.id === 'bbc');
check('unrateable trade press is left unrated, never forced into a bucket',
  findSourceBias('IGN') === null && findSourceBias('Kotaku') === null && findSourceBias('MacRumors') === null);
check('mapServerCategory maps server slugs to header tabs',
  mapServerCategory('world') === 'World' && mapServerCategory('tech') === 'Technology');
check('relativeTime renders relative ages',
  relativeTime('2026-09-25T10:00:00Z', Date.parse('2026-09-25T10:28:00Z')) === '28 mins ago');
check('extractPublisher uses the wire suffix only for newsapi feeds',
  extractPublisher({ title: 'Storm slams coast - NBC News', source_id: 'newsapi-us-top' }) === 'NBC News' &&
  extractPublisher({ title: 'Storm slams coast - as it happened', source_id: 'guardian-world' }) === '');
check('legacy rows without a publisher resolve to their outlet label',
  resolveBias({ title: 'x', source_id: 'bbc-top' }).publisher === 'BBC News' &&
  resolveBias({ title: 'x', source_id: 'guardian-world' }).rated === true);
check('unknown publisher on a mixed wire is left unrated',
  resolveBias({ title: 'x', publisher: 'Unknown Blog', source_id: 'newsapi-us-top' }).hasLean === false);

const liveStory = articleToStory(apiArticle, Date.parse('2026-09-25T11:00:00Z'));
check('articleToStory produces a component-ready story',
  liveStory.id === 'live-abc123' && liveStory.isLive === true && liveStory.category === 'World' &&
  liveStory.sourceCount === 1 && liveStory.biasDistribution.left === 100);
check('articleToStory keeps the real outbound url + publisher',
  liveStory.articleUrl === 'https://example.com/story-one' && liveStory.publisher === 'CNN');
check('articleToStory rejects rows without a url', articleToStory({ title: 'No url', url_hash: 'z' }) === null);

const secondLiveStory = articleToStory(
  { ...apiArticle, id: 2, url_hash: 'def456', url: 'https://example.com/two', category: 'technology', publisher: 'Vox' },
  Date.parse('2026-09-25T11:00:00Z')
);
check('filterLiveStories filters by category tab',
  filterLiveStories([liveStory, secondLiveStory], { category: 'Technology' }).length === 1);
check('filterLiveStories searches titles, summaries and publishers',
  filterLiveStories([liveStory, secondLiveStory], { query: 'vox' }).length === 1);
check('summarizeCoverage counts each lean',
  summarizeCoverage([liveStory, secondLiveStory]).left === 2);

// ── GDELT-shaped articles (publisher = domain, no summary, no image) ────────
const gdeltArticle = {
  id: 9,
  source_id: 'gdelt-world',
  publisher: 'cnn.com',
  url: 'https://www.cnn.com/2026/09/25/politics/example',
  url_hash: 'gdelt123',
  title: 'Senate advances funding measure',
  summary: null,
  image_url: null,
  category: 'world',
  author: null,
  published_at: '2026-09-25T10:15:00.000Z'
};
const gdeltStory = articleToStory(gdeltArticle, Date.parse('2026-09-25T11:00:00Z'));
check('GDELT domains resolve to outlets in the bias database',
  findSourceBias('cnn.com')?.id === 'cnn' && gdeltStory.rating.rated === true && gdeltStory.rating.bucket === 'left');
check('GDELT rows without a summary fall back to the headline',
  gdeltStory.neutralSummary === 'Senate advances funding measure' && gdeltStory.readTime.endsWith('min read'));
check('unrecognised GDELT domains are left unrated, not guessed',
  articleToStory({ ...gdeltArticle, publisher: 'longtail-news.example' }).rating.hasLean === false);
check('GDELT rows render a monogram tile when there is no image',
  renderLiveWireRow(gdeltStory, { isBookmarked: false }).includes('gn-live-monogram'));

// ── Rendering ───────────────────────────────────────────────────────────────
check('live rows carry real data + the open-modal hook',
  (() => {
    const html = renderLiveWireRow(liveStory, { isBookmarked: false });
    return html.includes('Senate passes funding bill') &&
      html.includes('href="https://example.com/story-one"') &&
      html.includes('data-action="open-modal" data-story-id="live-abc123"');
  })());
check('unrated outlets are labelled, never given a fake lean',
  renderLiveWireRow(articleToStory({ ...apiArticle, publisher: 'Nobody Weekly', source_id: 'newsapi-tech' }),
    { isBookmarked: false }).includes('bias-indicator-tag unrated'));
check('live section renders an offline state with a retry',
  renderLiveWireSection([], { status: 'error', error: 'API responded 503' })
    .includes('Could not reach the Toggle News API'));
check('live article page renders the story with no outbound cta',
  (() => {
    const html = renderLiveArticleModal(liveStory);
    return html.includes('Senate passes funding bill') &&
      !html.includes('Read the full article at') &&
      !html.includes('gn-live-article-cta') &&
      html.includes('data-action="toggle-bookmark"') && html.includes('data-action="close-modal"');
  })());

// ── Full article text: extraction (server, pure) ────────────────────────────
const articleHtml = `<!doctype html><html><head><title>x</title>
  <script>var ad = "subscribe now";</script></head>
  <body>
    <nav><p>Home World Politics Sports Subscribe Sign up now for our newsletter today</p></nav>
    <article>
      <p>Lawmakers approved the funding measure 68-30 after a marathon overnight session that stretched into Saturday morning.</p>
      <p>Senate leaders said the bill &amp; its amendments would head to the House, where a vote is expected next week.</p>
      <p>Subscribe</p>
    </article>
    <footer><p>All rights reserved. Terms of Service. Privacy policy. Cookie settings.</p></footer>
  </body></html>`;

check('the extractor keeps article prose and drops page chrome',
  (() => {
    const { paragraphs, wordCount } = extractArticleText(articleHtml);
    const joined = paragraphs.join(' ');
    return paragraphs.length === 2 && wordCount > 20 &&
      joined.includes('68-30') && joined.includes('bill & its amendments') &&
      !joined.includes('Subscribe') && !joined.includes('Cookie') && !joined.includes('World Politics');
  })());
check('the extractor rejects a page with no article body',
  extractArticleText('<html><body><div><p>Loading…</p></div></body></html>').text === '');

// ── Full article text: rendering + loading (client) ─────────────────────────
check('stories carry the row id + content flag for the article page',
  articleToStory({ ...apiArticle, has_content: 1 }).articleId === 1 &&
  articleToStory({ ...apiArticle, has_content: 1 }).hasContent === true &&
  liveStory.hasContent === false);
check('full-text renderer escapes and lays out paragraphs',
  (() => {
    const html = renderArticleFullText(liveStory, { status: 'ready', paragraphs: ['One <b>thing</b>.', 'Two.'] });
    return html.includes('gn-article-fulltext') && html.includes('One &lt;b&gt;thing&lt;/b&gt;.') &&
      (html.match(/<p>/g) || []).length === 2;
  })());
check('full-text renderer shows a skeleton while the body loads',
  renderArticleFullText(liveStory, { status: 'loading' }).includes('gn-article-fulltext-skeleton') &&
  renderArticleFullText({ ...liveStory, hasContent: true }, null).includes('gn-article-fulltext-skeleton'));
check('full-text renderer renders nothing when no body is stored',
  renderArticleFullText(liveStory, null) === '');
check('full-text renderer explains unavailable bodies',
  renderArticleFullText(liveStory, { status: 'empty' }).includes('does not expose the article body') &&
  renderArticleFullText(liveStory, { status: 'pending' }).includes('still being fetched') &&
  renderArticleFullText(liveStory, { status: 'error', error: 'HTTP 403' }).includes('HTTP 403'));

const loadResult = await (async () => {
  const story = { ...liveStory, articleId: 42 };
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return { ok: true, json: async () => ({ content: null, pending: true }) };
    return { ok: true, json: async () => ({ content: 'First para here.\n\nSecond para here.', has_content: true }) };
  };
  const record = await loadArticleContent(story, { fetchImpl, retryMs: 1 });
  return { calls, record, cached: getArticleContent(story.id) };
})();
check('loadArticleContent retries while pending, then caches the body',
  loadResult.calls === 2 && loadResult.record.status === 'ready' &&
  loadResult.record.paragraphs.length === 2 && loadResult.cached === loadResult.record);

// ── Article body visuals: quote cards + inline quote emphasis ───────────────
const quoteTail = '"Our goal is to give each organization the facts and defer to them on if and when to make the incident public," it said.';
const quoteLead = 'Nevertheless, OpenAI admitted: "This is not an appropriate use of this data".';
const twoQuotes = '"Some organizations may review what we share," it explained. "Others may identify incidents that matter more."';
const plainProse = 'Lawmakers approved the funding measure 68-30 following a marathon debate that stretched into the morning.';

check('quote splitting keeps every character of the paragraph',
  splitQuotedSpans(twoQuotes).map((span) => span.text).join('') === twoQuotes &&
  splitQuotedSpans(twoQuotes).filter((span) => span.quoted).length === 2);
check('quote cards pull out the quote and its attribution',
  (() => {
    const trailing = extractQuoteCard(quoteTail);
    const leading = extractQuoteCard(quoteLead);
    return trailing?.quote.startsWith('Our goal') && trailing.attribution === 'it said' &&
      leading?.quote === 'This is not an appropriate use of this data' &&
      leading.attribution === 'Nevertheless, OpenAI admitted';
  })());
check('prose and multi-quote paragraphs are never turned into cards',
  extractQuoteCard(plainProse) === null && extractQuoteCard(twoQuotes) === null);

// A quote that sits inside prose must stay a paragraph — a card only ever shows
// the quote plus its attribution, so anything else would drop text.
const quoteInProse = 'Powell said schools would be required to "embed healthy relationships and belonging into every part of school life, not just RSHE lessons" and show they were helping to create real-world, authentic community.';
check('a quote surrounded by prose stays a paragraph with nothing dropped',
  extractQuoteCard(quoteInProse) === null &&
  renderArticleFullText(liveStory, { status: 'ready', paragraphs: [quoteInProse] })
    .includes('helping to create real-world, authentic community') &&
  renderArticleFullText(liveStory, { status: 'ready', paragraphs: [quoteInProse] })
    .includes('Powell said schools would be required to'));

const quotePage = renderArticleFullText(liveStory, { status: 'ready', paragraphs: [plainProse, quoteTail, twoQuotes] });
check('article body renders quote cards, attributions and inline quotes',
  (quotePage.match(/<blockquote class="gn-article-quote">/g) || []).length === 1 &&
  quotePage.includes('gn-article-quote-text') &&
  quotePage.includes('<cite class="gn-article-quote-cite">it said</cite>') &&
  quotePage.includes('gn-article-inline-quote') &&
  quotePage.includes('Others may identify incidents that matter more.') &&
  quotePage.includes(plainProse));

// ── Article card composition ────────────────────────────────────────────────
check('article cards show the summary when the wire provides one',
  renderLiveWireRow(liveStory, { isBookmarked: false }).includes('gn-live-snippet'));
check('article cards omit the summary when there is none to show',
  !renderLiveWireRow(gdeltStory, { isBookmarked: false }).includes('gn-live-snippet'));
check('article cards carry a lean strip, rating tag and feed label',
  (() => {
    const html = renderLiveWireRow(liveStory, { isBookmarked: false });
    return html.includes('gn-bias-strip mini') && html.includes('gn-seg-left') &&
      html.includes('bias-indicator-tag left') && html.includes('gn-live-feed');
  })());
check('article cards put the outbound link and bookmark in their own column',
  (() => {
    const html = renderLiveWireRow(liveStory, { isBookmarked: false });
    return html.includes('gn-live-actions') && html.includes('data-action="open-external"') &&
      html.includes('data-action="toggle-bookmark"');
  })());
check('rated outlets get a branded monogram tile',
  renderLiveWireRow(gdeltStory, { isBookmarked: false }).includes('gn-live-monogram is-branded'));

// ── Loader ──────────────────────────────────────────────────────────────────
const wireItems = [
  apiArticle,
  { ...apiArticle, id: 2, url_hash: 'def456', url: 'https://example.com/two', publisher: 'Vox', category: 'technology' }
];
const okState = await refreshLiveFeed({
  fetchImpl: async () => ({ ok: true, json: async () => ({ items: wireItems, total: 2 }) }),
  now: Date.parse('2026-09-25T11:00:00Z')
});
check('refreshLiveFeed loads and adapts API articles',
  okState.status === 'ready' && okState.stories.length === 2 && okState.total === 2);
check('refreshLiveFeed publishes stories for lookup', findLiveStory('live-abc123')?.publisher === 'CNN');
check('refreshLiveFeed de-duplicates concurrent requests',
  (() => {
    let calls = 0;
    const slowFetch = () => { calls += 1; return new Promise(() => {}); };
    refreshLiveFeed({ fetchImpl: slowFetch, autoRetry: false });
    refreshLiveFeed({ fetchImpl: slowFetch, autoRetry: false });
    return calls === 1;
  })());

// ── Freshness badge ─────────────────────────────────────────────────────────
check('fresh articles are flagged, stale ones are not',
  articleToStory(apiArticle, Date.parse('2026-09-25T10:30:00Z')).isFresh === true &&
  articleToStory(apiArticle, Date.parse('2026-09-26T10:30:00Z')).isFresh === false);
check('articles with no usable date are never flagged as fresh',
  articleToStory({ ...apiArticle, published_at: null }, Date.parse('2026-09-25T10:30:00Z')).isFresh === false);
check('the NEW badge follows the freshness flag',
  renderLiveWireRow(articleToStory(apiArticle, Date.parse('2026-09-25T10:30:00Z')), { isBookmarked: false })
    .includes('gn-live-new') &&
  !renderLiveWireRow(articleToStory(apiArticle, Date.parse('2026-09-27T10:30:00Z')), { isBookmarked: false })
    .includes('gn-live-new'));

// ── Outlet lean dot ─────────────────────────────────────────────────────────
check('the outlet dot takes the rating bucket colour',
  renderLiveWireRow(liveStory, { isBookmarked: false }).includes('gn-live-outlet-dot left'));
check('unrated outlets get a neutral dot, not a fake lean colour',
  (() => {
    const html = renderLiveWireRow(
      articleToStory({ ...apiArticle, publisher: 'longtail-news.example' }),
      { isBookmarked: false }
    );
    return html.includes('gn-live-outlet-dot"') && !/gn-live-outlet-dot (left|center|right)/.test(html);
  })());

// ── Lean filter chips ───────────────────────────────────────────────────────
check('the lean filter defaults to all and keeps every story',
  getLeanFilter() === 'all' && filterByLean([liveStory, secondLiveStory]).length === 2);
check('the lean filter narrows to a single bucket',
  filterByLean([liveStory, secondLiveStory], 'left').length === 2 &&
  filterByLean([liveStory, secondLiveStory], 'right').length === 0);
check('the lean filter can isolate unrated publishers',
  filterByLean([liveStory, articleToStory({ ...apiArticle, url_hash: 'x1', url: 'https://example.com/x', publisher: 'Nobody Weekly' })], 'unrated')
    .length === 1);
check('lean chips render with counts and mark the active one',
  (() => {
    setLeanFilter('left');
    const html = renderLiveWireSection([liveStory, secondLiveStory], okState);
    setLeanFilter('all');
    return html.includes('gn-live-chips') && html.includes('data-lean="left"') &&
      html.includes('data-lean="unrated"') && html.includes('gn-live-chip left active');
  })());
check('an empty lean selection explains why and offers a reset',
  (() => {
    setLeanFilter('right');
    const html = renderLiveWireSection([liveStory], okState);
    setLeanFilter('all');
    return html.includes('not from a right-leaning outlet') &&
      html.includes('data-action="filter-lean" data-lean="all"');
  })());
check('every lean bucket is offered as a chip',
  LEAN_FILTERS.length === 5 && LEAN_FILTERS.includes('unrated'));
check('skeletons render while the first page loads',
  renderLiveWireSection([], { status: 'loading' }).includes('gn-live-skeleton'));

// ── Sectioned wire layout ───────────────────────────────────────────────────
// Built with a "now" a day later so the fixtures are stale and land in sections.
const stale = (overrides) => articleToStory(
  { ...apiArticle, ...overrides },
  Date.parse('2026-09-26T11:00:00Z')
);
const staleLeft = stale({ url_hash: 's1', url: 'https://example.com/s1', publisher: 'CNN' });
const staleUnrated = stale({ url_hash: 's2', url: 'https://example.com/s2', publisher: 'Nobody Weekly' });

check('fresh articles go to the Just In strip instead of the lean sections',
  (() => {
    const groups = groupWireStories([liveStory, secondLiveStory, gdeltStory]);
    return groups.lead.id === liveStory.id && groups.justIn.length === 2 && groups.sections.length === 0;
  })());
check('older articles are grouped into their lean sections',
  (() => {
    const groups = groupWireStories([liveStory, staleLeft, staleUnrated]);
    const left = groups.sections.find((s) => s.lean === 'left');
    const unrated = groups.sections.find((s) => s.lean === 'unrated');
    return groups.justIn.length === 0 && groups.sections.length === 2 &&
      left?.stories.length === 1 && unrated?.stories.length === 1;
  })());
check('the lead story is never repeated inside a section',
  (() => {
    const groups = groupWireStories([staleLeft, staleLeft]);
    const sectioned = groups.sections.reduce((n, s) => n + s.stories.length, 0);
    return sectioned + groups.justIn.length === 1;
  })());
check('an empty wire produces no lead and no sections',
  (() => {
    const groups = groupWireStories([]);
    return groups.lead === null && groups.justIn.length === 0 && groups.sections.length === 0;
  })());
check('the lead card gets its own hero treatment',
  (() => {
    const html = renderWireSections([staleLeft, staleUnrated]);
    return html.includes('gn-wire-lead') && html.includes('Top Story') &&
      html.includes('gn-wire-lead-headline') && html.includes('gn-wire-btn');
  })());
check('lean sections render colour-keyed image-top cards',
  (() => {
    const html = renderWireSections([liveStory, staleLeft, staleUnrated]);
    return html.includes('tone-left') && html.includes('tone-unrated') &&
      html.includes('From the Left') && html.includes('Unrated outlets') &&
      html.includes('gn-wire-card theme-left') && html.includes('gn-wire-card theme-unrated') &&
      html.includes('gn-wire-card-media');
  })());
check('the Just In section states its own time window',
  renderWireSections([liveStory, secondLiveStory]).includes('published in the last 90 minutes'));
check('every card type keeps the open-modal + bookmark hooks',
  (() => {
    const lead = renderLeadCard(staleLeft, { isBookmarked: false });
    const card = renderSectionCard(staleLeft, 'left', { isBookmarked: false });
    return lead.includes('data-action="open-modal"') && lead.includes('data-action="toggle-bookmark"') &&
      card.includes('data-action="open-modal"') && card.includes('data-action="toggle-bookmark"');
  })());
check('the wire list renders the sectioned layout',
  renderLiveWireSection([liveStory, secondLiveStory], okState).includes('gn-wire-block'));

// ── Feed composition from live data ─────────────────────────────────────────
const feedHtml = renderHomeFeedView({ liveStories: getLiveStories(), liveState: okState });
check('feed builds the briefing from live articles',
  feedHtml.includes('Daily Briefing') && feedHtml.includes('Senate passes funding bill'));
check('feed renders the coverage sidebar from real counts',
  feedHtml.includes('Wire Coverage') && feedHtml.includes('gn-coverage-fill'));
check('briefing cards use the shared media block + rating footer',
  feedHtml.includes('briefing-card-media') && feedHtml.includes('briefing-card-footer') &&
  feedHtml.includes('gn-cat-tag'));
check('feed never references the removed mock content',
  !/story-trump|story-ukraine|AI Force|Global National/.test(feedHtml));
check('local feed view states that no local source is connected',
  renderLocalFeedView({ edition: { label: 'United States', flag: '' } })
    .includes('Local coverage is not connected'));

// ── Views that need editorial analysis explain themselves ───────────────────
check('poll renders its empty state for a wire article',
  renderCommunityPoll(liveStory) === renderCommunityPollUnavailable() &&
  renderCommunityPoll(liveStory).includes('No poll is attached to this story'));
check('timeline invents nothing and says so',
  getTimelineEvents(liveStory).length === 0 &&
  renderStoryTimeline(liveStory) === renderStoryTimelineUnavailable() &&
  renderStoryTimeline(liveStory).includes('no timeline is invented here'));
check('curated dossier explains that it is unavailable',
  renderStoryModal(liveStory).includes('CURATED DOSSIER UNAVAILABLE'));
check('headline matrix explains why framing comparison is unavailable',
  renderHeadlineMatrix([]).includes('NOT AVAILABLE FROM WIRE DATA'));
check('blindspot radar explains why nothing is classified',
  renderBlindspotRadar([]).includes('No blindspots have been classified'));
check('local desk has no stories and keeps the real city directory',
  getLocalStories(findCity('Dearborn')).length === 0 && CITY_DIRECTORY.length >= 20);
check('local widget still offers the city picker', renderLocalNewsWidget().includes('lnw-input-row'));

// ── Diet tracker records real articles ──────────────────────────────────────
store.recordReadStory(liveStory.id, liveStory.biasDistribution, liveStory.title);
check('diet tracker keeps the bias + title of the article read',
  store.getState().dietHistory[0]?.title === liveStory.title &&
  renderDietTracker().includes('Senate passes funding bill'));
store.setState({ dietHistory: [] });
check('diet tracker shows its empty state with no history',
  renderDietTracker().includes("You haven't read any stories yet"));

// ── Newsletter ──────────────────────────────────────────────────────────────
check('newsletter form renders', renderNewsletterForm({ newsletterId: 'blindspot-weekly' })
  .includes('data-newsletter-id="blindspot-weekly"'));
check('newsletter renders success when subscribed', (() => {
  store.subscribeNewsletter('blindspot-weekly', 'reader@example.com');
  const html = renderNewsletterForm({ newsletterId: 'blindspot-weekly' });
  store.unsubscribeNewsletter('blindspot-weekly');
  return html.includes('nl-success') && html.includes('reader@example.com');
})());
check('newsletter validation rejects bad email', handleNewsletterSubmit({
  dataset: { newsletterId: 'toggle-daily' },
  querySelector: () => ({ value: 'not-an-email', focus() {} }),
  nextElementSibling: null,
  classList: { contains: () => false },
  remove() {}
}) === false);

// ── Account / edition overlays (need a light DOM stub) ──────────────────────
const created = [];
const makeEl = (tag = 'div') => {
  const el = {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    _html: '',
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild(child) { return child; },
    remove() {},
    focus() {},
    setSelectionRange() {},
    value: ''
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); }
  });
  created.push(el);
  return el;
};

globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: makeEl,
  body: { appendChild() {}, style: {} },
  addEventListener() {},
  documentElement: { setAttribute() {} },
  activeElement: null
};

const { openAccountModal, EDITIONS, PLANS, getInitials, formatPrice } =
  await import('./src/modules/accountModals.js');

openAccountModal('subscribe');
const subscribeHtml = created.at(-1).innerHTML;
check('subscribe modal lists every plan',
  PLANS.every(plan => subscribeHtml.includes(`data-acct-plan="${plan.id}"`)));
check('subscribe modal renders pricing + billing toggle',
  subscribeHtml.includes('acct-plan-price') && subscribeHtml.includes('data-acct-cycle="annual"'));
check('subscribe modal shows popular badge', subscribeHtml.includes('acct-popular-pill'));

openAccountModal('signin');
const signInHtml = created.at(-1).innerHTML;
check('sign-in modal has email + password fields',
  signInHtml.includes('name="email"') && signInHtml.includes('name="password"'));
check('sign-in modal has both tabs',
  signInHtml.includes('data-acct-tab="signin"') && signInHtml.includes('data-acct-tab="create"'));

openAccountModal('edition');
const editionHtml = created.at(-1).innerHTML;
check('edition modal lists every edition',
  EDITIONS.every(ed => editionHtml.includes(`data-edition-code="${ed.code}"`)));
check('formatPrice handles free tier', formatPrice(0) === 'Free' && formatPrice(9.99) === '$9.99');
check('getInitials derives avatar text', getInitials('Jordan Rivera') === 'JR');

// ── Dossier: the demo story is gone, but the store still works ──────────────
store.toggleBookmark('live-abc123');
check('bookmarks accept live article ids', store.getState().bookmarks.includes('live-abc123'));
store.toggleBookmark('live-abc123');
check('bookmarks can be removed', !store.getState().bookmarks.includes('live-abc123'));

// ── Ground News story-page features: coverage matching + reading diet ───────
const coverageFixture = (id, hash, title, publisher) =>
  articleToStory({ ...apiArticle, id, url_hash: hash, url: `https://example.com/${hash}`, title, publisher }, Date.parse('2026-09-25T11:00:00Z'));

check('headline similarity scores the same event above different stories',
  titleSimilarity('Senate passes funding bill after overnight session', 'Funding bill clears Senate in late-night vote') >= 0.4 &&
  titleSimilarity('Senate passes funding bill after overnight session', 'Local team wins regional championship final') === 0);

const coverageLead = coverageFixture(31, 'c1', 'Senate passes funding bill after overnight session', 'CNN');
const coverageRight = coverageFixture(32, 'c2', 'Funding bill clears Senate in late-night vote', 'Fox News');
const coverageCenter = coverageFixture(33, 'c3', 'Funding bill passes Senate in late-night vote', 'BBC News');
const coverageSameOutlet = coverageFixture(34, 'c4', 'Senate passes funding bill after overnight session', 'CNN');
const coverageUnrelated = coverageFixture(35, 'c5', 'Regional rail strike enters third week', 'Vox');
const coverageOtherLeft = coverageFixture(36, 'c6', 'Funding bill after overnight session passes Senate in vote', 'The Guardian');
const coveragePool = [coverageLead, coverageRight, coverageCenter, coverageSameOutlet, coverageUnrelated, coverageOtherLeft];

const relatedCoverage = findRelatedCoverage(coverageLead, coveragePool);
check('coverage matching groups same-event headlines and drops the publisher\'s own',
  relatedCoverage.length === 3 &&
  relatedCoverage.every((match) => ['Fox News', 'BBC News', 'The Guardian'].includes(match.story.publisher)) &&
  !relatedCoverage.some((match) => match.story.publisher === 'CNN') &&
  findRelatedCoverage(coverageLead, [coverageUnrelated]).length === 0);

const coverageStories = [coverageLead, ...relatedCoverage.map((match) => match.story)];
const coverageSummary = summarizeCoverageStories(coverageStories);
check('coverage summary counts the real lean buckets',
  (() => {
    const expected = { left: 0, center: 0, right: 0, unrated: 0 };
    for (const item of coverageStories) expected[item.rating.hasLean ? item.rating.bucket : 'unrated'] += 1;
    return coverageSummary.total === 4 &&
      ['left', 'center', 'right', 'unrated'].every((lean) => coverageSummary[lean] === expected[lean]);
  })());
check('coverage percentages always add up to a full bar',
  (() => {
    const pct = coveragePercents(coverageSummary);
    const single = coveragePercents({ left: 100, center: 0, right: 0 });
    return pct.left + pct.center + pct.right + pct.unrated === 100 &&
      single.left === 100 && single.center === 0;
  })());
check('coverage gaps need enough sources and a missing side',
  describeCoverageGaps({ left: 0, center: 2, right: 2, unrated: 0, total: 4 })[0]?.side === 'left' &&
  describeCoverageGaps({ left: 0, center: 2, right: 2, unrated: 0, total: 3 }).length === 0 &&
  describeCoverageGaps({ left: 0, center: 2, right: 0, unrated: 0, total: 4 }).length === 0 &&
  describeCoverageGaps({ left: 2, center: 0, right: 0, unrated: 0, total: 2 }).length === 0);

const coverageSection = renderCoverageAcrossWire(coverageLead, relatedCoverage, coverageSummary);
check('coverage section renders the lean bar, groups and open hooks',
  coverageSection.includes('Coverage across the wire') &&
  coverageSection.includes('gn-article-coverage-head-row') &&
  coverageSection.includes('gn-article-coverage-count') &&
  coverageSection.includes('4 outlets') &&
  coverageSection.includes('gn-article-coverage-summary') &&
  coverageSection.includes('gn-article-coverage-group') &&
  coverageSection.includes('group-left') &&
  coverageSection.includes('group-center') &&
  coverageSection.includes('group-right') &&
  coverageSection.includes('gn-article-coverage-item') &&
  coverageSection.includes('gn-bias-strip mini labeled') &&
  coverageSection.includes('data-action="open-modal" data-story-id="live-c2"') &&
  coverageSection.includes('Matched automatically by headline words'));
check('coverage section states plainly when no other outlet covered the event',
  (() => {
    const html = renderCoverageAcrossWire(coverageLead, [], { left: 1, center: 0, right: 0, unrated: 0, total: 1 });
    return html.includes('No other outlet in the loaded wire has published this event yet') &&
      html.includes('gn-article-rating-row') && html.includes('bias-indicator-tag');
  })());
check('coverage section flags a one-sided window as a coverage gap',
  (() => {
    const gapCounts = { left: 0, center: 2, right: 2, unrated: 0, total: 4 };
    const html = renderCoverageAcrossWire(coverageLead, relatedCoverage, gapCounts);
    return html.includes('Coverage gap') && html.includes('banner-left') && html.includes('No Left-leaning outlet');
  })());

// The suite's loaded wire holds the same headline from CNN and Vox, so the page
// itself shows a real matched-coverage group (and the diet card) — with exactly
// one coverage bar and the article's own rating badges moved into that block.
check('story page keeps one coverage block plus the diet card',
  (() => {
    const page = renderLiveArticleModal(liveStory);
    const bars = (page.match(/gn-bias-strip mini labeled/g) || []).length;
    return page.includes('Coverage across the wire') &&
      page.includes('gn-article-coverage-item') &&
      page.includes('data-story-id="live-def456"') &&
      page.includes('Your news diet') &&
      page.includes('gn-article-coverage-self-label') &&
      page.includes('bias-indicator-tag') &&
      bars === 1;
  })());

store.setState({ dietHistory: [] });
check('reading diet card prompts when nothing has been opened yet',
  renderLiveArticleModal(liveStory).includes('gn-article-diet-empty'));
store.recordReadStory('live-abc123', { left: 60, center: 20, right: 20 }, 'one');
store.recordReadStory('live-def456', { left: 10, center: 10, right: 80 }, 'two');
check('reading diet summarises the leans of opened stories',
  (() => {
    const diet = summarizeReadingDiet(store.getState().dietHistory);
    const page = renderLiveArticleModal(liveStory);
    return diet.total === 2 && diet.leftPct === 50 && diet.rightPct === 50 &&
      page.includes('gn-article-diet-bar') && page.includes('2 stories opened');
  })());
store.setState({ dietHistory: [] });

// ── Publication rating system ───────────────────────────────────────────────
const {
  BIAS_SCALE,
  FACTUALITY_SCALE,
  RATING_METHODOLOGY,
  normalizeBiasScore,
  biasStopForScore,
  biasBucketForScore,
  normalizeFactuality,
  factualityLevel,
  ratingFor,
  renderBiasMeter,
  renderFactualityBadge,
  renderRatingLegend
} = await import('./src/modules/ratingSystem.js');
const { renderMediaDirectory } = await import('./src/modules/mediaDirectory.js');
const { renderOutletDossierHtml } = await import('./src/modules/outletModal.js');

check('the bias scale is five ordered stops bucketed left/center/right',
  BIAS_SCALE.length === 5 &&
  BIAS_SCALE.map((stop) => stop.score).join(',') === '-2,-1,0,1,2' &&
  biasBucketForScore(-2) === 'left' && biasBucketForScore(-1) === 'left' &&
  biasBucketForScore(0) === 'center' &&
  biasBucketForScore(1) === 'right' && biasBucketForScore(2) === 'right' &&
  biasStopForScore(-1)?.label === 'Lean Left');
check('unrateable scores are never forced into a bucket',
  normalizeBiasScore('nonsense') === null && normalizeBiasScore(undefined) === null &&
  normalizeBiasScore(9) === null && biasBucketForScore(undefined) === null &&
  biasStopForScore(NaN) === null);
check('factuality normalises wording and rejects invented levels',
  normalizeFactuality('high') === 'High' && normalizeFactuality(' MIXED ') === 'Mixed' &&
  normalizeFactuality('Very High') === null && normalizeFactuality('') === null &&
  factualityLevel('low')?.score === 1);
check('ratingFor builds one record for rated and unrated publishers',
  (() => {
    const rated = ratingFor({ name: 'X', biasScore: -1, factuality: 'High' });
    const unrated = ratingFor({ name: 'Y' });
    return rated.rated === true && rated.bucket === 'left' && rated.biasLabel === 'Lean Left' &&
      rated.factuality === 'High' && Boolean(rated.level.color) &&
      unrated.rated === false && unrated.bucket === null && unrated.stop === null;
  })());
check('every publisher in the database carries a valid rating',
  SOURCES.length >= 30 && SOURCES.every((source) => {
    const rated = ratingFor(source);
    return rated.rated && Boolean(rated.bucket) && Boolean(rated.factuality);
  }));
check('the bias meter marks exactly one stop and labels it',
  (() => {
    const html = renderBiasMeter(-2);
    return (html.match(/rating-meter-stop is-active/g) || []).length === 1 &&
      html.includes('aria-label="Bias: Left"') && html.includes('>Left<') &&
      renderBiasMeter(null).includes('Unrated');
  })());
check('the factuality badge carries its level colour and an unrated state',
  renderFactualityBadge('High').includes('--fact-color:#34a853') &&
  renderFactualityBadge('High').includes('>High<') &&
  renderFactualityBadge('Nonsense').includes('is-unrated'));
check('the legend documents both scales and the unrated policy',
  (() => {
    const html = renderRatingLegend();
    return BIAS_SCALE.every((stop) => html.includes(stop.description)) &&
      FACTUALITY_SCALE.every((level) => html.includes(level.description)) &&
      html.includes(RATING_METHODOLOGY.unrated) && html.includes(RATING_METHODOLOGY.sources);
  })());
check('the media directory presents ratings through the shared components',
  (() => {
    const html = renderMediaDirectory();
    return html.includes('rating-meter') && html.includes('rating-fact-badge') &&
      html.includes('dir-legend-details') && html.includes('How the ratings work') &&
      html.includes('data-dir-bias="left"') && html.includes('data-dir-fact="low"');
  })());
check('the outlet dossier renders the meter, badge and methodology',
  (() => {
    const cnn = SOURCES.find((source) => source.id === 'cnn');
    const html = renderOutletDossierHtml(cnn, { allsidesScore: 'Lean Left' }, ['Headline one']);
    return html.includes('od-rating-meter') && html.includes('rating-meter-stop is-active') &&
      html.includes('rating-fact-badge') && html.includes('od-methodology') &&
      html.includes('Lean Left') && html.includes('Warner Bros. Discovery') &&
      html.includes('AllSides: Lean Left');
  })());

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
