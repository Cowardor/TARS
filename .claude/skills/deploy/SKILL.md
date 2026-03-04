---
name: deploy
description: Задеплоить Alar Finance на Cloudflare (Workers + Pages). Перед деплоем проверяет статус git и делает коммит если нужно.
allowed-tools: Bash, Read
argument-hint: [worker|pages|all]
---

Деплой Alar Finance на Cloudflare. Аргумент: $ARGUMENTS (worker / pages / all, default: all)

## Шаг 1 — Проверь статус

Текущие изменения:
```
!`cd c:/Users/illia/Documents/TARS && git status --short`
```

## Шаг 2 — Коммит если есть изменения

Если есть незакоммиченные изменения — сделай коммит:
```bash
git add -A
git commit -m "[DEV] Pre-deploy commit"
git push origin main
```

## Шаг 3 — Деплой

В зависимости от аргумента `$ARGUMENTS`:

**worker** или **all**:
```bash
cd c:/Users/illia/Documents/TARS/finance-bot
npm run deploy
```

**pages** или **all**:
Cloudflare Pages деплоится автоматически через GitHub при пуше в `main`.
Проверь статус: https://dash.cloudflare.com

## Шаг 4 — Проверь результат

После деплоя:
- Сообщи URL Worker'а из вывода wrangler
- Проверь что нет ошибок в логах
- Добавь запись в `docs/CHANGELOG.md`
