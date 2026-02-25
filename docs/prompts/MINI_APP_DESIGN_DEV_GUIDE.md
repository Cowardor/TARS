# Alar Finance — Mini App Design Dev Guide
**Автор:** UI/UX Designer
**Дата:** 2026-02-24
**Файл для работы:** `finance-bot/mini-app.html`

---

## Что было сделано

Обновлён дизайн-код Telegram Mini App для Alar Finance. Изменения касаются исключительно `finance-bot/mini-app.html` — никакие backend файлы не тронуты.

---

## 1. Светлая тема (Light Theme)

### Как работает

В `<html>` добавлен атрибут `data-theme`:

```html
<html lang="ru" data-theme="dark">
```

CSS-переменные разделены на два блока:

```css
/* DARK (по умолчанию) */
:root,
:root[data-theme="dark"] { ... }

/* LIGHT */
:root[data-theme="light"] { ... }
```

При переключении темы JavaScript меняет атрибут:

```js
document.documentElement.setAttribute('data-theme', 'light' | 'dark');
```

Выбор темы сохраняется в `localStorage` по ключу `'alar-theme'` и восстанавливается при загрузке через `initTheme()`, которая вызывается **до** `initApp()` — это важно, чтобы не было "мигания" при первой загрузке.

### Светлая палитра

| Переменная | Значение | Назначение |
|-----------|---------|------------|
| `--bg-primary` | `#f3f4f8` | Основной фон (холодный белый) |
| `--bg-secondary` | `#ffffff` | Карточки, шит-модалы |
| `--bg-elevated` | `#ecedf3` | Приподнятые элементы |
| `--border` | `#dcdde8` | Обводки |
| `--text-primary` | `#0d0d14` | Основной текст |
| `--text-secondary` | `#4b4b68` | Вторичный |
| `--text-muted` | `#8e8eaa` | Приглушённый |
| `--accent-blue` | `#2563eb` | Акцент (чуть насыщеннее для лёгкого фона) |

Intentional: фон **не чисто белый**, а `#f3f4f8` — это pearl-gray. На белых мониторах чисто белый выглядит "дешево"; pearl создаёт ощущение качества.

---

## 2. Логотип в хедере

### HTML (добавлен хедер)

```html
<header class="app-header">
    <div class="header-logo">
        <svg class="header-logo-icon" viewBox="0 0 160 160" ...>
            <!-- input beam — использует CSS переменную -->
            <line style="stroke: var(--logo-beam);" .../>
            <!-- prism triangle — gradient всегда виден -->
            <path stroke="url(#hdr-prism)" .../>
            <!-- 3 refracted beams — фиксированные Alar цвета -->
            <line stroke="#22d3ee" .../>
            <line stroke="#60a5fa" .../>
            <line stroke="#3b82f6" .../>
            <!-- центральная точка преломления — адаптируется -->
            <circle style="fill: var(--logo-dot);" .../>
        </svg>
        <div class="header-logo-text">
            <span class="header-wordmark">ALAR</span>
            <span class="header-product">Finance</span>  <!-- gradient text -->
        </div>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()">...</button>
</header>
```

### Проблема видимости на тёмном фоне — решение

Проблема была в том, что входящий луч (`input beam`) у призмы имел `stroke="#fafafa"` — на тёмном фоне виден, на светлом — нет.

**Решение:** заменить на CSS custom property:

```css
:root[data-theme="dark"] {
    --logo-beam: rgba(250, 250, 250, 0.45);  /* белый на тёмном */
    --logo-dot:  rgba(255, 255, 255, 0.75);
}
:root[data-theme="light"] {
    --logo-beam: rgba(75, 75, 104, 0.45);    /* slate на светлом */
    --logo-dot:  #2563eb;                     /* синяя точка */
}
```

В SVG: **обязательно** использовать `style="stroke: var(--logo-beam);"` вместо атрибута `stroke="..."`, потому что CSS custom properties работают только через `style=""` в inline SVG, не через SVG-атрибуты.

### "Finance" — градиентный текст

```css
.header-product {
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

---

## 3. Кнопка смены темы

```html
<button class="theme-toggle" onclick="toggleTheme()">
    <svg class="icon-moon">...</svg>   <!-- видна в dark -->
    <svg class="icon-sun">...</svg>    <!-- видна в light -->
</button>
```

CSS переключает видимость:

```css
:root[data-theme="dark"] .icon-sun  { display: none; }
:root[data-theme="dark"] .icon-moon { display: block; }
:root[data-theme="light"] .icon-moon { display: none; }
:root[data-theme="light"] .icon-sun  { display: block; }
```

Кнопка имеет **Alar spring анимацию** (описана ниже в п.5) с добавлением поворота:

```css
.theme-toggle:active {
    transform: scale(0.86) rotate(-15deg);
}
```

---

## 4. Alar Tab Transitions — переключение вкладок

### Концепция

Метафора бренда — призма. Когда свет проходит сквозь призму, он **движется в пространстве**. Переключение вкладок имитирует это: экраны скользят в правильном направлении + поверх проходит лёгкий световой луч (shimmer beam).

### Реализация

Вкладки упорядочены по константе:
```js
const TAB_ORDER = ['dashboard', 'stats', 'history', 'settings'];
```

В `switchTab(tab)`:
```js
const prevIndex = TAB_ORDER.indexOf(state.currentTab);
const newIndex  = TAB_ORDER.indexOf(tab);
const enterClass = newIndex > prevIndex ? 'alar-enter-right' : 'alar-enter-left';
```

CSS анимации:
```css
@keyframes alarEnterRight {
    from { opacity: 0; transform: translateX(28px) scale(0.98); }
    to   { opacity: 1; transform: translateX(0)    scale(1); }
}
@keyframes alarEnterLeft {
    from { opacity: 0; transform: translateX(-28px) scale(0.98); }
    to   { opacity: 1; transform: translateX(0)     scale(1); }
}
```

`scale(0.98)` в начале создаёт лёгкое 3D-ощущение — экран как будто "вплывает" из глубины. Используется `cubic-bezier(0.22, 1, 0.36, 1)` — это "ease out expo", нет отскока, есть элегантное торможение.

### Световой луч (beam shimmer)

Поверх входящего экрана проходит `::before` псевдоэлемент — вертикальная полоска градиента синий→циан→синий, которая пробегает по всей ширине экрана:

```css
.screen.alar-enter-right::before,
.screen.alar-enter-left::before {
    content: '';
    position: fixed;
    width: 60px;
    background: linear-gradient(90deg,
        transparent, rgba(59,130,246,0.06), rgba(34,211,238,0.09),
        rgba(59,130,246,0.06), transparent);
    animation: alarBeamSweep 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
}
```

Это **фирменный элемент Alar**: луч света, рефрагирующий сквозь призму — каждый раз когда ты переключаешь вкладку.

### Удаление классов

После окончания анимации классы удаляются через `animationend` listener — чтобы не засорять DOM и дать возможность повторной анимации:

```js
newScreen.addEventListener('animationend', () => {
    newScreen.classList.remove('alar-enter-right', 'alar-enter-left');
}, { once: true });
```

---

## 5. Alar Interaction Language — press-анимации

### Концепция

**Не iPhone, не Material** — это Alar. Три принципа:

1. **Быстрый press** — сжатие происходит мгновенно (0.06s), finger "утапливает" UI
2. **Spring release** — при отпускании кнопка с overshoot возвращается (`cubic-bezier(0.34, 1.56, 0.64, 1)` — значение `1.56` создаёт выброс за 100%)
3. **Gradient pulse** — на ключевых кнопках после отпускания расходится кольцо в Alar-цветах

### Universal spring pattern

```css
.element {
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
}
.element:active {
    transform: scale(0.93);
    transition-duration: 0.06s;
    transition-timing-function: ease-in;
}
```

Объяснение cubic-bezier `(0.34, 1.56, 0.64, 1)`:
- P1=0.34 — начало медленное (ease-in начало)
- P2=1.56 — выброс за пределы конечного значения (spring overshoot)
- P3=0.64 — затухание
- P4=1 — финальное значение = 1.0

### Кнопки в mini-app с Alar spring:

| Элемент | Scale на press | Специфика |
|---------|----------------|-----------|
| `.quick-add-btn` | 0.92 | + SVG-иконка поворачивается на 45° |
| `.submit-btn` | 0.93 | - |
| `.category-btn` | 0.88 | + отдельный `alarCatSelect` bounce при выборе |
| `.theme-toggle` | 0.86 | + rotate(-15deg) |
| `.nav-item` | 0.88 | - |
| `.undo-btn` | 0.94 | мягче, т.к. второстепенная |

Больший scale (0.88 < 0.92) = сильнее "нажимается" = более "физичная" кнопка.

### Gradient Pulse (Alar signature)

Вызывается JS-функцией `alarPulse(element)`:

```js
function alarPulse(el) {
    el.classList.remove('alar-pulsed');
    void el.offsetWidth;  // reflow для перезапуска
    el.classList.add('alar-pulsed');
    el.addEventListener('animationend', () => el.classList.remove('alar-pulsed'), { once: true });
}
```

CSS анимация расходящегося кольца:

```css
@keyframes alarGradientPulse {
    0%   { box-shadow: 0 0 0 0   rgba(59, 130, 246, 0); }
    30%  { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.22); }
    70%  { box-shadow: 0 0 0 10px rgba(34, 211, 238, 0.08); }
    100% { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
}
```

Кольцо идёт от синего к циану (Alar gradient) и затухает. Сейчас вызывается:
- `submitEntry()` при успешном сохранении транзакции

**Можно добавить ещё на:**
- Кнопка "Добавить" на дашборде
- Сохранение бюджета
- Любая подтверждающая операция

### Category bounce

```css
@keyframes alarCatSelect {
    0%   { transform: scale(1); }
    35%  { transform: scale(0.9); }
    65%  { transform: scale(1.07); }
    100% { transform: scale(1); }
}
```

Прыжок вниз → выброс вверх → стабилизация. Ощущение "клика".

### Count-up анимация цифр

```css
@keyframes alarCountUp {
    from { opacity: 0.3; transform: translateY(8px) scale(0.94); }
    to   { opacity: 1;   transform: translateY(0)   scale(1); }
}
```

Применяется на: `#balanceAmount`, `#totalIncome`, `#totalExpense` при каждом обновлении. Числа "появляются" снизу — ощущение обновления данных.

---

## 6. Nav indicator pill

Под активной вкладкой появляется градиентный "пилюля"-индикатор:

```css
.nav-item.active::after {
    content: '';
    width: 20px; height: 3px;
    background: var(--accent-gradient);
    border-radius: 9999px;
    animation: navPillIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes navPillIn {
    from { width: 0; opacity: 0; }
    to   { width: 20px; opacity: 1; }
}
```

Пилюля "вырастает" с spring-эффектом при выборе вкладки.

---

## 7. Хедер — технические детали

```css
.app-header {
    background: var(--header-bg);     /* полупрозрачный через CSS var */
    backdrop-filter: blur(24px);      /* glassmorphism */
    border-bottom: 1px solid var(--header-border);
    box-shadow: 0 1px 0 var(--border-subtle),
                0 4px 24px rgba(59, 130, 246, 0.04); /* лёгкое голубое свечение */
}
```

`var(--header-bg)` в dark = `rgba(9,9,11,0.85)`, в light = `rgba(243,244,248,0.88)` — glassmorphism работает на обеих темах.

---

## 8. Что осталось сделать (дальнейшее развитие)

- [ ] **Pull-to-refresh анимация** — при потягивании вниз показать Alar prism logo с rotation
- [ ] **Toast анимация** — сейчас простой fadeIn; можно добавить beam-sweep
- [ ] **Skeleton loading** — вместо пустых state показывать shimmer в Alar-цветах
- [ ] **Onboarding** — первый запуск с prism-анимацией и slogan "Automate with discipline"
- [ ] **Micro-копирайт** в Settings: маленький слоган "One input. Many results." под логотипом

---

## Итог

Все изменения в одном файле: `finance-bot/mini-app.html`

Ни один backend файл не изменён. Деплой как обычно: `npx wrangler deploy`.
