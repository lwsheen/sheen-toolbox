export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZHIPU_KEY}`
      },
      body: JSON.stringify({
        model: req.body.model || 'glm-4-flash',
        messages: req.body.messages,
        temperature: req.body.temperature ?? 0.5,
        max_tokens: req.body.max_tokens || 4000
      })
    });

    const data = await resp.text();
    res.status(resp.status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
