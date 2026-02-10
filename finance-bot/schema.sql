-- =====================================================
-- FINANCE BOT DATABASE SCHEMA v1.0
-- Database: Cloudflare D1 (SQLite)
-- =====================================================

-- 1. USERS - All bot users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    telegram_username TEXT,
    display_name TEXT NOT NULL,
    language TEXT DEFAULT 'ru',
    currency TEXT DEFAULT 'PLN',
    timezone TEXT DEFAULT 'Europe/Warsaw',
    subscription_tier TEXT DEFAULT 'free',
    subscription_expires_at TEXT,
    daily_reminder INTEGER DEFAULT 1,
    monthly_report INTEGER DEFAULT 1,
    reminder_hour INTEGER DEFAULT 21,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- 2. FAMILIES - Family/shared accounts
CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    invite_code TEXT UNIQUE,
    invite_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);
CREATE INDEX IF NOT EXISTS idx_families_owner ON families(owner_id);

-- 3. FAMILY_MEMBERS - Family members
CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);

-- 4. CATEGORIES - Expense/income categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_type TEXT NOT NULL,
    owner_id INTEGER,
    name TEXT NOT NULL,
    emoji TEXT,
    type TEXT NOT NULL,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(owner_type, owner_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_owner ON categories(owner_type, owner_id);

-- 5. TRANSACTIONS - All transactions (expenses and incomes)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    family_id INTEGER,
    category_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'PLN',
    description TEXT,
    transaction_date TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    bank_transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, transaction_date);

-- 6. USER_SESSIONS - Dialog state
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    state TEXT DEFAULT 'idle',
    context TEXT,
    active_family_id INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (active_family_id) REFERENCES families(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_telegram ON user_sessions(telegram_id);

-- 7. BUDGETS - Monthly budget limits per category
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    family_id INTEGER,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(user_id, family_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_family ON budgets(family_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

-- 8. BANK_IMPORTS - History of CSV imports for tracking and stats
CREATE TABLE IF NOT EXISTS bank_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    family_id INTEGER,
    bank_name TEXT NOT NULL,
    file_name TEXT,
    file_hash TEXT,
    total_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    date_from TEXT,
    date_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_imports_user ON bank_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_imports_hash ON bank_imports(file_hash);

-- Index for deduplication of bank transactions
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_transaction_id);

-- 9. BANK_CONNECTIONS - Open Banking connections (Nordigen/GoCardless)
CREATE TABLE IF NOT EXISTS bank_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    family_id INTEGER,
    requisition_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT,
    account_ids TEXT,  -- JSON array of account IDs
    status TEXT DEFAULT 'pending',  -- pending, linked, expired, error
    last_sync_at TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    UNIQUE(user_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_connections_requisition ON bank_connections(requisition_id);

-- 10. SYSTEM DEFAULT CATEGORIES
-- Extended keywords for better auto-categorization of bank imports
INSERT OR IGNORE INTO categories (owner_type, owner_id, name, emoji, type, keywords, sort_order) VALUES
-- Expenses (expanded with Polish stores and services)
('system', NULL, 'Продукты', '🛒', 'expense', '["продукты","еда","магазин","biedronka","lidl","auchan","zabka","żabka","carrefour","kaufland","netto","dino","freshmarket","stokrotka","lewiatan","intermarche","makro","selgros","aldi","polomarket","dealz","pepco"]', 1),
('system', NULL, 'Заведения', '🍽', 'expense', '["заведения","ресторан","кафе","макдак","kfc","пицца","бар","mcdonalds","burger king","starbucks","costa coffee","pizzahut","dominos","wolt","glovo","pyszne","uber eats","restauracja","kawiarnia","pub","bistro","sushi"]', 2),
('system', NULL, 'Транспорт', '🚕', 'expense', '["транспорт","такси","uber","bolt","проезд","билет","метро","автобус","freenow","itaxi","mytaxi","pkp","intercity","mpk","ztm","flixbus","polskibus","orlen","bp","shell","circle k","lotos","moya","paliwo","benzyna"]', 3),
('system', NULL, 'Квартира', '🏠', 'expense', '["квартира","аренда","коммуналка","свет","газ","вода","czynsz","tauron","pge","enea","innogy","pgnig","veolia","wodociagi","administracja","wspolnota"]', 4),
('system', NULL, 'Регулярные', '📺', 'expense', '["регулярные","подписки","интернет","связь","spotify","netflix","телефон","orange","play","plus","t-mobile","upc","vectra","inea","canal+","hbo max","disney","apple","google play","youtube premium"]', 5),
('system', NULL, 'Шоппинг', '👕', 'expense', '["шоппинг","одежда","техника","обувь","аксессуары","zara","hm","reserved","cropp","sinsay","mohito","house","rtv euro agd","media expert","media markt","komputronik","x-kom","morele","allegro","amazon","zalando","ccc","deichmann","half price","tk maxx"]', 6),
('system', NULL, 'Красота', '💅', 'expense', '["красота","здоровье","аптека","врач","стрижка","косметика","rossmann","hebe","drogeria","douglas","sephora","notino","fryzjer","barber","spa","medycyna","przychodnia","dentysta","okulista"]', 7),
('system', NULL, 'Спорт', '🏋️', 'expense', '["спорт","зал","фитнес","бассейн","тренировка","gym","decathlon","intersport","go sport","4f","cityfit","zdrofit","fitness platinium","multisport","medicover sport"]', 8),
('system', NULL, 'Путешествия', '✈️', 'expense', '["путешествия","отель","билеты","виза","отпуск","travel","booking","airbnb","trivago","lot","ryanair","wizzair","easyjet","itaka","rainbow","tui","wakacje","hotel","hostel","nocleg"]', 9),
('system', NULL, 'Дом', '🏡', 'expense', '["дом","сад","ремонт","мебель","ikea","leroy merlin","castorama","obi","bricomarche","jysk","agata meble","black red white","abra meble","home&you"]', 10),
('system', NULL, 'Trading', '📈', 'expense', '["trading","крипта","crypto","биржа","инвестиции","binance","revolut","etoro","xtb","degiro","ing","mbank","pko","millennium"]', 11),
('system', NULL, 'Другое', '📦', 'expense', '["другое","przelew","wyplata","bankomat","atm"]', 99),
-- Incomes
('system', NULL, 'Зарплата', '💼', 'income', '["зарплата","salary","оклад","зп","wynagrodzenie","pensja"]', 1),
('system', NULL, 'Фриланс', '💻', 'income', '["фриланс","freelance","подработка","проект","umowa zlecenie","umowa o dzielo","faktura"]', 2),
('system', NULL, 'Инвестиции', '📊', 'income', '["инвестиции","дивиденды","проценты","odsetki","dywidenda","zysk"]', 3),
('system', NULL, 'Подарок', '🎁', 'income', '["подарок","gift","бонус","premia","nagroda"]', 4),
('system', NULL, 'Возврат', '↩️', 'income', '["возврат","refund","кэшбэк","cashback","zwrot"]', 5),
('system', NULL, 'Другое', '💰', 'income', '["другое","wplata","przelew przychodzacy"]', 99);
