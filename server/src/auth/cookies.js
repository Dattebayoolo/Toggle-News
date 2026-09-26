// Minimal cookie helpers for the SSO flow (no dependencies).
//
// Cookies are used for three things: the short-lived CSRF/PKCE state bundle, the
// access token, and the rotating refresh token. All are httpOnly + SameSite=Lax
// so they survive the redirect back from the auth service but are never readable
// from page scripts.

export function parseCookies(header) {
  const jar = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    jar[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return jar;
}

function serialize(name, value, { maxAge, path = '/', sameSite = 'Lax', httpOnly = true, secure = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (typeof maxAge === 'number') parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join('; ');
}

/** Append a Set-Cookie header (multiple cookies per response are fine). */
export function setCookie(res, name, value, options = {}) {
  res.append('Set-Cookie', serialize(name, value, options));
}

export function clearCookie(res, name, options = {}) {
  res.append('Set-Cookie', serialize(name, '', { ...options, maxAge: 0 }));
}
