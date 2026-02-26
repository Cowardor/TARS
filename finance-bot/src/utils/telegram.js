// Telegram Bot API utilities

export async function sendMessage(chatId, text, env, options = {}) {
  const token = env.TELEGRAM_TOKEN?.trim();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    ...options
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error(`Telegram sendMessage error: ${response.status}`);
    return { ok: false };
  }

  return response.json();
}

export async function editMessage(chatId, messageId, text, env, options = {}) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN?.trim()}/editMessageText`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
      ...options
    })
  });

  return response.json();
}

export async function answerCallback(callbackId, env, text = '') {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN?.trim()}/answerCallbackQuery`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text
    })
  });
}

export async function sendDocument(chatId, fileBuffer, filename, caption, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN?.trim()}/sendDocument`;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', new Blob([fileBuffer]), filename);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  return response.json();
}

// Download file from Telegram
export async function downloadFile(fileId, env) {
  const token = env.TELEGRAM_TOKEN?.trim();

  // Step 1: Get file path
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile`;
  const getFileResponse = await fetch(getFileUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId })
  });

  const fileInfo = await getFileResponse.json();
  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    console.error('Failed to get file info:', fileInfo);
    return null;
  }

  // Step 2: Download file
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
  const fileResponse = await fetch(downloadUrl);

  if (!fileResponse.ok) {
    console.error('Failed to download file:', fileResponse.status);
    return null;
  }

  const content = await fileResponse.text();
  return content;
}

// Keyboard builders
export function inlineKeyboard(buttons) {
  return { inline_keyboard: buttons };
}

export function button(text, callbackData) {
  return { text, callback_data: callbackData };
}

export function buttonRow(...buttons) {
  return buttons;
}
