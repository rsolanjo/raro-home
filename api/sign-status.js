// api/sign-status.js — Status de assinatura na Assinafy (botão "Verificar assinaturas")
// GET /api/sign-status?documentId=xxx
//
// Endpoints reais (confirmados no CLI do fornecedor):
//   GET /documents/{id}              → status do documento (âncora confiável do ciclo)
//   GET /documents/{id}/assignments  → assignments + signatários (quem já assinou)
//   GET /documents/{id}/activities   → trilha de eventos (fallback p/ datas)
// Obs.: o endpoint /progress NÃO existe na API; foi removido.

const STATUS_PT = {
  uploaded:'Recebido, processando',
  pending:'Processando',
  metadata_processing:'Processando',
  metadata_ready:'Pronto para envio',
  pending_signature:'Aguardando assinatura',
  certificated:'Assinado e certificado (ICP-Brasil)',
  failed:'Falhou no processamento',
  expired:'Expirado',
  rejected_by_signer:'Recusado por um signatário',
  rejected_by_user:'Cancelado'
}
const pick = j => (j && j.data !== undefined ? j.data : j) || {}
const arr  = x => Array.isArray(x) ? x : (Array.isArray(x?.data) ? x.data : [])

// extrai [{name,email,signed,signed_at}] de qualquer shape de assignment/signatário
function extractSigners(assignments){
  const out = []
  for (const a of arr(assignments)){
    const list = a.signers || a.signatories || a.assignment_signers || []
    for (const s of (Array.isArray(list)?list:[])){
      const st = (s.status || s.signature_status || '').toLowerCase()
      const signed = st.includes('sign') && !st.includes('pending') ? true
                   : (s.signed === true || !!s.signed_at || !!s.signed_at_utc || st==='certificated')
      out.push({
        name: s.full_name || s.name || s.signer?.full_name || '',
        email: s.email || s.signer?.email || '',
        signed,
        signed_at: s.signed_at || s.signed_at_utc || s.updated_at || null
      })
    }
  }
  return out
}

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const API_KEY = process.env.ASSINAFY_API_KEY
  if (!API_KEY) { res.status(200).json({ error:'Defina ASSINAFY_API_KEY no Vercel.' }); return }
  const BASE = (process.env.ASSINAFY_BASE_URL || 'https://api.assinafy.com.br/v1').replace(/\/+$/,'')
  const auth = { 'X-Api-Key': API_KEY }

  const documentId = req.query?.documentId || req.query?.id
  if (!documentId) { res.status(400).json({ error:'Passe ?documentId=xxx' }); return }

  try {
    // 1) documento (status é a âncora confiável)
    const docR = await fetch(`${BASE}/documents/${documentId}`, { headers:auth })
    const doc = pick(await docR.json().catch(()=>({})))
    const status = doc.status || 'desconhecido'

    // 2) assignments (quem já assinou) — best-effort, defensivo a shape
    let signers = []
    try {
      const asR = await fetch(`${BASE}/documents/${documentId}/assignments`, { headers:auth })
      if (asR.ok) signers = extractSigners(await asR.json().catch(()=>({})))
    } catch {}

    // 3) atividades (trilha) — opcional
    let activities = []
    try {
      const acR = await fetch(`${BASE}/documents/${documentId}/activities`, { headers:auth })
      if (acR.ok) activities = arr(await acR.json().catch(()=>({})))
    } catch {}

    const signedCount = signers.filter(s=>s.signed).length
    res.status(200).json({
      documentId,
      status,
      statusLabel: STATUS_PT[status] || status,
      name: doc.name || '',
      done: status === 'certificated',
      signers,
      progress: signers.length ? { signed:signedCount, total:signers.length } : null,
      activities,
      url: `https://app.assinafy.com.br/documents/${documentId}`
    })
  } catch (e) {
    res.status(500).json({ error:e.message })
  }
}
