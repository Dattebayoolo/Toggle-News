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

