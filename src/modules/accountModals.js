// Account overlays: Sign in / Create account, Subscription plans, Edition picker.
// These back the previously inert header controls (Subscribe pill, Log in, flag)
// and the footer country selector. Mounted on document.body like the other
// overlay modules (audio player, AI chat drawer, outlet dossier).

import { store } from './state.js';

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
let activeTab = 'signin'; // 'signin' | 'create'
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
  activeTab = store.getState().account ? 'signin' : 'create';
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

function showFieldError(form, message) {
  const box = form.querySelector('.acct-form-message');
  if (!box) return;
  box.textContent = message;
  box.className = 'acct-form-message error';
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
      </div>
    `;
  }

  return `
    <div class="acct-body">
      <div class="acct-tabs" role="tablist">
        <button class="acct-tab ${activeTab === 'signin' ? 'active' : ''}" data-acct-tab="signin" role="tab">Sign in</button>
        <button class="acct-tab ${activeTab === 'create' ? 'active' : ''}" data-acct-tab="create" role="tab">Create account</button>
      </div>

      <h2 class="acct-title">${activeTab === 'create' ? 'Create your free account' : 'Welcome back'}</h2>
      <p class="acct-sub">
        ${activeTab === 'create'
          ? 'Track your news diet, save stories, and follow topics across the political spectrum.'
          : 'Sign in to sync your saved stories and blindspot reports.'}
      </p>

      <form class="acct-form" novalidate>
        ${activeTab === 'create' ? `
        <label class="acct-field">
          <span class="acct-label">Full name</span>
          <input class="acct-input" type="text" name="name" placeholder="Jordan Rivera" autocomplete="name" />
        </label>` : ''}

        <label class="acct-field">
          <span class="acct-label">Email address</span>
          <input class="acct-input" type="email" name="email" placeholder="you@example.com" autocomplete="email" />
        </label>

        <label class="acct-field">
          <span class="acct-label">Password</span>
          <input class="acct-input" type="password" name="password" placeholder="At least 6 characters" autocomplete="${activeTab === 'create' ? 'new-password' : 'current-password'}" />
        </label>

        <p class="acct-form-message" role="status"></p>

        <button class="acct-primary-btn full" type="submit">
          ${activeTab === 'create' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p class="acct-footnote">
        ${activeTab === 'create'
          ? 'Already have an account? <button class="acct-link-btn" data-acct-tab="signin">Sign in</button>'
          : 'New to Toggle News? <button class="acct-link-btn" data-acct-tab="create">Create an account</button>'}
      </p>
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


function handleSignInSubmit(e, overlay, form) {
  e.preventDefault();
  const data = new FormData(form);
  const email = (data.get('email') || '').trim();
  const password = data.get('password') || '';
  const name = (data.get('name') || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showFieldError(form, 'Enter a valid email address.');
    return;
  }
  if (password.length < 6) {
    showFieldError(form, 'Password must be at least 6 characters.');
    return;
  }
  if (activeTab === 'create' && name.length < 2) {
    showFieldError(form, 'Add your name so we can personalise your feed.');
    return;
  }

  const displayName = name || email.split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  store.setAccount({ email, name: displayName, plan: selectedPlan });
  notifyChange();
  showSuccess(
    overlay,
    activeTab === 'create' ? `Welcome, ${displayName}` : `Welcome back, ${displayName}`,
    `${getPlan(selectedPlan).name} plan active &middot; ${email}`
  );
}

function attachAccountModalEvents(overlay) {
  overlay.querySelectorAll('[data-acct-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.acctTab;
      renderAccountModal();
    });
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
        activeModal = 'signin';
        activeTab = 'create';
        renderAccountModal();
        const msg = document.querySelector('#account-modal-overlay .acct-form-message');
        if (msg) msg.textContent = `Create an account to activate the ${getPlan(selectedPlan).name} plan.`;
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

  const form = overlay.querySelector('.acct-form');
  if (form) form.addEventListener('submit', (e) => handleSignInSubmit(e, overlay, form));

  const signOutBtn = overlay.querySelector('[data-acct-signout]');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      store.signOut();
      notifyChange();
      showSuccess(overlay, 'Signed out', 'Your saved stories and history stay on this device.');
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
