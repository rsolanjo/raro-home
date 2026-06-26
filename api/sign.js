// Envia um documento para assinatura digital via Assinafy (https://api.assinafy.com.br)
// API grátis até 100 documentos/mês, certificada ICP-Brasil/ITI.
//
// Configure no Vercel -> Settings -> Environment Variables:
//   ASSINAFY_API_KEY    = sua API Key (gerada no dashboard da Assinafy)
//   ASSINAFY_ACCOUNT_ID = o ID da sua conta/workspace (mesmo painel)
//
// Fluxo Assinafy:
//   1. upload do PDF              -> POST /v1/accounts/{accountId}/documents   (multipart: file)
//   2. cria signatarios           -> POST /v1/accounts/{accountId}/signers     (name, email)
//   3. cria o envio (assignment)  -> POST /v1/documents/{documentId}/assignments (signers, method=virtual)
//
// Autenticacao via header X-Api-Key. Se o painel mostrar outro header/caminho, ajuste abaixo.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const API_KEY = process.env.ASSINAFY_API_KEY
  const ACCOUNT = process.env.ASSINAFY_ACCOUNT_ID
  if (!API_KEY) { res.status(200).json({ sent:false, reason:'API Key da Assinafy nao configurada (defina ASSINAFY_API_KEY no Vercel).' }); return }
  if (!ACCOUNT) { res.status(200).json({ sent:false, reason:'ID da conta Assinafy nao configurado (defina ASSINAFY_ACCOUNT_ID no Vercel).' }); return }

  const BASE = 'https://api.assinafy.com.br/v1'
  const headers = { 'X-Api-Key': API_KEY }

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers (lista com {name,email})' }); return
    }

    // 1) UPLOAD (multipart/form-data)
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([pdfBuffer], { type:'application/pdf' }), fileName || 'Contrato.pdf')
    form.append('name', fileName || 'Contrato RARO Home.pdf')

    const upR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents`, { method:'POST', headers, body: form })
    const upJson = await upR.json().catch(()=>({}))
    const documentId = upJson?.data?.id || upJson?.id
    if (!documentId) { res.status(502).json({ error:'Falha no upload do documento na Assinafy', detail:upJson }); return }

    // 2) signatarios
    const signerIds = []
    for (const s of signers) {
      const sR = await fetch(`${BASE}/accounts/${ACCOUNT}/signers`, {
        method:'POST', headers:{ ...headers, 'Content-Type':'application/json' },
        body: JSON.stringify({ name:s.name, email:s.email })
      })
      const sJson = await sR.json().catch(()=>({}))
      const sid = sJson?.data?.id || sJson?.id
      if (sid) signerIds.push(sid)
    }

    // 3) envio para assinatura
    const asgR = await fetch(`${BASE}/documents/${documentId}/assignments`, {
      method:'POST', headers:{ ...headers, 'Content-Type':'application/json' },
      body: JSON.stringify({
        method: 'virtual',
        signers: signerIds.length ? signerIds : signers.map(s=>({ name:s.name, email:s.email })),
        message: message || 'Por favor, assine o contrato da RARO Home.'
      })
    })
    const asgJson = await asgR.json().catch(()=>({}))

    res.status(200).json({
      sent:true, documentId,
      url: asgJson?.data?.url || `https://app.assinafy.com.br/documents/${documentId}`,
      detail: asgJson
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
