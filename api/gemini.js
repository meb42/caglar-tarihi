// Vercel Serverless Function — Gemini API Proxy
// API key burada YOK — Vercel Environment Variables'dan geliyor

export default async function handler(req, res) {
  // Sadece POST kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — sadece kendi Vercel domain'inden
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { message, systemPrompt, temperature } = req.body;

  // Basit validasyon
  if (!message || !systemPrompt) {
    return res.status(400).json({ error: 'Eksik parametre' });
  }
  if (message.length > 4000 || systemPrompt.length > 6000) {
    return res.status(400).json({ error: 'İçerik çok uzun' });
  }

  // Key Vercel'den geliyor — dosyada görünmez
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'API key tanımlı değil' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: 2800,
          temperature: temperature || 0.82,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      if (geminiRes.status === 429) return res.status(429).json({ error: 'Çok fazla istek', code: 'RATE_LIMIT' });
      return res.status(502).json({ error: 'Gemini hatası', code: 'UPSTREAM_ERROR' });
    }

    const data = await geminiRes.json();
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') return res.status(200).json({ error: 'İçerik filtresi', code: 'SAFETY_FILTER' });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
