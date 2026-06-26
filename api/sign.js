// Envia um documento para assinatura digital via Assinafy (https://www.assinafy.com.br)
// API grátis até 100 documentos/mês, certificada ICP-Brasil/ITI.
// Configure no Vercel: Environment Variables →
//   ASSINAFY_EMAIL = seu e-mail de login
//   ASSINAFY_PASSWORD = sua senha
//   (ou ASSINAFY_API_KEY se você já tiver uma chave de API)
//
// Fluxo: login → cria documento (upload do PDF em base64) → cria solicitação de assinatura
// para os signatários informados. Retorna o link/ID para acompanhar.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const email = process.env.ASSINAFY_EMAIL
  const password = process.env.ASSINAFY_PASSWORD
  const apiKey = process.env.ASSINAFY_API_KEY
  if (!email && !apiKey) {
    res.status(200).json({ sent:false, reason:'Credenciais Assinafy não configuradas no Vercel (ASSINAFY_EMAIL/ASSINAFY_PASSWORD ou ASSINAFY_API_KEY)' })
    return
  }

  const BASE = 'https://api.assinafy.com.br'
  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers (lista com {name,email})' }); return
    }

    // 1) Autenticação: ou usa API Key direta, ou faz login p/ obter token
    let token = apiKey
    if (!token) {
      const loginR = await fetch(`${BASE}/login`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      })
      const loginJson = await loginR.json().catch(()=>({}))
      token = loginJson?.data?.token || loginJson?.token || loginJson?.access_token
      if (!token) { res.status(502).json({ error:'Falha no login Assinafy', detail:loginJson }); return }
    }
    const auth = { 'Authorization':`Bearer ${token}` }

    // 2) Cria o documento (upload do PDF)
    const docR = await fetch(`${BASE}/v1/documents`, {
      method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
      body: JSON.stringify({ name: fileName||'Contrato RARO Home.pdf', file: pdfBase64 })
    })
    const docJson = await docR.json().catch(()=>({}))
    const documentId = docJson?.data?.id || docJson?.id
    if (!documentId) { res.status(502).json({ error:'Falha ao criar documento na Assinafy', detail:docJson }); return }

    // 3) Cria a solicitação de assinatura para os signatários
    const signR = await fetch(`${BASE}/v1/documents/${documentId}/signatures`, {
      method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
      body: JSON.stringify({
        signers: signers.map(s=>({ name:s.name, email:s.email })),
        message: message || 'Por favor, assine o contrato da RARO Home.'
      })
    })
    const signJson = await signR.json().catch(()=>({}))

    res.status(200).json({
      sent:true, documentId,
      url: signJson?.data?.url || docJson?.data?.url || `${BASE}/documents/${documentId}`,
      detail: signJson
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
