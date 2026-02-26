// User Service - Registration, settings, session management

export class UserService {
  constructor(db) {
    this.db = db;
  }

  async findByTelegramId(telegramId) {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE telegram_id = ?'
    ).bind(telegramId.toString()).first();
    return result;
  }

  async create(telegramId, displayName, username = null) {
    const result = await this.db.prepare(`
      INSERT INTO users (telegram_id, telegram_username, display_name)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(telegramId.toString(), username, displayName).first();
    return result;
  }

  async findOrCreate(telegramId, displayName, username = null) {
    let user = await this.findByTelegramId(telegramId);
    if (!user) {
      user = await this.create(telegramId, displayName, username);
    }
    return user;
  }

  async update(userId, updates) {
    const ALLOWED = ['currency', 'language', 'display_name', 'daily_reminder', 'monthly_report', 'reminder_hour'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED.includes(key)) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = datetime("now")');
    values.push(userId);

    const result = await this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING *
    `).bind(...values).first();

    return result;
  }

  async updateCurrency(userId, currency) {
    return this.update(userId, { currency });
  }

  async updateLanguage(userId, language) {
    return this.update(userId, { language });
  }

  // Session management
  async getSession(telegramId) {
    const result = await this.db.prepare(
      'SELECT * FROM user_sessions WHERE telegram_id = ?'
    ).bind(telegramId.toString()).first();
    return result;
  }

  async setSession(telegramId, state, context = null, activeFamilyId = null) {
    const ctx = context ? JSON.stringify(context) : null;
    await this.db.prepare(`
      INSERT INTO user_sessions (telegram_id, state, context, active_family_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        state = excluded.state,
        context = excluded.context,
        active_family_id = excluded.active_family_id,
        updated_at = datetime('now')
    `).bind(telegramId.toString(), state, ctx, activeFamilyId).run();
  }

  async clearSession(telegramId) {
    await this.setSession(telegramId, 'idle', null);
  }

  async getActiveFamily(telegramId) {
    const session = await this.getSession(telegramId);
    return session?.active_family_id || null;
  }

  async setActiveFamily(telegramId, familyId) {
    const session = await this.getSession(telegramId);
    if (session) {
      await this.db.prepare(`
        UPDATE user_sessions SET active_family_id = ?, updated_at = datetime('now')
        WHERE telegram_id = ?
      `).bind(familyId, telegramId.toString()).run();
    } else {
      await this.setSession(telegramId, 'idle', null, familyId);
    }
  }

  // Notification settings
  async updateNotificationSetting(userId, setting, value) {
    const allowed = ['daily_reminder', 'monthly_report', 'reminder_hour'];
    if (!allowed.includes(setting)) {
      throw new Error('Invalid setting');
    }
    return this.update(userId, { [setting]: value });
  }

  async getUsersWithReminders() {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE daily_reminder = 1
    `).all();
    return result.results || [];
  }

  async getUsersWithReports() {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE monthly_report = 1
    `).all();
    return result.results || [];
  }
}
