// Nordigen (GoCardless) Open Banking Integration
// Free tier: 50 end-user agreements/month
// Docs: https://developer.gocardless.com/bank-account-data/overview

export class NordigenService {
  constructor(db, env) {
    this.db = db;
    this.secretId = env.NORDIGEN_SECRET_ID;
    this.secretKey = env.NORDIGEN_SECRET_KEY;
    this.baseUrl = 'https://bankaccountdata.gocardless.com/api/v2';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/token/new/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_id: this.secretId,
        secret_key: this.secretKey
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Nordigen auth error:', error);
      throw new Error('Failed to authenticate with Nordigen');
    }

    const data = await response.json();
    this.accessToken = data.access;
    // Token valid for 24 hours, refresh after 23 hours
    this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

    return this.accessToken;
  }

  async apiRequest(endpoint, method = 'GET', body = null) {
    const token = await this.getAccessToken();

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Nordigen API error (${endpoint}):`, error);
      throw new Error(`Nordigen API error: ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // INSTITUTIONS (Banks)
  // ============================================

  async getInstitutions(country = 'PL') {
    const data = await this.apiRequest(`/institutions/?country=${country}`);
    return data;
  }

  // Get popular Polish banks
  async getPolishBanks() {
    const institutions = await this.getInstitutions('PL');

    // Filter to most popular banks
    const popularBankIds = [
      'PKO_BPKOPLPW',      // PKO BP
      'MBANK_RETAIL_BREXPLPW', // mBank
      'ING_INGBPLPW',      // ING
      'SANTANDER_WBKPPLPP', // Santander
      'MILLENNIUM_BIGBPLPW', // Millennium
      'PEKAO_PKOPPLPW',    // Pekao SA
      'ALIOR_ALBPPLPW',    // Alior Bank
    ];

    const popular = institutions.filter(bank =>
      popularBankIds.some(id => bank.id.includes(id.split('_')[0]))
    );

    // Return popular first, then others
    return [
      ...popular,
      ...institutions.filter(bank => !popular.includes(bank))
    ].slice(0, 20); // Limit to 20 banks
  }

  // ============================================
  // END USER AGREEMENT (Consent)
  // ============================================

  async createEndUserAgreement(institutionId, maxHistoricalDays = 90) {
    const data = await this.apiRequest('/agreements/enduser/', 'POST', {
      institution_id: institutionId,
      max_historical_days: maxHistoricalDays,
      access_valid_for_days: 90,
      access_scope: ['balances', 'details', 'transactions']
    });

    return data;
  }

  // ============================================
  // REQUISITION (Bank Connection Link)
  // ============================================

  async createRequisition(institutionId, redirectUrl, userId, agreementId = null) {
    const body = {
      institution_id: institutionId,
      redirect: redirectUrl,
      reference: `user_${userId}_${Date.now()}`,
      user_language: 'PL'
    };

    if (agreementId) {
      body.agreement = agreementId;
    }

    const data = await this.apiRequest('/requisitions/', 'POST', body);
    return data;
  }

  async getRequisition(requisitionId) {
    const data = await this.apiRequest(`/requisitions/${requisitionId}/`);
    return data;
  }

  async deleteRequisition(requisitionId) {
    await this.apiRequest(`/requisitions/${requisitionId}/`, 'DELETE');
  }

  // ============================================
  // ACCOUNTS
  // ============================================

  async getAccountDetails(accountId) {
    const data = await this.apiRequest(`/accounts/${accountId}/details/`);
    return data;
  }

  async getAccountBalances(accountId) {
    const data = await this.apiRequest(`/accounts/${accountId}/balances/`);
    return data;
  }

  async getAccountTransactions(accountId, dateFrom = null, dateTo = null) {
    let endpoint = `/accounts/${accountId}/transactions/`;

    const params = [];
    if (dateFrom) params.push(`date_from=${dateFrom}`);
    if (dateTo) params.push(`date_to=${dateTo}`);

    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    const data = await this.apiRequest(endpoint);
    return data;
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  async saveBankConnection(userId, requisitionId, institutionId, institutionName) {
    await this.db.prepare(`
      INSERT INTO bank_connections (user_id, requisition_id, institution_id, institution_name, status)
      VALUES (?, ?, ?, ?, 'pending')
      ON CONFLICT(user_id, institution_id) DO UPDATE SET
        requisition_id = excluded.requisition_id,
        status = 'pending',
        updated_at = datetime('now')
    `).bind(userId, requisitionId, institutionId, institutionName).run();
  }

  async updateConnectionStatus(requisitionId, status, accountIds = null) {
    await this.db.prepare(`
      UPDATE bank_connections
      SET status = ?, account_ids = ?, updated_at = datetime('now')
      WHERE requisition_id = ?
    `).bind(status, accountIds ? JSON.stringify(accountIds) : null, requisitionId).run();
  }

  async getConnectionByRequisition(requisitionId) {
    return await this.db.prepare(`
      SELECT * FROM bank_connections WHERE requisition_id = ?
    `).bind(requisitionId).first();
  }

  async getUserConnections(userId) {
    const result = await this.db.prepare(`
      SELECT * FROM bank_connections
      WHERE user_id = ? AND status = 'linked'
      ORDER BY created_at DESC
    `).bind(userId).all();
    return result.results;
  }

  async getActiveConnections() {
    const result = await this.db.prepare(`
      SELECT bc.*, u.telegram_id
      FROM bank_connections bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.status = 'linked'
        AND bc.expires_at > datetime('now')
    `).all();
    return result.results;
  }

  async deleteConnection(userId, connectionId) {
    const connection = await this.db.prepare(`
      SELECT * FROM bank_connections WHERE id = ? AND user_id = ?
    `).bind(connectionId, userId).first();

    if (!connection) {
      return { success: false, error: 'not_found' };
    }

    // Delete from Nordigen
    try {
      await this.deleteRequisition(connection.requisition_id);
    } catch (e) {
      console.error('Failed to delete Nordigen requisition:', e);
    }

    // Delete from DB
    await this.db.prepare(`
      DELETE FROM bank_connections WHERE id = ?
    `).bind(connectionId).run();

    return { success: true };
  }

  // ============================================
  // SYNC TRANSACTIONS
  // ============================================

  async syncTransactions(connection, categoryService, transactionService) {
    const accountIds = JSON.parse(connection.account_ids || '[]');
    let totalImported = 0;
    let totalSkipped = 0;

    for (const accountId of accountIds) {
      try {
        // Get last sync date or default to 90 days ago
        const lastSync = connection.last_sync_at ||
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const today = new Date().toISOString().split('T')[0];
        const txData = await this.getAccountTransactions(accountId, lastSync, today);

        const transactions = [
          ...(txData.transactions?.booked || []),
          // Optionally include pending: ...(txData.transactions?.pending || [])
        ];

        for (const tx of transactions) {
          const result = await this.importNordigenTransaction(
            connection.user_id,
            tx,
            categoryService,
            connection.family_id
          );

          if (result.imported) {
            totalImported++;
          } else {
            totalSkipped++;
          }
        }
      } catch (e) {
        console.error(`Failed to sync account ${accountId}:`, e);
      }
    }

    // Update last sync time
    await this.db.prepare(`
      UPDATE bank_connections
      SET last_sync_at = datetime('now')
      WHERE id = ?
    `).bind(connection.id).run();

    return { imported: totalImported, skipped: totalSkipped };
  }

  async importNordigenTransaction(userId, tx, categoryService, familyId = null) {
    // Generate unique ID from Nordigen transaction
    const bankTransactionId = `nordigen_${tx.transactionId || tx.internalTransactionId || this.hashTransaction(tx)}`;

    // Check for duplicate
    const exists = await this.db.prepare(`
      SELECT id FROM transactions WHERE bank_transaction_id = ?
    `).bind(bankTransactionId).first();

    if (exists) {
      return { imported: false, reason: 'duplicate' };
    }

    // Parse transaction data
    const amount = parseFloat(tx.transactionAmount?.amount || 0);
    const type = amount < 0 ? 'expense' : 'income';
    const date = tx.bookingDate || tx.valueDate || new Date().toISOString().split('T')[0];

    // Build description
    const description = this.buildNordigenDescription(tx);

    // Auto-categorize
    const category = await this.autoCategorizeFetch(description, type, categoryService);

    // Insert transaction
    await this.db.prepare(`
      INSERT INTO transactions (
        user_id, family_id, category_id, type, amount, description,
        transaction_date, source, bank_transaction_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'nordigen', ?)
    `).bind(
      userId,
      familyId,
      category.id,
      type,
      Math.abs(amount),
      description,
      date,
      bankTransactionId
    ).run();

    return { imported: true };
  }

  buildNordigenDescription(tx) {
    const parts = [];

    // Creditor/Debtor name
    if (tx.creditorName) parts.push(tx.creditorName);
    if (tx.debtorName) parts.push(tx.debtorName);

    // Remittance info
    if (tx.remittanceInformationUnstructured) {
      parts.push(tx.remittanceInformationUnstructured);
    }
    if (tx.remittanceInformationStructured) {
      parts.push(tx.remittanceInformationStructured);
    }

    // Additional info
    if (tx.additionalInformation) {
      parts.push(tx.additionalInformation);
    }

    return parts.join(' - ').substring(0, 200) || 'Bank transaction';
  }

  async autoCategorizeFetch(description, type, categoryService) {
    // Use the same categorization logic as CSV import
    const searchText = description.toLowerCase();

    // Try category service
    const detected = await categoryService.detectCategory(searchText, type);
    if (detected) return detected;

    // Fallback
    const categories = type === 'expense'
      ? await categoryService.getExpenseCategories()
      : await categoryService.getIncomeCategories();

    return categories.find(c => c.name === 'Другое') || categories[0];
  }

  hashTransaction(tx) {
    const data = `${tx.bookingDate}|${tx.transactionAmount?.amount}|${tx.creditorName || tx.debtorName || ''}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ============================================
  // HELPER: Check Connection Health
  // ============================================

  async checkConnectionHealth(connection) {
    try {
      const requisition = await this.getRequisition(connection.requisition_id);

      if (requisition.status === 'EXPIRED' || requisition.status === 'REJECTED') {
        await this.updateConnectionStatus(connection.requisition_id, 'expired');
        return { healthy: false, status: requisition.status };
      }

      return { healthy: true, status: requisition.status };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }
}
