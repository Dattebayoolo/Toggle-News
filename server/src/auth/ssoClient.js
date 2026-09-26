// OAuth2 authorization-code client for the Toggle Account System.
//
// Flow (matches the service's /authorize → consent → /token contract):
//
//   1. GET /auth/login      state + PKCE verifier are stored in a short-lived
//                           cookie and the browser is sent to /authorize.
//   2. service sign-in      the hosted UI runs on the auth service; the user
//                           approves the app on its consent screen.
//   3. GET /auth/callback   the state cookie is checked, the code is exchanged
//                           for tokens at /token (S256 verifier proves it is the
//                           same browser), and the tokens are stored httpOnly.
//
// The access token is never exposed to page scripts; the frontend asks
// /auth/session instead. Refresh tokens rotate on every use.

import crypto from 'node:crypto';
import { clearCookie, parseCookies, setCookie } from './cookies.js';
import { getSsoConfig } from './config.js';

function base64url(buffer) {
  return buffer.toString('base64url');
}

/** RFC 7636 S256 challenge pair. */
export function createPkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(48));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

/** Encode/decode the state bundle that travels in a cookie. */
export function encodeStateCookie({ state, codeVerifier }) {
  return Buffer.from(JSON.stringify({ state, codeVerifier }), 'utf8').toString('base64url');
}

export function decodeStateCookie(raw) {
  try {
    const parsed = JSON.parse(Buffer.from(String(raw || ''), 'base64url').toString('utf8'));
    return { state: String(parsed.state || ''), codeVerifier: String(parsed.codeVerifier || '') };
  } catch {
    return { state: '', codeVerifier: '' };
  }
}

function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    // Secure cookies only make sense once the app is served over https.
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds
  };
}

/** Step 1 — start the browser flow. Returns the URL to redirect to. */
export function beginLogin({ promptLogin = false, env = process.env, res } = {}) {
  const config = getSsoConfig(env);
  const state = crypto.randomUUID();
  const { codeVerifier, codeChallenge } = createPkcePair();

  setCookie(res, config.cookies.state, encodeStateCookie({ state, codeVerifier }), cookieOptions(10 * 60));

  const authorizeUrl = new URL('/authorize', config.authBaseUrl);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', config.scopes.join(' '));
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  // `prompt=login` lets a reader sign in as somebody else even with a central
  // session already open on the auth service.
  if (promptLogin) authorizeUrl.searchParams.set('prompt', 'login');

  return authorizeUrl.toString();
}

/** Step 3a — exchange an authorization code for tokens. */
export async function exchangeCode({ code, codeVerifier, env = process.env, fetchImpl = fetch }) {
  const config = getSsoConfig(env);
  const response = await fetchImpl(new URL('/token', config.authBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || `token exchange failed (${response.status})`);
  }
  return payload;
}

/** Silent renewal — rotating refresh tokens; replaying an old one fails. */
export async function refreshAccessToken({ refreshToken, env = process.env, fetchImpl = fetch }) {
  const config = getSsoConfig(env);
  const response = await fetchImpl(new URL('/token', config.authBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      redirect_uri: config.redirectUri
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || `refresh failed (${response.status})`);
  }
  return payload;
}

/** Store an issued token pair on the response. */
export function storeTokens(res, tokens, { env = process.env } = {}) {
  const config = getSsoConfig(env);
  const expiresIn = Number(tokens.expires_in) > 0 ? Number(tokens.expires_in) : config.accessTokenMaxAgeSeconds;
  setCookie(res, config.cookies.access, tokens.access_token, cookieOptions(expiresIn));
  if (tokens.refresh_token) {
    setCookie(res, config.cookies.refresh, tokens.refresh_token, cookieOptions(config.refreshTokenMaxAgeSeconds));
  }
}

export function readTokens(req, { env = process.env } = {}) {
  const config = getSsoConfig(env);
  const jar = parseCookies(req.headers?.cookie);
  return {
    accessToken: jar[config.cookies.access] || null,
    refreshToken: jar[config.cookies.refresh] || null
  };
}

export function clearTokens(res, { env = process.env } = {}) {
  const config = getSsoConfig(env);
  clearCookie(res, config.cookies.access, { httpOnly: true, sameSite: 'Lax' });
  clearCookie(res, config.cookies.refresh, { httpOnly: true, sameSite: 'Lax' });
}

export function readState(req, { env = process.env } = {}) {
  const config = getSsoConfig(env);
  return decodeStateCookie(parseCookies(req.headers?.cookie)[config.cookies.state]);
}

export function clearStateCookie(res, { env = process.env } = {}) {
  const config = getSsoConfig(env);
  clearCookie(res, config.cookies.state, { httpOnly: true, sameSite: 'Lax' });
}
