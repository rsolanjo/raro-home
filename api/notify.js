// Envia e-mail de notificação (ex: diário de obra submetido).
// Usa o Resend (https://resend.com) — grátis até 100 e-mails/dia.
// Configure no Vercel: Environment Variables → RESEND_API_KEY = re_xxx
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    // Sem chave configurada: não quebra o app, só avisa que não enviou
    res.status(200).json({ sent:false, reason:'RESEND_API_KEY não configurada no Vercel' })
    return
  }

  try {
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { to, subject, text } = body || {}
    if (!to || !subject) { res.status(400).json({ error:'Faltam to/subject' }); return }

    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({
        from: 'RARO Home <onboarding@resend.dev>',  // troque por seu domínio verificado depois
        to: [to], subject, text: text||''
      })
    })
    const data = await r.text()
    if (!r.ok) { res.status(r.status).json({ sent:false, error:data.slice(0,200) }); return }
    res.status(200).json({ sent:true })
  } catch (err) {
    res.status(200).json({ sent:false, error: err.message })  // nunca quebra o fluxo do mestre
  }
}
