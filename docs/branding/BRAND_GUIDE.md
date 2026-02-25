# Alar — Brand Guide

**Финальная версия:** 2026-02-11
**Утверждено:** Illia (Founder)

---

## Название

**Alar** (произносится: А-лар)

Из книги Patrick Rothfuss "The Name of the Wind" — дисциплина ума, которая заставляет симпатию работать. "Веришь так сильно, что это становится реальностью."

---

## Лого: The Prism

Треугольник-призма, преломляющая один луч на три потока. Метафора: один Alar (намерение) превращается в множество результатов (автоматизации).

### SVG код основного лого (icon)

```svg
<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Triangle prism -->
  <path d="M80 25 L130 130 L30 130 Z" stroke="url(#alar-prism)" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
  <!-- Light beam entering from left -->
  <line x1="15" y1="85" x2="68" y2="85" stroke="#fafafa" stroke-width="2" opacity="0.5"/>
  <!-- Refracted beams exiting right -->
  <line x1="95" y1="75" x2="145" y2="55" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="97" y1="85" x2="145" y2="85" stroke="#60a5fa" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="95" y1="95" x2="145" y2="115" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round"/>
  <!-- End dots -->
  <circle cx="145" cy="55" r="2.5" fill="#22d3ee"/>
  <circle cx="145" cy="85" r="2.5" fill="#60a5fa"/>
  <circle cx="145" cy="115" r="2.5" fill="#3b82f6"/>
  <!-- Inner refraction point -->
  <circle cx="82" cy="85" r="3" fill="white" opacity="0.7"/>
  <defs>
    <linearGradient id="alar-prism" x1="30" y1="130" x2="130" y2="25">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
</svg>
```

### SVG код горизонтального лого (icon + wordmark)

```svg
<svg viewBox="0 0 280 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Prism icon scaled down -->
  <g transform="translate(0, 2) scale(0.35)">
    <path d="M80 25 L130 130 L30 130 Z" stroke="url(#alar-h)" stroke-width="5" stroke-linejoin="round" fill="none"/>
    <line x1="15" y1="85" x2="68" y2="85" stroke="#fafafa" stroke-width="3" opacity="0.4"/>
    <line x1="95" y1="75" x2="145" y2="55" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
    <line x1="97" y1="85" x2="145" y2="85" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
    <line x1="95" y1="95" x2="145" y2="115" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
  </g>
  <!-- Wordmark -->
  <text x="68" y="42" font-family="Inter, -apple-system, sans-serif" font-weight="800" font-size="36" letter-spacing="6" fill="#fafafa">ALAR</text>
  <defs>
    <linearGradient id="alar-h" x1="30" y1="130" x2="130" y2="25">
      <stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
</svg>
```

### App Icon (квадратный, для Telegram/favicon)

```svg
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="12" fill="url(#icon-bg)"/>
  <path d="M24 8 L38 38 L10 38 Z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>
  <line x1="28" y1="23" x2="40" y2="17" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="29" y1="26" x2="40" y2="26" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="28" y1="29" x2="40" y2="35" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <defs>
    <linearGradient id="icon-bg" x1="0" y1="0" x2="48" y2="48">
      <stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
</svg>
```

### Правила использования лого

- **Minimum size:** 24px (icon), 120px (horizontal)
- **Clear space:** Минимум 50% ширины лого вокруг
- **Не деформировать** пропорции
- **Не менять** цвета градиента
- На тёмном фоне: белый wordmark + gradient icon
- На светлом фоне: чёрный wordmark + gradient icon (более насыщенный)
- На gradient фоне: белый wordmark + белый icon

---

## Цветовая палитра

### Primary

| Имя | HEX | Использование |
|-----|-----|---------------|
| **Void** | `#09090b` | Основной фон |
| **Carbon** | `#111114` | Фон карточек |
| **Elevated** | `#18181b` | Фон элементов |
| **Border** | `#27272a` | Границы |

### Accent

| Имя | HEX | Использование |
|-----|-----|---------------|
| **Alar Blue** | `#3b82f6` | Основной accent |
| **Sky** | `#60a5fa` | Вторичный accent |
| **Cyan** | `#22d3ee` | Третичный accent |

### Text

| Имя | HEX | Использование |
|-----|-----|---------------|
| **White** | `#fafafa` | Основной текст |
| **Muted** | `#a1a1aa` | Вторичный текст |

### Gradient

```css
/* Primary gradient (для кнопок, иконок, акцентов) */
background: linear-gradient(135deg, #3b82f6, #22d3ee);

/* Text gradient */
background: linear-gradient(135deg, #60a5fa, #22d3ee);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* Glow */
box-shadow: 0 0 60px rgba(59, 130, 246, 0.3);
```

---

## Типографика

### Шрифты

| Назначение | Шрифт | Weight |
|-----------|-------|--------|
| **Headings** | Inter | 700-800 |
| **Body** | Inter | 400-500 |
| **Code / Mono** | JetBrains Mono | 400-500 |
| **Wordmark** | Inter | 800, letter-spacing: 6px |

### Google Fonts import

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### Размеры

| Элемент | Size | Weight |
|---------|------|--------|
| H1 | 48px | 800 |
| H2 | 36px | 700 |
| H3 | 24px | 600 |
| Body | 16px | 400 |
| Small | 14px | 400 |
| Caption | 12px | 500 |
| Code | 14px | 400 (mono) |

---

## Нейминг продуктов

Формат: **Alar [Product]**

| Продукт | Название | Описание |
|---------|----------|----------|
| Product Research | **Alar Scout** | AI поиск товаров |
| Content Gen | **Alar Creative** | Генерация контента |
| Video Production | **Alar Video** | AI видео продакшн |
| Finance Bot | **Alar Finance** | Учёт расходов |
| Sales Bot | **Alar Consult** | AI менеджер продаж |
| TikTok Tools | **Alar Toolkit** | Инструменты для TikTok |

---

## Слоган

**Primary:** "Automate with discipline"
**Secondary:** "One input. Many results." (отсылка к призме)
**Tagline RU:** "Автоматизация силой мысли"

---

## UI компоненты

### Кнопки

```css
/* Primary */
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #22d3ee);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 14px;
}

/* Secondary */
.btn-secondary {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 10px 24px;
}
```

### Карточки

```css
.card {
  background: #111114;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px;
}

.card:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 40px rgba(59, 130, 246, 0.1);
}
```

### Border radius

| Элемент | Radius |
|---------|--------|
| Buttons | 8px |
| Cards | 16px |
| Modals | 20px |
| App Icon | 12px |
| Avatar | 50% |

---

## Telegram Bot formatting

### Powered by footer

```
Powered by Alar ▲
```

### Message style

```html
✅ Записал: <b>45 PLN</b> → 🛒 Продукты
📊 Продукты за месяц: <b>892 PLN</b>
```

### Pro upsell (мягкий)

```html
💡 Хочешь PDF-отчёт? Доступно в <b>Alar Pro</b>
```

---

## Файлы бренда

```
docs/branding/
├── BRAND_GUIDE.md          ← ЭТО ФАЙЛ (спецификация)
├── alar-brand.html         ← Полная brand identity страница
├── alar-logos.html          ← Все 6 концептов лого
├── lethani-brand.html       ← (архив) Lethani вариант
├── lethani-logos.html       ← (архив) Lethani двери
└── lethani-door-variations.html ← (архив) Lethani вариации
```
