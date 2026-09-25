// Community Blindspot Poll — the reader poll attached to every story dossier.
// Story data supplies { question, yesCount, noCount }; the reader's own answer is
// stored in state.pollResponses (see store.recordPollVote / store.clearPollVote).

import { store } from './state.js';

export function getPollTallies(story) {
  const poll = story?.communityPoll;
  if (!poll) return null;

  const userVote = store.getState().pollResponses[story.id] || null;
  const yesCount = (poll.yesCount || 0) + (userVote === 'yes' ? 1 : 0);
  const noCount = (poll.noCount || 0) + (userVote === 'no' ? 1 : 0);
  const total = yesCount + noCount;
  const yesPct = total ? Math.round((yesCount / total) * 100) : 0;

  return {
    question: poll.question,
    userVote,
    total,
    yesCount,
    noCount,
    yesPct,
    noPct: total ? 100 - yesPct : 0
  };
}

function renderTallyRow(label, pct, count, variant) {
  return `
              <div class="poll-tally-row">
                <div class="poll-tally-labels">
                  <span class="poll-tally-name">${label}</span>
                  <span class="poll-tally-pct">${pct}% &middot; ${count.toLocaleString()}</span>
                </div>
                <div class="poll-bar-result">
                  <div class="poll-bar-fill ${variant}" style="width:${pct}%"></div>
                </div>
              </div>`;
}

export function renderCommunityPoll(story) {
  const tallies = getPollTallies(story);
  if (!tallies) return '';

  const hasVoted = Boolean(tallies.userVote);

  return `
          <!-- Community Blindspot Poll -->
          <section class="modal-poll-card" aria-label="Community poll">
            <span class="poll-badge">COMMUNITY BLINDSPOT POLL</span>
            <h4>${tallies.question}</h4>

            <div class="poll-voting-buttons">
              <button class="poll-vote-btn ${tallies.userVote === 'yes' ? 'voted' : ''}"
                      data-action="vote-poll"
                      data-story-id="${story.id}"
                      data-answer="yes"
                      ${hasVoted ? 'disabled' : ''}>
                Yes
              </button>
              <button class="poll-vote-btn ${tallies.userVote === 'no' ? 'voted' : ''}"
                      data-action="vote-poll"
                      data-story-id="${story.id}"
                      data-answer="no"
                      ${hasVoted ? 'disabled' : ''}>
                No
              </button>
            </div>

            ${hasVoted ? `
            <div class="poll-tallies">
              ${renderTallyRow('Yes', tallies.yesPct, tallies.yesCount, 'yes')}
              ${renderTallyRow('No', tallies.noPct, tallies.noCount, 'no')}
            </div>
            <p class="poll-total-caption">
              ${tallies.total.toLocaleString()} readers voted &middot;
              You answered <strong>${tallies.userVote === 'yes' ? 'Yes' : 'No'}</strong>
              &middot;
              <button class="poll-change-btn" data-action="clear-poll-vote" data-story-id="${story.id}">Change my vote</button>
            </p>` : `
            <p class="poll-total-caption">
              ${tallies.total.toLocaleString()} readers have voted. Cast your vote to reveal the community split.
            </p>`}
          </section>
  `;
}
