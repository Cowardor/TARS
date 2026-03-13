# Dev Prompt: Receipt Scanning — Alar Finance

**Дата:** 2026-03-13
**Фича:** Сканирование чеков с автоматическим добавлением расходов
**Приоритет:** P1
**Стек:** Cloudflare Workers + D1 + Groq Vision + mini-app.html

---

## Скопируй в новый чат:

```
Ты — Senior Developer в команде Alar. Реализуй функцию сканирования чеков для Alar Finance.

ОБЯЗАТЕЛЬНО: Прочитай CLAUDE.md и docs/DESIGN_SYSTEM.md перед любыми изменениями UI.

---

## КОНТЕКСТ ПРОЕКТА

Alar Finance — Telegram Mini App + PWA для учёта финансов.
Стек: Cloudflare Workers (index.js), D1 SQLite (DB), KV (сессии), Groq API (уже подключён).

Ключевые файлы:
- finance-bot/src/index.js — главный роутер Worker (3500+ строк)
- finance-bot/src/api/miniapp.js — REST API для Mini App (1300+ строк)
- finance-bot/src/api/voice.js — пример audio → Groq → parse → транзакция
- finance-bot/src/services/account.js — работа со счетами
- finance-bot/mini-app.html — Single-file фронтенд (9000+ строк)
- finance-bot/public/app/index.html — задеплоенная копия (ВСЕГДА редактировать оба файла!)

Уже есть: auth (resolveUser), шифрование (AES-256-GCM в utils/crypto.js),
категории, транзакции, голосовой ввод через Groq.

---

## ЧТО НУЖНО ПОСТРОИТЬ

### Пользовательский флоу:
1. В Action Sheet (FAB) добавляется кнопка "Scan Receipt"
2. Открывается модал: камера или выбор фото из галереи
3. Фото → Worker → Groq Vision → парсинг чека
4. Показывается preview: магазин, дата, список позиций, итог
5. Пользователь подтверждает → создаётся транзакция (или несколько)
6. При первом использовании — consent popup для аналитики (опционально)

---

## BACKEND

### 1. База данных — новые таблицы

Добавь в finance-bot/src/db/schema.sql (и выполни миграцию через wrangler d1 execute):

```sql
-- Хранение чеков
CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
    merchant_name TEXT,
    merchant_category TEXT,
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    receipt_date TEXT,
    raw_text TEXT,           -- сырой OCR текст
    image_key TEXT,          -- ключ в R2 (опционально, если добавишь хранение)
    share_analytics INTEGER DEFAULT 0,  -- 0 = не делится, 1 = делится
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Позиции чека (SKU-уровень, для аналитики)
CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    total_price REAL NOT NULL,
    category_guess TEXT      -- категория угаданная AI
);

-- Согласие пользователя на аналитику чеков
ALTER TABLE users ADD COLUMN receipt_analytics INTEGER DEFAULT NULL;
-- NULL = не спрашивали, 0 = отказ, 1 = согласие
```

### 2. Новый файл: finance-bot/src/api/receipt.js

```js
import { resolveUser } from './auth.js';

const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview';

export async function handleReceipt(request, env, pathname) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
    }

    const user = await resolveUser(request, env);
    if (!user) return error('Unauthorized', 401);

    if (pathname === '/api/receipt/scan' && request.method === 'POST') {
        return scanReceipt(request, env, user);
    }

    if (pathname === '/api/receipt/confirm' && request.method === 'POST') {
        return confirmReceipt(request, env, user);
    }

    if (pathname === '/api/receipt/consent' && request.method === 'POST') {
        return setConsent(request, env, user);
    }

    if (pathname === '/api/receipts' && request.method === 'GET') {
        return listReceipts(request, env, user);
    }

    return error('Not found', 404);
}

// ── Scan: фото → Groq Vision → структурированный результат ──────────────────
async function scanReceipt(request, env, user) {
    if (!env.GROQ_API_KEY) return error('GROQ_API_KEY not configured', 500);

    const formData = await request.formData();
    const imageFile = formData.get('image');
    if (!imageFile) return error('No image provided', 400);

    // Конвертируем в base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const mimeType = imageFile.type || 'image/jpeg';

    const prompt = `You are a receipt OCR expert. Extract all information from this receipt image.

Return ONLY valid JSON in this exact format:
{
  "merchant_name": "Store name",
  "merchant_category": "grocery|restaurant|pharmacy|electronics|clothing|transport|other",
  "receipt_date": "YYYY-MM-DD or null",
  "currency": "PLN|USD|EUR|UAH|etc",
  "items": [
    { "name": "Product name", "quantity": 1, "unit_price": 9.99, "total_price": 9.99, "category_guess": "food|drink|household|personal_care|other" }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "raw_text": "full text from receipt"
}

Rules:
- Extract EVERY line item from the receipt
- If you cannot read something clearly, use null
- Prices should be numbers (not strings)
- Return ONLY the JSON, no explanations`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_VISION_MODEL,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                    { type: 'text', text: prompt },
                ],
            }],
            max_tokens: 2048,
            temperature: 0.1,
        }),
    });

    if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('Groq Vision error:', errText);
        return error('Vision processing failed', 502);
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content || '';

    let parsed;
    try {
        // Вытащить JSON даже если есть мусор вокруг
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found');
        parsed = JSON.parse(match[0]);
    } catch (e) {
        console.error('Failed to parse Groq response:', content);
        return error('Could not parse receipt', 422);
    }

    // Маппинг категории магазина → категория транзакции
    const categoryMap = {
        grocery: 'Groceries',
        restaurant: 'Dining',
        pharmacy: 'Health',
        electronics: 'Shopping',
        clothing: 'Shopping',
        transport: 'Transport',
        other: 'Other',
    };
    const suggestedCategory = categoryMap[parsed.merchant_category] || 'Other';

    return json({
        success: true,
        receipt: parsed,
        suggested_category: suggestedCategory,
        // Передаём пользователю для подтверждения
    });
}

// ── Confirm: пользователь подтвердил → создаём транзакцию ───────────────────
async function confirmReceipt(request, env, user) {
    const body = await request.json();
    const {
        receipt,          // объект из scanReceipt
        category_id,      // выбранная пользователем категория
        account_id,       // активный счёт
        split_items,      // false = одна транзакция, true = по позициям
        share_analytics,  // согласие на аналитику (boolean)
    } = body;

    if (!receipt?.total || receipt.total <= 0) return error('Invalid receipt total', 400);

    // Получить активный account_id и family_id из сессии
    const session = user.telegram_id
        ? await env.DB.prepare('SELECT active_account_id, active_family_id FROM user_sessions WHERE telegram_id = ?').bind(user.telegram_id).first()
        : null;
    const activeAccountId = account_id || session?.active_account_id || null;
    const familyId = session?.active_family_id || null;

    // Сохранить чек в БД
    const receiptRow = await env.DB.prepare(`
        INSERT INTO receipts (user_id, account_id, family_id, merchant_name, merchant_category,
                              total_amount, currency, receipt_date, raw_text, share_analytics)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
    `).bind(
        user.id, activeAccountId, familyId,
        receipt.merchant_name || null,
        receipt.merchant_category || null,
        receipt.total,
        receipt.currency || 'USD',
        receipt.receipt_date || null,
        receipt.raw_text || null,
        share_analytics ? 1 : 0,
    ).first();

    const receiptId = receiptRow?.id;

    // Сохранить позиции (для аналитики)
    if (receiptId && receipt.items?.length > 0) {
        const itemStmt = env.DB.prepare(`
            INSERT INTO receipt_items (receipt_id, name, quantity, unit_price, total_price, category_guess)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        await env.DB.batch(receipt.items.map(item =>
            itemStmt.bind(receiptId, item.name, item.quantity || 1, item.unit_price || null, item.total_price, item.category_guess || null)
        ));
    }

    // Создать транзакцию(и)
    const transactions = [];

    if (split_items && receipt.items?.length > 0) {
        // Отдельная транзакция для каждой позиции
        for (const item of receipt.items) {
            const tx = await env.DB.prepare(`
                INSERT INTO transactions (user_id, account_id, family_id, type, amount, category_id, description, date)
                VALUES (?, ?, ?, 'expense', ?, ?, ?, ?)
                RETURNING *
            `).bind(
                user.id, activeAccountId, familyId,
                item.total_price,
                category_id,
                item.name,
                receipt.receipt_date || new Date().toISOString().split('T')[0],
            ).first();
            transactions.push(tx);
        }
    } else {
        // Одна транзакция — итог чека
        const tx = await env.DB.prepare(`
            INSERT INTO transactions (user_id, account_id, family_id, type, amount, category_id, description, date)
            VALUES (?, ?, ?, 'expense', ?, ?, ?, ?)
            RETURNING *
        `).bind(
            user.id, activeAccountId, familyId,
            receipt.total,
            category_id,
            receipt.merchant_name || 'Receipt',
            receipt.receipt_date || new Date().toISOString().split('T')[0],
        ).first();
        transactions.push(tx);
    }

    return json({ success: true, transactions, receipt_id: receiptId });
}

// ── Consent: сохранить согласие на аналитику ────────────────────────────────
async function setConsent(request, env, user) {
    const { consent } = await request.json(); // true / false
    await env.DB.prepare('UPDATE users SET receipt_analytics = ? WHERE id = ?')
        .bind(consent ? 1 : 0, user.id).run();
    return json({ success: true });
}

// ── List: история отсканированных чеков ─────────────────────────────────────
async function listReceipts(request, env, user) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const rows = await env.DB.prepare(`
        SELECT id, merchant_name, merchant_category, total_amount, currency, receipt_date, created_at
        FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).bind(user.id, limit).all();
    return json({ receipts: rows.results || [] });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
}
function error(msg, status = 400) {
    return json({ error: msg }, status);
}
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, X-Session-Token',
    };
}
```

### 3. Подключить в index.js

В начале файла добавь:
```js
import { handleReceipt } from './api/receipt.js';
```

В роутере (там где идут pathname checks):
```js
if (pathname.startsWith('/api/receipt')) {
    return handleReceipt(request, env, pathname);
}
if (pathname === '/api/receipts') {
    return handleReceipt(request, env, pathname);
}
```
Добавить ДО других обработчиков.

---

## FRONTEND (mini-app.html + public/app/index.html)

ВАЖНО: Редактировать ОБА файла одновременно!
Читай docs/DESIGN_SYSTEM.md — палитра, шрифты, радиусы обязательны.

### 1. Кнопка в Action Sheet

Найди в HTML Action Sheet (div.action-sheet) и добавь кнопку рядом с Voice Input:

```html
<button class="action-btn" onclick="closeActionSheet(); setTimeout(openReceiptScanner, 200);">
    <div class="action-btn-icon" style="background: var(--accent-amber-soft); color: var(--accent-amber);">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="14" height="14" rx="2"/>
            <path d="M7 7h2M11 7h2M7 10h2M11 10h2M7 13h2M11 13h2"/>
        </svg>
    </div>
    <div class="action-btn-label" id="actionReceiptLabel">Scan Receipt</div>
</button>
```

### 2. Модал сканера (добавить перед </body>)

```html
<!-- RECEIPT SCANNER MODAL -->
<div class="modal-overlay" id="receiptModal">
    <div class="modal-sheet">
        <div class="modal-handle"></div>

        <!-- ── Шаг 1: Upload ── -->
        <div id="receiptUploadStep">
            <div style="padding: 0 20px 8px;">
                <div class="modal-title" id="receiptModalTitle">Scan Receipt</div>
            </div>

            <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;">
                <!-- Зона загрузки -->
                <div id="receiptDropZone" onclick="document.getElementById('receiptFileInput').click()"
                     style="border: 2px dashed var(--border); border-radius: var(--radius-xl);
                            padding: 40px 20px; text-align: center; cursor: pointer;
                            transition: border-color 0.2s, background 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🧾</div>
                    <div style="font-weight: 600; font-size: 15px; color: var(--text-primary); margin-bottom: 6px;" id="receiptDropLabel">Tap to upload receipt</div>
                    <div style="font-size: 13px; color: var(--text-muted);" id="receiptDropSub">Photo from gallery or camera</div>
                </div>

                <input type="file" id="receiptFileInput" accept="image/*" capture="environment"
                       style="display:none;" onchange="handleReceiptFile(this)">

                <!-- Превью выбранного фото -->
                <div id="receiptImagePreview" style="display:none; position:relative;">
                    <img id="receiptPreviewImg" style="width:100%; border-radius:var(--radius-lg); max-height:240px; object-fit:cover;">
                    <button onclick="resetReceiptScanner()"
                            style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);
                                   border:none;border-radius:50%;width:32px;height:32px;
                                   color:#fff;font-size:18px;cursor:pointer;display:flex;
                                   align-items:center;justify-content:center;">×</button>
                </div>

                <!-- Сканировать кнопка -->
                <button id="receiptScanBtn" onclick="submitReceiptScan()" disabled
                        class="submit-btn expense-mode" style="opacity:0.5;">
                    <span id="receiptScanBtnLabel">Scan</span>
                </button>
            </div>
        </div>

        <!-- ── Шаг 2: Результат ── -->
        <div id="receiptResultStep" style="display:none; padding: 0 20px 20px;">
            <div class="modal-title" style="margin-bottom:16px;" id="receiptResultTitle">Receipt</div>

            <!-- Итог -->
            <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:600;font-size:15px;" id="receiptMerchantName">—</div>
                        <div style="font-size:12px;color:var(--text-muted);" id="receiptDate">—</div>
                    </div>
                    <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:700;color:var(--danger);"
                         id="receiptTotal">—</div>
                </div>
            </div>

            <!-- Список позиций -->
            <div id="receiptItemsList" style="margin-bottom:12px;max-height:200px;overflow-y:auto;"></div>

            <!-- Категория -->
            <div style="margin-bottom:12px;">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;" id="receiptCatLabel">Category</div>
                <div id="receiptCategoryGrid" class="category-grid"></div>
            </div>

            <!-- Опции -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <div class="toggle" id="receiptSplitToggle" onclick="toggleReceiptSplit()"
                     style="cursor:pointer;"><div class="toggle-knob"></div></div>
                <div>
                    <div style="font-size:13px;font-weight:500;" id="receiptSplitLabel">Split by items</div>
                    <div style="font-size:11px;color:var(--text-muted);" id="receiptSplitDesc">Creates separate transaction per item</div>
                </div>
            </div>

            <!-- Кнопки -->
            <div style="display:flex;gap:10px;">
                <button onclick="resetReceiptScanner()"
                        style="flex:1;padding:14px;border-radius:var(--radius-lg);
                               background:var(--bg-elevated);border:none;
                               color:var(--text-secondary);font-size:14px;font-weight:500;cursor:pointer;" id="receiptBackBtn">
                    Back
                </button>
                <button onclick="confirmReceiptSave()" class="submit-btn expense-mode" style="flex:2;" id="receiptConfirmBtn">
                    <span id="receiptConfirmLabel">Add Expense</span>
                </button>
            </div>
        </div>

        <!-- ── Шаг 3: Loading ── -->
        <div id="receiptLoadingStep" style="display:none;padding:40px 20px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🔍</div>
            <div style="font-weight:600;font-size:16px;margin-bottom:8px;" id="receiptLoadingTitle">Scanning...</div>
            <div style="font-size:13px;color:var(--text-muted);" id="receiptLoadingDesc">AI is reading your receipt</div>
        </div>
    </div>
</div>

<!-- RECEIPT CONSENT MODAL -->
<div class="modal-overlay" id="receiptConsentModal">
    <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div style="padding:20px;">
            <div style="font-size:32px;text-align:center;margin-bottom:12px;">📊</div>
            <div style="font-weight:700;font-size:18px;text-align:center;margin-bottom:8px;" id="receiptConsentTitle">
                Help improve Alar?
            </div>
            <div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:24px;line-height:1.6;" id="receiptConsentDesc">
                Share anonymized purchase data to help us improve category suggestions and unlock future cashback features.
                Your personal data is never sold.
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button onclick="handleReceiptConsent(true)" class="submit-btn income-mode" id="receiptConsentYes">
                    Share anonymized data
                </button>
                <button onclick="handleReceiptConsent(false)"
                        style="padding:14px;border-radius:var(--radius-lg);background:var(--bg-elevated);
                               border:none;color:var(--text-secondary);font-size:14px;cursor:pointer;" id="receiptConsentNo">
                    Not now
                </button>
            </div>
        </div>
    </div>
</div>
```

### 3. JavaScript (добавить в <script> секцию)

```js
// ============================================
// RECEIPT SCANNER
// ============================================

const _receipt = {
    file: null,
    scanResult: null,
    selectedCategoryId: null,
    splitItems: false,
};

function openReceiptScanner() {
    resetReceiptScanner();
    document.getElementById('receiptModal').classList.add('show');
    haptic('medium');
    applyReceiptLanguage();
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
    haptic('light');
}

function applyReceiptLanguage() {
    // Обновить текст по текущему языку пользователя
    const strings = {
        ru: { title: 'Сканировать чек', dropLabel: 'Нажмите чтобы загрузить', dropSub: 'Фото из галереи или камеры', scan: 'Сканировать', back: 'Назад', addExpense: 'Добавить расход', catLabel: 'Категория', splitLabel: 'Разбить по позициям', splitDesc: 'Отдельная транзакция для каждого товара', loading: 'Сканирую...', loadingDesc: 'AI читает ваш чек', consentTitle: 'Помочь улучшить Alar?', consentDesc: 'Поделитесь анонимными данными о покупках для улучшения категорий и будущего кэшбека.', consentYes: 'Поделиться анонимно', consentNo: 'Не сейчас' },
        en: { title: 'Scan Receipt', dropLabel: 'Tap to upload receipt', dropSub: 'Photo from gallery or camera', scan: 'Scan', back: 'Back', addExpense: 'Add Expense', catLabel: 'Category', splitLabel: 'Split by items', splitDesc: 'Creates separate transaction per item', loading: 'Scanning...', loadingDesc: 'AI is reading your receipt', consentTitle: 'Help improve Alar?', consentDesc: 'Share anonymized purchase data to improve category suggestions and unlock future cashback.', consentYes: 'Share anonymized data', consentNo: 'Not now' },
        pl: { title: 'Skanuj paragon', dropLabel: 'Dotknij aby załadować', dropSub: 'Zdjęcie z galerii lub aparatu', scan: 'Skanuj', back: 'Wstecz', addExpense: 'Dodaj wydatek', catLabel: 'Kategoria', splitLabel: 'Podziel wg pozycji', splitDesc: 'Osobna transakcja dla każdego produktu', loading: 'Skanuję...', loadingDesc: 'AI czyta paragon', consentTitle: 'Pomóż ulepszyć Alar?', consentDesc: 'Udostępnij anonimowe dane zakupów aby poprawić kategorie i odblokować cashback.', consentYes: 'Udostępnij anonimowo', consentNo: 'Nie teraz' },
        uk: { title: 'Сканувати чек', dropLabel: 'Натисніть щоб завантажити', dropSub: 'Фото з галереї або камери', scan: 'Сканувати', back: 'Назад', addExpense: 'Додати витрату', catLabel: 'Категорія', splitLabel: 'Розбити по позиціях', splitDesc: 'Окрема транзакція для кожного товару', loading: 'Сканую...', loadingDesc: 'AI читає ваш чек', consentTitle: 'Допомогти покращити Alar?', consentDesc: 'Поділіться анонімними даними для покращення категорій та майбутнього кешбеку.', consentYes: 'Поділитися анонімно', consentNo: 'Не зараз' },
    };
    const s = strings[state.language] || strings.en;
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('receiptModalTitle', s.title);
    setT('receiptDropLabel', s.dropLabel);
    setT('receiptDropSub', s.dropSub);
    setT('receiptScanBtnLabel', s.scan);
    setT('receiptBackBtn', s.back);
    setT('receiptConfirmLabel', s.addExpense);
    setT('receiptCatLabel', s.catLabel);
    setT('receiptSplitLabel', s.splitLabel);
    setT('receiptSplitDesc', s.splitDesc);
    setT('receiptLoadingTitle', s.loading);
    setT('receiptLoadingDesc', s.loadingDesc);
    setT('receiptConsentTitle', s.consentTitle);
    setT('receiptConsentDesc', s.consentDesc);
    setT('receiptConsentYes', s.consentYes);
    setT('receiptConsentNo', s.consentNo);
    setT('actionReceiptLabel', s.title);
}

function handleReceiptFile(input) {
    const file = input.files[0];
    if (!file) return;
    _receipt.file = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('receiptPreviewImg').src = e.target.result;
        document.getElementById('receiptImagePreview').style.display = 'block';
        document.getElementById('receiptDropZone').style.display = 'none';
    };
    reader.readAsDataURL(file);

    const btn = document.getElementById('receiptScanBtn');
    btn.disabled = false;
    btn.style.opacity = '1';
}

function resetReceiptScanner() {
    _receipt.file = null;
    _receipt.scanResult = null;
    _receipt.selectedCategoryId = null;
    _receipt.splitItems = false;

    document.getElementById('receiptUploadStep').style.display = '';
    document.getElementById('receiptResultStep').style.display = 'none';
    document.getElementById('receiptLoadingStep').style.display = 'none';
    document.getElementById('receiptImagePreview').style.display = 'none';
    document.getElementById('receiptDropZone').style.display = '';
    document.getElementById('receiptFileInput').value = '';

    const btn = document.getElementById('receiptScanBtn');
    btn.disabled = true;
    btn.style.opacity = '0.5';

    updateToggle('receiptSplitToggle', false);
}

async function submitReceiptScan() {
    if (!_receipt.file) return;

    // Показать loading
    document.getElementById('receiptUploadStep').style.display = 'none';
    document.getElementById('receiptLoadingStep').style.display = '';
    haptic('medium');

    const form = new FormData();
    form.append('image', _receipt.file);

    const token = getSessionToken();
    const hdrs = {};
    if (token) hdrs['X-Session-Token'] = token;
    if (tg?.initData) hdrs['X-Telegram-Init-Data'] = tg.initData;

    try {
        const res = await fetch(`${API_BASE}/api/receipt/scan`, { method: 'POST', headers: hdrs, body: form });
        const data = await res.json();

        document.getElementById('receiptLoadingStep').style.display = 'none';

        if (!data.success || !data.receipt) {
            showToast('❌ Could not read receipt', 'error');
            document.getElementById('receiptUploadStep').style.display = '';
            return;
        }

        _receipt.scanResult = data.receipt;
        renderReceiptResult(data.receipt, data.suggested_category);
        document.getElementById('receiptResultStep').style.display = '';

    } catch (e) {
        document.getElementById('receiptLoadingStep').style.display = 'none';
        document.getElementById('receiptUploadStep').style.display = '';
        showToast('❌ ' + (e.message || 'Scan failed'), 'error');
    }
}

function renderReceiptResult(receipt, suggestedCategory) {
    // Магазин и дата
    document.getElementById('receiptMerchantName').textContent = receipt.merchant_name || 'Unknown store';
    document.getElementById('receiptDate').textContent = receipt.receipt_date || '';
    document.getElementById('receiptTotal').textContent =
        `-${(receipt.total || 0).toFixed(2)} ${receipt.currency || state.userCurrency}`;

    // Список позиций
    const itemsList = document.getElementById('receiptItemsList');
    if (receipt.items?.length > 0) {
        itemsList.style.display = '';
        itemsList.innerHTML = receipt.items.map(item => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle);">
                <div style="font-size:13px;color:var(--text-primary);flex:1;padding-right:8px;">${item.name}</div>
                <div style="font-size:13px;font-family:'DM Mono',monospace;color:var(--text-secondary);white-space:nowrap;">
                    ${item.quantity > 1 ? `${item.quantity}× ` : ''}${(item.total_price || 0).toFixed(2)}
                </div>
            </div>
        `).join('');
    } else {
        itemsList.style.display = 'none';
    }

    // Категории
    const grid = document.getElementById('receiptCategoryGrid');
    grid.innerHTML = CATEGORIES.expense.map(cat => `
        <button class="category-btn ${cat.name === suggestedCategory ? 'selected' : ''}"
                data-key="${cat.key}"
                onclick="selectReceiptCategory(${cat.id}, '${cat.key}')">
            <span class="category-emoji">${cat.emoji}</span>
            <span class="category-name">${cat.name}</span>
        </button>
    `).join('');

    // Пресет категории
    const presetCat = CATEGORIES.expense.find(c => c.name === suggestedCategory);
    _receipt.selectedCategoryId = presetCat ? presetCat.id : (CATEGORIES.expense[0]?.id || null);
}

function selectReceiptCategory(id, key) {
    _receipt.selectedCategoryId = id;
    document.querySelectorAll('#receiptCategoryGrid .category-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.key === key);
    });
    haptic('light');
}

function toggleReceiptSplit() {
    _receipt.splitItems = !_receipt.splitItems;
    updateToggle('receiptSplitToggle', _receipt.splitItems);
    haptic('light');
}

async function confirmReceiptSave() {
    if (!_receipt.scanResult || !_receipt.selectedCategoryId) return;

    const btn = document.getElementById('receiptConfirmBtn');
    btn.disabled = true;
    document.getElementById('receiptConfirmLabel').textContent = '...';

    // Проверить consent (если ещё не спрашивали)
    let shareAnalytics = false;
    const consentKey = 'alar_receipt_consent';
    const savedConsent = localStorage.getItem(consentKey);

    if (savedConsent === null) {
        // Спросить — сначала сохранить транзакцию, потом спросить consent
        shareAnalytics = false;
    } else {
        shareAnalytics = savedConsent === '1';
    }

    const result = await apiFetch('/api/receipt/confirm', {
        method: 'POST',
        body: JSON.stringify({
            receipt: _receipt.scanResult,
            category_id: _receipt.selectedCategoryId,
            split_items: _receipt.splitItems,
            share_analytics: shareAnalytics,
        }),
    });

    btn.disabled = false;
    document.getElementById('receiptConfirmLabel').textContent = 'Add Expense';

    if (result?.success) {
        closeReceiptModal();
        const total = (_receipt.scanResult.total || 0).toFixed(2);
        const curr = _receipt.scanResult.currency || state.userCurrency;
        showToast(`🧾 -${total} ${curr} added`);
        haptic('success');
        await loadDashboard();
        if (state.currentTab === 'history') renderHistory();

        // Показать consent если не спрашивали
        if (savedConsent === null) {
            setTimeout(() => {
                document.getElementById('receiptConsentModal').classList.add('show');
            }, 600);
        }
    } else {
        showToast('❌ ' + (result?.error || 'Save failed'), 'error');
        haptic('medium');
    }
}

async function handleReceiptConsent(agreed) {
    document.getElementById('receiptConsentModal').classList.remove('show');
    localStorage.setItem('alar_receipt_consent', agreed ? '1' : '0');
    haptic('light');

    await apiFetch('/api/receipt/consent', {
        method: 'POST',
        body: JSON.stringify({ consent: agreed }),
    });
}
```

### 4. Добавить в initSheetSwipe CLOSE_MAP

В функцию `initSheetSwipe()` в объект `CLOSE_MAP` добавить:
```js
receiptModal: () => closeReceiptModal(),
receiptConsentModal: () => document.getElementById('receiptConsentModal').classList.remove('show'),
```

### 5. Добавить в applyLanguage()

В функции `applyLanguage()` добавить вызов:
```js
if (document.getElementById('receiptModal')?.classList.contains('show')) {
    applyReceiptLanguage();
} else {
    applyReceiptLanguage(); // обновляем текст кнопки в action sheet
}
```

---

## МИГРАЦИЯ БД

Выполни в терминале:
```bash
cd finance-bot

# Добавить новые таблицы
npx wrangler d1 execute finance-bot-db --remote --command "
CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
    merchant_name TEXT,
    merchant_category TEXT,
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    receipt_date TEXT,
    raw_text TEXT,
    image_key TEXT,
    share_analytics INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    total_price REAL NOT NULL,
    category_guess TEXT
);
"

# Добавить колонку consent
npx wrangler d1 execute finance-bot-db --remote --command "
ALTER TABLE users ADD COLUMN receipt_analytics INTEGER DEFAULT NULL;
"
```

---

## ЧЕКЛИСТ ПОСЛЕ РЕАЛИЗАЦИИ

- [ ] `POST /api/receipt/scan` — загрузка фото, ответ JSON с позициями
- [ ] `POST /api/receipt/confirm` — создаётся транзакция в БД
- [ ] `POST /api/receipt/consent` — сохраняется согласие
- [ ] Кнопка в Action Sheet открывает модал
- [ ] Фото выбирается из галереи / камеры
- [ ] Показывается список позиций и итог
- [ ] Выбор категории (с пресетом от AI)
- [ ] Toggle "Split by items" работает
- [ ] Consent modal появляется после первого сохранения
- [ ] Работает в dark и light теме
- [ ] Оба файла обновлены (mini-app.html + public/app/index.html)
- [ ] Задеплоено: npm run deploy

## ДЕПЛОЙ

```bash
cd finance-bot && npm run deploy
```

После деплоя проверь: https://finance-bot.alar-app.workers.dev
```

---

## КАК НАЙТИ МЕСТА ДЛЯ ВСТАВКИ

Используй grep чтобы найти точные места:

```bash
# Action Sheet — куда добавлять кнопку
grep -n "action-btn" finance-bot/mini-app.html | head -20

# Voice input кнопка (рядом с ней добавлять Receipt)
grep -n "voice\|Voice\|openVoice" finance-bot/mini-app.html | head -10

# Конец body — куда добавлять модал
grep -n "</body>" finance-bot/mini-app.html

# CLOSE_MAP в initSheetSwipe
grep -n "CLOSE_MAP\|closeMap" finance-bot/mini-app.html

# applyLanguage функция
grep -n "function applyLanguage" finance-bot/mini-app.html

# Роутер в index.js — куда добавлять import и route
grep -n "^import\|handleVoice\|handleMiniApp" finance-bot/src/index.js | head -20
```

---

## ПЕРЕМЕННЫЕ И ФУНКЦИИ КОТОРЫЕ УЖЕ ЕСТЬ В mini-app.html

Используй их — не переизобретай:

| Имя | Что делает |
|-----|-----------|
| `state` | Глобальный объект: `state.language`, `state.userCurrency`, `state.currentTab`, `state.accounts` |
| `apiFetch(path, opts)` | Fetch с авторизацией (session token + Telegram initData) |
| `getSessionToken()` | Возвращает токен из localStorage |
| `API_BASE` | Базовый URL Worker'а |
| `CATEGORIES` | `{ expense: [...], income: [...] }` — массивы с `{ id, name, emoji, key }` |
| `tg` | Telegram WebApp объект (может быть null в браузере) |
| `haptic(type)` | Vibration: `'light'`, `'medium'`, `'success'`, `'error'` |
| `showToast(text, type)` | Toast уведомление (type: `''` или `'error'`) |
| `updateToggle(id, val)` | Переключить toggle визуально |
| `loadDashboard()` | Перезагрузить дашборд (вызвать после добавления транзакции) |
| `renderHistory()` | Перерисовать вкладку истории |
| `closeActionSheet()` | Закрыть FAB меню |

---

## ИСТОРИЯ ЧЕКОВ (вкладка History)

Добавь в список транзакций во вкладке History секцию "Receipts" с историей сканирований.

### HTML — добавить в структуру History Tab:

```html
<!-- Добавить после списка транзакций в #historyTab -->
<div id="receiptsHistorySection" style="display:none; margin-top: 24px;">
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 0 4px; margin-bottom: 12px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;" id="receiptsHistoryTitle">RECEIPTS</div>
    </div>
    <div id="receiptsHistoryList"></div>
</div>
```

### JS — загрузка истории:

```js
async function loadReceiptsHistory() {
    const data = await apiFetch('/api/receipts?limit=10');
    const receipts = data?.receipts || [];

    const section = document.getElementById('receiptsHistorySection');
    const list = document.getElementById('receiptsHistoryList');

    if (!receipts.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    list.innerHTML = receipts.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding: 12px 14px; background: var(--bg-card);
                    border-radius: var(--radius-lg); margin-bottom: 8px;">
            <div style="display:flex; align-items:center; gap: 10px;">
                <div style="width:36px; height:36px; border-radius: var(--radius-md);
                            background: var(--accent-amber-soft); display:flex;
                            align-items:center; justify-content:center; font-size:18px;">🧾</div>
                <div>
                    <div style="font-size:14px; font-weight:500;">${r.merchant_name || 'Receipt'}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${r.receipt_date || r.created_at?.split('T')[0] || ''}</div>
                </div>
            </div>
            <div style="font-family:'DM Mono',monospace; font-size:14px; font-weight:600; color:var(--danger);">
                -${(r.total_amount || 0).toFixed(2)} ${r.currency || ''}
            </div>
        </div>
    `).join('');
}
```

Вызывай `loadReceiptsHistory()` внутри `renderHistory()`.

---

## АНАЛИТИКА ДЛЯ МОНЕТИЗАЦИИ

### Endpoint `/api/admin/analytics` (только для owner)

Добавить в `receipt.js`:

```js
// ── Admin: агрегированная аналитика (только для owner) ───────────────────────
export async function handleReceiptAnalytics(request, env) {
    // Проверка owner токена
    const authHeader = request.headers.get('Authorization') || '';
    if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0];
    const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0];

    // Топ магазины
    const topMerchants = await env.DB.prepare(`
        SELECT merchant_name, merchant_category,
               COUNT(*) as visit_count,
               AVG(total_amount) as avg_spend,
               SUM(total_amount) as total_spend,
               currency
        FROM receipts
        WHERE share_analytics = 1
          AND receipt_date BETWEEN ? AND ?
          AND merchant_name IS NOT NULL
        GROUP BY merchant_name, currency
        ORDER BY visit_count DESC
        LIMIT 50
    `).bind(from, to).all();

    // Топ SKU
    const topItems = await env.DB.prepare(`
        SELECT ri.name, ri.category_guess,
               COUNT(*) as purchase_count,
               AVG(ri.unit_price) as avg_price,
               SUM(ri.total_price) as total_spent
        FROM receipt_items ri
        JOIN receipts r ON r.id = ri.receipt_id
        WHERE r.share_analytics = 1
          AND r.receipt_date BETWEEN ? AND ?
        GROUP BY ri.name
        ORDER BY purchase_count DESC
        LIMIT 100
    `).bind(from, to).all();

    // Категории
    const categories = await env.DB.prepare(`
        SELECT merchant_category,
               COUNT(DISTINCT user_id) as unique_users,
               COUNT(*) as receipt_count,
               SUM(total_amount) as total_spend
        FROM receipts
        WHERE share_analytics = 1
          AND receipt_date BETWEEN ? AND ?
        GROUP BY merchant_category
        ORDER BY total_spend DESC
    `).bind(from, to).all();

    // Кол-во пользователей с consent
    const consentStats = await env.DB.prepare(`
        SELECT
            COUNT(CASE WHEN receipt_analytics = 1 THEN 1 END) as opted_in,
            COUNT(CASE WHEN receipt_analytics = 0 THEN 1 END) as opted_out,
            COUNT(CASE WHEN receipt_analytics IS NULL THEN 1 END) as not_asked
        FROM users
    `).first();

    return new Response(JSON.stringify({
        period: { from, to },
        consent: consentStats,
        top_merchants: topMerchants.results || [],
        top_items: topItems.results || [],
        categories: categories.results || [],
    }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
    });
}
```

Подключить в `index.js`:
```js
import { handleReceipt, handleReceiptAnalytics } from './api/receipt.js';

// В роутере:
if (pathname === '/api/admin/analytics/receipts') {
    return handleReceiptAnalytics(request, env);
}
```

Добавить секрет в `wrangler.toml`:
```toml
[vars]
ADMIN_SECRET = ""  # заполнить через wrangler secret put ADMIN_SECRET
```

Установить секрет:
```bash
npx wrangler secret put ADMIN_SECRET
# введи длинный рандомный токен
```

---

## ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

В `wrangler.toml` должно быть:
```toml
[[d1_databases]]
binding = "DB"
database_name = "finance-bot-db"
database_id = "..."  # уже есть

[vars]
GROQ_API_KEY = ""  # заполнить через wrangler secret put GROQ_API_KEY
```

Проверить что `GROQ_API_KEY` уже есть в secrets:
```bash
npx wrangler secret list
```

Если нет:
```bash
npx wrangler secret put GROQ_API_KEY
```

---

## ТЕСТИРОВАНИЕ

После реализации проверь:

```bash
# 1. Тест сканирования (локально)
curl -X POST http://localhost:8787/api/receipt/scan \
  -H "X-Session-Token: YOUR_TOKEN" \
  -F "image=@/path/to/receipt.jpg"

# 2. Тест подтверждения
curl -X POST http://localhost:8787/api/receipt/confirm \
  -H "X-Session-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receipt":{"total":25.50,"currency":"USD","merchant_name":"Test","items":[]},"category_id":1,"split_items":false,"share_analytics":false}'

# 3. Тест аналитики (admin)
curl http://localhost:8787/api/admin/analytics/receipts \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

После деплоя проверь: https://finance-bot.alar-app.workers.dev
