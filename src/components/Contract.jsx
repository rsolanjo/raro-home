import { useState } from 'react'
import { LOGO_DARK } from '../logos.js'

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

function buildContract(proposal, client) {
  const floors = Array.isArray(proposal.floors) ? proposal.floors
    : (typeof proposal.floors==='string' ? JSON.parse(proposal.floors||'[]') : proposal.floors||[])
  const equipTotal = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)
  const labor = Number(proposal.labor)||0
  const total = equipTotal + labor
  const today = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const name1 = client?.full_name1 || client?.name1 || '—'
  const name2 = client?.full_name2 ? ` e ${client.full_name2}` : ''
  const addr = [client?.neighborhood, client?.city].filter(Boolean).join(', ') || '—'
  const housing = client?.housing_type || '—'

  return `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Contrato RARO Home — ${proposal.code||proposal.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
    @page{size:A4;margin:20mm 18mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;font-size:10.5px;color:#1a1a1a;line-height:1.7;background:#fff}
    h1{font-family:'DM Serif Display',serif;font-size:22px;color:#060B1A;margin-bottom:4px}
    h2{font-family:'DM Serif Display',serif;font-size:14px;color:#0369A1;margin:18px 0 6px;border-bottom:1px solid #C8DEFF;padding-bottom:3px}
    h3{font-size:11px;font-weight:600;color:#1E3A5F;margin:10px 0 4px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #060B1A;padding-bottom:12px;margin-bottom:16px}
    .logo{height:60px}
    .header-right{text-align:right;font-size:9px;color:#6B8CAE;line-height:1.8}
    .badge{background:#060B1A;color:#fff;padding:3px 10px;border-radius:3px;font-size:8px;letter-spacing:2px;text-transform:uppercase;display:inline-block;margin-bottom:8px}
    .section{margin-bottom:14px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .field{background:#F5FAFF;border:0.5px solid #C8DEFF;border-radius:3px;padding:7px 10px}
    .field-label{font-size:8px;letter-spacing:1.5px;color:#0369A1;text-transform:uppercase;margin-bottom:2px;font-weight:500}
    .field-value{font-size:11px;color:#060B1A;font-weight:400}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px}
    thead tr{background:#060B1A;color:#fff}
    thead th{padding:6px 8px;text-align:left;font-weight:500;letter-spacing:0.5px}
    tbody tr:nth-child(even){background:#F5FAFF}
    tbody td{padding:5px 8px;border-bottom:0.5px solid #E8F4FF;color:#1E3A5F}
    .total-row td{font-weight:700;background:#E8F4FF;color:#060B1A}
    .grand-total{background:#060B1A;color:#fff;padding:10px 14px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;margin-top:10px}
    .grand-total .label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#38BDF8}
    .grand-total .value{font-family:'DM Serif Display',serif;font-size:22px;color:#fff}
    .clause{margin-bottom:10px;text-align:justify}
    .clause-num{font-weight:600;color:#0369A1;margin-right:4px}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}
    .sig-line{border-top:0.5px solid #C8DEFF;margin-bottom:4px}
    .sig-label{font-size:8.5px;color:#6B8CAE;text-align:center;letter-spacing:0.5px}
    .footer{margin-top:20px;padding-top:8px;border-top:0.5px solid #C8DEFF;font-size:8px;color:#9CA3AF;text-align:center}
    .highlight{background:#E8F4FF;border-left:3px solid #0EA5E9;padding:8px 12px;border-radius:0 4px 4px 0;margin:10px 0;font-size:10px}
    @media print{body{font-size:10px}}
  </style>
</head><body>
  <div class="header">
    <div>
      <div class="badge">Contrato de Serviços</div>
      <h1>Termo de Prestação de Serviços</h1>
      <div style="font-size:9px;color:#6B8CAE">Automação Residencial e Tecnologia</div>
    </div>
    <div class="header-right">
      <strong>RARO Home Tecnologia</strong><br/>
      CNPJ: 00.000.000/0001-00<br/>
      contato@rarohome.com.br<br/>
      +55 21 98170-9009<br/>
      <strong>Contrato nº ${proposal.code||proposal.id}</strong><br/>
      Rio de Janeiro, ${today}
    </div>
  </div>

  <h2>1. Partes Contratantes</h2>
  <div class="grid-2 section">
    <div>
      <h3>CONTRATADA</h3>
      <div class="field"><div class="field-label">Razão Social</div><div class="field-value">RARO Home Tecnologia</div></div>
      <div class="field" style="margin-top:6px"><div class="field-label">Responsável Técnico</div><div class="field-value">Rogério Silva</div></div>
      <div class="field" style="margin-top:6px"><div class="field-label">Contato</div><div class="field-value">+55 21 98170-9009 · contato@rarohome.com.br</div></div>
    </div>
    <div>
      <h3>CONTRATANTE</h3>
      <div class="field"><div class="field-label">Nome completo</div><div class="field-value">${name1}${name2}</div></div>
      <div class="field" style="margin-top:6px"><div class="field-label">Telefone / WhatsApp</div><div class="field-value">${client?.phone1||'—'}${client?.phone2?' · '+client.phone2:''}</div></div>
      <div class="field" style="margin-top:6px"><div class="field-label">E-mail</div><div class="field-value">${client?.email||'—'}</div></div>
    </div>
  </div>

  <h2>2. Local de Execução</h2>
  <div class="grid-2 section">
    <div class="field"><div class="field-label">Endereço / Bairro</div><div class="field-value">${addr}</div></div>
    <div class="field"><div class="field-label">Tipo de Imóvel</div><div class="field-value">${housing}</div></div>
  </div>

  <h2>3. Escopo dos Serviços e Produtos</h2>
  ${floors.map(fl=>`
    <h3>${fl.name}</h3>
    <table>
      <thead><tr><th>Cômodo</th><th>Produto / Serviço</th><th>Código</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${(fl.rooms||[]).map(r=>(r.items||[]).filter(i=>i.name).map((it,idx)=>`
          <tr>
            ${idx===0?`<td rowspan="${(r.items||[]).filter(i=>i.name).length}" style="font-weight:500;border-right:2px solid #C8DEFF;color:#060B1A;vertical-align:top">${r.icon||''} ${r.name}</td>`:''}
            <td>${it.name}</td>
            <td style="font-family:monospace;font-size:9px;color:#6B8CAE">${it.code||'—'}</td>
            <td style="text-align:center">${it.qty||1}</td>
            <td style="text-align:right">${idx===0&&r.price?fmt(r.price):'—'}</td>
          </tr>`).join('')).join('')}
        <tr class="total-row"><td colspan="4" style="text-align:right">Subtotal ${fl.name}</td><td style="text-align:right">${fmt((fl.rooms||[]).reduce((s,r)=>s+(r.price||0),s=>s,0))}</td></tr>
      </tbody>
    </table>`).join('')}

  <h2>4. Investimento</h2>
  <table>
    <tbody>
      <tr><td>Equipamentos e materiais</td><td style="text-align:right;font-weight:500">${fmt(equipTotal)}</td></tr>
      <tr><td>Mão de obra — instalação e programação</td><td style="text-align:right;font-weight:500">${fmt(labor)}</td></tr>
    </tbody>
  </table>
  <div class="grand-total">
    <div><div class="label">Investimento Total do Projeto</div></div>
    <div class="value">${fmt(total)}</div>
  </div>

  <h2>5. Condições Gerais</h2>
  <div class="clause"><span class="clause-num">5.1</span>Os equipamentos fornecidos possuem garantia de fábrica conforme especificação de cada fabricante. A instalação e configuração têm garantia de <strong>90 dias</strong> contra defeitos de mão de obra.</div>
  <div class="clause"><span class="clause-num">5.2</span>O prazo para execução dos serviços será acordado entre as partes após assinatura do presente contrato, respeitando a disponibilidade de materiais e agenda da CONTRATADA.</div>
  <div class="clause"><span class="clause-num">5.3</span>O pagamento será realizado conforme proposta comercial nº <strong>${proposal.code||proposal.id}</strong>. Em caso de alterações no escopo, novo aditivo será elaborado.</div>
  <div class="clause"><span class="clause-num">5.4</span>A CONTRATANTE se compromete a manter o ambiente de trabalho com acesso e energia disponíveis durante o período de instalação.</div>
  <div class="clause"><span class="clause-num">5.5</span>Quaisquer danos causados por mau uso, sobretensão elétrica ou modificações realizadas por terceiros não autorizados não serão cobertos pela garantia.</div>
  <div class="clause"><span class="clause-num">5.6</span>O suporte pós-instalação será realizado preferencialmente via WhatsApp no número +55 21 98170-9009, de segunda a sexta, das 9h às 18h.</div>

  <div class="highlight">
    <strong>Validade da proposta:</strong> ${proposal.valid_days||30} dias a partir da data de emissão. Após este prazo, os valores poderão ser revisados conforme variação de mercado.
  </div>

  <h2>6. Assinaturas</h2>
  <div style="font-size:10px;color:#3D5A80;margin-bottom:16px">
    Rio de Janeiro, ${today}. As partes declaram ter lido e concordado com todos os termos deste contrato.
  </div>
  <div class="sig-grid">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">${name1}</div>
      <div class="sig-label" style="font-size:7.5px;color:#9CA3AF;margin-top:2px">Contratante — Assinatura e CPF</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Rogério Silva — RARO Home</div>
      <div class="sig-label" style="font-size:7.5px;color:#9CA3AF;margin-top:2px">Contratada — Assinatura</div>
    </div>
    ${name2 ? `<div><div class="sig-line"></div><div class="sig-label">${client?.full_name2||client?.name2||''}</div><div class="sig-label" style="font-size:7.5px;color:#9CA3AF;margin-top:2px">Contratante — Assinatura e CPF</div></div><div></div>` : ''}
  </div>

  <div class="footer">
    RARO Home Tecnologia · contato@rarohome.com.br · +55 21 98170-9009 · www.rarohome.com.br<br/>
    Contrato nº ${proposal.code||proposal.id} · Emitido em ${today}
  </div>
</body></html>`
}

export default function Contract({ proposal, clients, onClose }) {
  const [sending, setSending] = useState(false)
  const client = clients?.find(c => c.id === Number(proposal?.client_id))

  function openContract() {
    const html = buildContract(proposal, client)
    try {
      const blob = new Blob([html], {type:'text/html;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (w) { setTimeout(() => URL.revokeObjectURL(url), 10000); return }
    } catch(e) {}
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(buildContract(proposal, client)); w.document.close() }
  }

  function downloadContract() {
    const html = buildContract(proposal, client)
    const blob = new Blob([html], {type:'text/html;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contrato-${proposal.code||proposal.id}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function sendWhatsApp(phone) {
    downloadContract()
    const name = client?.name1 || proposal.client_name
    const total = (() => {
      const floors = Array.isArray(proposal.floors) ? proposal.floors : (typeof proposal.floors==='string'?JSON.parse(proposal.floors||'[]'):[])
      const eq = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)
      return eq + (Number(proposal.labor)||0)
    })()
    const msg = encodeURIComponent(`Olá ${name}! 🏠\n\nSeguem os documentos do seu projeto RARO Home:\n📋 *Proposta:* ${proposal.code}\n💰 *Total:* R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}\n\nO contrato foi enviado em anexo nesta conversa para sua assinatura.\n\nQualquer dúvida estou à disposição!\n— Rogério | RARO Home\n📱 (21) 98170-9009`)
    setTimeout(() => window.open(`https://wa.me/${phone.replace(/\D/g,'').replace(/^(?!55)/,'55')}?text=${msg}`, '_blank'), 800)
  }

  if (!proposal) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:480}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-file-contract" style={{marginRight:6}} aria-hidden/>Contrato de Execução</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{padding:'4px 0 16px'}}>
          <div style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',marginBottom:14,fontSize:12}}>
            <div style={{fontWeight:600,color:'var(--text1)',marginBottom:6}}>{proposal.client_name} — {proposal.code}</div>
            <div style={{color:'var(--text3)'}}>Contrato gerado automaticamente com os dados da proposta aprovada.</div>
            {!client?.full_name1 && <div style={{marginTop:8,padding:'6px 10px',background:'var(--amber-lt)',borderRadius:4,color:'var(--amber)',fontSize:11}}>
              <i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden/>
              Nome completo não cadastrado — vá em Clientes e preencha "Nome completo" para o contrato ficar correto.
            </div>}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn primary" onClick={openContract} style={{justifyContent:'center'}}>
              <i className="ti ti-eye" aria-hidden/>Visualizar contrato
            </button>
            <button className="btn" onClick={downloadContract} style={{justifyContent:'center'}}>
              <i className="ti ti-download" aria-hidden/>Baixar contrato (HTML/PDF)
            </button>
            {client?.phone1 && <button className="btn" style={{background:'#16A34A',color:'#fff',borderColor:'#16A34A',justifyContent:'center'}}
              onClick={()=>sendWhatsApp(client.phone1)}>
              <i className="ti ti-brand-whatsapp" aria-hidden/>Baixar + Enviar WA ({client.name1})
            </button>}
            {client?.phone2 && <button className="btn" style={{background:'#16A34A',color:'#fff',borderColor:'#16A34A',justifyContent:'center'}}
              onClick={()=>sendWhatsApp(client.phone2)}>
              <i className="ti ti-brand-whatsapp" aria-hidden/>Baixar + Enviar WA ({client.name2})
            </button>}
          </div>
        </div>
      </div>
    </div>
  )
}
