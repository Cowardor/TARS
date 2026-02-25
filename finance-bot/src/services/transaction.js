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

  async create(userId, categoryId, type, amount, description = null, familyId = null, transactionDate = null) {
    const date = transactionDate || formatDate();
    const encDesc = await encrypt(description, this.encKey);

    const result = await this.db.prepare(`
      INSERT INTO transactions (user_id, family_id, category_id, type, amount, description, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(userId, familyId, categoryId, type, amount, encDesc, date).first();

    return this._dec(result);
  }

  async createExpense(userId, categoryId, amount, description = null, familyId = null) {
    return this.create(userId, categoryId, 'expense', amount, description, familyId);
  }

  async createIncome(userId, categoryId, amount, description = null, familyId = null) {
    return this.create(userId, categoryId, 'income', amount, description, familyId);
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

  async getLastTransaction(userId) {
    const result = await this.db.prepare(`
      SELECT t.*, c.name as category_name, c.emoji as category_emoji
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `).bind(userId).first();
    return this._dec(result);
  }

  // Get transactions for a period
  async getByPeriod(userId, startDate, endDate, familyId = null, type = null, categoryId = null) {
    let query = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, u.display_name as user_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.transaction_date BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];

    if (familyId) {
      query += ' AND t.family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND t.user_id = ? AND t.family_id IS NULL';
      params.push(userId);
    }

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

  async getMonthTransactions(userId, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId);
  }

  async getMonthExpenses(userId, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId, 'expense');
  }

  async getMonthIncomes(userId, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);
    return this.getByPeriod(userId, start, end, familyId, 'income');
  }

  // Get totals
  async getMonthTotal(userId, type, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      params.push(userId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.total || 0;
  }

  async getCategoryTotal(userId, categoryId, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND category_id = ?
    `;
    const params = [start, end, categoryId];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      params.push(userId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.total || 0;
  }

  // Get stats by category
  async getStatsByCategory(userId, date = new Date(), familyId = null) {
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

    if (familyId) {
      query += ' AND t.family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND t.user_id = ? AND t.family_id IS NULL';
      params.push(userId);
    }

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

  // Get stats for multiple months (for trends)
  async getMonthlyTrend(userId, months = 6, familyId = null) {
    const trends = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const expenses = await this.getMonthTotal(userId, 'expense', date, familyId);
      const income = await this.getMonthTotal(userId, 'income', date, familyId);

      trends.unshift({
        month: date.getMonth(),
        year: date.getFullYear(),
        expenses,
        income,
        balance: income - expenses
      });
    }

    return trends;
  }

  // Get transaction count for a month
  async getMonthCount(userId, type, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT COUNT(*) as count
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      params.push(userId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.count || 0;
  }

  // Get average transaction amount
  async getMonthAverage(userId, type, date = new Date(), familyId = null) {
    const { start, end } = getMonthRange(date);

    let query = `
      SELECT AVG(amount) as avg
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = ?
    `;
    const params = [start, end, type];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      params.push(userId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return result?.avg || 0;
  }

  // Recent transactions
  async getRecent(userId, limit = 10, familyId = null) {
    let query = `
      SELECT t.*, c.name as category_name, c.emoji as category_emoji, u.display_name as user_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
    `;
    const params = [];

    if (familyId) {
      query += ' WHERE t.family_id = ?';
      params.push(familyId);
    } else {
      query += ' WHERE t.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(limit);

    const result = await this.db.prepare(query).bind(...params).all();
    return this._decMany(result.results);
  }
}
