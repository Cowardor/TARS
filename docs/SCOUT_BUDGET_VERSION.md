# Агент-Скаут: Бюджетная версия

**Дата:** 2026-01-19
**Бюджет:** $5-15/месяц
**Цель:** Рабочий прототип с минимальными затратами

---

## 💰 Структура затрат

| Сервис | Стоимость | Статус |
|--------|-----------|--------|
| **OpenAI API (GPT-4o-mini)** | ~$5/месяц | ✅ Оставляем |
| **SerpAPI** | $50/месяц | ❌ Заменяем на бесплатное |
| **Google Trends** | БЕСПЛАТНО | ✅ Оставляем |
| **Google Sheets** | БЕСПЛАТНО | ✅ Оставляем |
| **Telegram Bot** | БЕСПЛАТНО | ✅ Оставляем |
| **AliExpress Scraping** | БЕСПЛАТНО | ✅ Добавляем |
| **TikTok Creative Center** | БЕСПЛАТНО | ✅ Добавляем |

**ИТОГО:** ~$5-15/месяц (только OpenAI)

---

## 🔄 Замены дорогих инструментов

### ❌ Вместо SerpAPI ($50/месяц)

**Используем:**

#### 1. **Прямой парсинг AliExpress через HTTP Request**
- AliExpress имеет открытый API для дропшипперов
- URL: `https://aliexpress.com/wholesale?SearchText={query}&SortType=total_tranpro_desc`
- Бесплатно, но нужен парсинг HTML

#### 2. **AliExpress Dropshipping Center API** (официальный, бесплатный)
- URL: `https://portals.aliexpress.com/dropshipper/tools_center.htm`
- Данные о trending products
- Не требует API ключа

#### 3. **RapidAPI - AliExpress Unofficial API** (бесплатный tier)
- URL: https://rapidapi.com/apidojo/api/aliexpress-datahub
- 100 запросов/день бесплатно
- Достаточно для тестирования

---

## 🛠️ Обновленный workflow для бюджетной версии

### Архитектура:

```
1. Schedule Trigger (каждый день 9:00)
   ↓
2. Set Parameters (категория поиска)
   ↓
3. RapidAPI: AliExpress Search (бесплатно, 100 товаров/день)
   ↓
4. Filter: Слой 1 (рейтинг ≥4.5, отзывы >100, цена $15-60)
   ↓
5. Google Trends API (бесплатно) - валидация трендов
   ↓
6. GPT-4o-mini: Анализ креативного потенциала ($0.15 за 1000 токенов)
   ↓
7. Calculate Economics (расчет прибыли)
   ↓
8. Save to Google Sheets (бесплатно)
   ↓
9. Telegram Notification (бесплатно)
```

---

## 📋 Пошаговая настройка бюджетной версии

### Шаг 1: Регистрация в RapidAPI (бесплатно)

1. Перейдите на: https://rapidapi.com/apidojo/api/aliexpress-datahub
2. Зарегистрируйтесь (бесплатно)
3. Выберите **Basic Plan** (0$/месяц, 100 запросов/день)
4. Скопируйте **X-RapidAPI-Key**

**Лимиты бесплатного плана:**
- 100 запросов/день = достаточно для анализа 100 товаров/день
- Без ограничений по времени

---

### Шаг 2: Настройка OpenAI (минимальный расход)

**Используем GPT-4o-mini вместо GPT-4:**
- GPT-4: $10 за 1M токенов (дорого)
- **GPT-4o-mini: $0.15 за 1M токенов** (в 66 раз дешевле!)

**Оценка расхода:**
- 100 товаров/день × 500 токенов/товар = 50,000 токенов/день
- 50,000 токенов × 30 дней = 1.5M токенов/месяц
- Стоимость: **1.5 × $0.15 = $0.225/месяц** (меньше доллара!)

**Как настроить в n8n:**
1. Нода: **OpenAI**
2. Model: `gpt-4o-mini` (вместо gpt-4o)
3. Max Tokens: `300` (сократить до минимума)

---

### Шаг 3: Google Trends API (бесплатно)

**Используем библиотеку `google-trends-api`:**
- Никаких API ключей не нужно
- Полностью бесплатно
- Неограниченные запросы

**Реализация в n8n:**
1. Нода: **HTTP Request**
2. URL: `https://trends.google.com/trends/api/explore?hl=en-US&tz=-120&q={product_name}`
3. Парсинг JSON ответа

**Альтернатива:** n8n нода **Execute Command** + npm пакет:
```bash
npm install google-trends-api
```

---

### Шаг 4: TikTok Creative Center (бесплатно)

**Используем официальный бесплатный инструмент:**
- URL: https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en
- Данные о трендовых товарах
- Вирусные видео и хештеги

**Парсинг через n8n:**
1. Нода: **HTTP Request**
2. URL: TikTok Creative Center API (неофициальный endpoint)
3. Извлечение трендовых товаров

**Примечание:** TikTok может блокировать автоматические запросы, поэтому используем как дополнительную проверку, а не основной источник.

---

## 🔧 Обновленный JSON workflow (бюджетная версия)

### Изменения в workflow:

#### Заменяем ноду SerpAPI на RapidAPI:

**Старая нода (SerpAPI - $50/месяц):**
```json
{
  "name": "SerpAPI: AliExpress Search",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://serpapi.com/search",
    "authentication": "genericCredentialType",
    "genericAuthType": "queryAuth"
  }
}
```

**Новая нода (RapidAPI - бесплатно):**
```json
{
  "name": "RapidAPI: AliExpress Search",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://aliexpress-datahub.p.rapidapi.com/product_search",
    "method": "GET",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "queryParameters": {
      "keywords": "={{ $json.search_query }}",
      "page": "1",
      "pageSize": "100",
      "sort": "orders_desc"
    },
    "headers": {
      "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
      "X-RapidAPI-Host": "aliexpress-datahub.p.rapidapi.com"
    }
  }
}
```

#### Заменяем GPT-4 на GPT-4o-mini:

```json
{
  "name": "GPT-4o-mini: Анализ креативности",
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "parameters": {
    "model": "gpt-4o-mini",
    "maxTokens": 300,
    "temperature": 0.7,
    "prompt": "Analyze creative potential of this product..."
  }
}
```

---

## ⚙️ Оптимизация для экономии токенов OpenAI

### 1. Сократить промпт для GPT-4o-mini

**Вместо длинного промпта (1000 токенов):**
```
Analyze this product thoroughly. Consider viral potential, TikTok hooks,
creative angles, target audience psychology, seasonal trends, UGC potential...
```

**Используем короткий промпт (200 токенов):**
```
Product: {name}
Price: {price}
Rating: {rating}

Score 1-10:
1. Viral potential
2. Demo video ease
3. Problem-solution clarity

Output JSON: {"viral": X, "demo": X, "problem": X, "total": X}
```

**Экономия:** 80% токенов (с 1000 до 200)

---

### 2. Батчинг запросов

Вместо 100 отдельных запросов к GPT:
```json
{
  "products": [
    {"name": "Product 1", "price": 25},
    {"name": "Product 2", "price": 30}
  ]
}
```

Один запрос анализирует 5-10 товаров сразу.

**Экономия:** 50% токенов (меньше overhead на системные сообщения)

---

### 3. Кэширование результатов

Если товар уже анализировался вчера:
```javascript
// Проверка в Google Sheets
if (product_id exists in sheet) {
  return cached_analysis;
} else {
  call GPT-4o-mini;
}
```

**Экономия:** До 70% запросов для повторяющихся товаров

---

## 📊 Финальная оценка затрат (бюджетная версия)

| Компонент | Месячная стоимость |
|-----------|-------------------|
| RapidAPI AliExpress | $0 (бесплатный tier) |
| Google Trends API | $0 (бесплатно) |
| OpenAI GPT-4o-mini | ~$5 (с оптимизацией) |
| Google Sheets | $0 (бесплатно) |
| Telegram Bot | $0 (бесплатно) |
| n8n | $0 (self-hosted) |
| **ИТОГО** | **~$5/месяц** |

---

## ⚠️ Ограничения бюджетной версии

### Что теряем по сравнению с Pro-версией:

1. **Скорость:**
   - RapidAPI медленнее, чем SerpAPI
   - Лимит 100 товаров/день (вместо неограниченного)

2. **Точность данных:**
   - RapidAPI может иметь задержки в обновлении данных
   - Нет данных о реальных продажах (как в Sell The Trend)

3. **TikTok аналитика:**
   - Нет Kalodata/FastMoss (платные сервисы)
   - Используем только бесплатный TikTok Creative Center

4. **Конкурентный анализ:**
   - Нет Ali Insider ($19/месяц)
   - Ручная проверка конкурентов

### Что сохраняем:

✅ 7-слойная валидация (все слои работают)
✅ Анализ трендов (Google Trends)
✅ AI-анализ креативности (GPT-4o-mini)
✅ Юнит-экономика (полные расчеты)
✅ Автоматизация (n8n workflow)
✅ Уведомления (Telegram)
✅ Хранение данных (Google Sheets)

---

## 🚀 План миграции на Pro-версию (в будущем)

### Когда переходить на платные инструменты:

**Сигналы:**
1. Находите 5+ STRONG BUY товаров/неделю → есть результаты
2. Лимит RapidAPI (100/день) стал узким местом
3. Нужна более глубокая TikTok аналитика
4. Готовы масштабировать на 10+ ниш одновременно

**Первый платный инструмент для покупки:**
- **Sell The Trend** ($40/месяц) - дает наибольший прирост качества

**Второй:**
- **Kalodata** ($99/месяц) - если продаете через TikTok Shop

---

## ✅ Следующие шаги

1. Зарегистрируйтесь в RapidAPI (5 минут)
2. Получите OpenAI API ключ (если еще нет)
3. Я обновлю workflow на бюджетную версию
4. Импортируем в n8n и тестируем

**Готовы начать?** Скажите, если у вас уже есть OpenAI API ключ.
