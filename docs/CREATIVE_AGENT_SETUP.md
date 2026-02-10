# Настройка Агента-Креативщика в n8n

**Дата:** 2026-01-21
**Workflow:** creative-agent-v1.json
**Статус:** Ready to deploy
**Бренд:** House Charm

---

## 📋 Что делает этот workflow?

Агент-Креативщик автоматически:

1. **Принимает данные о продукте** через Webhook (JSON)
2. **Генерирует 3 TikTok сценария:**
   - До/После трансформация
   - Проблема-Решение (PAS формула)
   - ASMR/Satisfying контент
3. **Генерирует 2 Meta Ads сценария:**
   - Feed & Reels креативы
   - Stories креативы
4. **Создает промпты для изображений** (Midjourney/DALL-E)
5. **Сохраняет результаты** в Google Sheets
6. **Отправляет уведомление** в Telegram
7. **Возвращает полный JSON** с готовыми сценариями

---

## 🛠️ Что нужно для запуска

### 1. API ключи

#### OpenAI API (ОБЯЗАТЕЛЬНО)
- **Зачем:** GPT-4o для генерации сценариев
- **Цена:** ~$10-20/месяц (зависит от использования)
- **Регистрация:** https://platform.openai.com/
- **Как получить:**
  1. Создать аккаунт
  2. API Keys → Create new secret key
  3. Скопировать ключ

**Рекомендации по модели:**
- **GPT-4o** — лучшее качество, креативность ($10/1M токенов)
- **GPT-4o-mini** — бюджетный вариант ($0.15/1M токенов)

**Оценка расхода:**
- 1 продукт = ~5,000 токенов
- 30 продуктов/месяц = ~150,000 токенов
- Стоимость GPT-4o: $1.50/месяц
- Стоимость GPT-4o-mini: $0.02/месяц

#### Google Sheets API (ОБЯЗАТЕЛЬНО)
- **Зачем:** Сохранение сценариев и результатов
- **Цена:** БЕСПЛАТНО
- **Настройка:**
  1. Создать Google таблицу
  2. В n8n добавить Google Sheets credentials
  3. Дать доступ к таблице

#### Telegram Bot (ОПЦИОНАЛЬНО)
- **Зачем:** Уведомления о готовых креативах
- **Цена:** БЕСПЛАТНО
- **Создание бота:**
  1. Написать @BotFather в Telegram
  2. /newbot
  3. Получить токен
  4. Узнать свой Chat ID: @userinfobot

---

## 📥 Импорт workflow в n8n

### Шаг 1: Откройте n8n

Перейдите по адресу: http://localhost:5678

### Шаг 2: Импортируйте workflow

1. Нажмите **"Import from File"** или **Ctrl+O**
2. Выберите файл: `TARS/workflows/creative-agent-v1.json`
3. Workflow появится в редакторе

### Шаг 3: Настройте credentials

#### OpenAI (для n8n версии 2.3.6)

**ВАЖНО:** Workflow использует HTTP Request ноды (не OpenAI ноды), поэтому настройка отличается:

1. Кликните на ноду **"GPT: TikTok Before-After"**
2. В секции **Credentials** → **Create New Credential**
3. Выберите **HTTP Header Auth**
4. Заполните:
   - **Name:** `OpenAI API Key`
   - **Credential Data:**
     - **Name:** `Authorization`
     - **Value:** `Bearer YOUR_OPENAI_API_KEY`

   ⚠️ **Важно:** Ключ должен начинаться с `Bearer ` (с пробелом!)

5. Нажмите **Save**

**Применить ко всем нодам GPT:**
- Повторите для всех 5 GPT нод:
  1. GPT: TikTok Before-After
  2. GPT: TikTok Problem-Solution
  3. GPT: TikTok ASMR
  4. GPT: Meta Feed & Reels
  5. GPT: Meta Stories

**Альтернатива:** Создайте credential один раз, затем выберите его из списка в остальных нодах.

#### Google Sheets

1. Кликните на ноду **"Сохранить в Google Sheets"**
2. **Credentials** → **Create New**
3. Выберите **Google Sheets OAuth2**
4. Следуйте инструкциям OAuth
5. **Document ID:** Создайте таблицу и скопируйте ID из URL
   - URL: `https://docs.google.com/spreadsheets/d/ВАША_ТАБЛИЦА_ID/edit`
   - Скопируйте `ВАША_ТАБЛИЦА_ID`

**Структура таблицы:**

Создайте лист с названием `Creative_Output` и колонками:

| creative_batch_id | timestamp | product_name | tiktok_count | meta_count | full_json |
|-------------------|-----------|--------------|--------------|------------|-----------|

#### Telegram (опционально)

1. Кликните на ноду **"Уведомление в Telegram"**
2. **Credentials** → **Create New**
3. **Access Token:** Токен от @BotFather
4. **Chat ID:** Ваш Chat ID от @userinfobot

---

## 🚀 Как использовать workflow

### Метод 1: Через Webhook (Рекомендуется)

**Шаг 1:** Активируйте workflow

Нажмите кнопку **"Active"** вверху справа

**Шаг 2:** Получите Webhook URL

1. Кликните на ноду **"Webhook: Получить данные продукта"**
2. Скопируйте **Webhook URL** (например: `http://localhost:5678/webhook/creative-agent-input`)

**Шаг 3:** Отправьте POST запрос с данными продукта

**Пример с curl:**
```bash
curl -X POST http://localhost:5678/webhook/creative-agent-input \
  -H "Content-Type: application/json" \
  -d '{
    "product_info": {
      "product_id": "hc_20260121_001",
      "name": "3-in-1 Spray Mop & Window Cleaner",
      "category": "Cleaning Tools",
      "price": 29.99,
      "discount_percent": 40,
      "sale_price": 17.99
    },
    "product_details": {
      "main_benefit": "Clean floors and windows in half the time",
      "problem_solved": "No more heavy buckets, wringing, or back pain",
      "usp": "3 tools in 1 - mop, sprayer, window cleaner"
    },
    "target_audience": {
      "primary": "Busy moms ages 25-45"
    },
    "creative_requirements": {
      "platforms": ["tiktok", "meta_ads"]
    }
  }'
```

**Пример с Postman:**
1. Method: POST
2. URL: `http://localhost:5678/webhook/creative-agent-input`
3. Body → Raw → JSON
4. Вставьте JSON выше

**Шаг 4:** Получите результат

Workflow вернет полный JSON с готовыми сценариями:
```json
{
  "creative_batch_id": "creative_20260121_abc123",
  "timestamp": "2026-01-21T14:30:00Z",
  "product_name": "3-in-1 Spray Mop & Window Cleaner",
  "tiktok_creatives": [ /* 3 сценария */ ],
  "meta_ads_creatives": [ /* 2 сценария */ ],
  "image_prompts": { /* промпты для Midjourney */ },
  "performance_predictions": { /* прогнозы */ },
  "next_steps": [ /* что делать дальше */ ]
}
```

---

### Метод 2: Ручной запуск (для тестирования)

1. Деактивируйте webhook
2. Кликните на ноду **"Извлечь данные продукта"**
3. Измените значения вручную
4. Нажмите **"Execute Workflow"**

---

## 📊 Формат входных данных (полный)

```json
{
  "product_info": {
    "product_id": "hc_20260121_001",
    "name": "Магнитные держатели для ножей",
    "category": "Kitchen Organization",
    "subcategory": "Storage",
    "brand": "House Charm",
    "price": 24.99,
    "discount_percent": 35,
    "sale_price": 16.24
  },
  "product_details": {
    "main_benefit": "Освободи место на столешнице и храни ножи безопасно",
    "problem_solved": "Беспорядок в ящиках с ножами, риск порезов",
    "key_features": [
      "Магнитное крепление",
      "Вмещает до 10 ножей",
      "Легкая установка без сверления",
      "Современный дизайн"
    ],
    "usp": "Безопасное хранение + стильный вид кухни",
    "materials": "Нержавеющая сталь, магнит неодимовый",
    "dimensions": "16 inches длина"
  },
  "target_audience": {
    "primary": "Домохозяйки 30-50 лет",
    "secondary": "Любители готовки, владельцы малых кухонь",
    "pain_points": [
      "Мало места на кухне",
      "Ножи тупятся в ящиках",
      "Риск порезов при поиске ножа"
    ]
  },
  "creative_requirements": {
    "platforms": ["tiktok", "meta_ads"],
    "video_types": ["before_after", "problem_solution"],
    "quantity": {
      "tiktok_scripts": 3,
      "meta_ads_scripts": 2
    },
    "tone": "Helpful, enthusiastic, relatable",
    "avoid": ["Overly salesy", "Stock footage feel"]
  },
  "assets_available": {
    "product_photos": ["url1.jpg", "url2.jpg"],
    "demo_videos": [],
    "testimonials": [
      {
        "name": "Jessica T.",
        "rating": 5,
        "quote": "My kitchen looks so organized now!"
      }
    ]
  }
}
```

**Минимальные обязательные поля:**
```json
{
  "product_info": {
    "name": "Название продукта",
    "category": "Категория",
    "price": 29.99,
    "sale_price": 19.99
  },
  "product_details": {
    "main_benefit": "Основная выгода",
    "problem_solved": "Какую проблему решает"
  },
  "target_audience": {
    "primary": "Целевая аудитория"
  },
  "creative_requirements": {
    "platforms": ["tiktok", "meta_ads"]
  }
}
```

---

## 📤 Формат выходных данных

Подробный пример в файле [CREATIVE_AGENT_STRATEGY.md](CREATIVE_AGENT_STRATEGY.md) в разделе "Выходной формат данных".

**Кратко:**
- `creative_batch_id` — уникальный ID батча
- `tiktok_creatives[]` — массив из 3 TikTok сценариев
- `meta_ads_creatives[]` — массив из 2 Meta сценариев
- `image_prompts` — промпты для Midjourney/DALL-E
- `performance_predictions` — прогнозы эффективности
- `next_steps` — что делать дальше

---

## 🎨 Как использовать сгенерированные креативы

### Для TikTok:

1. **Прочитай сценарий** из `tiktok_creatives[0]`
2. **Сними видео** согласно `script` (hook → problem → solution → cta)
3. **Смонтируй в CapCut:**
   - Следуй `production_notes` (камера, освещение, editing)
   - Добавь `text_overlay` из каждого кадра
   - Используй `audio` рекомендации
4. **Опубликуй:**
   - Caption: используй `caption` из JSON
   - Hashtags: `hashtags[]`
   - Музыка: `music_suggestion`
   - Время публикации: `posting_time`

### Для Meta Ads:

1. **Прочитай сценарий** из `meta_ads_creatives[0]`
2. **Сними/смонтируй** по `script` (stop → show → sell)
3. **Настрой рекламу в Ads Manager:**
   - Primary text: `ad_copy.primary_text`
   - Headline: `ad_copy.headline`
   - CTA button: `ad_copy.cta_button`
   - Targeting: `targeting_notes`

### Для изображений:

1. **Midjourney:**
   - Скопируй промпт из `image_prompts.midjourney_prompts[0].prompt`
   - Вставь в Midjourney Discord
   - Получи изображение для thumbnail

2. **DALL-E:**
   - Используй `dall_e_prompts[]` для иллюстраций

---

## 🔧 Настройка под свой бренд

### Изменить бренд (вместо House Charm)

**В ноде "GPT-4: Сценарий TikTok #1":**

Замените:
```
"Ты — эксперт по вирусному TikTok контенту для household товаров бренда House Charm."
```

На:
```
"Ты — эксперт по вирусному TikTok контенту для [ВАША НИША] товаров бренда [ВАШ БРЕНД]."
```

**Примеры:**
- "для fitness товаров бренда FitPro"
- "для beauty товаров бренда GlowUp"
- "для pet supplies бренда PawsomePets"

### Изменить tone of voice

В `creative_requirements.tone` укажите:
- "Professional, trustworthy" — для серьезных товаров
- "Fun, playful, energetic" — для молодежной аудитории
- "Calm, soothing, ASMR" — для relax продуктов

### Добавить больше креативов

**Дублировать ноду GPT:**
1. Скопируй ноду "GPT-4: Сценарий TikTok #1"
2. Измени тип креатива (например, "unboxing", "educational")
3. Подключи к "Объединить TikTok сценарии"

---

## 🎯 A/B тестирование креативов

### Стратегия тестирования:

**Неделя 1: Органический TikTok**
1. Опубликуй все 3 TikTok креатива
2. Отслеживай метрики:
   - Views
   - Engagement rate
   - CTR to bio
3. Определи лучший креатив

**Неделя 2: TikTok Ads**
1. Запусти лучший креатив как рекламу
2. Бюджет: $50-100
3. Проверь ROAS

**Неделя 3: Meta Ads**
1. Запусти Meta креативы параллельно
2. A/B тест: Feed vs Stories
3. Оптимизируй лучший

---

## 📈 Оптимизация workflow

### Увеличить скорость

1. **Использовать GPT-4o-mini** вместо GPT-4o:
   - В 66 раз дешевле
   - Быстрее генерация
   - Качество немного ниже, но достаточно

2. **Убрать неиспользуемые ноды:**
   - Если не нужны Meta Ads — удалите соответствующие ноды
   - Если не нужен Telegram — удалите уведомление

3. **Кэширование:**
   - Добавьте проверку в Google Sheets
   - Если продукт уже обработан — вернуть кэшированный результат

### Улучшить качество

1. **Добавить примеры (Few-Shot Prompting):**
   - В system message добавьте 1-2 примера готовых сценариев
   - GPT будет генерировать более качественно

2. **Добавить валидацию:**
   - Нода "Code" для проверки структуры JSON
   - Если формат неверный — повторный запрос к GPT

3. **Добавить конкурентный анализ:**
   - Интегрировать TikTok Creative Center API
   - Анализировать топ креативы конкурентов
   - Генерировать на основе winning patterns

---

## 💰 Оценка затрат

### Минимальный бюджет (GPT-4o-mini)

| Компонент | Стоимость |
|-----------|-----------|
| OpenAI GPT-4o-mini | ~$1/месяц (30 продуктов) |
| Google Sheets | $0 (бесплатно) |
| Telegram Bot | $0 (бесплатно) |
| n8n | $0 (self-hosted) |
| **ИТОГО** | **~$1/месяц** |

### Оптимальный бюджет (GPT-4o)

| Компонент | Стоимость |
|-----------|-----------|
| OpenAI GPT-4o | ~$20/месяц (100 продуктов) |
| Midjourney (для изображений) | $30/месяц |
| Runway Gen-3 (для видео) | $95/месяц |
| CapCut Pro (editing) | $10/месяц |
| **ИТОГО** | **~$155/месяц** |

### Enterprise (с видео-генерацией)

| Компонент | Стоимость |
|-----------|-----------|
| OpenAI GPT-4o | $50/месяц |
| Midjourney | $60/месяц (Pro) |
| Runway Gen-3 | $95/месяц |
| ElevenLabs (voice) | $11/месяц |
| CapCut Pro | $10/месяц |
| **ИТОГО** | **~$226/месяц** |

---

## 🔥 Troubleshooting

### Ошибка: "OpenAI rate limit"

**Проблема:** Слишком много запросов к GPT

**Решение:**
1. Добавьте ноду **"Wait"** между GPT нодами (5-10 сек)
2. Используйте `gpt-4o-mini` вместо `gpt-4o`
3. Уменьшите `maxTokens` с 1500 до 1000

### Ошибка: "Invalid JSON response from GPT"

**Проблема:** GPT вернул текст вместо JSON

**Решение:**
1. В system message добавьте: **"Выведи ТОЛЬКО JSON, без markdown блоков"**
2. Добавьте ноду "Code" для очистки ответа:
```javascript
let content = $json.choices[0].message.content;
// Убрать markdown блоки ```json ... ```
content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
return { json: JSON.parse(content) };
```

### Workflow не возвращает результат

**Проблема:** Webhook не отвечает

**Решение:**
1. Убедитесь что workflow **Active**
2. Проверьте что отправляете POST (не GET)
3. Проверьте Content-Type: application/json
4. Посмотрите логи: Executions → найдите ошибку

### Креативы получаются шаблонными

**Проблема:** GPT генерирует однотипные сценарии

**Решение:**
1. Увеличьте `temperature` с 0.7 до 0.9 (больше креативности)
2. Добавьте в промпт: "Избегай клише и шаблонов"
3. Используйте few-shot примеры разных стилей

---

## 🚀 Roadmap улучшений

### Фаза 1: Базовая версия (текущая)
- ✅ 3 TikTok сценария
- ✅ 2 Meta Ads сценария
- ✅ Промпты для изображений
- ✅ Сохранение в Google Sheets

### Фаза 2: Интеграция с генерацией (неделя 2)
- [ ] Автоматическая генерация изображений через Midjourney API
- [ ] Автоматическая генерация видео через Runway API
- [ ] Voice-over через ElevenLabs

### Фаза 3: Аналитика (неделя 3-4)
- [ ] Интеграция с TikTok Analytics
- [ ] Tracking успешности креативов
- [ ] Обучение на лучших креативах (Reinforcement Learning)

### Фаза 4: Полная автоматизация (месяц 2)
- [ ] Интеграция с Агентом-Скаутом
- [ ] Автоматическая генерация креативов при новом товаре
- [ ] Автоматический постинг в TikTok/Meta

---

## 📚 Примеры использования

### Пример 1: Kitchen Gadget

**Input:**
```json
{
  "product_info": {
    "name": "Magnetic Knife Holder",
    "category": "Kitchen Storage",
    "price": 24.99,
    "sale_price": 16.24
  },
  "product_details": {
    "main_benefit": "Free up counter space",
    "problem_solved": "Messy knife drawer, risk of cuts"
  },
  "target_audience": {
    "primary": "Home cooks 30-50"
  },
  "creative_requirements": {
    "platforms": ["tiktok"]
  }
}
```

**Output:**
- TikTok #1: До/После (беспорядочный ящик → организованная стена)
- TikTok #2: PAS (показать опасность ящика с ножами → решение)
- TikTok #3: ASMR (звук магнитного "щелчка" ножей)

### Пример 2: Cleaning Product

**Input:**
```json
{
  "product_info": {
    "name": "Electric Spin Scrubber",
    "category": "Cleaning Tools",
    "price": 39.99,
    "sale_price": 24.99
  },
  "product_details": {
    "main_benefit": "Clean bathroom in 5 minutes",
    "problem_solved": "Back pain from scrubbing"
  },
  "target_audience": {
    "primary": "Busy moms"
  },
  "creative_requirements": {
    "platforms": ["tiktok", "meta_ads"]
  }
}
```

**Output:**
- 3 TikTok сценария + 2 Meta Ads
- Фокус на экономию времени и физической нагрузки

---

## 📞 Поддержка

Если возникли вопросы:
1. Проверьте логи workflow: **Executions** → выберите запуск
2. Изучите ошибку в проблемной ноде
3. Обратитесь к документации:
   - [Стратегия креативов](CREATIVE_AGENT_STRATEGY.md)
   - [n8n Docs](https://docs.n8n.io/)
   - [OpenAI API Docs](https://platform.openai.com/docs)

---

**Создано:** 2026-01-21
**Версия:** 1.0
**Автор:** TARS AI Agent System
**Бренд:** House Charm
