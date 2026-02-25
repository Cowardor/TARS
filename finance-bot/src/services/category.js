// Category Service - Category management and auto-detection

export class CategoryService {
  constructor(db) {
    this.db = db;
  }

  async getSystemCategories(type = null) {
    let query = 'SELECT * FROM categories WHERE owner_type = "system"';
    if (type) {
      query += ' AND type = ?';
      const result = await this.db.prepare(query).bind(type).all();
      return result.results;
    }
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  async getExpenseCategories() {
    return this.getSystemCategories('expense');
  }

  async getIncomeCategories() {
    return this.getSystemCategories('income');
  }

  // Get all categories visible to a user (system + user's custom + family + account-specific)
  async getUserCategories(userId, type = null, familyId = null, accountId = null) {
    // If accountId is set, check if account has its own template categories
    if (accountId) {
      const ownCheck = await this.db.prepare(
        'SELECT COUNT(*) as cnt FROM categories WHERE account_id = ? AND is_active = 1'
      ).bind(accountId).first();

      if (ownCheck?.cnt > 0) {
        // Account has own categories — show ONLY those (template mode)
        let query = `SELECT * FROM categories WHERE is_active = 1 AND account_id = ?`;
        const params = [accountId];
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' ORDER BY sort_order, id';
        const result = await this.db.prepare(query).bind(...params).all();
        return result.results;
      }
    }

    // Default: system + user personal + family + account-specific (if any)
    let query = `
      SELECT * FROM categories
      WHERE is_active = 1 AND (
        owner_type = 'system'
        OR (owner_type = 'user' AND owner_id = ? AND (account_id IS NULL ${accountId ? 'OR account_id = ?' : ''}))
        ${familyId ? "OR (owner_type = 'family' AND owner_id = ?)" : ''}
      )
    `;
    const params = [userId];
    if (accountId) params.push(accountId);
    if (familyId) params.push(familyId);

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY sort_order, id';
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }

  async findById(categoryId) {
    const result = await this.db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(categoryId).first();
    return result;
  }

  async findByName(name, type = 'expense') {
    const result = await this.db.prepare(`
      SELECT * FROM categories
      WHERE owner_type = 'system' AND type = ? AND name = ?
    `).bind(type, name).first();
    return result;
  }

  // Auto-detect category from text (includes user's custom categories)
  async detectCategory(text, type = 'expense', userId = null) {
    const categories = userId
      ? await this.getUserCategories(userId, type)
      : await this.getSystemCategories(type);
    const textLower = text.toLowerCase();

    for (const category of categories) {
      if (!category.keywords) continue;

      try {
        const keywords = JSON.parse(category.keywords);
        for (const keyword of keywords) {
          if (textLower.includes(keyword.toLowerCase())) {
            return category;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  // Get formatted category name with emoji
  formatCategory(category) {
    return `${category.emoji} ${category.name}`;
  }

  // Build dynamic inline keyboard for category selection
  async buildCategoryKeyboard(amount, description = '', type = 'expense', userId = null) {
    const categories = userId
      ? await this.getUserCategories(userId, type)
      : await this.getSystemCategories(type);

    const rows = [];
    let currentRow = [];

    for (const cat of categories) {
      const btnText = `${cat.emoji} ${cat.name}`;
      const callbackData = `cat:${amount}:${cat.id}:${description}`;

      // Telegram callback_data limit is 64 bytes
      if (callbackData.length > 64) continue;

      currentRow.push({ text: btnText, callback_data: callbackData });

      if (currentRow.length === 2) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return { inline_keyboard: rows };
  }

  // ============================================
  // CUSTOM CATEGORY MANAGEMENT
  // ============================================

  async addCustomCategory(userId, name, emoji, type = 'expense', keywords = [], familyId = null, accountId = null) {
    const ownerType = familyId ? 'family' : 'user';
    const ownerId = familyId || userId;

    // Check if name already exists for this user/family (system or custom)
    const existing = await this.db.prepare(`
      SELECT id FROM categories
      WHERE name = ? AND type = ? AND (
        owner_type = 'system'
        OR (owner_type = 'user' AND owner_id = ?)
        OR (owner_type = 'family' AND owner_id = ?)
      )
    `).bind(name, type, userId, familyId || 0).first();

    if (existing) {
      return { success: false, error: 'exists' };
    }

    // Get max sort_order for positioning before "Другое" (sort_order=99)
    const maxOrder = await this.db.prepare(`
      SELECT MAX(sort_order) as max_order FROM categories
      WHERE type = ? AND sort_order < 99
    `).bind(type).first();

    const sortOrder = (maxOrder?.max_order || 10) + 1;

    const result = await this.db.prepare(`
      INSERT INTO categories (owner_type, owner_id, name, emoji, type, keywords, sort_order, account_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(ownerType, ownerId, name, emoji, type, JSON.stringify(keywords), sortOrder, accountId || null).first();

    return { success: true, category: result };
  }

  async deleteCategory(userId, categoryId, familyId = null) {
    // Allow deleting system or user categories
    const category = await this.db.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryId).first();

    if (!category) {
      return { success: false, error: 'not_found' };
    }

    // Don't delete the fallback "Другое" category
    if (category.name === 'Другое') {
      return { success: false, error: 'Категорию "Другое" нельзя удалить — она используется как резервная' };
    }

    // If it's a custom category owned by another user, block
    if (category.owner_type === 'user' && category.owner_id !== userId) {
      return { success: false, error: 'not_found' };
    }

    // If it's a family category, only members of that family can delete it
    if (category.owner_type === 'family' && category.owner_id !== familyId) {
      return { success: false, error: 'not_found' };
    }

    // Check if category has transactions
    const txCount = await this.db.prepare(`
      SELECT COUNT(*) as count FROM transactions WHERE category_id = ?
    `).bind(categoryId).first();

    if (txCount?.count > 0) {
      // Move transactions to "Другое" instead of deleting
      const fallback = await this.db.prepare(`
        SELECT id FROM categories
        WHERE name = 'Другое' AND type = ? AND (owner_type = 'system' OR (owner_type = 'user' AND owner_id = ?))
        ORDER BY owner_type ASC LIMIT 1
      `).bind(category.type, userId).first();

      if (fallback) {
        await this.db.prepare(`
          UPDATE transactions SET category_id = ? WHERE category_id = ?
        `).bind(fallback.id, categoryId).run();
      }
    }

    await this.db.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
    return { success: true, movedTransactions: txCount?.count || 0 };
  }

  // Alias for backwards compatibility
  async deleteCustomCategory(userId, categoryId) {
    return this.deleteCategory(userId, categoryId);
  }

  // Get all editable categories for user (system + custom + family + account)
  async getEditableCategories(userId, type = null, familyId = null, accountId = null) {
    // Template mode: if a specific account is selected AND it has own categories → show ONLY those
    if (accountId) {
      const ownCheck = await this.db.prepare(
        'SELECT COUNT(*) as cnt FROM categories WHERE account_id = ? AND is_active = 1'
      ).bind(accountId).first();

      if (ownCheck?.cnt > 0) {
        let query = `
          SELECT c.*, (SELECT COUNT(*) FROM transactions WHERE category_id = c.id) as tx_count
          FROM categories c
          WHERE c.is_active = 1 AND c.account_id = ?
        `;
        const params = [accountId];
        if (type) { query += ' AND c.type = ?'; params.push(type); }
        query += ' ORDER BY c.type, c.sort_order, c.id';
        const result = await this.db.prepare(query).bind(...params).all();
        return result.results;
      }

      // Personal account (no own cats): show system + user shared (no account_id)
      let query = `
        SELECT c.*, (SELECT COUNT(*) FROM transactions WHERE category_id = c.id) as tx_count
        FROM categories c
        WHERE c.is_active = 1 AND (
          c.owner_type = 'system'
          OR (c.owner_type = 'user' AND c.owner_id = ? AND c.account_id IS NULL)
        )
      `;
      const params = [userId];
      if (type) { query += ' AND c.type = ?'; params.push(type); }
      query += ' ORDER BY c.type, c.sort_order, c.id';
      const result = await this.db.prepare(query).bind(...params).all();
      return result.results;
    }

    // No account filter ("Все"): show ALL categories — system + all user (any account_id) + family
    let query = `
      SELECT c.*, (SELECT COUNT(*) FROM transactions WHERE category_id = c.id) as tx_count
      FROM categories c
      WHERE c.is_active = 1 AND (
        c.owner_type = 'system'
        OR (c.owner_type = 'user' AND c.owner_id = ?)
        ${familyId ? "OR (c.owner_type = 'family' AND c.owner_id = ?)" : ''}
      )
    `;
    const params = [userId];
    if (familyId) params.push(familyId);
    if (type) { query += ' AND c.type = ?'; params.push(type); }
    query += ' ORDER BY c.type, c.sort_order, c.id';
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }

  async getCustomCategories(userId) {
    // Now returns ALL categories (system + custom) for editing
    return this.getEditableCategories(userId);
  }

  async renameCategory(categoryId, userId, newName, familyId = null) {
    const category = await this.db.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryId).first();

    if (!category) {
      return { success: false, error: 'Категория не найдена' };
    }

    // If it's a custom category owned by another user, block
    if (category.owner_type === 'user' && category.owner_id !== userId) {
      return { success: false, error: 'Категория не найдена' };
    }

    // If it's a family category, only members of that family can rename it
    if (category.owner_type === 'family' && category.owner_id !== familyId) {
      return { success: false, error: 'Категория не найдена' };
    }

    // Check if new name already exists
    const existing = await this.db.prepare(`
      SELECT id FROM categories
      WHERE name = ? AND type = ? AND id != ? AND (
        owner_type = 'system'
        OR (owner_type = 'user' AND owner_id = ?)
      )
    `).bind(newName, category.type, categoryId, userId).first();

    if (existing) {
      return { success: false, error: `Категория "${newName}" уже существует` };
    }

    await this.db.prepare(`
      UPDATE categories SET name = ? WHERE id = ?
    `).bind(newName, categoryId).run();

    return { success: true, emoji: category.emoji };
  }

  async addKeywordsToCategory(categoryId, userId, newKeywords) {
    // Allow editing own custom categories or system categories keywords
    const category = await this.db.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryId).first();

    if (!category) {
      return { success: false, error: 'not_found' };
    }

    // Only allow editing custom categories owned by user
    if (category.owner_type === 'user' && category.owner_id !== userId) {
      return { success: false, error: 'not_owner' };
    }

    const existing = category.keywords ? JSON.parse(category.keywords) : [];
    const merged = [...new Set([...existing, ...newKeywords])];

    await this.db.prepare(`
      UPDATE categories SET keywords = ? WHERE id = ?
    `).bind(JSON.stringify(merged), categoryId).run();

    return { success: true, keywords: merged };
  }

  // Get all categories for user (system + custom)
  async getAllCategories(userId = null, familyId = null, type = null) {
    if (userId) {
      return this.getUserCategories(userId, type);
    }

    let query = `
      SELECT * FROM categories
      WHERE owner_type = 'system'
    `;
    const params = [];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ' ORDER BY sort_order';

    const result = params.length > 0
      ? await this.db.prepare(query).bind(...params).all()
      : await this.db.prepare(query).all();
    return result.results;
  }
}
