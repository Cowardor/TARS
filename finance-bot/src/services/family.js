// Family Service - Family/shared accounts management

export class FamilyService {
  constructor(db) {
    this.db = db;
  }

  // Generate random invite code (6 characters)
  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create a new family
  async create(name, ownerId) {
    const result = await this.db.prepare(`
      INSERT INTO families (name, owner_id)
      VALUES (?, ?)
      RETURNING *
    `).bind(name, ownerId).first();

    // Add owner as member with 'owner' role
    await this.db.prepare(`
      INSERT INTO family_members (family_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).bind(result.id, ownerId).run();

    return result;
  }

  // Find family by ID
  async findById(familyId) {
    const result = await this.db.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first();
    return result;
  }

  // Find family by invite code
  async findByInviteCode(code) {
    const result = await this.db.prepare(`
      SELECT * FROM families
      WHERE invite_code = ? AND invite_expires_at > datetime('now')
    `).bind(code.toUpperCase()).first();
    return result;
  }

  // Get user's families
  async getUserFamilies(userId) {
    const result = await this.db.prepare(`
      SELECT f.*, fm.role
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      WHERE fm.user_id = ?
    `).bind(userId).all();
    return result.results;
  }

  // Generate invite code for family
  async generateInvite(familyId) {
    const code = this.generateInviteCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await this.db.prepare(`
      UPDATE families
      SET invite_code = ?, invite_expires_at = ?
      WHERE id = ?
    `).bind(code, expiresAt, familyId).run();

    return code;
  }

  // Join family by invite code
  async joinByCode(code, userId) {
    const family = await this.findByInviteCode(code);
    if (!family) {
      return { success: false, error: 'Код недействителен или истёк' };
    }

    // Check if already a member
    const existing = await this.db.prepare(`
      SELECT * FROM family_members WHERE family_id = ? AND user_id = ?
    `).bind(family.id, userId).first();

    if (existing) {
      return { success: false, error: 'Ты уже участник этой семьи' };
    }

    // Add as member
    await this.db.prepare(`
      INSERT INTO family_members (family_id, user_id, role)
      VALUES (?, ?, 'member')
    `).bind(family.id, userId).run();

    // Clear invite code (one-time use)
    await this.db.prepare(`
      UPDATE families SET invite_code = NULL, invite_expires_at = NULL WHERE id = ?
    `).bind(family.id).run();

    return { success: true, family };
  }

  // Get family members
  async getMembers(familyId) {
    const result = await this.db.prepare(`
      SELECT u.*, fm.role, fm.joined_at
      FROM users u
      JOIN family_members fm ON u.id = fm.user_id
      WHERE fm.family_id = ?
      ORDER BY fm.role DESC, fm.joined_at ASC
    `).bind(familyId).all();
    return result.results;
  }

  // Leave family
  async leave(familyId, userId) {
    // Check if owner
    const family = await this.findById(familyId);
    if (family.owner_id === userId) {
      return { success: false, error: 'Владелец не может покинуть семью. Сначала удали семью.' };
    }

    // Remove user's shared accounts from this family
    await this.db.prepare(
      'DELETE FROM shared_accounts WHERE family_id = ? AND shared_by_user_id = ?'
    ).bind(familyId, userId).run();

    await this.db.prepare(`
      DELETE FROM family_members WHERE family_id = ? AND user_id = ?
    `).bind(familyId, userId).run();

    return { success: true };
  }

  // Delete family (owner only)
  async delete(familyId, userId) {
    const family = await this.findById(familyId);
    if (!family) {
      return { success: false, error: 'Семья не найдена' };
    }
    if (family.owner_id !== userId) {
      return { success: false, error: 'Только владелец может удалить семью' };
    }

    // Delete shared accounts
    await this.db.prepare('DELETE FROM shared_accounts WHERE family_id = ?').bind(familyId).run();

    // Delete all members
    await this.db.prepare('DELETE FROM family_members WHERE family_id = ?').bind(familyId).run();

    // Delete family
    await this.db.prepare('DELETE FROM families WHERE id = ?').bind(familyId).run();

    return { success: true };
  }

  // Check if user is member of family
  async isMember(familyId, userId) {
    const result = await this.db.prepare(`
      SELECT * FROM family_members WHERE family_id = ? AND user_id = ?
    `).bind(familyId, userId).first();
    return !!result;
  }

  // Get member count
  async getMemberCount(familyId) {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM family_members WHERE family_id = ?
    `).bind(familyId).first();
    return result?.count || 0;
  }

  // Share account with family
  async shareAccount(accountId, familyId, userId, permission = 'readwrite') {
    await this.db.prepare(`
      INSERT INTO shared_accounts (account_id, family_id, shared_by_user_id, permission)
      VALUES (?, ?, ?, ?)
    `).bind(accountId, familyId, userId, permission).run();
  }

  // Unshare account from family
  async unshareAccount(accountId, familyId, userId) {
    await this.db.prepare(
      'DELETE FROM shared_accounts WHERE account_id = ? AND family_id = ? AND shared_by_user_id = ?'
    ).bind(accountId, familyId, userId).run();
  }

  // Get all shared accounts for a family (with account details)
  async getSharedAccounts(familyId) {
    const result = await this.db.prepare(`
      SELECT sa.*, a.name as account_name, a.type as account_type, a.balance,
             a.currency, u.first_name as shared_by_name
      FROM shared_accounts sa
      JOIN accounts a ON sa.account_id = a.id
      JOIN users u ON sa.shared_by_user_id = u.id
      WHERE sa.family_id = ?
      ORDER BY sa.created_at ASC
    `).bind(familyId).all();
    return result.results;
  }

  // Get shared accounts from OTHER users (not mine) in a family
  async getSharedAccountsForUser(familyId, userId) {
    const result = await this.db.prepare(`
      SELECT sa.*, a.name as account_name, a.type as account_type, a.balance,
             a.currency, u.first_name as shared_by_name
      FROM shared_accounts sa
      JOIN accounts a ON sa.account_id = a.id
      JOIN users u ON sa.shared_by_user_id = u.id
      WHERE sa.family_id = ? AND sa.shared_by_user_id != ?
      ORDER BY sa.created_at ASC
    `).bind(familyId, userId).all();
    return result.results;
  }

  // Check if account is shared with family
  async isAccountShared(accountId, familyId) {
    return await this.db.prepare(
      'SELECT * FROM shared_accounts WHERE account_id = ? AND family_id = ?'
    ).bind(accountId, familyId).first();
  }

  // Get IDs of accounts that current user shared with family
  async getMySharedAccountIds(familyId, userId) {
    const result = await this.db.prepare(
      'SELECT account_id FROM shared_accounts WHERE family_id = ? AND shared_by_user_id = ?'
    ).bind(familyId, userId).all();
    return result.results.map(r => r.account_id);
  }
}
