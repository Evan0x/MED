// POST /api/speech  { text, voice } → { audioContent }   (base64 MP3, signed-in users only)
import { getUserId, json, readJson } from './_lib/http.js';

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const MAX_CHARS = 5000;

export async function POST(request) {
  if (!(await getUserId(request))) return json({ error: 'Sign in required.' }, 401);

  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) return json({ error: 'Text-to-speech is not configured on the server.' }, 500);

  const body = await readJson(request);
  const text = body?.text;
  const voice = body?.voice;
  // Voice names look like "en-US-Standard-A" or "cmn-CN-Wavenet-A"
  if (typeof text !== 'string' || !text || text.length > MAX_CHARS
    || typeof voice !== 'string' || !/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9-]{1,40}$/.test(voice)) {
    return json({ error: 'Invalid request.' }, 400);
  }

  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voice.split('-').slice(0, 2).join('-'), name: voice },
      audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 0.95 },
    }),
  });

  if (!res.ok) {
    console.error('TTS error', res.status, await res.text());
    return json({ error: 'Text-to-speech failed.' }, 502);
  }

  const data = await res.json();
  if (!data.audioContent) return json({ error: 'Text-to-speech failed.' }, 502);
  return json({ audioContent: data.audioContent });
}
