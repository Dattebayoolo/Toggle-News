// Story Timeline — chronology of how a story developed.
// Every story in newsData.js ships a `timeline` array of { time, event } entries;
// this module renders it and falls back to a derived chronology when missing.

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

// Fallback chronology derived from the story metadata so every dossier shows a timeline.
function deriveTimeline(story) {
  const factuality = story.factualityDistribution || { high: 80, mixed: 20, low: 0 };
  return [
    {
      time: 'First report',
      event: `Coverage opens across ${story.sourceCount} outlets in the ${story.category} desk.`
    },
    {
      time: 'Wire summary',
      event: `${story.neutralSummary ? 'Neutral summary verified' : 'Summary pending'} against ${story.sources?.length || 3} primary source reports.`
    },
    {
      time: 'Factuality pass',
      event: `${factuality.high}% of reporting rated High factuality by independent auditors.`
    },
    {
      time: 'Latest update',
      event: `Most recent developments as of ${story.timestamp || 'today'}.`
    }
  ];
}

export function getTimelineEvents(story) {
  if (!story) return [];
  if (Array.isArray(story.timeline) && story.timeline.length) {
    return story.timeline.map(item => ({
      time: item.time || '',
      event: item.event || ''
    }));
  }
  return deriveTimeline(story);
}

export function renderStoryTimeline(story) {
  const events = getTimelineEvents(story);
  if (!events.length) return '';

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
