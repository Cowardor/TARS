// Transaction Service - Expenses and incomes

import { formatDate, getMonthRange } from '../utils/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export class TransactionService {
  constructor(db, encKey = null) {
    this.db = db;
    this.encKey = encKey || null;
  }

  // Decrypt description in a single row (no-op if no key or not encrypted)
  async _dec(row) {
    if (!row || !this.encKey || !row.description) return row;
    return { ...row, description: await decrypt(row.description, this.encKey) };
  }

  // Decrypt description in an array of rows
  async _decMany(rows) {
    if (!this.encKey) return rows;
    return Promise.all(rows.map(r => this._dec(r)));
  }

  async create(userId, categoryId, type, amount, description = null, familyId = null, transactionDate = null, accountId = null) {
    const date = transactionDate || formatDate();
    const encDesc = await encrypt(description, this.encKey);

    const result = await this.db.prepare(`
      INSERT INTO transactions (user_id, family_id, account_id, category_id, type, amount, description, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(userId, familyId, accountId, categoryId, type, amount, encDesc, date).first();

    return this._dec(result);
  }

  async createExpense(userId, categoryId, amount, description = null, familyId = null, accountId = null) {
    return this.create(userId, categoryId, 'expense', amount, description, familyId, null, accountId);
  }

  async createIncome(userId, categoryId, amount, description = null, familyId = null, accountId = null) {
    return this.create(userId, categoryId, 'income', amount, description, familyId, null, accountId);
  }

  async findById(transactionId) {
    const result = await this.db.prepare(`
      SELECT t.*, c.name as category_name, c.emoji as category_emoji
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).bind(transactionId).first();
    return this._dec(result);
  }

  async delete(transactionId, userId) {
    const result = await this.db.prepare(`
      DELETE FROM transactions WHERE id = ? AND user_id = ? RETURNING *
    `).bind(transactionId, userId).first();
    return result;
  }

  async update(transactionId, userId, updates) {
    const existing = await this.db.prepare(`
      SELECT * FROM transactions WHERE id = ? AND user_id = ?
    `).bind(transactionId, userId).first();

    if (!existing) return null;

    const newAmount = updates.amount !== undefined ? updates.amount : existing.amount;
    const newCategoryId = updates.category_id !== undefined ? updates.category_id : existing.category_id;
    const newType = updates.type !== undefined ? updates.type : existing.type;
    const newDate = updates.transaction_date !== undefined ? updates.transaction_date : existing.transaction_date;

    let newDesc;
    if (updates.description !== undefined) {
      newDesc = await encrypt(updates.description || null, this.encKey);
    } else {
      newDesc = existing.description;
    }

    const result = await this.db.prepare(`
      UPDATE transactions
      SET amount = ?, category_id = ?, description = ?, type = ?, transaction_date = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
      RETURNING *
    `).bind(newAmount, newCategoryId, newDesc, newType, newDate, transactionId, userId).first();

    return this._dec(result);
  }

  async getLastTransaction(userId, familyId = null, accountId = null) {
    let query = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];
    query = this._accountFilter(query, params, userId, familyId, accountId);
    query += ' ORDER BY t.created_at DESC LIMIT 1';
    const result = await this.db.prepare(query).bind(...params).first();
    return this._dec(result);
  }

  // Helper: append the right user/family/account filter clause + params
  // When accountId is set → filter by that specific account.
  // When accountId is null → personal slot: only transactions with no account and no family.
  // (family_shared accounts always have their own accountId, so no special familyId branch needed)
  _accountFilter(query, params, userId, familyId, accountId) {
    if (accountId) {
      query += ' AND t.account_id = ?';
      params.push(accountId);
    } else if (familyId) {
      query += ' AND t.family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND t.user_id = ? AND t.family_id IS NULL AND t.account_id IS NULL';
      params.push(userId);
    }
    return query;
  }

  // Variant without 't.' alias (for queries on bare transactions table)
  _accountFilterBare(query, params, userId, familyId, accountId) {
    if (accountId) {
      query += ' AND account_id = ?';
      params.push(accountId);
    } else if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL AND account_id IS NULL';
      params.push(userId);
    }
    return query;
  }

  // Get transactions for a period
  async getByPeriod(userId, startDate, endDate, familyId = null, type = null, categoryId = null, accountId = null) {
    let query = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, u.display_name as user_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.transaction_date BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];

    query = this._accountFilter(query, params, userId, familyId, accountId);

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (categoryId) {
      query += ' AND t.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    const result = await this.db.prepare(query).bind(...params).all();
    return this._decMany(result.results);
  }

  async getMonthTransactions(userId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId, null, null, accountId);
  }

  async getMonthExpenses(userId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId, 'expense', null, accountId);
  }

  async getMonthIncomes(userId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId, 'income', null, accountId);
  }

  // Get totals
  async getMonthTotal(userId, type, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    query = this._accountFilterBare(query, params, userId, familyId, accountId);

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.total || 0;
  }

  async getCategoryTotal(userId, categoryId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND category_id = ?
    `;
    const params = [start, end, categoryId];

    query = this._accountFilterBare(query, params, userId, familyId, accountId);

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.total || 0;
  }

  // Get stats by category
  async getStatsByCategory(userId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT
        c.id,
        c.name,
        c.emoji,
        t.type,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date BETWEEN ? AND ?
    `;
    const params = [start, end];

    query = this._accountFilter(query, params, userId, familyId, accountId);
    query += ' GROUP BY c.id, t.type ORDER BY total DESC';

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }

  // Get stats by user (for family)
  async getStatsByUser(familyId, date = new Date()) {
    const { start, end } = getMonthRange(date);

    const query = `
      SELECT
        u.id,
        u.display_name,
        t.type,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.family_id = ? AND t.transaction_date BETWEEN ? AND ?
      GROUP BY u.id, t.type
      ORDER BY total DESC
    `;

    const result = await this.db.prepare(query).bind(familyId, start, end).all();
    return result.results;
  }

  // Get previous month date
  getPreviousMonth(date = new Date()) {
    const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return prevDate;
  }

  // Get stats for multiple months (for trends) — single query instead of N*2
  async getMonthlyTrend(userId, months = 6, familyId = null, accountId = null) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const start = formatDate(startDate);
    const end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    let query = `
      SELECT
        strftime('%Y', transaction_date) as year,
        strftime('%m', transaction_date) as month,
        type,
        COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ?
    `;
    const params = [start, end];
    query = this._accountFilterBare(query, params, userId, familyId, accountId);
    query += ' GROUP BY year, month, type ORDER BY year, month';

    const result = await this.db.prepare(query).bind(...params).all();

    // Build map: "YYYY-MM" → {expenses, income}
    const map = {};
    for (const row of (result.results || [])) {
      const key = `${row.year}-${row.month}`;
      if (!map[key]) map[key] = { expenses: 0, income: 0 };
      if (row.type === 'expense') map[key].expenses = row.total;
      else map[key].income = row.total;
    }

    const trends = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const { expenses = 0, income = 0 } = map[key] || {};
      trends.push({ month: d.getMonth(), year: d.getFullYear(), expenses, income, balance: income - expenses });
    }

    return trends;
  }

  // Get transaction count for a month
  async getMonthCount(userId, type, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COUNT(*) as count
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    query = this._accountFilterBare(query, params, userId, familyId, accountId);

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.count || 0;
  }

  // Get average transaction amount
  async getMonthAverage(userId, type, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT AVG(amount) as avg
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    query = this._accountFilterBare(query, params, userId, familyId, accountId);

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.avg || 0;
  }

  // Daily expense totals for last N days with category breakdown (for sparkline tooltip)
  async getDailyTotals(userId, days = 7, familyId = null, accountId = null) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    let query = `
      SELECT t.transaction_date as date, c.name as category_name, c.emoji as category_emoji,
             COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date BETWEEN ? AND ? AND t.type = 'expense'
    `;
    const params = [startStr, endStr];
    query = this._accountFilter(query, params, userId, familyId, accountId);
    query += ' GROUP BY t.transaction_date, c.id ORDER BY t.transaction_date, total DESC';

    const result = await this.db.prepare(query).bind(...params).all();

    const byDate = {};
    for (const row of (result.results || [])) {
      if (!byDate[row.date]) byDate[row.date] = { date: row.date, total: 0, categories: [] };
      byDate[row.date].total += row.total;
      byDate[row.date].categories.push({
        name: row.category_name || 'Другое',
        emoji: row.category_emoji || '📦',
        total: row.total,
      });
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Detect recurring payments from last 95 days (appear 2+ months, consistent amount)
  async getRecurringPayments(userId, familyId = null, accountId = null) {
    let query = `
      SELECT
        COALESCE(c.name, 'Другое') as name,
        COALESCE(c.emoji, '💳') as emoji,
        COALESCE(t.description, '') as description,
        ROUND(AVG(t.amount), 2) as avg_amount,
        CAST(strftime('%d', MAX(t.transaction_date)) AS INTEGER) as last_day,
        COUNT(DISTINCT strftime('%Y-%m', t.transaction_date)) as months_count,
        COUNT(t.id) as tx_count,
        MAX(t.transaction_date) as last_date
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date >= date('now', '-95 days')
        AND t.type = 'expense'
    `;
    const params = [];
    query = this._accountFilter(query, params, userId, familyId, accountId);
    query += `
      GROUP BY t.category_id, COALESCE(t.description, '')
      HAVING months_count >= 2
        AND tx_count BETWEEN 2 AND 15
        AND (CAST(MAX(t.amount) AS REAL) - CAST(MIN(t.amount) AS REAL)) / CAST(AVG(t.amount) AS REAL) < 0.4
      ORDER BY avg_amount DESC
      LIMIT 8
    `;
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  // Per-day expense totals for current month (for smart forecast)
  async getMonthDailyExpenses(userId, date = new Date(), familyId = null, accountId = null) {
    const { start, end } = getMonthRange(date);
    let query = `
      SELECT transaction_date as date, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = 'expense'
    `;
    const params = [start, end];
    query = this._accountFilterBare(query, params, userId, familyId, accountId);
    query += ' GROUP BY transaction_date ORDER BY transaction_date';
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  // Recent transactions
  async getRecent(userId, limit = 10, familyId = null, accountId = null) {
    let query = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, u.display_name as user_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    query = this._accountFilter(query, params, userId, familyId, accountId);

    query += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(limit);

    const result = await this.db.prepare(query).bind(...params).all();
    return this._decMany(result.results);
  }
}
