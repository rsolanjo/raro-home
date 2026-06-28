// Assinatura digital via Assinafy — corrigido: signatários inline no assignment
// O upload funciona, mas o endpoint /signers retorna 400.
// Solução: pular criação separada, passar signatários direto no assignment.
// Isso é o que o comando "assinafy send" faz internamente.

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

  const auth = { 'X-Api-Key': API_KEY }
  const steps = []

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers [{name,email}]' }); return
    }

    // 1) UPLOAD do PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([pdfBuffer], { type:'application/pdf' }), fileName || 'Contrato.pdf')
    const upR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents`, { method:'POST', headers:auth, body:form })
    const upJson = await upR.json().catch(()=>({}))
    const documentId = upJson?.data?.id || upJson?.id
    steps.push({ step:'upload', status:upR.status, id:documentId||null })
    if (!upR.ok || !documentId) { res.status(502).json({ sent:false, error:'Falha no upload', detail:upJson, steps }); return }

    // 2) ASSIGNMENT com signatários INLINE (sem criar separado)
    // Tenta várias formas que a API pode aceitar:
    const signersList = signers.map(s => ({ name:s.name, email:s.email, notify:'email' }))

    // Tentativa A: signatários inline no assignment
    let asgR = await fetch(`${BASE}/documents/${documentId}/assignments`, {
      method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
      body: JSON.stringify({ signers: signersList, message: message || 'Assine o contrato RARO Home.' })
    })
    let asgJson = await asgR.json().catch(()=>({}))
    steps.push({ step:'assignment-inline', status:asgR.status })

    // Se inline falhou, tentativa B: com method=virtual
    if (!asgR.ok) {
      asgR = await fetch(`${BASE}/documents/${documentId}/assignments`, {
        method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
        body: JSON.stringify({ method:'virtual', signers: signersList, message: message || 'Assine o contrato RARO Home.' })
      })
      asgJson = await asgR.json().catch(()=>({}))
      steps.push({ step:'assignment-virtual', status:asgR.status })
    }

    // Se ambos falharam, tentativa C: com account_id no body
    if (!asgR.ok) {
      asgR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents/${documentId}/assignments`, {
        method:'POST', headers:{ ...auth, 'Content-Type':'application/json' },
        body: JSON.stringify({ signers: signersList, message: message || 'Assine o contrato RARO Home.' })
      })
      asgJson = await asgR.json().catch(()=>({}))
      steps.push({ step:'assignment-account', status:asgR.status })
    }

    if (!asgR.ok) {
      res.status(502).json({ sent:false, error:'Documento enviado mas falhou ao solicitar assinatura', documentId, detail:asgJson, steps })
      return
    }

    res.status(200).json({
      sent:true, documentId,
      url: asgJson?.data?.url || `https://app.assinafy.com.br/documents/${documentId}`,
      steps
    })
  } catch (e) {
    res.status(500).json({ sent:false, error: e.message, steps })
  }
}
