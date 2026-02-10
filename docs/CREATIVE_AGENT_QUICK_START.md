# Креатив Агент - Быстрый старт для новичков

**Дата:** 2026-01-21
**Для кого:** Люди без опыта в программировании
**Цель:** Научиться генерировать креативы для товаров из AliExpress

---

## Что это делает?

Вы даёте боту ссылку на товар с AliExpress → Бот создаёт готовые сценарии для:
- 🎥 **3 креатива для TikTok** (До/После, Проблема-Решение, ASMR)
- 📱 **2 креатива для Meta Ads** (Feed/Reels + Stories)
- 🎨 **Промпты для картинок** (Midjourney/DALL-E)
- 📊 **Прогнозы эффективности** (CTR, ROAS, вирусность)

**Время работы:** 10-30 секунд
**Стоимость:** ~$0.05 за товар (OpenAI GPT-4o)

---

## Шаг 1: Установка n8n (один раз)

### Вариант А: Облачная версия (самый простой)

1. Перейдите на https://n8n.io/
2. Нажмите **"Start for free"**
3. Зарегистрируйтесь через Google/Email
4. ✅ Готово! n8n запущен в облаке

### Вариант Б: Локальная установка (для продвинутых)

**Требования:**
- Windows 10+
- Node.js v18+ ([скачать](https://nodejs.org/))

**Установка:**
```bash
# Откройте PowerShell и выполните:
npx n8n

# n8n запустится по адресу: http://localhost:5678
```

---

## Шаг 2: Импорт workflow в n8n

1. Откройте n8n (http://localhost:5678 или облачную версию)
2. Нажмите **"Workflows"** в левом меню
3. Нажмите **"Import from File"** (или Ctrl+O)
4. Выберите файл: `TARS/workflows/creative-agent-v1.json`
5. Workflow появится на экране

---

## Шаг 3: Настройка OpenAI ключа

### 3.1. Получите OpenAI API ключ (если еще нет)

1. Перейдите на https://platform.openai.com/
2. Зарегистрируйтесь или войдите
3. Нажмите **"API Keys"** → **"Create new secret key"**
4. Скопируйте ключ (выглядит как `sk-proj-...`)

**⚠️ ВНИМАНИЕ:** Ключ показывается только один раз! Сохраните его.

### 3.2. Добавьте ключ в n8n

1. В workflow кликните на любую ноду **"GPT: TikTok..."**
2. В правой панели найдите **"Credentials"**
3. Нажмите **"Create New Credential"**
4. Выберите **"HTTP Header Auth"**
5. Заполните:
   - **Name:** `OpenAI API Key`
   - **Credential Data:**
     - **Name:** `Authorization`
     - **Value:** `Bearer ВАШ_КЛЮЧ_OPENAI`

   Пример:
   ```
   Bearer YOUR_OPENAI_API_KEY
   ```

6. Нажмите **"Save"**
7. Выберите созданный credential во ВСЕХ 5 нодах GPT:
   - GPT: TikTok Before-After
   - GPT: TikTok Problem-Solution
   - GPT: TikTok ASMR
   - GPT: Meta Feed & Reels
   - GPT: Meta Stories

---

## Шаг 4: Активация workflow

1. Нажмите **"Save"** (Ctrl+S) вверху справа
2. Включите workflow переключателем **"Active"** (станет зелёным)
3. ✅ Workflow запущен!

---

## Шаг 5: Как отправить товар на анализ

### Вариант 1: Через Postman (для техничных)

1. Скачайте [Postman](https://www.postman.com/downloads/)
2. Создайте новый **POST** запрос
3. URL: `http://localhost:5678/webhook/creative-agent`
4. Body → **raw** → **JSON**
5. Вставьте данные товара (см. шаблон ниже)
6. Нажмите **"Send"**

### Вариант 2: Через веб-форму (самый простой)

**Мы создадим отдельную HTML форму ниже!**

---

## 📋 Шаблон данных для товара

### Пример 1: Минимальная версия (быстрый тест)

```json
{
  "product_info": {
    "name": "Heated Neck Massager",
    "category": "Health & Wellness",
    "price": 24.99,
    "sale_price": 14.99,
    "discount_percent": 40
  },
  "product_details": {
    "main_benefit": "Relieves neck pain in 15 minutes",
    "problem_solved": "Chronic neck stiffness from desk work"
  },
  "target_audience": {
    "primary": "Office workers 25-45"
  }
}
```

### Пример 2: Полная версия (максимум деталей)

```json
{
  "product_info": {
    "name": "Magic Cleaning Sponge - Melamine Foam",
    "category": "Home & Garden",
    "aliexpress_url": "https://aliexpress.com/item/1234567890.html",
    "price": 9.99,
    "sale_price": 4.99,
    "discount_percent": 50,
    "rating": 4.8,
    "reviews_count": 3240
  },
  "product_details": {
    "main_benefit": "Removes any stain without chemicals - just add water",
    "problem_solved": "Stubborn stains on walls, floors, shoes",
    "usp": "Works on surfaces other sponges can't clean",
    "features": [
      "No chemicals needed",
      "Works on 100+ surfaces",
      "Lasts 3x longer than regular sponges"
    ]
  },
  "target_audience": {
    "primary": "Busy moms 28-45",
    "secondary": "Renters who need to clean walls before moving out",
    "pain_points": [
      "Kids drawings on walls",
      "Coffee stains on counters",
      "Scuff marks on floors"
    ]
  },
  "content_preferences": {
    "tone": "Casual, relatable",
    "style": "UGC, iPhone camera",
    "emphasis": "Satisfying transformation"
  }
}
```

---

## 🎯 Как заполнить данные из AliExpress

### Шаг 1: Откройте товар на AliExpress

Пример: https://aliexpress.com/item/1005004892653184.html

### Шаг 2: Скопируйте информацию

1. **Название товара** → `product_info.name`
2. **Категория** (сверху) → `product_info.category`
3. **Старая цена** → `product_info.price`
4. **Текущая цена** → `product_info.sale_price`
5. **Скидка %** → `product_info.discount_percent`
6. **Рейтинг** (звёзды) → `product_info.rating`
7. **Количество отзывов** → `product_info.reviews_count`

### Шаг 3: Заполните детали товара

**main_benefit** - главная выгода (из описания товара)
Ищите фразы:
- "Makes ... easier"
- "Saves ... time"
- "Removes ... stains"

**problem_solved** - какую проблему решает
Ищите в отзывах:
- "Before I had ..."
- "I used to struggle with ..."

**target_audience** - целевая аудитория
Смотрите на отзывы:
- Кто покупает? (мамы, студенты, офисные работники)
- Возраст упоминается в отзывах?

---

## ⚙️ Что вы получите на выходе

### Формат ответа (JSON):

```json
{
  "creative_batch_id": "creative_20260121_abc123",
  "timestamp": "2026-01-21T10:30:00Z",
  "product_name": "Heated Neck Massager",

  "tiktok_creatives": [
    {
      "creative_id": "tiktok_001",
      "type": "before_after",
      "duration": "15 seconds",
      "script": {
        "hook": {
          "visual": "Person rubbing stiff neck at desk",
          "text_overlay": "POV: Your neck is killing you after 8hrs at desk",
          "duration": "0-2 sec",
          "audio": "Groaning sound effect"
        },
        "problem": { ... },
        "solution": { ... },
        "cta": { ... }
      },
      "hashtags": ["#neckpain", "#desklife", "#housecharm"],
      "caption": "Why didn't I buy this sooner?! 😭"
    }
    // + 2 других TikTok креатива
  ],

  "meta_ads_creatives": [
    // 2 креатива для Meta Ads
  ],

  "image_prompts": {
    "midjourney_prompts": [
      {
        "purpose": "TikTok thumbnail - before",
        "prompt": "Person with neck pain at office desk..."
      }
    ]
  },

  "performance_predictions": {
    "tiktok": {
      "estimated_views": "50K-200K",
      "viral_potential_score": 8.5
    },
    "meta_ads": {
      "estimated_ctr": "2.5-4%",
      "estimated_roas": "3.5-5x"
    }
  },

  "next_steps": [
    "Review and approve scripts",
    "Film content or generate via AI",
    "A/B test TikTok creatives organically"
  ]
}
```

### Как использовать результаты:

1. **TikTok креативы:**
   - Прочитайте `script` (сценарий видео)
   - Снимите видео по инструкциям `visual` и `audio`
   - Добавьте `text_overlay` (текст на экране)
   - Опубликуйте с `hashtags` и `caption`

2. **Meta Ads креативы:**
   - Используйте для Facebook/Instagram рекламы
   - Следуйте структуре STOP-SHOW-SELL

3. **Image prompts:**
   - Вставьте в Midjourney/DALL-E
   - Получите thumbnail картинки для видео

4. **Performance predictions:**
   - Оцените потенциал креатива
   - Выберите лучший для запуска

---

## 🚀 Быстрый тест (за 5 минут)

### 1. Скопируйте минимальный шаблон:

```json
{
  "product_info": {
    "name": "Super Cleaning Sponge",
    "category": "Kitchen",
    "price": 9.99,
    "sale_price": 4.99,
    "discount_percent": 50
  },
  "product_details": {
    "main_benefit": "Removes stains without chemicals",
    "problem_solved": "Stubborn kitchen grease"
  },
  "target_audience": {
    "primary": "Busy homemakers"
  }
}
```

### 2. Откройте Postman или используйте cURL:

**cURL команда (вставьте в терминал):**
```bash
curl -X POST http://localhost:5678/webhook/creative-agent \
  -H "Content-Type: application/json" \
  -d '{
    "product_info": {
      "name": "Super Cleaning Sponge",
      "category": "Kitchen",
      "price": 9.99,
      "sale_price": 4.99,
      "discount_percent": 50
    },
    "product_details": {
      "main_benefit": "Removes stains without chemicals",
      "problem_solved": "Stubborn kitchen grease"
    },
    "target_audience": {
      "primary": "Busy homemakers"
    }
  }'
```

### 3. Подождите 10-30 секунд

### 4. Получите JSON с 5 креативами! 🎉

---

## 🛠️ HTML форма для отправки (копируйте и сохраните как .html)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>TARS Creative Agent - Генератор креативов</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        textarea {
            min-height: 80px;
            font-family: monospace;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 10px;
        }
        button:hover {
            background: #45a049;
        }
        #result {
            margin-top: 30px;
            padding: 20px;
            background: white;
            border-radius: 4px;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 12px;
            max-height: 500px;
            overflow-y: auto;
            display: none;
        }
        .loading {
            text-align: center;
            color: #666;
            display: none;
        }
    </style>
</head>
<body>
    <h1>🎬 TARS Creative Agent</h1>
    <p style="text-align: center; color: #666;">Генератор креативов для TikTok и Meta Ads</p>

    <form id="productForm">
        <div class="form-group">
            <label>Название товара:</label>
            <input type="text" id="productName" placeholder="Heated Neck Massager" required>
        </div>

        <div class="form-group">
            <label>Категория:</label>
            <input type="text" id="category" placeholder="Health & Wellness" required>
        </div>

        <div class="form-group">
            <label>Старая цена ($):</label>
            <input type="number" step="0.01" id="price" placeholder="24.99" required>
        </div>

        <div class="form-group">
            <label>Цена со скидкой ($):</label>
            <input type="number" step="0.01" id="salePrice" placeholder="14.99" required>
        </div>

        <div class="form-group">
            <label>Скидка (%):</label>
            <input type="number" id="discount" placeholder="40" required>
        </div>

        <div class="form-group">
            <label>Главная выгода (что делает товар):</label>
            <textarea id="benefit" placeholder="Relieves neck pain in 15 minutes" required></textarea>
        </div>

        <div class="form-group">
            <label>Какую проблему решает:</label>
            <textarea id="problem" placeholder="Chronic neck stiffness from desk work" required></textarea>
        </div>

        <div class="form-group">
            <label>Целевая аудитория:</label>
            <input type="text" id="audience" placeholder="Office workers 25-45" required>
        </div>

        <button type="submit">🚀 Сгенерировать креативы</button>
    </form>

    <div class="loading" id="loading">
        ⏳ Генерируем креативы... (10-30 секунд)
    </div>

    <div id="result"></div>

    <script>
        const form = document.getElementById('productForm');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                product_info: {
                    name: document.getElementById('productName').value,
                    category: document.getElementById('category').value,
                    price: parseFloat(document.getElementById('price').value),
                    sale_price: parseFloat(document.getElementById('salePrice').value),
                    discount_percent: parseInt(document.getElementById('discount').value)
                },
                product_details: {
                    main_benefit: document.getElementById('benefit').value,
                    problem_solved: document.getElementById('problem').value
                },
                target_audience: {
                    primary: document.getElementById('audience').value
                }
            };

            loading.style.display = 'block';
            result.style.display = 'none';

            try {
                const response = await fetch('http://localhost:5678/webhook/creative-agent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const json = await response.json();
                result.textContent = JSON.stringify(json, null, 2);
                result.style.display = 'block';
            } catch (error) {
                result.textContent = 'Ошибка: ' + error.message;
                result.style.display = 'block';
            } finally {
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
```

**Как использовать HTML форму:**
1. Скопируйте код выше
2. Сохраните как `creative-agent-form.html`
3. Откройте файл в браузере
4. Заполните поля
5. Нажмите "Сгенерировать креативы"
6. Получите результат!

---

## ❓ FAQ - Частые вопросы

### 1. Workflow не запускается
- Проверьте что workflow **Active** (зелёный переключатель)
- Убедитесь что OpenAI ключ добавлен во ВСЕ 5 нод GPT
- Проверьте баланс OpenAI (https://platform.openai.com/usage)

### 2. Ошибка "Invalid API Key"
- Ключ должен начинаться с `sk-proj-` или `sk-`
- В credential пишите `Bearer ВАШ_КЛЮЧ` (с пробелом после Bearer)
- Проверьте что ключ не просрочен

### 3. Webhook не отвечает
- Убедитесь что n8n запущен (http://localhost:5678)
- Проверьте URL: `nfr`
- Если используете облачную версию n8n - URL будет другой (см. настройки webhook)

### 4. Ответ пустой или некорректный
- Проверьте что все поля заполнены в JSON
- Убедитесь что цены указаны цифрами (не текстом)
- Посмотрите логи выполнения в n8n: Executions → выберите последний запуск

### 5. Стоимость слишком высокая
- Workflow использует GPT-4o (~$0.05 за товар)
- Чтобы удешевить: измените модель на `gpt-4o-mini` ($0.005 за товар)
- Для этого в каждой GPT ноде замените `"model": "gpt-4o"` на `"model": "gpt-4o-mini"`

---

## 💰 Оценка затрат

| Использование | Модель | Стоимость |
|---------------|--------|-----------|
| 1 товар | GPT-4o | ~$0.05 |
| 10 товаров | GPT-4o | ~$0.50 |
| 100 товаров | GPT-4o | ~$5.00 |
| 1 товар | GPT-4o-mini | ~$0.005 |
| 100 товаров | GPT-4o-mini | ~$0.50 |

**Рекомендация:** Начните с GPT-4o для качества, переходите на mini для массовых генераций.

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи workflow: n8n → Executions
2. Изучите документацию: `TARS/docs/CREATIVE_AGENT_SETUP.md`
3. Проверьте OpenAI статус: https://status.openai.com/

---

**Создано:** 2026-01-21
**Версия:** 1.0
**Автор:** TARS AI Agent System
