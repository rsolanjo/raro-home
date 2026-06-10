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

    if (body && body.listModels) {
      const lr = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      })
      res.status(lr.status).send(await lr.text()); return
    }

    if (!body || !body.messages) { res.status(400).json({ error: 'Body inválido' }); return }
    if (!body.model) body.model = 'claude-sonnet-4-5-20250929'

    // Cliente pede streaming explícito? (clientStream:true). Senão, modo JSON tradicional.
    const wantStream = body.clientStream === true
    delete body.clientStream
    body.stream = true  // sempre pede stream à Anthropic (mais rápido p/ first-byte)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify(body)
    })
    if (!r.ok) { res.status(r.status).send(await r.text()); return }

    if (wantStream) {
      // Passthrough do SSE cru → conexão nunca fica ociosa
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      const reader = r.body.getReader()
      while (true) { const {done,value}=await reader.read(); if(done) break; res.write(Buffer.from(value)) }
      res.end(); return
    }

    // Modo JSON: lê o stream no servidor, monta o texto e devolve JSON (compatível com chamadas antigas)
    const reader = r.body.getReader()
    const dec = new TextDecoder()
    let full='', buf=''
    while (true) {
      const {done,value}=await reader.read(); if(done) break
      buf += dec.decode(value,{stream:true})
      const lines=buf.split('\n'); buf=lines.pop()||''
      for(const line of lines){
        if(!line.startsWith('data:')) continue
        const d=line.slice(5).trim(); if(!d||d==='[DONE]') continue
        try{ const e=JSON.parse(d); if(e.type==='content_block_delta'&&e.delta?.text) full+=e.delta.text }catch(_){}
      }
    }
    res.status(200).json({ content:[{type:'text',text:full}] })
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Proxy error: ' + (err.message||String(err)) })
    else res.end()
  }
}
