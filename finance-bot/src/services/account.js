// Account Service — personal multi-account per user
// Each user can have multiple independent accounts: Personal, Business, Family, Crypto
// Separate from the "families" feature (which is shared between multiple users).

import { encrypt, decrypt } from '../utils/crypto.js';

// Category templates seeded on account creation
const ACCOUNT_TEMPLATES = {
  personal: [], // uses system default categories, no seeding needed
  business: {
    expense: [
      { name: 'Software',       emoji: '💻', keywords: ['software','saas','subscription','figma','notion','github','slack','zoom','aws','gcp','azure','vercel','cloudflare','adobe'] },
      { name: 'Офис',           emoji: '🏢', keywords: ['office','офис','rent','аренда','cowork','коворкинг'] },
      { name: 'Транспорт',      emoji: '🚗', keywords: ['uber','bolt','taxi','такси','fuel','бензин','parking','парковка','train','поезд'] },
      { name: 'Дел. обеды',     emoji: '🍽️', keywords: ['restaurant','ресторан','lunch','обед','dinner','ужин','coffee','кофе','meeting'] },
      { name: 'Оборудование',   emoji: '🖥️', keywords: ['laptop','ноутбук','monitor','монитор','keyboard','equipment','оборудование','apple','samsung'] },
      { name: 'Реклама',        emoji: '📣', keywords: ['ads','реклама','facebook','google ads','meta','instagram','tiktok','marketing','маркетинг'] },
      { name: 'Налоги',         emoji: '💸', keywords: ['tax','налог','vat','ндс','invoice','счет','fee','комиссия'] },
      { name: 'Зарплаты',       emoji: '👥', keywords: ['salary','зарплата','payroll','paycheck','freelancer','фриланс','contractor'] },
      { name: 'Юр. услуги',     emoji: '📝', keywords: ['legal','юрист','lawyer','attorney','notary','нотариус','contract','договор'] },
      { name: 'Командировки',   emoji: '✈️', keywords: ['hotel','отель','flight','авиа','business trip','командировка','accommodation'] },
    ],
    income: [
      { name: 'Продажи',        emoji: '💰', keywords: ['sale','продажа','revenue','выручка','stripe','paypal','liqpay','monobank'] },
      { name: 'Контракты',      emoji: '🤝', keywords: ['contract','контракт','deal','сделка','client','клиент','project','проект'] },
      { name: 'Партнёрство',    emoji: '📈', keywords: ['affiliate','партнёр','referral','реферал','commission','комиссия','bonus'] },
    ],
  },
  family_shared: {
    expense: [
      { name: 'Продукты',       emoji: '🛒', keywords: ['biedronka','lidl','zabka','auchan','carrefour','supermarket','продукты','grocery','market'] },
      { name: 'ЖКХ',            emoji: '🏠', keywords: ['czynsz','квартплата','electricity','свет','water','вода','gas','газ','internet','интернет','rent','аренда'] },
      { name: 'Дети',           emoji: '🧒', keywords: ['kindergarten','садик','школа','school','toys','игрушки','children','дети','baby','ребёнок'] },
      { name: 'Здоровье',       emoji: '🏥', keywords: ['hospital','больница','doctor','врач','clinic','клиника','dentist','зубной','health','здоровье'] },
      { name: 'Авто',           emoji: '🚗', keywords: ['fuel','бензин','orlen','service','сервис','repair','ремонт','car','машина','parking','парковка'] },
      { name: 'Аптека',         emoji: '💊', keywords: ['pharmacy','аптека','apteka','medicine','лекарство','vitamins','витамины'] },
      { name: 'Школа',          emoji: '🎒', keywords: ['school','школа','course','курс','tutor','репетитор','education','обучение','стационар','университет'] },
      { name: 'Развлечения',    emoji: '🎮', keywords: ['cinema','кино','theatre','театр','game','игра','netflix','spotify','youtube','entertainment'] },
      { name: 'Питомцы',        emoji: '🐾', keywords: ['vet','ветеринар','pet','питомец','dog','кот','cat','sobaka','food','корм','grooming'] },
      { name: 'Быт',            emoji: '🧹', keywords: ['cleaning','уборка','household','хозтовары','laundry','стирка','cleaners'] },
    ],
    income: [
      { name: 'Зарплата',       emoji: '💼', keywords: ['salary','зарплата','paycheck','работа','work','wage'] },
      { name: 'Пособия',        emoji: '👨‍👩‍👧', keywords: ['benefit','пособие','child support','алименты','social','социальные','state','государство'] },
      { name: 'Подработка',     emoji: '🔧', keywords: ['freelance','фриланс','side','подработка','extra','дополнительный доход'] },
    ],
  },
  crypto: [], // read-only portfolio, no categories seeded
};

export class AccountService {
  constructor(db, encKey = null) {
    this.db = db;
    this.encKey = encKey;
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async getAccounts(userId) {
    const result = await this.db.prepare(`
      SELECT * FROM accounts WHERE user_id = ? ORDER BY sort_order, id
    `).bind(userId).all();
    return result.results;
  }

  async getById(accountId, userId) {
    return this.db.prepare(`
      SELECT * FROM accounts WHERE id = ? AND user_id = ?
    `).bind(accountId, userId).first();
  }

  async createAccount(userId, name, emoji = '💼', type = 'personal', template = null,
                      currency = null, cryptoExchange = null, cryptoKey = null, cryptoSecret = null) {
    // Check duplicate name for this user
    const dup = await this.db.prepare(
      'SELECT id FROM accounts WHERE user_id = ? AND name = ?'
    ).bind(userId, name).first();
    if (dup) throw new Error('duplicate_name');

    // Determine sort_order: append to end
    const last = await this.db.prepare(`
      SELECT MAX(sort_order) as m FROM accounts WHERE user_id = ?
    `).bind(userId).first();
    const sortOrder = (last?.m ?? -1) + 1;

    // Encrypt API keys if provided
    const encKey = cryptoKey ? await encrypt(cryptoKey, this.encKey) : null;
    const encSecret = cryptoSecret ? await encrypt(cryptoSecret, this.encKey) : null;

    const account = await this.db.prepare(`
      INSERT INTO accounts (user_id, name, emoji, type, color, sort_order,
                            crypto_exchange, crypto_api_key, crypto_api_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      userId, name, emoji, type,
      this._colorForType(type),
      sortOrder,
      cryptoExchange || null,
      encKey,
      encSecret
    ).first();

    // Seed template categories (non-fatal — account is created regardless)
    if (template && ACCOUNT_TEMPLATES[template]) {
      try {
        await this._seedCategories(account.id, userId, ACCOUNT_TEMPLATES[template]);
      } catch (seedErr) {
        console.error('Category seeding failed (non-fatal):', seedErr.message);
      }
    }

    return account;
  }

  async updateAccount(accountId, userId, updates) {
    const account = await this.getById(accountId, userId);
    if (!account) return null;

    const name  = updates.name  !== undefined ? updates.name  : account.name;
    const emoji = updates.emoji !== undefined ? updates.emoji : account.emoji;
    const color = updates.color !== undefined ? updates.color : account.color;

    // Handle crypto key updates
    let encKey    = account.crypto_api_key;
    let encSecret = account.crypto_api_secret;
    if (updates.crypto_api_key !== undefined) {
      encKey = updates.crypto_api_key ? await encrypt(updates.crypto_api_key, this.encKey) : null;
    }
    if (updates.crypto_api_secret !== undefined) {
      encSecret = updates.crypto_api_secret ? await encrypt(updates.crypto_api_secret, this.encKey) : null;
    }
    const exchange = updates.crypto_exchange !== undefined ? updates.crypto_exchange : account.crypto_exchange;

    const result = await this.db.prepare(`
      UPDATE accounts
      SET name = ?, emoji = ?, color = ?,
          crypto_exchange = ?, crypto_api_key = ?, crypto_api_secret = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
      RETURNING *
    `).bind(name, emoji, color, exchange, encKey, encSecret, accountId, userId).first();

    return result;
  }

  async deleteAccount(accountId, userId) {
    const account = await this.getById(accountId, userId);
    if (!account) return { success: false, error: 'not_found' };

    // Detach transactions (set account_id = NULL so they go to implicit personal)
    await this.db.prepare(`
      UPDATE transactions SET account_id = NULL WHERE account_id = ?
    `).bind(accountId).run();

    // Delete account-specific categories
    await this.db.prepare(`
      DELETE FROM categories WHERE account_id = ?
    `).bind(accountId).run();

    await this.db.prepare(`
      DELETE FROM accounts WHERE id = ? AND user_id = ?
    `).bind(accountId, userId).run();

    return { success: true };
  }

  // Consolidate: move personal-account transactions back to null (canonical personal = null)
  // This undoes any previous migration that incorrectly set account_id = personal_id
  async consolidatePersonalTransactions(userId, personalAccountId) {
    await this.db.prepare(`
      UPDATE transactions
      SET account_id = NULL
      WHERE user_id = ? AND account_id = ?
    `).bind(userId, personalAccountId).run();
  }

  // ─── SESSION ─────────────────────────────────────────────────────────────────

  async getActiveAccountId(telegramId) {
    if (!telegramId) return null;
    const session = await this.db.prepare(`
      SELECT active_account_id FROM user_sessions WHERE telegram_id = ?
    `).bind(String(telegramId)).first();
    return session?.active_account_id || null;
  }

  async switchAccount(telegramId, accountId) {
    if (!telegramId) return;
    await this.db.prepare(`
      INSERT INTO user_sessions (telegram_id, active_account_id, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(telegram_id) DO UPDATE SET
        active_account_id = excluded.active_account_id,
        updated_at = excluded.updated_at
    `).bind(String(telegramId), accountId || null).run();
  }

  // ─── CRYPTO SYNC ─────────────────────────────────────────────────────────────

  async syncCrypto(accountId, userId) {
    const account = await this.getById(accountId, userId);
    if (!account || account.type !== 'crypto') return { success: false, error: 'not_crypto' };
    if (!account.crypto_exchange || !account.crypto_api_key) {
      return { success: false, error: 'no_keys' };
    }

    const apiKey    = await decrypt(account.crypto_api_key,    this.encKey);
    const apiSecret = await decrypt(account.crypto_api_secret, this.encKey);

    try {
      let balances;
      switch (account.crypto_exchange) {
        case 'binance': balances = await this._fetchBinance(apiKey, apiSecret); break;
        case 'okx':     balances = await this._fetchOKX(apiKey, apiSecret);     break;
        case 'bybit':   balances = await this._fetchBybit(apiKey, apiSecret);   break;
        case 'kucoin':  balances = await this._fetchKuCoin(apiKey, apiSecret);  break;
        default:        return { success: false, error: 'unknown_exchange' };
      }

      await this.db.prepare(`
        UPDATE accounts
        SET crypto_cached_balance = ?, crypto_synced_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(JSON.stringify(balances), accountId).run();

      return { success: true, balances };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  getCachedCrypto(account) {
    if (!account?.crypto_cached_balance) return [];
    try { return JSON.parse(account.crypto_cached_balance); } catch { return []; }
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  _colorForType(type) {
    const colors = {
      personal:      '#3b82f6',
      business:      '#8b5cf6',
      family_shared: '#10b981',
      crypto:        '#f59e0b',
    };
    return colors[type] || '#3b82f6';
  }

  async _seedCategories(accountId, userId, template) {
    if (!template || Array.isArray(template)) return; // empty array = no seeding

    const batches = [];
    for (const type of ['expense', 'income']) {
      const cats = template[type] || [];
      for (let i = 0; i < cats.length; i++) {
        const cat = cats[i];
        batches.push(this.db.prepare(`
          INSERT INTO categories (owner_type, owner_id, account_id, name, emoji, type, keywords, sort_order)
          VALUES ('user', ?, ?, ?, ?, ?, ?, ?)
        `).bind(userId, accountId, cat.name, cat.emoji, type, JSON.stringify(cat.keywords || []), i + 10));
      }
    }

    // Cloudflare D1 batch
    if (batches.length > 0) {
      await this.db.batch(batches);
    }
  }

  // ── Binance ──
  async _fetchBinance(apiKey, apiSecret) {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await this._hmacSHA256(apiSecret, queryString);

    const res = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      { headers: { 'X-MBX-APIKEY': apiKey } }
    );

    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();

    // Filter coins with non-zero balance, get USD prices
    const nonZero = (data.balances || []).filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    return this._attachUsdValuesBinance(apiKey, nonZero);
  }

  async _attachUsdValuesBinance(apiKey, balances) {
    if (balances.length === 0) return [];

    // Fetch all prices once
    const pricesRes = await fetch('https://api.binance.com/api/v3/ticker/price');
    const priceList = await pricesRes.json();
    const priceMap = {};
    for (const p of priceList) { priceMap[p.symbol] = parseFloat(p.price); }

    return balances.map(b => {
      const symbol = b.asset;
      const amount = parseFloat(b.free) + parseFloat(b.locked);
      let usdValue = 0;
      if (symbol === 'USDT' || symbol === 'BUSD' || symbol === 'USDC') {
        usdValue = amount;
      } else {
        usdValue = amount * (priceMap[`${symbol}USDT`] || priceMap[`${symbol}BUSD`] || 0);
      }
      return { symbol, amount, usd_value: Math.round(usdValue * 100) / 100 };
    }).filter(b => b.amount > 0).sort((a, b) => b.usd_value - a.usd_value);
  }

  // ── OKX ──
  async _fetchOKX(apiKey, apiSecret, passphrase = '') {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const path = '/api/v5/account/balance';
    const prehash = timestamp + method + path;
    const signature = btoa(String.fromCharCode(...new Uint8Array(
      await crypto.subtle.sign('HMAC', await this._importKey(apiSecret), new TextEncoder().encode(prehash))
    )));

    const res = await fetch(`https://www.okx.com${path}`, {
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
      }
    });
    if (!res.ok) throw new Error(`OKX API error: ${res.status}`);
    const data = await res.json();

    const coins = data?.data?.[0]?.details || [];
    return coins
      .filter(c => parseFloat(c.cashBal) > 0)
      .map(c => ({
        symbol: c.ccy,
        amount: parseFloat(c.cashBal),
        usd_value: Math.round(parseFloat(c.eqUsd || 0) * 100) / 100,
      }))
      .sort((a, b) => b.usd_value - a.usd_value);
  }

  // ── Bybit ──
  async _fetchBybit(apiKey, apiSecret) {
    const timestamp = Date.now();
    const recvWindow = 5000;
    const queryString = `accountType=UNIFIED`;
    const prehash = `${timestamp}${apiKey}${recvWindow}${queryString}`;
    const signature = await this._hmacSHA256(apiSecret, prehash);

    const res = await fetch(
      `https://api.bybit.com/v5/account/wallet-balance?${queryString}`,
      {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': String(timestamp),
          'X-BAPI-RECV-WINDOW': String(recvWindow),
          'X-BAPI-SIGN': signature,
        }
      }
    );
    if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);
    const data = await res.json();

    const coins = data?.result?.list?.[0]?.coin || [];
    return coins
      .filter(c => parseFloat(c.walletBalance) > 0)
      .map(c => ({
        symbol: c.coin,
        amount: parseFloat(c.walletBalance),
        usd_value: Math.round(parseFloat(c.usdValue || 0) * 100) / 100,
      }))
      .sort((a, b) => b.usd_value - a.usd_value);
  }

  // ── KuCoin ──
  async _fetchKuCoin(apiKey, apiSecret, passphrase = '') {
    const timestamp = Date.now();
    const method = 'GET';
    const endpoint = '/api/v1/accounts';
    const prehash = `${timestamp}${method}${endpoint}`;
    const signature = await this._hmacSHA256(apiSecret, prehash);
    const encPass = await this._hmacSHA256(apiSecret, passphrase);

    const res = await fetch(`https://api.kucoin.com${endpoint}`, {
      headers: {
        'KC-API-KEY': apiKey,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': String(timestamp),
        'KC-API-PASSPHRASE': encPass,
        'KC-API-KEY-VERSION': '2',
      }
    });
    if (!res.ok) throw new Error(`KuCoin API error: ${res.status}`);
    const data = await res.json();

    const map = {};
    for (const acc of (data?.data || [])) {
      const bal = parseFloat(acc.balance);
      if (bal <= 0) continue;
      map[acc.currency] = (map[acc.currency] || 0) + bal;
    }
    return Object.entries(map)
      .map(([symbol, amount]) => ({ symbol, amount, usd_value: 0 }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ── Crypto helpers ──
  async _hmacSHA256(secret, message) {
    const key = await this._importKey(secret);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async _importKey(secret) {
    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }
}
