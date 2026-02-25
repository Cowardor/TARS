// Bank Import Service - CSV parsing and transaction import
// Supports: PKO BP, mBank, ING (Poland)

import { formatDate } from '../utils/db.js';

export class BankImportService {
  constructor(db, categoryService, transactionService) {
    this.db = db;
    this.categoryService = categoryService;
    this.transactionService = transactionService;
  }

  // ============================================
  // MAIN IMPORT FUNCTION
  // ============================================

  async importCSV(content, userId, bankName, familyId = null, fileName = null) {
    // Parse CSV based on bank
    const transactions = this.parseCSV(content, bankName);

    if (transactions.length === 0) {
      return { success: false, error: 'no_transactions', imported: 0, skipped: 0 };
    }

    // Import with deduplication
    const result = await this.importTransactions(userId, transactions, familyId);

    // Save import record
    const fileHash = this.generateHash(content);
    await this.saveImportRecord({
      userId,
      familyId,
      bankName,
      fileName,
      fileHash,
      totalRows: transactions.length,
      importedCount: result.imported,
      skippedCount: result.skipped,
      dateFrom: result.dateFrom,
      dateTo: result.dateTo
    });

    return {
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      total: transactions.length,
      dateFrom: result.dateFrom,
      dateTo: result.dateTo,
      categories: result.categories,
      importedList: result.importedList,
      duplicates: result.duplicates
    };
  }

  // ============================================
  // CSV PARSING
  // ============================================

  parseCSV(content, bankName) {
    const bankLower = bankName.toLowerCase();

    if (bankLower.includes('pko') || bankLower === 'pkobp') {
      return this.parsePKOBP(content);
    }

    if (bankLower.includes('mbank')) {
      return this.parseMBank(content);
    }

    if (bankLower.includes('ing')) {
      return this.parseING(content);
    }

    // Default: try PKO BP format
    return this.parsePKOBP(content);
  }

  // PKO BP CSV Parser
  // Actual format (comma-delimited, quoted):
  // "Data operacji","Data waluty","Typ transakcji","Kwota","Waluta","Saldo po transakcji","Opis transakcji",...
  // "2026-02-02","2026-02-02","Przelew","-5.00","PLN","+2540.85","Rachunek odbiorcy: ...","Nazwa odbiorcy: ...","Tytuł: ...",...
  parsePKOBP(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const transactions = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // PKO BP uses comma as delimiter with quoted values
      const columns = this.parseCSVLine(line, ',');

      // Need at least: date, date2, type, amount, currency, balance, description
      if (columns.length < 7) continue;

      const dateStr = columns[0];      // Data operacji
      const transactionType = columns[2]; // Typ transakcji
      const amountStr = columns[3];    // Kwota (with +/- sign)

      // Build description from columns 6+ (Opis transakcji, Nazwa odbiorcy, Tytuł, etc.)
      const descriptionParts = columns.slice(6).filter(part => part && part.trim());

      // Extract counterparty from "Nazwa odbiorcy: ..." or "Nazwa nadawcy: ..."
      let counterparty = '';
      let title = transactionType;
      let merchant = ''; // Merchant from Lokalizacja (for card payments)

      for (const part of descriptionParts) {
        if (part.startsWith('Nazwa odbiorcy:') || part.startsWith('Nazwa nadawcy:')) {
          counterparty = part.replace(/^Nazwa (odbiorcy|nadawcy):\s*/, '').trim();
        }
        // Handle encoding issues: "Tytuł:" becomes "Tytu�:" in Windows-1250 → UTF-8
        else if (part.startsWith('Tytu') && part.includes(':')) {
          const colonIndex = part.indexOf(':');
          title = part.substring(colonIndex + 1).trim();
        }
        // Extract merchant from Lokalizacja for card payments
        else if (part.startsWith('Lokalizacja:')) {
          const adresMatch = part.match(/Adres:\s*(.+?)\s+Miasto:/i);
          if (adresMatch) {
            merchant = adresMatch[1].trim();
          }
        }
      }

      // Use merchant as counterparty for card payments if no counterparty found
      if (!counterparty && merchant) {
        counterparty = merchant;
      }

      // Parse date (format: YYYY-MM-DD)
      const date = this.parseDate(dateStr);
      if (!date) continue;

      // Parse amount (format: -5.00 or +100.00)
      const amount = this.parseAmount(amountStr);
      if (isNaN(amount)) continue;

      // Build description from meaningful parts
      const description = this.buildPKODescription(descriptionParts, transactionType, counterparty);

      transactions.push({
        date,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        description,
        counterparty,
        originalTitle: title,
        bankTransactionId: this.generateTransactionId(date, amount, title + counterparty)
      });
    }

    return transactions;
  }

  // Build readable description from PKO BP description parts
  buildPKODescription(parts, transactionType, counterparty) {
    const meaningful = [];

    // Add counterparty first if available
    if (counterparty) {
      meaningful.push(counterparty);
    }

    // Add transaction type
    if (transactionType && transactionType !== counterparty) {
      meaningful.push(transactionType);
    }

    // Add title if found
    for (const part of parts) {
      if (part.startsWith('Tytuł:')) {
        const title = part.replace(/^Tytuł:\s*/, '').trim();
        if (title && title !== counterparty) {
          meaningful.push(title);
        }
        break;
      }
    }

    return meaningful.join(' - ').substring(0, 200) || 'Operacja PKO BP';
  }

  // mBank CSV Parser
  // Format: Data operacji;Data księgowania;Opis operacji;Tytuł;Nadawca/Odbiorca;Nr rachunku;Kwota;Saldo po operacji
  parseMBank(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = this.parseCSVLine(lines[i], ';');

      if (columns.length < 7) continue;

      const [dateStr, , , title, counterparty, , amountStr] = columns;

      const date = this.parseDate(dateStr);
      if (!date) continue;

      const amount = this.parseAmount(amountStr);
      if (isNaN(amount)) continue;

      const description = this.buildDescription(title, counterparty);

      transactions.push({
        date,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        description,
        counterparty,
        originalTitle: title,
        bankTransactionId: this.generateTransactionId(date, amount, title)
      });
    }

    return transactions;
  }

  // ING CSV Parser
  // Format: Data;Nadawca/Odbiorca;Opis;Nr rachunku;Kwota;Waluta
  parseING(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = this.parseCSVLine(lines[i], ';');

      if (columns.length < 5) continue;

      const [dateStr, counterparty, title, , amountStr] = columns;

      const date = this.parseDate(dateStr);
      if (!date) continue;

      const amount = this.parseAmount(amountStr);
      if (isNaN(amount)) continue;

      const description = this.buildDescription(title, counterparty);

      transactions.push({
        date,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        description,
        counterparty,
        originalTitle: title,
        bankTransactionId: this.generateTransactionId(date, amount, title)
      });
    }

    return transactions;
  }

  // ============================================
  // IMPORT WITH DEDUPLICATION
  // ============================================

  async importTransactions(userId, transactions, familyId = null) {
    let imported = 0;
    let skipped = 0;
    let dateFrom = null;
    let dateTo = null;
    const categories = {};
    const importedList = [];
    const duplicates = [];

    for (const tx of transactions) {
      // Check for duplicate (same bank transaction ID)
      const exists = await this.checkDuplicate(userId, tx.bankTransactionId, familyId);
      if (exists) {
        skipped++;
        continue;
      }

      // Check for potential manual duplicate (same amount + date ±1 day)
      const potentialDup = await this.checkManualDuplicate(userId, tx.amount, tx.date, tx.type, familyId);

      // Auto-categorize
      const category = await this.autoCategorizeBankTransaction(tx);

      // Create transaction
      await this.createBankTransaction(userId, tx, category, familyId);

      imported++;

      // Track imported transaction details
      importedList.push({
        date: tx.date,
        amount: tx.type === 'expense' ? -tx.amount : tx.amount,
        description: tx.description,
        category: `${category.emoji} ${category.name}`
      });

      if (potentialDup) {
        duplicates.push({
          bankTx: { date: tx.date, amount: tx.amount, description: tx.description },
          manualTx: { id: potentialDup.id, description: potentialDup.description, date: potentialDup.transaction_date }
        });
      }

      // Track categories
      const catKey = `${category.emoji} ${category.name}`;
      categories[catKey] = (categories[catKey] || 0) + tx.amount;

      // Track date range
      if (!dateFrom || tx.date < dateFrom) dateFrom = tx.date;
      if (!dateTo || tx.date > dateTo) dateTo = tx.date;
    }

    return {
      imported,
      skipped,
      dateFrom,
      dateTo,
      categories,
      importedList,
      duplicates
    };
  }

  // Check for potential manual duplicate: same amount (±0.01) and date (±1 day)
  async checkManualDuplicate(userId, amount, date, type, familyId = null) {
    let query = `
      SELECT id, description, transaction_date, source FROM transactions
      WHERE user_id = ? AND type = ? AND source = 'manual'
        AND ABS(amount - ?) < 0.02
        AND ABS(julianday(transaction_date) - julianday(?)) <= 1
    `;
    const params = [userId, type, amount, date];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND family_id IS NULL';
    }

    query += ' LIMIT 1';
    return await this.db.prepare(query).bind(...params).first();
  }

  async checkDuplicate(userId, bankTransactionId, familyId = null) {
    let query = `
      SELECT id FROM transactions
      WHERE bank_transaction_id = ?
    `;
    const params = [bankTransactionId];

    if (familyId) {
      query += ' AND family_id = ?';
      params.push(familyId);
    } else {
      query += ' AND user_id = ? AND family_id IS NULL';
      params.push(userId);
    }

    const result = await this.db.prepare(query).bind(...params).first();
    return !!result;
  }

  async createBankTransaction(userId, tx, category, familyId = null) {
    const result = await this.db.prepare(`
      INSERT INTO transactions (
        user_id, family_id, category_id, type, amount, description,
        transaction_date, source, bank_transaction_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'bank_import', ?)
      RETURNING *
    `).bind(
      userId,
      familyId,
      category.id,
      tx.type,
      tx.amount,
      tx.description,
      tx.date,
      tx.bankTransactionId
    ).first();

    return result;
  }

  // ============================================
  // AUTO-CATEGORIZATION
  // ============================================

  async autoCategorizeBankTransaction(tx) {
    // Normalize and combine all text for matching
    const rawText = `${tx.description} ${tx.counterparty || ''} ${tx.originalTitle || ''}`;
    const searchText = this.normalizePolish(rawText.toLowerCase());

    // Try PKO-specific rules first
    const pkoCategory = await this.detectPKOCategory(tx, searchText);
    if (pkoCategory) {
      return pkoCategory;
    }

    // Try category service with normalized text
    const detected = await this.categoryService.detectCategory(searchText, tx.type);
    if (detected) {
      return detected;
    }

    // Try without normalization (for Cyrillic keywords)
    const detectedRaw = await this.categoryService.detectCategory(rawText.toLowerCase(), tx.type);
    if (detectedRaw) {
      return detectedRaw;
    }

    // Fallback to "Другое" category
    const categories = tx.type === 'expense'
      ? await this.categoryService.getExpenseCategories()
      : await this.categoryService.getIncomeCategories();

    return categories.find(c => c.name === 'Другое') || categories[0];
  }

  // Normalize Polish text - remove diacritics
  normalizePolish(text) {
    const polishMap = {
      'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
      'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
      'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, char => polishMap[char] || char);
  }

  // PKO BP specific categorization rules
  async detectPKOCategory(tx, normalizedText) {
    const categories = await this.categoryService.getSystemCategories(tx.type);

    // Map of patterns to category names
    const expensePatterns = [
      // Продукты (Groceries)
      { pattern: /biedronka|lidl|auchan|zabka|carrefour|kaufland|netto|dino|freshmarket|stokrotka|lewiatan|aldi|polomarket|dealz|pepco|spolem|groszek|abc\s|delikatesy|sklep spozywczy/i, category: 'Продукты' },

      // Заведения (Restaurants/Cafes)
      { pattern: /mcdonalds|mcdonald|burger king|kfc|starbucks|costa coffee|pizzahut|pizza hut|dominos|wolt|glovo|pyszne|uber eats|restauracja|kawiarnia|pub|bistro|sushi|kebab|bar\s|gastro|food|obiad|lunch/i, category: 'Заведения' },

      // Транспорт (Transport)
      { pattern: /uber|bolt|freenow|itaxi|mytaxi|pkp|intercity|mpk|ztm|flixbus|polskibus|orlen|bp\s|shell|circle k|lotos|moya|paliwo|benzyna|parking|taxi|kolej|bilet|pociag|tramwaj|autobus/i, category: 'Транспорт' },

      // Квартира (Housing)
      { pattern: /czynsz|tauron|pge|enea|innogy|pgnig|veolia|wodociagi|administracja|wspolnota|wynajem|najem|mieszkanie|energia|gaz|woda|prąd|prad|oplata|media/i, category: 'Квартира' },

      // Регулярные (Subscriptions)
      { pattern: /spotify|netflix|orange|play\s|plus\s|t-mobile|upc|vectra|inea|canal|hbo|disney|apple|google play|youtube|amazon prime|playstation|xbox|abonament|telefon|internet/i, category: 'Регулярные' },

      // Шоппинг (Shopping)
      { pattern: /zara|h&m|hm\s|reserved|cropp|sinsay|mohito|house\s|rtv euro|media expert|media markt|komputronik|x-kom|morele|allegro|amazon|zalando|ccc|deichmann|half price|tk maxx|empik|smyk|rossmann|hebe|decathlon|action|tedi/i, category: 'Шоппинг' },

      // Красота (Beauty/Health)
      { pattern: /apteka|drogeria|douglas|sephora|notino|fryzjer|barber|spa\s|kosmetyka|medycyna|przychodnia|dentysta|okulista|lekarz|wizyta|zdrowie|gemini|doz|super-pharm/i, category: 'Красота' },

      // Спорт (Sports)
      { pattern: /decathlon|intersport|go sport|4f\s|cityfit|zdrofit|fitness|multisport|medicover sport|silownia|basen|gym|sport/i, category: 'Спорт' },

      // Путешествия (Travel)
      { pattern: /booking|airbnb|trivago|lot\s|ryanair|wizzair|easyjet|itaka|rainbow|tui|wakacje|hotel|hostel|nocleg|samolot|lotnisko|airport|biuro podrozy/i, category: 'Путешествия' },

      // Дом (Home)
      { pattern: /ikea|leroy merlin|castorama|obi\s|bricomarche|jysk|agata meble|black red white|abra|home&you|meble|remont|narzedzia/i, category: 'Дом' },

      // ATM withdrawals & trading → Другое
      { pattern: /wyplata|bankomat|atm|gotowka|binance|revolut|etoro|xtb|degiro|trading|crypto|bitcoin|giełda|gielda|inwestycje/i, category: 'Другое' }
    ];

    const incomePatterns = [
      { pattern: /wynagrodzenie|pensja|salary|zp\s|premia|bonus/i, category: 'Зарплата' },
      { pattern: /umowa zlecenie|umowa o dzielo|faktura|freelance/i, category: 'Фриланс' },
      { pattern: /odsetki|dywidenda|zysk|procent/i, category: 'Инвестиции' },
      { pattern: /zwrot|refund|cashback|return/i, category: 'Возврат' },
      { pattern: /prezent|gift|darowizna/i, category: 'Подарок' }
    ];

    const patterns = tx.type === 'expense' ? expensePatterns : incomePatterns;

    for (const { pattern, category } of patterns) {
      if (pattern.test(normalizedText)) {
        const found = categories.find(c => c.name === category);
        if (found) return found;
      }
    }

    return null;
  }

  // ============================================
  // HELPERS
  // ============================================

  parseCSVLine(line, separator = ';') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;

    // Clean up
    dateStr = dateStr.trim().replace(/"/g, '');

    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try DD.MM.YYYY
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    // Try DD-MM-YYYY
    const match2 = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match2) {
      return `${match2[3]}-${match2[2]}-${match2[1]}`;
    }

    return null;
  }

  parseAmount(amountStr) {
    if (!amountStr) return NaN;

    // Clean up: remove quotes, spaces, currency symbols
    amountStr = amountStr.trim()
      .replace(/"/g, '')
      .replace(/\s+/g, '')
      .replace(/PLN|zł|ZŁ/gi, '')
      .trim();

    // Replace comma with dot
    amountStr = amountStr.replace(',', '.');

    // Remove thousands separator
    amountStr = amountStr.replace(/\s/g, '');

    return parseFloat(amountStr);
  }

  buildDescription(title, counterparty) {
    const parts = [];

    if (counterparty && counterparty.trim()) {
      parts.push(counterparty.trim());
    }

    if (title && title.trim()) {
      // Don't duplicate if title starts with counterparty
      if (!parts.length || !title.toLowerCase().startsWith(counterparty?.toLowerCase() || '')) {
        parts.push(title.trim());
      }
    }

    return parts.join(' - ').substring(0, 200);
  }

  generateTransactionId(date, amount, title) {
    // Create unique ID from date + amount + title hash
    const data = `${date}|${amount}|${title}`;
    return this.simpleHash(data);
  }

  generateHash(content) {
    return this.simpleHash(content.substring(0, 1000));
  }

  // Simple hash function (not cryptographic, just for deduplication)
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'bank_' + Math.abs(hash).toString(36);
  }

  // ============================================
  // IMPORT RECORDS
  // ============================================

  async saveImportRecord({ userId, familyId, bankName, fileName, fileHash, totalRows, importedCount, skippedCount, dateFrom, dateTo }) {
    await this.db.prepare(`
      INSERT INTO bank_imports (
        user_id, family_id, bank_name, file_name, file_hash,
        total_rows, imported_count, skipped_count, date_from, date_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      familyId,
      bankName,
      fileName,
      fileHash,
      totalRows,
      importedCount,
      skippedCount,
      dateFrom,
      dateTo
    ).run();
  }

  async getImportHistory(userId, limit = 10) {
    const result = await this.db.prepare(`
      SELECT * FROM bank_imports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();
    return result.results;
  }

  // Delete last import and its transactions
  async deleteLastImport(userId) {
    // Get the last import
    const lastImport = await this.db.prepare(`
      SELECT * FROM bank_imports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(userId).first();

    if (!lastImport) {
      return { success: false, error: 'no_imports' };
    }

    return this.deleteImportById(lastImport.id, userId);
  }

  // Delete specific import by ID
  async deleteImportById(importId, userId) {
    // Get import info
    const importRecord = await this.db.prepare(`
      SELECT * FROM bank_imports
      WHERE id = ? AND user_id = ?
    `).bind(importId, userId).first();

    if (!importRecord) {
      return { success: false, error: 'not_found' };
    }

    // Build query dynamically based on family_id (NULL handling in SQLite)
    let deleteQuery = `
      DELETE FROM transactions
      WHERE user_id = ?
        AND source = 'bank_import'
        AND transaction_date >= ?
        AND transaction_date <= ?
    `;

    let params = [userId, importRecord.date_from, importRecord.date_to];

    if (importRecord.family_id) {
      deleteQuery += ' AND family_id = ?';
      params.push(importRecord.family_id);
    } else {
      deleteQuery += ' AND family_id IS NULL';
    }

    const deleteResult = await this.db.prepare(deleteQuery).bind(...params).run();

    // Delete the import record
    await this.db.prepare(`
      DELETE FROM bank_imports WHERE id = ?
    `).bind(importId).run();

    return {
      success: true,
      deleted: deleteResult.meta?.changes || importRecord.imported_count,
      importRecord
    };
  }

  // ============================================
  // PREVIEW (for confirmation before import)
  // ============================================

  async previewCSV(content, bankName) {
    const transactions = this.parseCSV(content, bankName);

    if (transactions.length === 0) {
      return { success: false, error: 'no_transactions' };
    }

    // Calculate stats
    let totalExpenses = 0;
    let totalIncome = 0;
    let dateFrom = null;
    let dateTo = null;

    for (const tx of transactions) {
      if (tx.type === 'expense') {
        totalExpenses += tx.amount;
      } else {
        totalIncome += tx.amount;
      }

      if (!dateFrom || tx.date < dateFrom) dateFrom = tx.date;
      if (!dateTo || tx.date > dateTo) dateTo = tx.date;
    }

    return {
      success: true,
      count: transactions.length,
      expenses: totalExpenses,
      income: totalIncome,
      dateFrom,
      dateTo,
      sample: transactions.slice(0, 3).map(t => ({
        date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description.substring(0, 50)
      }))
    };
  }

  // ============================================
  // SUPPORTED BANKS
  // ============================================

  getSupportedBanks() {
    return [
      { code: 'pkobp', name: 'PKO BP', flag: '🏦' },
      { code: 'mbank', name: 'mBank', flag: '🏦' },
      { code: 'ing', name: 'ING Bank Śląski', flag: '🏦' }
    ];
  }
}
