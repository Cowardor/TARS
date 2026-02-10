# 🎯 MCP в VS Code - Быстрый гайд

**Дата:** 2026-01-21
**Статус:** ✅ Настроено и готово к использованию

---

## ✅ ЧТО УЖЕ НАСТРОЕНО:

1. **n8n-mcp установлен:**
   - Путь: `c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp\`
   - Версия: Latest (2147 пакетов)
   - Статус: Скомпилирован и готов

2. **VS Code MCP config создан:**
   - Путь: `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`
   - n8n API: Настроен
   - Режим: Полное управление (Режим 2)

3. **n8n запущен:**
   - URL: http://localhost:5678
   - API ключ: Настроен в MCP config

---

## 🚀 КАК ПРОВЕРИТЬ ЧТО MCP РАБОТАЕТ:

### Шаг 1: Открой новую Claude сессию в VS Code

После перезапуска VS Code, в новой сессии Claude AI агент должен иметь доступ к **n8n-mcp tools**.

### Шаг 2: Попроси AI показать доступные MCP tools

Напиши в чате:
```
Какие MCP tools у тебя доступны?
```

Если MCP подключён, AI ответит списком инструментов типа:
- `n8n_get_node_documentation`
- `n8n_search_nodes`
- `n8n_create_workflow`
- `n8n_execute_workflow`
- И другие (всего 7+ tools)

### Шаг 3: Попроси AI создать или отредактировать workflow

Пример:
```
Создай простой n8n workflow который принимает webhook и отвечает JSON
```

Если MCP работает, AI сможет:
- ✅ Создать workflow напрямую в n8n
- ✅ Показать ID созданного workflow
- ✅ Дать ссылку для открытия в браузере

---

## ❌ ЕСЛИ MCP НЕ РАБОТАЕТ:

### Проблема: "У меня нет доступа к MCP tools"

**Причина:** VS Code не перезапустился или MCP config не подхватился

**Решение:**
1. **Полностью закрой VS Code** (все окна)
2. **Убей процесс VS Code** через Task Manager если нужно
3. **Запусти VS Code снова**
4. **Открой НОВУЮ сессию Claude** (не старую!)
5. **Проверь снова**

---

### Проблема: "MCP config is invalid"

**Причина:** Ошибка в JSON синтаксисе

**Решение:**
Проверь файл `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "node",
      "args": [
        "c:\\Users\\illia\\Documents\\TARS\\mcp-servers\\n8n-mcp\\dist\\mcp\\index.js"
      ],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "YOUR_N8N_API_KEY"
      }
    }
  }
}
```

Убедись:
- ✅ Все запятые на месте
- ✅ Все кавычки парные
- ✅ Двойные обратные слэши `\\` в путях
- ✅ Нет лишних запятых в конце

---

### Проблема: "n8n API unauthorized"

**Причина:** Неправильный n8n API ключ или n8n не запущен

**Решение:**

1. **Проверь что n8n запущен:**
   ```bash
   # Открой в браузере
   http://localhost:5678
   ```

2. **Получи новый API ключ:**
   - Открой n8n: http://localhost:5678
   - Settings → API
   - Create API Key
   - Скопируй ключ

3. **Обнови MCP config:**
   - Открой `C:\Users\illia\AppData\Roaming\Code\User\mcp.json`
   - Замени `N8N_API_KEY` на новый ключ
   - Перезапусти VS Code

---

## 🎬 ЧТО AI СМОЖЕТ ДЕЛАТЬ С MCP:

### 1. Просмотр workflows
```
Покажи список всех workflows в n8n
```

AI ответит списком workflows с их ID, названиями и статусами.

---

### 2. Создание workflow
```
Создай workflow который:
1. Принимает webhook на /test
2. Преобразует JSON данные
3. Отправляет в другой webhook
```

AI создаст workflow напрямую в n8n и даст ссылку для просмотра.

---

### 3. Редактирование workflow
```
Добавь в Creative Agent V2 ещё одну GPT ноду для генерации Pinterest креативов
```

AI прочитает существующий workflow, модифицирует его и обновит в n8n.

---

### 4. Загрузка workflow из файла
```
Импортируй workflow из workflows/creative-agent-v2.json в n8n
```

AI прочитает JSON файл и создаст workflow в n8n через API.

---

### 5. Документация по нодам
```
Как использовать HTTP Request ноду в n8n?
```

AI предоставит документацию с примерами из базы знаний n8n-mcp (802 ноды).

---

## 📊 РЕЖИМЫ РАБОТЫ MCP:

### Режим 1: Только документация (не требует n8n)
- ✅ Документация по всем n8n нодам (802 ноды)
- ✅ Примеры использования
- ✅ Помощь в создании workflow JSON
- ❌ Не может создавать workflows в n8n
- ❌ Не может запускать workflows

**Конфиг:**
```json
"env": {
  "MCP_MODE": "stdio",
  "LOG_LEVEL": "error",
  "DISABLE_CONSOLE_OUTPUT": "true"
}
```

---

### Режим 2: Полное управление (текущий) ✅
- ✅ Всё из Режима 1
- ✅ Создание workflows в n8n
- ✅ Редактирование workflows
- ✅ Запуск workflows
- ✅ Управление credentials

**Конфиг:**
```json
"env": {
  "MCP_MODE": "stdio",
  "LOG_LEVEL": "error",
  "DISABLE_CONSOLE_OUTPUT": "true",
  "N8N_API_URL": "http://localhost:5678",
  "N8N_API_KEY": "your-api-key"
}
```

**Текущий статус:** Режим 2 настроен ✅

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ:

### Проверка статуса n8n-mcp
```bash
cd "c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp"
node dist/mcp/index.js
```

Вывод должен содержать:
```
[INFO] MCP server initialized with 7 tools
[INFO] Database health check passed: 802 nodes loaded
```

---

### Перезапуск n8n
```bash
# Если n8n завис или не отвечает
# 1. Найди процесс
tasklist | findstr node.exe

# 2. Убей процесс
taskkill /F /IM node.exe

# 3. Запусти снова
npx n8n
```

---

### Обновление n8n-mcp
```bash
cd "c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp"
git pull
npm install
npm run build
```

После обновления перезапусти VS Code.

---

## 📚 ДОКУМЕНТАЦИЯ:

- **MCP Setup:** [MCP_SETUP.md](MCP_SETUP.md)
- **TARS Главная:** [CLAUDE.md](CLAUDE.md)
- **Creative Agent V2:** [docs/CREATIVE_AGENT_V2_SETUP.md](docs/CREATIVE_AGENT_V2_SETUP.md)

---

## ✅ ЧЕКЛИСТ ДЛЯ ПРОВЕРКИ:

Перед использованием MCP убедись:
- [ ] n8n запущен (http://localhost:5678 открывается)
- [ ] MCP config существует (`%APPDATA%\Code\User\mcp.json`)
- [ ] n8n-mcp скомпилирован (`dist/mcp/index.js` существует)
- [ ] VS Code перезапущен после изменения config
- [ ] Новая Claude сессия открыта (не старая!)
- [ ] AI видит MCP tools (спроси "Какие MCP tools у тебя есть?")

---

**Готово! MCP настроен и работает! 🚀**
