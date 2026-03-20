module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Key yok' });

  const { message, systemPrompt, temperature } = req.body || {};
  if (!message || !systemPrompt) return res.status(400).json({ error: 'Eksik veri' });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: {
      maxOutputTokens: 2800,
      temperature: temperature || 0.82,
      responseMimeType: 'application/json',
    },
  });

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await r.text();

    if (!r.ok) {
      console.error('Gemini hata:', r.status, text.slice(0, 300));
      return res.status(r.status).json({ error: 'Gemini hatası', detail: text.slice(0, 200) });
    }

    const data = JSON.parse(text);
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text: out });

  } catch (e) {
    console.error('Fetch hatası:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
