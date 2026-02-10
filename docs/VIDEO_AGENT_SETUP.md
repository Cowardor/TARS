# 🎬 Video Agent Setup Guide

**Дата:** 2026-01-22
**Версия:** 1.0.0
**Статус:** В разработке

---

## 📋 ОГЛАВЛЕНИЕ

1. [Обзор](#обзор)
2. [Настройка API](#настройка-api)
3. [Budget Version Setup](#budget-version-setup)
4. [Standard Version Setup](#standard-version-setup)
5. [Premium Version Setup](#premium-version-setup)
6. [Тестирование](#тестирование)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 ОБЗОР

Этот гайд покажет как настроить 3 версии Video Agent для автоматической генерации TikTok/Instagram видео.

**Что получишь:**
- Полностью автоматизированный pipeline от продукта до готового MP4
- 3 версии по бюджету: Budget ($50-100), Standard ($150-300), Premium ($300-500)
- Генерация UGC-стиль видео с максимальной конверсией

---

## 🔑 НАСТРОЙКА API

### 1. OpenAI API (уже настроен) ✅

**Создай ключ на:** https://platform.openai.com/api-keys

Ключ должен начинаться с `sk-proj-...` или `sk-...`

**Проверка баланса:**
```bash
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 2. Midjourney API

**Проблема:** Midjourney не имеет официального API (по состоянию на 2026).

**Решения:**

#### Вариант A: Unofficial Midjourney API (рекомендуется для автоматизации)

**1. [UseAPI.net](https://useapi.net/)**
- Цена: **$30/мес** (Standard plan)
- 1000 requests/мес
- Полный доступ к Midjourney функциям

**Регистрация:**
```
1. Зарегистрируйся на https://useapi.net/
2. Оплати Standard план ($30/мес)
3. Получи API key в Dashboard
4. Сохрани API key
```

**Тестовый запрос:**
```bash
curl -X POST https://api.useapi.net/v2/jobs/imagine \
  -H "Authorization: Bearer YOUR_USEAPI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "shot on iPhone 15 Pro, product photography, natural lighting --ar 9:16 --v 6",
    "webhook": "https://your-webhook-url.com/midjourney-result"
  }'
```

#### Вариант B: Midjourney через Discord Bot

**1. Настройка Discord Bot:**
```
1. Создай Discord сервер
2. Пригласи Midjourney bot (/invite @Midjourney Bot)
3. Используй n8n Discord Integration для отправки команд
4. Парси результаты через webhooks
```

**Минусы:**
- Сложнее настроить
- Медленнее (нужно парсить Discord сообщения)
- Может нарушать TOS Midjourney

**Рекомендация:** Используй **UseAPI.net** для надежности.

---

### 3. ElevenLabs API ✅

**Регистрация:**
```
1. Зарегистрируйся на https://elevenlabs.io/
2. Выбери план:
   - Starter: $11/мес (30,000 символов) - для Budget
   - Creator: $22/мес (100,000 символов) - для Standard
   - Pro: $99/мес (500,000 символов + voice cloning) - для Premium
3. Получи API key в Profile → API Keys
```

**API Key:**
```
Settings → API Keys → Generate New Key
```

**Тестовый запрос:**
```bash
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM \
  -H "xi-api-key: YOUR_ELEVENLABS_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This product is amazing! It literally changed my life.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }' \
  --output test_audio.mp3
```

**Лучшие голоса для UGC:**
- **Rachel** (ID: `21m00Tcm4TlvDq8ikWAM`) - женский, естественный
- **Drew** (ID: `29vD33N1CtxCmqQRPOHJ`) - мужской, дружелюбный
- **Clyde** (ID: `2EiwWnXFnvU5JabPnv8n`) - мужской, энергичный

---

### 4. Shotstack API ✅

**Регистрация:**
```
1. Зарегистрируйся на https://shotstack.io/
2. Выбери план:
   - Free: $0 (10 видео/мес, watermark) - для тестов
   - Standard: $49/мес (unlimited, no watermark) - для Budget/Standard
   - Pro: $99/мес (advanced features) - для Premium
3. Получи API key в Dashboard
```

**API Keys:**
```
Dashboard → API Keys → Copy Key
```

**Environments:**
- **Sandbox:** для тестирования (бесплатно, но с watermark)
- **Production:** для реальных видео (платно)

**Тестовый запрос (простое видео из 3 изображений):**
```bash
curl -X POST https://api.shotstack.io/v1/render \
  -H "x-api-key: YOUR_SHOTSTACK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "timeline": {
      "tracks": [
        {
          "clips": [
            {
              "asset": {
                "type": "image",
                "src": "https://example.com/image1.jpg"
              },
              "start": 0,
              "length": 3,
              "transition": {
                "in": "fade",
                "out": "fade"
              }
            },
            {
              "asset": {
                "type": "image",
                "src": "https://example.com/image2.jpg"
              },
              "start": 3,
              "length": 3,
              "transition": {
                "in": "fade",
                "out": "fade"
              }
            }
          ]
        }
      ]
    },
    "output": {
      "format": "mp4",
      "resolution": "1080",
      "aspectRatio": "9:16"
    }
  }'
```

---

### 5. Runway Gen-3 API (Standard/Premium only)

**Проблема:** Runway Gen-3 пока не имеет публичного API (по состоянию на январь 2026).

**Решения:**

#### Вариант A: Подождать официального API
- Runway анонсировали API в Q1 2026
- Следи за обновлениями: https://runwayml.com/api

#### Вариант B: Использовать альтернативы

**1. [Pika Labs API](https://pika.art/api)**
- Image-to-video генерация
- ~$10-15/видео
- Качество сравнимо с Runway Gen-3

**2. [Haiper AI](https://haiper.ai/)**
- Image-to-video
- Дешевле Runway (~$5-8/видео)
- Чуть хуже качество

**3. [Kling AI](https://kling.ai/)**
- Новый конкурент Runway
- Отличное качество
- ~$8-12/видео

**Рекомендация для сейчас:**
- **Budget/Standard:** Пропусти анимацию, используй только статичные кадры с Shotstack transitions
- **Premium:** Подожди Runway API или используй Pika Labs

**Когда Runway API выйдет:**
```
1. Зарегистрируйся на https://runwayml.com/api
2. Получи API key
3. Обнови n8n workflow с Runway нодами
```

---

### 6. Epidemic Sound API (Standard/Premium only)

**Проблема:** Epidemic Sound не имеет публичного API для автоматического подбора музыки.

**Решения:**

#### Вариант A: Ручной выбор треков
```
1. Зарегистрируйся на https://www.epidemicsound.com/ ($15/мес)
2. Скачай 10-20 популярных треков подходящих для UGC
3. Загрузи их в n8n File Storage
4. Workflow будет случайно выбирать из них
```

#### Вариант B: TikTok Commercial Music Library (бесплатно)
```
1. Открой TikTok Commercial Music Library
2. Скачай trending треки
3. Используй в своих видео (copyright-free для коммерческого использования)
```

**Рекомендация:** Начни с **Вариант B** (бесплатно), потом переходи на Epidemic Sound для большего выбора.

---

### 7. Artgrid (Premium only)

**Регистрация:**
```
1. Зарегистрируйся на https://artgrid.io/ ($42/мес)
2. Скачай B-roll footage подходящий для твоих продуктов
3. Храни в n8n File Storage
4. Workflow будет вставлять в видео
```

**Альтернатива (бесплатно):**
- **Pexels Videos:** https://www.pexels.com/videos/ (бесплатно, но ограниченный выбор)

---

## 💰 BUDGET VERSION SETUP

### Компоненты:
- ✅ OpenAI GPT-4o (уже есть)
- ✅ Midjourney (UseAPI.net - $30/мес)
- ✅ ElevenLabs Starter ($11/мес)
- ✅ Shotstack Free ($0, 10 видео/мес)
- ✅ TikTok Music Library (бесплатно)

**Total: ~$41/мес** (или $90 если Shotstack Standard)

### n8n Workflow Structure:

```
┌─────────────────┐
│  1. Webhook     │ ← Получение данных о продукте
│  (Trigger)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. Extract     │ ← Парсинг JSON (product name, description, etc.)
│  Data           │
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. GPT-4o      │ ← Анализ продукта + генерация:
│  Analyze        │   - Viral стратегия
│                 │   - TikTok скрипт (20-30 сек)
│                 │   - 4 Midjourney промпта (UGC-style)
│                 │   - Timing для каждого кадра
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. Midjourney  │ ← Генерация 4 UGC изображений (Loop)
│  Generate       │   UseAPI.net /imagine endpoint
│  (Loop)         │   Wait for completion → Download
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. ElevenLabs  │ ← Генерация озвучки из скрипта
│  Voiceover      │   /text-to-speech endpoint
│                 │   Natural voice (Rachel/Drew)
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. Select      │ ← Случайный выбор музыки из библиотеки
│  Music          │   (из заранее загруженных треков)
└────────┬────────┘
         ↓
┌─────────────────┐
│  7. Shotstack   │ ← Сборка видео:
│  Assemble       │   - 4 изображения с transitions
│  Video          │   - Voiceover overlay
│                 │   - Музыка (background)
│                 │   - Text captions (keywords)
│                 │   Output: MP4 (9:16, 1080×1920)
└────────┬────────┘
         ↓
┌─────────────────┐
│  8. Wait for    │ ← Shotstack async render
│  Render         │   Poll /render/{id} until done
└────────┬────────┘
         ↓
┌─────────────────┐
│  9. Download    │ ← Download готового MP4
│  Video          │   Save to n8n File Storage
└────────┬────────┘
         ↓
┌─────────────────┐
│ 10. Response    │ ← Отправка результата:
│  (Webhook)      │   - URL готового видео
│                 │   - Скрипт
│                 │   - Midjourney промпты
│                 │   - Performance прогноз
└─────────────────┘
```

### Создание в n8n:

**1. Импортируй workflow:**
```
n8n → Import from File → workflows/video-agent-budget.json
```

**2. Настрой credentials:**

**OpenAI:**
```
Type: HTTP Header Auth
Name: Authorization
Value: Bearer sk-proj-6VVt9l6S-...
```

**UseAPI (Midjourney):**
```
Type: HTTP Header Auth
Name: Authorization
Value: Bearer YOUR_USEAPI_KEY
```

**ElevenLabs:**
```
Type: HTTP Header Auth
Name: xi-api-key
Value: YOUR_ELEVENLABS_KEY
```

**Shotstack:**
```
Type: HTTP Header Auth
Name: x-api-key
Value: YOUR_SHOTSTACK_KEY
```

**3. Загрузи музыку:**
```bash
# Скачай 5-10 треков из TikTok Commercial Music Library
# Загрузи в n8n:
n8n → Settings → Files → Upload

# Обнови workflow "Select Music" node с путями к файлам
```

**4. Активируй workflow:**
```
Ctrl+S → Toggle "Active" ON
```

**5. Получи Production Webhook URL:**
```
n8n → Webhook node → Copy Production URL
Пример: http://localhost:5678/webhook/video-agent-budget
```

---

## 📊 STANDARD VERSION SETUP

### Компоненты:
- ✅ OpenAI GPT-4o (уже есть)
- ✅ Midjourney (UseAPI.net - $30/мес)
- ✅ ElevenLabs Creator ($22/мес)
- ✅ Shotstack Standard ($49/мес)
- ⏳ Runway Gen-3 (~$24-36/видео) - когда API выйдет
- ✅ Epidemic Sound ($15/мес)

**Total: ~$116/мес фиксед + $24-36/видео**

### Отличия от Budget:

**1. Добавлена Runway Gen-3 анимация:**
```
После Midjourney генерации:
  ↓
┌──────────────────┐
│ Runway Gen-3     │ ← Анимация 2-3 ключевых кадров
│ Image-to-Video   │   5 сек на кадр
│ (Loop)           │   Motion: subtle zoom, camera pan
└──────────────────┘
```

**2. Shotstack собирает гибрид:**
- Статичные кадры (1-2 шт)
- Анимированные кадры (2-3 шт)
- Transitions между ними
- Advanced effects (parallax, zoom)

**3. Epidemic Sound интеграция:**
- Больше выбор треков
- Автоматический подбор по mood (energetic, calm, etc.)

### Настройка:

**Те же шаги что Budget + дополнительно:**

**Runway Gen-3 (когда API выйдет):**
```
Type: HTTP Header Auth
Name: Authorization
Value: Bearer YOUR_RUNWAY_KEY
```

**Epidemic Sound:**
```
1. Зарегистрируйся ($15/мес)
2. Скачай 20-30 треков разных moods
3. Организуй по папкам:
   - energetic/
   - calm/
   - upbeat/
4. Загрузи в n8n File Storage
5. Workflow выберет по mood из GPT-4o анализа
```

---

## 🔥 PREMIUM VERSION SETUP

### Компоненты:
- ✅ OpenAI GPT-4o (уже есть)
- ✅ Midjourney Pro ($60/мес)
- ✅ ElevenLabs Pro ($99/мес) + Voice Cloning
- ✅ Shotstack Pro ($99/мес)
- ⏳ Runway Gen-3 (~$60-90/видео) - ПОЛНАЯ анимация всех кадров
- ✅ Epidemic Sound ($15/мес)
- ✅ Artgrid ($42/мес)

**Total: ~$315/мес фиксед + $60-90/видео**

### Дополнительно:

**1. Voice Cloning (ElevenLabs Pro):**
```
1. Запиши 5-10 минут своего голоса (или найми voice actor)
2. Загрузи в ElevenLabs → Voice Library → Add Voice
3. ElevenLabs создаст клон
4. Используй клонированный голос для всех видео
   = узнаваемый "фирменный" голос бренда
```

**2. Artgrid B-roll:**
```
1. Подпишись на Artgrid ($42/мес)
2. Скачай 50-100 B-roll клипов по категориям:
   - Lifestyle (руки, люди, активности)
   - Products (close-ups, unboxing)
   - Nature (backgrounds)
3. Загрузи в n8n File Storage
4. Workflow будет вставлять между UGC кадрами
```

**3. Advanced Shotstack features:**
```json
{
  "effects": {
    "parallax": true,
    "ken_burns": true,
    "luma_matte": true
  },
  "transitions": [
    "wipe_left",
    "zoom_in",
    "slide_up"
  ],
  "text_overlays": {
    "captions": "auto_generate",
    "style": "modern_bold",
    "animation": "fade_in_up"
  }
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Тестовый запрос для Budget workflow:

**1. Используй HTML форму:**
```
Открой creative-agent-form.html
Измени webhook URL на: http://localhost:5678/webhook/video-agent-budget
```

**2. Или cURL:**
```bash
curl -X POST http://localhost:5678/webhook/video-agent-budget \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Portable Blender Pro",
    "product_description": "Rechargeable portable blender for smoothies on-the-go. Perfect for gym, office, travel. 6 blades, 15 seconds to blend.",
    "target_audience": "fitness enthusiasts, busy professionals, health-conscious millennials",
    "price": "$29.99",
    "unique_selling_points": [
      "15-second blending time",
      "USB-C rechargeable",
      "BPA-free",
      "Fits in cup holder"
    ]
  }'
```

**3. Проверка результата:**
```
Workflow должен вернуть через 2-3 минуты:
{
  "video_url": "https://shotstack-output.s3.amazonaws.com/...",
  "script": "...",
  "midjourney_prompts": [...],
  "performance_estimate": {
    "viral_score": 7.5,
    "estimated_ctr": "3.5-5%",
    "target_completion_rate": "70%"
  }
}
```

---

## 🐛 TROUBLESHOOTING

### Midjourney (UseAPI) ошибки:

**Error: "Insufficient credits"**
```
Решение: Пополни UseAPI баланс или смени на другой план
```

**Error: "Prompt rejected"**
```
Причина: Midjourney banned word в промпте
Решение: GPT-4o должен избегать banned words (nude, violence, etc.)
         Обнови system prompt
```

**Error: "Timeout waiting for image"**
```
Причина: Midjourney очередь медленная (>2 мин)
Решение: Увеличь timeout в n8n HTTP Request node (до 5 мин)
```

---

### ElevenLabs ошибки:

**Error: "Quota exceeded"**
```
Решение: Upgrade план или жди следующего месяца
```

**Error: "Voice not found"**
```
Решение: Проверь Voice ID корректный
         Список голосов: https://api.elevenlabs.io/v1/voices
```

---

### Shotstack ошибки:

**Error: "Asset not found"**
```
Причина: Shotstack не смог скачать изображение/аудио URL
Решение: Проверь что URLs публично доступны (не требуют авторизации)
```

**Error: "Render failed"**
```
Причина: Некорректный JSON timeline
Решение: Валидируй JSON перед отправкой
         Используй Shotstack Playground для тестирования
```

**Error: "Render queued" (слишком долго)**
```
Причина: Shotstack перегружен (обычно 30-60 сек рендер)
Решение: Увеличь polling interval в n8n (проверяй каждые 10 сек)
```

---

### Общие n8n ошибки:

**Workflow timeout:**
```
Причина: Весь процесс занимает >5 минут (n8n default timeout)
Решение:
1. n8n → Settings → Executions → Timeout: увеличь до 15 минут
2. Или запускай workflow в async режиме
```

**Memory issues:**
```
Причина: Обработка больших изображений/видео файлов
Решение: Увеличь Node.js heap size:
NODE_OPTIONS="--max-old-space-size=4096" npx n8n
```

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ

Перед запуском проверь:

### Budget Version:
- [ ] OpenAI API key работает
- [ ] UseAPI.net account создан ($30/мес)
- [ ] ElevenLabs Starter account ($11/мес)
- [ ] Shotstack account (Free или Standard)
- [ ] 5-10 музыкальных треков загружены
- [ ] Workflow импортирован в n8n
- [ ] Credentials настроены
- [ ] Тестовый запрос отработал успешно

### Standard Version:
- [ ] Все из Budget ✓
- [ ] ElevenLabs Creator account ($22/мес)
- [ ] Shotstack Standard account ($49/мес)
- [ ] Epidemic Sound account ($15/мес)
- [ ] 20-30 музыкальных треков разных moods
- [ ] (Опционально) Runway Gen-3 API key

### Premium Version:
- [ ] Все из Standard ✓
- [ ] Midjourney Pro account ($60/мес)
- [ ] ElevenLabs Pro account ($99/мес)
- [ ] Shotstack Pro account ($99/мес)
- [ ] Artgrid account ($42/мес)
- [ ] 50-100 B-roll клипов загружены
- [ ] Voice cloning настроен (если нужен)

---

## 📚 ПОЛЕЗНЫЕ ССЫЛКИ

**APIs:**
- OpenAI: https://platform.openai.com/
- UseAPI (Midjourney): https://useapi.net/
- ElevenLabs: https://elevenlabs.io/
- Shotstack: https://shotstack.io/
- Runway: https://runwayml.com/ (следи за API release)

**Музыка:**
- TikTok Commercial Music: https://www.tiktok.com/business/en/blog/royalty-free-music-sound-library
- Epidemic Sound: https://www.epidemicsound.com/
- Free Music Archive: https://freemusicarchive.org/

**Stock Footage:**
- Artgrid: https://artgrid.io/
- Pexels Videos: https://www.pexels.com/videos/
- Pixabay: https://pixabay.com/videos/

**Документация:**
- [VIDEO_AGENT_STRATEGY.md](VIDEO_AGENT_STRATEGY.md) - Исследование и стратегия
- [CLAUDE.md](../CLAUDE.md) - Главная документация проекта

---

**Последнее обновление:** 2026-01-22
