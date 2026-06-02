module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel' }); return }

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    if (!body || !body.messages) { res.status(400).json({ error: 'Body inválido (sem messages)' }); return }

    // Força um modelo válido e atual, ignorando o que vier do cliente
    body.model = 'claude-3-5-sonnet-20241022'

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body)
    })

    const text = await r.text()
    if (!text) { res.status(502).json({ error: 'Anthropic retornou resposta vazia (status ' + r.status + ')' }); return }

    let data
    try { data = JSON.parse(text) }
    catch(e) { res.status(502).json({ error: 'Resposta não-JSON da Anthropic: ' + text.slice(0,300) }); return }

    res.status(r.status).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Proxy error: ' + (err.message || String(err)) })
  }
}
