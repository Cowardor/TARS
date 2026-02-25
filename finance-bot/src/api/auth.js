// Auth API - Email/Password + Telegram Login Widget
// Sessions stored in KV with 30-day expiry

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

// Generate random session token
function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password using SHA-256 + salt
async function hashPassword(password, salt = null) {
  const encoder = new TextEncoder();
  const saltBytes = salt
    ? Uint8Array.from(salt.match(/.{2}/g).map(h => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const saltHex = [...saltBytes].map(b => b.toString(16).padStart(2, '0')).join('');

  const combined = encoder.encode(saltHex + ':' + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  const [saltHex] = stored.split(':');
  const computed = await hashPassword(password, saltHex);
  return computed === stored;
}

// Save session to KV (30 days)
async function createSession(userId, kv) {
  const token = generateToken();
  await kv.put(`session:${token}`, JSON.stringify({ userId, createdAt: Date.now() }), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  return token;
}

// Validate Telegram Login Widget data
async function validateTelegramLogin(data, botToken) {
  const { hash, ...fields } = data;
  if (!hash) return false;

  const checkString = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k]}`)
    .join('\n');

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw', encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  // For Login Widget, secret key is SHA-256 of bot token
  const secretHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
  const validationKey = await crypto.subtle.importKey(
    'raw', secretHash,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', validationKey, encoder.encode(checkString));
  const hexHash = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');

  if (hexHash !== hash) return false;

  // Check auth_date is not too old (1 hour)
  const authDate = parseInt(fields.auth_date || '0');
  if (Date.now() / 1000 - authDate > 3600) return false;

  return true;
}

export async function handleAuth(request, env, pathname) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const db = env.DB;
  const kv = env.FINANCE_KV;

  // POST /api/auth/register — email + password
  if (pathname === '/api/auth/register' && request.method === 'POST') {
    const { name, email, password } = await request.json().catch(() => ({}));

    if (!name || !email || !password) return error('Name, email and password required');
    if (password.length < 6) return error('Password must be at least 6 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Invalid email');

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
    if (existing) return error('Email already registered', 409);

    const passwordHash = await hashPassword(password);
    const result = await db.prepare(
      `INSERT INTO users (telegram_id, display_name, email, password_hash, language, currency)
       VALUES (NULL, ?, ?, ?, 'en', 'USD')`
    ).bind(name.trim(), email.toLowerCase(), passwordHash).run();

    const userId = result.meta.last_row_id;
    const token = await createSession(userId, kv);

    return json({ success: true, token, user: { id: userId, name: name.trim(), email: email.toLowerCase() } });
  }

  // POST /api/auth/login — email + password
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const { email, password } = await request.json().catch(() => ({}));

    if (!email || !password) return error('Email and password required');

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
    if (!user || !user.password_hash) return error('Invalid email or password', 401);

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return error('Invalid email or password', 401);

    const token = await createSession(user.id, kv);
    return json({ success: true, token, user: { id: user.id, name: user.display_name, email: user.email } });
  }

  // POST /api/auth/telegram — Telegram Login Widget callback
  if (pathname === '/api/auth/telegram' && request.method === 'POST') {
    const data = await request.json().catch(() => ({}));

    const valid = await validateTelegramLogin(data, env.TELEGRAM_TOKEN);
    if (!valid) return error('Invalid Telegram auth data', 401);

    const tgId = data.id?.toString();
    if (!tgId) return error('Missing Telegram user ID', 400);

    // Find or create user
    let user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(tgId).first();
    if (!user) {
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'User';
      const result = await db.prepare(
        `INSERT INTO users (telegram_id, telegram_username, display_name, language, currency)
         VALUES (?, ?, ?, 'en', 'USD')`
      ).bind(tgId, data.username || null, name).run();
      user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first();
    }

    const token = await createSession(user.id, kv);
    return json({ success: true, token, user: { id: user.id, name: user.display_name } });
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const sessionToken = request.headers.get('X-Session-Token');
    if (sessionToken) await kv.delete(`session:${sessionToken}`);
    return json({ success: true });
  }

  // GET /api/auth/me — check current session
  if (pathname === '/api/auth/me') {
    const sessionToken = request.headers.get('X-Session-Token');
    if (!sessionToken) return error('No session', 401);

    const session = await kv.get(`session:${sessionToken}`, 'json');
    if (!session) return error('Session expired', 401);

    const user = await db.prepare('SELECT id, display_name, email, currency, language FROM users WHERE id = ?')
      .bind(session.userId).first();
    if (!user) return error('User not found', 404);

    return json({ id: user.id, name: user.display_name, email: user.email, currency: user.currency, language: user.language });
  }

  return error('Not found', 404);
}

// Resolve user from session token or Telegram initData
export async function resolveUser(request, env) {
  // 1. Try session token
  const sessionToken = request.headers.get('X-Session-Token');
  if (sessionToken) {
    const session = await env.FINANCE_KV.get(`session:${sessionToken}`, 'json');
    if (session) {
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
      if (user) return user;
    }
  }
  return null;
}
