// Assinatura digital via Assinafy
// Diagnóstico: upload funciona (200), mas assignment falha (400)
// porque o documento precisa de signatários ANTES de ser enviado.
//
// Fluxo correto da Assinafy (3 etapas):
//   1) Upload: POST /documents          → documentId
//   2) Signatários: POST /documents/{id}/signatories  → adiciona quem vai assinar
//   3) Enviar: POST /documents/{id}/send  → dispara os e-mails
//
// Tenta múltiplas variações de endpoints para descobrir o correto.

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
  const jsonAuth = { ...auth, 'Content-Type': 'application/json' }
  const steps = []

  // helper: tenta POST e retorna {ok, status, body}
  async function tryPost(url, body) {
    const r = await fetch(url, { method:'POST', headers: jsonAuth, body: JSON.stringify(body) })
    const j = await r.json().catch(()=>({}))
    return { ok:r.ok, status:r.status, body:j }
  }
  async function tryPut(url, body) {
    const r = await fetch(url, { method:'PUT', headers: jsonAuth, body: JSON.stringify(body) })
    const j = await r.json().catch(()=>({}))
    return { ok:r.ok, status:r.status, body:j }
  }

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers [{name,email}]' }); return
    }

    // ══════ ETAPA 1: UPLOAD ══════
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([pdfBuffer], { type:'application/pdf' }), fileName || 'Contrato.pdf')
    const upR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents`, { method:'POST', headers:auth, body:form })
    const upJson = await upR.json().catch(()=>({}))
    const documentId = upJson?.data?.id || upJson?.id
    steps.push({ step:'upload', status:upR.status, id:documentId||null })
    if (!documentId) { res.status(502).json({ sent:false, error:'Falha no upload', detail:upJson, steps }); return }

    // ══════ ETAPA 2: ADICIONAR SIGNATÁRIOS AO DOCUMENTO ══════
    // Tenta várias rotas possíveis da API
    let signersAdded = false
    const signerPayloads = signers.map(s => ({ name:s.name, email:s.email, action:'sign' }))

    // Tentativa A: POST /documents/{id}/signatories (uma por signatário)
    for (const sp of signerPayloads) {
      const r = await tryPost(`${BASE}/documents/${documentId}/signatories`, sp)
      steps.push({ step:'signatory-single', email:sp.email, status:r.status })
      if (r.ok) signersAdded = true
    }

    // Se A falhou, tentativa B: POST /documents/{id}/signatories com array
    if (!signersAdded) {
      const r = await tryPost(`${BASE}/documents/${documentId}/signatories`, { signatories: signerPayloads })
      steps.push({ step:'signatories-array', status:r.status })
      if (r.ok) signersAdded = true
    }

    // Se B falhou, tentativa C: POST /documents/{id}/signers
    if (!signersAdded) {
      for (const sp of signerPayloads) {
        const r = await tryPost(`${BASE}/documents/${documentId}/signers`, sp)
        steps.push({ step:'signer-doc', email:sp.email, status:r.status })
        if (r.ok) signersAdded = true
      }
    }

    // Se C falhou, tentativa D: POST /accounts/{id}/documents/{id}/signatories
    if (!signersAdded) {
      for (const sp of signerPayloads) {
        const r = await tryPost(`${BASE}/accounts/${ACCOUNT}/documents/${documentId}/signatories`, sp)
        steps.push({ step:'signatory-acct', email:sp.email, status:r.status })
        if (r.ok) signersAdded = true
      }
    }

    // ══════ ETAPA 3: ENVIAR PARA ASSINATURA ══════
    let sent = false
    let sendResult = null

    // Tentativa A: POST /documents/{id}/send
    const sendA = await tryPost(`${BASE}/documents/${documentId}/send`, { message: message || 'Assine o contrato RARO Home.' })
    steps.push({ step:'send', status:sendA.status })
    if (sendA.ok) { sent = true; sendResult = sendA.body }

    // Se A falhou, tentativa B: PUT /documents/{id} com status "sent"
    if (!sent) {
      const sendB = await tryPut(`${BASE}/documents/${documentId}`, { status:'sent', message: message || 'Assine o contrato RARO Home.' })
      steps.push({ step:'put-status', status:sendB.status })
      if (sendB.ok) { sent = true; sendResult = sendB.body }
    }

    // Se B falhou, tentativa C: POST /documents/{id}/assignments (original)
    if (!sent) {
      const sendC = await tryPost(`${BASE}/documents/${documentId}/assignments`, { 
        signers: signerPayloads,
        message: message || 'Assine o contrato RARO Home.'
      })
      steps.push({ step:'assignment-retry', status:sendC.status })
      if (sendC.ok) { sent = true; sendResult = sendC.body }
    }

    if (sent) {
      res.status(200).json({
        sent: true, documentId, signersAdded,
        url: sendResult?.data?.url || `https://app.assinafy.com.br/documents/${documentId}`,
        steps
      })
    } else {
      res.status(502).json({
        sent: false, documentId, signersAdded,
        error: signersAdded ? 'Signatários adicionados mas falhou ao enviar' : 'Não foi possível adicionar signatários nem enviar',
        steps,
        dica: 'O documento foi enviado para a Assinafy (veja no painel). Pode ser necessário clicar EDITAR no painel da Assinafy, posicionar os campos de assinatura e enviar manualmente. Enquanto isso, estamos investigando o endpoint correto.'
      })
    }
  } catch (e) {
    res.status(500).json({ sent:false, error: e.message, steps })
  }
}
