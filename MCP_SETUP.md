# Настройка N8N-MCP для Claude Desktop

## ✅ Установка завершена

N8N-MCP успешно установлен и скомпилирован!

- **Путь к проекту:** `c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp\`
- **Исполняемый файл:** `c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp\dist\mcp\index.js`
- **Node.js версия:** v24.13.0
- **npm версия:** 11.6.2
- **Установлено пакетов:** 2147

---

## Следующие шаги

N8N-MCP может работать в двух режимах:

### Режим 1: Только документация (рекомендуется для начала)
**Не требует запущенного n8n**
- Доступ к документации 1,084 n8n нод
- Примеры workflow
- Помощь в создании workflow

### Режим 2: Полное управление (для продвинутых)
**Требует запущенный n8n**
- Создание и редактирование workflow
- Выполнение автоматизаций
- Полный доступ к n8n API

---

## Быстрый старт (Режим 1 - Только документация)

### 1. Настройте Claude Desktop

**Путь к конфигурации:** `%APPDATA%\Claude\claude_desktop_config.json`

**Полный путь:** `C:\Users\illia\AppData\Roaming\Claude\claude_desktop_config.json`

Откройте файл и добавьте следующую конфигурацию:

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
        "DISABLE_CONSOLE_OUTPUT": "true"
      }
    }
  }
}
```

**ВАЖНО:** Переменная `MCP_MODE: "stdio"` обязательна для Claude Desktop!

### 2. Перезапустите Claude Desktop

После изменения конфигурации:
1. Полностью закройте Claude Desktop
2. Запустите снова
3. MCP сервер n8n должен быть доступен

**Готово!** Теперь Claude Desktop имеет доступ к документации всех n8n нод и может помогать создавать workflows.

---

## Режим 2: Полное управление n8n (опционально)

Если вы хотите, чтобы AI мог **выполнять** workflows (а не только помогать их создавать), выполните следующие шаги:

### 1. Установите n8n

```bash
npm install -g n8n
```

### 2. Запустите n8n

```bash
n8n start
```

n8n будет доступен по адресу: **http://localhost:5678**

### 3. Получите API ключ n8n

1. Откройте n8n в браузере: http://localhost:5678
2. Создайте аккаунт или войдите
3. Перейдите в **Settings → API**
4. Создайте новый API ключ
5. Скопируйте ключ (он понадобится для конфигурации)

### 4. Обновите конфигурацию Claude Desktop

Замените конфигурацию на расширенную версию:

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

**ВАЖНО:** Замените `"YOUR_N8N_API_KEY"` на реальный API ключ из n8n!

### 5. Перезапустите Claude Desktop

Теперь AI-агенты смогут:
- ✅ Создавать и редактировать workflows
- ✅ Запускать автоматизации
- ✅ Управлять существующими workflows
- ✅ Мониторить выполнение

---

## Проверка работы MCP сервера

### Тестирование из командной строки

Запустите MCP сервер вручную для тестирования:

```bash
cd "c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp"
npm start
```

Если сервер работает корректно, вы увидите сообщения об успешном подключении.

### Проверка в Claude Desktop

После настройки в Claude Desktop, вы сможете:
- Создавать n8n workflows через Claude
- Управлять существующими workflows
- Выполнять автоматизированные задачи
- Интегрироваться с 400+ сервисами через n8n

---

## Возможности N8N-MCP

После настройки AI-агенты TARS смогут:

1. **Создавать workflows**
   - Автоматизация поиска товаров
   - Парсинг данных с маркетплейсов
   - Интеграция с TikTok Creative Center

2. **Управлять workflows**
   - Запуск/остановка workflows
   - Изменение параметров
   - Мониторинг выполнения

3. **Интегрироваться с сервисами**
   - Shopify API
   - Google Trends
   - SerpApi
   - Alibaba/AliExpress
   - TikTok
   - Instagram

---

## Troubleshooting

### Проблема: Claude Desktop не видит MCP сервер

**Решение:**
1. Проверьте правильность путей в `claude_desktop_config.json`
2. Убедитесь, что используете двойные обратные слэши: `\\`
3. Убедитесь, что переменная `MCP_MODE: "stdio"` присутствует
4. Перезапустите Claude Desktop полностью

### Проблема: Ошибка "Cannot find module"

**Решение:**
```bash
cd "c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp"
npm install
npm run build
```

### Проблема: Ошибка "Unexpected token" в Claude Desktop

**Решение:**
Эта ошибка означает, что отсутствует переменная `MCP_MODE: "stdio"`. Добавьте её в конфигурацию:
```json
"env": {
  "MCP_MODE": "stdio",
  "LOG_LEVEL": "error",
  "DISABLE_CONSOLE_OUTPUT": "true"
}
```

### Проблема: n8n не запускается (только для Режима 2)

**Решение:**
```bash
# Переустановите n8n глобально
npm install -g n8n

# Запустите с выводом логов
n8n start
```

---

## Полезные команды

### Проверка статуса
```bash
# Версия Node.js
node --version

# Версия npm
npm --version

# Версия n8n
n8n --version

# Список глобальных пакетов
npm list -g --depth=0
```

### Управление n8n (только для Режима 2)
```bash
# Запуск n8n
n8n start

# Остановка n8n
Ctrl + C
```

### Обновление n8n-mcp
```bash
cd "c:\Users\illia\Documents\TARS\mcp-servers\n8n-mcp"
git pull
npm install
npm run build
```

---

## Следующие шаги для проекта TARS

После настройки MCP сервера можно приступить к:

1. **Разработке Агента-Скаута**
   - Создание n8n workflow для парсинга Amazon/AliExpress
   - Интеграция с SerpApi

2. **Настройке Агента-Сорсера**
   - Workflow для поиска поставщиков
   - Калькулятор юнит-экономики

3. **Созданию pipeline**
   - Связка всех 5 агентов
   - Автоматизация от поиска до создания магазина

---

**Дата создания:** 2026-01-19
**Статус:** Готово к использованию ✅
