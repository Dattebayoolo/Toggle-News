// Temporary smoke test for the newly created frontend components.
const storage = new Map();
globalThis.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};

const { store } = await import('./src/modules/state.js');
const { NEWS_STORIES } = await import('./src/data/newsData.js');
const { renderCommunityPoll, getPollTallies } = await import('./src/modules/communityPoll.js');
const { renderStoryTimeline, getTimelineEvents } = await import('./src/modules/storyTimeline.js');
const { renderNewsletterForm, handleNewsletterSubmit } = await import('./src/modules/newsletterSignup.js');
const { renderLocalNewsWidget, getLocalStories, findCity, CITY_DIRECTORY } =
  await import('./src/modules/localNews.js');

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures += 1;
};

// Categories used by the header tabs must all resolve to stories
const categories = [...new Set(NEWS_STORIES.map(s => s.category))];
console.log('categories:', categories.join(', '));
for (const cat of ['Politics', 'World', 'Economy', 'Technology', 'Science', 'Health', 'Entertainment', 'Sports', 'Climate & Energy']) {
  check(`category "${cat}" has stories`, NEWS_STORIES.some(s => s.category === cat));
}

// Every story carries the data the new components consume
check('all stories have timeline', NEWS_STORIES.every(s => Array.isArray(s.timeline) && s.timeline.length));
check('all stories have communityPoll', NEWS_STORIES.every(s => s.communityPoll?.question));

const story = NEWS_STORIES.find(s => s.id === 'story-trump-ai-force');

// Community poll
const pollHtml = renderCommunityPoll(story);
check('poll renders question', pollHtml.includes(story.communityPoll.question));
check('poll renders vote buttons', pollHtml.includes('data-action="vote-poll"'));
check('poll hides tallies before voting', !pollHtml.includes('poll-tallies'));
store.recordPollVote(story.id, 'yes');
const votedHtml = renderCommunityPoll(story);
check('poll shows tallies after voting', votedHtml.includes('poll-tallies'));
check('poll shows user vote + change link', votedHtml.includes('Change my vote') && votedHtml.includes('poll-bar-fill yes'));
const tallies = getPollTallies(story);
check('poll tally math adds the user vote', tallies.yesCount === story.communityPoll.yesCount + 1);
check('poll percentages total 100', tallies.yesPct + tallies.noPct === 100);
store.clearPollVote(story.id);
check('poll vote can be cleared', !renderCommunityPoll(story).includes('poll-tallies'));

// Timeline
const timelineHtml = renderStoryTimeline(story);
check('timeline renders all events', getTimelineEvents(story).every(ev => timelineHtml.includes(ev.event)));
check('timeline uses numbered markers', timelineHtml.includes('timeline-marker'));
check('timeline has day caption', timelineHtml.includes('Sep 20, 2026'));

// Newsletter
const formHtml = renderNewsletterForm({ newsletterId: 'blindspot-weekly' });
check('newsletter form renders', formHtml.includes('data-newsletter-id="blindspot-weekly"'));
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

// Local news
const emptyWidget = renderLocalNewsWidget();
check('local widget shows city form when no city set', emptyWidget.includes('lnw-input-row'));
check('local widget offers popular cities', emptyWidget.includes('data-action="set-local-city"'));
store.setLocalCity('Dearborn');
const activeWidget = renderLocalNewsWidget();
check('local widget shows active city', activeWidget.includes('Dearborn, Michigan'));
check('local widget lists local stories', activeWidget.includes('lnw-local-row'));
check('local widget shows edition note', activeWidget.includes('Edition: 🇺🇸 United States'));
check('all directory cities resolve to local stories',
  CITY_DIRECTORY.every(entry => getLocalStories(entry).length >= 3));
check('direct location match ranks first',
  getLocalStories(findCity('Dearborn'))[0].id === 'story-michigan-school-holidays');

// ── Live wire (API-backed article rail) ─────────────────────────────────────
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
  renderLiveArticleModal,
  refreshLiveFeed,
  subscribeLiveFeed,
  getLiveState,
  getLiveStories,
  findLiveStory
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
  normalizeOutletName('The New York Times') === 'newyorktimes' &&
  normalizeOutletName('CNN') === 'cnn');
check('normalizeOutletName folds domain forms onto the same key',
  normalizeOutletName('washingtonpost.com') === normalizeOutletName('The Washington Post') &&
  normalizeOutletName('foxnews.com') === normalizeOutletName('Fox News') &&
  normalizeOutletName('bbc.com') === 'bbc');
check('findSourceBias matches a rated publisher', findSourceBias('CNN')?.id === 'cnn');
check('findSourceBias tolerates a leading "The"', findSourceBias('The Guardian')?.id === 'the-guardian');
check('findSourceBias resolves domain-form publishers',
  findSourceBias('washingtonpost.com')?.id === 'washington-post' &&
  findSourceBias('foxnews.com')?.id === 'fox-news' &&
  findSourceBias('NBC News')?.id === 'nbc-news' &&
  findSourceBias('cnbc.com')?.id === 'cnbc');
check('findSourceBias resolves declared aliases',
  findSourceBias('NYT')?.id === 'nyt' && findSourceBias('BBC')?.id === 'bbc' && findSourceBias('AP')?.id === 'associated-press');
check('findSourceBias returns null for unknown outlets', findSourceBias('Some Unknown Blog') === null);
check('unrateable trade press is left unrated, never forced into a bucket',
  findSourceBias('IGN') === null && findSourceBias('Kotaku') === null &&
  findSourceBias('MacRumors') === null && findSourceBias('Nintendo Life') === null);
check('mapServerCategory maps server slugs to header tabs',
  mapServerCategory('world') === 'World' &&
  mapServerCategory('tech') === 'Technology' &&
  mapServerCategory('science') === 'Science');
check('relativeTime renders relative ages',
  relativeTime('2026-09-25T10:00:00Z', Date.parse('2026-09-25T10:28:00Z')) === '28 mins ago' &&
  relativeTime('2026-09-25T07:00:00Z', Date.parse('2026-09-25T10:00:00Z')) === '3 hours ago');
check('extractPublisher uses the wire suffix only for newsapi feeds',
  extractPublisher({ title: 'Storm slams coast - NBC News', source_id: 'newsapi-us-top' }) === 'NBC News' &&
  extractPublisher({ title: 'Storm slams coast - as it happened', source_id: 'guardian-world' }) === '' &&
  extractPublisher({ title: 'Anything', source_id: 'bbc-top', publisher: 'BBC News' }) === 'BBC News');
check('legacy rows without a publisher resolve to their outlet label',
  resolveBias({ title: 'x', source_id: 'bbc-top' }).publisher === 'BBC News' &&
  resolveBias({ title: 'x', source_id: 'guardian-world' }).publisher === 'The Guardian' &&
  resolveBias({ title: 'x', source_id: 'guardian-world' }).rated === true);

// Bias is claimed only when we actually know the outlet
check('rated publisher resolves to its own bias database entry',
  (() => { const r = resolveBias(apiArticle); return r.rated === true && r.hasLean === true && r.bucket === 'left' && r.factuality === 'Mixed'; })());
check('unknown publisher falls back to the feeding wire lean',
  (() => { const r = resolveBias({ title: 'x', publisher: 'Unknown Blog', source_id: 'guardian-world' }); return r.hasLean === true && r.rated === false && r.bucket === 'left'; })());
check('unknown publisher on a mixed wire is left unrated',
  resolveBias({ title: 'x', publisher: 'Unknown Blog', source_id: 'newsapi-us-top' }).hasLean === false);

const liveStory = articleToStory(apiArticle, Date.parse('2026-09-25T11:00:00Z'));
check('articleToStory produces a component-ready story',
  liveStory.id === 'live-abc123' && liveStory.isLive === true && liveStory.category === 'World' &&
  liveStory.sourceCount === 1 && liveStory.biasDistribution.left === 100 && liveStory.timestamp === '1 hour ago');
check('articleToStory keeps the real outbound url + publisher',
  liveStory.articleUrl === 'https://example.com/story-one' && liveStory.publisher === 'CNN');
check('articleToStory only exposes the perspective it actually has',
  Boolean(liveStory.perspectives.left) && !liveStory.perspectives.right);
check('articleToStory rejects rows without a url',
  articleToStory({ title: 'No url', url_hash: 'z' }) === null);

const techArticle = { ...apiArticle, id: 2, url_hash: 'def456', url: 'https://example.com/two', category: 'technology', publisher: 'Vox', title: 'Chipmaker unveils new fab' };
const secondLiveStory = articleToStory(techArticle, Date.parse('2026-09-25T11:00:00Z'));
check('filterLiveStories filters by category tab',
  filterLiveStories([liveStory, secondLiveStory], { category: 'Technology' }).length === 1);
check('filterLiveStories searches titles, summaries and publishers',
  filterLiveStories([liveStory, secondLiveStory], { query: 'vox' }).length === 1);
check('filterLiveStories ignores empty filters',
  filterLiveStories([liveStory, secondLiveStory], { category: 'All', query: '' }).length === 2);
check('summarizeCoverage counts each lean',
  (() => { const c = summarizeCoverage([liveStory, secondLiveStory]); return c.left === 2 && c.unrated === 0; })());

// ── Live wire rendering + loader ────────────────────────────────────────────
const rowHtml = renderLiveWireRow(liveStory, { isBookmarked: false });
check('live row renders the real headline + publisher',
  rowHtml.includes('Senate passes funding bill') && rowHtml.includes('CNN'));
check('live row links out to the publisher',
  rowHtml.includes('href="https://example.com/story-one"') && rowHtml.includes('Read at publisher'));
check('live row shows the outlet bias tag', rowHtml.includes('bias-indicator-tag left'));
check('live row carries the open-modal hook',
  rowHtml.includes('data-action="open-modal" data-story-id="live-abc123"'));

const unratedRowHtml = renderLiveWireRow(
  articleToStory({ ...apiArticle, publisher: 'Nobody Weekly', source_id: 'newsapi-tech' }),
  { isBookmarked: false }
);
check('unrated outlets are labelled, never given a fake lean',
  unratedRowHtml.includes('bias-indicator-tag unrated') && unratedRowHtml.includes('Unrated outlet'));

const errorHtml = renderLiveWireSection([], { status: 'error', error: 'API responded 500' });
check('live section renders an offline state with a retry',
  errorHtml.includes('Could not reach the Toggle News API') && errorHtml.includes('data-action="refresh-live"'));
const loadingHtml = renderLiveWireSection([], { status: 'loading' });
check('live section renders a loading state', loadingHtml.includes('Loading articles from the wire'));

const modalHtml = renderLiveArticleModal(liveStory);
check('live article page shows the wire content + outbound cta',
  modalHtml.includes('Senate passes funding bill') &&
  modalHtml.includes('Read the full article at CNN') &&
  modalHtml.includes('data-action="close-modal"'));

const okState = await refreshLiveFeed({
  fetchImpl: async () => ({ ok: true, json: async () => ({ items: [apiArticle], total: 1 }) }),
  now: Date.parse('2026-09-25T11:00:00Z')
});
check('refreshLiveFeed loads and adapts API articles',
  okState.status === 'ready' && okState.stories.length === 1 && okState.total === 1);
check('refreshLiveFeed publishes stories for lookup',
  getLiveStories().length === 1 && findLiveStory('live-abc123')?.publisher === 'CNN');
check('live section renders rows once connected',
  renderLiveWireSection(getLiveStories(), okState).includes('gn-live-row'));

let emitHits = 0;
const unsubscribe = subscribeLiveFeed(() => { emitHits += 1; });
await refreshLiveFeed({ fetchImpl: async () => ({ ok: true, json: async () => ({ items: [apiArticle], total: 1 }) }) });
unsubscribe();
check('refreshLiveFeed notifies subscribers on every update', emitHits >= 2);

const badState = await refreshLiveFeed({
  fetchImpl: async () => ({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({ message: 'API is not reachable' }) }),
  autoRetry: false
});
check('refreshLiveFeed surfaces API failures without throwing',
  badState.status === 'error' && getLiveState().error === 'API is not reachable');
check('refreshLiveFeed de-duplicates concurrent requests',
  (() => {
    let calls = 0;
    const slowFetch = () => { calls += 1; return new Promise(() => {}); };
    refreshLiveFeed({ fetchImpl: slowFetch, autoRetry: false });
    refreshLiveFeed({ fetchImpl: slowFetch, autoRetry: false });
    refreshLiveFeed({ fetchImpl: slowFetch, autoRetry: false });
    return calls === 1;
  })());

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

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;

