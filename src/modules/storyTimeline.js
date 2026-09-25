// Story Timeline — chronology of how a story developed.
//
// Timelines are editorial analysis authored alongside a curated dossier, so only
// curated stories carry one. Wire articles arrive as a single snapshot with no
// sequence of events, and this module deliberately does NOT invent one — it
// renders an explicit empty state instead.

function formatStoryDay(story) {
  const raw = story?.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function getTimelineEvents(story) {
  if (!story) return [];
  if (Array.isArray(story.timeline) && story.timeline.length) {
    return story.timeline.map(item => ({
      time: item.time || '',
      event: item.event || ''
    }));
  }
  return [];
}

/** Shown when a story carries no chronology — i.e. for every wire article. */
export function renderStoryTimelineUnavailable() {
  return `
          <!-- Story Timeline — no chronology available -->
          <section class="timeline-section article-timeline-card editorial-unavailable" aria-label="Story timeline">
            <span class="timeline-unavailable-title">STORY TIMELINE</span>
            <p class="timeline-unavailable-note">
              Chronologies are assembled by our editors from curated reporting. Wire articles arrive as a
              single snapshot with no sequence of events, so no timeline is invented here.
            </p>
          </section>
  `;
}

export function renderStoryTimeline(story) {
  const events = getTimelineEvents(story);
  if (!events.length) return renderStoryTimelineUnavailable();

  const day = formatStoryDay(story);

  return `
          <!-- Story Timeline -->
          <section class="timeline-section article-timeline-card" aria-label="Story timeline">
            <div class="timeline-header-row">
              <h3>Story Timeline</h3>
              <span class="timeline-date-caption">${day ? `${day} &middot; ` : ''}${events.length} tracked developments</span>
            </div>

            <div class="timeline-steps">
              ${events.map((item, idx) => `
              <div class="timeline-item">
                <span class="timeline-marker">${idx + 1}</span>
                <div class="timeline-body">
                  <span class="timeline-time">${item.time}</span>
                  <p class="timeline-event">${item.event}</p>
                </div>
              </div>`).join('')}
            </div>
          </section>
  `;
}
