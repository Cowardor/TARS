// Receipt Scanning API — Groq Vision → parse → save transaction

import { resolveUser } from './auth.js';

const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, X-Session-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function error(msg, status = 400) { return json({ error: msg }, status); }

export async function handleReceipt(request, env, pathname) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const user = await resolveUser(request, env);
  if (!user) return error('Unauthorized', 401);

  if (pathname === '/api/receipt/scan'   && request.method === 'POST') return scanReceipt(request, env, user);
  if (pathname === '/api/receipt/confirm' && request.method === 'POST') return confirmReceipt(request, env, user);
  if (pathname === '/api/receipt/consent' && request.method === 'POST') return setConsent(request, env, user);
  if (pathname === '/api/receipts'        && request.method === 'GET')  return listReceipts(request, env, user);

  return error('Not found', 404);
}

// ── Scan: image → Groq Vision → structured JSON ──────────────────────────────
async function scanReceipt(request, env, user) {
  if (!env.GROQ_API_KEY) return error('GROQ_API_KEY not configured', 500);

  // Free tier: max 10 receipt scans per month
  const subRow = await env.DB.prepare(
    'SELECT status FROM subscriptions WHERE user_id = ?'
  ).bind(user.id).first();
  const isProUser = subRow?.status === 'active' || subRow?.status === 'trialing';
  if (!isProUser) {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const countRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM receipts WHERE user_id = ? AND created_at >= ?"
    ).bind(user.id, monthStart.toISOString()).first();
    if ((countRow?.cnt || 0) >= 10) {
      return json({ error: 'receipt_limit_reached', limit: 10 }, 402);
    }
  }

  const formData = await request.formData();
  const imageFile = formData.get('image');
  if (!imageFile) return error('No image provided', 400);

  const bytes = await imageFile.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const mimeType = imageFile.type || 'image/jpeg';

  const prompt = `You are a receipt OCR expert. Extract all information from this receipt image.

Return ONLY valid JSON in this exact format:
{
  "merchant_name": "Store name",
  "merchant_category": "grocery|restaurant|pharmacy|electronics|clothing|transport|other",
  "receipt_date": "YYYY-MM-DD or null",
  "currency": "PLN|USD|EUR|UAH|etc",
  "items": [
    { "name": "Product name", "quantity": 1, "unit_price": 9.99, "total_price": 9.99, "category_guess": "food|drink|household|personal_care|other" }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "raw_text": "full text from receipt"
}

Rules:
- Extract EVERY line item from the receipt
- If you cannot read something clearly, use null
- Prices should be numbers (not strings)
- Return ONLY the JSON, no explanations`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      }],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  });

  if (!groqRes.ok) {
    console.error('Groq Vision error:', await groqRes.text());
    return error('Vision processing failed', 502);
  }

  const groqData = await groqRes.json();
  const content = groqData.choices?.[0]?.message?.content || '';

  let parsed;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    parsed = JSON.parse(match[0]);
  } catch (e) {
    console.error('Failed to parse Groq response:', content);
    return error('Could not parse receipt', 422);
  }

  const categoryMap = {
    grocery: 'Продукты', restaurant: 'Заведения', pharmacy: 'Красота',
    electronics: 'Шоппинг', clothing: 'Шоппинг', transport: 'Транспорт', other: 'Другое',
  };

  return json({
    success: true,
    receipt: parsed,
    suggested_category: categoryMap[parsed.merchant_category] || 'Другое',
  });
}

// ── Confirm: user confirmed → create transaction(s) ──────────────────────────
async function confirmReceipt(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const { receipt, category_id, account_id, split_items, share_analytics } = body;

  if (!receipt?.total || receipt.total <= 0) return error('Invalid receipt total', 400);

  const session = user.telegram_id
    ? await env.DB.prepare('SELECT active_account_id, active_family_id FROM user_sessions WHERE telegram_id = ?').bind(user.telegram_id).first()
    : null;
  const activeAccountId = account_id || session?.active_account_id || null;
  const familyId = session?.active_family_id || null;
  const today = new Date().toISOString().split('T')[0];

  // Save receipt record
  const receiptRow = await env.DB.prepare(`
    INSERT INTO receipts (user_id, account_id, family_id, merchant_name, merchant_category,
                          total_amount, currency, receipt_date, raw_text, share_analytics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).bind(
    user.id, activeAccountId, familyId,
    receipt.merchant_name || null, receipt.merchant_category || null,
    receipt.total, receipt.currency || 'USD',
    receipt.receipt_date || null, receipt.raw_text || null,
    share_analytics ? 1 : 0,
  ).first();

  const receiptId = receiptRow?.id;

  // Save items for analytics
  if (receiptId && receipt.items?.length > 0) {
    const stmt = env.DB.prepare(
      'INSERT INTO receipt_items (receipt_id, name, quantity, unit_price, total_price, category_guess) VALUES (?, ?, ?, ?, ?, ?)'
    );
    await env.DB.batch(receipt.items.map(item =>
      stmt.bind(receiptId, item.name, item.quantity || 1, item.unit_price || null, item.total_price, item.category_guess || null)
    ));
  }

  // Create transaction(s)
  const transactions = [];
  const txDate = receipt.receipt_date || today;

  if (split_items && receipt.items?.length > 0) {
    for (const item of receipt.items) {
      const tx = await env.DB.prepare(`
        INSERT INTO transactions (user_id, family_id, category_id, type, amount, currency, description, transaction_date, source)
        VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, 'receipt') RETURNING *
      `).bind(user.id, familyId, category_id, item.total_price, receipt.currency || 'USD', item.name, txDate).first();
      if (tx) transactions.push(tx);
    }
  } else {
    const tx = await env.DB.prepare(`
      INSERT INTO transactions (user_id, family_id, category_id, type, amount, currency, description, transaction_date, source)
      VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, 'receipt') RETURNING *
    `).bind(user.id, familyId, category_id, receipt.total, receipt.currency || 'USD', receipt.merchant_name || 'Receipt', txDate).first();
    if (tx) transactions.push(tx);
  }

  return json({ success: true, transactions, receipt_id: receiptId });
}

// ── Consent ───────────────────────────────────────────────────────────────────
async function setConsent(request, env, user) {
  const { consent } = await request.json().catch(() => ({}));
  await env.DB.prepare('UPDATE users SET receipt_analytics = ? WHERE id = ?').bind(consent ? 1 : 0, user.id).run();
  return json({ success: true });
}

// ── List receipts ─────────────────────────────────────────────────────────────
async function listReceipts(request, env, user) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const rows = await env.DB.prepare(`
    SELECT id, merchant_name, merchant_category, total_amount, currency, receipt_date, created_at
    FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(user.id, limit).all();
  return json({ receipts: rows.results || [] });
}
