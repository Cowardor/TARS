// Salt Edge Open Banking Integration (API v6)
// Free tier: Free Sandbox environment for testing
// Docs: https://docs.saltedge.com/v6/

export class SaltEdgeService {
  constructor(db, env) {
    this.db = db;
    this.appId = env.SALTEDGE_APP_ID;
    this.secret = env.SALTEDGE_SECRET;
    // Salt Edge API v6 (current supported version)
    this.baseUrl = 'https://www.saltedge.com/api/v6';
    // For sandbox testing, use fake providers (country_code=XF)
    this.sandbox = env.SALTEDGE_SANDBOX === 'true';
  }

  // ============================================
  // API REQUEST HELPER
  // ============================================

  async apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'App-id': this.appId,
        'Secret': this.secret,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify({ data: body });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Salt Edge API error (${endpoint}):`, error);
      throw new Error(`Salt Edge API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.data;
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  async createCustomer(identifier) {
    const data = await this.apiRequest('/customers', 'POST', {
      identifier: identifier
    });
    return data;
  }

  async getCustomer(customerId) {
    try {
      const data = await this.apiRequest(`/customers/${customerId}`);
      return data;
    } catch (e) {
      if (e.message.includes('404')) {
        return null;
      }
      throw e;
    }
  }

  async listCustomers(identifier = null) {
    try {
      let endpoint = '/customers';
      if (identifier) {
        endpoint += `?identifier=${encodeURIComponent(identifier)}`;
      }
      const data = await this.apiRequest(endpoint);
      return data || [];
    } catch (e) {
      // 404 means no customers found, not an error
      if (e.message.includes('404')) {
        return [];
      }
      throw e;
    }
  }

  // Helper to get customer ID from response (Salt Edge uses customer_id, not id)
  getCustomerId(customer) {
    return customer?.customer_id || customer?.id;
  }

  async getOrCreateCustomer(userId) {
    const identifier = `finance_bot_user_${userId}`;

    // Check if we have a stored customer ID in DB
    const stored = await this.db.prepare(`
      SELECT saltedge_customer_id FROM users WHERE id = ?
    `).bind(userId).first();

    if (stored?.saltedge_customer_id) {
      try {
        const customer = await this.getCustomer(stored.saltedge_customer_id);
        const customerId = this.getCustomerId(customer);
        if (customer && customerId) {
          console.log('Found existing customer:', customerId);
          return { ...customer, id: customerId };
        }
      } catch (e) {
        console.log('Customer not found in Salt Edge, will search or create');
      }
    }

    // Try to find existing customer by identifier
    try {
      const customers = await this.listCustomers(identifier);
      if (customers && customers.length > 0) {
        const customer = customers[0];
        const customerId = this.getCustomerId(customer);
        console.log('Found customer by identifier:', customerId);

        // Store in DB
        if (customerId) {
          await this.db.prepare(`
            UPDATE users SET saltedge_customer_id = ? WHERE id = ?
          `).bind(String(customerId), userId).run();
        }

        return { ...customer, id: customerId };
      }
    } catch (e) {
      console.log('Could not list customers:', e.message);
    }

    // Create new customer
    try {
      const customer = await this.createCustomer(identifier);
      console.log('Created new customer:', JSON.stringify(customer));

      // Salt Edge returns customer_id, not id
      const customerId = this.getCustomerId(customer);
      if (customerId) {
        await this.db.prepare(`
          UPDATE users SET saltedge_customer_id = ? WHERE id = ?
        `).bind(String(customerId), userId).run();
      }

      return { ...customer, id: customerId };
    } catch (e) {
      // Handle DuplicatedCustomer error
      if (e.message.includes('DuplicatedCustomer') || e.message.includes('409')) {
        console.log('Customer already exists, fetching...');
        const customers = await this.listCustomers(identifier);
        if (customers && customers.length > 0) {
          const customer = customers[0];
          const customerId = this.getCustomerId(customer);
          if (customerId) {
            await this.db.prepare(`
              UPDATE users SET saltedge_customer_id = ? WHERE id = ?
            `).bind(String(customerId), userId).run();
          }
          return { ...customer, id: customerId };
        }
      }
      throw e;
    }
  }

  // ============================================
  // PROVIDERS (Banks)
  // ============================================

  async getProviders(countryCode = 'PL') {
    const data = await this.apiRequest(`/providers?country_code=${countryCode}`);
    return data || [];
  }

  // Get banks for a specific country
  async getBanks(countryCode = null) {
    // Determine country code
    const code = countryCode || (this.sandbox ? 'XF' : 'PL');
    console.log(`Salt Edge: fetching providers for country=${code}, sandbox=${this.sandbox}`);

    const providers = await this.getProviders(code);
    console.log(`Salt Edge: got ${providers.length} providers`);

    if (!providers || providers.length === 0) {
      console.log('Salt Edge: no providers returned');
      return [];
    }

    // In sandbox mode, return all fake providers
    if (this.sandbox && !countryCode) {
      return providers.slice(0, 20).map(p => ({
        ...p,
        id: p.code,
        name: p.name || p.code
      }));
    }

    // For real banks - sort popular first
    const popularPatterns = {
      'PL': ['pko', 'mbank', 'ing', 'santander', 'millennium', 'pekao', 'alior', 'bnp', 'credit agricole', 'getin'],
      'UA': ['приват', 'моно', 'ощад', 'укрсиб', 'privat', 'mono', 'oschad', 'a-bank', 'universal'],
      'DE': ['sparkasse', 'deutsche', 'commerzbank', 'ing', 'n26', 'dkb'],
      'GB': ['hsbc', 'barclays', 'lloyds', 'natwest', 'monzo', 'revolut', 'starling'],
    };

    const patterns = popularPatterns[code] || [];

    if (patterns.length > 0) {
      const popular = providers.filter(bank =>
        patterns.some(pattern =>
          (bank.name || '').toLowerCase().includes(pattern)
        )
      );
      const rest = providers.filter(bank => !popular.includes(bank));
      const sorted = [...popular, ...rest];
      return sorted.slice(0, 30).map(p => ({
        ...p,
        id: p.code,
        name: p.name || p.code
      }));
    }

    return providers.slice(0, 30).map(p => ({
      ...p,
      id: p.code,
      name: p.name || p.code
    }));
  }

  // Backwards compatibility alias
  async getPolishBanks() {
    return this.getBanks();
  }

  // ============================================
  // CONNECTIONS (via Connect Session)
  // ============================================

  async createConnectSession(customerId, providerCode, redirectUrl) {
    // API v6: endpoint changed from /connect_sessions/create to /connections/connect
    // Scopes changed: account_details -> accounts, transactions_details -> transactions
    const data = await this.apiRequest('/connections/connect', 'POST', {
      customer_id: customerId,
      consent: {
        scopes: ['accounts', 'transactions'],
        from_date: this.getDateMonthsAgo(12) // 12 months of history
      },
      attempt: {
        return_to: redirectUrl,
        fetch_scopes: ['accounts', 'transactions']
      },
      provider_code: providerCode,
      daily_refresh: true
    });

    return data;
  }

  async reconnectSession(connectionId, redirectUrl) {
    // API v6: endpoint changed to /connections/{id}/reconnect
    const data = await this.apiRequest(`/connections/${connectionId}/reconnect`, 'POST', {
      consent: {
        scopes: ['accounts', 'transactions']
      },
      attempt: {
        return_to: redirectUrl
      },
      daily_refresh: true
    });
    return data;
  }

  async refreshConnection(connectionId) {
    // API v6: endpoint changed to /connections/{id}/refresh
    const data = await this.apiRequest(`/connections/${connectionId}/refresh`, 'POST', {
      attempt: {
        fetch_scopes: ['accounts', 'transactions']
      }
    });
    return data;
  }

  // ============================================
  // CONNECTIONS
  // ============================================

  async getConnection(connectionId) {
    const data = await this.apiRequest(`/connections/${connectionId}`);
    return data;
  }

  async getConnections(customerId) {
    const data = await this.apiRequest(`/connections?customer_id=${customerId}`);
    return data;
  }

  async deleteConnection(connectionId) {
    await this.apiRequest(`/connections/${connectionId}`, 'DELETE');
  }

  // ============================================
  // ACCOUNTS
  // ============================================

  async getAccounts(connectionId) {
    const data = await this.apiRequest(`/accounts?connection_id=${connectionId}`);
    return data;
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async getTransactions(connectionId, accountId = null, fromDate = null) {
    let endpoint = `/transactions?connection_id=${connectionId}`;

    if (accountId) {
      endpoint += `&account_id=${accountId}`;
    }
    if (fromDate) {
      endpoint += `&from_date=${fromDate}`;
    }

    const data = await this.apiRequest(endpoint);
    return data;
  }

  async getPendingTransactions(connectionId, accountId = null) {
    let endpoint = `/transactions/pending?connection_id=${connectionId}`;

    if (accountId) {
      endpoint += `&account_id=${accountId}`;
    }

    const data = await this.apiRequest(endpoint);
    return data;
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  async saveBankConnection(userId, connectionId, providerCode, providerName, customerId) {
    await this.db.prepare(`
      INSERT INTO bank_connections (
        user_id, requisition_id, institution_id, institution_name,
        status, saltedge_customer_id
      )
      VALUES (?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(user_id, institution_id) DO UPDATE SET
        requisition_id = excluded.requisition_id,
        saltedge_customer_id = excluded.saltedge_customer_id,
        status = 'pending',
        updated_at = datetime('now')
    `).bind(userId, connectionId, providerCode, providerName, customerId).run();
  }

  async updateConnectionStatus(connectionId, status, accountIds = null) {
    await this.db.prepare(`
      UPDATE bank_connections
      SET status = ?, account_ids = ?, updated_at = datetime('now')
      WHERE requisition_id = ?
    `).bind(status, accountIds ? JSON.stringify(accountIds) : null, connectionId).run();
  }

  async getConnectionByRequisition(connectionId) {
    return await this.db.prepare(`
      SELECT * FROM bank_connections WHERE requisition_id = ?
    `).bind(connectionId).first();
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
    `).all();
    return result.results;
  }

  async removeConnection(userId, connectionDbId) {
    const connection = await this.db.prepare(`
      SELECT * FROM bank_connections WHERE id = ? AND user_id = ?
    `).bind(connectionDbId, userId).first();

    if (!connection) {
      return { success: false, error: 'not_found' };
    }

    // Delete from Salt Edge
    try {
      await this.deleteConnection(connection.requisition_id);
    } catch (e) {
      console.error('Failed to delete Salt Edge connection:', e);
    }

    // Delete from DB
    await this.db.prepare(`
      DELETE FROM bank_connections WHERE id = ?
    `).bind(connectionDbId).run();

    return { success: true };
  }

  // ============================================
  // SYNC TRANSACTIONS
  // ============================================

  async syncTransactions(connection, categoryService) {
    const connectionId = connection.requisition_id;
    let totalImported = 0;
    let totalSkipped = 0;
    const importedList = [];
    const duplicates = [];

    try {
      // Get accounts for this connection
      const accounts = await this.getAccounts(connectionId);

      for (const account of accounts) {
        try {
          // Get last sync date or default to 12 months ago
          const lastSync = connection.last_sync_at ||
            this.getDateMonthsAgo(12);

          const transactions = await this.getTransactions(
            connectionId,
            account.id,
            lastSync
          );

          for (const tx of transactions) {
            const result = await this.importSaltEdgeTransaction(
              connection.user_id,
              tx,
              categoryService,
              connection.family_id
            );

            if (result.imported) {
              totalImported++;
              importedList.push({
                date: tx.made_on || '',
                amount: parseFloat(tx.amount || 0),
                description: this.buildTransactionDescription(tx),
                category: result.categoryName || ''
              });
              if (result.potentialDuplicate) {
                duplicates.push({
                  bankTx: { date: tx.made_on, amount: parseFloat(tx.amount || 0), description: this.buildTransactionDescription(tx) },
                  manualTx: result.potentialDuplicate
                });
              }
            } else {
              totalSkipped++;
            }
          }
        } catch (e) {
          console.error(`Failed to sync account ${account.id}:`, e);
        }
      }

      // Update last sync time and store account IDs
      const accountIds = accounts.map(a => a.id);
      await this.db.prepare(`
        UPDATE bank_connections
        SET last_sync_at = datetime('now'),
            account_ids = ?
        WHERE id = ?
      `).bind(JSON.stringify(accountIds), connection.id).run();

    } catch (e) {
      console.error('Failed to sync connection:', e);
      throw e;
    }

    return { imported: totalImported, skipped: totalSkipped, importedList, duplicates };
  }

  async importSaltEdgeTransaction(userId, tx, categoryService, familyId = null) {
    // Generate unique ID from Salt Edge transaction
    const bankTransactionId = `saltedge_${tx.id}`;

    // Check for duplicate
    const exists = await this.db.prepare(`
      SELECT id FROM transactions WHERE bank_transaction_id = ?
    `).bind(bankTransactionId).first();

    if (exists) {
      return { imported: false, reason: 'duplicate' };
    }

    // Parse transaction data
    const amount = parseFloat(tx.amount || 0);
    const type = amount < 0 ? 'expense' : 'income';
    const date = tx.made_on || new Date().toISOString().split('T')[0];

    // Build description
    const description = this.buildTransactionDescription(tx);

    // Auto-categorize
    const category = await this.autoCategorize(description, type, categoryService);

    // Check for potential manual duplicate (same amount ±0.01, same date ±1 day, manual source)
    const absAmount = Math.abs(amount);
    const potentialDuplicate = await this.db.prepare(`
      SELECT id, description, transaction_date, source FROM transactions
      WHERE user_id = ? AND type = ? AND source = 'manual'
        AND ABS(amount - ?) < 0.02
        AND ABS(julianday(transaction_date) - julianday(?)) <= 1
      LIMIT 1
    `).bind(userId, type, absAmount, date).first();

    // Insert transaction
    await this.db.prepare(`
      INSERT INTO transactions (
        user_id, family_id, category_id, type, amount, description,
        transaction_date, source, bank_transaction_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'saltedge', ?)
    `).bind(
      userId,
      familyId,
      category.id,
      type,
      absAmount,
      description,
      date,
      bankTransactionId
    ).run();

    return {
      imported: true,
      categoryName: `${category.emoji} ${category.name}`,
      potentialDuplicate: potentialDuplicate ? {
        id: potentialDuplicate.id,
        description: potentialDuplicate.description,
        date: potentialDuplicate.transaction_date
      } : null
    };
  }

  buildTransactionDescription(tx) {
    const parts = [];

    // Payee/Payer
    if (tx.payee) parts.push(tx.payee);

    // Description
    if (tx.description) parts.push(tx.description);

    // Category from bank
    if (tx.category) parts.push(`[${tx.category}]`);

    // Extra info
    if (tx.extra?.merchant_id) {
      parts.push(tx.extra.merchant_id);
    }

    return parts.join(' - ').substring(0, 200) || 'Bank transaction';
  }

  async autoCategorize(description, type, categoryService) {
    const searchText = description.toLowerCase();

    // Try category service detection
    const detected = await categoryService.detectCategory(searchText, type);
    if (detected) return detected;

    // Fallback to "Другое" category
    const categories = type === 'expense'
      ? await categoryService.getExpenseCategories()
      : await categoryService.getIncomeCategories();

    const fallback = categories.find(c => c.name === 'Другое') || categories[0];

    // Safety: if no categories exist at all, return a minimal object
    if (!fallback) {
      console.error('autoCategorize: no categories found for type', type);
      return { id: 1, name: 'Другое', emoji: '📦' };
    }

    return fallback;
  }

  // ============================================
  // CONNECTION HEALTH CHECK
  // ============================================

  async checkConnectionHealth(connection) {
    try {
      const seConnection = await this.getConnection(connection.requisition_id);

      if (seConnection.status === 'inactive' || seConnection.status === 'disabled') {
        await this.updateConnectionStatus(connection.requisition_id, 'expired');
        return { healthy: false, status: seConnection.status };
      }

      return {
        healthy: true,
        status: seConnection.status,
        lastSuccess: seConnection.last_success_at,
        nextRefresh: seConnection.next_refresh_possible_at
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  getDateMonthsAgo(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  }
}
