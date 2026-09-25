// Newsletter signup — shared form component used by the Blindspot weekly report
// card, the footer newsletter block, and the local edition widget.
// Every form carries data-newsletter-id; main.js forwards submits to
// handleNewsletterSubmit() which validates the address and persists it via store.

import { store } from './state.js';

export const NEWSLETTERS = {
  'blindspot-weekly': {
    id: 'blindspot-weekly',
    name: 'Blindspot Report',
    cadence: 'Weekly · Mondays',
    description: 'The stories one side of the spectrum missed, with the bias receipts.'
  },
  'toggle-daily': {
    id: 'toggle-daily',
    name: 'Toggle Daily Briefing',
    cadence: 'Weekdays · 7:00 AM',
    description: 'Every morning: the top story, its coverage split, and one blindspot.'
  },
  'local-edition': {
    id: 'local-edition',
    name: 'Local Edition',
    cadence: 'Weekly · Thursdays',
    description: 'Local coverage and bias in the outlets closest to your city.'
  }
};

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

export function renderNewsletterForm(options = {}) {
  const {
    newsletterId = 'toggle-daily',
    inputClass = 'nl-input',
    buttonClass = 'nl-submit',
    label = 'Subscribe',
    placeholder = 'Email address',
    compact = false
  } = options;

  const subscribedEmail = store.getState().newsletters[newsletterId];

  if (subscribedEmail) {
    return `
      <div class="nl-success ${compact ? 'compact' : ''}" data-newsletter-success="${newsletterId}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Subscribed &middot; ${subscribedEmail}</span>
        <button class="nl-undo-btn" data-action="unsubscribe-newsletter" data-newsletter-id="${newsletterId}">Undo</button>
      </div>
    `;
  }

  return `
    <form class="nl-form ${compact ? 'compact' : ''}" data-newsletter-id="${newsletterId}" novalidate>
      <input class="${inputClass}" type="email" name="email" placeholder="${placeholder}" aria-label="${NEWSLETTERS[newsletterId]?.name || 'Newsletter'} email address" />
      <button class="${buttonClass}" type="submit">${label}</button>
    </form>
    <p class="nl-message" role="status"></p>
  `;
}

export function handleNewsletterSubmit(form) {
  const newsletterId = form.dataset.newsletterId;
  const input = form.querySelector('input[type="email"], input[type="text"]');
  const messageEl = form.nextElementSibling?.classList.contains('nl-message')
    ? form.nextElementSibling
    : form.querySelector('.nl-message');
  const email = input ? input.value.trim() : '';

  if (!email) {
    if (messageEl) {
      messageEl.textContent = 'Enter your email address to subscribe.';
      messageEl.className = 'nl-message error';
    }
    if (input) input.focus();
    return false;
  }

  if (!isValidEmail(email)) {
    if (messageEl) {
      messageEl.textContent = 'That email address does not look right.';
      messageEl.className = 'nl-message error';
    }
    if (input) input.focus();
    return false;
  }

  store.subscribeNewsletter(newsletterId, email);

  const wrap = form.parentElement;
  const success = document.createElement('div');
  success.className = `nl-success ${form.classList.contains('compact') ? 'compact' : ''}`;
  success.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Subscribed &middot; ${email}</span>
    <button class="nl-undo-btn" data-action="unsubscribe-newsletter" data-newsletter-id="${newsletterId}">Undo</button>
  `;

  form.remove();
  if (messageEl) messageEl.remove();
  if (wrap) wrap.appendChild(success);
  return true;
}
