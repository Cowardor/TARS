// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const TELEGRAM_TOKEN = '7992505613:AAFu_CQfzRXpiN2v7RwoP9bVdNSV9_-X4yI';
const SPREADSHEET_ID = '15q9ixBwMCgddiPQEOIG5H--8NxLFqLD1hl9kPhIOPjs';

const USERS = {
  '787962936': 'Illia',
  'PARTNER_ID': 'Partner'  // Замени PARTNER_ID на реальный ID
};

const CATEGORIES = {
  'транспорт': '🚕 Транспорт',
  'такси': '🚕 Транспорт',
  'проезд': '🚕 Транспорт',
  'uber': '🚕 Транспорт',
  'bolt': '🚕 Транспорт',
  'продукты': '🛒 Продукты',
  'еда': '🛒 Продукты',
  'магазин': '🛒 Продукты',
  'biedronka': '🛒 Продукты',
  'lidl': '🛒 Продукты',
  'заведения': '🍽 Заведения',
  'ресторан': '🍽 Заведения',
  'кафе': '🍽 Заведения',
  'макдак': '🍽 Заведения',
  'kfc': '🍽 Заведения',
  'квартира': '🏠 Квартира',
  'аренда': '🏠 Квартира',
  'коммуналка': '🏠 Квартира',
  'регулярные': '📺 Регулярные',
  'подписки': '📺 Регулярные',
  'интернет': '📺 Регулярные',
  'связь': '📺 Регулярные',
  'spotify': '📺 Регулярные',
  'netflix': '📺 Регулярные',
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
  'crypto': '📈 Trading',
  'другое': '📦 Другое'
};

// ============================================
// TELEGRAM WEBHOOK
// ============================================

function doGet(e) {
  return ContentService.createTextOutput('Finance Bot is running!');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Защита от дубликатов через CacheService
    const cache = CacheService.getScriptCache();
    const updateId = 'upd_' + data.update_id;

    if (cache.get(updateId)) {
      return ContentService.createTextOutput('OK');
    }
    cache.put(updateId, 'true', 300); // 5 минут

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
  const textLower = text.toLowerCase();

  const person = USERS[userId] || 'Unknown';

  if (textLower.startsWith('/start')) {
    sendMessage(chatId, `👋 Привет, ${person}!\n\nОтправь трату в формате:\n<code>сумма категория описание</code>\n\nПример: <code>45 продукты хлеб</code>\n\nКоманды:\n/stats - статистика за месяц\n/balance - баланс\n/income сумма описание - добавить доход`);
    return;
  }

  if (textLower.startsWith('/income')) {
    handleIncome(chatId, text, person);
    return;
  }

  if (textLower.startsWith('/stats')) {
    handleStats(chatId);
    return;
  }

  if (textLower.startsWith('/balance')) {
    handleBalance(chatId);
    return;
  }

  handleExpense(chatId, text, person);
}

// ============================================
// ОБРАБОТКА РАСХОДОВ
// ============================================

function handleExpense(chatId, text, person) {
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(\S+)?\s*(.*)$/);

  if (!match) {
    sendMessage(chatId, '❌ Не понял. Формат: <code>сумма категория описание</code>');
    return;
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const categoryInput = (match[2] || '').toLowerCase();
  const description = match[3] || '';

  let category = CATEGORIES[categoryInput];

  if (!category && categoryInput) {
    for (const [key, value] of Object.entries(CATEGORIES)) {
      if (key.includes(categoryInput) || categoryInput.includes(key)) {
        category = value;
        break;
      }
    }
  }

  if (!category) {
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
          {text: '💅 Красота', callback_data: `exp:${amount}:💅 Красота:${description}`},
          {text: '📦 Другое', callback_data: `exp:${amount}:📦 Другое:${description}`}
        ]
      ]
    };

    sendMessage(chatId, `💰 Сумма: <b>${amount} PLN</b>\n📂 Выбери категорию:`, keyboard);
    return;
  }

  saveExpense(amount, category, description || categoryInput, person);
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

    editMessage(chatId, callback.message.message_id,
      `✅ Записал: <b>${amount} PLN</b> → ${category}\n📊 ${category} за месяц: <b>${monthTotal} PLN</b>`);
  }

  answerCallback(callback.id);
}

// ============================================
// ОБРАБОТКА ДОХОДОВ
// ============================================

function handleIncome(chatId, text, person) {
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
    now,
    amount,
    category,
    description,
    person,
    now.getTime()
  ]);
}

function saveIncome(amount, description, person) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Incomes');
  const now = new Date();

  sheet.appendRow([
    now,
    amount,
    description,
    person,
    now.getTime()
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

// ============================================
// ИНИЦИАЛИЗАЦИЯ ЛИСТОВ (запусти один раз)
// ============================================

function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Expenses sheet
  let expSheet = ss.getSheetByName('Expenses');
  if (!expSheet) {
    expSheet = ss.insertSheet('Expenses');
  }
  expSheet.getRange(1, 1, 1, 6).setValues([['Date', 'Amount', 'Category', 'Description', 'Person', 'Timestamp']]);

  // Incomes sheet
  let incSheet = ss.getSheetByName('Incomes');
  if (!incSheet) {
    incSheet = ss.insertSheet('Incomes');
  }
  incSheet.getRange(1, 1, 1, 5).setValues([['Date', 'Amount', 'Description', 'Person', 'Timestamp']]);

  console.log('Sheets initialized!');
}

