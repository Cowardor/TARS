# 🚀 CREATIVE AGENT V2 - SETUP GUIDE

**Версия:** 2.0 - Viral Authenticity Edition
**Дата:** 2026-01-21
**Время установки:** ~15 минут

---

## 📋 ЧТО ТЕБЕ ПОНАДОБИТСЯ

### Обязательные (для базовой работы):
- ✅ **n8n** (уже установлен)
- ✅ **OpenAI API ключ** (уже есть в CLAUDE.md)

### Рекомендуемые (для крутых креативов):
- 💰 **ElevenLabs** ($11-22/мес) - Озвучка которая звучит как человек
- 🎵 **Epidemic Sound** ($15/мес) - Безопасная музыка
- 🎨 **Midjourney** ($30-60/мес) - AI изображения
- 📹 **Runway Gen-3** ($12/мес) - AI видео (опционально)

---

## 🛠️ УСТАНОВКА

### Шаг 1: Импортируй Workflow V2

1. Открой n8n: http://localhost:5678
2. Нажми **"Import from File"** (Ctrl+O)
3. Выбери файл: `TARS/workflows/creative-agent-v2.json`
4. Workflow появится в редакторе

---

### Шаг 2: Настрой OpenAI API

#### Если УЖЕ настроил для V1:
- Просто выбери существующий credential "OpenAI API Key" во всех GPT нодах
- Готово! Переходи к Шагу 3

#### Если настраиваешь ВПЕРВЫЕ:

1. Кликни на ноду **"GPT: TikTok Doomscroll Hook"**
2. В секции **Credentials** → **Create New Credential**
3. Выбери **HTTP Header Auth**
4. Заполни:
   - **Name:** `OpenAI API Key`
   - **Credential Data:**
     - **Name:** `Authorization`
     - **Value:** `Bearer YOUR_OPENAI_API_KEY`

   ⚠️ **Важно:** Ключ должен начинаться с `Bearer ` (с пробелом!)

5. Нажми **Save**

6. **Примени ко всем GPT нодам:**
   - GPT: TikTok Doomscroll Hook
   - GPT: TikTok ASMR
   - GPT: TikTok ADHD-Friendly
   - GPT: Instagram Reels Save-Optimized
   - GPT: Midjourney UGC Prompts

**Альтернатива:** Создай credential один раз, затем выбери его из списка в остальных нодах.

---

### Шаг 3: Активируй Workflow

#### Вариант A: Production Mode (рекомендуется)
1. Нажми **Ctrl+S** (сохранить workflow)
2. В правом верхнем углу найди переключатель **"Active"**
3. Переключи в **ON** (зелёный)
4. Теперь webhook работает постоянно в фоне

#### Вариант B: Test Mode (если нет кнопки Active)
1. Нажми **"Execute Workflow"**
2. Оставь окно n8n открытым
3. Webhook работает до следующего запуска
4. После каждого теста жми "Execute Workflow" снова

---

### Шаг 4: Обнови HTML форму (опционально)

Если хочешь использовать HTML форму с V2:

1. Открой `creative-agent-form.html` в текстовом редакторе
2. Найди строку 759:
```javascript
const response = await fetch('http://localhost:5678/webhook/creative-agent', {
```

3. Замени на:
```javascript
const response = await fetch('http://localhost:5678/webhook/creative-agent-v2', {
```

4. Сохрани

Или используй старую форму - она работает с обоими workflow!

---

## 🎨 НАСТРОЙКА ДОПОЛНИТЕЛЬНЫХ СЕРВИСОВ (Опционально)

### ElevenLabs - Озвучка ($11-22/мес)

**Зачем:** AI озвучка которая звучит как живой человек

1. Регистрация: https://elevenlabs.io/
2. Тарифы:
   - **Starter** ($11/мес) - 30,000 символов/мес
   - **Creator** ($22/мес) - 100,000 символов/мес
3. Создай аккаунт → получишь API ключ
4. Используй для озвучки скриптов

**Как использовать:**
- Копируешь скрипт из JSON вывода
- Вставляешь в ElevenLabs
- Скачиваешь MP3
- Накладываешь на видео

---

### Epidemic Sound - Музыка ($15/мес)

**Зачем:** 100% copyright-safe музыка для TikTok/Instagram

1. Регистрация: https://www.epidemicsound.com/
2. Тариф: **Personal** $15/мес (безлимит треков)
3. Скачивай любую музыку
4. Используй в креативах без страха copyright strike

**Альтернатива (бесплатно):**
- **TikTok Commercial Music Library** (встроенная библиотека для бизнес-аккаунтов)
- **Artlist** ($15/мес, похож на Epidemic)

---

### Midjourney - AI изображения ($30-60/мес)

**Зачем:** Создавать UGC-стиль фотографии продуктов

1. Регистрация: https://www.midjourney.com/
2. Тарифы:
   - **Basic** ($10/мес) - 200 изображений
   - **Standard** ($30/мес) - Безлимит (режим relax)
   - **Pro** ($60/мес) - Приоритетная генерация
3. Присоединись к Discord серверу Midjourney
4. Используй промпты из JSON вывода workflow

**Как использовать:**
1. Creative Agent V2 генерирует готовые Midjourney промпты
2. Копируешь промпт в Midjourney Discord
3. Пишешь `/imagine [вставь промпт]`
4. Midjourney генерирует 4 варианта
5. Выбираешь лучший → используешь в креативе

**Пример промпта (из workflow):**
```
Chaotic messy kitchen drawer with clutter, items falling out,
shot on iPhone 15 Pro, handheld camera with natural shake,
natural window lighting, golden hour sunlight, visible skin
pores on hands, slight motion blur, thumb partially visible
in corner, mild grain, off-center composition, casual home
environment, warm tones, realistic shadows --style raw --v 6 --ar 9:16
```

---

### Runway Gen-3 - AI видео ($12-95/мес)

**Зачем:** Создавать короткие AI видео (если нужно)

1. Регистрация: https://runwayml.com/
2. Тариф: **Standard** $12/мес (125 секунд видео)
3. Генерируй короткие клипы из изображений/промптов

**Когда использовать:**
- Если нужны переходы между сценами
- Для визуализации до/после без реальной съёмки
- Для ASMR эффектов (slow motion, zoom)

---

## 🎬 КАК СОЗДАТЬ КРЕАТИВ (Полный процесс)

### 1. Запусти Workflow

**Через HTML форму:**
1. Открой `creative-agent-form.html`
2. Заполни информацию о продукте
3. Нажми "Создать креативы"
4. Жди 20-40 секунд

**Через curl (для тестирования):**
```bash
curl -X POST http://localhost:5678/webhook/creative-agent-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "product_info": {
      "name": "Kitchen Drawer Organizer",
      "category": "Home & Garden",
      "price": 19.99,
      "sale_price": 9.99,
      "discount_percent": 50
    },
    "product_details": {
      "main_benefit": "Transforms chaotic drawers into organized spaces in 5 minutes",
      "problem_solved": "Messy junk drawers where you can never find anything",
      "usp": "Expandable dividers that fit any drawer size"
    },
    "target_audience": {
      "primary": "Busy moms 28-45 with ADHD",
      "pain_points": ["Constantly losing things in cluttered drawers", "Late for work searching for items"]
    }
  }'
```

---

### 2. Получи JSON с креативами

Workflow вернёт JSON с:
- ✅ **3 TikTok скрипта** (Doomscroll Hook, ASMR, ADHD-Friendly)
- ✅ **1 Instagram Reel скрипт** (Save-Optimized)
- ✅ **4 Midjourney промпта** (Before, Process, After, Close-up)
- ✅ **Production guidelines** (как снимать)
- ✅ **Прогнозы эффективности** (CTR, views, viral score)

---

### 3. Создай визуалы (Midjourney)

1. Открой раздел `image_prompts` → `midjourney_prompts` в JSON
2. Копируй каждый промпт
3. В Midjourney Discord пиши: `/imagine [промпт]`
4. Сохраняй сгенерированные изображения

**Пример:**
```
/imagine Chaotic messy kitchen drawer with clutter, items falling out,
shot on iPhone 15 Pro, handheld camera, natural window lighting, golden
hour sunlight, visible skin pores on hands, slight motion blur, thumb
partially visible in corner, mild grain, off-center composition, warm
tones --style raw --v 6 --ar 9:16
```

---

### 4. Сними видео (POV стиль)

**Оборудование:**
- iPhone (или любой смартфон)
- Естественный свет из окна
- Руки (без лица!)

**Углы съёмки:**
- **Overhead POV:** Камера сверху, руки организуют
- **Bag POV:** Камера внутри ящика, снимает снизу вверх
- **Close-ups:** Крупные планы продукта

**Важно:**
- ❌ НЕ используй штатив (держи в руке, небольшая тряска ОК)
- ❌ НЕ используй студийный свет (только окно)
- ✅ Оставь небольшие "ошибки" (off-center, палец в кадре)
- ✅ Сними 4-6 вечера (golden hour)

---

### 5. Добавь озвучку

**Вариант A: ElevenLabs (рекомендуется)**
1. Копируй текст из `audio` полей в JSON
2. Вставь в ElevenLabs
3. Выбери голос (женский casual)
4. Скачай MP3

**Вариант B: TikTok Text-to-Speech**
1. В TikTok редакторе → Text-to-Speech
2. Введи текст
3. Выбери голос "Jessie" (женский) или "Matthew" (мужской)

**Добавь ASMR звуки:**
- Ящик скользит
- Вещи щёлкают на место
- Бумага шуршит
- Spray bottle (если применимо)

---

### 6. Добавь музыку (copyright-safe)

**Epidemic Sound:**
1. Зайди на Epidemic Sound
2. Поиск: "satisfying", "chill", "upbeat"
3. Скачай трек
4. Наложи на видео (низкая громкость, чтобы слышать озвучку)

**Альтернатива:**
- TikTok Commercial Music Library (встроенная)
- Artlist ($15/мес)
- Собственный оригинальный звук

---

### 7. Редактируй и постишь

**Редактирование:**
- Используй **CapCut**, **Adobe Premiere Rush**, или TikTok Editor
- Длина: **20-30 секунд** (sweet spot для алгоритма)
- Добавь **text overlays** из JSON скрипта
- ⚠️ **Убери водяные знаки** (TikTok штрафует в 2026!)

**Постинг:**
- **Лучшее время:** 6-8 AM, 12-1 PM, 8-10 PM
- **Caption:** Используй keywords из JSON (не hashtag spam)
- **Hashtags:** Только 3-5 широких (#housecharm #organizingtiktok #adhdfriendly)
- **Instagram:** Используй "Trial Reel" feature (тестирование без риска)

---

## 📊 КАК ЧИТАТЬ РЕЗУЛЬТАТЫ

### JSON структура (кратко):

```json
{
  "creative_batch_id": "creative_v2_20260121_abc123",
  "version": "2.0 - Viral Authenticity Edition",
  "product_name": "Kitchen Drawer Organizer",

  "tiktok_creatives": [
    {
      "creative_id": "tiktok_v2_001",
      "type": "before_after_doomscroll",
      "duration": "25 seconds",
      "script": {
        "hook": { "visual": "...", "text_overlay": "...", "audio": "..." },
        "problem": { ... },
        "solution": { ... },
        "result": { ... },
        "cta": { ... }
      },
      "production_notes": { "camera": "...", "lighting": "..." },
      "caption_keywords": "...",
      "hashtags": [...],
      "caption": "...",
      "posting_time": "6-8 AM or 8-10 PM"
    }
  ],

  "instagram_reels": [ /* 1 Reel скрипт */ ],

  "image_prompts": {
    "midjourney_prompts": [
      { "purpose": "Before - chaotic", "prompt": "..." },
      { "purpose": "Process - organizing", "prompt": "..." },
      { "purpose": "After - organized", "prompt": "..." },
      { "purpose": "Close-up detail", "prompt": "..." }
    ]
  },

  "performance_predictions": {
    "tiktok": {
      "estimated_views": "75K-300K",
      "viral_potential_score": 9.2
    }
  },

  "production_guidelines": { /* Как снимать */ },
  "posting_strategy": { /* Когда постить */ },
  "anti_ai_checklist": [ /* Проверка подлинности */ ],
  "next_steps": [ /* Что делать дальше */ ]
}
```

---

## 🚨 ЧАСТЫЕ ОШИБКИ И РЕШЕНИЯ

### Ошибка: "The requested webhook is not registered"

**Причина:** Workflow не активирован

**Решение:**
1. Открой n8n
2. Открой Creative Agent V2 workflow
3. Нажми **Ctrl+S** (сохранить)
4. Переключи **Active** в ON
5. Или используй Test Mode: нажми "Execute Workflow"

---

### Ошибка: "401 Unauthorized" от OpenAI

**Причина:** Неправильный API ключ

**Решение:**
1. Проверь что ключ начинается с `Bearer ` (с пробелом!)
2. Проверь что ключ правильный (см. CLAUDE.md)
3. Пересоздай credential если нужно

---

### Ошибка: Workflow возвращает пустой JSON

**Причина:** GPT ноды не парсят ответ правильно

**Решение:**
1. Открой n8n execution log
2. Посмотри на вывод GPT нод
3. Если там ````json` - это норма, код должен очистить
4. Если ошибка парсинга - проверь температуру GPT (должна быть 0.7-0.85)

---

### Проблема: TikTok помечает видео как AI

**Причина:** Не добавил человеческие импerfections

**Решение:**
1. Проверь anti_ai_checklist в JSON
2. Убедись что:
   - ✅ Снимал handheld (с тряской)
   - ✅ Естественный свет (не студия)
   - ✅ Off-center композиция
   - ✅ Палец/рука случайно в кадре
   - ✅ Легкое зерно/motion blur
3. Если используешь Midjourney - ВСЕГДА добавляй `--style raw --v 6`

---

## 💰 РЕКОМЕНДУЕМЫЙ БЮДЖЕТ

### Начальный уровень (~$30/мес):
- ✅ GPT-4o API: $10/мес (100 креативов)
- ✅ Epidemic Sound: $15/мес
- ✅ ElevenLabs Basic: $11/мес
- **ИТОГО: $36/мес**

**Что получаешь:**
- Профессиональные скрипты
- Безопасная музыка
- Человеческая озвучка
- Съёмка на свой iPhone

---

### Средний уровень (~$87/мес):
- ✅ Начальный уровень ($36)
- ✅ Midjourney Standard: $30/мес
- ✅ ElevenLabs Creator: $22/мес (вместо Basic)
- **ИТОГО: $87/мес**

**Что получаешь:**
- + AI изображения (безлимит в relax mode)
- + Больше озвучки (100K символов)

---

### Профессиональный уровень (~$169/мес):
- ✅ Средний уровень ($87)
- ✅ Midjourney Pro: $60/мес (вместо Standard)
- ✅ Runway Gen-3: $12/мес
- ✅ Artgrid: $30/мес (stock footage)
- **ИТОГО: $169/мес**

**Что получаешь:**
- + Приоритетная генерация Midjourney
- + AI видео (125 секунд)
- + Premium stock footage

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Импортируй workflow V2 в n8n
2. ✅ Настрой OpenAI credential
3. ✅ Активируй workflow (Production или Test Mode)
4. ✅ Протестируй через HTML форму или curl
5. ⏭️ Прочитай [CREATIVE_AGENT_V2_STRATEGY.md](CREATIVE_AGENT_V2_STRATEGY.md) для понимания стратегии
6. ⏭️ Зарегистрируйся на рекомендуемых сервисах (ElevenLabs, Epidemic Sound, Midjourney)
7. ⏭️ Создай первый креатив!

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- **Стратегия:** [CREATIVE_AGENT_V2_STRATEGY.md](CREATIVE_AGENT_V2_STRATEGY.md)
- **Главная документация:** [CLAUDE.md](../CLAUDE.md)
- **V1 для сравнения:** [CREATIVE_AGENT_SETUP.md](CREATIVE_AGENT_SETUP.md)

---

**Вопросы? Проблемы?**
Проверь **Troubleshooting** секцию выше или спроси AI ассистента! 🤖
