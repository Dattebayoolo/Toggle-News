// Account overlays: Sign in / Create account, Subscription plans, Edition picker.
// These back the previously inert header controls (Subscribe pill, Log in, flag)
// and the footer country selector. Mounted on document.body like the other
// overlay modules (audio player, AI chat drawer, outlet dossier).

import { store } from './state.js';
import { getAuthState, signOutAccount, startSignIn } from './accountSession.js';

export const EDITIONS = [
  { code: 'us', label: 'United States', flag: '🇺🇸' },
  { code: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', label: 'Canada', flag: '🇨🇦' },
  { code: 'au', label: 'Australia', flag: '🇦🇺' },
  { code: 'nz', label: 'New Zealand', flag: '🇳🇿' },
  { code: 'ie', label: 'Ireland', flag: '🇮🇪' },
  { code: 'in', label: 'India', flag: '🇮🇳' },
  { code: 'za', label: 'South Africa', flag: '🇿🇦' },
  { code: 'sg', label: 'Singapore', flag: '🇸🇬' },
  { code: 'world', label: 'World Edition', flag: '🌍' }
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    tagline: 'Media literacy essentials',
    features: [
      'Blindspot feed and daily briefing',
      'Bias distribution on every story',
      'Save up to 5 stories'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 9.99,
    annual: 89.99,
    tagline: 'Unlimited perspective switching',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited bookmarks and My News Diet history',
      'Full article stream across 50,000+ sources',
      'Weekly Blindspot report newsletter'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 19.99,
    annual: 189.99,
    tagline: 'For researchers and newsrooms',
    features: [
      'Everything in Premium',
      'Ownership and factuality datasets',
      'Local news coverage for any city',
      'API access and CSV exports'
    ]
  }
];

let activeModal = null;   // 'signin' | 'subscribe' | 'edition'
let billingCycle = 'monthly';
let selectedPlan = 'premium';
let onChangeCallback = null;

export function isAccountModalOpen() {
  return Boolean(document.getElementById('account-modal-overlay'));
}

export function getPlan(planId) {
  return PLANS.find(p => p.id === planId) || PLANS[0];
}

export function formatPrice(amount) {
  return amount === 0 ? 'Free' : `$${amount.toFixed(2)}`;
}

export function openAccountModal(kind = 'signin', onChange = null) {
  activeModal = kind;
  if (typeof onChange === 'function') onChangeCallback = onChange;
  const plan = store.getState().account?.plan;
  if (plan) selectedPlan = plan;
  renderAccountModal();
}

export function closeAccountModal() {
  const overlay = document.getElementById('account-modal-overlay');
  if (overlay) overlay.remove();
  activeModal = null;
}

function notifyChange() {
  if (typeof onChangeCallback === 'function') onChangeCallback();
}

function showSuccess(overlay, title, message) {
  const modal = overlay.querySelector('.acct-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="acct-success-state">
      <span class="acct-success-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      <h2 class="acct-title">${title}</h2>
      <p class="acct-success-copy">${message}</p>
      <button class="acct-primary-btn" data-acct-close>Done</button>
    </div>
  `;
  modal.querySelector('[data-acct-close]').addEventListener('click', closeAccountModal);
}


export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'TN';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function renderAccountModal() {
  const existing = document.getElementById('account-modal-overlay');
  if (existing) existing.remove();
  if (!activeModal) return;

  const overlay = document.createElement('div');
  overlay.id = 'account-modal-overlay';
  overlay.className = 'acct-overlay';
  overlay.innerHTML = `
    <div class="acct-modal" role="dialog" aria-modal="true" aria-label="${activeModal} dialog">
      <button class="acct-close" data-acct-close title="Close" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      ${activeModal === 'subscribe'
        ? renderSubscribeBody()
        : activeModal === 'edition'
          ? renderEditionBody()
          : renderSignInBody()}
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAccountModal();
  });

  overlay.querySelectorAll('[data-acct-close]').forEach(btn => {
    btn.addEventListener('click', closeAccountModal);
  });

  document.body.appendChild(overlay);
  attachAccountModalEvents(overlay);

function renderSignInBody() {
  const account = store.getState().account;

  if (account) {
    return `
      <div class="acct-body">
        <div class="acct-signed-in-card">
          <span class="acct-avatar">${getInitials(account.name)}</span>
          <div class="acct-signed-in-meta">
            <h2 class="acct-title">${account.name}</h2>
            <p class="acct-sub">${account.email} &middot; ${getPlan(account.plan).name} plan</p>
            <p class="acct-provider">Signed in with Toggle Account</p>
          </div>
        </div>

        <ul class="acct-signed-in-list">
          <li><span>Saved stories</span><strong>${store.getState().bookmarks.length}</strong></li>
          <li><span>Stories read</span><strong>${store.getState().dietHistory.length}</strong></li>
          <li><span>Topics followed</span><strong>${store.getState().followedTopics.length}</strong></li>
        </ul>

        <div class="acct-actions-row">
          <button class="acct-primary-btn" data-acct-open="subscribe">Manage subscription</button>
          <button class="acct-secondary-btn" data-acct-signout>Sign out</button>
        </div>

        <p class="acct-footnote">
          Signing out clears this browser.
          <button class="acct-link-btn" data-acct-signout-federated>Sign out of all Toggle apps</button>
        </p>
      </div>
    `;
  }

  // Defensive: even if the session probe module is in an unexpected state, the
  // panel must still render so "Log in" always visibly does something.
  let auth = { status: 'unknown' };
  try {
    auth = getAuthState() || auth;
  } catch {
    /* keep the default */
  }

  const declined = typeof window !== 'undefined'
    && String((window.location && window.location.search) || '').includes('auth=declined');
  const unavailable = auth.status === 'unavailable';

  return `
    <div class="acct-body">
      <h2 class="acct-title">Log in with Toggle Account</h2>
      <p class="acct-sub">
        One account for every Toggle app. Signing in syncs your saved stories, followed topics
        and news-diet history across devices.
      </p>

      ${declined ? '<p class="acct-form-message error" role="status">Sign-in was cancelled. Nothing was changed.</p>' : ''}
      ${unavailable ? '<p class="acct-form-message error" role="status">Could not reach the Toggle Account service just now. You can still try signing in — or keep reading without an account.</p>' : ''}

      <button class="acct-primary-btn full" data-acct-sso="signin">
        Continue with Toggle Account
      </button>
      <button class="acct-secondary-btn full" data-acct-sso="switch">
        Use a different account
      </button>

      <ul class="acct-sso-list">
        <li>
          <strong>Credentials stay on the account service</strong>
          <span>Sign-in and account creation run on the hosted Toggle Account page — this app never sees your password.</span>
        </li>
        <li>
          <strong>Nothing is shared silently</strong>
          <span>The account service asks you to approve Toggle News before any profile detail is released.</span>
        </li>
        <li>
          <strong>You keep control</strong>
          <span>Sign out of this browser, or end the session across every Toggle app, from your account panel.</span>
        </li>
      </ul>

      <p class="acct-footnote">New to Toggle? The same page creates an account.</p>
    </div>
  `;
}

}


function renderSubscribeBody() {
  const account = store.getState().account;
  const cycleLabel = billingCycle === 'monthly' ? 'Monthly' : 'Annual';

  return `
    <div class="acct-body">
      <h2 class="acct-title">Choose your plan</h2>
      <p class="acct-sub">Perspective switching, blindspot tracking, and unlimited source coverage.</p>

      <div class="acct-cycle-toggle">
        <button class="acct-cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}" data-acct-cycle="monthly">Monthly</button>
        <button class="acct-cycle-btn ${billingCycle === 'annual' ? 'active' : ''}" data-acct-cycle="annual">Annual <span class="acct-save-pill">Save 25%</span></button>
      </div>

      <div class="acct-plans">
        ${PLANS.map(plan => {
          const price = billingCycle === 'monthly' ? plan.monthly : plan.annual;
          const suffix = plan.monthly === 0 ? '' : (billingCycle === 'monthly' ? '/mo' : '/yr');
          return `
          <button class="acct-plan-card ${selectedPlan === plan.id ? 'selected' : ''}" data-acct-plan="${plan.id}">
            ${plan.popular ? '<span class="acct-popular-pill">Most popular</span>' : ''}
            <span class="acct-plan-name">${plan.name}</span>
            <span class="acct-plan-price">${formatPrice(price)}<small>${suffix}</small></span>
            <span class="acct-plan-tagline">${plan.tagline}</span>
            <ul class="acct-plan-features">
              ${plan.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </button>`;
        }).join('')}
      </div>

      <p class="acct-form-message" role="status"></p>

      <button class="acct-primary-btn full" data-acct-choose>
        ${account ? `Switch to ${getPlan(selectedPlan).name}` : `Continue with ${getPlan(selectedPlan).name} (${cycleLabel})`}
      </button>

      ${account ? '' : '<p class="acct-footnote">You will be asked to create an account or sign in next.</p>'}
    </div>
  `;
}


function renderEditionBody() {
  const current = store.getState().edition;

  return `
    <div class="acct-body">
      <h2 class="acct-title">Choose an edition</h2>
      <p class="acct-sub">Headlines, blindspots, and local coverage are tailored to your edition.</p>

      <div class="acct-edition-list">
        ${EDITIONS.map(ed => `
          <button class="acct-edition-row ${current.code === ed.code ? 'active' : ''}" data-edition-code="${ed.code}">
            <span class="acct-edition-flag">${ed.flag}</span>
            <span class="acct-edition-label">${ed.label}</span>
            ${current.code === ed.code
              ? '<svg class="acct-edition-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : ''}
          </button>`).join('')}
      </div>
    </div>
  `;
}


/** Hand the browser to the hosted Toggle Account sign-in. */
function handleSsoAction(kind, overlay) {
  if (kind === 'switch') {
    // `prompt=login` makes the auth service ask for credentials again even when
    // a central session is already open, so a different person can sign in.
    startSignIn({ promptLogin: true });
    return;
  }
  startSignIn();
  showSuccess(overlay, 'Redirecting to Toggle Account', 'The sign-in page opens on the account service.');
}

function attachAccountModalEvents(overlay) {
  // Sign-in / "use a different account" hand off to the hosted Toggle Account UI.
  overlay.querySelectorAll('[data-acct-sso]').forEach(btn => {
    btn.addEventListener('click', () => handleSsoAction(btn.dataset.acctSso, overlay));
  });

  overlay.querySelectorAll('[data-acct-cycle]').forEach(btn => {
    btn.addEventListener('click', () => {
      billingCycle = btn.dataset.acctCycle;
      renderAccountModal();
    });
  });

  overlay.querySelectorAll('[data-acct-plan]').forEach(card => {
    card.addEventListener('click', () => {
      selectedPlan = card.dataset.acctPlan;
      renderAccountModal();
    });
  });

  const chooseBtn = overlay.querySelector('[data-acct-choose]');
  if (chooseBtn) {
    chooseBtn.addEventListener('click', () => {
      if (!store.getState().account) {
        // Plans activate after sign-in; show the account hand-off instead.
        activeModal = 'signin';
        renderAccountModal();
        return;
      }
      store.setSubscriptionPlan(selectedPlan);
      notifyChange();
      showSuccess(
        overlay,
        `${getPlan(selectedPlan).name} activated`,
        `You now have access to every ${getPlan(selectedPlan).name} feature on this device.`
      );
    });
  }

  overlay.querySelectorAll('[data-edition-code]').forEach(row => {
    row.addEventListener('click', () => {
      const edition = EDITIONS.find(ed => ed.code === row.dataset.editionCode);
      if (!edition) return;
      store.setEdition(edition);
      notifyChange();
      showSuccess(
        overlay,
        `${edition.flag} ${edition.label}`,
        'Headlines, blindspots, and local coverage now follow this edition.'
      );
    });
  });

  const signOutBtn = overlay.querySelector('[data-acct-signout]');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await signOutAccount();
      notifyChange();
      showSuccess(overlay, 'Signed out', 'Your saved stories and history stay on this device.');
    });
  }

  const federatedBtn = overlay.querySelector('[data-acct-signout-federated]');
  if (federatedBtn) {
    federatedBtn.addEventListener('click', async () => {
      // Ends the central Toggle Account session too — the page then leaves for
      // the account service, which confirms the sign-out.
      await signOutAccount({ federated: true });
      notifyChange();
    });
  }

  const manageBtn = overlay.querySelector('[data-acct-open="subscribe"]');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      activeModal = 'subscribe';
      renderAccountModal();
    });
  }
}
