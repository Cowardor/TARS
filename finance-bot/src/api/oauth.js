// OAuth 2.0 — Google, Apple, Facebook
// Authorization Code Flow + PKCE (server-side, Cloudflare Workers)
// State stored in KV (TTL 10 min), one-time use

import { createSession, generateToken } from './auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
};

function getRedirectBase(request, env) {
  return env.OAUTH_REDIRECT_BASE || new URL(request.url).origin;
}

function getProviderConfig(provider, env) {
  const configs = {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
      pkce: true,
    },
    apple: {
      clientId: env.APPLE_CLIENT_ID,
      authUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scope: 'name email',
      pkce: false,
      formPost: true,
    },
    facebook: {
      clientId: env.FACEBOOK_APP_ID,
      clientSecret: env.FACEBOOK_APP_SECRET,
      authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
      profileUrl: 'https://graph.facebook.com/me?fields=id,name,email',
      scope: 'email,public_profile',
      pkce: false,
    },
  };
  return configs[provider] || null;
}

async function generatePKCE() {
  const verifier = generateToken(); // 64 hex chars
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

// Apple requires a JWT as client_secret signed with ES256 private key
async function generateAppleClientSecret(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: env.APPLE_KEY_ID };
  const claims = {
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 15777000, // 6 months
    aud: 'https://appleid.apple.com',
    sub: env.APPLE_CLIENT_ID,
  };

  const encode = obj => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64 = encode(header);
  const claimsB64 = encode(claims);
  const sigInput = `${headerB64}.${claimsB64}`;

  // Import ES256 private key from PEM
  const pemKey = env.APPLE_PRIVATE_KEY.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(sigInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${sigInput}.${sigB64}`;
}

// Decode JWT payload without verification (for Apple id_token)
function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function exchangeCode(provider, code, codeVerifier, redirectUri, env) {
  const config = getProviderConfig(provider, env);

  let clientSecret = config.clientSecret;
  if (provider === 'apple') {
    clientSecret = await generateAppleClientSecret(env);
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: clientSecret,
  });
  if (config.pkce && codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${provider}): ${text}`);
  }
  return res.json();
}

async function getUserProfile(provider, tokens) {
  if (provider === 'apple') {
    // Apple profile comes from id_token JWT (only email+sub on subsequent logins)
    const payload = decodeJwtPayload(tokens.id_token);
    if (!payload) throw new Error('Apple: invalid id_token');
    return {
      id: payload.sub,
      email: payload.email || null,
      name: null, // Apple sends name only on first login via form POST user field
    };
  }

  const config = getProviderConfig(provider, null);
  const res = await fetch(config.profileUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!res.ok) throw new Error(`Profile fetch failed (${provider}): ${res.status}`);
  const data = await res.json();

  if (provider === 'google') {
    return { id: data.id, email: data.email || null, name: data.name || null };
  }
  if (provider === 'facebook') {
    return { id: data.id, email: data.email || null, name: data.name || null };
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function findOrCreateOAuthUser(provider, profile, appleUserData, db) {
  const idColumn = `${provider}_id`;

  // 1. Find by provider ID
  let user = await db.prepare(`SELECT * FROM users WHERE ${idColumn} = ?`).bind(profile.id).first();
  if (user) return user;

  // 2. Find by email and link
  if (profile.email) {
    user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(profile.email.toLowerCase()).first();
    if (user) {
      await db.prepare(`UPDATE users SET ${idColumn} = ? WHERE id = ?`).bind(profile.id, user.id).run();
      return user;
    }
  }

  // 3. Create new user
  // For Apple: name comes from form POST user field (first login only)
  let name = profile.name;
  if (!name && appleUserData) {
    name = [appleUserData.firstName, appleUserData.lastName].filter(Boolean).join(' ');
  }
  name = name || 'User';

  const result = await db.prepare(
    `INSERT INTO users (${idColumn}, email, display_name, language, currency)
     VALUES (?, ?, ?, 'en', 'USD')`
  ).bind(profile.id, profile.email?.toLowerCase() || null, name).run();

  return db.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleOAuth(request, env, pathname) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Extract provider from /api/auth/oauth/{provider} or /api/auth/oauth/{provider}/callback
  const parts = pathname.split('/'); // ['', 'api', 'auth', 'oauth', provider, ?'callback']
  const provider = parts[4];
  const isCallback = parts[5] === 'callback';

  if (!['google', 'apple', 'facebook'].includes(provider)) {
    return new Response('Unknown provider', { status: 404 });
  }

  const config = getProviderConfig(provider, env);
  if (!config?.clientId) {
    return new Response(JSON.stringify({ error: `${provider} OAuth not configured` }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const base = getRedirectBase(request, env);
  const redirectUri = `${base}/api/auth/oauth/${provider}/callback`;

  // ── Initiate OAuth ──────────────────────────────────────────────────────────
  if (!isCallback) {
    const state = generateToken();
    let codeVerifier = null;

    if (config.pkce) {
      const pkce = await generatePKCE();
      codeVerifier = pkce.verifier;
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      });
      await env.FINANCE_KV.put(`oauth_state:${state}`, JSON.stringify({ provider, codeVerifier, createdAt: Date.now() }), { expirationTtl: 600 });
      return Response.redirect(`${config.authUrl}?${params}`, 302);
    }

    // Facebook / Apple (no PKCE)
    const extraParams = config.formPost ? { response_mode: 'form_post' } : {};
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
      ...extraParams,
    });
    await env.FINANCE_KV.put(`oauth_state:${state}`, JSON.stringify({ provider, codeVerifier: null, createdAt: Date.now() }), { expirationTtl: 600 });
    return Response.redirect(`${config.authUrl}?${params}`, 302);
  }

  // ── Handle callback ─────────────────────────────────────────────────────────
  let code, stateParam, appleUserData = null;

  if (provider === 'apple' && request.method === 'POST') {
    const form = await request.formData();
    code = form.get('code');
    stateParam = form.get('state');
    // Apple sends user JSON only on first login
    const userField = form.get('user');
    if (userField) {
      try { appleUserData = JSON.parse(userField)?.name || null; } catch { /* ignore */ }
    }
  } else {
    const url = new URL(request.url);
    code = url.searchParams.get('code');
    stateParam = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      return Response.redirect(`${base}/app/?oauth_error=${encodeURIComponent(oauthError)}`, 302);
    }
  }

  if (!code || !stateParam) {
    return Response.redirect(`${base}/app/?oauth_error=missing_params`, 302);
  }

  // Validate state (CSRF protection)
  const stored = await env.FINANCE_KV.get(`oauth_state:${stateParam}`, 'json');
  if (!stored || stored.provider !== provider) {
    return Response.redirect(`${base}/app/?oauth_error=invalid_state`, 302);
  }
  await env.FINANCE_KV.delete(`oauth_state:${stateParam}`);

  try {
    const tokens = await exchangeCode(provider, code, stored.codeVerifier, redirectUri, env);
    const profile = await getUserProfile(provider, tokens);
    const user = await findOrCreateOAuthUser(provider, profile, appleUserData, env.DB);
    const sessionToken = await createSession(user.id, env.FINANCE_KV);
    return Response.redirect(`${base}/app/?oauth_token=${sessionToken}`, 302);
  } catch (e) {
    console.error(`OAuth callback error (${provider}):`, e.message);
    return Response.redirect(`${base}/app/?oauth_error=server_error`, 302);
  }
}
