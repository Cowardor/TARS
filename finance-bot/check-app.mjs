/**
 * check-app.mjs — visual audit of Alar Finance mini-app
 * Usage: node check-app.mjs
 * Requires: playwright already installed in project
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'https://finance-bot.alar-app.workers.dev/app';
const OUT  = './check-screenshots';
mkdirSync(OUT, { recursive: true });

// ── Mock API responses ─────────────────────────────────────────────────────
const MOCK_USER = { id: 1, telegram_id: '999999', name: 'Test User', currency: 'USD', language: 'ru',
    daily_reminder: 1, monthly_report: 1 };

const MOCK_DASHBOARD = {
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
    { id: 29, name: 'Personal', emoji: '👤', type: 'personal', color: null, sort_order: 0 },
    { id: 52, name: 'Business', emoji: '💼', type: 'business', color: '#4f46e5', sort_order: 1 },
    { id: 38, name: 'Investments', emoji: '₿', type: 'crypto', color: '#f59e0b', sort_order: 2, crypto_exchange: 'binance' },
];

const MOCK_FAMILY = {
    families: [
        { id: 1, name: 'Семья Тест', owner_id: 1, role: 'owner' },
    ],
    active_family_id: 1,
};

const MOCK_FAMILY_MEMBERS = {
    members: [
        { id: 1, name: 'Test User', first_name: 'Test', role: 'owner', joined_at: '2026-01-01' },
        { id: 2, name: 'Partner', first_name: 'Partner', role: 'member', joined_at: '2026-01-15' },
    ],
};

const MOCK_SHARED_ACCOUNTS = {
    shared_accounts: [
        { account_id: 52, account_name: 'Business', account_type: 'business', shared_by: 'Test', shared_by_user_id: 1, permission: 'readwrite' },
    ],
    my_shared: [52], // Business is shared
};

function mockRoutes(page) {
    // Auth
    page.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }) }));

    // User info
    page.route('**/api/user', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_USER, active_family_id: 1, active_account_id: null }) }));

    // Dashboard
    page.route('**/api/dashboard*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_DASHBOARD) }));

    // Categories
    page.route('**/api/categories*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_CATEGORIES) }));

    // Transactions
    page.route('**/api/transactions*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ transactions: MOCK_DASHBOARD.recent_transactions, total: 2 }) }));

    // Stats
    page.route('**/api/stats*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ by_category: [], trend: [], total_expense: 1749.50, total_income: 3000 }) }));

    // Accounts (match specific routes first, then wildcard)
    page.route('**/api/accounts/switch', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) }));
    page.route('**/api/accounts', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ accounts: MOCK_ACCOUNTS }) }));

    // Budgets
    page.route('**/api/budgets*', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ budgets: [] }) }));

    // Family — specific routes first
    page.route('**/api/family/shared-accounts', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_SHARED_ACCOUNTS) }));
    page.route('**/api/family/members', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_FAMILY_MEMBERS) }));
    page.route('**/api/family/switch', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) }));
    page.route('**/api/family/invite', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ code: 'ABC123' }) }));
    page.route('**/api/family', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_FAMILY) }));

    // Notifications
    page.route('**/api/notifications', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) }));
    page.route('**/api/language', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) }));

    // Pass through static assets
    page.route('**/*.{svg,png,jpg,css,woff2}', r => r.continue());
}

// ── Launch browser ─────────────────────────────────────────────────────────
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

// Collect console errors & API calls
const jsErrors = [];
const apiCalls = [];
page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
});
page.on('pageerror', err => jsErrors.push(`PAGE ERROR: ${err.message}`));
page.on('response', res => {
    const url = res.url();
    if (url.includes('/api/')) {
        apiCalls.push({ url: url.replace(/.*\.dev/, ''), status: res.status() });
    }
});

await mockRoutes(page);

async function shot(name) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`📸 ${name}`);
}

// Helper: dump DOM state for debugging
async function dumpState(label) {
    const info = await page.evaluate(() => {
        try {
            return {
                accountsCount: state.accounts?.length || 0,
                accountTypes: (state.accounts || []).map(a => `${a.name}(${a.type})`),
                accountIndex: state.accountIndex,
                activeAccountId: state.activeAccountId,
                currentTab: state.currentTab,
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    console.log(`  [${label}] state:`, JSON.stringify(info));
}

console.log('Opening app…');
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await dumpState('after-load');
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

// ── Shared Access / Family modal ────────────────────────────────────────────
console.log('\n--- Testing Shared Access modal ---');
await page.evaluate(() => openFamilyManager?.());
await page.waitForTimeout(1500);
await dumpState('family-modal-open');

// Check if shared accounts section is visible
const sharedSectionVisible = await page.evaluate(() => {
    const el = document.getElementById('familySharedAccountsSection');
    return el ? { display: el.style.display, innerHTML: el.innerHTML.substring(0, 500) } : null;
});
console.log('  Shared section:', JSON.stringify(sharedSectionVisible));

const togglesList = await page.evaluate(() => {
    const el = document.getElementById('familySharedAccountsList');
    return el ? { innerHTML: el.innerHTML.substring(0, 500), childCount: el.children.length } : null;
});
console.log('  Toggles list:', JSON.stringify(togglesList));

await shot('10-family-shared-access');

// Scroll down in the family modal to see shared accounts section
await page.evaluate(() => {
    const modal = document.getElementById('familyManager');
    const content = modal?.querySelector('.modal-content');
    if (content) content.scrollTop = content.scrollHeight;
});
await page.waitForTimeout(300);
await shot('11-family-shared-scrolled');

// Close family modal
await page.evaluate(() => {
    document.getElementById('familyManager')?.classList.remove('show');
});
await page.waitForTimeout(300);

// ── Carousel swipe test — check FAB on each account ──────────────────────────
console.log('\n--- Testing carousel accounts & FAB ---');
for (let i = 0; i < MOCK_ACCOUNTS.length; i++) {
    try {
        await page.evaluate((idx) => switchToAccountIndex?.(idx), i);
        await page.waitForTimeout(500);
        const fabHidden = await page.evaluate(() => {
            const fab = document.getElementById('mainFab');
            return fab?.classList.contains('fab-hidden') || false;
        });
        const accName = MOCK_ACCOUNTS[i].name;
        console.log(`  Account[${i}] "${accName}": FAB hidden = ${fabHidden}`);
        await shot(`12-carousel-${i}-${accName.toLowerCase()}`);
    } catch (e) {
        console.log(`  Account[${i}] "${MOCK_ACCOUNTS[i].name}": ERROR — ${e.message.split('\n')[0]}`);
    }
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n--- API Calls ---');
apiCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));

console.log('\n--- JS Errors ---');
if (jsErrors.length === 0) {
    console.log('  No JS errors detected ✅');
} else {
    jsErrors.forEach(e => console.log(`  ❌ ${e}`));
}

await browser.close();
console.log(`\n✅ Done — screenshots saved to ${OUT}/`);
