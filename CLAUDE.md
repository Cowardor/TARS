# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 TEAM LEAD SECTION

**Team Lead:** Claude Opus 4.6
**Обновлено:** 2026-02-25
**GitHub:** https://github.com/Cowardor/TARS

### Текущий статус проекта:
- ✅ Git + GitHub подключён (ветка `main`)
- ✅ API ключи удалены из документации, используется `.env`
- ✅ MCP сервер работает (803 ноды n8n)
- ✅ MCP расширен: 7 серверов (n8n, context7, fetch, filesystem, playwright, github, sequential-thinking)
- ✅ Бренд утверждён: **Alar** (призма) — брендбук: [docs/branding/BRAND_GUIDE.md](docs/branding/BRAND_GUIDE.md)
- ✅ Стратегия монетизации готова: [docs/MONETIZATION_STRATEGY.md](docs/MONETIZATION_STRATEGY.md)
- ✅ Finance Mini App UI v2 создан: [finance-bot/mini-app.html](finance-bot/mini-app.html)
- 🔥 В работе: **Alar Finance** — подключить Cloudflare Worker API к Mini App
- ⏳ Ожидает: ребрендинг кодовой базы TARS → Alar
- ⏳ Ожидает: Caption & Hashtag Generator (Phase 1)

### Приоритеты команды:

**1. Alar Finance (текущий фокус)**
- Mini App UI v2 готов (dark/light theme, animations, 12 категорий)
- Нужно: подключить `API_BASE` в mini-app.html к Cloudflare Worker
- Промпт для дева: [docs/prompts/FINANCE_BOT_DEV_PROMPT.md](docs/prompts/FINANCE_BOT_DEV_PROMPT.md)
- Дизайн-гайд: [docs/prompts/MINI_APP_DESIGN_DEV_GUIDE.md](docs/prompts/MINI_APP_DESIGN_DEV_GUIDE.md)

**2. Ребрендинг TARS → Alar**
- Промпт: [docs/prompts/REBRAND_DEV_PROMPT.md](docs/prompts/REBRAND_DEV_PROMPT.md)
- Нейминг: Alar Scout / Creative / Video / Finance / Consult / Toolkit

**3. Phase 1 воркфлоу (быстрые деньги)**
- Caption & Hashtag Generator → Alar Toolkit
- AI Sales Consultant → Alar Consult
- Роадмап: [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md)

### Сообщения для Team Lead:
```
[ДАТА] [ОТ КОГО]: Сообщение
```

<!-- TEAM MESSAGES START -->
[2026-02-10] [Marketing Strategist]: Готова полная стратегия монетизации → docs/MONETIZATION_STRATEGY.md. Приоритет: 1) Dropshipping Bundle ($49-299), 2) TikTok Toolkit ($9.99/мес), 3) AI Sales Consultant ($49-149/мес). Прогноз: $4K MRR к месяцу 3, $10K к месяцу 6. Действие: LemonSqueezy + Scout Budget бесплатно на n8n Community.
[2026-02-24] [UI/UX Designer]: Design v2 — finance-bot/mini-app.html. Светлая/тёмная тема, логотип Alar, Alar Tab Transitions (направленный слайд + shimmer), spring-press анимации, count-up цифры, gradient pulse на submit. Гайд: docs/prompts/MINI_APP_DESIGN_DEV_GUIDE.md
[2026-02-25] [Team Lead]: MCP расширен до 7 серверов. GitHub подключён. Текущий фокус — завершить Alar Finance (Worker API + деплой). Следующий этап — Phase 1 воркфлоу.
<!-- TEAM MESSAGES END -->

### Документы команды:
- [docs/TEAM_STRUCTURE.md](docs/TEAM_STRUCTURE.md) — 8 ролей с промптами
- [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md) — 25+ идей воркфлоу
- [docs/MONETIZATION_STRATEGY.md](docs/MONETIZATION_STRATEGY.md) — монетизация
- [docs/prompts/](docs/prompts/) — промпты для всех участников

### ОБЯЗАТЕЛЬНО: Бекап в GitHub после каждого этапа

```bash
git add -A
git commit -m "[РОЛЬ] Краткое описание"
git push origin main
```

**Форматы коммитов:** `[DEV]` `[UI]` `[MARKETING]` `[QA]` `[LEAD]`
**Правила:** не коммитить `.env`, API ключи, токены

---

## Project Overview

**Alar** (ранее TARS) — экосистема AI агентов для автоматизации бизнеса. Текущий фокус: Finance Tracker (Alar Finance) + портфолио n8n воркфлоу для продажи.

Стек: n8n воркфлоу (JSON) + TypeScript MCP сервер + Telegram Mini App + Cloudflare Workers/Pages.

**Language:** The user communicates in Russian. Respond in Russian unless asked otherwise.

## Repository Structure

```
TARS/
├── workflows/           # n8n workflow JSON (импортировать через n8n UI)
├── finance-bot/         # Alar Finance — Telegram Mini App + Cloudflare Worker
│   ├── mini-app.html    # UI v2 (готов, нужен API)
│   ├── cloudflare-worker.js  # Worker (нужно подключить к mini-app)
│   └── src/             # Сервисы: категории, банки, бюджет
├── docs/                # Стратегии, промпты, брендинг
├── mcp-servers/n8n-mcp/ # TypeScript MCP сервер
├── creative-agent-form.html
└── video-agent-form.html
```

## Infrastructure

- **n8n:** http://localhost:5678 — запуск: `npx n8n`
- **GitHub:** https://github.com/Cowardor/TARS
- **MCP config:** `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`
- **MCP серверы:** n8n-mcp, context7, fetch, filesystem, playwright, github, sequential-thinking
- **Деплой:** Cloudflare Pages (finance-bot/mini-app.html) + Cloudflare Workers (API)

### API Keys (только в `.env`, никогда не в git)

```bash
OPENAI_API_KEY=
N8N_API_KEY=
CLOUDFLARE_API_TOKEN=
TELEGRAM_BOT_TOKEN=
```

Шаблон: [.env.example](.env.example)

## Development Commands

### MCP Server (`mcp-servers/n8n-mcp/`)
```bash
npm run build       # TypeScript компиляция
npm run dev         # Build + rebuild DB + validate
npm test            # Все тесты (Vitest)
npm run typecheck   # TypeScript strict mode
npm start           # MCP сервер (stdio для VS Code)
npm run rebuild     # Пересобрать БД нод
```

### Finance Bot (`finance-bot/`)
```bash
npm install         # Зависимости
npm run dev         # Локальная разработка (wrangler)
npm run deploy      # Деплой на Cloudflare Workers
```

## Available Workflows

| Workflow | Файл | API |
|----------|------|-----|
| Scout Budget | `workflows/scout-agent-v1-budget.json` | AliExpress, Google Trends, GPT-4o-mini |
| Scout Pro | `workflows/scout-agent-v1.json` | Sell The Trend, Kalodata, FastMoss |
| Creative V1 | `workflows/creative-agent-v1.json` | OpenAI |
| Creative V2 | `workflows/creative-agent-v2.json` | OpenAI (viral) |
| Video Standard | `workflows/video-agent-standard-v1-practical.json` | OpenAI, Midjourney, ElevenLabs, Shotstack |

## Key Documentation

- [docs/TEAM_STRUCTURE.md](docs/TEAM_STRUCTURE.md) — роли команды
- [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md) — роадмап воркфлоу
- [docs/MONETIZATION_STRATEGY.md](docs/MONETIZATION_STRATEGY.md) — монетизация
- [docs/branding/BRAND_GUIDE.md](docs/branding/BRAND_GUIDE.md) — брендбук Alar
- [docs/prompts/FINANCE_BOT_DEV_PROMPT.md](docs/prompts/FINANCE_BOT_DEV_PROMPT.md) — Finance Bot дев промпт
- [mcp-servers/n8n-mcp/CLAUDE.md](mcp-servers/n8n-mcp/CLAUDE.md) — MCP сервер архитектура
