export class RecurringBillsService {
  constructor(db) {
    this.db = db;
  }

  async getAll(userId, familyId = null, accountId = null) {
    let query = `
      SELECT r.*, c.name as category_name, c.emoji as category_emoji
      FROM recurring_bills r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_active = 1
    `;
    const params = [userId];
    if (accountId) { query += ' AND r.account_id = ?'; params.push(accountId); }
    query += ' ORDER BY r.day_of_month ASC';
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  async add(userId, { name, emoji, amount, currency, day_of_month, category_id, account_id, family_id }) {
    const result = await this.db.prepare(`
      INSERT INTO recurring_bills (user_id, family_id, account_id, name, emoji, amount, currency, day_of_month, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, family_id || null, account_id || null, name, emoji || '💳', amount, currency || 'PLN', day_of_month, category_id || null).run();
    return result.meta?.last_row_id;
  }

  async delete(userId, id) {
    await this.db.prepare('UPDATE recurring_bills SET is_active = 0 WHERE id = ? AND user_id = ?').bind(id, userId).run();
  }

  async update(userId, id, fields) {
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
    if (!sets.length) return;
    params.push(id, userId);
    await this.db.prepare(`UPDATE recurring_bills SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).bind(...params).run();
  }
}
