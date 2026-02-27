# Alar Finance — Design System

> **ОБЯЗАТЕЛЬНО соблюдать** при любой работе с `finance-bot/mini-app.html`
> Всё в одном файле: CSS + HTML + JS.

---

## Палитра Deep Cosmos

| Токен | Hex | Применение |
|---|---|---|
| `--accent-blue` | `#4f46e5` | Primary CTA, active nav, FAB, accent |
| `--accent-soft` | `#818cf8` | Gradient end, hover, secondary accent |
| `--accent-cyan` | `#22d3ee` | Spark, beam, family badge |
| `--accent-emerald` | `#10b981` | Income, success, семейный счёт |
| `--accent-amber` | `#f59e0b` | Investments, warnings, budget |
| `--danger` | `#ef4444` | Expenses, delete, errors |
| `--accent-gradient` | `135deg, #4f46e5→#818cf8` | FAB, primary submit, cards |

**ЗАПРЕЩЕНО:** хардкодить `#EF4444`, `#F59E0B`, `#10b981`, `#3b82f6` и другие цвета напрямую — только через CSS-переменные.

---

## Иконки

- **ViewBox:** `0 0 20 20` — строго, не 24x24
- **stroke-width:** `1.7`
- **stroke-linecap/linejoin:** `round`
- **fill:** `none` (только stroke, не fill)
- **Размер в UI:** 20×20px в settings, 22×22px в template cards, 13×13px в chips
- Иконки типов счетов: функция `getAccountTypeIconHTML(type)` — использовать везде

---

## Типографика (V12 — Editorial Finance)

- **UI основной:** `Switzer` (fontshare.com) — 300–700
- **Заголовки:** `Zodiak` (fontshare.com, serif) — greeting-name, modal-title, section-title, stats-title — `font-weight: 500–600`
- **Числа/суммы:** `DM Mono` (Google Fonts) — `font-weight: 500`
- Заголовки секций: `11px`, `font-weight: 600`, `letter-spacing: 0.06em`, `text-transform: uppercase`, `color: var(--text-muted)`
- Основной текст: `14–16px`, `font-weight: 500`
- Мелкий текст: `12–13px`, `color: var(--text-secondary)`

**Импорт шрифтов:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=zodiak@400,500,600,700&f[]=switzer@300,400,500,600,700&display=swap" rel="stylesheet">
```

**ЗАПРЕЩЕНО:** использовать `Inter`, `JetBrains Mono` — заменены на `Switzer`, `DM Mono`

---

## Радиусы и отступы

- `--radius-sm: 8px` — мелкие элементы (badges, chips)
- `--radius-md: 12px` — иконки, кнопки, небольшие карточки
- `--radius-lg: 16px` — inputs, list items
- `--radius-xl: 20px` — модальные листы (снизу)
- `24px` — floating action sheet (все 4 угла)
- Внутренний padding карточек: `16px`

---

## Кнопки

- **Primary (создать/сохранить):** `background: var(--accent-gradient)` + `box-shadow: 0 4px 16px var(--accent-blue-glow)`
- **Expense submit:** `background: var(--danger)` — только для кнопки "Записать расход"
- **Income submit:** `background: var(--success)` — только для "Записать доход"
- **Danger:** `color: var(--danger)` на белом/прозрачном фоне — delete actions
- Никогда не использовать emoji в кнопках — только SVG иконки

---

## Компоненты с иконками

- **Settings items:** `.settings-icon` с CSS-классами `si-indigo`, `si-violet`, `si-emerald`, `si-amber`, `si-cyan`, `si-red`
- **Manage Icons (account types):** `getAccountTypeIconHTML(acc.type)` с inline style `background: TYPE_COLORS[type].bg; color: TYPE_COLORS[type].fg`
- **Category icons в списках:** emoji в цветном контейнере — expense: `var(--danger-soft)` / `var(--danger)`, income: `var(--success-soft)` / `var(--success)`
- **Тогглы (on/off):** ON = `var(--accent-blue)`, OFF = `rgba(120,120,150,0.3)` — не `var(--bg-secondary)`!

---

## FAB и Action Sheet

- FAB: `position: fixed; z-index: 250; bottom: calc(34px + var(--safe-bottom)); left: 50%; transform: translateX(-50%)`
- FAB видим только когда нет открытых `.modal-overlay.show` — управляется через `updateFabVisibility()`
- Action sheet: floating card, `margin-bottom: calc(88px + var(--safe-bottom))`, нотч `overflow:hidden` + `.action-sheet-notch-hole`

---

## Анимации

- **Spring:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — появление карточек, snap-back
- **Smooth:** `cubic-bezier(0.22, 1, 0.36, 1)` — tab transitions, modal open
- **Fast out:** `cubic-bezier(0.4, 0, 1, 1)` — modal close/dismiss
- **Haptic:** `haptic('light' | 'medium' | 'success')` — на каждом значимом действии
