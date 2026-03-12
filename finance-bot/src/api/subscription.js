// Subscription API — Stripe checkout, portal, status, webhook

import { resolveUser } from './auth.js';
import { SubscriptionService } from '../services/subscription.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Telegram-Init-Data',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

// ── Stripe webhook signature verification (Web Crypto API) ──
async function verifyStripeSignature(body, sigHeader, secret) {
  try {
    const ts = sigHeader.split(',').find(p => p.startsWith('t=')).split('=')[1];
    const v1 = sigHeader.split(',').find(p => p.startsWith('v1=')).split('=')[1];
    const payload = `${ts}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (computed.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

async function stripePost(path, params, secretKey) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  return res.json();
}

// ── Webhook event handler ──
async function handleWebhookEvent(event, subService) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break;
      const userId = obj.metadata?.user_id;
      if (!userId) break;
      const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString();
      await subService.upsert(parseInt(userId), {
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.subscription,
        status: 'trialing',
        trialEndsAt: trialEnd,
        currentPeriodEnd: trialEnd,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const userId = await subService.findByStripeCustomerId(obj.customer);
      if (!userId) break;
      await subService.upsert(userId, {
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.id,
        status: obj.status,
        trialEndsAt: obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const userId = await subService.findByStripeCustomerId(obj.customer);
      if (!userId) break;
      await subService.upsert(userId, {
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.id,
        status: 'canceled',
        trialEndsAt: null,
        currentPeriodEnd: null,
      });
      break;
    }
  }
}

// ── Main handler ──
export async function handleSubscription(request, env, pathname) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const svc = new SubscriptionService(env.DB);

  // GET /api/subscription/status
  if (pathname === '/api/subscription/status' && request.method === 'GET') {
    const user = await resolveUser(request, env);
    if (!user) return err('Unauthorized', 401);
    return json(await svc.getFullInfo(user.id));
  }

  // POST /api/subscription/checkout
  if (pathname === '/api/subscription/checkout' && request.method === 'POST') {
    const user = await resolveUser(request, env);
    if (!user) return err('Unauthorized', 401);
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRO_PRICE_ID) return err('Stripe not configured', 500);

    const body = await request.json().catch(() => ({}));
    const appUrl = 'https://finance-bot.alar-app.workers.dev/app';
    const successUrl = body.successUrl || `${appUrl}?sub=success`;
    const cancelUrl  = body.cancelUrl  || `${appUrl}?sub=cancel`;

    // Get or create Stripe customer
    let customerId = await svc.getStripeCustomerId(user.id);
    if (!customerId) {
      const customer = await stripePost('/customers', {
        email: user.email || '',
        name: user.display_name || '',
        'metadata[user_id]': String(user.id),
      }, env.STRIPE_SECRET_KEY);
      if (customer.error) return err('Failed to create customer', 500);
      customerId = customer.id;
    }

    // Create checkout session with 30-day trial
    const session = await stripePost('/checkout/sessions', {
      customer: customerId,
      'line_items[0][price]': env.STRIPE_PRO_PRICE_ID,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'subscription_data[trial_period_days]': '30',
      'metadata[user_id]': String(user.id),
      allow_promotion_codes: 'true',
    }, env.STRIPE_SECRET_KEY);

    if (session.error) return err(`Stripe: ${session.error.message}`, 500);
    return json({ url: session.url });
  }

  // POST /api/subscription/portal
  if (pathname === '/api/subscription/portal' && request.method === 'POST') {
    const user = await resolveUser(request, env);
    if (!user) return err('Unauthorized', 401);

    const customerId = await svc.getStripeCustomerId(user.id);
    if (!customerId) return err('No subscription found', 404);

    const body = await request.json().catch(() => ({}));
    const portal = await stripePost('/billing_portal/sessions', {
      customer: customerId,
      return_url: body.returnUrl || 'https://finance-bot.alar-app.workers.dev/app',
    }, env.STRIPE_SECRET_KEY);

    if (portal.error) return err(`Stripe: ${portal.error.message}`, 500);
    return json({ url: portal.url });
  }

  // POST /api/stripe/webhook
  if (pathname === '/api/stripe/webhook' && request.method === 'POST') {
    const sig = request.headers.get('stripe-signature');
    if (!sig) return new Response('Missing signature', { status: 400 });

    const bodyText = await request.text();
    if (!await verifyStripeSignature(bodyText, sig, env.STRIPE_WEBHOOK_SECRET)) {
      return new Response('Invalid signature', { status: 400 });
    }

    try {
      await handleWebhookEvent(JSON.parse(bodyText), svc);
      return new Response('OK');
    } catch (e) {
      console.error('Webhook error:', e.message);
      return new Response('Internal error', { status: 500 });
    }
  }

  return err('Not found', 404);
}
