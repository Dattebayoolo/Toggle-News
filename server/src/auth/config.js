// SSO configuration for the Toggle Account System integration.
//
// Toggle News is registered as an OAuth2 client ("toggle-news") of the central
// auth service. Everything the client needs is derived from environment
// variables so the same build works against localhost or a real deployment:
//
//   AUTH_BASE_URL              where the account service runs (default :4000)
//   TOGGLE_NEWS_CLIENT_ID      registered client id
//   TOGGLE_NEWS_REDIRECT_URI   exact callback URL registered for that client
//   TOGGLE_NEWS_APP_ORIGIN     where to send the browser after sign-in/out
//
// Read lazily (at call time) so tests can point at a fake auth service.

const DEFAULTS = {
  authBaseUrl: 'http://localhost:4000',
  clientId: 'toggle-news',
  appOrigin: 'http://localhost:5173',
  scopes: ['profile.read', 'offline_access']
};

/** Cookie names, derived from the client id the same way the SSO registry does. */
function cookieNames(clientId) {
  const prefix = clientId.replace(/-/g, '_');
  return {
    access: `${prefix}_access_token`,
    refresh: `${prefix}_refresh_token`,
    state: `${prefix}_oauth_state`
  };
}

export function getSsoConfig(env = process.env) {
  const clientId = env.TOGGLE_NEWS_CLIENT_ID || DEFAULTS.clientId;
  const appOrigin = (env.TOGGLE_NEWS_APP_ORIGIN || DEFAULTS.appOrigin).replace(/\/$/, '');

  return {
    authBaseUrl: (env.AUTH_BASE_URL || DEFAULTS.authBaseUrl).replace(/\/$/, ''),
    clientId,
    appOrigin,
    redirectUri: env.TOGGLE_NEWS_REDIRECT_URI || `${appOrigin}/auth/callback`,
    scopes: env.TOGGLE_NEWS_SCOPES ? env.TOGGLE_NEWS_SCOPES.split(' ').filter(Boolean) : DEFAULTS.scopes,
    cookies: cookieNames(clientId),
    // Access tokens live 15 minutes; the refresh cookie spans the service's TTL.
    accessTokenMaxAgeSeconds: 15 * 60,
    refreshTokenMaxAgeSeconds: 30 * 24 * 60 * 60
  };
}

/** Audience/issuer checks are made against values the auth service publishes. */
export function getTokenExpectations(env = process.env) {
  const { clientId } = getSsoConfig(env);
  return {
    audience: env.TOGGLE_NEWS_TOKEN_AUDIENCE || clientId,
    // Issuer is whatever the service signs with; tests may point it elsewhere.
    issuer: env.TOGGLE_NEWS_TOKEN_ISSUER || null
  };
}
