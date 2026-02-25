# Промпт для Developer: Ребрендинг TARS → Alar

**Дата:** 2026-02-11
**Задача:** Применить новый бренд Alar ко всем продуктам
**Приоритет:** P1 (High)
**Брендбук:** [docs/branding/BRAND_GUIDE.md](../branding/BRAND_GUIDE.md)
**Визуальный пример:** [docs/branding/alar-brand.html](../branding/alar-brand.html)

---

## Скопируй этот промпт в новое окно Claude:

```
Ты - разработчик в команде Alar (ранее TARS). Твоя задача — применить новый бренд ко всем продуктам проекта.

Прочитай CLAUDE.md и docs/branding/BRAND_GUIDE.md перед началом работы.

## КОНТЕКСТ

Проект переименовывается: TARS → Alar.
Лого: треугольник-призма (The Prism) — преломляет свет на 3 потока.
Визуальный пример: открой docs/branding/alar-brand.html в браузере.

## ЧТО НУЖНО СДЕЛАТЬ

### 1. Finance Bot — применить бренд Alar Finance

Файлы:
- finance-bot/mini-app.html — Telegram Mini App
- finance-bot/src/index.js — бот
- finance-bot/src/services/ — сервисы

Задачи:
- [ ] Заменить все упоминания "TARS" на "Alar" в коде и UI
- [ ] Применить цветовую палитру из BRAND_GUIDE.md:
  - Фон: #09090b (void), #111114 (carbon)
  - Accent: #3b82f6 → #22d3ee (gradient)
  - Текст: #fafafa (primary), #a1a1aa (muted)
- [ ] Заменить лого в mini-app.html на SVG призму из BRAND_GUIDE.md
- [ ] Обновить шрифты на Inter + JetBrains Mono
- [ ] Добавить footer "Powered by Alar ▲" в сообщения бота
- [ ] Обновить /start сообщение: "Привет! Я Alar Finance — твой учёт расходов."

### 2. HTML тестовые формы

Файлы:
- creative-agent-form.html
- video-agent-form.html

Задачи:
- [ ] Заменить заголовки/лого на Alar + Prism SVG
- [ ] Применить dark theme из BRAND_GUIDE.md
- [ ] Обновить стили кнопок на gradient (#3b82f6 → #22d3ee)
- [ ] Обновить border-radius на 8px (кнопки), 16px (карточки)

### 3. Документация

Задачи:
- [ ] НЕ трогать CLAUDE.md (обновит Team Lead)
- [ ] Обновить README если есть

### 4. Favicon / иконки

Задачи:
- [ ] Создать favicon.svg из App Icon (из BRAND_GUIDE.md)
- [ ] Положить в корень проекта

## ЦВЕТОВАЯ ПАЛИТРА (для быстрого копирования)

CSS переменные — вставь в каждый HTML файл:

```css
:root {
  --bg: #09090b;
  --bg-card: #111114;
  --bg-elevated: #18181b;
  --border: #27272a;
  --text: #fafafa;
  --text-muted: #a1a1aa;
  --primary: #3b82f6;
  --accent: #60a5fa;
  --cyan: #22d3ee;
  --gradient: linear-gradient(135deg, #3b82f6, #22d3ee);
}
```

## ЛОГО SVG (для вставки в HTML)

### Иконка (маленькая, для header):

```html
<svg width="28" height="22" viewBox="0 0 160 160" fill="none">
  <path d="M80 25 L130 130 L30 130 Z" stroke="url(#ap)" stroke-width="5" stroke-linejoin="round" fill="none"/>
  <line x1="15" y1="85" x2="68" y2="85" stroke="#fafafa" stroke-width="3" opacity="0.4"/>
  <line x1="95" y1="75" x2="145" y2="55" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
  <line x1="97" y1="85" x2="145" y2="85" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
  <line x1="95" y1="95" x2="145" y2="115" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
  <defs><linearGradient id="ap" x1="30" y1="130" x2="130" y2="25"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
</svg>
```

### Горизонтальный лого (icon + текст):

```html
<div style="display: flex; align-items: center; gap: 12px;">
  <svg width="28" height="22" viewBox="0 0 160 160" fill="none">
    <path d="M80 25 L130 130 L30 130 Z" stroke="url(#ap)" stroke-width="5" stroke-linejoin="round" fill="none"/>
    <line x1="95" y1="75" x2="145" y2="55" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
    <line x1="97" y1="85" x2="145" y2="85" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
    <line x1="95" y1="95" x2="145" y2="115" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
    <defs><linearGradient id="ap" x1="30" y1="130" x2="130" y2="25"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
  </svg>
  <span style="font-family: Inter, sans-serif; font-weight: 800; font-size: 20px; letter-spacing: 4px; color: #fafafa;">ALAR</span>
</div>
```

## ПРАВИЛА

1. Не ломай функционал — только визуальные изменения
2. Тестируй каждый файл после изменений (открой в браузере)
3. Убедись что на мобилке (375px) всё выглядит нормально
4. Не трогай .env, API ключи, wrangler.toml credentials
5. Коммить после каждого файла:
   ```
   git add [файл]
   git commit -m "[DEV] Rebrand: [что именно] TARS → Alar"
   ```

## ACCEPTANCE CRITERIA

- [ ] Нигде в UI не осталось слово "TARS"
- [ ] Все HTML файлы используют палитру из BRAND_GUIDE.md
- [ ] Лого-призма видна в каждом интерфейсе
- [ ] Шрифты: Inter + JetBrains Mono
- [ ] Dark theme по умолчанию
- [ ] Telegram бот: "Powered by Alar ▲" в footer

После завершения оставь сообщение в CLAUDE.md:
```
[ДАТА] [Developer]: Ребрендинг завершён — TARS → Alar. Обновлены: [список файлов]
```
```

---

## Резюме для Team Lead

**Что:** Ребрендинг всех UI компонентов с TARS на Alar
**Объём:** mini-app.html, 2 формы, бот, favicon
**Время:** ~2-3 часа
**Зависимости:** Нет (чисто визуальные изменения)
**Риски:** Нулевые (не затрагивает логику)
