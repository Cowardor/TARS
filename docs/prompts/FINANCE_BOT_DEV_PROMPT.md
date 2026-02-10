# Промпт для Developer: Telegram Finance Bot (100% Бесплатный)

**Дата:** 2026-01-30
**Задача:** Создать полностью бесплатного Telegram бота для учёта финансов
**Приоритет:** P1 (High)
**Стек:** Google Apps Script + Google Sheets + Telegram

---

## Скопируй этот промпт в новое окно Claude:

```
Ты - разработчик в команде TARS. Твоя задача - создать ПОЛНОСТЬЮ БЕСПЛАТНОГО Telegram бота для учёта личных финансов.

## КОНТЕКСТ

Пользователь (Illia) и его девушка хотят вести учёт расходов и доходов через Telegram бота.

КРИТИЧЕСКИ ВАЖНО: Решение должно быть 100% бесплатным навсегда. Никаких платных сервисов.

Прочитай CLAUDE.md для понимания проекта.

## АРХИТЕКТУРА

```
Telegram Bot (@BotFather - бесплатно)
        ↓
Google Apps Script (бесплатный хостинг навсегда)
        ↓
Google Sheets (бесплатная база данных)
```

**Почему это бесплатно:**
- Google Apps Script - бесплатный serverless от Google
- Google Sheets - бесплатная "база данных"
- Telegram Bot API - бесплатно
- Парсинг сообщений - regex (без AI)

## ТРЕБОВАНИЯ

### Функционал бота:

1. **Добавление расхода:**
   - Формат: `сумма категория описание`
   - Примеры:
     - `45 продукты`
     - `200 заведения ужин`
     - `50` (без категории → спросит)

2. **Добавление дохода:**
   - Команда: `/income сумма описание`
   - Пример: `/income 3400 зарплата`

3. **Статистика:**
   - `/stats` - расходы за месяц по категориям
   - `/balance` - баланс (доходы - расходы)

4. **Два пользователя:**
   - Распознавать по Telegram user ID
   - Записывать: "Illia" или "Партнёр"

### Категории расходов:

```javascript
const CATEGORIES = {
  'транспорт': '🚕 Транспорт',
  'такси': '🚕 Транспорт',
  'проезд': '🚕 Транспорт',
  'продукты': '🛒 Продукты',
  'еда': '🛒 Продукты',
  'заведения': '🍽 Заведения',
  'ресторан': '🍽 Заведения',
  'кафе': '🍽 Заведения',
  'квартира': '🏠 Квартира',
  'аренда': '🏠 Квартира',
  'коммуналка': '🏠 Квартира',
  'регулярные': '📺 Регулярные',
  'подписки': '📺 Регулярные',
  'интернет': '📺 Регулярные',
  'шоппинг': '👕 Шоппинг',
  'одежда': '👕 Шоппинг',
  'техника': '👕 Шоппинг',
  'красота': '💅 Красота',
  'здоровье': '💅 Красота',
  'спорт': '🏋️ Спорт',
  'путешествия': '✈️ Путешествия',
  'дом': '🏡 Дом и сад',
  'trading': '📈 Trading',
  'крипта': '📈 Trading',
  'другое': '📦 Другое'
};
```

### Структура Google Sheets:

**Лист "Expenses":**
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Date | Amount | Category | Description | Person | Timestamp |

**Лист "Incomes":**
| A | B | C | D | E |
|---|---|---|---|---|
| Date | Amount | Description | Person | Timestamp |

**Лист "Config":**
| A | B |
|---|---|
| illia_id | 123456789 |
| partner_id | 987654321 |

## КОД

### 1. Google Apps Script (Code.gs):

```javascript
// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const TELEGRAM_TOKEN = 'YOUR_BOT_TOKEN'; // от @BotFather
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // из URL таблицы

const USERS = {
  'ILLIA_TELEGRAM_ID': 'Illia',
  'PARTNER_TELEGRAM_ID': 'Партнёр'
};

const CATEGORIES = {
  'транспорт': '🚕 Транспорт',
  'такси': '🚕 Транспорт',
  'проезд': '🚕 Транспорт',
  'продукты': '🛒 Продукты',
  'еда': '🛒 Продукты',
  'магазин': '🛒 Продукты',
  'заведения': '🍽 Заведения',
  'ресторан': '🍽 Заведения',
  'кафе': '🍽 Заведения',
  'макдак': '🍽 Заведения',
  'квартира': '🏠 Квартира',
  'аренда': '🏠 Квартира',
  'коммуналка': '🏠 Квартира',
  'регулярные': '📺 Регулярные',
  'подписки': '📺 Регулярные',
  'интернет': '📺 Регулярные',
  'связь': '📺 Регулярные',
  'шоппинг': '👕 Шоппинг',
  'одежда': '👕 Шоппинг',
  'техника': '👕 Шоппинг',
  'красота': '💅 Красота',
  'здоровье': '💅 Красота',
  'аптека': '💅 Красота',
  'спорт': '🏋️ Спорт',
  'зал': '🏋️ Спорт',
  'путешествия': '✈️ Путешествия',
  'отель': '✈️ Путешествия',
  'дом': '🏡 Дом и сад',
  'trading': '📈 Trading',
  'крипта': '📈 Trading',
  'другое': '📦 Другое'
};

// ============================================
// TELEGRAM WEBHOOK
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.message) {
      handleMessage(data.message);
    } else if (data.callback_query) {
      handleCallback(data.callback_query);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return ContentService.createTextOutput('OK');
}

function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id.toString();
  const text = message.text || '';

  // Определяем пользователя
  const person = USERS[userId] || 'Unknown';

  if (text.startsWith('/start')) {
    sendMessage(chatId, `👋 Привет, ${person}!\n\nОтправь трату в формате:\n<code>сумма категория описание</code>\n\nПример: <code>45 продукты хлеб</code>\n\nКоманды:\n/stats - статистика за месяц\n/balance - баланс\n/income сумма описание - добавить доход`);
    return;
  }

  if (text.startsWith('/income')) {
    handleIncome(chatId, text, person);
    return;
  }

  if (text.startsWith('/stats')) {
    handleStats(chatId);
    return;
  }

  if (text.startsWith('/balance')) {
    handleBalance(chatId);
    return;
  }

  // Парсим расход
  handleExpense(chatId, text, person);
}

// ============================================
// ОБРАБОТКА РАСХОДОВ
// ============================================

function handleExpense(chatId, text, person) {
  // Парсим: "45 продукты хлеб" или "45"
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(\S+)?\s*(.*)$/);

  if (!match) {
    sendMessage(chatId, '❌ Не понял. Формат: <code>сумма категория описание</code>');
    return;
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const categoryInput = (match[2] || '').toLowerCase();
  const description = match[3] || '';

  // Ищем категорию
  let category = CATEGORIES[categoryInput];

  if (!category && categoryInput) {
    // Пробуем найти частичное совпадение
    for (const [key, value] of Object.entries(CATEGORIES)) {
      if (key.includes(categoryInput) || categoryInput.includes(key)) {
        category = value;
        break;
      }
    }
  }

  if (!category) {
    // Показываем кнопки выбора категории
    const keyboard = {
      inline_keyboard: [
        [
          {text: '🛒 Продукты', callback_data: `exp:${amount}:🛒 Продукты:${description}`},
          {text: '🍽 Заведения', callback_data: `exp:${amount}:🍽 Заведения:${description}`}
        ],
        [
          {text: '🚕 Транспорт', callback_data: `exp:${amount}:🚕 Транспорт:${description}`},
          {text: '👕 Шоппинг', callback_data: `exp:${amount}:👕 Шоппинг:${description}`}
        ],
        [
          {text: '🏠 Квартира', callback_data: `exp:${amount}:🏠 Квартира:${description}`},
          {text: '📺 Регулярные', callback_data: `exp:${amount}:📺 Регулярные:${description}`}
        ],
        [
          {text: '📦 Другое', callback_data: `exp:${amount}:📦 Другое:${description}`}
        ]
      ]
    };

    sendMessage(chatId, `💰 Сумма: <b>${amount} PLN</b>\n📂 Выбери категорию:`, keyboard);
    return;
  }

  // Записываем расход
  saveExpense(amount, category, description || categoryInput, person);

  // Получаем сумму за месяц по этой категории
  const monthTotal = getMonthTotal(category);

  sendMessage(chatId, `✅ Записал: <b>${amount} PLN</b> → ${category}\n📊 ${category} за месяц: <b>${monthTotal} PLN</b>`);
}

function handleCallback(callback) {
  const chatId = callback.message.chat.id;
  const userId = callback.from.id.toString();
  const data = callback.data;
  const person = USERS[userId] || 'Unknown';

  if (data.startsWith('exp:')) {
    const parts = data.split(':');
    const amount = parseFloat(parts[1]);
    const category = parts[2];
    const description = parts[3] || '';

    saveExpense(amount, category, description, person);

    const monthTotal = getMonthTotal(category);

    // Редактируем сообщение
    editMessage(chatId, callback.message.message_id,
      `✅ Записал: <b>${amount} PLN</b> → ${category}\n📊 ${category} за месяц: <b>${monthTotal} PLN</b>`);
  }

  // Отвечаем на callback
  answerCallback(callback.id);
}

// ============================================
// ОБРАБОТКА ДОХОДОВ
// ============================================

function handleIncome(chatId, text, person) {
  // /income 3400 зарплата
  const match = text.match(/\/income\s+(\d+(?:[.,]\d+)?)\s*(.*)/);

  if (!match) {
    sendMessage(chatId, '❌ Формат: <code>/income сумма описание</code>');
    return;
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const description = match[2] || 'Доход';

  saveIncome(amount, description, person);

  const monthIncome = getMonthIncome();

  sendMessage(chatId, `💵 Записал доход: <b>${amount} PLN</b> (${description})\n📈 Доходы за месяц: <b>${monthIncome} PLN</b>`);
}

// ============================================
// СТАТИСТИКА
// ============================================

function handleStats(chatId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Expenses');
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = {};
  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i][0]);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const amount = parseFloat(data[i][1]) || 0;
      const category = data[i][2];

      stats[category] = (stats[category] || 0) + amount;
      total += amount;
    }
  }

  const monthName = now.toLocaleString('ru', { month: 'long' });
  let message = `📊 <b>Расходы за ${monthName} ${currentYear}:</b>\n\n`;

  // Сортируем по сумме
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);

  for (const [category, amount] of sorted) {
    message += `${category}: <b>${amount.toFixed(2)} PLN</b>\n`;
  }

  message += `\n═══════════════════\n`;
  message += `💰 Всего расходов: <b>${total.toFixed(2)} PLN</b>\n`;

  const income = getMonthIncome();
  message += `📈 Доходы: <b>${income.toFixed(2)} PLN</b>\n`;
  message += `📉 Баланс: <b>${(income - total).toFixed(2)} PLN</b>`;

  sendMessage(chatId, message);
}

function handleBalance(chatId) {
  const expenses = getMonthExpenses();
  const income = getMonthIncome();
  const balance = income - expenses;

  const emoji = balance >= 0 ? '✅' : '⚠️';

  sendMessage(chatId, `${emoji} <b>Баланс за месяц:</b>\n\n📈 Доходы: ${income.toFixed(2)} PLN\n📉 Расходы: ${expenses.toFixed(2)} PLN\n\n💰 <b>Остаток: ${balance.toFixed(2)} PLN</b>`);
}

// ============================================
// РАБОТА С ТАБЛИЦЕЙ
// ============================================

function saveExpense(amount, category, description, person) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Expenses');
  const now = new Date();

  sheet.appendRow([
    now,           // Date
    amount,        // Amount
    category,      // Category
    description,   // Description
    person,        // Person
    now.getTime()  // Timestamp
  ]);
}

function saveIncome(amount, description, person) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Incomes');
  const now = new Date();

  sheet.appendRow([
    now,           // Date
    amount,        // Amount
    description,   // Description
    person,        // Person
    now.getTime()  // Timestamp
  ]);
}

function getMonthTotal(category) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Expenses');
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i][0]);
    if (date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        data[i][2] === category) {
      total += parseFloat(data[i][1]) || 0;
    }
  }

  return total.toFixed(2);
}

function getMonthExpenses() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Expenses');
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i][0]);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      total += parseFloat(data[i][1]) || 0;
    }
  }

  return total;
}

function getMonthIncome() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Incomes');
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i][0]);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      total += parseFloat(data[i][1]) || 0;
    }
  }

  return total;
}

// ============================================
// TELEGRAM API
// ============================================

function sendMessage(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

function editMessage(chatId, messageId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}

function answerCallback(callbackId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: callbackId
    })
  });
}

// ============================================
// УСТАНОВКА WEBHOOK
// ============================================

function setWebhook() {
  const webAppUrl = ScriptApp.getService().getUrl();
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webAppUrl}`;

  const response = UrlFetchApp.fetch(url);
  console.log(response.getContentText());
}

function removeWebhook() {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook`;
  const response = UrlFetchApp.fetch(url);
  console.log(response.getContentText());
}
```

## ИНСТРУКЦИЯ ПО УСТАНОВКЕ

### Шаг 1: Создать Telegram бота
1. Открой @BotFather в Telegram
2. Отправь `/newbot`
3. Придумай имя и username
4. Скопируй токен (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Шаг 2: Создать Google Sheets
1. Создай новую таблицу: https://sheets.new
2. Переименуй первый лист в `Expenses`
3. Добавь заголовки в первую строку: `Date | Amount | Category | Description | Person | Timestamp`
4. Создай второй лист `Incomes`
5. Добавь заголовки: `Date | Amount | Description | Person | Timestamp`
6. Скопируй ID таблицы из URL (между /d/ и /edit)

### Шаг 3: Создать Google Apps Script
1. Открой https://script.google.com
2. Создай новый проект
3. Вставь код выше в Code.gs
4. Замени `YOUR_BOT_TOKEN` на токен бота
5. Замени `YOUR_SPREADSHEET_ID` на ID таблицы
6. Замени `ILLIA_TELEGRAM_ID` и `PARTNER_TELEGRAM_ID` на реальные ID
   (Узнать ID: отправь сообщение @userinfobot)

### Шаг 4: Деплой
1. Нажми "Deploy" → "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Нажми "Deploy"
6. Скопируй Web app URL

### Шаг 5: Установить Webhook
1. В редакторе скрипта запусти функцию `setWebhook()`
2. Проверь логи - должно быть `{"ok":true}`

### Шаг 6: Тест
1. Напиши боту: `/start`
2. Отправь: `45 продукты хлеб`
3. Проверь таблицу - должна появиться запись

## ГОТОВО!

Бот работает 24/7, полностью бесплатно, навсегда.

---

После завершения оставь сообщение в CLAUDE.md:
```
[ДАТА] [Developer]: Finance Bot готов, код в docs/prompts/FINANCE_BOT_DEV_PROMPT.md
```
```

---

## Резюме для Team Lead:

**Архитектура:** Google Apps Script + Sheets + Telegram
**Стоимость:** 0 (навсегда)
**Время установки:** ~15 минут
**Автономность:** 24/7

Код полностью готов - дев может сразу деплоить или модифицировать.
