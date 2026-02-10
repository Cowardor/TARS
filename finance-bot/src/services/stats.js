// Stats Service - Beautiful statistics generation with trends and localization

import { getTranslations, getMonthName } from '../utils/i18n.js';

export class StatsService {
  constructor(transactionService) {
    this.transactionService = transactionService;
  }

  // Generate ASCII progress bar
  progressBar(value, max, length = 10) {
    if (max === 0) return '░'.repeat(length);
    const filled = Math.round((value / max) * length);
    return '█'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(0, length - filled));
  }

  // Generate sparkline (mini trend chart)
  sparkline(values) {
    if (values.length === 0) return '';
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values.map(v => {
      const index = Math.round(((v - min) / range) * 7);
      return chars[Math.min(index, 7)];
    }).join('');
  }

  // Format currency
  formatAmount(amount, currency = 'PLN') {
    return `${amount.toFixed(2)} ${currency}`;
  }

  // Format percentage with sign
  formatChange(current, previous, lang = 'ru') {
    const t = getTranslations(lang);
    if (previous === 0) {
      if (current === 0) return '—';
      return `🆕 ${t.new}`;
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    const emoji = change > 10 ? '📈' : change < -10 ? '📉' : '➡️';
    return `${emoji} ${sign}${change.toFixed(0)}%`;
  }

  // Format percentage
  formatPercent(value, total) {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  // Generate monthly stats message with comparison
  async generateMonthlyStats(userId, date = new Date(), familyId = null, familyName = null, lang = 'ru', currency = 'PLN') {
    const ts = this.transactionService;
    const t = getTranslations(lang);

    // Current month data
    const stats = await ts.getStatsByCategory(userId, date, familyId);
    const totalExpenses = await ts.getMonthTotal(userId, 'expense', date, familyId);
    const totalIncome = await ts.getMonthTotal(userId, 'income', date, familyId);
    const expenseCount = await ts.getMonthCount(userId, 'expense', date, familyId);
    const avgExpense = await ts.getMonthAverage(userId, 'expense', date, familyId);

    // Previous month data
    const prevDate = ts.getPreviousMonth(date);
    const prevExpenses = await ts.getMonthTotal(userId, 'expense', prevDate, familyId);
    const prevIncome = await ts.getMonthTotal(userId, 'income', prevDate, familyId);
    const prevStats = await ts.getStatsByCategory(userId, prevDate, familyId);

    // Create prev month lookup for comparison
    const prevByCategory = {};
    for (const s of prevStats) {
      prevByCategory[`${s.id}_${s.type}`] = s.total;
    }

    // Get trend data (6 months)
    const trend = await ts.getMonthlyTrend(userId, 6, familyId);

    const monthName = getMonthName(date, lang);
    const year = date.getFullYear();
    const prevMonthName = getMonthName(prevDate, lang);

    let message = `📊 <b>${t.statsTitle} ${monthName} ${year}</b>\n`;

    if (familyName) {
      message += `👨‍👩‍👧 ${t.account}: ${familyName}\n`;
    }

    // Quick summary
    message += '\n══════════════════════════\n';
    message += `<b>${t.totalSummary}</b>\n`;
    message += '══════════════════════════\n\n';

    const balance = totalIncome - totalExpenses;
    const balanceEmoji = balance >= 0 ? '✅' : '⚠️';

    message += `📉 ${t.expenses}:  <b>${this.formatAmount(totalExpenses, currency)}</b>  ${this.formatChange(totalExpenses, prevExpenses, lang)}\n`;
    message += `📈 ${t.income}:   <b>${this.formatAmount(totalIncome, currency)}</b>  ${this.formatChange(totalIncome, prevIncome, lang)}\n`;
    message += `💰 ${t.balance}:   <b>${balance >= 0 ? '+' : ''}${this.formatAmount(balance, currency)}</b> ${balanceEmoji}\n`;

    // Additional metrics
    if (expenseCount > 0) {
      message += `\n📝 ${t.transactions}: ${expenseCount}  |  ${t.avgCheck}: ${avgExpense.toFixed(0)} ${currency}\n`;
    }

    // Trend sparkline
    if (trend.length > 1) {
      const expenseValues = trend.map(t => t.expenses);
      const sparklineChart = this.sparkline(expenseValues);
      message += `\n📉 ${t.trend}: ${sparklineChart} (${trend.length} ${t.monthsWord})\n`;
    }

    message += '\n══════════════════════════\n';
    message += `<b>${t.byCategories}</b>\n`;
    message += '══════════════════════════\n\n';

    // Filter expense categories
    const expenseStats = stats.filter(s => s.type === 'expense').sort((a, b) => b.total - a.total);

    if (expenseStats.length === 0) {
      message += `📭 ${t.noExpenses}\n`;
    } else {
      const maxExpense = Math.max(...expenseStats.map(s => s.total));

      for (const cat of expenseStats) {
        const bar = this.progressBar(cat.total, maxExpense);
        const percent = this.formatPercent(cat.total, totalExpenses);
        const prevTotal = prevByCategory[`${cat.id}_expense`] || 0;

        // Show change indicator
        let changeIndicator = '';
        if (prevTotal > 0) {
          const change = ((cat.total - prevTotal) / prevTotal) * 100;
          if (change > 20) changeIndicator = ' ↑';
          else if (change < -20) changeIndicator = ' ↓';
        }

        message += `${cat.emoji} ${cat.name.substring(0, 10).padEnd(10)} ${bar} ${this.formatAmount(cat.total, currency)} (${percent})${changeIndicator}\n`;
      }
    }

    // Add user stats for family
    if (familyId) {
      const userStats = await ts.getStatsByUser(familyId, date);
      const expensesByUser = userStats.filter(s => s.type === 'expense');

      if (expensesByUser.length > 1) {
        message += '\n══════════════════════════\n';
        message += `<b>${t.byMembers}</b>\n`;
        message += '══════════════════════════\n\n';

        for (const user of expensesByUser) {
          const percent = this.formatPercent(user.total, totalExpenses);
          const bar = this.progressBar(user.total, totalExpenses, 8);
          message += `👤 ${user.display_name.substring(0, 12).padEnd(12)} ${bar} ${this.formatAmount(user.total, currency)} (${percent})\n`;
        }
      }
    }

    // Comparison with previous month
    if (prevExpenses > 0) {
      const diff = totalExpenses - prevExpenses;
      const diffPercent = ((diff / prevExpenses) * 100).toFixed(0);

      message += '\n──────────────────────────\n';
      message += `📅 <i>${t.vsLastMonth} ${prevMonthName}: `;
      if (diff > 0) {
        message += `+${diff.toFixed(0)} ${currency} (+${diffPercent}%)</i>`;
      } else {
        message += `${diff.toFixed(0)} ${currency} (${diffPercent}%)</i>`;
      }
    }

    return message;
  }

  // Generate balance message
  async generateBalance(userId, date = new Date(), familyId = null, lang = 'ru', currency = 'PLN') {
    const ts = this.transactionService;
    const t = getTranslations(lang);

    const totalExpenses = await ts.getMonthTotal(userId, 'expense', date, familyId);
    const totalIncome = await ts.getMonthTotal(userId, 'income', date, familyId);
    const balance = totalIncome - totalExpenses;

    const prevDate = ts.getPreviousMonth(date);
    const prevExpenses = await ts.getMonthTotal(userId, 'expense', prevDate, familyId);
    const prevIncome = await ts.getMonthTotal(userId, 'income', prevDate, familyId);
    const prevBalance = prevIncome - prevExpenses;

    const emoji = balance >= 0 ? '✅' : '⚠️';

    let message = `${emoji} <b>${t.balanceTitle}:</b>\n\n`;
    message += `📈 ${t.income}: ${this.formatAmount(totalIncome, currency)}  ${this.formatChange(totalIncome, prevIncome, lang)}\n`;
    message += `📉 ${t.expenses}: ${this.formatAmount(totalExpenses, currency)}  ${this.formatChange(totalExpenses, prevExpenses, lang)}\n\n`;
    message += `💰 <b>${t.remaining}: ${balance >= 0 ? '+' : ''}${this.formatAmount(balance, currency)}</b>`;

    if (prevBalance !== 0) {
      const balanceChange = balance - prevBalance;
      message += `\n\n📊 ${t.vsLast}: ${balanceChange >= 0 ? '+' : ''}${balanceChange.toFixed(0)} ${currency}`;
    }

    return message;
  }

  // Generate recent transactions message
  async generateHistory(userId, limit = 10, familyId = null, lang = 'ru', currency = 'PLN') {
    const t = getTranslations(lang);
    const transactions = await this.transactionService.getRecent(userId, limit, familyId);

    if (transactions.length === 0) {
      return `📭 ${t.noTransactions}`;
    }

    let message = `📋 <b>${t.lastTransactions} ${transactions.length} ${t.transactionsWord}:</b>\n\n`;

    let currentDate = null;

    for (const tr of transactions) {
      const dateStr = new Date(tr.transaction_date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU', { day: '2-digit', month: '2-digit' });

      // Group by date
      if (dateStr !== currentDate) {
        if (currentDate !== null) message += '\n';
        message += `<b>${dateStr}</b>\n`;
        currentDate = dateStr;
      }

      const sign = tr.type === 'expense' ? '-' : '+';
      const emoji = tr.type === 'expense' ? (tr.category_emoji || '❓') : '💵';
      const sourceTag = tr.source === 'bank_import' ? ' 🏦csv'
        : tr.source === 'saltedge' ? ' 🏦api'
        : '';

      message += `  ${emoji} ${sign}${tr.amount.toFixed(2)} ${currency}`;
      if (tr.description) {
        message += ` <i>${tr.description.substring(0, 20)}</i>`;
      }
      message += `${sourceTag}\n`;
    }

    return message;
  }

  // Generate expense confirmation message
  generateExpenseConfirmation(amount, category, monthTotal, description = null, lang = 'ru', currency = 'PLN') {
    const t = getTranslations(lang);
    let message = `✅ ${t.recorded}: <b>${this.formatAmount(amount, currency)}</b> → ${category.emoji} ${category.name}`;
    if (description) {
      message += `\n💬 ${description}`;
    }
    message += `\n📊 ${category.emoji} ${category.name} ${t.thisMonth}: <b>${this.formatAmount(monthTotal, currency)}</b>`;
    return message;
  }

  // Generate income confirmation message
  generateIncomeConfirmation(amount, monthTotal, description = null, lang = 'ru', currency = 'PLN') {
    const t = getTranslations(lang);
    let message = `💵 ${t.recordedIncome}: <b>${this.formatAmount(amount, currency)}</b>`;
    if (description) {
      message += ` (${description})`;
    }
    message += `\n📈 ${t.income} ${t.thisMonth}: <b>${this.formatAmount(monthTotal, currency)}</b>`;
    return message;
  }

  // Generate trend report (6 months overview)
  async generateTrendReport(userId, familyId = null, lang = 'ru', currency = 'PLN') {
    const ts = this.transactionService;
    const t = getTranslations(lang);
    const trend = await ts.getMonthlyTrend(userId, 6, familyId);

    if (trend.length === 0) {
      return `📭 ${t.noTransactions}`;
    }

    let message = `📈 <b>${t.trendTitle} ${trend.length} ${t.monthsWord}</b>\n\n`;

    const maxExpense = Math.max(...trend.map(tr => tr.expenses), 1);

    for (const tr of trend) {
      const monthName = t.monthsShort ? t.monthsShort[tr.month] : getTranslations(lang).monthsShort[tr.month];
      const bar = this.progressBar(tr.expenses, maxExpense, 12);
      const balanceEmoji = tr.balance >= 0 ? '✅' : '⚠️';

      message += `${monthName} ${bar} ${tr.expenses.toFixed(0)} ${currency} ${balanceEmoji}\n`;
    }

    // Summary
    const totalExpenses = trend.reduce((sum, tr) => sum + tr.expenses, 0);
    const totalIncome = trend.reduce((sum, tr) => sum + tr.income, 0);
    const avgMonthly = totalExpenses / trend.length;

    message += `\n──────────────────────────\n`;
    message += `📊 ${t.totalExpenses}: ${totalExpenses.toFixed(0)} ${currency}\n`;
    message += `📊 ${t.average}${t.perMonth}: ${avgMonthly.toFixed(0)} ${currency}\n`;
    message += `💰 ${t.saved}: ${(totalIncome - totalExpenses).toFixed(0)} ${currency}`;

    return message;
  }
}
