/**
 * check-app.mjs — visual audit of Alar Finance mini-app
 * Usage: node check-app.mjs
 * Requires: playwright already installed in project
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'https://finance-bot.alar-app.workers.dev/app';
const OUT  = './check-screenshots';
mkdirSync(OUT, { recursive: true });

// ── Mock API responses ─────────────────────────────────────────────────────
const MOCK_USER = { id: 1, telegram_id: 999999, name: 'Test User', currency: 'USD', language: 'ru' };
const MOCK_DATA = {
    balance: 1250.50, total_income: 3000, total_expense: 1749.50,
    recent_transactions: [
        { id: 1, type: 'expense', amount: 45.00, category_name: 'Продукты', category_emoji: '🛒', description: 'Ашан', date: '2026-02-28', account_id: null },
        { id: 2, type: 'income',  amount: 3000,  category_name: 'Зарплата', category_emoji: '💼', description: '',    date: '2026-02-01', account_id: null },
    ],
};
const MOCK_CATEGORIES = {
    expense: [
        { id: 1, name: 'Продукты',    emoji: '🛒', type: 'expense', owner_type: 'system' },
        { id: 2, name: 'Транспорт',   emoji: '🚗', type: 'expense', owner_type: 'system' },
        { id: 3, name: 'Квартира',    emoji: '🏠', type: 'expense', owner_type: 'system' },
    ],
    income: [
        { id: 10, name: 'Зарплата', emoji: '💼', type: 'income', owner_type: 'system' },
        { id: 11, name: 'Подарок',  emoji: '🎁', type: 'income', owner_type: 'system' },
    ],
};
const MOCK_ACCOUNTS = [
    { id: 1, name: 'Бизнес', emoji: '💼', type: 'business', color: '#4f46e5' },
    { id: 2, name: 'Крипто', emoji: '₿',  type: 'crypto',   color: '#f59e0b', crypto_exchange: 'binance' },
];

function mockRoutes(page) {
    page.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }) }));
    page.route('**/api/data', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_DATA, user: MOCK_USER, categories: MOCK_CATEGORIES,
            accounts: MOCK_ACCOUNTS, active_account_id: null, active_family_id: null,
            language: 'ru', currency: 'USD' }) }));
    page.route('**/api/categories', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_CATEGORIES) }));
    page.route('**/api/transactions*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ transactions: MOCK_DATA.recent_transactions, total: 2 }) }));
    page.route('**/api/stats*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ by_category: [], trend: [], total_expense: 1749.50, total_income: 3000 }) }));
    page.route('**/api/accounts*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ accounts: MOCK_ACCOUNTS }) }));
    page.route('**/api/budgets*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ budgets: [] }) }));
    page.route('**/api/family*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ family: null }) }));
    // Pass through static assets
    page.route('**/*.{svg,png,jpg,css,woff2}', r => r.continue());
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    colorScheme: 'dark',
    storageState: {
        origins: [{
            origin: 'https://finance-bot.alar-app.workers.dev',
            localStorage: [{ name: 'alar_session', value: 'mock-session-preview-999' }],
        }],
    },
});
const page = await ctx.newPage();
await mockRoutes(page);

async function shot(name) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`📸 ${name}`);
}

console.log('Opening app…');
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await shot('01-home');

// FAB → Action Sheet
await page.locator('#mainFab').click({ force: true });
await shot('02-action-sheet');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Open New Account modal via JS
await page.evaluate(() => openNewAccount?.());
await shot('03-new-account-personal');

// Crypto template
await page.evaluate(() => selectAccountTemplate?.('crypto'));
await shot('04-new-account-crypto');

// Exchange picker
await page.locator('#exchangeTrigger').click({ force: true });
await shot('05-exchange-picker');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Close new account modal and all pickers
await page.evaluate(() => {
    closeCustomPicker?.();
    closeNewAccount?.();
    document.querySelectorAll('.modal-overlay.show').forEach(el => el.classList.remove('show'));
});
await page.waitForTimeout(500);

// Open Add Modal
await page.evaluate(() => openAddModal?.());
await shot('06-add-modal-expense');
await page.evaluate(() => closeAddModal?.());
await page.waitForTimeout(300);

// Stats tab
await page.evaluate(() => switchTab?.('stats'));
await shot('07-stats');

// History tab
await page.evaluate(() => switchTab?.('history'));
await shot('08-history');

// Settings tab
await page.evaluate(() => switchTab?.('settings'));
await shot('09-settings');

await browser.close();
console.log(`\n✅ Done — screenshots saved to ${OUT}/`);
