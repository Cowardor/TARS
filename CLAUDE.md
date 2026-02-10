# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 TEAM LEAD SECTION (Командная коммуникация)

**Team Lead:** Claude Opus 4.5
**Дата обновления:** 2026-01-29

### Текущий статус проекта:
- ✅ Git инициализирован
- ✅ API ключи удалены из документации
- ✅ MCP сервер работает (803 ноды)
- ⏳ Ожидает: настройка GitHub remote
- ⏳ Ожидает: первый воркфлоу Phase 1

### Задачи для участников команды:

**Приоритет HIGH:**
1. **Finance Bot (Telegram + Notion)** - НОВАЯ ЗАДАЧА
   - Промпт: [docs/prompts/FINANCE_BOT_DEV_PROMPT.md](docs/prompts/FINANCE_BOT_DEV_PROMPT.md)
   - Статус: ⏳ Ожидает разработки
2. Caption & Hashtag Generator (TikTok) - простой, быстрый старт
3. AI Sales Consultant (Telegram) - высокий потенциал

**Текущие замечания:**
- Finance Bot: категории взяты из существующего Notion трекера пользователя

### Сообщения для Team Lead:
*Участники команды могут оставлять здесь сообщения. Формат:*
```
[ДАТА] [ОТ КОГО]: Сообщение
```

<!-- TEAM MESSAGES START -->
<!-- Пример: [2026-01-29] [Workflow Dev]: Создал Caption Generator, нужен review -->
[2026-02-10] [Marketing Strategist]: Готова полная стратегия монетизации → docs/MONETIZATION_STRATEGY.md. Приоритет запуска: 1) Dropshipping Bundle (one-time $49-299, быстрые деньги), 2) TikTok Toolkit (подписка $9.99/мес), 3) AI Sales Consultant ($49-149/мес, высокий LTV), 4) Finance Bot (freemium, growth). Реалистичный прогноз: $4K MRR к месяцу 3, $10K к месяцу 6. Немедленное действие: создать аккаунт LemonSqueezy и опубликовать Scout Budget бесплатно на n8n Community.
<!-- TEAM MESSAGES END -->

### Документы команды:
- [docs/TEAM_STRUCTURE.md](docs/TEAM_STRUCTURE.md) - роли и промпты
- [docs/WORKFLOW_ROADMAP.md](docs/WORKFLOW_ROADMAP.md) - план развития
- [docs/prompts/](docs/prompts/) - промпты для задач участникам

### ОБЯЗАТЕЛЬНО: Бекап в GitHub после каждого этапа

**Каждый участник команды ОБЯЗАН** после завершения этапа работы:

```bash
# 1. Проверь что нет секретов
git diff --staged  # убедись что нет API ключей

# 2. Добавь изменения
git add -A

# 3. Коммит с понятным описанием
git commit -m "[РОЛЬ] Краткое описание

- Что сделано
- Что изменилось

Co-Authored-By: [Роль агента]"

# 4. Пуш в GitHub
git push origin main
```

**Формат коммитов:**
- `[DEV] Finance Bot v1 - базовый функционал`
- `[UI] Лендинг для Finance Bot`
- `[MARKETING] Стратегия монетизации Finance Bot`
- `[QA] Тестирование Finance Bot - 3 бага найдено`
- `[LEAD] Обновление CLAUDE.md и roadmap`

**Правила:**
- НЕ коммитить .env, API ключи, токены
- Коммитить после КАЖДОГО завершённого этапа (не копить)
- Если не уверен - спроси у Team Lead
- Перед пушем проверь `git status` на наличие секретов

---

## Project Overview

TARS is an ecosystem of AI agents for automating Shopify dropshipping business. The project consists of n8n workflow definitions (JSON), HTML test forms, and a TypeScript MCP server that bridges n8n with AI assistants. All agent logic runs through n8n at http://localhost:5678.

**Language:** The user communicates in Russian. Respond in Russian unless asked otherwise.

## Repository Structure

The root contains workflow configs and documentation. The only buildable code lives in `mcp-servers/n8n-mcp/`.

```
TARS/
├── workflows/           # n8n workflow JSON files (import into n8n UI)
├── docs/                # Agent strategy docs, setup guides, ROI analysis
├── mcp-servers/n8n-mcp/ # TypeScript MCP server (see its own CLAUDE.md)
├── creative-agent-form.html  # Test form for Creative Agent
└── video-agent-form.html     # Test form for Video Agent
```

## Development Commands (MCP Server)

All code commands run from `mcp-servers/n8n-mcp/`:

```bash
# Build
npm run build              # TypeScript compilation (run after every change)
npm run dev                # Build + rebuild database + validate

# Test (Vitest)
npm test                   # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests (needs clean DB state)
npm run test:coverage      # Coverage report (thresholds: 80% lines, 80% functions, 75% branches)
npm run test:watch         # Watch mode

# Single test file
npm test -- tests/unit/services/property-filter.test.ts

# Type checking
npm run typecheck          # TypeScript strict mode (also available as npm run lint)

# Server
npm start                  # MCP server in stdio mode (for VS Code)
npm run start:http         # MCP server in HTTP mode
npm run dev:http           # HTTP with auto-reload

# Database
npm run rebuild            # Rebuild node database from n8n packages
npm run validate           # Validate all node data
npm run fetch:templates    # Fetch workflow templates from n8n.io
npm run fetch:community    # Fetch community nodes
```

## n8n Commands

```bash
npx n8n                    # Start n8n (opens at http://localhost:5678)
```

## Architecture

### Agent Pipeline

Each agent is an n8n workflow triggered via webhook. The pipeline:

1. **Scout Agent** - Finds products with growing demand, validates ROI >= 80%
2. **Creative Agent** - Generates TikTok/IG scripts + Midjourney prompts for products
3. **Video Agent** - End-to-end video production: GPT-4o script → Midjourney images → ElevenLabs voiceover → Shotstack video assembly → MP4 output

### MCP Server (`mcp-servers/n8n-mcp/`)

TypeScript server implementing Model Context Protocol. Has its own [CLAUDE.md](mcp-servers/n8n-mcp/CLAUDE.md) with detailed architecture.

**Key layers:**
- `src/mcp/` - MCP protocol server, tool definitions, tool documentation
- `src/database/` - SQLite with FTS5 search (1,084 n8n nodes indexed)
- `src/loaders/` → `src/parsers/` → `src/database/` - Node processing pipeline
- `src/services/` - Validation, filtering, expression checking, workflow validation
- `src/templates/` - 2,709 workflow templates from n8n.io

**Key patterns:**
- Repository pattern for all DB access
- Universal DB adapter (better-sqlite3 native / sql.js fallback)
- Validation profiles: minimal, runtime, ai-friendly, strict
- Diff-based workflow updates (saves 80-90% tokens)

### Workflow Files

Workflow JSONs are imported directly into n8n UI. They use webhook triggers and connect to external APIs (OpenAI, UseAPI/Midjourney, ElevenLabs, Shotstack). Save new/modified workflows to `workflows/`.

### HTML Test Forms

Static HTML files that POST to n8n webhook endpoints. No build step needed - open directly in browser.

## Infrastructure

- **n8n:** http://localhost:5678
- **MCP config:** `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`
- **MCP entry point:** `mcp-servers/n8n-mcp/dist/mcp/index.js`

### API Keys

**ВАЖНО:** API ключи хранятся в `.env` файле (добавлен в `.gitignore`).

Необходимые ключи:
- `OPENAI_API_KEY` - для GPT-4o в воркфлоу
- `N8N_API_KEY` - для MCP сервера

Создай файл `.env` в корне проекта:
```bash
OPENAI_API_KEY=your-openai-key-here
N8N_API_KEY=your-n8n-api-key-here
```

### MCP VS Code Config

Расположение: `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["c:\\Users\\illia\\Documents\\TARS\\mcp-servers\\n8n-mcp\\dist\\mcp\\index.js"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "info",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "${N8N_API_KEY}"
      }
    }
  }
}
```

**Примечание:** Замени `${N8N_API_KEY}` на реальный ключ в `mcp.json` (этот файл не в репо).

To reload MCP: close VS Code completely, reopen, start new Claude session.

## Available Workflows

| Workflow | File | External APIs |
|----------|------|---------------|
| Scout (Budget) | `workflows/scout-agent-v1-budget.json` | AliExpress, Google Trends, GPT-4o-mini |
| Scout (Pro) | `workflows/scout-agent-v1.json` | Sell The Trend, Kalodata, FastMoss |
| Creative V1 | `workflows/creative-agent-v1.json` | OpenAI |
| Creative V2 | `workflows/creative-agent-v2.json` | OpenAI (viral authenticity) |
| Video Standard | `workflows/video-agent-standard-v1-practical.json` | OpenAI, UseAPI/Midjourney, ElevenLabs, Shotstack |

## Key Documentation

- [QUICK_START_V2.md](QUICK_START_V2.md) - Creative Agent V2 setup
- [QUICK_START_VIDEO_AGENT.md](QUICK_START_VIDEO_AGENT.md) - Video Agent setup
- [MCP_VS_CODE_GUIDE.md](MCP_VS_CODE_GUIDE.md) - MCP in VS Code
- [docs/VIDEO_AGENT_STRATEGY.md](docs/VIDEO_AGENT_STRATEGY.md) - 2026 video effectiveness research
- [mcp-servers/n8n-mcp/CLAUDE.md](mcp-servers/n8n-mcp/CLAUDE.md) - MCP server development guide
