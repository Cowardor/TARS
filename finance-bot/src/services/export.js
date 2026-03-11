// Export Service - Excel/CSV generation with detailed statistics and localization

import { getMonthRange } from '../utils/db.js';
import { getTranslations, getMonthName } from '../utils/i18n.js';

export class ExportService {
  constructor(transactionService) {
    this.transactionService = transactionService;
  }

  // Generate Excel-compatible XML with full statistics
  async generateExcelXML(userId, date = new Date(), familyId = null, familyName = null, lang = 'en', accountId = null) {
    const ts = this.transactionService;
    const t = getTranslations(lang);
    const { start, end } = getMonthRange(date);

    // Current month data
    const transactions = await ts.getByPeriod(userId, start, end, familyId, null, null, accountId);
    const stats = await ts.getStatsByCategory(userId, date, familyId, accountId);
    const totalExpenses = await ts.getMonthTotal(userId, 'expense', date, familyId, accountId);
    const totalIncome = await ts.getMonthTotal(userId, 'income', date, familyId, accountId);
    const expenseCount = await ts.getMonthCount(userId, 'expense', date, familyId, accountId);
    const incomeCount = await ts.getMonthCount(userId, 'income', date, familyId, accountId);
    const avgExpense = await ts.getMonthAverage(userId, 'expense', date, familyId, accountId);

    // Previous month data
    const prevDate = ts.getPreviousMonth(date);
    const prevExpenses = await ts.getMonthTotal(userId, 'expense', prevDate, familyId, accountId);
    const prevIncome = await ts.getMonthTotal(userId, 'income', prevDate, familyId, accountId);
    const prevStats = await ts.getStatsByCategory(userId, prevDate, familyId, accountId);

    // Create prev month lookup
    const prevByCategory = {};
    for (const s of prevStats) {
      prevByCategory[`${s.id}_${s.type}`] = s.total;
    }

    // Get trend data (6 months)
    const trend = await ts.getMonthlyTrend(userId, 6, familyId, accountId);

    const monthName = getMonthName(date, lang);
    const prevMonthName = getMonthName(prevDate, lang);
    const year = date.getFullYear();

    // Build Excel XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="11"/>
      <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="Currency">
      <NumberFormat ss:Format="#,##0.00"/>
      <Alignment ss:Horizontal="Right"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:Bold="1" ss:Size="14" ss:FontName="Calibri"/>
    </Style>
    <Style ss:ID="SubTitle">
      <Font ss:Bold="1" ss:Size="11" ss:FontName="Calibri"/>
      <Interior ss:Color="#D9E2F3" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Good">
      <Font ss:Color="#006600" ss:FontName="Calibri" ss:Size="11"/>
      <Interior ss:Color="#C6EFCE" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Bad">
      <Font ss:Color="#990000" ss:FontName="Calibri" ss:Size="11"/>
      <Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Neutral">
      <Interior ss:Color="#FFEB9C" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Bold">
      <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="11"/>
    </Style>
  </Styles>
`;

    // ===== Sheet 1: Overview =====
    xml += `  <Worksheet ss:Name="${t.sheetOverview}">
    <Table>
      <Column ss:Width="180"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Row ss:StyleID="Title">
        <Cell><Data ss:Type="String">${this.escapeXml(t.financialReport)}: ${this.escapeXml(monthName)} ${year}</Data></Cell>
      </Row>
`;

    if (familyName) {
      xml += `      <Row>
        <Cell><Data ss:Type="String">${t.account}: ${this.escapeXml(familyName)}</Data></Cell>
      </Row>
`;
    }

    xml += `      <Row/>
      <Row ss:StyleID="SubTitle">
        <Cell><Data ss:Type="String">${t.totalSummary}</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(monthName)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(prevMonthName)}</Data></Cell>
        <Cell><Data ss:Type="String">${t.change}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="Bold"><Data ss:Type="String">${t.expenses}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalExpenses}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${prevExpenses}</Data></Cell>
        <Cell ss:StyleID="${this.getChangeStyle(totalExpenses, prevExpenses, true)}"><Data ss:Type="String">${this.formatChange(totalExpenses, prevExpenses, t)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="Bold"><Data ss:Type="String">${t.income}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalIncome}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${prevIncome}</Data></Cell>
        <Cell ss:StyleID="${this.getChangeStyle(totalIncome, prevIncome, false)}"><Data ss:Type="String">${this.formatChange(totalIncome, prevIncome, t)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="Bold"><Data ss:Type="String">${t.balance}</Data></Cell>
        <Cell ss:StyleID="${totalIncome - totalExpenses >= 0 ? 'Good' : 'Bad'}"><Data ss:Type="Number">${totalIncome - totalExpenses}</Data></Cell>
        <Cell ss:StyleID="${prevIncome - prevExpenses >= 0 ? 'Good' : 'Bad'}"><Data ss:Type="Number">${prevIncome - prevExpenses}</Data></Cell>
        <Cell><Data ss:Type="String">${this.formatChange(totalIncome - totalExpenses, prevIncome - prevExpenses, t)}</Data></Cell>
      </Row>
      <Row/>
      <Row ss:StyleID="SubTitle">
        <Cell><Data ss:Type="String">${t.details}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">${t.expenseTransactions}</Data></Cell>
        <Cell><Data ss:Type="Number">${expenseCount}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">${t.incomeTransactions}</Data></Cell>
        <Cell><Data ss:Type="Number">${incomeCount}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">${t.avgExpense}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${avgExpense}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
`;

    // ===== Sheet 2: Categories =====
    xml += `  <Worksheet ss:Name="${t.sheetCategories}">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="60"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Row ss:StyleID="Title">
        <Cell><Data ss:Type="String">${t.expensesByCategory}: ${this.escapeXml(monthName)} ${year}</Data></Cell>
      </Row>
      <Row/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">${t.category}</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(monthName)}</Data></Cell>
        <Cell><Data ss:Type="String">%</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(prevMonthName)}</Data></Cell>
        <Cell><Data ss:Type="String">${t.change}</Data></Cell>
      </Row>
`;

    const expenseStats = stats.filter(s => s.type === 'expense').sort((a, b) => b.total - a.total);

    for (const s of expenseStats) {
      const percent = totalExpenses > 0 ? (s.total / totalExpenses) : 0;
      const prevTotal = prevByCategory[`${s.id}_expense`] || 0;
      const catName = this.escapeXml(s.name);

      xml += `      <Row>
        <Cell><Data ss:Type="String">${catName}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${s.total}</Data></Cell>
        <Cell><Data ss:Type="String">${(percent * 100).toFixed(1)}%</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${prevTotal}</Data></Cell>
        <Cell ss:StyleID="${this.getChangeStyle(s.total, prevTotal, true)}"><Data ss:Type="String">${this.formatChange(s.total, prevTotal, t)}</Data></Cell>
      </Row>
`;
    }

    xml += `      <Row/>
      <Row ss:StyleID="Bold">
        <Cell><Data ss:Type="String">${t.total}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalExpenses}</Data></Cell>
        <Cell><Data ss:Type="String">100%</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${prevExpenses}</Data></Cell>
        <Cell ss:StyleID="${this.getChangeStyle(totalExpenses, prevExpenses, true)}"><Data ss:Type="String">${this.formatChange(totalExpenses, prevExpenses, t)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
`;

    // ===== Sheet 3: Trend =====
    const trendLen = trend.length || 1;
    const totalTrendExpenses = trend.reduce((sum, tr) => sum + tr.expenses, 0);
    const totalTrendIncome = trend.reduce((sum, tr) => sum + tr.income, 0);
    const avgMonthlyExpense = totalTrendExpenses / trendLen;
    const avgMonthlyIncome = totalTrendIncome / trendLen;

    xml += `  <Worksheet ss:Name="${t.sheetTrend}">
    <Table>
      <Column ss:Width="80"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Row ss:StyleID="Title">
        <Cell><Data ss:Type="String">${t.trendFor} ${trendLen} ${t.monthsWordExcel}</Data></Cell>
      </Row>
      <Row/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">${t.month}</Data></Cell>
        <Cell><Data ss:Type="String">${t.expenses}</Data></Cell>
        <Cell><Data ss:Type="String">${t.income}</Data></Cell>
        <Cell><Data ss:Type="String">${t.balance}</Data></Cell>
      </Row>
`;

    for (const tr of trend) {
      const monthLabel = `${t.monthsShort[tr.month]} ${tr.year}`;
      xml += `      <Row>
        <Cell><Data ss:Type="String">${monthLabel}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${tr.expenses}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${tr.income}</Data></Cell>
        <Cell ss:StyleID="${tr.balance >= 0 ? 'Good' : 'Bad'}"><Data ss:Type="Number">${tr.balance}</Data></Cell>
      </Row>
`;
    }

    xml += `      <Row/>
      <Row ss:StyleID="SubTitle">
        <Cell><Data ss:Type="String">${t.total}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalTrendExpenses}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalTrendIncome}</Data></Cell>
        <Cell ss:StyleID="${totalTrendIncome - totalTrendExpenses >= 0 ? 'Good' : 'Bad'}"><Data ss:Type="Number">${totalTrendIncome - totalTrendExpenses}</Data></Cell>
      </Row>
      <Row ss:StyleID="Bold">
        <Cell><Data ss:Type="String">${t.avgPerMonth}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${avgMonthlyExpense}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${avgMonthlyIncome}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${avgMonthlyIncome - avgMonthlyExpense}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
`;

    // ===== Sheet 4: Transactions =====
    xml += `  <Worksheet ss:Name="${t.sheetTransactions}">
    <Table>
      <Column ss:Width="80"/>
      <Column ss:Width="60"/>
      <Column ss:Width="120"/>
      <Column ss:Width="80"/>
      <Column ss:Width="200"/>
      <Column ss:Width="100"/>
      <Column ss:Width="80"/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">${t.date}</Data></Cell>
        <Cell><Data ss:Type="String">${t.type}</Data></Cell>
        <Cell><Data ss:Type="String">${t.category}</Data></Cell>
        <Cell><Data ss:Type="String">${t.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${t.description}</Data></Cell>
        <Cell><Data ss:Type="String">${t.who}</Data></Cell>
        <Cell><Data ss:Type="String">${t.source}</Data></Cell>
      </Row>
`;

    for (const tr of transactions) {
      const dateStr = new Date(tr.transaction_date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU');
      const typeStr = tr.type === 'expense' ? t.expenseWord : t.incomeWord;
      const category = this.escapeXml(tr.category_name || '');
      const description = this.escapeXml(tr.description || '');
      const userName = this.escapeXml(tr.user_name || '');
      const sourceStr = tr.source === 'bank_import' ? t.sourceBankCSV
        : tr.source === 'saltedge' ? t.sourceBankAPI
        : t.sourceManual;

      xml += `      <Row>
        <Cell><Data ss:Type="String">${dateStr}</Data></Cell>
        <Cell><Data ss:Type="String">${typeStr}</Data></Cell>
        <Cell><Data ss:Type="String">${category}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${tr.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${description}</Data></Cell>
        <Cell><Data ss:Type="String">${userName}</Data></Cell>
        <Cell><Data ss:Type="String">${sourceStr}</Data></Cell>
      </Row>
`;
    }

    xml += `    </Table>
  </Worksheet>
`;

    // ===== Sheet 5: By user (if family) =====
    if (familyId) {
      const userStats = await ts.getStatsByUser(familyId, date);
      const prevUserStats = await ts.getStatsByUser(familyId, prevDate);
      const expensesByUser = userStats.filter(s => s.type === 'expense');

      const prevByUser = {};
      for (const u of prevUserStats.filter(s => s.type === 'expense')) {
        prevByUser[u.id] = u.total;
      }

      xml += `  <Worksheet ss:Name="${t.sheetMembers}">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="60"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Row ss:StyleID="Title">
        <Cell><Data ss:Type="String">${t.expensesByMembers}: ${this.escapeXml(familyName || t.family)}</Data></Cell>
      </Row>
      <Row/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">${t.member}</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(monthName)}</Data></Cell>
        <Cell><Data ss:Type="String">%</Data></Cell>
        <Cell><Data ss:Type="String">${this.escapeXml(prevMonthName)}</Data></Cell>
        <Cell><Data ss:Type="String">${t.change}</Data></Cell>
      </Row>
`;

      for (const u of expensesByUser) {
        const percent = totalExpenses > 0 ? (u.total / totalExpenses) : 0;
        const prevTotal = prevByUser[u.id] || 0;

        xml += `      <Row>
        <Cell><Data ss:Type="String">${this.escapeXml(u.display_name)}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${u.total}</Data></Cell>
        <Cell><Data ss:Type="String">${(percent * 100).toFixed(1)}%</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${prevTotal}</Data></Cell>
        <Cell ss:StyleID="${this.getChangeStyle(u.total, prevTotal, true)}"><Data ss:Type="String">${this.formatChange(u.total, prevTotal, t)}</Data></Cell>
      </Row>
`;
      }

      xml += `    </Table>
  </Worksheet>
`;
    }

    xml += `</Workbook>`;

    return xml;
  }

  formatChange(current, previous, t) {
    if (previous === 0) {
      if (current === 0) return '-';
      return t.new || 'new';
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(0)}%`;
  }

  getChangeStyle(current, previous, lessIsBetter = true) {
    if (previous === 0) return 'Neutral';
    const change = ((current - previous) / previous) * 100;

    if (lessIsBetter) {
      if (change < -5) return 'Good';
      if (change > 10) return 'Bad';
    } else {
      if (change > 5) return 'Good';
      if (change < -10) return 'Bad';
    }
    return 'Neutral';
  }

  escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  async getExportInfo(userId, date = new Date(), familyId = null, lang = 'en') {
    const { start, end } = getMonthRange(date);
    const transactions = await this.transactionService.getByPeriod(userId, start, end, familyId);
    const totalExpenses = await this.transactionService.getMonthTotal(userId, 'expense', date, familyId);
    const totalIncome = await this.transactionService.getMonthTotal(userId, 'income', date, familyId);

    return {
      count: transactions.length,
      expenses: totalExpenses,
      income: totalIncome,
      month: getMonthName(date, lang),
      year: date.getFullYear()
    };
  }
}
