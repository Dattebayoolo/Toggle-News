// Auth routes — the Toggle News half of the Toggle Account System handshake.
//
//   GET  /auth/login      → redirect to the auth service's hosted sign-in
//   GET  /auth/callback   → verify state/PKCE, exchange the code, store tokens
//   GET  /auth/session    → who is signed in (used by the frontend on boot)
//   POST /auth/logout     → drop local tokens; ?federated=1 also ends the
//                           central session so the next sign-in asks again
//   GET  /api/me          → protected example endpoint (bearer or cookie token)
//
// The reader experience never requires a session: every /api/articles route
// stays public, and a failed sign-in simply leaves the app signed out.

import { Router } from 'express';
import { getSsoConfig, getTokenExpectations } from '../auth/config.js';
import {
  beginLogin,
  clearStateCookie,
  clearTokens,
  exchangeCode,
  readState,
  storeTokens
} from '../auth/ssoClient.js';
import { resolveSession, sessionPayload } from '../auth/session.js';
import { userFromClaims, verifyAccessToken } from '../auth/tokenVerifier.js';
import { parseCookies } from '../auth/cookies.js';

export const authRoutes = Router();

/** Where the browser should land after signing in or out. */
function appRedirect(res, env = process.env) {
  const { appOrigin } = getSsoConfig(env);
  return res.redirect(302, `${appOrigin}/`);
}

authRoutes.get('/auth/login', (req, res) => {
  const promptLogin = String(req.query.prompt || '').toLowerCase() === 'login';
  const url = beginLogin({ promptLogin, res });
  res.redirect(302, url);
});

authRoutes.get('/auth/callback', async (req, res, next) => {
  const config = getSsoConfig();
  const { state: expectedState, codeVerifier } = readState(req);
  const { code = '', state = '', error = '' } = req.query;

  clearStateCookie(res);

  if (error) {
    // The user declined consent, or the service reported a problem.
    return res.redirect(302, `${config.appOrigin}/?auth=declined#account`);
  }
  if (!code || !expectedState || state !== expectedState || !codeVerifier) {
    return res.status(400).type('html').send(
      '<p>This sign-in link is incomplete or no longer matches the browser that started it. ' +
      '<a href="/auth/login">Try signing in again</a>.</p>'
    );
  }

  try {
    const tokens = await exchangeCode({ code, codeVerifier });
    storeTokens(res, tokens);
    return appRedirect(res);
  } catch (err) {
    return next(err);
  }
});

authRoutes.get('/auth/session', async (req, res, next) => {
  try {
    const session = await resolveSession(req, res);
    res.set('Cache-Control', 'no-store');
    return res.json({ ...sessionPayload(session), service: getSsoConfig().authBaseUrl });
  } catch (err) {
    return next(err);
  }
});

authRoutes.post('/auth/logout', (req, res) => {
  const config = getSsoConfig();
  clearTokens(res);

  // Federated sign-out clears the central session as well, so the next app in
  // the suite starts from a signed-out state too.
  const federated = String(req.query.federated || '') === '1';
  const federatedUrl = federated ? new URL('/logout', config.authBaseUrl).toString() : null;

  res.set('Cache-Control', 'no-store');
  return res.json({ ok: true, federatedUrl });
});

/** Protected endpoint: accepts the httpOnly cookie or an `Authorization: Bearer`. */
authRoutes.get('/api/me', async (req, res, next) => {
  try {
    const config = getSsoConfig();
    const { audience, issuer } = getTokenExpectations();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : parseCookies(req.headers.cookie)[config.cookies.access];

    if (!token) return res.status(401).json({ error: 'Missing access token.' });

    const { payload } = await verifyAccessToken(token, { audience, issuer, authBaseUrl: config.authBaseUrl });
    res.set('Cache-Control', 'no-store');
    return res.json({ user: userFromClaims(payload) });
  } catch (err) {
    if (String(err.message || '').match(/expired|signature|audience|issuer|malformed|unsupported|no signing key/)) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    return next(err);
  }
});
