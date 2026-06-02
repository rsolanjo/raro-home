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

    // Modo diagnóstico: listar modelos
    if (body && body.listModels) {
      const lr = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      })
      const ltext = await lr.text()
      res.status(lr.status).send(ltext)
      return
    }

    if (!body || !body.messages) { res.status(400).json({ error: 'Body inválido' }); return }

    // Usa modelo enviado pelo cliente, ou um padrão seguro
    if (!body.model) body.model = 'claude-sonnet-4-5-20250929'

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify(body)
    })
    const text = await r.text()
    if (!text) { res.status(502).json({ error:'Resposta vazia (status '+r.status+')' }); return }
    res.status(r.status).send(text)
  } catch (err) {
    res.status(500).json({ error: 'Proxy error: ' + (err.message||String(err)) })
  }
}
