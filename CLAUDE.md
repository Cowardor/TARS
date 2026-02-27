# CLAUDE.md

Центральный конфиг для AI агентов проекта **Alar** (ранее TARS).

**Language:** Пользователь общается на русском. Отвечай на русском.

---

## Проект

**Alar** — экосистема AI агентов для автоматизации бизнеса.
Стек: n8n (JSON) + TypeScript MCP + Telegram Mini App + Cloudflare Workers/Pages.
GitHub: https://github.com/Cowardor/TARS

### Текущий фокус: Alar Finance
- Mini App UI v2 готов → [finance-bot/mini-app.html](finance-bot/mini-app.html)
- Нужно: подключить Cloudflare Worker API к Mini App
- **При работе с UI** → ОБЯЗАТЕЛЬНО прочитай [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- Дев промпт: [docs/prompts/FINANCE_BOT_DEV_PROMPT.md](docs/prompts/FINANCE_BOT_DEV_PROMPT.md)

### Очередь задач
1. 🔥 **Alar Finance** — Worker API + деплой
2. ⏳ Ребрендинг TARS → Alar — [docs/prompts/REBRAND_DEV_PROMPT.md](docs/prompts/REBRAND_DEV_PROMPT.md)
3. ⏳ Phase 1: Caption Generator, AI Sales Consultant — [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md)

---

## Структура репозитория

```
TARS/
├── finance-bot/         # Alar Finance — Mini App + Cloudflare Worker
├── workflows/           # n8n workflow JSON
├── docs/                # Стратегии, промпты, брендинг, дизайн-система
├── mcp-servers/n8n-mcp/ # TypeScript MCP сервер (свой CLAUDE.md внутри)
├── creative-agent-form.html
└── video-agent-form.html
```

## Инфраструктура

- **n8n:** `npx n8n` → http://localhost:5678
- **MCP серверы (7):** n8n-mcp, context7, fetch, filesystem, playwright, github, sequential-thinking
- **MCP config:** `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`
- **Деплой:** Cloudflare Pages + Workers
- **API ключи:** только в `.env` (шаблон: [.env.example](.env.example))

## Команды

```bash
# MCP Server (mcp-servers/n8n-mcp/)
npm run build && npm test && npm run typecheck

# Finance Bot (finance-bot/)
npm run dev          # Локально (wrangler)
npm run deploy       # Деплой на Cloudflare
```

---

## Правила для всех агентов

### Git — после каждого этапа работы
```bash
git add -A && git commit -m "[РОЛЬ] Описание" && git push origin main
```
Форматы: `[DEV]` `[UI]` `[MARKETING]` `[QA]` `[LEAD]`
**Не коммитить:** `.env`, API ключи, токены.

### При работе с finance-bot UI
> **СТОП.** Прочитай [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) перед любыми изменениями.
> Там палитра, шрифты, иконки, анимации, компоненты — всё обязательно.

---

## Документация

| Документ | Описание |
|----------|----------|
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | **Дизайн-система Alar Finance** — палитра, типографика, компоненты |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Лог обновлений от участников команды |
| [docs/TEAM_STRUCTURE.md](docs/TEAM_STRUCTURE.md) | 8 ролей с промптами |
| [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md) | 25+ идей воркфлоу |
| [docs/MONETIZATION_STRATEGY.md](docs/MONETIZATION_STRATEGY.md) | Стратегия монетизации |
| [docs/branding/BRAND_GUIDE.md](docs/branding/BRAND_GUIDE.md) | Брендбук Alar |
| [docs/prompts/](docs/prompts/) | Промпты для задач участникам |
| [mcp-servers/n8n-mcp/CLAUDE.md](mcp-servers/n8n-mcp/CLAUDE.md) | MCP сервер — архитектура |

## Воркфлоу

| Workflow | Файл |
|----------|------|
| Scout Budget | `workflows/scout-agent-v1-budget.json` |
| Scout Pro | `workflows/scout-agent-v1.json` |
| Creative V1/V2 | `workflows/creative-agent-v1.json` / `v2.json` |
| Video Standard | `workflows/video-agent-standard-v1-practical.json` |
