// POST /api/translate  { text, target } → { text }   (signed-in users only)
import { getUserId, json, readJson } from './_lib/http.js';

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const MAX_CHARS = 5000;

export async function POST(request) {
  if (!(await getUserId(request))) return json({ error: 'Sign in required.' }, 401);

  const key = process.env.GOOGLE_TRANSLATE_KEY;
  if (!key) return json({ error: 'Translation is not configured on the server.' }, 500);

  const body = await readJson(request);
  const text = body?.text;
  const target = body?.target;
  if (typeof text !== 'string' || !text || text.length > MAX_CHARS
    || typeof target !== 'string' || !/^[A-Za-z-]{2,10}$/.test(target)) {
    return json({ error: 'Invalid request.' }, 400);
  }

  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ q: text, target, source: 'en', format: 'text' }),
  });

  if (!res.ok) {
    console.error('Translate error', res.status, await res.text());
    return json({ error: 'Translation failed.' }, 502);
  }

  const data = await res.json();
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (!translated) return json({ error: 'Translation failed.' }, 502);
  return json({ text: translated });
}
