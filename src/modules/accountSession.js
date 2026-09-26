// Toggle Account session — the frontend half of the SSO integration.
//
// The browser never sees the access token: the news server keeps it in an
// httpOnly cookie and exposes who is signed in at /auth/session. This module
// mirrors that session into the app store (so the header avatar, account modal
// and greeting all read from one place) and offers the sign-in/sign-out hand-offs.
//
// Sign-in happens on the auth service's own hosted UI: we redirect the browser
// to /auth/login, the service authenticates the reader and returns them to the
// app with cookies set. Sign-out clears the local cookies, optionally ending the
// central session too so other Toggle apps are signed out as well.

import { store } from './state.js';

const SESSION_ENDPOINT = '/auth/session';
const LOGIN_ENDPOINT = '/auth/login';
const LOGOUT_ENDPOINT = '/auth/logout';

let authState = { status: 'unknown', signedIn: false, user: null, service: null, error: null };
const listeners = new Set();

export function getAuthState() {
  return { ...authState };
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener(getAuthState());
}

function applySignedIn(user, service) {
  // Plans are local to this app; the account service owns identity, not billing.
  const plan = store.getState().account?.plan || 'free';
  store.setAccount({
    id: user.id || null,
    email: user.email,
    name: user.name || user.email,
    plan,
    provider: 'toggle-account',
    scopes: user.scopes || []
  });
  authState = { status: 'ready', signedIn: true, user, service: service || authState.service, error: null };
}

function applySignedOut() {
  if (store.getState().account) store.signOut();
  authState = { ...authState, signedIn: false, user: null };
}

/**
 * Ask the server who is signed in. Called on boot and after returning from the
 * auth service. When the auth service cannot be reached the app keeps working
 * as a signed-out reader and records why, so the UI can say so honestly.
 */
export async function refreshAccountSession({ fetchImpl = typeof fetch === 'function' ? fetch : null } = {}) {
  if (!fetchImpl) return authState;

  try {
    const response = await fetchImpl(SESSION_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`session endpoint responded ${response.status}`);
    const payload = await response.json();

    if (payload?.signedIn && payload.user?.email) {
      applySignedIn(payload.user, payload.service || null);
    } else {
      authState = { ...authState, status: 'ready', error: null };
      applySignedOut();
    }
  } catch (error) {
    authState = {
      ...authState,
      status: 'unavailable',
      signedIn: false,
      error: String(error?.message || error)
    };
  }

  notify();
  return getAuthState();
}

/** Redirect the browser to the hosted Toggle Account sign-in. */
export function startSignIn({ promptLogin = false, locationImpl = typeof window !== 'undefined' ? window.location : null } = {}) {
  if (!locationImpl) return false;
  locationImpl.assign(promptLogin ? `${LOGIN_ENDPOINT}?prompt=login` : LOGIN_ENDPOINT);
  return true;
}

/**
 * Sign out. `federated` also ends the central Toggle Account session, which
 * signs the reader out of every connected Toggle app.
 */
export async function signOutAccount({
  federated = false,
  fetchImpl = typeof fetch === 'function' ? fetch : null,
  locationImpl = typeof window !== 'undefined' ? window.location : null
} = {}) {
  let federatedUrl = null;

  if (fetchImpl) {
    try {
      const response = await fetchImpl(`${LOGOUT_ENDPOINT}${federated ? '?federated=1' : ''}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      federatedUrl = payload?.federatedUrl || null;
    } catch {
      // Unreachable server: still drop the local session so the UI is honest.
      federatedUrl = null;
    }
  }

  applySignedOut();
  authState = { ...authState, status: 'ready', error: null };
  notify();

  if (federated && federatedUrl && locationImpl) {
    locationImpl.assign(federatedUrl);
    return true;
  }
  return true;
}
