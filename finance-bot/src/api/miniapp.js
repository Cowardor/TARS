// Mini App REST API Handler
// Serves data for Telegram Mini App (WebApp)

import { resolveUser } from './auth.js';
import { UserService } from '../services/user.js';
import { CategoryService } from '../services/category.js';
import { TransactionService } from '../services/transaction.js';
import { FamilyService } from '../services/family.js';
import { ExportService } from '../services/export.js';
import { BudgetService } from '../services/budget.js';
import { AccountService } from '../services/account.js';
import { getMonthRange } from '../utils/db.js';

// ============================================
// CORS + JSON helpers
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, X-Session-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(message, status = 400) {
  return json({ error: message }, status);
}

// ============================================
// Telegram initData validation
// ============================================

async function validateInitData(initData, botToken) {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // HMAC-SHA256 with "WebAppData" as key
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretHash = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

    const validationKey = await crypto.subtle.importKey(
      'raw',
      secretHash,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', validationKey, encoder.encode(dataCheckString));

    const hexHash = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');

    if (hexHash !== hash) return null;

    // Parse user data
    const userStr = params.get('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (e) {
    console.error('initData validation error:', e);
    return null;
  }
}

// ============================================
// Main API Router
// ============================================

export async function handleMiniAppAPI(request, env, pathname) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health check — no auth needed
  if (pathname === '/api/health') {
    return json({ status: 'ok', time: new Date().toISOString() });
  }

  // Init services
  const userService = new UserService(env.DB);
  const categoryService = new CategoryService(env.DB);
  const transactionService = new TransactionService(env.DB, env.ENCRYPTION_KEY);
  const familyService = new FamilyService(env.DB);
  const exportService = new ExportService(transactionService);
  const budgetService = new BudgetService(env.DB, transactionService);
  const accountService = new AccountService(env.DB, env.ENCRYPTION_KEY);

  // 1. Try session token (PWA / email login)
  let user = await resolveUser(request, env);

  // 2. Try Telegram initData (Telegram Mini App)
  if (!user) {
    const initData = request.headers.get('X-Telegram-Init-Data');
    const tgUser = await validateInitData(initData, env.TELEGRAM_TOKEN);
    if (tgUser) {
      user = await userService.findByTelegramId(tgUser.id.toString());
      if (!user) {
        user = await userService.create(
          tgUser.id.toString(),
          tgUser.first_name || 'User',
          tgUser.username || null
        );
      }
    }
  }

  if (!user) {
    return error('Unauthorized. Please log in.', 401);
  }

  const userId = user.id;

  // Get active family/account from session
  let familyId = null;
  let activeAccountId = null;
  if (user.telegram_id) {
    // Telegram users — session stored in D1 user_sessions table
    const session = await userService.getSession(user.telegram_id);
    familyId = session?.active_family_id || null;
    activeAccountId = session?.active_account_id || null;
  } else {
    // Email/OAuth users — active account stored in KV (user_sessions table requires telegram_id)
    const kvSession = await env.FINANCE_KV.get(`user_account:${userId}`, 'json');
    activeAccountId = kvSession?.active_account_id || null;
  }

  const currency = user.currency || 'USD';

  // Route
  switch (pathname) {
    case '/api/dashboard':
      return handleDashboard(userId, familyId, activeAccountId, transactionService, currency);

    case '/api/stats':
      return handleStats(request, userId, familyId, activeAccountId, transactionService, currency);

    case '/api/transactions':
      return handleTransactions(request, userId, familyId, activeAccountId, transactionService, currency);

    case '/api/categories': {
      const urlQ = new URL(request.url);
      const qAccountId = urlQ.searchParams.get('account_id');
      const resolvedAccountId = qAccountId ? parseInt(qAccountId) : activeAccountId;
      return handleCategories(userId, familyId, resolvedAccountId, categoryService);
    }

    case '/api/transaction':
      if (request.method === 'GET') {
        return handleGetTransaction(request, userId, transactionService);
      }
      if (request.method === 'POST') {
        return handleCreateTransaction(request, userId, familyId, activeAccountId, transactionService, categoryService, currency, familyService);
      }
      if (request.method === 'PUT') {
        return handleUpdateTransaction(request, userId, transactionService);
      }
      if (request.method === 'DELETE') {
        return handleDeleteTransaction(request, userId, transactionService);
      }
      return error('Method not allowed', 405);

    case '/api/import':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleImportTransactions(request, userId, familyId, activeAccountId, transactionService, categoryService);

    case '/api/undo':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleUndo(request, userId, familyId, activeAccountId, transactionService, currency);

    case '/api/currency':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleCurrencyChange(request, userService, userId);

    case '/api/user':
      return json({
        id: user.id,
        name: user.display_name,
        currency: user.currency || 'USD',
        language: user.language || 'en',
        daily_reminder: user.daily_reminder ?? 1,
        monthly_report: user.monthly_report ?? 1,
        active_family_id: familyId || null,
        active_account_id: activeAccountId || null,
      });

    case '/api/export':
      return handleExport(request, userId, familyId, transactionService, exportService, familyService, user, currency, accountService);

    case '/api/category':
      if (request.method === 'POST') {
        return handleAddCategory(request, userId, familyId, categoryService);
      }
      if (request.method === 'PUT') {
        return handleRenameCategory(request, userId, familyId, categoryService);
      }
      if (request.method === 'DELETE') {
        return handleDeleteCategory(request, userId, familyId, categoryService);
      }
      return error('Method not allowed', 405);

    case '/api/categories/editable':
      return handleEditableCategories(request, userId, familyId, activeAccountId, categoryService);

    // ── Accounts ────────────────────────────────────────
    case '/api/accounts':
      if (request.method === 'GET') {
        return handleGetAccounts(userId, accountService, familyId, familyService);
      }
      if (request.method === 'POST') {
        return handleCreateAccount(request, userId, accountService);
      }
      if (request.method === 'PUT') {
        return handleUpdateAccount(request, userId, accountService);
      }
      if (request.method === 'DELETE') {
        return handleDeleteAccount(request, userId, accountService);
      }
      return error('Method not allowed', 405);

    case '/api/accounts/switch':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleAccountSwitch(request, userId, user.telegram_id, accountService, familyId, familyService, env.FINANCE_KV);

    case '/api/accounts/sync-crypto':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleSyncCrypto(request, userId, accountService);

    // Family management
    case '/api/family':
      return handleGetFamily(userId, familyId, familyService);

    case '/api/family/create':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleFamilyCreate(request, userId, user.telegram_id, familyService, userService);

    case '/api/family/invite':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleFamilyInvite(request, userId, familyService);

    case '/api/family/join':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleFamilyJoin(request, userId, user.telegram_id, familyService, userService);

    case '/api/family/switch':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleFamilySwitch(request, userId, user.telegram_id, familyService, userService);

    case '/api/family/members':
      return handleFamilyMembers(familyId, familyService);

    case '/api/family/leave':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleFamilyLeave(request, userId, user.telegram_id, familyService, userService);

    case '/api/family/shared-accounts':
      if (request.method === 'GET') {
        return handleGetSharedAccounts(userId, familyId, familyService, accountService);
      }
      return error('Method not allowed', 405);

    case '/api/family/share-account':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleShareAccount(request, userId, familyId, familyService, accountService);

    // Budgets
    case '/api/budgets': {
      const bUrl = new URL(request.url);
      const bAccountId = bUrl.searchParams.get('account_id') ? parseInt(bUrl.searchParams.get('account_id')) : null;
      return handleGetBudgets(userId, familyId, bAccountId, budgetService, categoryService);
    }

    case '/api/budget':
      if (request.method === 'POST') {
        return handleSetBudget(request, userId, familyId, budgetService);
      }
      if (request.method === 'DELETE') {
        return handleDeleteBudget(request, userId, familyId, budgetService);
      }
      return error('Method not allowed', 405);

    // Notifications
    case '/api/notifications':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleNotifications(request, userId, userService);

    // Language
    case '/api/language':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleLanguageChange(request, userId, userService);

    // Trend
    case '/api/trend':
      return handleTrend(userId, familyId, activeAccountId, transactionService);

    // Crypto portfolio stats
    case '/api/crypto-stats':
      return handleCryptoStats(request, userId, accountService);

    default:
      return error('Not found', 404);
  }
}

// ============================================
// GET /api/dashboard
// ============================================

async function handleDashboard(userId, familyId, accountId, ts, currency) {
  const now = new Date();

  const [expenseTotal, incomeTotal, recent, statsByCategory, dailyTotals] = await Promise.all([
    ts.getMonthTotal(userId, 'expense', now, familyId, accountId),
    ts.getMonthTotal(userId, 'income', now, familyId, accountId),
    ts.getRecent(userId, 5, familyId, accountId),
    ts.getStatsByCategory(userId, now, familyId, accountId),
    ts.getDailyTotals(userId, 7, familyId, accountId),
  ]);

  const balance = incomeTotal - expenseTotal;

  return json({
    balance,
    income: incomeTotal,
    expenses: expenseTotal,
    currency,
    spent_percent: incomeTotal > 0 ? Math.min((expenseTotal / incomeTotal) * 100, 100) : 0,
    recent: recent.map(formatTransaction),
    sparkline: dailyTotals,
    categories_summary: statsByCategory.filter(c => c.type === 'expense').map(c => ({
      name: c.name || 'Другое',
      emoji: c.emoji || '📦',
      total: c.total,
      count: c.count,
    })),
  });
}

// ============================================
// GET /api/stats?month=1&year=2026
// ============================================

async function handleStats(request, userId, familyId, accountId, ts, currency) {
  const url = new URL(request.url);
  const now = new Date();
  const monthParam = url.searchParams.get('month');
  const month = monthParam !== null ? parseInt(monthParam) - 1 : now.getMonth();
  const year = parseInt(url.searchParams.get('year') ?? now.getFullYear());

  const date = new Date(year, month, 1);

  const [statsByCategory, expenseTotal, incomeTotal] = await Promise.all([
    ts.getStatsByCategory(userId, date, familyId, accountId),
    ts.getMonthTotal(userId, 'expense', date, familyId, accountId),
    ts.getMonthTotal(userId, 'income', date, familyId, accountId),
  ]);

  const expenses = statsByCategory.filter(c => c.type === 'expense');
  const incomes = statsByCategory.filter(c => c.type === 'income');

  return json({
    month: month + 1,
    year,
    currency,
    expense_total: expenseTotal,
    income_total: incomeTotal,
    balance: incomeTotal - expenseTotal,
    expense_categories: expenses.map(c => ({
      id: c.id,
      name: c.name || 'Другое',
      emoji: c.emoji || '📦',
      total: c.total,
      count: c.count,
      percent: expenseTotal > 0 ? (c.total / expenseTotal) * 100 : 0,
    })),
    income_categories: incomes.map(c => ({
      id: c.id,
      name: c.name || 'Другое',
      emoji: c.emoji || '💰',
      total: c.total,
      count: c.count,
    })),
  });
}

// ============================================
// GET /api/transactions?type=all|expense|income
// ============================================

async function handleTransactions(request, userId, familyId, accountId, ts, currency) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const categoryId = url.searchParams.get('category_id') ? parseInt(url.searchParams.get('category_id')) : null;

  const monthParam = url.searchParams.get('month');
  const yearParam = url.searchParams.get('year');
  const now = new Date();
  const month = monthParam ? parseInt(monthParam) - 1 : now.getMonth();
  const year = yearParam ? parseInt(yearParam) : now.getFullYear();
  const { start, end } = getMonthRange(new Date(year, month, 1));

  const txType = type === 'all' ? null : type;
  const transactions = await ts.getByPeriod(userId, start, end, familyId, txType, categoryId, accountId);

  return json({
    currency,
    transactions: transactions.map(formatTransaction),
  });
}

// ============================================
// GET /api/categories
// ============================================

async function handleCategories(userId, familyId, accountId, cs) {
  const categories = await cs.getUserCategories(userId, null, familyId, accountId);

  return json({
    expense: categories.filter(c => c.type === 'expense').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
    })),
    income: categories.filter(c => c.type === 'income').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
    })),
  });
}

// ============================================
// POST /api/transaction
// ============================================

async function handleCreateTransaction(request, userId, familyId, accountId, ts, cs, currency, fs = null) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { type, amount, category_id, description } = body;

  // Read-only guard: check if active account is a shared account with readonly permission
  if (accountId && familyId && fs) {
    const shared = await fs.isAccountShared(accountId, familyId);
    if (shared && shared.permission === 'readonly') {
      return error('This account is read-only', 403);
    }
  }

  if (!type || !['expense', 'income'].includes(type)) {
    return error('Invalid type: must be "expense" or "income"');
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return error('Invalid amount: must be a positive number');
  }

  if (!category_id) {
    return error('category_id is required');
  }

  const category = await cs.findById(category_id);
  if (!category) {
    return error('Category not found');
  }

  const transaction = await ts.create(
    userId,
    category_id,
    type,
    amount,
    description || null,
    familyId,
    null,
    accountId
  );

  const categoryTotal = await ts.getCategoryTotal(userId, category_id, new Date(), familyId, accountId);
  const monthTotal = await ts.getMonthTotal(userId, type, new Date(), familyId, accountId);

  return json({
    success: true,
    transaction: {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      category_name: category.name,
      category_emoji: category.emoji,
      description: transaction.description,
      date: transaction.transaction_date,
    },
    category_month_total: categoryTotal,
    month_total: monthTotal,
    currency,
  });
}

// ============================================
// DELETE /api/transaction?id=123
// ============================================

async function handleDeleteTransaction(request, userId, ts) {
  const url = new URL(request.url);
  const txId = parseInt(url.searchParams.get('id'));
  if (!txId) return error('id parameter required');

  const deleted = await ts.delete(txId, userId);
  if (!deleted) return error('Transaction not found', 404);

  return json({ success: true, deleted: formatTransaction(deleted) });
}

// ============================================
// POST /api/undo — delete last transaction
// ============================================

async function handleUndo(request, userId, familyId, sessionAccountId, ts, currency) {
  // Prefer explicit account_id from body over session — avoids race conditions
  let accountId = sessionAccountId;
  try {
    const body = await request.json();
    if (body && body.account_id !== undefined) {
      accountId = body.account_id || null;
    }
  } catch { /* no body — use session */ }
  const last = await ts.getLastTransaction(userId, familyId, accountId);
  if (!last) return error('No transactions to undo', 404);

  await ts.delete(last.id, userId);

  return json({
    success: true,
    deleted: {
      id: last.id,
      type: last.type,
      amount: last.amount,
      category_name: last.category_name || 'Другое',
      category_emoji: last.category_emoji || '📦',
      description: last.description,
    },
    currency,
  });
}

// ============================================
// POST /api/currency { currency: "EUR" }
// ============================================

async function handleCurrencyChange(request, userService, userId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }

  const { currency } = body;
  const allowed = ['PLN', 'USD', 'EUR', 'UAH', 'GBP', 'CZK', 'CHF', 'NOK', 'SEK', 'DKK'];
  if (!currency || !allowed.includes(currency)) {
    return error(`Invalid currency. Allowed: ${allowed.join(', ')}`);
  }

  await userService.updateCurrency(userId, currency);
  return json({ success: true, currency });
}

// ============================================
// GET /api/export?format=html|xls — Export
// ============================================

async function handleExport(request, userId, familyId, ts, exportService, familyService, user, currency, as) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'xls';
  let exportAccountId = url.searchParams.get('account_id') ? parseInt(url.searchParams.get('account_id')) : null;

  // Personal account transactions are stored with account_id IS NULL (canonical rule)
  if (exportAccountId && as) {
    const acc = await as.getById(exportAccountId, userId);
    if (acc?.type === 'personal') exportAccountId = null;
  }

  const now = new Date();
  const { start, end } = getMonthRange(now);

  if (format === 'html') {
    // JSON preview for the Mini App UI
    const transactions = await ts.getByPeriod(userId, start, end, familyId, null, null, exportAccountId);
    const totalExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    return json({
      period: `${start} — ${end}`,
      currency,
      total_expense: totalExp,
      total_income: totalInc,
      balance: totalInc - totalExp,
      count: transactions.length,
      transactions: transactions.map(t => ({
        date: t.transaction_date,
        type: t.type,
        amount: t.amount,
        category: `${t.category_emoji || '📦'} ${t.category_name || 'Другое'}`,
        description: t.description || '',
        source: t.source || 'manual',
      })),
    });
  }

  // Excel XML — same format as bot's /export command
  let familyName = null;
  if (familyId) {
    const family = await familyService.findById(familyId);
    familyName = family?.name;
  }

  const lang = user.language || 'en';
  const excelContent = await exportService.generateExcelXML(userId, now, familyId, familyName, lang, exportAccountId);

  const encoder = new TextEncoder();
  const buffer = encoder.encode(excelContent);

  const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const filename = `finance_${monthNames[now.getMonth()]}_${now.getFullYear()}.xls`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...CORS_HEADERS,
    },
  });
}

// ============================================
// GET /api/categories/editable
// ============================================

async function handleEditableCategories(request, userId, familyId, accountId, cs) {
  // Allow overriding accountId via query param (for category manager account filter)
  const url = new URL(request.url);
  const qAccountId = url.searchParams.get('account_id');
  const effectiveAccountId = qAccountId !== null ? (qAccountId === '' ? null : Number(qAccountId)) : accountId;
  const categories = await cs.getEditableCategories(userId, null, familyId, effectiveAccountId);

  return json({
    expense: categories.filter(c => c.type === 'expense').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      owner_type: c.owner_type,
      account_id: c.account_id || null,
      tx_count: c.tx_count || 0,
    })),
    income: categories.filter(c => c.type === 'income').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      owner_type: c.owner_type,
      account_id: c.account_id || null,
      tx_count: c.tx_count || 0,
    })),
  });
}

// ============================================
// POST /api/category — Add custom category
// ============================================

async function handleAddCategory(request, userId, familyId, cs) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }

  const { name, emoji, type, keywords, scope, account_id } = body;

  if (!name || !name.trim()) return error('name is required');
  if (!emoji) return error('emoji is required');
  if (!type || !['expense', 'income'].includes(type)) return error('type must be expense or income');

  // scope='personal' forces user-owned category; scope='family' (or default when in family) uses familyId
  const effectiveFamilyId = (scope === 'personal') ? null : familyId;

  const result = await cs.addCustomCategory(userId, name.trim(), emoji, type, keywords || [], effectiveFamilyId, account_id || null);

  if (!result.success) {
    if (result.error === 'exists') return error('Категория с таким именем уже существует');
    return error(result.error);
  }

  return json({ success: true, category: result.category });
}

// ============================================
// PUT /api/category — Rename category
// ============================================

async function handleRenameCategory(request, userId, familyId, cs) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }

  const { id, name } = body;
  if (!id) return error('id is required');
  if (!name || !name.trim()) return error('name is required');

  const result = await cs.renameCategory(id, userId, name.trim(), familyId);

  if (!result.success) return error(result.error);
  return json({ success: true, emoji: result.emoji });
}

// ============================================
// DELETE /api/category?id=X — Delete category
// ============================================

async function handleDeleteCategory(request, userId, familyId, cs) {
  const url = new URL(request.url);
  const catId = parseInt(url.searchParams.get('id'));
  if (!catId) return error('id parameter required');

  const result = await cs.deleteCategory(userId, catId, familyId);

  if (!result.success) return error(result.error);
  return json({ success: true, moved_transactions: result.movedTransactions || 0 });
}

// ============================================
// GET /api/family — Family info
// ============================================

async function handleGetFamily(userId, activeFamilyId, fs) {
  const families = await fs.getUserFamilies(userId);

  return json({
    active_family_id: activeFamilyId,
    families: families.map(f => ({
      id: f.id,
      name: f.name,
      role: f.role,
      owner_id: f.owner_id,
    })),
  });
}

// ============================================
// POST /api/family/create
// ============================================

async function handleFamilyCreate(request, userId, telegramId, fs, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { name } = body;
  if (!name || !name.trim()) return error('name is required');

  const family = await fs.create(name.trim(), userId);
  await us.setActiveFamily(telegramId, family.id);

  return json({ success: true, family: { id: family.id, name: family.name } });
}

// ============================================
// POST /api/family/invite
// ============================================

async function handleFamilyInvite(request, userId, fs) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { family_id } = body;
  if (!family_id) return error('family_id is required');

  const family = await fs.findById(family_id);
  if (!family) return error('Family not found', 404);
  if (family.owner_id !== userId) return error('Only owner can generate invite');

  const code = await fs.generateInvite(family_id);
  return json({ success: true, code, expires_in: '24 часа' });
}

// ============================================
// POST /api/family/join
// ============================================

async function handleFamilyJoin(request, userId, telegramId, fs, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { code } = body;
  if (!code || !code.trim()) return error('code is required');

  const result = await fs.joinByCode(code.trim().toUpperCase(), userId);
  if (!result.success) return error(result.error);

  await us.setActiveFamily(telegramId, result.family.id);
  return json({ success: true, family: { id: result.family.id, name: result.family.name } });
}

// ============================================
// POST /api/family/switch
// ============================================

async function handleFamilySwitch(request, userId, telegramId, fs, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { family_id } = body; // null = personal

  if (family_id !== null) {
    const isMember = await fs.isMember(family_id, userId);
    if (!isMember) return error('You are not a member of this family');
  }

  await us.setActiveFamily(telegramId, family_id);
  return json({ success: true, active_family_id: family_id });
}

// ============================================
// GET /api/family/members
// ============================================

async function handleFamilyMembers(familyId, fs) {
  if (!familyId) return error('No active family');

  const members = await fs.getMembers(familyId);
  return json({
    members: members.map(m => ({
      id: m.id,
      name: m.display_name,
      role: m.role,
    })),
  });
}

// ============================================
// POST /api/family/leave
// ============================================

async function handleFamilyLeave(request, userId, telegramId, fs, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { family_id } = body;
  if (!family_id) return error('family_id is required');

  const result = await fs.leave(family_id, userId);
  if (!result.success) return error(result.error);

  await us.setActiveFamily(telegramId, null);
  return json({ success: true });
}

// ============================================
// GET /api/family/shared-accounts
// ============================================

async function handleGetSharedAccounts(userId, familyId, fs, as) {
  if (!familyId) return error('No active family');

  const allShared = await fs.getSharedAccounts(familyId);
  const mySharedIds = await fs.getMySharedAccountIds(familyId, userId);

  return json({
    shared_accounts: allShared.map(sa => ({
      account_id: sa.account_id,
      account_name: sa.account_name,
      account_type: sa.account_type,
      shared_by: sa.shared_by_name,
      shared_by_user_id: sa.shared_by_user_id,
      permission: sa.permission,
    })),
    my_shared: mySharedIds,
  });
}

// ============================================
// POST /api/family/share-account
// ============================================

async function handleShareAccount(request, userId, familyId, fs, as) {
  if (!familyId) return error('No active family');

  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { account_id, shared } = body;
  if (!account_id) return error('account_id is required');

  // Verify ownership
  const account = await as.getById(account_id, userId);
  if (!account) return error('Account not found or not yours', 404);

  if (shared) {
    // Auto-determine permission: crypto/investments = readonly, rest = readwrite
    const readOnlyTypes = ['crypto'];
    const permission = readOnlyTypes.includes(account.type) ? 'readonly' : 'readwrite';
    try {
      await fs.shareAccount(account_id, familyId, userId, permission);
    } catch (e) {
      // Ignore duplicate
      if (!e.message?.includes('UNIQUE')) throw e;
    }
    return json({ success: true, permission });
  } else {
    await fs.unshareAccount(account_id, familyId, userId);
    return json({ success: true });
  }
}

// ============================================
// GET /api/budgets
// ============================================

async function handleGetBudgets(userId, familyId, accountId, bs, cs) {
  let statuses = await bs.getAllBudgetStatuses(userId, familyId);

  // If account_id is specified, filter budgets to only categories from that account
  if (accountId && cs) {
    const accCats = await cs.getUserCategories(userId, null, familyId, accountId);
    const accCatIds = new Set(accCats.map(c => c.id));
    statuses = statuses.filter(s => accCatIds.has(s.category_id));
  }

  return json({ budgets: statuses });
}

// ============================================
// POST /api/budget
// ============================================

async function handleSetBudget(request, userId, familyId, bs) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { category_id, amount } = body;
  if (!category_id) return error('category_id is required');
  if (!amount || amount <= 0) return error('amount must be positive');

  await bs.setBudget(userId, category_id, amount, familyId);
  return json({ success: true });
}

// ============================================
// DELETE /api/budget?category_id=X
// ============================================

async function handleDeleteBudget(request, userId, familyId, bs) {
  const url = new URL(request.url);
  const categoryId = parseInt(url.searchParams.get('category_id'));
  if (!categoryId) return error('category_id parameter required');

  await bs.deleteBudget(userId, categoryId, familyId);
  return json({ success: true });
}

// ============================================
// POST /api/notifications
// ============================================

async function handleNotifications(request, userId, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { daily_reminder, monthly_report } = body;

  if (daily_reminder !== undefined) {
    await us.updateNotificationSetting(userId, 'daily_reminder', daily_reminder ? 1 : 0);
  }
  if (monthly_report !== undefined) {
    await us.updateNotificationSetting(userId, 'monthly_report', monthly_report ? 1 : 0);
  }

  return json({ success: true, daily_reminder: daily_reminder ? 1 : 0, monthly_report: monthly_report ? 1 : 0 });
}

// ============================================
// POST /api/language
// ============================================

async function handleLanguageChange(request, userId, us) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { language } = body;
  const allowed = ['ru', 'en', 'pl', 'uk'];
  if (!language || !allowed.includes(language)) {
    return error('Invalid language. Allowed: ru, en, pl, uk');
  }

  await us.updateLanguage(userId, language);
  return json({ success: true, language });
}

// ============================================
// GET /api/trend
// ============================================

async function handleTrend(userId, familyId, accountId, ts) {
  const trend = await ts.getMonthlyTrend(userId, 6, familyId, accountId);
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  return json({
    months: trend.map(t => ({
      label: `${monthNames[t.month]} ${t.year}`,
      expenses: t.expenses,
      income: t.income,
      balance: t.balance,
    })),
  });
}

// ============================================
// Helpers
// ============================================

function formatTransaction(t) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    category_id: t.category_id,
    category_name: t.category_name || 'Другое',
    category_emoji: t.category_emoji || '📦',
    description: t.description,
    date: t.transaction_date,
    source: t.source || 'manual',
    created_at: t.created_at,
    user_name: t.user_name,
  };
}

// ============================================
// GET /api/transaction?id=X — Get single transaction
// ============================================

async function handleGetTransaction(request, userId, ts) {
  const url = new URL(request.url);
  const txId = parseInt(url.searchParams.get('id'));
  if (!txId) return error('id parameter required');

  const tx = await ts.findById(txId);
  if (!tx || tx.user_id !== userId) return error('Transaction not found', 404);

  return json({ transaction: formatTransaction(tx) });
}

// ============================================
// PUT /api/transaction — Update transaction
// ============================================

async function handleUpdateTransaction(request, userId, ts) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { id, amount, category_id, type, description, transaction_date } = body;
  if (!id) return error('id is required');

  const updates = {};
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0) return error('Invalid amount');
    updates.amount = amount;
  }
  if (category_id !== undefined) updates.category_id = category_id;
  if (type !== undefined) {
    if (!['expense', 'income'].includes(type)) return error('Invalid type');
    updates.type = type;
  }
  if (description !== undefined) updates.description = description;
  if (transaction_date !== undefined) updates.transaction_date = transaction_date;

  const result = await ts.update(id, userId, updates);
  if (!result) return error('Transaction not found', 404);

  return json({ success: true, transaction: formatTransaction(result) });
}

// ============================================
// GET /api/accounts — List user accounts
// ============================================

async function handleGetAccounts(userId, as, familyId = null, fs = null) {
  let accounts = await as.getAccounts(userId);
  // Auto-create Personal account for new users
  if (accounts.length === 0) {
    try {
      await as.createAccount(userId, 'Personal', '👤', 'personal', 'personal');
    } catch (_) { /* ignore duplicate */ }
    accounts = await as.getAccounts(userId);
  }
  // Canonical rule: Personal slot = account_id IS NULL. Undo any bad migrations.
  const personalAcc = accounts.find(a => a.type === 'personal');
  if (personalAcc) {
    await as.consolidatePersonalTransactions(userId, personalAcc.id);
  }

  const mapped = accounts.map(a => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    type: a.type,
    color: a.color,
    sort_order: a.sort_order,
    crypto_exchange: a.crypto_exchange || null,
    crypto_synced_at: a.crypto_synced_at || null,
    crypto_balances: a.type === 'crypto' ? as.getCachedCrypto(a) : null,
  }));

  // Append shared accounts from other family members
  let sharedAccounts = [];
  if (familyId && fs) {
    const shared = await fs.getSharedAccountsForUser(familyId, userId);
    sharedAccounts = shared.map(sa => ({
      id: sa.account_id,
      name: sa.account_name,
      emoji: '🔗',
      type: sa.account_type,
      color: null,
      sort_order: 9999,
      crypto_exchange: null,
      crypto_synced_at: null,
      crypto_balances: null,
      _shared: true,
      _shared_by: sa.shared_by_name,
      _shared_by_user_id: sa.shared_by_user_id,
      _permission: sa.permission,
    }));
  }

  return json({ accounts: [...mapped, ...sharedAccounts] });
}

// ============================================
// POST /api/accounts — Create account
// ============================================

async function handleCreateAccount(request, userId, as) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { name, emoji, type, template, currency, crypto_exchange, crypto_api_key, crypto_api_secret, crypto_passphrase } = body;
  if (!name || !name.trim()) return error('name is required');

  const validTypes = ['personal', 'business', 'family_shared', 'crypto'];
  const accountType = validTypes.includes(type) ? type : 'personal';

  if (accountType === 'crypto' && !crypto_exchange) {
    return error('crypto_exchange is required for crypto accounts');
  }

  let account;
  try {
    account = await as.createAccount(
      userId,
      name.trim(),
      emoji || '💼',
      accountType,
      template || accountType,
      currency || null,
      crypto_exchange || null,
      crypto_api_key || null,
      crypto_api_secret || null,
      crypto_passphrase || null
    );
  } catch (err) {
    if (err.message === 'duplicate_name') {
      return json({ success: false, error: 'duplicate_name' }, 409);
    }
    return error(err.message || 'Failed to create account');
  }

  return json({ success: true, account: {
    id: account.id,
    name: account.name,
    emoji: account.emoji,
    type: account.type,
    color: account.color,
    sort_order: account.sort_order,
  }});
}

// ============================================
// PUT /api/accounts — Update account
// ============================================

async function handleUpdateAccount(request, userId, as) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { id, name, emoji, color, crypto_exchange, crypto_api_key, crypto_api_secret, crypto_passphrase } = body;
  if (!id) return error('id is required');

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (emoji !== undefined) updates.emoji = emoji;
  if (color !== undefined) updates.color = color;
  if (crypto_exchange !== undefined) updates.crypto_exchange = crypto_exchange;
  if (crypto_api_key !== undefined) updates.crypto_api_key = crypto_api_key;
  if (crypto_api_secret !== undefined) updates.crypto_api_secret = crypto_api_secret;
  if (crypto_passphrase !== undefined) updates.crypto_passphrase = crypto_passphrase;

  const result = await as.updateAccount(id, userId, updates);
  if (!result) return error('Account not found', 404);

  return json({ success: true, account: result });
}

// ============================================
// DELETE /api/accounts — Delete account
// ============================================

async function handleDeleteAccount(request, userId, as) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { id } = body;
  if (!id) return error('id is required');

  const result = await as.deleteAccount(id, userId);
  if (!result.success) return error(result.error);

  return json({ success: true });
}

// ============================================
// POST /api/accounts/switch — Switch active account
// ============================================

async function handleAccountSwitch(request, userId, telegramId, as, familyId = null, fs = null, kv = null) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { account_id } = body; // null = go back to implicit personal mode

  if (account_id !== null && account_id !== undefined) {
    // Check own accounts first
    let account = await as.getById(account_id, userId);
    // If not own — check if it's a shared account in current family
    if (!account && familyId && fs) {
      const shared = await fs.isAccountShared(account_id, familyId);
      if (!shared) return error('Account not found', 404);
    } else if (!account) {
      return error('Account not found', 404);
    }
  }

  if (telegramId) {
    // Telegram users — persist in D1 user_sessions
    await as.switchAccount(telegramId, account_id || null);
  } else if (kv) {
    // Email/OAuth users — persist in KV (user_sessions table requires telegram_id NOT NULL)
    await kv.put(`user_account:${userId}`, JSON.stringify({ active_account_id: account_id || null }), {
      expirationTtl: 60 * 60 * 24 * 90, // 90 days
    });
  }

  return json({ success: true, active_account_id: account_id || null });
}

// ============================================
// POST /api/accounts/sync-crypto — Sync crypto balances
// ============================================

async function handleSyncCrypto(request, userId, as) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { account_id } = body;
  if (!account_id) return error('account_id is required');

  const result = await as.syncCrypto(account_id, userId);
  if (!result.success) return error(result.error || 'Sync failed');

  return json({ success: true, balances: result.balances });
}

// ============================================
// GET /api/crypto-stats — Portfolio stats + history for chart
// ============================================

async function handleCryptoStats(request, userId, as) {
  const url = new URL(request.url);
  const accountId = parseInt(url.searchParams.get('account_id'));
  if (!accountId) return error('account_id is required');

  const account = await as.getById(accountId, userId);
  if (!account || account.type !== 'crypto') return error('Crypto account not found', 404);

  const balances = as.getCachedCrypto(account);
  const totalUsd = balances.reduce((s, b) => s + (b.usd_value || 0), 0);
  const snapshots = await as.getCryptoSnapshots(accountId);

  return json({
    balances,
    total_usd: Math.round(totalUsd * 100) / 100,
    synced_at: account.crypto_synced_at || null,
    exchange: account.crypto_exchange,
    snapshots: snapshots.map(s => ({
      total_usd: s.total_usd,
      date: s.created_at,
    })),
  });
}

// ============================================
// POST /api/import — Bulk import transactions from CSV
// ============================================

async function handleImportTransactions(request, userId, familyId, sessionAccountId, ts, cs) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { transactions, account_id: bodyAccountId } = body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return error('transactions array is required');
  }

  // account_id from body overrides session account (for explicit import target)
  const accountId = bodyAccountId !== undefined ? (bodyAccountId || null) : sessionAccountId;

  let imported = 0;
  for (const tx of transactions) {
    const { date, type, amount, category_id, description } = tx;
    if (!amount || !category_id) continue;

    const txType = type && ['expense', 'income'].includes(type) ? type : 'expense';
    await ts.create(
      userId, category_id, txType,
      parseFloat(amount), description || null,
      familyId, date || null, accountId
    );
    imported++;
  }

  return json({ success: true, imported });
}
