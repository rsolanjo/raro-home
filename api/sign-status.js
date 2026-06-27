// Verifica o status de assinatura de um documento na Assinafy
// GET /api/sign-status?documentId=xxx
// Retorna: { status, signers:[{name,email,signed,signedAt}], url }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const API_KEY = process.env.ASSINAFY_API_KEY
  if (!API_KEY) { res.status(200).json({ error: 'API Key não configurada' }); return }

  const BASE = (process.env.ASSINAFY_BASE_URL || 'https://api.assinafy.com.br/v1').replace(/\/+$/, '')
  const auth = { 'X-Api-Key': API_KEY, 'Authorization': `Bearer ${API_KEY}` }

  const documentId = req.query?.documentId || req.query?.id
  if (!documentId) { res.status(400).json({ error: 'Passe ?documentId=xxx' }); return }

  try {
    // busca detalhes do documento
    const docR = await fetch(`${BASE}/documents/${documentId}`, { headers: auth })
    const docJson = await docR.json().catch(() => ({}))
    const doc = docJson?.data || docJson

    // busca progresso de assinatura
    const progR = await fetch(`${BASE}/documents/${documentId}/progress`, { headers: auth })
    const progJson = await progR.json().catch(() => ({}))
    const prog = progJson?.data || progJson

    // busca atividades
    const actR = await fetch(`${BASE}/documents/${documentId}/activities`, { headers: auth })
    const actJson = await actR.json().catch(() => ({}))

    res.status(200).json({
      documentId,
      status: doc?.status || 'desconhecido',
      name: doc?.name || '',
      progress: prog,
      activities: actJson?.data || actJson,
      url: `https://app.assinafy.com.br/documents/${documentId}`
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
