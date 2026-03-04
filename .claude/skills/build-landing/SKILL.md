---
name: build-landing
description: Создать премиальный лендинг продукта. Sticky-scroll layout — продукт справа, фичи слева. Nude/old-money палитра, Satoshi font, плавные анимации. Инструкции клиента в приоритете над всем.
allowed-tools: Read, Write, Edit, Bash, Glob
argument-hint: [название продукта или путь к брифу]
---

# Build Landing — Alar Web Studio

Ты создаёшь **премиальный лендинг** для продукта `$ARGUMENTS`.

---

## ШАГ 0 — Брифинг клиента

Перед кодом — **задай эти вопросы**. Без ответов не приступай:

```
1. Название продукта и короткий tagline (1 строка)?
2. Что продукт делает? Главная ценность для пользователя?
3. Целевая аудитория? (возраст, статус, боли)
4. Ключевые фичи — 3-6 штук. Для каждой: название + что показать визуально?
5. Есть готовые скриншоты/видео/мокапы продукта? Если да — путь к файлам.
6. Цветовая схема: nude/ivory (дефолт), тёмная, брендовая, другая?
7. Есть ли брендбук, лого, фирменный шрифт?
8. CTA — что должен сделать пользователь? (скачать, купить, записаться?)
9. Нужны ли страницы кроме лендинга? (pricing, blog, etc.)
10. Любые особые пожелания или примеры сайтов которые нравятся?
```

> **ПРАВИЛО №1:** Ответы клиента заменяют любые дефолты ниже. Клиент сказал тёмный фон — делай тёмный. Клиент показал референс — следуй ему. Гибкость важнее стандартов.

---

## ВИЗУАЛЬНЫЙ СТИЛЬ (дефолт — nude/old-money)

### Палитра

```css
/* Светлая nude тема (дефолт) */
--bg-primary:    #F7F5F0;   /* слоновая кость — основной фон */
--bg-card:       #EFEDE6;   /* чуть темнее — карточки, секции */
--bg-elevated:   #FFFFFF;   /* белый — поднятые элементы */
--text-primary:  #1A1814;   /* почти чёрный — заголовки */
--text-body:     #3D3A34;   /* тёплый тёмный — основной текст */
--text-muted:    #8C8880;   /* приглушённый — мелкий текст */
--border:        #E2DED6;   /* тонкие линии */
--accent:        клиент задаёт; /* основной акцент бренда */
```

```css
/* Тёмная альтернатива */
--bg-primary:    #0F0E0C;
--bg-card:       #1A1916;
--text-primary:  #F0EDE6;
--text-muted:    #6B6860;
```

Нет "правильного" цвета — есть **цвет клиента**. Если клиент принёс брендбук — используй его.

### Типографика

```css
/* Шрифты — подключать через fontshare + Google */
font-family: 'Satoshi', sans-serif;  /* заголовки, Hero, числа */
font-family: 'Switzer', sans-serif;  /* body, nav, кнопки, мелкий текст */

/* Импорт */
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=switzer@300,400,500,600&display=swap" rel="stylesheet">
```

| Элемент | Шрифт | Размер | Вес |
|---|---|---|---|
| Hero headline | Satoshi | clamp(48px, 8vw, 120px) | 700–900 |
| Section headline | Satoshi | clamp(32px, 5vw, 64px) | 700 |
| Feature title | Satoshi | 24–32px | 600 |
| Body / описание | Switzer | 16–18px | 400 |
| Навигация | Switzer | 15px | 500 |
| Кнопки | Switzer | 15px | 600 |
| Метрики/числа | Satoshi | clamp(40px, 6vw, 80px) | 700 |

Курсив в заголовках (`font-style: italic`) — приём для второго слова или акцента, как в референсах.

---

## СТРУКТУРА ЛЕНДИНГА

### Обязательные секции (порядок гибкий)

```
1. NAV          — логотип + ссылки + CTA кнопка
2. HERO         — главный заголовок + tagline + CTA + первый визуал
3. SOCIAL PROOF — метрики (1K+ users, 4.8★, etc.) или логотипы клиентов
4. FEATURES     — sticky-scroll секция (ключевые фичи)
5. [опционально] — pricing / testimonials / FAQ / team
6. CTA FOOTER   — финальный призыв + форма/кнопка
```

---

## ГЛАВНЫЙ ПАТТЕРН — Sticky Scroll Features

Это центральная механика лендинга. Реализовать через IntersectionObserver (без зависимостей) или GSAP ScrollTrigger (если клиент хочет сложные анимации).

### HTML структура

```html
<section class="features-section">
  <!-- Левая колонка: текст фич (скроллится) -->
  <div class="features-text">
    <div class="feature-item" data-feature="0">
      <span class="feature-tag">01 — Название фичи</span>
      <h3>Заголовок фичи</h3>
      <p>Описание что делает эта функция и почему это ценно.</p>
    </div>
    <div class="feature-item" data-feature="1"> ... </div>
    <div class="feature-item" data-feature="2"> ... </div>
  </div>

  <!-- Правая колонка: визуал (sticky) -->
  <div class="features-visual">
    <div class="visual-frame">
      <!-- Слайды меняются при смене активной фичи -->
      <div class="visual-slide active" data-slide="0">
        <!-- скриншот / видео / мокап телефона -->
      </div>
      <div class="visual-slide" data-slide="1"> ... </div>
    </div>
  </div>
</section>
```

### CSS (sticky механика)

```css
.features-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: start;
}

.features-visual {
  position: sticky;
  top: 50%;
  transform: translateY(-50%);
  height: fit-content;
}

.feature-item {
  min-height: 60vh;           /* каждая фича — 60% экрана */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 0;
  opacity: 0.3;
  transition: opacity 0.4s ease;
}

.feature-item.active {
  opacity: 1;
}

.visual-slide {
  position: absolute;
  opacity: 0;
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  transform: translateY(20px);
}

.visual-slide.active {
  opacity: 1;
  transform: translateY(0);
}
```

### JS (IntersectionObserver)

```js
const featureItems = document.querySelectorAll('.feature-item');
const visualSlides = document.querySelectorAll('.visual-slide');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = entry.target.dataset.feature;
      featureItems.forEach(el => el.classList.remove('active'));
      visualSlides.forEach(el => el.classList.remove('active'));
      entry.target.classList.add('active');
      document.querySelector(`[data-slide="${idx}"]`)?.classList.add('active');
    }
  });
}, { threshold: 0.5 });

featureItems.forEach(el => observer.observe(el));
```

---

## НАВИГАЦИЯ

```css
nav {
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 48px;
  background: rgba(247, 245, 240, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  z-index: 100;
}
```

- Лого слева
- Ссылки по центру (скрыть на mobile)
- CTA кнопка справа — pill shape (`border-radius: 100px`)

---

## КНОПКИ

```css
/* Primary */
.btn-primary {
  background: var(--text-primary);
  color: var(--bg-primary);
  padding: 14px 28px;
  border-radius: 100px;
  font-family: 'Switzer'; font-weight: 600; font-size: 15px;
  border: none; cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.btn-primary:hover { opacity: 0.85; transform: translateY(-1px); }

/* Outline */
.btn-outline {
  background: transparent;
  border: 1.5px solid var(--text-primary);
  color: var(--text-primary);
  /* остальное то же */
}
```

---

## ТЕЛЕФОН / ПРОДУКТ МОКАП

Если есть скриншоты приложения — оборачивать в phone frame:

```html
<div class="phone-mockup">
  <div class="phone-frame">
    <div class="phone-notch"></div>
    <div class="phone-screen">
      <img src="screenshot.png" alt="App screen">
      <!-- или видео -->
    </div>
  </div>
</div>
```

```css
.phone-frame {
  width: 280px;
  background: #1A1A1A;
  border-radius: 44px;
  padding: 12px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1);
}
.phone-screen {
  border-radius: 34px;
  overflow: hidden;
  aspect-ratio: 9/19.5;
  background: #000;
}
.phone-screen img, .phone-screen video {
  width: 100%; height: 100%; object-fit: cover;
}
```

Если нет скриншотов — использовать анимированные CSS иллюстрации или placeholder с gradient.

---

## АНИМАЦИИ ПРИ ПОЯВЛЕНИИ

Все секции появляются снизу-вверх при скролле:

```js
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(40px)';
  el.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
  revealObserver.observe(el);
});
```

---

## СТЕК

| Нужно | Использовать |
|---|---|
| Базовый лендинг | Чистый HTML + CSS + Vanilla JS |
| Сложные анимации | + GSAP + ScrollTrigger |
| Много страниц | Next.js + Tailwind |
| CMS (клиент редактирует) | Webflow / Framer |
| Быстрый прототип | Tailwind CDN в один HTML файл |
| 3D / WebGL | Three.js (только если клиент просит) |

Минимализм в коде = минимализм в дизайне. Не добавляй библиотеки без причины.

---

## PERFORMANCE CHECKLIST

Перед сдачей проверить:
- [ ] Lighthouse Performance > 90
- [ ] Нет layout shift (CLS < 0.1)
- [ ] Шрифты через `display=swap`
- [ ] Изображения — WebP, с `loading="lazy"`
- [ ] Mobile responsive: 375px, 768px, 1440px
- [ ] Нет горизонтального скролла на мобилке
- [ ] CTA кликабелен с телефона (min 44×44px)

---

## ПОСЛЕ РАБОТЫ

```bash
git add -A
git commit -m "[UI] Landing — [название продукта]"
git push origin main
```

Добавь запись в `docs/CHANGELOG.md`.

---

> **НАПОМИНАНИЕ:** Этот скилл — фреймворк, не тюрьма.
> Если клиент хочет иначе — делай иначе. Его видение важнее любого дефолта здесь.
