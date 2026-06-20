import { useState } from 'react'
import { LOGO_COVER } from '../logos.js'

// Logo do contrato — fundo transparente blenda no #fff do corpo do contrato
const LOGO_CONTRACT = LOGO_COVER

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export function buildContract(proposal, client) {
  const floors = Array.isArray(proposal.floors) ? proposal.floors
    : (typeof proposal.floors==='string' ? JSON.parse(proposal.floors||'[]') : proposal.floors||[])
  const equipTotal = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
  const labor = Number(proposal.labor)||0
  const total = equipTotal + labor
  const today = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const name1 = client?.full_name1 || client?.name1 || '—'
  const name2 = client?.full_name2 || client?.name2 || ''
  const bothNames = name2 ? `${name1} e ${name2}` : name1
  const addr = [client?.neighborhood, client?.city].filter(Boolean).join(', ') || '—'
  const housing = client?.housing_type || 'residencial'
  const scopeRooms = floors.flatMap(fl=>(fl.rooms||[]).map(r=>{
    // agrupa itens por nome com quantidade
    const counts={}
    ;(r.items||[]).filter(i=>i.name).forEach(it=>{
      const nm=it.name
      const q=parseInt(it.qty)||1
      counts[nm]=(counts[nm]||0)+q
    })
    const itemList=Object.entries(counts).map(([nm,q])=>q>1?`${q}× ${nm}`:nm)
    return { icon:r.icon||'◈', name:r.name, total:Object.values(counts).reduce((s,q)=>s+q,0), itemList }
  })).filter(r=>r.itemList.length)

  function numPorExtenso(valor) {
    const n = Math.round(valor * 100)
    const reais = Math.floor(n / 100)
    const centavos = n % 100
    const u = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove']
    const d = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
    const e = ['','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
    const c = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']
    function conv(n) {
      if(n===0) return ''
      if(n===100) return 'cem'
      if(n<10) return u[n]
      if(n>=11&&n<=19) return e[n-10]
      if(n<20) return d[Math.floor(n/10)]+(n%10?' e '+u[n%10]:'')
      if(n<100) return d[Math.floor(n/10)]+(n%10?' e '+u[n%10]:'')
      return c[Math.floor(n/100)]+(n%100?' e '+conv(n%100):'')
    }
    function grp(n, singular, plural) {
      if(n===0) return ''
      return conv(n)+' '+(n===1?singular:plural)
    }
    const mil = Math.floor(reais/1000)
    const resto = reais%1000
    let txt = ''
    if(mil>0) txt += (mil===1?'mil':grp(mil,'mil','mil'))
    if(mil>0&&resto>0) txt += ' e '
    if(resto>0) txt += conv(resto)
    const partes = [txt?txt+(reais===1?' real':' reais'):'']
    if(centavos>0) partes.push(conv(centavos)+(centavos===1?' centavo':' centavos'))
    return partes.filter(Boolean).join(' e ') || 'zero reais'
  }

  const totalExtenso = numPorExtenso(total)
  const ROG_SIG = `<div style="position:relative;display:inline-block"><div style="font-family:'Dancing Script',cursive;font-size:28px;color:#0369A1;opacity:0.9;letter-spacing:1px;line-height:1">Rogério Silva</div><div style="position:absolute;bottom:-2px;left:0;right:0;height:0.5px;background:#0369A1;opacity:0.4"></div></div>`

  return `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Contrato RARO Home — ${client?.name1||proposal.client_name||'Cliente'}${proposal.code?' — '+proposal.code:''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    @page{size:A4;margin:18mm 24mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;font-size:10.5px;color:#1a1a1a;line-height:1.75;background:#fff}
    h1{font-family:'DM Serif Display',serif;font-size:20px;color:#060B1A;margin-bottom:2px}
    h2{font-family:'DM Serif Display',serif;font-size:12.5px;color:#0369A1;margin:16px 0 5px;border-bottom:1px solid #C8DEFF;padding-bottom:3px;text-transform:uppercase;letter-spacing:0.5px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #060B1A;padding-bottom:12px;margin-bottom:18px}
    .badge{background:#060B1A;color:#fff;padding:3px 10px;border-radius:3px;font-size:8px;letter-spacing:2px;text-transform:uppercase;display:inline-block;margin-bottom:8px}
    .header-right{text-align:right;font-size:9px;color:#6B8CAE;line-height:1.9}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
    .field{background:#F5FAFF;border:0.5px solid #C8DEFF;border-radius:3px;padding:7px 10px}
    .field-label{font-size:7.5px;letter-spacing:1.5px;color:#0369A1;text-transform:uppercase;margin-bottom:2px;font-weight:500}
    .field-value{font-size:11px;color:#060B1A}
    .clause{margin-bottom:9px;text-align:justify}
    .clause-num{font-weight:600;color:#0369A1;margin-right:4px}
    .total-box{background:linear-gradient(135deg,#060B1A 0%,#0a1628 100%);color:#fff;padding:14px 18px;border-radius:4px;margin:14px 0}
    .total-label{font-size:8px;letter-spacing:3px;color:#38BDF8;text-transform:uppercase;margin-bottom:6px}
    .total-value{font-family:'DM Serif Display',serif;font-size:26px;color:#fff;margin-bottom:4px}
    .total-extenso{font-size:9.5px;color:rgba(255,255,255,0.65);font-style:italic}
    .scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:8px 0}
    .scope-item{background:#F5FAFF;border:0.5px solid #C8DEFF;border-radius:3px;padding:4px 8px;font-size:10px;color:#1E3A5F}
    .scope-detail{display:flex;flex-direction:column;gap:6px;margin:8px 0}
    .scope-room{background:#F5FAFF;border:0.5px solid #C8DEFF;border-radius:4px;padding:6px 9px;break-inside:avoid}
    .scope-room-hdr{font-size:10px;font-weight:700;color:#0D2540;margin-bottom:4px;display:flex;align-items:center;gap:6px}
    .scope-room-qty{font-size:8px;font-weight:600;color:#fff;background:#0369A1;border-radius:8px;padding:1px 7px;margin-left:auto}
    .scope-room-items{display:flex;flex-wrap:wrap;gap:3px}
    .scope-chip{font-size:8.5px;color:#1E3A5F;background:#fff;border:0.5px solid #D6E6FB;border-radius:3px;padding:2px 6px}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:36px}
    .sig-box{text-align:center}
    .sig-signed{min-height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
    .sig-line{border-top:0.5px solid #C8DEFF;margin-bottom:4px}
    .sig-name{font-size:9px;font-weight:600;color:#060B1A}
    .sig-sub{font-size:8px;color:#9CA3AF;margin-top:1px}
    .highlight{background:#E8F4FF;border-left:3px solid #0EA5E9;padding:8px 12px;border-radius:0 4px 4px 0;margin:10px 0;font-size:10px}
    .footer{margin-top:24px;padding-top:8px;border-top:0.5px solid #C8DEFF;font-size:7.5px;color:#9CA3AF;text-align:center}
    @media print{body{font-size:10px}.no-print{display:none!important}}
  </style>
</head><body>
  <div class="no-print" style="position:sticky;top:0;background:#060B1A;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-family:'DM Sans',sans-serif;font-size:11px;z-index:99">
    <span>Contrato RARO Home — ${proposal.code} — ${client?.name1||proposal.client_name}</span>
    <button onclick="window.print()" style="background:#0EA5E9;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-size:11px;cursor:pointer">⬇ Salvar como PDF</button>
  </div>

  <div class="header">
    <div>
      <img src="${LOGO_CONTRACT}" alt="RARO HOME" style="height:80px;width:auto;margin-bottom:10px;display:block"/>
      <div class="badge">Contrato de Prestação de Serviços</div>
      <h1>Termo de Execução de Projeto</h1>
      <div style="font-size:9px;color:#6B8CAE">Automação Residencial · Tecnologia · Lazer</div>
    </div>
    <div class="header-right">
      <strong>RARO Home Tecnologia</strong><br/>
      contato@rarohome.com.br · (21) 98170-9009<br/>
      www.rarohome.com.br · @rarohome<br/>
      <strong style="color:#060B1A">Contrato nº ${proposal.code||proposal.id}</strong><br/>
      Rio de Janeiro, ${today}
    </div>
  </div>

  <h2>1. Partes Contratantes</h2>
  <div class="grid-2">
    <div>
      <div style="font-size:9px;font-weight:600;color:#0369A1;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px">Contratada</div>
      <div class="field"><div class="field-label">Empresa</div><div class="field-value">RARO Home Tecnologia</div></div>
      <div class="field" style="margin-top:5px"><div class="field-label">Responsável</div><div class="field-value">Rogério Silva</div></div>
    </div>
    <div>
      <div style="font-size:9px;font-weight:600;color:#0369A1;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px">Contratante</div>
      <div class="field"><div class="field-label">Nome completo</div><div class="field-value">${bothNames}</div></div>
      <div class="field" style="margin-top:5px"><div class="field-label">Contato</div><div class="field-value">${client?.phone1||'—'} · ${client?.email||'—'}</div></div>
    </div>
  </div>
  <div class="grid-2">
    <div class="field"><div class="field-label">Local de execução</div><div class="field-value">${addr}</div></div>
    <div class="field"><div class="field-label">Tipo de imóvel</div><div class="field-value">${housing}</div></div>
  </div>

  <h2>2. Objeto do Contrato</h2>
  <div class="clause">O presente instrumento tem por objeto a prestação de serviços de automação residencial, fornecimento, instalação e configuração de equipamentos de tecnologia, conforme proposta técnica nº <strong>${proposal.code}</strong>, que integra este contrato como Anexo I.</div>
  <div style="margin:8px 0 4px;font-size:9px;font-weight:600;color:#1E3A5F;text-transform:uppercase;letter-spacing:1px">Ambientes e itens contemplados:</div>
  <div class="scope-detail">${scopeRooms.map(r=>`
    <div class="scope-room">
      <div class="scope-room-hdr">${r.icon} ${r.name} <span class="scope-room-qty">${r.total} ${r.total===1?'item':'itens'}</span></div>
      <div class="scope-room-items">${r.itemList.map(it=>`<span class="scope-chip">${it}</span>`).join('')}</div>
    </div>`).join('')}</div>

  <h2>3. Valor Total e Forma de Pagamento</h2>
  <div class="total-box">
    <div class="total-label">Investimento Total do Projeto</div>
    <div class="total-value">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
    <div class="total-extenso">(${totalExtenso})</div>
  </div>
  <div class="clause">O valor total inclui fornecimento de todos os equipamentos, materiais, mão de obra especializada, instalação, configuração, testes e treinamento ao contratante. A forma de pagamento será definida conforme acordado na proposta comercial.</div>
  <div class="highlight"><strong>Nota:</strong> O detalhamento completo dos equipamentos por ambiente consta na Proposta Técnica nº ${proposal.code}, parte integrante deste contrato.</div>

  <h2>4. Cláusulas e Condições</h2>
  <div class="clause"><span class="clause-num">4.1 PRAZO:</span> O prazo de execução será acordado entre as partes após assinatura deste instrumento, respeitando disponibilidade de materiais e agenda da CONTRATADA. Qualquer alteração no prazo será comunicada com antecedência mínima de 48 horas.</div>
  <div class="clause"><span class="clause-num">4.2 GARANTIA:</span> Os equipamentos possuem garantia de fábrica conforme especificação de cada fabricante. A instalação e configuração têm garantia de <strong>90 (noventa) dias</strong> contra defeitos decorrentes da execução dos serviços, contados da data de entrega.</div>
  <div class="clause"><span class="clause-num">4.3 SUPORTE PÓS-ENTREGA:</span> A CONTRATADA prestará suporte técnico via WhatsApp no número (21) 98170-9009, de segunda a sexta, das 9h às 18h. Atendimentos emergenciais fora deste horário poderão ser cobrados separadamente.</div>
  <div class="clause"><span class="clause-num">4.4 OBRIGAÇÕES DO CONTRATANTE:</span> Garantir acesso ao imóvel nos horários acordados; fornecer energia elétrica estabilizada no local de instalação; não efetuar modificações nos sistemas instalados sem prévia autorização técnica da CONTRATADA; manter os equipamentos afastados de fontes de umidade excessiva e calor.</div>
  <div class="clause"><span class="clause-num">4.5 EXCLUSÕES DE GARANTIA:</span> Não estão cobertos: danos causados por mau uso, sobretensão elétrica, raio, inundação, quedas físicas, modificações realizadas por terceiros não autorizados, ou uso fora das especificações técnicas dos fabricantes.</div>
  <div class="clause"><span class="clause-num">4.6 CANCELAMENTO:</span> Em caso de cancelamento por parte do CONTRATANTE após o início da execução dos serviços, serão devidos os valores proporcionais aos serviços já prestados e materiais já adquiridos, acrescidos de multa de <strong>20% (vinte por cento)</strong> sobre o valor total contratado.</div>
  <div class="clause"><span class="clause-num">4.7 CONFIDENCIALIDADE:</span> As partes comprometem-se a manter sigilo sobre as informações técnicas, comerciais e pessoais trocadas no âmbito deste contrato.</div>


  <h2>5. Aceite e Assinaturas</h2>
  <div style="font-size:10px;color:#3D5A80;margin-bottom:16px">
    As partes declaram ter lido, compreendido e concordado com todas as cláusulas deste instrumento, assinando-o em duas vias de igual teor e forma.
  </div>
  <div style="font-size:10px;color:#3D5A80;margin-bottom:20px"><strong>Rio de Janeiro, ${today}.</strong></div>

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-signed"><div style="font-size:11px;color:#9CA3AF;font-style:italic">_________________________</div></div>
      <div class="sig-line"></div>
      <div class="sig-name">${name1}</div>
      <div class="sig-sub">Contratante · CPF: ___.___.___-__</div>
    </div>
    <div class="sig-box">
      <div class="sig-signed">${ROG_SIG}</div>
      <div class="sig-line"></div>
      <div class="sig-name">Rogério Silva</div>
      <div class="sig-sub">RARO Home Tecnologia · Contratada</div>
    </div>
    ${name2?`<div class="sig-box" style="margin-top:24px"><div class="sig-signed"><div style="font-size:11px;color:#9CA3AF;font-style:italic">_________________________</div></div><div class="sig-line"></div><div class="sig-name">${name2}</div><div class="sig-sub">Contratante · CPF: ___.___.___-__</div></div><div></div>`:''}
  </div>

  <div class="footer">
    RARO Home Tecnologia · contato@rarohome.com.br · (21) 98170-9009 · www.rarohome.com.br<br/>
    Contrato nº ${proposal.code||proposal.id} · Emitido em ${today} · Proposta válida por ${proposal.valid_days||30} dias
  </div>
</body></html>`
}


export default function Contract({ proposal, clients, onClose, onSend, onGenerated }) {
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)
  const baseClient = clients?.find(c => c.id === Number(proposal?.client_id))
  const [showReview, setShowReview] = useState(true)
  const [edits, setEdits] = useState({
    name1: baseClient?.full_name1 || baseClient?.name1 || '',
    name2: baseClient?.full_name2 || baseClient?.name2 || '',
    cpf1: baseClient?.cpf1 || baseClient?.cpf || '',
    neighborhood: baseClient?.neighborhood || '',
    city: baseClient?.city || '',
    phone1: baseClient?.phone1 || '',
    email: baseClient?.email || '',
  })
  // cliente efetivo = base + edições
  const client = { ...baseClient, full_name1:edits.name1, name1:edits.name1, full_name2:edits.name2, name2:edits.name2,
    cpf1:edits.cpf1, cpf:edits.cpf1, neighborhood:edits.neighborhood, city:edits.city, phone1:edits.phone1, email:edits.email }
  const ed=(k,v)=>setEdits(p=>({...p,[k]:v}))

  function openContract() { downloadContract() }

  function downloadContract() {
    // Open in new window and trigger print → Save as PDF
    const html = buildContract(proposal, client)
    try {
      const blob = new Blob([html], {type:'text/html;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (w) { setTimeout(() => URL.revokeObjectURL(url), 15000); return }
    } catch(e) {}
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
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

  function handleSaveContract() {
    downloadContract()
    if (onGenerated) onGenerated(proposal)
    setSaved(true)
  }

  return (
    <div className="modal-overlay" style={{alignItems:'stretch',padding:0,zIndex:1000}}>
      <div style={{width:'100%',height:'100%',background:'var(--bg)',display:'flex',flexDirection:'column'}}>
        {/* Toolbar */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <button className="btn" style={{padding:'5px 10px'}} onClick={onClose}>
            <i className="ti ti-arrow-left" aria-hidden/>Voltar
          </button>
          <div style={{flex:1,fontSize:13,fontWeight:500,color:'var(--text1)'}}>
            Contrato — {proposal.code} · {proposal.client_name}
          </div>
          {!client?.full_name1 && (
            <div style={{fontSize:11,color:'var(--amber)',display:'flex',alignItems:'center',gap:4}}>
              <i className="ti ti-alert-circle" aria-hidden/>Nome completo incompleto
            </div>
          )}
          {saved && (
            <span style={{fontSize:12,color:'var(--green)',display:'flex',alignItems:'center',gap:4,fontWeight:500}}>
              <i className="ti ti-check" aria-hidden/>Contrato salvo
            </span>
          )}
          <button
            className={saved ? 'btn' : 'btn primary'}
            style={saved ? {borderColor:'var(--green)',color:'var(--green)'} : {}}
            onClick={handleSaveContract}>
            <i className="ti ti-download" aria-hidden/>
            {saved ? 'Baixar novamente' : 'Salvar contrato (PDF)'}
          </button>
          {onSend && (
            <button
              className="btn primary"
              style={saved
                ? {background:'#059669',borderColor:'#059669',color:'#fff'}
                : {opacity:0.4,cursor:'not-allowed',background:'#059669',borderColor:'#059669',color:'#fff'}}
              disabled={!saved}
              title={saved ? 'Enviar contrato' : 'Salve o contrato antes de enviar'}
              onClick={()=>saved && onSend(proposal)}>
              <i className="ti ti-send" aria-hidden/>Enviar
            </button>
          )}
        </div>
        {/* Painel de revisão de dados */}
        {showReview && (
          <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <i className="ti ti-user-check" style={{color:'var(--accent)'}} aria-hidden/>
              <b style={{fontSize:13}}>Confira os dados do cliente antes de gerar o contrato</b>
              <button className="btn" style={{marginLeft:'auto',fontSize:11}} onClick={()=>setShowReview(false)}><i className="ti ti-check" aria-hidden/>Dados corretos, ocultar</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
              {[['name1','Nome completo (1º contratante)'],['name2','Nome completo (2º contratante)'],['cpf1','CPF'],['phone1','Telefone'],['email','E-mail'],['neighborhood','Bairro'],['city','Cidade']].map(([k,lb])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:3}}>{lb}</div>
                  <input value={edits[k]} onChange={e=>ed(k,e.target.value)} placeholder={lb}
                    style={{width:'100%',padding:'7px 9px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:8}}>As alterações aqui valem só para este contrato. Para salvar no cadastro, edite o cliente na tela de Clientes.</div>
          </div>
        )}
        {!showReview && (
          <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'8px 16px'}}>
            <button className="btn" style={{fontSize:11}} onClick={()=>setShowReview(true)}><i className="ti ti-edit" aria-hidden/>Revisar/editar dados do cliente</button>
          </div>
        )}
        {/* Contract preview */}
        <iframe
          srcDoc={buildContract(proposal, client)}
          style={{flex:1,border:'none',width:'100%'}}
          title="Contrato RARO Home"
        />
      </div>
    </div>
  )
}
