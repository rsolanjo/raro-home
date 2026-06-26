// Assinatura digital via Assinafy (https://api.assinafy.com.br/v1)
// Confirmado pela CLI oficial (github.com/assinafy/assinafy-cli):
//   - auth: header X-Api-Key
//   - fluxo: documents upload -> signers create -> assignments create (com signer-ids)
//
// Vercel -> Settings -> Environment Variables:
//   ASSINAFY_API_KEY    = sua API Key (Configuracoes/Desenvolvedor/API no painel)
//   ASSINAFY_ACCOUNT_ID = id da conta/workspace
//   (opcional) ASSINAFY_BASE_URL  = https://api.assinafy.com.br/v1  (ou sandbox)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const API_KEY = process.env.ASSINAFY_API_KEY
  const ACCOUNT = process.env.ASSINAFY_ACCOUNT_ID
  const BASE = (process.env.ASSINAFY_BASE_URL || 'https://api.assinafy.com.br/v1').replace(/\/+$/,'')
  if (!API_KEY) { res.status(200).json({ sent:false, reason:'Defina ASSINAFY_API_KEY no Vercel.' }); return }
  if (!ACCOUNT) { res.status(200).json({ sent:false, reason:'Defina ASSINAFY_ACCOUNT_ID no Vercel.' }); return }

  // auth: X-Api-Key (principal) + Authorization Bearer como fallback que algumas contas aceitam
  const auth = { 'X-Api-Key': API_KEY, 'Authorization': `Bearer ${API_KEY}` }
  const pickId = j => j?.data?.id || j?.id || j?.data?.document?.id || j?.document?.id
  const steps = []

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers [{name,email}]' }); return
    }

    // 1) UPLOAD (multipart) — POST /accounts/{id}/documents  campo "file"
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([pdfBuffer], { type:'application/pdf' }), fileName || 'Contrato.pdf')
    const upR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents`, { method:'POST', headers:auth, body:form })
    const upJson = await upR.json().catch(()=>({}))
    steps.push({ step:'upload', status:upR.status })
    const documentId = pickId(upJson)
    if (!upR.ok || !documentId) { res.status(502).json({ sent:false, error:'Falha no upload', http:upR.status, detail:upJson, steps }); return }

    // 2) SIGNERS — POST /accounts/{id}/signers (name, email). Reaproveita por e-mail se já existir.
    const signerIds = []
    for (const s of signers) {
      let sid = null
      const sR = await fetch(`${BASE}/accounts/${ACCOUNT}/signers`, {
        method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
        body: JSON.stringify({ name:s.name, email:s.email })
      })
      const sJson = await sR.json().catch(()=>({}))
      sid = pickId(sJson)
      // se falhou por já existir, tenta achar por e-mail
      if (!sid) {
        const fR = await fetch(`${BASE}/accounts/${ACCOUNT}/signers?email=${encodeURIComponent(s.email)}`, { headers:auth })
        const fJson = await fR.json().catch(()=>({}))
        const arr = fJson?.data || fJson
        if (Array.isArray(arr) && arr.length) sid = arr[0].id
      }
      if (sid) signerIds.push(sid)
      steps.push({ step:'signer', email:s.email, status:sR.status, id:sid||null })
    }
    if (!signerIds.length) { res.status(502).json({ sent:false, error:'Não foi possível criar signatários', detail:steps }); return }

    // 3) ASSIGNMENT — POST /documents/{id}/assignments  com signer_ids (envio para assinatura)
    const asgPayload = {
      method: 'virtual',
      signer_ids: signerIds,
      signers: signerIds,                  // alguns ambientes aceitam "signers"
      message: message || 'Por favor, assine o contrato da RARO Home.'
    }
    const asgR = await fetch(`${BASE}/documents/${documentId}/assignments`, {
      method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
      body: JSON.stringify(asgPayload)
    })
    const asgJson = await asgR.json().catch(()=>({}))
    steps.push({ step:'assignment', status:asgR.status })
    if (!asgR.ok) { res.status(502).json({ sent:false, error:'Documento enviado mas falhou ao solicitar assinatura', http:asgR.status, documentId, detail:asgJson, steps }); return }

    res.status(200).json({
      sent:true, documentId,
      url: asgJson?.data?.url || `https://app.assinafy.com.br/documents/${documentId}`,
      steps
    })
  } catch (e) {
    res.status(500).json({ sent:false, error: e.message, steps })
  }
}
