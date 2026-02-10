// ============================================
// КОНФИГУРАЦИЯ (заполни в Settings -> Variables)
// ============================================
// TELEGRAM_TOKEN = твой токен бота
// GOOGLE_SERVICE_ACCOUNT_EMAIL = email сервисного аккаунта
// GOOGLE_PRIVATE_KEY = приватный ключ (из JSON файла)
// SPREADSHEET_ID = ID таблицы

const USERS = {
  '787962936': 'Illia',
  // Добавь ID партнёра когда узнаешь
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
// MAIN HANDLER
// ============================================

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('Finance Bot is running!');
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();

        // Защита от дубликатов через KV
        const updateId = `upd_${data.update_id}`;
        const cached = await env.FINANCE_KV.get(updateId);
        if (cached) {
          return new Response('OK');
        }
        await env.FINANCE_KV.put(updateId, 'true', { expirationTtl: 300 });

        if (data.message) {
          await handleMessage(data.message, env);
        } else if (data.callback_query) {
          await handleCallback(data.callback_query, env);
        }
      } catch (error) {
        console.error('Error:', error);
      }

      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  }
};

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const userId = message.from.id.toString();
  const text = message.text || '';
  const textLower = text.toLowerCase();

  const person = USERS[userId] || 'Unknown';

  if (textLower.startsWith('/start')) {
    await sendMessage(chatId, `👋 Привет, ${person}!\n\nОтправь трату в формате:\n<code>сумма категория описание</code>\n\nПример: <code>45 продукты хлеб</code>\n\nКоманды:\n/stats - статистика за месяц\n/balance - баланс\n/income сумма описание - добавить доход`, env);
    return;
  }

  if (textLower.startsWith('/income')) {
    await handleIncome(chatId, text, person, env);
    return;
  }

  if (textLower.startsWith('/stats')) {
    await handleStats(chatId, env);
    return;
  }

  if (textLower.startsWith('/balance')) {
    await handleBalance(chatId, env);
    return;
  }

  await handleExpense(chatId, text, person, env);
}

// ============================================
// EXPENSE HANDLER
// ============================================

async function handleExpense(chatId, text, person, env) {
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(\S+)?\s*(.*)$/);

  if (!match) {
    await sendMessage(chatId, '❌ Не понял. Формат: <code>сумма категория описание</code>', env);
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
          { text: '🛒 Продукты', callback_data: `exp:${amount}:🛒 Продукты:${description}` },
          { text: '🍽 Заведения', callback_data: `exp:${amount}:🍽 Заведения:${description}` }
        ],
        [
          { text: '🚕 Транспорт', callback_data: `exp:${amount}:🚕 Транспорт:${description}` },
          { text: '👕 Шоппинг', callback_data: `exp:${amount}:👕 Шоппинг:${description}` }
        ],
        [
          { text: '🏠 Квартира', callback_data: `exp:${amount}:🏠 Квартира:${description}` },
          { text: '📺 Регулярные', callback_data: `exp:${amount}:📺 Регулярные:${description}` }
        ],
        [
          { text: '💅 Красота', callback_data: `exp:${amount}:💅 Красота:${description}` },
          { text: '📦 Другое', callback_data: `exp:${amount}:📦 Другое:${description}` }
        ]
      ]
    };

    await sendMessage(chatId, `💰 Сумма: <b>${amount} PLN</b>\n📂 Выбери категорию:`, env, keyboard);
    return;
  }

  await saveExpense(amount, category, description || categoryInput, person, env);
  const monthTotal = await getMonthTotal(category, env);

  await sendMessage(chatId, `✅ Записал: <b>${amount} PLN</b> → ${category}\n📊 ${category} за месяц: <b>${monthTotal} PLN</b>`, env);
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(callback, env) {
  const chatId = callback.message.chat.id;
  const userId = callback.from.id.toString();
  const data = callback.data;
  const person = USERS[userId] || 'Unknown';

  if (data.startsWith('exp:')) {
    const parts = data.split(':');
    const amount = parseFloat(parts[1]);
    const category = parts[2];
    const description = parts[3] || '';

    await saveExpense(amount, category, description, person, env);
    const monthTotal = await getMonthTotal(category, env);

    await editMessage(chatId, callback.message.message_id,
      `✅ Записал: <b>${amount} PLN</b> → ${category}\n📊 ${category} за месяц: <b>${monthTotal} PLN</b>`, env);
  }

  await answerCallback(callback.id, env);
}

// ============================================
// INCOME HANDLER
// ============================================

async function handleIncome(chatId, text, person, env) {
  const match = text.match(/\/income\s+(\d+(?:[.,]\d+)?)\s*(.*)/i);

  if (!match) {
    await sendMessage(chatId, '❌ Формат: <code>/income сумма описание</code>', env);
    return;
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const description = match[2] || 'Доход';

  await saveIncome(amount, description, person, env);
  const monthIncome = await getMonthIncome(env);

  await sendMessage(chatId, `💵 Записал доход: <b>${amount} PLN</b> (${description})\n📈 Доходы за месяц: <b>${monthIncome} PLN</b>`, env);
}

// ============================================
// STATS HANDLERS
// ============================================

async function handleStats(chatId, env) {
  const expenses = await getExpenses(env);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = {};
  let total = 0;

  for (const exp of expenses) {
    const date = new Date(exp.date);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      stats[exp.category] = (stats[exp.category] || 0) + exp.amount;
      total += exp.amount;
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

  const income = await getMonthIncome(env);
  message += `📈 Доходы: <b>${income.toFixed(2)} PLN</b>\n`;
  message += `📉 Баланс: <b>${(income - total).toFixed(2)} PLN</b>`;

  await sendMessage(chatId, message, env);
}

async function handleBalance(chatId, env) {
  const expenses = await getMonthExpenses(env);
  const income = await getMonthIncome(env);
  const balance = income - expenses;

  const emoji = balance >= 0 ? '✅' : '⚠️';

  await sendMessage(chatId, `${emoji} <b>Баланс за месяц:</b>\n\n📈 Доходы: ${income.toFixed(2)} PLN\n📉 Расходы: ${expenses.toFixed(2)} PLN\n\n💰 <b>Остаток: ${balance.toFixed(2)} PLN</b>`, env);
}

// ============================================
// GOOGLE SHEETS API
// ============================================

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${encodedSignature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  return data.access_token;
}

async function appendToSheet(sheetName, values, env) {
  const token = await getAccessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${sheetName}!A:F:append?valueInputOption=USER_ENTERED`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [values] })
  });
}

async function getSheetData(sheetName, env) {
  const token = await getAccessToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${sheetName}!A:F`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  return data.values || [];
}

// ============================================
// DATA OPERATIONS
// ============================================

async function saveExpense(amount, category, description, person, env) {
  const now = new Date().toISOString();
  await appendToSheet('Expenses', [now, amount, category, description, person, Date.now()], env);
}

async function saveIncome(amount, description, person, env) {
  const now = new Date().toISOString();
  await appendToSheet('Incomes', [now, amount, description, person, Date.now()], env);
}

async function getExpenses(env) {
  const data = await getSheetData('Expenses', env);
  return data.slice(1).map(row => ({
    date: row[0],
    amount: parseFloat(row[1]) || 0,
    category: row[2],
    description: row[3],
    person: row[4]
  }));
}

async function getIncomes(env) {
  const data = await getSheetData('Incomes', env);
  return data.slice(1).map(row => ({
    date: row[0],
    amount: parseFloat(row[1]) || 0,
    description: row[2],
    person: row[3]
  }));
}

async function getMonthTotal(category, env) {
  const expenses = await getExpenses(env);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;
  for (const exp of expenses) {
    const date = new Date(exp.date);
    if (date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        exp.category === category) {
      total += exp.amount;
    }
  }

  return total.toFixed(2);
}

async function getMonthExpenses(env) {
  const expenses = await getExpenses(env);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;
  for (const exp of expenses) {
    const date = new Date(exp.date);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      total += exp.amount;
    }
  }

  return total;
}

async function getMonthIncome(env) {
  const incomes = await getIncomes(env);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;
  for (const inc of incomes) {
    const date = new Date(inc.date);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      total += inc.amount;
    }
  }

  return total;
}

// ============================================
// TELEGRAM API
// ============================================

async function sendMessage(chatId, text, env, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function editMessage(chatId, messageId, text, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/editMessageText`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}

async function answerCallback(callbackId, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/answerCallbackQuery`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}
