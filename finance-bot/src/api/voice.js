// Voice API — Transcription (Groq Whisper) + Parsing (Groq llama)
// Used as fallback when Web Speech API is unavailable (e.g. Telegram iOS)

import { resolveUser } from './auth.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
function error(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
}

export async function handleVoice(request, env, pathname) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': '*' } });
  }

  // Require valid session — prevents public use of Groq API key
  const user = await resolveUser(request, env);
  if (!user) return error('Unauthorized', 401);

  if (!env.GROQ_API_KEY) return error('GROQ_API_KEY not configured', 500);

  // POST /api/voice/transcribe — audio blob → text via Groq Whisper
  if (pathname === '/api/voice/transcribe') {
    return transcribe(request, env);
  }

  // POST /api/voice/parse — text → {amount, type, category_id, description}
  if (pathname === '/api/voice/parse') {
    return parse(request, env);
  }

  return error('Not found', 404);
}

// ── Transcribe ─────────────────────────────────────────────────────────────

async function transcribe(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return error('Expected multipart/form-data with audio field');
  }

  const audioFile = formData.get('audio');
  const lang = formData.get('lang') || 'ru';

  if (!audioFile) return error('Missing audio field');

  // Forward to Groq Whisper
  const groqForm = new FormData();
  groqForm.append('file', audioFile, 'audio.webm');
  groqForm.append('model', 'whisper-large-v3-turbo');
  groqForm.append('language', lang);
  groqForm.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: groqForm,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq Whisper error:', err);
    return error('Transcription failed', 500);
  }

  const data = await res.json();
  return json({ text: data.text || '' });
}

// ── Parse ──────────────────────────────────────────────────────────────────

async function parse(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON'); }

  const { text, language = 'en', categories = [] } = body;
  if (!text) return error('Missing text');

  const catList = categories.slice(0, 40).map(c => `${c.id}:${c.name}(${c.type})`).join(', ');

  const systemPrompt = `You are a financial transaction parser. Extract transaction data from a voice phrase and return ONLY valid JSON.
Available categories: ${catList || 'none'}

Category keyword hints — use these to match the phrase to the correct category regardless of language:
- Groceries/Продукты/Żywność/Продукти: supermarket, grocery, food store, market, lidl, biedronka, kaufland, aldi, spar, tesco, carrefour, vegetables, fruits, bread, milk, eggs, продукты, супермаркет, магазин еды, продукти
- Dining/Кафе/Restauracja/Кав'ярня: restaurant, cafe, coffee, lunch, dinner, breakfast, pizza, sushi, burger, mcdonalds, kfc, kebab, bar, pub, delivery, takeout, ресторан, кафе, обед, ужин, завтрак, пицца
- Transport/Транспорт/Transport: taxi, uber, bolt, cabify, bus, tram, metro, subway, train, fuel, petrol, gas station, parking, такси, метро, автобус, трамвай, бензин, заправка, парковка
- Housing/Жильё/Mieszkanie/Житло: rent, utilities, electricity, heating, water bill, internet, phone bill, mortgage, аренда, коммуналка, электричество, вода, интернет, телефон, квартплата
- Subscriptions/Подписки/Subskrypcje: netflix, spotify, youtube, apple, google, amazon prime, chatgpt, canva, hbo, disney, подписка, сервис
- Shopping/Покупки/Zakupy/Покупки: clothes, clothing, dress, shirt, pants, jacket, shoes, sneakers, electronics, laptop, tablet, headphones, amazon, zara, h&m, aliexpress, одежда, обувь, электроника, наушники, ноутбук
- Beauty/Красота/Uroda/Краса: haircut, salon, barber, cosmetics, makeup, perfume, manicure, pedicure, парикмахерская, косметика, стрижка, маникюр, духи, beauty
- Health/Здоровье/Zdrowie/Здоров'я: pharmacy, medicine, pills, vitamins, doctor, dentist, hospital, clinic, аптека, лекарство, врач, стоматолог, больница, таблетки
- Sport/Спорт/Sport: gym, fitness, yoga, swimming pool, trainer, running, cycling, спортзал, тренажерный зал, фитнес, йога, бассейн, тренер
- Travel/Путешествия/Podróże/Подорожі: hotel, hostel, flight, airbnb, booking, vacation, trip, airport, visa, путешествие, отель, перелет, отпуск, билет, виза
- Home/Дом/Dom/Дім: furniture, ikea, repair, renovation, tools, hardware store, мебель, ремонт, инструменты, хозтовары, стройматериалы
- Salary/Зарплата/Wypłata/Зарплата: salary, wage, paycheck, work income, freelance payment, зарплата, оклад, фриланс, выплата
- Gift/Подарок/Prezent/Подарунок: gift, present, bonus, prize, подарок, бонус, премия, приз

Rules:
- amount: positive number (no currency symbols)
- type: "expense" or "income"
- category_id: matching category id from the list, or null
- description: short cleaned phrase (max 40 chars), or null
- If no amount found, return {"error":"no_amount"}
Return ONLY the JSON object, no explanation.`;

  const userPrompt = `Language: ${language}\nPhrase: "${text}"`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq llama error:', err);
    return error('Parsing failed', 500);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '{}';

  try {
    const parsed = JSON.parse(raw);
    return json(parsed);
  } catch {
    // Try to extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return json(JSON.parse(match[0])); } catch {}
    }
    return error('Could not parse AI response', 500);
  }
}
