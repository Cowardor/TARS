// Mini App REST API Handler
// Serves data for Telegram Mini App (WebApp)

import { resolveUser } from './auth.js';
import { UserService } from '../services/user.js';
import { CategoryService } from '../services/category.js';
import { TransactionService } from '../services/transaction.js';
import { FamilyService } from '../services/family.js';
import { ExportService } from '../services/export.js';
import { BudgetService } from '../services/budget.js';
import { getMonthRange } from '../utils/db.js';

// ============================================
// CORS + JSON helpers
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
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

  // Get active family from session (same as bot does)
  let familyId = null;
  if (user.telegram_id) {
    const session = await userService.getSession(user.telegram_id);
    familyId = session?.active_family_id || null;
  }

  const currency = user.currency || 'USD';

  // Route
  switch (pathname) {
    case '/api/dashboard':
      return handleDashboard(userId, familyId, transactionService, currency);

    case '/api/stats':
      return handleStats(request, userId, familyId, transactionService, currency);

    case '/api/transactions':
      return handleTransactions(request, userId, familyId, transactionService, currency);

    case '/api/categories':
      return handleCategories(userId, familyId, categoryService);

    case '/api/transaction':
      if (request.method === 'GET') {
        return handleGetTransaction(request, userId, transactionService);
      }
      if (request.method === 'POST') {
        return handleCreateTransaction(request, userId, familyId, transactionService, categoryService, currency);
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
      return handleImportTransactions(request, userId, familyId, transactionService, categoryService);

    case '/api/undo':
      if (request.method !== 'POST') return error('Method not allowed', 405);
      return handleUndo(userId, transactionService, currency);

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
      });

    case '/api/export':
      return handleExport(request, userId, familyId, transactionService, exportService, familyService, user, currency);

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
      return handleEditableCategories(userId, familyId, categoryService);

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

    // Budgets
    case '/api/budgets':
      return handleGetBudgets(userId, familyId, budgetService);

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
      return handleTrend(userId, familyId, transactionService);

    default:
      return error('Not found', 404);
  }
}

// ============================================
// GET /api/dashboard
// ============================================

async function handleDashboard(userId, familyId, ts, currency) {
  const now = new Date();

  const [expenseTotal, incomeTotal, recent, statsByCategory] = await Promise.all([
    ts.getMonthTotal(userId, 'expense', now, familyId),
    ts.getMonthTotal(userId, 'income', now, familyId),
    ts.getRecent(userId, 5, familyId),
    ts.getStatsByCategory(userId, now, familyId),
  ]);

  const balance = incomeTotal - expenseTotal;

  return json({
    balance,
    income: incomeTotal,
    expenses: expenseTotal,
    currency,
    spent_percent: incomeTotal > 0 ? Math.min((expenseTotal / incomeTotal) * 100, 100) : 0,
    recent: recent.map(formatTransaction),
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

async function handleStats(request, userId, familyId, ts, currency) {
  const url = new URL(request.url);
  const now = new Date();
  const monthParam = url.searchParams.get('month');
  const month = monthParam !== null ? parseInt(monthParam) - 1 : now.getMonth();
  const year = parseInt(url.searchParams.get('year') ?? now.getFullYear());

  const date = new Date(year, month, 1);

  const [statsByCategory, expenseTotal, incomeTotal] = await Promise.all([
    ts.getStatsByCategory(userId, date, familyId),
    ts.getMonthTotal(userId, 'expense', date, familyId),
    ts.getMonthTotal(userId, 'income', date, familyId),
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

async function handleTransactions(request, userId, familyId, ts, currency) {
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
  const transactions = await ts.getByPeriod(userId, start, end, familyId, txType, categoryId);

  return json({
    currency,
    transactions: transactions.map(formatTransaction),
  });
}

// ============================================
// GET /api/categories
// ============================================

async function handleCategories(userId, familyId, cs) {
  const categories = await cs.getUserCategories(userId, null, familyId);

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

async function handleCreateTransaction(request, userId, familyId, ts, cs, currency) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { type, amount, category_id, description } = body;

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
    familyId
  );

  const categoryTotal = await ts.getCategoryTotal(userId, category_id, new Date(), familyId);
  const monthTotal = await ts.getMonthTotal(userId, type, new Date(), familyId);

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

async function handleUndo(userId, ts, currency) {
  const last = await ts.getLastTransaction(userId);
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

async function handleExport(request, userId, familyId, ts, exportService, familyService, user, currency) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'xls';

  const now = new Date();
  const { start, end } = getMonthRange(now);

  if (format === 'html') {
    // JSON preview for the Mini App UI
    const transactions = await ts.getByPeriod(userId, start, end, familyId);
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
  const excelContent = await exportService.generateExcelXML(userId, now, familyId, familyName, lang);

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

async function handleEditableCategories(userId, familyId, cs) {
  const categories = await cs.getEditableCategories(userId, null, familyId);

  return json({
    expense: categories.filter(c => c.type === 'expense').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      owner_type: c.owner_type,
      tx_count: c.tx_count || 0,
    })),
    income: categories.filter(c => c.type === 'income').map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      owner_type: c.owner_type,
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

  const { name, emoji, type, keywords, scope } = body;

  if (!name || !name.trim()) return error('name is required');
  if (!emoji) return error('emoji is required');
  if (!type || !['expense', 'income'].includes(type)) return error('type must be expense or income');

  // scope='personal' forces user-owned category; scope='family' (or default when in family) uses familyId
  const effectiveFamilyId = (scope === 'personal') ? null : familyId;

  const result = await cs.addCustomCategory(userId, name.trim(), emoji, type, keywords || [], effectiveFamilyId);

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
// GET /api/budgets
// ============================================

async function handleGetBudgets(userId, familyId, bs) {
  const statuses = await bs.getAllBudgetStatuses(userId, familyId);
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

async function handleTrend(userId, familyId, ts) {
  const trend = await ts.getMonthlyTrend(userId, 6, familyId);
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
// POST /api/import — Bulk import transactions from CSV
// ============================================

async function handleImportTransactions(request, userId, familyId, ts, cs) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { transactions } = body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return error('transactions array is required');
  }

  let imported = 0;
  for (const tx of transactions) {
    const { date, type, amount, category_id, description } = tx;
    if (!amount || !category_id) continue;

    const txType = type && ['expense', 'income'].includes(type) ? type : 'expense';
    await ts.create(
      userId, category_id, txType,
      parseFloat(amount), description || null,
      familyId, date || null
    );
    imported++;
  }

  return json({ success: true, imported });
}
