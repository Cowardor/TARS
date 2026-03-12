const { chromium } = require('playwright');
const MINI_APP = 'file:///C:/Users/illia/Documents/TARS/finance-bot/mini-app.html';
const OUT = 'finance-bot/landing/assets';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  {
    id: 1, name: 'Personal', type: 'personal', color: '#4f46e5',
    emoji: null, _shared: false,
  },
  {
    id: 2, name: 'Investments', type: 'crypto', color: '#f59e0b',
    emoji: null, _shared: false,
    crypto_balances: [
      { symbol: 'BTC',  amount: 0.0821,  usd_value: 8450.30 },
      { symbol: 'ETH',  amount: 2.45,    usd_value: 6318.75 },
      { symbol: 'SOL',  amount: 18.5,    usd_value: 2368.00 },
      { symbol: 'USDT', amount: 1200.00, usd_value: 1200.00 },
      { symbol: 'BNB',  amount: 3.2,     usd_value: 1856.00 },
    ],
    crypto_synced_at: new Date(Date.now() - 8 * 60 * 1000).toISOString().replace('Z',''),
  },
  {
    id: 3, name: 'mBank', type: 'bank', color: '#e2001a',
    emoji: null, _shared: false,
  },
];

const hoursAgo = h => new Date(Date.now() - h * 3600000).toISOString();

const MOCK_PERSONAL_DASHBOARD = {
  balance: 4429.64,
  income: 8870.00,
  expenses: 2440.36,
  spent_percent: 27,
  recent: [
    { id: 101, type: 'expense', amount: 9.50,    category_name: 'Groceries', category_emoji: '🛒', created_at: hoursAgo(1),  note: 'Biedronka' },
    { id: 102, type: 'expense', amount: 4.20,    category_name: 'Coffee',    category_emoji: '☕', created_at: hoursAgo(3),  note: 'Costa Coffee' },
    { id: 103, type: 'income',  amount: 8870.00, category_name: 'Salary',    category_emoji: '💼', created_at: hoursAgo(48), note: 'Monthly salary' },
    { id: 104, type: 'expense', amount: 45.00,   category_name: 'Transport', category_emoji: '🚇', created_at: hoursAgo(50), note: 'Monthly pass' },
    { id: 105, type: 'expense', amount: 280.00,  category_name: 'Rent',      category_emoji: '🏠', created_at: hoursAgo(72), note: 'April rent' },
  ],
};

const MOCK_BANK_DASHBOARD = {
  balance: 12840.20,
  income: 8870.00,
  expenses: 2029.80,
  spent_percent: 23,
  recent: [
    { id: 201, type: 'expense', amount: 189.99,  category_name: 'Shopping',  category_emoji: '🛍️', created_at: hoursAgo(2),  note: 'Zara' },
    { id: 202, type: 'expense', amount: 62.40,   category_name: 'Groceries', category_emoji: '🛒', created_at: hoursAgo(5),  note: 'Lidl' },
    { id: 203, type: 'income',  amount: 8870.00, category_name: 'Salary',    category_emoji: '💼', created_at: hoursAgo(46), note: 'Monthly salary' },
    { id: 204, type: 'expense', amount: 45.50,   category_name: 'Utilities', category_emoji: '💡', created_at: hoursAgo(72), note: 'Electric bill' },
    { id: 205, type: 'expense', amount: 12.99,   category_name: 'Streaming', category_emoji: '🎬', created_at: hoursAgo(96), note: 'Netflix' },
  ],
};

const MOCK_INVEST_DASHBOARD = {
  balance: 20193.05,
  income: 20193.05,
  expenses: 0,
  spent_percent: 0,
  recent: [],
};

const DASHBOARD_WITH_COFFEE = {
  balance: 4417.64,
  income: 8870.00,
  expenses: 2452.36,
  spent_percent: 28,
  recent: [
    { id: 106, type: 'expense', amount: 12.00,   category_name: 'Coffee',    category_emoji: '☕', created_at: new Date().toISOString(),                         note: 'Voice input' },
    { id: 101, type: 'expense', amount: 9.50,    category_name: 'Groceries', category_emoji: '🛒', created_at: new Date(Date.now() - 3600000).toISOString(),     note: 'Whole Foods' },
    { id: 102, type: 'expense', amount: 4.20,    category_name: 'Coffee',    category_emoji: '☕', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), note: 'Costa Coffee' },
    { id: 103, type: 'income',  amount: 8870.00, category_name: 'Salary',    category_emoji: '💼', created_at: new Date(Date.now() - 48 * 3600000).toISOString(), note: 'Monthly salary' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(200);
}

async function setEnglish(page) {
  await page.evaluate(() => {
    if (typeof state !== 'undefined') state.language = 'en';
    if (typeof applyLanguage === 'function') applyLanguage();
    if (typeof applyTranslations === 'function') applyTranslations();
  });
  await page.waitForTimeout(150);
}

async function injectMockState(page, accounts, dashboard, currency, activeIndex) {
  await page.evaluate(({ accounts, dashboard, currency, activeIndex }) => {
    state.accounts = accounts;
    state.dashboardData = dashboard;
    state.userCurrency = currency;
    state.accountIndex = activeIndex;
    state.activeAccountId = accounts[activeIndex]?.id || null;
    state.language = 'en';
    if (typeof applyLanguage === 'function') applyLanguage();
    if (typeof renderAccountsCarousel === 'function') renderAccountsCarousel();
    if (typeof renderDashboard === 'function') renderDashboard();
  }, { accounts, dashboard, currency, activeIndex });
  await page.waitForTimeout(600);
}

async function hideOverlays(page) {
  await page.evaluate(() => {
    const auth = document.getElementById('authScreen');
    if (auth) auth.style.display = 'none';
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.voice-modal.show').forEach(m => m.classList.remove('show'));
    // Закрываем paywall/pro modal
    const paywall = document.getElementById('paywallOverlay');
    if (paywall) { paywall.classList.remove('show'); paywall.style.display = 'none'; }
    // Закрываем action sheet
    const sheet = document.getElementById('actionSheet');
    if (sheet) sheet.classList.remove('show');
    // Закрываем bank modal
    const bankModal = document.getElementById('bankModal');
    if (bankModal) bankModal.classList.remove('show');
    const fab = document.getElementById('mainFab');
    if (fab) fab.classList.remove('fab-hidden');
  });
}

async function injectCryptoAssets(page) {
  await page.evaluate((acc) => {
    const listId = `cryptoBalList${acc.id}`;
    const listEl = document.getElementById(listId);
    if (listEl) {
      listEl.innerHTML = (acc.crypto_balances || []).map(b =>
        `<div class="crypto-balance-row">
          <span class="crypto-symbol">${b.symbol}</span>
          <span class="crypto-amount">${b.amount.toFixed(4)}</span>
          <span class="crypto-usd">$${b.usd_value.toFixed(2)}</span>
        </div>`
      ).join('');
    }
    const totalUsd = (acc.crypto_balances || []).reduce((s, b) => s + (b.usd_value || 0), 0);
    const balEl = document.getElementById(`balAmt${acc.id}`);
    if (balEl) { balEl.textContent = `$${totalUsd.toFixed(2)}`; balEl.className = 'balance-amount positive'; }
  }, MOCK_ACCOUNTS[1]);
  await page.waitForTimeout(300);
}

// Take dark + light pair for a given setup function
async function shootBoth(page, name, setupFn) {
  for (const theme of ['dark', 'light']) {
    await setTheme(page, theme);
    await setupFn(page);
    const suffix = theme === 'dark' ? '' : '-light';
    await page.screenshot({ path: `${OUT}/${name}${suffix}.png` });
    console.log(`✅ ${name}${suffix}.png`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__forceLang = 'en';
    window.addEventListener('DOMContentLoaded', () => {
      const auth = document.getElementById('authScreen');
      if (auth) auth.style.display = 'none';
    });
  });

  await page.route('**/assets/logos/**', async (route) => {
    const url = route.request().url();
    const filename = url.split('/assets/logos/').pop();
    const localPath = `C:/Users/illia/Documents/TARS/finance-bot/public/assets/logos/${filename}`;
    try { await route.fulfill({ path: localPath }); }
    catch { await route.continue(); }
  });

  await page.goto(MINI_APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const auth = document.getElementById('authScreen');
    if (auth) auth.style.display = 'none';
    if (typeof state !== 'undefined') state.language = 'en';
    if (typeof applyLanguage === 'function') applyLanguage();
  });

  // ── 1. screen-home: personal account ──────────────────────────────────────
  await shootBoth(page, 'screen-home', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_PERSONAL_DASHBOARD, 'USD', 0);
    await setEnglish(p);
  });

  // ── 2. screen-stats: banking account with transactions ────────────────────
  await shootBoth(page, 'screen-stats', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_BANK_DASHBOARD, 'USD', 2);
    await p.evaluate(() => {
      if (typeof carouselGoTo === 'function') carouselGoTo(2);
      else if (typeof updateCarouselPosition === 'function') updateCarouselPosition(2);
    });
    await p.waitForTimeout(400);
    await setEnglish(p);
  });

  // ── 3. screen-crypto: investment wallet with assets ───────────────────────
  await shootBoth(page, 'screen-crypto', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_INVEST_DASHBOARD, 'USD', 1);
    await p.evaluate(() => {
      if (typeof carouselGoTo === 'function') carouselGoTo(1);
      else if (typeof updateCarouselPosition === 'function') updateCarouselPosition(1);
    });
    await p.waitForTimeout(400);
    await injectCryptoAssets(p);
    await p.evaluate(() => {
      // Скрываем битый chart-контейнер внизу
      document.querySelectorAll('.chart-img, .chart-placeholder, [id*="chartImg"], canvas').forEach(el => el.style.display = 'none');
      // Скрываем recent-transactions если пустые (показывают bitую иконку)
      const recentSection = document.querySelector('.recent-section, .recent-transactions, #recentList');
      if (recentSection && recentSection.querySelectorAll('.tx-item, .transaction-item').length === 0) {
        recentSection.style.display = 'none';
      }
      // Убираем broken image — любой img без src или с ошибкой загрузки
      document.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) img.style.display = 'none';
      });
    });
    await p.waitForTimeout(200);
    await setEnglish(p);
  });

  // ── 4. screen-open-banking: Millennium Bank confirmation ─────────────────
  await shootBoth(page, 'screen-open-banking', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_PERSONAL_DASHBOARD, 'USD', 0);
    await p.evaluate(() => {
      const toast = document.getElementById('successToast');
      if (toast) toast.classList.remove('show');
      if (typeof openBankModal === 'function') openBankModal();
      else document.getElementById('bankModal').classList.add('show');
      if (typeof selectBank === 'function') selectBank('millennium');
      const fab = document.getElementById('mainFab');
      if (fab) fab.classList.add('fab-hidden');
    });
    await p.waitForTimeout(600);
    await setEnglish(p);
  });

  // ── 5. screen-voice-input: listening state ────────────────────────────────
  await shootBoth(page, 'screen-voice-input', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_PERSONAL_DASHBOARD, 'USD', 0);
    await p.evaluate(() => {
      if (typeof openVoiceModal === 'function') openVoiceModal();
      else document.getElementById('voiceModal').classList.add('show');
      const fab = document.getElementById('mainFab');
      if (fab) fab.classList.add('fab-hidden');
      const hint = document.getElementById('voiceListeningHint');
      if (hint) hint.textContent = '🎤 Listening...';
    });
    await p.waitForTimeout(500);
    await setEnglish(p);
  });

  // ── 6. screen-voice-result: after recognition ─────────────────────────────
  await shootBoth(page, 'screen-voice-result', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_PERSONAL_DASHBOARD, 'USD', 0);
    await p.evaluate(() => {
      if (typeof openVoiceModal === 'function') openVoiceModal();
      else document.getElementById('voiceModal').classList.add('show');
      const fab = document.getElementById('mainFab');
      if (fab) fab.classList.add('fab-hidden');
    });
    await p.waitForTimeout(300);
    // setEnglish первым — иначе applyLanguage() сбросит текст на placeholder
    await setEnglish(p);
    await p.evaluate(() => {
      const resultEl = document.getElementById('voiceResultText');
      if (resultEl) {
        resultEl.textContent = 'Coffee 12 USD';
        resultEl.style.color = 'var(--text-primary)';
        resultEl.style.fontStyle = 'normal';
        resultEl.style.fontWeight = '500';
      }
      const hint = document.getElementById('voiceListeningHint');
      if (hint) hint.textContent = '✓ Recognized';
      const btn = document.getElementById('voiceAddBtn');
      if (btn) btn.style.opacity = '1';
    });
    await p.waitForTimeout(200);
  });

  // ── 7. screen-voice-added: dashboard with toast ───────────────────────────
  await shootBoth(page, 'screen-voice-added', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, DASHBOARD_WITH_COFFEE, 'USD', 0);
    await p.evaluate(() => {
      const toast = document.getElementById('successToast');
      const toastText = document.getElementById('toastText');
      if (toast && toastText) {
        toastText.textContent = 'Coffee — $12.00 added';
        toast.classList.add('show');
      }
    });
    await p.waitForTimeout(500);
    await setEnglish(p);
  });

  // ── 8. screen-crypto-stats: statistics tab for crypto/investments account ─
  await shootBoth(page, 'screen-crypto-stats', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_INVEST_DASHBOARD, 'USD', 1);
    await setEnglish(p);
    // Переключаемся на таб Statistics и вручную заполняем crypto stats DOM
    await p.evaluate((acc) => {
      // Скрываем toast от предыдущего скрина
      const toast = document.getElementById('successToast');
      if (toast) toast.classList.remove('show');
      // Переключить таб без анимации
      const track = document.getElementById('screenTrack');
      if (track) { track.style.transition = 'none'; track.style.transform = 'translateX(-25%)'; }
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const statsBtn = document.querySelector('.nav-item[data-tab="stats"]');
      if (statsBtn) statsBtn.classList.add('active');
      state.currentTab = 'stats';

      // Показываем crypto view, скрываем regular
      document.getElementById('regularStatsView').style.display = 'none';
      const cv = document.getElementById('cryptoStatsView');
      cv.style.display = '';

      // Exchange label
      document.getElementById('cryptoStatsExchange').textContent = 'BINANCE';

      // Portfolio total
      const coins = acc.crypto_balances;
      const totalUsd = coins.reduce((s, c) => s + c.usd_value, 0);
      document.getElementById('cryptoPortfolioTotal').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--text-primary);font-family:'DM Mono',monospace;">$${totalUsd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div class="portfolio-perf pos" style="margin-top:4px;">↑ +$1,243.80 (+6.56%) <span style="opacity:0.55;font-weight:400;font-size:10px;">24h</span></div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">Updated 8 min ago</div>
      `;

      // Coin list
      const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899'];
      const stackedBar = `
        <div class="alloc-stacked-bar">
          ${coins.map((c,i)=>`<div class="alloc-seg" style="width:${(c.usd_value/totalUsd*100).toFixed(1)}%;background:${COLORS[i%COLORS.length]};"></div>`).join('')}
        </div>
        <div class="alloc-legend">
          ${coins.map((c,i)=>`<span class="alloc-legend-item"><span class="alloc-legend-dot" style="background:${COLORS[i%COLORS.length]}"></span>${c.symbol} ${(c.usd_value/totalUsd*100).toFixed(1)}%</span>`).join('')}
        </div>`;
      const CHANGES = { BTC: 4.2, ETH: 5.8, SOL: 11.3, USDT: 0.01, BNB: 3.7 };
      const rows = coins.map((c,i)=>{
        const pct = (c.usd_value/totalUsd*100).toFixed(0);
        const ch = CHANGES[c.symbol] || 0;
        return `<div class="breakdown-item">
          <div class="breakdown-color" style="background:${COLORS[i%COLORS.length]}"></div>
          <div class="breakdown-icon" style="font-size:11px;font-weight:600;font-family:'DM Mono',monospace;">${c.symbol}</div>
          <div class="breakdown-info">
            <div class="breakdown-category" style="display:flex;align-items:center;justify-content:space-between;">${c.symbol}<span class="coin-perf pos">+${ch}%</span></div>
            <div class="breakdown-bar"><div class="breakdown-bar-fill" style="width:${pct}%;background:${COLORS[i%COLORS.length]}"></div></div>
          </div>
          <div class="breakdown-right">
            <div class="breakdown-amount">$${c.usd_value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            <div class="breakdown-percent" style="font-family:'DM Mono',monospace;">${c.amount.toFixed(4)}</div>
          </div>
        </div>`;
      }).join('');
      document.getElementById('cryptoCoinList').innerHTML = stackedBar + rows;
      document.getElementById('cryptoChartSection').style.display = 'none';
    }, MOCK_ACCOUNTS[1]);
    await p.waitForTimeout(400);
  });

  // ── 9. screen-add: action sheet (FAB menu) ───────────────────────────────
  await shootBoth(page, 'screen-add', async (p) => {
    await hideOverlays(p);
    await injectMockState(p, MOCK_ACCOUNTS, MOCK_PERSONAL_DASHBOARD, 'USD', 0);
    await setEnglish(p);
    await p.evaluate(() => {
      // Скрываем toast если остался от предыдущего скрина
      const toast = document.getElementById('successToast');
      if (toast) toast.classList.remove('show');
      if (typeof openActionSheet === 'function') openActionSheet();
      else document.getElementById('actionSheet').classList.add('show');
    });
    await p.waitForTimeout(400);
  });

  await browser.close();
  console.log('\nAll 16 screenshots ready!');
})();
