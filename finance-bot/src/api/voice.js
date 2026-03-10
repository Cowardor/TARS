// Voice API — Transcription (Groq Whisper) + Parsing (Groq llama)
// Used as fallback when Web Speech API is unavailable (e.g. Telegram iOS)

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
