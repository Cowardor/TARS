// УПРОЩЁННАЯ ВЕРСИЯ ДЛЯ ДЕБАГА

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('Finance Bot is running!');
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();

        // Логируем что пришло
        console.log('Received:', JSON.stringify(data));
        console.log('ENV keys:', Object.keys(env));
        console.log('TELEGRAM_TOKEN exists:', !!env.TELEGRAM_TOKEN);

        if (data.message) {
          const chatId = data.message.chat.id;
          const text = data.message.text || '';

          // Простой ответ без Google Sheets
          await sendMessage(chatId, `Получил: ${text}`, env);
        }
      } catch (error) {
        console.error('Error:', error.message, error.stack);
      }

      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  }
};

async function sendMessage(chatId, text, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;

  console.log('Sending to:', url);
  console.log('Chat ID:', chatId);
  console.log('Text:', text);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });

  const result = await response.json();
  console.log('Telegram response:', JSON.stringify(result));

  return result;
}
