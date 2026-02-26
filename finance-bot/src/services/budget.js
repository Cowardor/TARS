// Budget Service - Monthly budget limits per category

import { getMonthRange } from '../utils/db.js';

function buildStatus(budget, spent) {
  const remaining = budget.amount - spent;
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  return {
    category_id:    budget.category_id,
    category_name:  budget.category_name,
    category_emoji: budget.category_emoji,
    budget:         budget.amount,
    spent,
    remaining,
    percentUsed,
    isOver:    remaining < 0,
    isWarning: percentUsed >= 80 && percentUsed < 100,
  };
}

export class BudgetService {
  constructor(db, transactionService) {
    this.db = db;
    this.transactionService = transactionService;
  }

  // Set budget for a category
  async setBudget(userId, categoryId, amount, familyId = null) {
    // Use UPSERT (INSERT OR REPLACE)
    const query = `
      INSERT INTO budgets (user_id, family_id, category_id, amount)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, family_id, category_id)
      DO UPDATE SET amount = ?, updated_at = datetime('now')
      RETURNING *
    `;

    const result = await this.db.prepare(query)
      .bind(familyId ? null : userId, familyId, categoryId, amount, amount)
      .first();

    return result;
  }

  // Get budget for a category
  async getBudget(userId, categoryId, familyId = null) {
    let query = `
      SELECT b.*, c.name as category_name, c.emoji as category_emoji
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.category_id = ?
    `;

    if (familyId) {
      query += ' AND b.family_id = ?';
      return this.db.prepare(query).bind(categoryId, familyId).first();
    } else {
      query += ' AND b.user_id = ? AND b.family_id IS NULL';
      return this.db.prepare(query).bind(categoryId, userId).first();
    }
  }

  // Get all budgets for user/family
  async getAllBudgets(userId, familyId = null) {
    let query = `
      SELECT b.*, c.name as category_name, c.emoji as category_emoji
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
    `;

    if (familyId) {
      query += ' WHERE b.family_id = ?';
      const result = await this.db.prepare(query).bind(familyId).all();
      return result.results || [];
    } else {
      query += ' WHERE b.user_id = ? AND b.family_id IS NULL';
      const result = await this.db.prepare(query).bind(userId).all();
      return result.results || [];
    }
  }

  // Delete budget
  async deleteBudget(userId, categoryId, familyId = null) {
    let query = 'DELETE FROM budgets WHERE category_id = ?';

    if (familyId) {
      query += ' AND family_id = ?';
      await this.db.prepare(query).bind(categoryId, familyId).run();
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      await this.db.prepare(query).bind(categoryId, userId).run();
    }
  }

  // Get budget status for a category (current spending vs budget)
  async getBudgetStatus(userId, categoryId, familyId = null, date = new Date()) {
    const budget = await this.getBudget(userId, categoryId, familyId);
    if (!budget) return null;
    const spent = await this.transactionService.getCategoryTotal(userId, categoryId, date, familyId);
    return { budget: budget.amount, ...buildStatus(budget, spent), category_name: budget.category_name, category_emoji: budget.category_emoji };
  }

  // Get all budget statuses — single aggregated query instead of N+1
  async getAllBudgetStatuses(userId, familyId = null, date = new Date()) {
    const budgets = await this.getAllBudgets(userId, familyId);
    if (budgets.length === 0) return [];

    const { start, end } = getMonthRange(date);
    const ids = budgets.map(b => b.category_id);
    const placeholders = ids.map(() => '?').join(',');

    // One query to get spent totals for all budget categories at once
    let spentQuery = `
      SELECT category_id, COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ? AND type = 'expense'
        AND category_id IN (${placeholders})
    `;
    const params = [start, end, ...ids];

    if (familyId) {
      spentQuery += ' AND family_id = ?';
      params.push(familyId);
    } else {
      spentQuery += ' AND user_id = ? AND family_id IS NULL AND account_id IS NULL';
      params.push(userId);
    }
    spentQuery += ' GROUP BY category_id';

    const spentResult = await this.db.prepare(spentQuery).bind(...params).all();
    const spentMap = {};
    for (const row of (spentResult.results || [])) {
      spentMap[row.category_id] = row.spent;
    }

    return budgets.map(b => buildStatus(b, spentMap[b.category_id] || 0));
  }

  // Check if expense would trigger a warning (used after adding expense)
  async checkBudgetWarning(userId, categoryId, familyId = null) {
    const status = await this.getBudgetStatus(userId, categoryId, familyId);
    if (!status) return null;

    if (status.isOver) {
      return {
        type: 'over',
        message: `exceeded`,
        ...status
      };
    } else if (status.isWarning) {
      return {
        type: 'warning',
        message: `warning`,
        ...status
      };
    }

    return null;
  }
}
