// DEVELOPMENT STAND-IN for the Toggle Account System — NOT the real auth service.
//
// The real service (see the "Toggle Account System" project) is a full OAuth2/
// OIDC provider backed by PostgreSQL, with a hosted sign-in UI, consent screen,
// email verification, refresh-token rotation and audit logging. This file exists
// only so Toggle News can be developed on a machine without PostgreSQL: it speaks
// just enough of the same contract (JWKS, /authorize, /token with PKCE) to let the
// redirect flow complete, and it auto-approves every request as a fixed demo user.
//
// Run it with:  npm run auth:stand-in        (from the server/ folder)
// Never ship it: it authenticates nobody.

import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.AUTH_STANDIN_PORT || 4000);
const KID = 'standin-key';
const ISSUER = process.env.JWT_ISSUER || 'https://auth.toggle.local';
const DEMO_USER = { sub: 'user-standin', email: 'demo@togglenews.local' };

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const codes = new Map();
const refreshTokens = new Map();

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value), 'utf8').toString('base64url');

/** A short demo display name derived from the demo email. */
function signAccessToken({ sub, email, audience, expiresIn = 900 }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: KID, typ: 'JWT' };
  const payload = {
    iss: ISSUER, aud: audience, sub, email,
    jti: crypto.randomUUID(), iat: now, exp: now + expiresIn,
    scope: 'profile.read offline_access'
  };
  const input = `${b64url(header)}.${b64url(payload)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  return `${input}.${signature}`;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (status, payload) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  };

  if (url.pathname === '/health') return json(200, { status: 'ok', service: 'auth-standin' });

  // Public keys — the news server verifies tokens against these.
  if (url.pathname === '/.well-known/jwks.json') {
    return json(200, { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'RS256' }] });
  }

  // Stands in for the hosted sign-in + consent screen: "the reader approved".
  if (url.pathname === '/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri');
    if (!redirectUri) return json(400, { error: 'invalid_request', detail: 'redirect_uri is required' });

    const code = `code-${crypto.randomUUID()}`;
    codes.set(code, {
      challenge: url.searchParams.get('code_challenge'),
      audience: 'toggle-news'
    });

    const back = new URL(redirectUri);
    back.searchParams.set('code', code);
    back.searchParams.set('state', url.searchParams.get('state') || '');
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (url.pathname === '/token' && req.method === 'POST') {
    const body = await readJsonBody(req);

    if (body.grant_type === 'refresh_token') {
      const record = refreshTokens.get(body.refresh_token);
      if (!record) return json(400, { error: 'invalid_grant' });
      refreshTokens.delete(body.refresh_token); // rotate, like the real service
      const rotated = `refresh-${crypto.randomUUID()}`;
      refreshTokens.set(rotated, record);
      return json(200, {
        access_token: signAccessToken({ sub: record.sub, email: record.email, audience: record.audience }),
        token_type: 'Bearer', expires_in: 900, refresh_token: rotated, scope: 'profile.read offline_access'
      });
    }

    const record = codes.get(body.code);
    if (!record) return json(400, { error: 'invalid_grant' });

    // PKCE is verified for real, so the flow cannot pass with a bad verifier.
    const expected = crypto.createHash('sha256').update(body.code_verifier || '').digest('base64url');
    if (expected !== record.challenge) return json(400, { error: 'PKCE verification failed.' });
    codes.delete(body.code);

    const refresh = `refresh-${crypto.randomUUID()}`;
    refreshTokens.set(refresh, { ...DEMO_USER, audience: record.audience });
    return json(200, {
      access_token: signAccessToken({ ...DEMO_USER, audience: record.audience }),
      token_type: 'Bearer', expires_in: 900, refresh_token: refresh, scope: 'profile.read offline_access',
      user: { user_id: DEMO_USER.sub, email: DEMO_USER.email }
    });
  }

  if (url.pathname === '/logout') return json(200, { ok: true, service: 'auth-standin' });

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', service: 'auth-standin' }));
});

server.listen(PORT, () => {
  console.log(`⚠  Toggle Account STAND-IN listening on http://localhost:${PORT}`);
  console.log('   Development only — it approves every request as ' + DEMO_USER.email + '.');
  console.log('   For real accounts run the Toggle Account System (needs PostgreSQL).');
});
