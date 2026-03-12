// Subscription Service — Stripe integration

export class SubscriptionService {
  constructor(db) {
    this.db = db;
  }

  async getFullInfo(userId) {
    const [user, sub] = await Promise.all([
      this.db.prepare('SELECT subscription_tier, subscription_expires_at FROM users WHERE id = ?').bind(userId).first(),
      this.db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').bind(userId).first(),
    ]);

    const tier = user?.subscription_tier || 'free';
    const expiresAt = user?.subscription_expires_at;
    const now = new Date().toISOString();
    const isActive = (tier === 'pro') && !!expiresAt && expiresAt > now;

    return {
      tier: isActive ? 'pro' : 'free',
      isActive,
      expiresAt: expiresAt || null,
      stripeStatus: sub?.status || 'free',
      trialEndsAt: sub?.trial_ends_at || null,
      currentPeriodEnd: sub?.current_period_end || null,
    };
  }

  async getStripeCustomerId(userId) {
    const row = await this.db.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first();
    return row?.stripe_customer_id || null;
  }

  async findByStripeCustomerId(customerId) {
    const row = await this.db.prepare(
      'SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?'
    ).bind(customerId).first();
    return row?.user_id || null;
  }

  async upsert(userId, data) {
    await this.db.prepare(`
      INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, trial_ends_at, current_period_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        stripe_customer_id = COALESCE(excluded.stripe_customer_id, stripe_customer_id),
        stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, stripe_subscription_id),
        status = excluded.status,
        trial_ends_at = excluded.trial_ends_at,
        current_period_end = excluded.current_period_end,
        updated_at = datetime('now')
    `).bind(
      userId,
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.status || 'free',
      data.trialEndsAt || null,
      data.currentPeriodEnd || null,
    ).run();

    const isActive = ['trialing', 'active'].includes(data.status);
    const tier = isActive ? 'pro' : 'free';
    const expiresAt = data.currentPeriodEnd || data.trialEndsAt || null;

    await this.db.prepare(`
      UPDATE users SET subscription_tier = ?, subscription_expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(tier, expiresAt, userId).run();
  }
}
