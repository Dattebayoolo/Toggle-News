// Access-token verification for Toggle apps.
//
// The auth service signs RS256 JWTs and publishes its public keys at
// `/.well-known/jwks.json`. Verifying locally means the news API never shares a
// secret with the auth service and never has to call it on the hot path.
//
// Implemented with node:crypto only — no extra dependencies. The key set is
// cached and refetched when a token arrives signed with an unknown `kid`
// (rotation), with a short negative cache so a broken auth service cannot cause
// a fetch storm.

import crypto from 'node:crypto';

const CLOCK_TOLERANCE_SECONDS = 30;
const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_RETRY_MS = 30 * 1000;

let cachedKeys = null;
let cachedAt = 0;
let fetchPromise = null;

/** base64url -> utf8 string */
function decodeSegment(segment) {
  return Buffer.from(String(segment || ''), 'base64url').toString('utf8');
}

export function decodeJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  return {
    header: JSON.parse(decodeSegment(parts[0])),
    payload: JSON.parse(decodeSegment(parts[1])),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], 'base64url')
  };
}

/** Verify the RS256 signature of a decoded token against one JWK. */
export function verifySignature({ signingInput, signature }, jwk) {
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return crypto.verify('RSA-SHA256', Buffer.from(signingInput), key, signature);
}

/** Fetch the service's key set (cached, with a negative cache for failures). */
export async function getJwks({ authBaseUrl, fetchImpl = fetch, force = false } = {}) {
  const now = Date.now();
  if (!force && cachedKeys && now - cachedAt < JWKS_TTL_MS) return cachedKeys;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetchImpl(new URL('/.well-known/jwks.json', authBaseUrl));
      if (!response.ok) throw new Error(`jwks responded ${response.status}`);
      const payload = await response.json();
      cachedKeys = Array.isArray(payload?.keys) ? payload.keys : [];
      cachedAt = Date.now();
      return cachedKeys;
    } catch (error) {
      cachedKeys = null;
      cachedAt = Date.now() + (JWKS_TTL_MS - JWKS_RETRY_MS); // retry sooner
      throw error;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function resetJwksCache() {
  cachedKeys = null;
  cachedAt = 0;
  fetchPromise = null;
}

function checkClaims(payload, { audience, issuer }) {
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_TOLERANCE_SECONDS < now) {
    throw new Error('token expired');
  }
  if (typeof payload.nbf === 'number' && payload.nbf - CLOCK_TOLERANCE_SECONDS > now) {
    throw new Error('token not yet valid');
  }
  if (issuer && payload.iss !== issuer) {
    throw new Error(`unexpected issuer (${payload.iss})`);
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (audience && !audiences.includes(audience)) {
    throw new Error(`token is not for audience ${audience}`);
  }
}

/**
 * Verify an access token end to end and return `{ payload, protectedHeader }`.
 * Throws with a short reason when the token is malformed, tampered, expired or
 * issued for a different app.
 */
export async function verifyAccessToken(token, { audience, issuer, authBaseUrl, fetchImpl = fetch } = {}) {
  const decoded = decodeJwt(token);
  if (decoded.header.alg !== 'RS256') throw new Error(`unsupported alg ${decoded.header.alg}`);

  const selectKey = (keys) =>
    keys.find((key) => key.kid === decoded.header.kid) || (keys.length === 1 ? keys[0] : null);

  let keys = await getJwks({ authBaseUrl, fetchImpl });
  let jwk = selectKey(keys);

  // A token can arrive signed by a key we have no cache entry for, or by a key
  // the service has since rotated to while keeping the same `kid`. Refresh the
  // key set once and retry before rejecting.
  if (!jwk || !verifySignature(decoded, jwk)) {
    keys = await getJwks({ authBaseUrl, fetchImpl, force: true });
    jwk = selectKey(keys);
    if (!jwk) throw new Error(`no signing key for kid ${decoded.header.kid}`);
    if (!verifySignature(decoded, jwk)) throw new Error('signature mismatch');
  }

  checkClaims(decoded.payload, { audience, issuer });
  return { payload: decoded.payload, protectedHeader: decoded.header };
}

/** The user shape the rest of the server uses. */
export function userFromClaims(payload) {
  return {
    id: payload.sub || null,
    email: payload.email || null,
    emailVerified: Boolean(payload.email_verified),
    scopes: String(payload.scope || '').split(' ').filter(Boolean)
  };
}
