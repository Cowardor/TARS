# 🎬 Video Agent - Quick Start Guide

**Дата:** 2026-01-22
**Версия:** Standard V1 Practical
**Время настройки:** ~30 минут

---

## 🎯 Что получишь

**Input:** Название продукта + описание
**Output:** Готовое TikTok/Instagram видео MP4 (9:16, 25-35 сек)

**Качество:**
- 5-6 UGC-стиль изображений (Midjourney --q 2)
- Advanced transitions (fade, wipe, slide, zoom)
- AI озвучка (ElevenLabs Turbo V2)
- Ken Burns effect для динамики
- Animated text overlays
- Твоя музыка (любой URL)

**Ожидаемый результат:**
- CTR: 3.5-5%
- ROI: 10-30×

---

## ⚡ 5-МИНУТНЫЙ СТАРТ

### 1. Зарегистрируйся на сервисах

**Обязательно:**
- ✅ **OpenAI API** (уже есть)
- 🔹 **UseAPI.net** - $30/мес (Midjourney)
  - https://useapi.net/
  - Plans → Standard ($30/мес)
  - Dashboard → Copy API Key

- 🔹 **ElevenLabs** - $22/мес (Creator план)
  - https://elevenlabs.io/
  - Profile → API Keys → Generate Key

- 🔹 **Shotstack** - $49/мес (Standard план)
  - https://shotstack.io/
  - Dashboard → API Keys → Copy Key

**Total: ~$101/мес фиксед + ~$30-50/видео переменные**

---

### 2. Импортируй workflow в n8n

```bash
# Открой n8n
http://localhost:5678

# Import workflow
n8n → Import from File → workflows/video-agent-standard-v1-practical.json
```

---

### 3. Настрой credentials

**OpenAI API:**
```
Type: HTTP Header Auth
Name: Authorization
Value: Bearer YOUR_OPENAI_API_KEY
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

---

### 4. Активируй workflow

```
Ctrl+S → Toggle "Active" ON
```

**Production Webhook URL:**
```
http://localhost:5678/webhook/video-agent-standard
```

---

### 5. Первый тест

**Вариант A: HTML форма (проще)**

Открой `video-agent-form.html` в браузере → Заполни форму → Генерируй

**Вариант B: cURL**

```bash
curl -X POST http://localhost:5678/webhook/video-agent-standard \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Portable Blender Pro",
    "product_description": "Rechargeable portable blender for smoothies on-the-go. 6 blades, 15 seconds to blend, USB-C rechargeable, BPA-free",
    "target_audience": "fitness enthusiasts, busy professionals, health-conscious millennials",
    "price": "$29.99",
    "unique_selling_points": [
      "15-second blending time",
      "USB-C rechargeable",
      "BPA-free",
      "Fits in cup holder",
      "6 powerful blades"
    ],
    "music_url": "https://example.com/energetic-music.mp3",
    "music_volume": 0.25
  }'
```

**Ожидай:** ~3-5 минут

**Получишь:**
```json
{
  "success": true,
  "video_url": "https://shotstack-output.s3.amazonaws.com/...",
  "script": { ... },
  "strategy": { ... },
  "midjourney_prompts": [ ... ],
  "performance_estimate": {
    "viral_score": 8,
    "estimated_ctr": "3.5-5%"
  }
}
```

---

## 🎵 Музыка - 3 варианта

### Вариант 1: Свой файл (локально)
```json
{
  "music_url": "file:///c:/path/to/music.mp3",
  "music_volume": 0.25
}
```

### Вариант 2: Публичный URL
```json
{
  "music_url": "https://www.example.com/music.mp3",
  "music_volume": 0.3
}
```

### Вариант 3: Без музыки
```json
{
  "music_url": "",
  "music_volume": 0
}
```

**Рекомендуемые источники:**
- **TikTok Commercial Music Library** (бесплатно, copyright-safe)
- **Epidemic Sound** ($15/мес, 50,000+ треков)
- **Artlist** ($9.99/мес)

---

## 📊 Что происходит внутри workflow

```
1. Webhook принимает данные о продукте
   ↓
2. GPT-4o анализирует и создает:
   - Viral стратегию (hook type, mood, transitions)
   - TikTok скрипт (28-33 сек)
   - 5-6 Midjourney UGC промптов
   - Timing для каждого кадра
   ⏱️ ~10 сек
   ↓
3. Midjourney генерирует 5-6 изображений (параллельно)
   - High quality (--q 2)
   - UGC стиль (natural lighting, grain, imperfections)
   ⏱️ ~60-90 сек на изображение
   ↓
4. ElevenLabs создает озвучку (параллельно с Midjourney)
   - Turbo V2 model
   - Natural voice (Rachel/Drew)
   ⏱️ ~10-20 сек
   ↓
5. Shotstack собирает видео:
   - Advanced transitions
   - Ken Burns effect
   - Text overlays
   - Music + Voiceover mix
   ⏱️ ~30-60 сек
   ↓
6. Download готового MP4
   ✅ Готово!
```

**Total time:** 3-5 минут

---

## 🎨 Как улучшить результат

### 1. Правильное описание продукта

**Плохо:**
```
"product_description": "Blender"
```

**Хорошо:**
```
"product_description": "Rechargeable portable blender for smoothies on-the-go. Perfect for gym, office, travel. 6 stainless steel blades blend in 15 seconds. USB-C rechargeable, lasts 15 blends per charge. BPA-free Tritan material. Fits in car cup holder."
```

**Почему:** Больше деталей = лучший скрипт + более точные изображения

---

### 2. Точная целевая аудитория

**Плохо:**
```
"target_audience": "people"
```

**Хорошо:**
```
"target_audience": "fitness enthusiasts 25-35, busy working professionals who meal prep, health-conscious millennials, gym-goers, morning smoothie lovers"
```

**Почему:** GPT-4o создаст hook специально под эту аудиторию

---

### 3. Конкретные USP

**Плохо:**
```
"unique_selling_points": ["good quality", "nice design"]
```

**Хорошо:**
```
"unique_selling_points": [
  "15-second blending time (fastest on market)",
  "USB-C rechargeable (15 blends per charge)",
  "BPA-free Tritan material (safe for health)",
  "Fits in cup holder (portable)",
  "6 stainless steel blades (crush ice)",
  "Self-cleaning (30 seconds rinse)"
]
```

**Почему:** Конкретные факты → убедительный скрипт

---

### 4. Правильная музыка

**Для энергичных продуктов (blender, fitness):**
- Tempo: 120-140 BPM
- Genre: Electronic, Pop, Upbeat
- Mood: Energetic, Motivational

**Для calm продуктов (skincare, home decor):**
- Tempo: 80-100 BPM
- Genre: Acoustic, Indie, Ambient
- Mood: Calm, Relaxing

**Volume:**
- 0.20-0.25 для upbeat музыки
- 0.15-0.20 для calm музыки

---

## 🐛 Troubleshooting

### Ошибка: "UseAPI insufficient credits"
**Решение:**
```
1. Зайди на https://useapi.net/dashboard
2. Billing → Add Credits
3. Или подожди начала нового месяца (обновление лимита)
```

---

### Ошибка: "ElevenLabs quota exceeded"
**Решение:**
```
1. Upgrade на Creator план ($22/мес) для 100,000 символов
2. Или подожди начала месяца
3. Проверь: https://elevenlabs.io/app/usage
```

---

### Ошибка: "Shotstack render failed"
**Причина:** Music URL недоступен

**Решение:**
```
1. Проверь что music_url публично доступен
2. Или используй музыку без авторизации
3. Или оставь music_url пустым
```

---

### Видео не генерируется (timeout)
**Причина:** Midjourney очередь перегружена

**Решение:**
```
1. Подожди 5 минут и попробуй снова
2. Или проверь статус UseAPI: https://useapi.net/status
3. Midjourney может быть в maintenance
```

---

### Изображения низкого качества
**Причина:** Midjourney не понял промпт

**Решение:**
```
1. Улучши product_description (больше визуальных деталей)
2. GPT-4o создаст более точные промпты
3. Пример: вместо "blender" → "stainless steel portable blender with transparent cup showing green smoothie"
```

---

## 📈 Следующие шаги

### После первого успешного видео:

**1. Протестируй на TikTok Ads:**
```
- Создай TikTok Ads Manager аккаунт
- Campaign → Create → Traffic
- Ad group → $20/день бюджет
- Загрузи сгенерированное видео
- Target audience: твоя целевая аудитория
- Тестируй 3-5 дней
```

**2. Создай вариации:**
```
- Измени hook_type (doomscroll_guilt → before_after)
- Измени mood (energetic → upbeat)
- Протестируй разные USP
- A/B тест: 3-5 вариаций на продукт
```

**3. Масштабируй winners:**
```
- Если CTR >3% → увеличь бюджет до $50-100/день
- Создай еще 2-3 вариации winner креатива
- Тестируй на Instagram Reels
```

---

## 💰 ROI расчет (пример)

**Продукт:** Portable Blender Pro
- Цена: $29.99
- Себестоимость: $8
- Профит: $21.99

**Инвестиция:**
- Сервисы: $101/мес (UseAPI + ElevenLabs + Shotstack)
- 5 видео: $150-250/мес переменные
- **Total: $250-350/мес**

**Результат (консервативно):**
- 2 видео из 5 выстреливают
- 200,000 просмотров × 4% CTR = 8,000 кликов
- 8,000 × 4% конверсия = 320 продаж
- 320 × $21.99 = **$7,037 профита**

**ROI:** $7,037 / $300 = **23× (2,300% ROI)**

---

## 📚 Полезные ссылки

**Документация:**
- [VIDEO_AGENT_COMPARISON.md](docs/VIDEO_AGENT_COMPARISON.md) - Сравнение версий
- [VIDEO_AGENT_STRATEGY.md](docs/VIDEO_AGENT_STRATEGY.md) - Исследование 2026
- [VIDEO_AGENT_SETUP.md](docs/VIDEO_AGENT_SETUP.md) - Детальная настройка

**Сервисы:**
- UseAPI (Midjourney): https://useapi.net/
- ElevenLabs: https://elevenlabs.io/
- Shotstack: https://shotstack.io/
- Epidemic Sound: https://www.epidemicsound.com/

**TikTok Resources:**
- TikTok Ads Manager: https://ads.tiktok.com/
- TikTok Commercial Music: https://www.tiktok.com/business/en/blog/royalty-free-music-sound-library

---

## ✅ Чеклист готовности

Перед запуском проверь:

- [ ] n8n запущен (http://localhost:5678)
- [ ] UseAPI account создан + API key получен
- [ ] ElevenLabs Creator план ($22/мес) активен
- [ ] Shotstack Standard план ($49/мес) активен
- [ ] Все credentials настроены в n8n
- [ ] Workflow импортирован и активирован
- [ ] Production webhook URL скопирован
- [ ] Музыка подготовлена (URL или файл)
- [ ] Тестовый запрос успешно выполнен

---

**Готово! Начинай генерировать видео! 🚀**

**Вопросы?** Проверь [VIDEO_AGENT_SETUP.md](docs/VIDEO_AGENT_SETUP.md) или [troubleshooting секцию](#-troubleshooting).

---

**Последнее обновление:** 2026-01-22
