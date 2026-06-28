// api/sign.js — Assinatura digital via Assinafy
// Fluxo OFICIAL confirmado no CLI do fornecedor (@assinafy/cli, docs/ + dist):
//   1) UPLOAD:     POST /accounts/{account}/documents   (multipart "file")  → documentId + status inicial
//   2) PROCESSAR:  GET  /documents/{id}  (polling)       → aguarda status "metadata_ready"
//   3) SIGNERS:    POST /accounts/{account}/signers      → cria/reusa signatário por e-mail → signerId
//   4) ASSIGNMENT: POST /documents/{id}/assignments      → DISPARA o e-mail de assinatura → assignmentId
//
// Campos exatos da API (não inventar):
//   signer  = { full_name, email, whatsapp_phone_number, cpf }   (cpf só dígitos)
//   assignment = { method:"virtual", signers:[{id, verification_method:"Email", notification_methods:["Email"]}], message }
//   READY  = metadata_ready | pending_signature | certificated
//   FAILED = failed | rejected_by_signer | rejected_by_user | expired
//   Auth   = header X-Api-Key

const READY  = new Set(['metadata_ready','pending_signature','certificated'])
const FAILED = new Set(['failed','rejected_by_signer','rejected_by_user','expired'])
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// telefone BR -> E.164 (+55...). Retorna '' se não parecer válido.
function toE164(raw){
  if(!raw) return ''
  let d = String(raw).replace(/\D/g,'')
  if(d.length < 10) return ''
  if(!d.startsWith('55')) d = '55' + d
  return '+' + d
}
const pick = j => (j && j.data !== undefined ? j.data : j) || {}
const arr  = j => Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : [])

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')   { res.status(405).json({ error:'Method not allowed' }); return }

  const API_KEY = process.env.ASSINAFY_API_KEY
  const ACCOUNT = process.env.ASSINAFY_ACCOUNT_ID
  const BASE = (process.env.ASSINAFY_BASE_URL || 'https://api.assinafy.com.br/v1').replace(/\/+$/,'')
  if (!API_KEY) { res.status(200).json({ sent:false, reason:'Defina ASSINAFY_API_KEY no Vercel.' }); return }
  if (!ACCOUNT) { res.status(200).json({ sent:false, reason:'Defina ASSINAFY_ACCOUNT_ID no Vercel.' }); return }

  const auth = { 'X-Api-Key': API_KEY }
  const jsonAuth = { ...auth, 'Content-Type':'application/json' }
  const steps = []

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { fileName, pdfBase64, signers, message } = body || {}
    if (!pdfBase64 || !Array.isArray(signers) || !signers.length) {
      res.status(400).json({ error:'Faltam pdfBase64 e/ou signers [{name,email,phone?,cpf?}]' }); return
    }

    // ─────────── 1) UPLOAD ───────────
    const form = new FormData()
    form.append('file', new Blob([Buffer.from(pdfBase64,'base64')], { type:'application/pdf' }), fileName || 'Contrato.pdf')
    const upR = await fetch(`${BASE}/accounts/${ACCOUNT}/documents`, { method:'POST', headers:auth, body:form })
    const upDoc = pick(await upR.json().catch(()=>({})))
    const documentId = upDoc.id
    let docStatus = upDoc.status
    steps.push({ step:'upload', status:upR.status, id:documentId||null, docStatus:docStatus||null })
    if (!documentId) { res.status(502).json({ sent:false, error:'Falha no upload do PDF', detail:upDoc, steps }); return }

    // ─────────── 2) AGUARDAR PROCESSAMENTO (metadata_ready) ───────────
    // O documento NÃO fica pronto na hora; sem isso o assignment falha (era a causa do envio não sair).
    for (let i=0; i<7 && !READY.has(docStatus) && !FAILED.has(docStatus); i++){
      await sleep(1200)
      const sR = await fetch(`${BASE}/documents/${documentId}`, { headers:auth })
      docStatus = pick(await sR.json().catch(()=>({}))).status || docStatus
    }
    steps.push({ step:'process', docStatus:docStatus||null })
    if (FAILED.has(docStatus)) {
      res.status(502).json({ sent:false, documentId, error:`Documento falhou no processamento (${docStatus})`, steps }); return
    }
    const processedOk = READY.has(docStatus)

    // ─────────── 3) CRIAR / REUSAR SIGNATÁRIOS ───────────
    // A API NÃO é idempotente: e-mail repetido derruba o POST. Então buscamos antes (como o CLI faz)
    // e, se o POST falhar por duplicado, buscamos de novo e reusamos.
    // (Esta era a causa do "funcionou uma vez e parou": cliente repetido + Rogério de e-mail fixo já existiam.)
    async function findSignerId(email){
      try{
        const r = await fetch(`${BASE}/accounts/${ACCOUNT}/signers?search=${encodeURIComponent(email)}&per_page=100`, { headers:auth })
        if(!r.ok) return null
        const lower = (email||'').toLowerCase()
        const hit = arr(await r.json().catch(()=>({}))).find(x => ((x && x.email)||'').toLowerCase() === lower)
        return (hit && hit.id) || null
      }catch{ return null }
    }
    const signerIds = []
    for (const s of signers){
      const email = (s.email||'').trim()
      if(!email) continue
      let id = await findSignerId(email)               // 1) reusa existente
      let how = id ? 'reused' : null
      if(!id){
        const payload = { full_name: s.name, email }   // 2) cria
        const phone = toE164(s.phone); if (phone) payload.whatsapp_phone_number = phone
        if (s.cpf) { const c = String(s.cpf).replace(/\D/g,''); if(c) payload.cpf = c }
        const r = await fetch(`${BASE}/accounts/${ACCOUNT}/signers`, { method:'POST', headers:jsonAuth, body:JSON.stringify(payload) })
        id = pick(await r.json().catch(()=>({}))).id
        how = id ? 'created' : null
        if(!id){ id = await findSignerId(email); how = id ? 'recovered' : null }  // 3) POST falhou: rebusca
      }
      steps.push({ step:'signer', email, id:id||null, how })
      if (id) signerIds.push(id)
    }
    if (!signerIds.length){
      res.status(502).json({ sent:false, documentId, error:'Não foi possível criar nem localizar os signatários', steps }); return
    }

    // ─────────── 4) ASSIGNMENT (dispara os e-mails) ───────────
    const assignmentBody = {
      method: 'virtual',
      signers: signerIds.map(id => ({ id, verification_method:'Email', notification_methods:['Email'] })),
      message: message || 'Segue o contrato RARO Home para assinatura digital.'
    }
    const aR = await fetch(`${BASE}/documents/${documentId}/assignments`, { method:'POST', headers:jsonAuth, body:JSON.stringify(assignmentBody) })
    const aBody = await aR.json().catch(()=>({}))
    const assignmentId = pick(aBody).id
    steps.push({ step:'assignment', status:aR.status, id:assignmentId||null })

    if (aR.ok && assignmentId){
      res.status(200).json({
        sent:true, documentId, assignmentId, signerIds,
        url:`https://app.assinafy.com.br/documents/${documentId}`,
        steps
      }); return
    }

    // Upload+signers OK, mas assignment recusou: devolve diagnóstico real (sem chute).
    res.status(502).json({
      sent:false, documentId, signerIds,
      error: processedOk
        ? 'Upload e signatários OK, mas a Assinafy recusou o assignment (envio).'
        : `O documento ainda estava processando (${docStatus}) quando tentamos enviar. Use Verificar em alguns segundos ou reenvie.`,
      detail: aBody, steps,
      dica:'O documento está na Assinafy. Verifique o status pelo botão Verificar ou conclua pelo painel.'
    })
  } catch (e) {
    res.status(500).json({ sent:false, error:e.message, steps })
  }
}
