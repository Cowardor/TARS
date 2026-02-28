import { chromium } from 'playwright';
import { resolve } from 'path';

const htmlPath = resolve('finance-bot/mini-app.html');
const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

console.log('🔍 Проверяю:', fileUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
const warnings = [];

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
  if (msg.type() === 'warning') warnings.push(msg.text());
});
page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(e => {
  console.error('Не удалось загрузить страницу:', e.message);
});

await page.waitForTimeout(1500);

// ── Bypass auth screen — inject fake Telegram WebApp + skip auth ──────────────
await page.evaluate(() => {
  // Fake Telegram initData so apiFetch doesn't bail
  window.Telegram = {
    WebApp: {
      initData: 'user=%7B%22id%22%3A123456%7D&hash=fakehash',
      initDataUnsafe: { user: { id: 123456, first_name: 'Test', language_code: 'ru' } },
      ready: () => {},
      expand: () => {},
      close: () => {},
      HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
      setHeaderColor: () => {},
      setBackgroundColor: () => {},
      MainButton: { show: () => {}, hide: () => {} },
      colorScheme: 'dark',
    }
  };

  // Hide auth screen, show main app directly
  const auth = document.getElementById('authScreen');
  const app  = document.getElementById('app');
  if (auth) auth.style.display = 'none';
  if (app)  app.style.display = '';

  // Init state with minimal data so UI renders
  if (typeof state !== 'undefined') {
    state.userCurrency = 'USD';
    state.accounts = [];
    state.accountIndex = 0;
    state.activeAccountId = null;
  }

  // Try calling init functions if they exist
  if (typeof renderAccountsCarousel === 'function') renderAccountsCarousel();
});

await page.waitForTimeout(800);

// ── 1. Главный экран ──────────────────────────────────────────────────────────
await page.screenshot({ path: 'check-1-home.png', fullPage: false });
console.log('\n📸 [1] Главный экран → check-1-home.png');

// ── 2. Открываем кнопку плюс (FAB) ───────────────────────────────────────────
const fab = await page.$('#mainFab');
if (fab) {
  await fab.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'check-2-fab-open.png', fullPage: false });
  console.log('📸 [2] FAB открыт → check-2-fab-open.png');

  // Ищем пункт "Новый счёт" / "Добавить счёт" в action sheet
  const actionItems = await page.$$('.action-sheet-item');
  console.log(`   Action sheet items: ${actionItems.length}`);
  for (const item of actionItems) {
    const txt = await item.innerText().catch(() => '');
    console.log(`   - "${txt.trim()}"`);
  }
} else {
  console.log('❌ FAB (#mainFab) не найден');
}

// ── 3. Нажимаем "Новый счёт" ─────────────────────────────────────────────────
// Ищем по тексту среди action-sheet-item
const allActionItems = await page.$$('.action-sheet-item');
let newAccItem = null;
for (const item of allActionItems) {
  const txt = await item.innerText().catch(() => '');
  if (txt.includes('счёт') || txt.includes('Счёт') || txt.includes('account') || txt.includes('Account')) {
    newAccItem = item;
    break;
  }
}
// fallback: второй item
if (!newAccItem && allActionItems.length >= 2) newAccItem = allActionItems[1];

if (newAccItem) {
  const txt = await newAccItem.innerText().catch(() => '');
  console.log(`\n   Кликаем на: "${txt.trim().slice(0,50)}"`);
  await newAccItem.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'check-3-new-account-modal.png', fullPage: false });
  console.log('📸 [3] Модал создания счёта → check-3-new-account-modal.png');
} else {
  console.log('❌ Пункт "Новый счёт" не найден');
}

// ── 4. Выбираем шаблон Инвестиции (crypto) ───────────────────────────────────
const cryptoCard = await page.$('[data-template="crypto"]');
if (cryptoCard) {
  await cryptoCard.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'check-4-crypto-template.png', fullPage: false });
  console.log('📸 [4] Шаблон Инвестиции выбран → check-4-crypto-template.png');

  // Проверяем видимость crypto fields
  const cryptoFields = await page.$('#cryptoFields');
  const visible = await cryptoFields?.isVisible().catch(() => false);
  console.log(`   #cryptoFields visible: ${visible}`);

  // Проверяем exchange trigger
  const trigger = await page.$('#exchangeTrigger');
  if (trigger) {
    const triggerVisible = await trigger.isVisible();
    console.log(`   #exchangeTrigger visible: ${triggerVisible}`);

    // Внутренности тригера — иконка и текст
    const iconHTML = await page.evaluate(() => {
      const icon = document.querySelector('#exchangeTrigger .picker-trigger-icon');
      return icon ? icon.innerHTML.trim().slice(0, 120) : 'NOT FOUND';
    });
    const labelText = await page.evaluate(() => {
      const lbl = document.querySelector('#exchangeTrigger .picker-trigger-text');
      return lbl ? lbl.textContent.trim() : 'NOT FOUND';
    });
    console.log(`   Trigger label: "${labelText}"`);
    console.log(`   Trigger icon HTML (120 chars): ${iconHTML}`);
  } else {
    console.log('   ❌ #exchangeTrigger не найден');
  }
} else {
  console.log('❌ [data-template="crypto"] не найден');
}

// ── 5. Открываем пикер биржи ──────────────────────────────────────────────────
const exchTrigger = await page.$('#exchangeTrigger');
if (exchTrigger && await exchTrigger.isVisible()) {
  await exchTrigger.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'check-5-exchange-picker.png', fullPage: false });
  console.log('📸 [5] Пикер биржи → check-5-exchange-picker.png');

  // Собираем все items пикера
  const pickerItems = await page.evaluate(() => {
    const items = document.querySelectorAll('#customPickerModal .picker-item, #customPickerModal .custom-picker-item');
    return Array.from(items).map(el => ({
      text: el.innerText?.trim().slice(0, 60),
      hasIcon: !!el.querySelector('svg, img'),
      iconHTML: el.querySelector('.picker-item-icon, .custom-picker-icon, [class*="icon"]')?.innerHTML?.slice(0, 80) || '',
    }));
  });

  console.log(`\n   Найдено items в пикере: ${pickerItems.length}`);
  pickerItems.forEach((it, i) => {
    console.log(`   [${i}] text: "${it.text}" | hasIcon: ${it.hasIcon}`);
    if (it.iconHTML) console.log(`       icon: ${it.iconHTML.slice(0,80)}`);
  });

  // Скриншот пикера крупнее
  const picker = await page.$('#customPickerModal');
  if (picker) {
    await picker.screenshot({ path: 'check-5b-exchange-picker-zoom.png' });
    console.log('📸 [5b] Зум пикера → check-5b-exchange-picker-zoom.png');
  }
} else {
  console.log('⚠️  exchangeTrigger не кликабелен или не виден');
}

// ── 6. Базовые проверки ───────────────────────────────────────────────────────
const fonts = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

console.log('\n========== РЕЗУЛЬТАТ ПРОВЕРКИ ==========');
if (errors.length === 0) {
  console.log('✅ JS ошибок нет');
} else {
  console.log(`❌ JS ошибки (${errors.length}):`);
  errors.forEach(e => console.log('   -', e));
}
console.log(`ℹ️  Шрифты: ${fonts.slice(0, 80)}`);
console.log('=========================================');

await browser.close();
