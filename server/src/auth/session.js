// Session resolution for the news API.
//
// `/auth/session` and any protected route ask this module "who is signed in?".
// It verifies the access cookie locally, and — when that token has expired but a
// refresh cookie is present — renews the pair once, storing the rotated tokens on
// the response. Refresh tokens rotate, so concurrent renewals for the same cookie
// are serialised in-process to avoid tripping the service's reuse detection.

import { getSsoConfig, getTokenExpectations } from './config.js';
import { readTokens, refreshAccessToken, storeTokens, clearTokens } from './ssoClient.js';
import { userFromClaims, verifyAccessToken } from './tokenVerifier.js';

const inFlightRefreshes = new Map();

/** Derive a display name from the email when the token carries no name claim. */
export function displayNameFromEmail(email) {
  const local = String(email || '').split('@')[0] || '';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim() || null;
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: displayNameFromEmail(user.email),
    scopes: user.scopes
  };
}

async function verify(token, env, fetchImpl) {
  const { audience, issuer } = getTokenExpectations(env);
  const { authBaseUrl } = getSsoConfig(env);
  const { payload } = await verifyAccessToken(token, { audience, issuer, authBaseUrl, fetchImpl });
  return userFromClaims(payload);
}

function refreshOnce(refreshToken, { env, fetchImpl }) {
  const key = refreshToken;
  if (!inFlightRefreshes.has(key)) {
    const job = refreshAccessToken({ refreshToken, env, fetchImpl })
      .finally(() => inFlightRefreshes.delete(key));
    inFlightRefreshes.set(key, job);
  }
  return inFlightRefreshes.get(key);
}

/**
 * Resolve the reader's session.
 *
 * Returns `{ signedIn, user, refreshed }`. When `refreshed` is true the caller
 * must send the response so the rotated cookies reach the browser (and clear the
 * cookies when `expired` is true).
 */
export async function resolveSession(req, res, { env = process.env, fetchImpl = fetch } = {}) {
  const { accessToken, refreshToken } = readTokens(req, { env });

  if (accessToken) {
    try {
      return { signedIn: true, user: await verify(accessToken, env, fetchImpl), refreshed: false };
    } catch {
      // Fall through to the refresh path — the access token may simply be old.
    }
  }

  if (refreshToken) {
    try {
      const tokens = await refreshOnce(refreshToken, { env, fetchImpl });
      storeTokens(res, tokens, { env });
      return { signedIn: true, user: await verify(tokens.access_token, env, fetchImpl), refreshed: true };
    } catch {
      // Expired or revoked: drop the cookies so the browser stops sending them.
      clearTokens(res, { env });
      return { signedIn: false, user: null, refreshed: true, expired: true };
    }
  }

  return { signedIn: false, user: null, refreshed: false };
}

/** JSON shape shared by /auth/session and /api/me. */
export function sessionPayload(session) {
  if (!session?.signedIn) return { signedIn: false, user: null };
  return { signedIn: true, user: userPayload(session.user) };
}
