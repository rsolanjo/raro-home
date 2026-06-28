import { useState } from 'react'
import { LOGO_COVER } from '../logos.js'

// Logo do contrato — fundo transparente blenda no #fff do corpo do contrato
const LOGO_CONTRACT = LOGO_COVER

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export function buildContract(proposal, client, opts={}) {
  const tipo = opts.tipo || 'total'   // 'projeto' | 'total' | 'ocultas' | 'avulsa'
  const hiddenCats = new Set(opts.hiddenCats||[])
  const floors = Array.isArray(proposal.floors) ? proposal.floors
    : (typeof proposal.floors==='string' ? JSON.parse(proposal.floors||'[]') : proposal.floors||[])
  const itemVisivel = it => !hiddenCats.has((it.category||it.cat||'').trim())
  const labor = Number(proposal.labor)||0
  // valor de equipamentos pelo total dos cômodos (cheio)
  const equipTotalCheio = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
  const computedCheio = equipTotalCheio + labor
  // VALOR CHEIO de referência = aprovado da proposta, senão calculado
  const valorCheio = Number(proposal.approved_value)>0 ? Number(proposal.approved_value) : computedCheio

  // Em "ocultas": parte do valor CHEIO e SUBTRAI o que foi ocultado (categorias e/ou mão de obra)
  let descontado = 0
  if(tipo==='ocultas'){
    // soma o valor dos itens das categorias ocultas (usa price do item; se não houver, rateia pelo cômodo)
    floors.forEach(f=>(f.rooms||[]).forEach(r=>{
      const itens=(r.items||[])
      const somaItens=itens.reduce((s,it)=>s+(Number(it.price)||Number(it.sale)||0)*(parseInt(it.qty)||1),0)
      const roomPrice=Number(r.price)||0
      itens.forEach(it=>{
        if(itemVisivel(it)) return
        const v=(Number(it.price)||Number(it.sale)||0)*(parseInt(it.qty)||1)
        // se os itens não têm preço, rateia o valor do cômodo igualmente
        descontado += v>0 ? v : (somaItens===0 && itens.length ? roomPrice/itens.length : 0)
      })
    }))
    // mão de obra é uma "categoria" ocultável
    if(hiddenCats.has('Mão de obra')) descontado += labor
  }
  let total = tipo==='ocultas' ? Math.max(0, valorCheio - descontado) : valorCheio
  if((tipo==='avulsa'||tipo==='projeto') && Number(opts.valorManual)>0) total = Number(opts.valorManual)
  const today = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
  const name1 = client?.full_name1 || client?.name1 || '—'
  const name2 = client?.full_name2 || client?.name2 || ''
  const bothNames = name2 ? `${name1} e ${name2}` : name1
  const _ruaNum = [client?.street, client?.number].filter(Boolean).join(', ')
  const _compl = client?.complement ? ` (${client.complement})` : ''
  const _bairroCidade = [client?.neighborhood, client?.city].filter(Boolean).join(', ')
  const _estadoCep = [client?.state, client?.cep].filter(Boolean).join(' · CEP ')
  const addr = [ _ruaNum + _compl, _bairroCidade, _estadoCep ].filter(s=>s&&s.trim()).join(' — ') || '—'
  const housing = client?.housing_type || 'residencial'
  const scopeRooms = floors.flatMap(fl=>(fl.rooms||[]).map(r=>{
    // agrupa itens por nome com quantidade (respeitando categorias ocultas)
    const counts={}
    ;(r.items||[]).filter(i=>i.name).filter(i=>tipo==='ocultas'?itemVisivel(i):true).forEach(it=>{
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

  // ── Configuração por TIPO de contrato ──────────────────────────────
  const ehProjeto = tipo==='projeto'
  const tituloDoc = ehProjeto ? 'Contrato de Projeto e Acompanhamento Técnico'
    : tipo==='avulsa' ? 'Contrato de Prestação de Serviços'
    : 'Contrato de Fornecimento, Instalação e Automação'
  const tipoBadge = ehProjeto ? 'PROJETO · ACOMPANHAMENTO'
    : tipo==='ocultas' ? 'FORNECIMENTO + INSTALAÇÃO'
    : tipo==='avulsa' ? 'SERVIÇO PERSONALIZADO' : 'FORNECIMENTO + INSTALAÇÃO'
  // Objeto do contrato
  const objetoTxt = ehProjeto
    ? `O presente instrumento tem por objeto a elaboração de <strong>projeto técnico de automação e infraestrutura</strong> e o <strong>acompanhamento técnico</strong> da sua implantação, conforme escopo técnico nº <strong>${proposal.code}</strong>. Este contrato <strong>não inclui</strong> o fornecimento de equipamentos nem a execução física da instalação, que poderão ser objeto de contrato específico.`
    : tipo==='avulsa'
    ? (opts.objetoCustom || `O presente instrumento tem por objeto a prestação de serviços conforme escopo técnico nº <strong>${proposal.code}</strong>, que integra este contrato como Anexo I.`)
    : `O presente instrumento tem por objeto a prestação de serviços de automação residencial, fornecimento, instalação e configuração de equipamentos de tecnologia, conforme proposta técnica nº <strong>${proposal.code}</strong>, que integra este contrato como Anexo I.`
  // Forma de pagamento (editável em qualquer tipo via opts.pagamentoCustom)
  const pagamentoTxt = opts.pagamentoCustom ? opts.pagamentoCustom : (ehProjeto
    ? `O valor do projeto será pago <strong>à vista</strong>, no ato da contratação, mediante PIX, transferência ou conforme combinado entre as partes. A liberação do projeto e o início do acompanhamento ocorrem após a confirmação do pagamento.`
    : `O pagamento será efetuado em <strong>2 (duas) parcelas</strong>: <strong>50% (cinquenta por cento)</strong> na assinatura deste contrato, a título de entrada para aquisição de equipamentos e início dos serviços, e <strong>50% (cinquenta por cento)</strong> na entrega final, após a conclusão da instalação, configuração e testes.`)
  // prazo e garantia editáveis
  const prazoTxt = opts.prazoCustom || (ehProjeto
    ? 'O projeto técnico será entregue no prazo acordado entre as partes após a confirmação do pagamento, em formato digital (PDF), incluindo plantas, especificações e quantitativos.'
    : 'O prazo de execução será acordado entre as partes após assinatura deste instrumento, respeitando disponibilidade de materiais e agenda da CONTRATADA. Qualquer alteração no prazo será comunicada com antecedência mínima de 48 horas.')
  const garantiaTxt = opts.garantiaCustom || (ehProjeto
    ? 'O projeto entregue destina-se exclusivamente ao imóvel e ao CONTRATANTE indicados, sendo vedada sua reprodução ou uso em outras obras sem autorização da CONTRATADA.'
    : 'Os equipamentos possuem garantia de fábrica conforme especificação de cada fabricante. A instalação e configuração têm garantia de <strong>90 (noventa) dias</strong> contra defeitos decorrentes da execução dos serviços, contados da data de entrega.')
  // Inclui lista de ambientes? (projeto não)
  const mostraEscopoItens = !ehProjeto && scopeRooms.length>0
  // Cláusulas específicas
  const clausulas = ehProjeto ? [
    ['PRAZO DE ENTREGA DO PROJETO', prazoTxt],
    ['ACOMPANHAMENTO','A CONTRATADA prestará acompanhamento técnico durante a execução, esclarecendo dúvidas e validando as etapas conforme combinado.'],
    ['PROPRIEDADE INTELECTUAL', garantiaTxt],
    ['REVISÕES','Estão incluídas até 3 (três) revisões do projeto. Revisões adicionais ou mudanças de escopo poderão ser cobradas à parte.'],
    ['SUPORTE','Dúvidas sobre o projeto via WhatsApp (21) 98170-9009, de segunda a sexta, das 9h às 18h.'],
    ['CONFIDENCIALIDADE','As partes comprometem-se a manter sigilo sobre as informações técnicas, comerciais e pessoais trocadas no âmbito deste contrato.'],
  ] : [
    ['PRAZO', prazoTxt],
    ['GARANTIA', garantiaTxt],
    ['SUPORTE PÓS-ENTREGA','A CONTRATADA prestará suporte técnico via WhatsApp no número (21) 98170-9009, de segunda a sexta, das 9h às 18h. Atendimentos emergenciais fora deste horário poderão ser cobrados separadamente.'],
    ['OBRIGAÇÕES DO CONTRATANTE','Garantir acesso ao imóvel nos horários acordados; fornecer energia elétrica estabilizada no local de instalação; não efetuar modificações nos sistemas instalados sem prévia autorização técnica da CONTRATADA; manter os equipamentos afastados de fontes de umidade excessiva e calor.'],
    ['EXCLUSÕES DE GARANTIA','Não estão cobertos: danos causados por mau uso, sobretensão elétrica, raio, inundação, quedas físicas, modificações realizadas por pessoas não autorizadas, ou uso fora das especificações técnicas dos fabricantes.'],
    ['CANCELAMENTO','Em caso de cancelamento por parte do CONTRATANTE após o início da execução dos serviços, serão devidos os valores proporcionais aos serviços já prestados e materiais já adquiridos, acrescidos de multa de <strong>20% (vinte por cento)</strong> sobre o valor total contratado.'],
    ['CONFIDENCIALIDADE','As partes comprometem-se a manter sigilo sobre as informações técnicas, comerciais e pessoais trocadas no âmbito deste contrato.'],
  ]
  // cláusulas extras (avulsa)
  const extras = (opts.clausulasExtras||[]).filter(x=>(x.titulo||x.texto))
  extras.forEach(x=>clausulas.push([x.titulo||'CLÁUSULA ADICIONAL', x.texto||'']))

  return `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>${tituloDoc} — ${client?.name1||proposal.client_name||'Cliente'}${proposal.code?' ('+proposal.code+')':''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page{size:A4;margin:16mm 18mm 18mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;font-size:10.5px;color:#22272E;line-height:1.78;background:#fff;padding:22px 30px;-webkit-font-smoothing:antialiased}
    @media print{ body{padding:0} }
    h1{font-family:'Fraunces',serif;font-size:23px;font-weight:500;color:#0A0F1C;margin-bottom:3px;letter-spacing:-0.3px}
    h2{font-family:'Fraunces',serif;font-size:13px;font-weight:600;color:#0A3A66;margin:20px 0 7px;border-bottom:1.5px solid #DCEAFB;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.8px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0A0F1C;padding-bottom:14px;margin-bottom:20px}
    .badge{background:#0A0F1C;color:#fff;padding:4px 12px;border-radius:3px;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;display:inline-block;margin-bottom:9px;font-weight:600}
    .header-right{text-align:right;font-size:9px;color:#5A748F;line-height:2}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:11px}
    .field{background:#F7FBFF;border:1px solid #DCEAFB;border-radius:5px;padding:8px 11px}
    .field-label{font-size:7.5px;letter-spacing:1.6px;color:#0A6BC0;text-transform:uppercase;margin-bottom:3px;font-weight:600}
    .field-value{font-size:11px;color:#0A0F1C;font-weight:500}
    .clause{margin-bottom:11px;text-align:justify;line-height:1.82;hyphens:auto}
    .clause-num{font-weight:700;color:#0A3A66;margin-right:5px}
    .total-box{background:linear-gradient(135deg,#0A0F1C 0%,#0d1d33 100%);color:#fff;padding:16px 20px;border-radius:6px;margin:16px 0;box-shadow:0 2px 10px rgba(10,15,28,0.12)}
    .total-label{font-size:8px;letter-spacing:3.5px;color:#5BBEF5;text-transform:uppercase;margin-bottom:7px;font-weight:600}
    .total-value{font-family:'Fraunces',serif;font-size:29px;font-weight:600;color:#fff;margin-bottom:5px;letter-spacing:-0.5px}
    .total-extenso{font-size:9.5px;color:rgba(255,255,255,0.7);font-style:italic;line-height:1.5}
    .scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:8px 0}
    .scope-item{background:#F7FBFF;border:1px solid #DCEAFB;border-radius:4px;padding:5px 9px;font-size:10px;color:#1E3A5F}
    .scope-detail{display:flex;flex-direction:column;gap:7px;margin:9px 0}
    .scope-room{background:#F7FBFF;border:1px solid #DCEAFB;border-radius:5px;padding:7px 11px;break-inside:avoid}
    .scope-room-hdr{font-size:10.5px;font-weight:700;color:#0A2540;margin-bottom:5px;display:flex;align-items:center;gap:6px}
    .scope-room-qty{font-size:8px;font-weight:600;color:#fff;background:#0A6BC0;border-radius:9px;padding:1px 8px;margin-left:auto}
    .scope-room-items{display:flex;flex-wrap:wrap;gap:4px}
    .scope-chip{font-size:8.5px;color:#1E3A5F;background:#fff;border:1px solid #DCEAFB;border-radius:3px;padding:2px 7px}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
    .sig-box{text-align:center}
    .sig-signed{min-height:46px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
    .sig-line{border-top:1px solid #9CB4CE;margin-bottom:5px}
    .sig-name{font-size:9.5px;font-weight:600;color:#0A0F1C}
    .sig-sub{font-size:8px;color:#8595A8;margin-top:2px}
    .highlight{background:#EFF7FF;border-left:3px solid #0A6BC0;padding:9px 13px;border-radius:0 5px 5px 0;margin:11px 0;font-size:10px;line-height:1.7}
    .footer{margin-top:26px;padding-top:10px;border-top:1px solid #DCEAFB;font-size:7.5px;color:#8595A8;text-align:center;line-height:1.7}
    @media print{body{font-size:10px}.no-print{display:none!important}}
  </style>
</head><body>
  <div class="no-print" style="position:sticky;top:0;background:#060B1A;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-family:'DM Sans',sans-serif;font-size:11px;z-index:99">
    <span>${tituloDoc} — ${proposal.code} — ${client?.name1||proposal.client_name}</span>
    <button onclick="window.print()" style="background:#0EA5E9;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-size:11px;cursor:pointer">⬇ Salvar como PDF</button>
  </div>

  <div class="header">
    <div>
      <img src="${LOGO_CONTRACT}" alt="RARO HOME" style="height:84px;width:auto;margin-bottom:10px;display:block"/>
      <div class="badge">${tipoBadge}</div>
      <h1>${tituloDoc}</h1>
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
  <div class="clause">${objetoTxt}</div>
  ${mostraEscopoItens?`<div style="margin:8px 0 4px;font-size:9px;font-weight:600;color:#1E3A5F;text-transform:uppercase;letter-spacing:1px">Ambientes e itens contemplados:</div>
  <div class="scope-detail">${scopeRooms.map(r=>`
    <div class="scope-room">
      <div class="scope-room-hdr">${r.icon} ${r.name} <span class="scope-room-qty">${r.total} ${r.total===1?'item':'itens'}</span></div>
      <div class="scope-room-items">${r.itemList.map(it=>`<span class="scope-chip">${it}</span>`).join('')}</div>
    </div>`).join('')}</div>`:''}

  <h2>3. Valor ${ehProjeto?'do Projeto':'Total'} e Forma de Pagamento</h2>
  <div class="total-box">
    <div class="total-label">${ehProjeto?'Valor do Projeto e Acompanhamento':'Investimento Total do Projeto'}</div>
    <div class="total-value">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
    <div class="total-extenso">(${totalExtenso})</div>
  </div>
  <div class="clause">${pagamentoTxt}</div>
  ${ehProjeto?'':`<div class="highlight"><strong>Nota:</strong> O detalhamento completo dos equipamentos por ambiente consta na Proposta Técnica nº ${proposal.code}, parte integrante deste contrato.</div>`}

  <h2>4. Cláusulas e Condições</h2>
  ${clausulas.map((cl,i)=>`<div class="clause"><span class="clause-num">4.${i+1} ${cl[0]}:</span> ${cl[1]}</div>`).join('')}


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
  const [signing, setSigning] = useState(false)
  const baseClient = clients?.find(c => c.id === Number(proposal?.client_id))
  const [showReview, setShowReview] = useState(true)
  const [edits, setEdits] = useState({
    name1: baseClient?.full_name1 || baseClient?.name1 || '',
    name2: baseClient?.full_name2 || baseClient?.name2 || '',
    cpf1: baseClient?.cpf1 || baseClient?.cpf || '',
    street: baseClient?.street || '',
    number: baseClient?.number || '',
    complement: baseClient?.complement || '',
    neighborhood: baseClient?.neighborhood || '',
    city: baseClient?.city || '',
    state: baseClient?.state || '',
    cep: baseClient?.cep || '',
    phone1: baseClient?.phone1 || '',
    email: baseClient?.email || '',
  })
  // cliente efetivo = base + edições
  const client = { ...baseClient, full_name1:edits.name1, name1:edits.name1, full_name2:edits.name2, name2:edits.name2,
    cpf1:edits.cpf1, cpf:edits.cpf1, street:edits.street, number:edits.number, complement:edits.complement,
    neighborhood:edits.neighborhood, city:edits.city, state:edits.state, cep:edits.cep, phone1:edits.phone1, email:edits.email }
  const bothNames = edits.name2 ? `${edits.name1} e ${edits.name2}` : edits.name1
  const ed=(k,v)=>setEdits(p=>({...p,[k]:v}))
  // ── Assinatura digital ──
  const [cmpOpen, setCmpOpen] = useState(false)
  const [cmpData, setCmpData] = useState(null)
  const [cmpLoading, setCmpLoading] = useState(false)
  // rastreia o documentId da Assinafy (salvo em localStorage por proposta)
  const signKey = `assinafy_doc_${proposal?.id||proposal?.code||''}`
  const [signDocId, setSignDocId] = useState(()=>{try{return localStorage.getItem(signKey)||''}catch{return ''}})
  const [signStatus, setSignStatus] = useState(null)
  const [checkingSign, setCheckingSign] = useState(false)
  function salvarSignDocId(id){ setSignDocId(id); try{localStorage.setItem(signKey,id)}catch{} }
  async function verificarAssinatura(){
    if(!signDocId){ alert('Nenhum contrato foi enviado para assinatura nesta proposta ainda.'); return }
    setCheckingSign(true)
    try{
      const r = await fetch(`/api/sign-status?documentId=${encodeURIComponent(signDocId)}`)
      const j = await r.json().catch(()=>({}))
      setSignStatus(j)
      const st = j.status||'desconhecido'
      const prog = j.progress
      let msg = `Status: ${st.toUpperCase()}\n`
      if(prog?.signers && Array.isArray(prog.signers)){
        msg += '\nSignatários:\n'
        prog.signers.forEach(s=>{ msg += `• ${s.name||s.email}: ${s.signed?'✓ ASSINADO'+(s.signed_at?' em '+new Date(s.signed_at).toLocaleDateString('pt-BR'):''):'⏳ Pendente'}\n` })
      } else if(prog?.total!==undefined){
        msg += `Progresso: ${prog.signed||0} de ${prog.total} assinaram\n`
      }
      msg += `\nAcompanhe em: ${j.url||'app.assinafy.com.br'}`
      alert(msg)
    }catch(e){ alert('Erro ao verificar: '+e.message) }
    setCheckingSign(false)
  }
  async function compararPropostaProjeto(){
    setCmpLoading(true)
    try{
      // extrai itens e totais da proposta atual
      const fl = Array.isArray(proposal.floors)?proposal.floors:(typeof proposal.floors==='string'?JSON.parse(proposal.floors||'[]'):[])
      const todosItens = []
      let totalProp = 0
      const porCat = {}
      fl.forEach(f=>(f.rooms||[]).forEach(r=>{
        totalProp += Number(r.price)||0
        ;(r.items||[]).forEach(it=>{
          if(!it.name) return
          const cat = it.category||'Outros'
          const qty = parseInt(it.qty)||1
          const val = (it.sale_price||0)*qty
          todosItens.push({name:it.name, qty, cat, val})
          porCat[cat] = (porCat[cat]||0) + val
        })
      }))
      const approved = Number(proposal.approved_value)>0 ? Number(proposal.approved_value) : 0
      totalProp = approved || totalProp
      const laborVal = Number(proposal.labor_value)||0

      // simula cada tipo de contrato
      const tipos = [
        { id:'total', nome:'Contrato Total', desc:'Inclui todos os equipamentos + mão de obra', total: totalProp+laborVal, itens: todosItens.length, cats: Object.keys(porCat) },
        { id:'projeto', nome:'Contrato de Projeto', desc:'Só o projeto (sem custo de equipamentos)', total: laborVal||0, itens: 0, cats:[], nota:'Cliente compra os equipamentos à parte' },
      ]
      // ocultas: para cada combinação possível de categorias ocultas
      const catEntries = Object.entries(porCat).sort((a,b)=>b[1]-a[1])
      if(catEntries.length>1){
        catEntries.forEach(([cat,val])=>{
          const restante = totalProp - val + laborVal
          tipos.push({ id:'ocultas', nome:`Ocultar "${cat}"`, desc:`Esconde ${cat} do contrato (R$ ${Number(val).toLocaleString('pt-BR')})`, total: restante, itens: todosItens.filter(i=>i.cat!==cat).length, cats: Object.keys(porCat).filter(c=>c!==cat), oculta:cat })
        })
      }
      setCmpData({ totalProp, laborVal, todosItens, porCat, catEntries, tipos })
      setCmpOpen(true)
    }catch(e){ alert('Erro ao comparar: '+e.message) }
    setCmpLoading(false)
  }
  // ── Tipo de contrato + opções ──
  const [tipo, setTipo] = useState('total')   // projeto | total | ocultas | avulsa
  const [valorManual, setValorManual] = useState('')
  const [hiddenCats, setHiddenCats] = useState([])
  const [pagamentoCustom, setPagamentoCustom] = useState('')
  const [objetoCustom, setObjetoCustom] = useState('')
  const [prazoCustom, setPrazoCustom] = useState('')
  const [garantiaCustom, setGarantiaCustom] = useState('')
  // categorias presentes na proposta (para o modo "ocultas")
  const catsDisponiveis = (()=>{ try{
    const fl = Array.isArray(proposal.floors)?proposal.floors:(typeof proposal.floors==='string'?JSON.parse(proposal.floors||'[]'):[])
    const s=new Set(); fl.forEach(f=>(f.rooms||[]).forEach(r=>(r.items||[]).forEach(it=>{ const c=(it.category||it.cat||'').trim(); if(c)s.add(c) })))
    const arr=[...s].sort()
    if(Number(proposal.labor)>0) arr.push('Mão de obra')   // mão de obra é ocultável
    return arr
  }catch{return []} })()
  const opts = { tipo, valorManual, hiddenCats,
    pagamentoCustom,   // editável em qualquer tipo
    prazoCustom, garantiaCustom,
    objetoCustom: tipo==='avulsa'?objetoCustom:'' }
  const toggleCat = c => setHiddenCats(p=> p.includes(c)? p.filter(x=>x!==c) : [...p,c])
  // valor cheio e valor atual (para mostrar ao vivo no painel de ocultas)
  const valorCheioUI = ()=>{ try{
    const fl=Array.isArray(proposal.floors)?proposal.floors:JSON.parse(proposal.floors||'[]')
    const eq=fl.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
    const cheio=eq+(Number(proposal.labor)||0)
    return Number(proposal.approved_value)>0?Number(proposal.approved_value):cheio
  }catch{return Number(proposal.approved_value)||0} }
  const totalAtualUI = ()=>{ try{
    const fl=Array.isArray(proposal.floors)?proposal.floors:JSON.parse(proposal.floors||'[]')
    const hid=new Set(hiddenCats)
    let desc=0
    fl.forEach(f=>(f.rooms||[]).forEach(r=>{ const itens=(r.items||[]); const soma=itens.reduce((s,it)=>s+(Number(it.price)||Number(it.sale)||0)*(parseInt(it.qty)||1),0); const rp=Number(r.price)||0
      itens.forEach(it=>{ if(!hid.has((it.category||it.cat||'').trim())) return; const v=(Number(it.price)||Number(it.sale)||0)*(parseInt(it.qty)||1); desc+=v>0?v:(soma===0&&itens.length?rp/itens.length:0) }) }))
    if(hid.has('Mão de obra')) desc+=Number(proposal.labor)||0
    return Math.max(0, valorCheioUI()-desc)
  }catch{return valorCheioUI()} }

  function openContract() { downloadContract() }

  function downloadContract() {
    // Abre via document.write para que o <title> vire o nome sugerido do PDF
    // (blob/URL.createObjectURL faz o navegador ignorar o título e usar um nome genérico)
    const html = buildContract(proposal, client, opts)
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close(); return }
    // fallback: blob (caso pop-up bloqueie a janela vazia)
    try {
      const blob = new Blob([html], {type:'text/html;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const w2 = window.open(url, '_blank')
      if (w2) setTimeout(() => URL.revokeObjectURL(url), 15000)
    } catch(e) {}
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

  // ── Assinatura digital (Assinafy) ──
  function loadScript(src){ return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src="${src}"]`)) return resolve()
    const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s)
  })}
  async function enviarParaAssinatura(){
    const emailCliente = (client?.email||'').trim()
    if(!emailCliente){ alert('O cliente não tem e-mail cadastrado. Adicione o e-mail nos dados acima para enviar para assinatura.'); return }
    if(!window.confirm(`Enviar o contrato para assinatura digital?\n\nSerá enviado para:\n• ${bothNames} <${emailCliente}>\n• Rogério (RARO Home)\n\nVia Assinafy (ICP-Brasil).`)) return
    setSigning(true)
    try{
      // 1) carrega html2pdf do CDN
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
      if(!window.html2pdf) throw new Error('html2pdf não carregou do CDN')

      // 2) renderiza o contrato num iframe oculto (para que o CSS seja aplicado corretamente)
      const html = buildContract(proposal, client, opts)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none'
      document.body.appendChild(iframe)
      const idoc = iframe.contentDocument || iframe.contentWindow.document
      idoc.open(); idoc.write(html); idoc.close()
      // espera fontes e imagens renderizarem
      await new Promise(r=>setTimeout(r,1500))

      // 3) gera o PDF a partir do body do iframe
      const bodyEl = idoc.body
      const pdfBlob = await window.html2pdf().set({
        margin:[10,10,10,10], filename:`Contrato-${proposal.code||'RARO'}.pdf`,
        image:{type:'jpeg',quality:0.92}, html2canvas:{scale:2,useCORS:true,logging:false},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
      }).from(bodyEl).outputPdf('blob')

      document.body.removeChild(iframe)
      if(!pdfBlob || pdfBlob.size < 1000) throw new Error(`PDF gerado inválido (${pdfBlob?.size||0} bytes)`)

      // 4) converte para base64
      const pdfBase64 = await new Promise((res,rej)=>{
        const r=new FileReader()
        r.onload=()=>res(String(r.result).split(',')[1])
        r.onerror=()=>rej(new Error('Erro ao converter PDF para base64'))
        r.readAsDataURL(pdfBlob)
      })

      // 5) envia para a função serverless /api/sign
      const resp = await fetch('/api/sign', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          fileName:`Contrato-${proposal.code||'RARO'}.pdf`, pdfBase64,
          signers:[ {name:bothNames, email:emailCliente}, {name:'Rogério — RARO Home', email:'contato@rarohome.com.br'} ],
          message:`Contrato RARO Home — proposta ${proposal.code||''}. Por favor, assine digitalmente.`
        })
      })
      const j = await resp.json().catch(()=>({}))
      if(j.sent){
        salvarSignDocId(j.documentId)
        alert(`✓ Contrato enviado para assinatura!\n\nOs signatários receberão um e-mail da Assinafy.\n${j.url?'\nAcompanhe em: '+j.url:''}`)
        setSaved(true); if(onGenerated) onGenerated(proposal)
      } else {
        console.error('Assinafy /api/sign falhou:', j)
        // se o documento foi enviado para a Assinafy (upload ok), salva o ID e oferece link manual
        if(j.documentId){
          salvarSignDocId(j.documentId)
          const abrir = window.confirm(`O contrato foi enviado para a Assinafy mas o envio automático para assinatura falhou.\n\nO contrato está no seu painel da Assinafy em "Aguardando preparação".\n\n→ Clique OK para abrir o painel da Assinafy e completar manualmente (EDITAR → adicionar signatários → enviar)\n→ Clique Cancelar para ver os detalhes técnicos do erro`)
          if(abrir){
            window.open(`https://app.assinafy.com.br/documents/${j.documentId}`, '_blank')
          } else {
            const det = j.detail ? `\n${JSON.stringify(j.detail).slice(0,300)}` : ''
            const st = j.steps ? `\nEtapas: ${JSON.stringify(j.steps).slice(0,400)}` : ''
            alert(`Detalhes técnicos:\n\nDocumento ID: ${j.documentId}\nSignatários adicionados: ${j.signersAdded?'sim':'não'}\n${j.error||''}${det}${st}\n\n${j.dica||''}`)
          }
        } else {
          alert(`Não foi possível enviar para assinatura.\n\nMotivo: ${j.reason||j.error||'desconhecido'}\n\nConfira ASSINAFY_API_KEY e ASSINAFY_ACCOUNT_ID no Vercel e faça Redeploy.`)
        }
      }
    }catch(e){
      console.error('Erro assinatura:', e)
      alert('Erro ao preparar/enviar o PDF:\n\n'+e.message+'\n\nVerifique a conexão e tente de novo.')
    }
    setSigning(false)
  }

  return (
    <div className="modal-overlay" style={{alignItems:'stretch',padding:0,zIndex:1000}}>
      {/* ── Modal de comparação proposta × projeto ── */}
      {cmpOpen && <div className="modal-overlay" style={{zIndex:2000,padding:20}} onClick={()=>setCmpOpen(false)}>
        <div style={{background:'var(--surf)',borderRadius:12,maxWidth:600,width:'100%',maxHeight:'85vh',overflow:'auto',padding:20}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <i className="ti ti-git-compare" style={{color:'var(--accent)',fontSize:20}} aria-hidden/>
            <b style={{fontSize:15}}>Comparação: Proposta × Contratos</b>
            <button className="btn" style={{marginLeft:'auto',padding:'4px 8px'}} onClick={()=>setCmpOpen(false)}>✕</button>
          </div>
          {cmpData && <>
            {/* Proposta atual */}
            <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',marginBottom:4}}>Proposta atual — {proposal?.code||''}</div>
              <div style={{fontSize:18,fontWeight:700}}>{fmt(cmpData.totalProp)}</div>
              <div style={{fontSize:10,color:'var(--text2)',marginTop:4}}>{cmpData.todosItens.length} itens · {cmpData.catEntries.length} categorias</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                {cmpData.catEntries.map(([cat,val])=>(
                  <span key={cat} style={{fontSize:9,padding:'2px 7px',borderRadius:4,border:'1px solid var(--border)',background:'var(--surf)',color:'var(--text1)'}}>{cat}: {fmt(val)}</span>
                ))}
              </div>
              {cmpData.laborVal>0 && <div style={{fontSize:10,color:'var(--text2)',marginTop:4}}>Mão de obra: {fmt(cmpData.laborVal)}</div>}
            </div>
            {/* Tipos de contrato */}
            <div style={{fontSize:11,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Opções de contrato</div>
            {cmpData.tipos.map((t,i)=>{
              const diff = t.total - (cmpData.totalProp + cmpData.laborVal)
              const isSelected = (tipo===t.id) || (tipo==='ocultas' && t.oculta)
              return <div key={i} style={{background:isSelected?'rgba(14,165,233,0.08)':'var(--bg)',border:`1.5px solid ${isSelected?'var(--accent)':'var(--border)'}`,borderRadius:8,padding:'10px 14px',marginBottom:8,cursor:'pointer'}} onClick={()=>{
                if(t.id==='ocultas' && t.oculta){ /* poderia selecionar automaticamente */ }
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text1)'}}>{t.nome}</div>
                    <div style={{fontSize:10,color:'var(--text2)',marginTop:2}}>{t.desc}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,fontWeight:700,color:'var(--text1)'}}>{fmt(t.total)}</div>
                    {diff!==0 && <div style={{fontSize:9,color:diff<0?'#DC2626':'#059669'}}>{diff>0?'+':''}{fmt(diff)}</div>}
                  </div>
                </div>
                {t.nota && <div style={{fontSize:9,color:'var(--amber)',marginTop:4,fontStyle:'italic'}}>{t.nota}</div>}
                {t.cats?.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:6}}>
                  {t.cats.map(c=><span key={c} style={{fontSize:8,padding:'1px 5px',borderRadius:3,border:'1px solid var(--border)',color:'var(--text2)'}}>{c}</span>)}
                </div>}
                {isSelected && <div style={{fontSize:9,color:'var(--accent)',marginTop:4,fontWeight:600}}>← tipo selecionado atualmente</div>}
              </div>
            })}
          </>}
        </div>
      </div>}
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
          <button className="btn" style={{padding:'5px 10px'}} onClick={compararPropostaProjeto} disabled={cmpLoading} title="Comparar a proposta com os tipos de contrato disponíveis">
            <i className={cmpLoading?'ti ti-loader':'ti ti-git-compare'} aria-hidden/>{cmpLoading?'…':'Comparar contratos'}
          </button>
          <button className="btn" style={{padding:'5px 10px',borderColor:'#0A6BC0',color:'#0A6BC0'}} onClick={enviarParaAssinatura} disabled={signing} title="Enviar o contrato para assinatura digital (Assinafy / ICP-Brasil)">
            <i className={signing?'ti ti-loader':'ti ti-signature'} aria-hidden/>{signing?'Enviando…':'Enviar p/ assinatura'}
          </button>
          {signDocId && <button className="btn" style={{padding:'5px 10px',borderColor:'#16A34A',color:'#16A34A'}} onClick={verificarAssinatura} disabled={checkingSign} title="Verificar se os signatários já assinaram">
            <i className={checkingSign?'ti ti-loader':'ti ti-checks'} aria-hidden/>{checkingSign?'Verificando…':'Verificar assinaturas'}
          </button>}
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
              {[['name1','Nome completo (1º contratante)'],['name2','Nome completo (2º contratante)'],['cpf1','CPF'],['phone1','Telefone'],['email','E-mail'],['street','Rua / Logradouro do imóvel'],['number','Número'],['complement','Complemento'],['neighborhood','Bairro'],['city','Cidade'],['state','Estado'],['cep','CEP']].map(([k,lb])=>(
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
        {/* Seletor de TIPO de contrato */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'12px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <i className="ti ti-file-stack" style={{color:'var(--accent)'}} aria-hidden/>
            <b style={{fontSize:13}}>Tipo de contrato</b>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8}}>
            {[
              ['projeto','Projeto','Só valor, à vista, sem equipamentos','ti-ruler-2'],
              ['total','Proposta total','Tudo + 50/50','ti-file-invoice'],
              ['ocultas','Categorias ocultas','Escolhe o que mostrar','ti-eye-off'],
              ['avulsa','Proposta avulsa','Personaliza tudo','ti-adjustments'],
            ].map(([v,t,sub,ic])=>(
              <button key={v} onClick={()=>setTipo(v)} style={{textAlign:'left',padding:'10px 12px',borderRadius:8,cursor:'pointer',
                border:`1.5px solid ${tipo===v?'var(--accent)':'var(--border)'}`,background:tipo===v?'rgba(14,165,233,0.1)':'var(--bg)',color:'var(--text1)',fontFamily:'inherit'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:600}}><i className={'ti '+ic} aria-hidden/>{t}</div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{sub}</div>
              </button>
            ))}
          </div>

          {/* Opções por tipo */}
          {tipo==='projeto' && (
            <div style={{marginTop:10,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{fontSize:11,color:'var(--text2)'}}>Valor do projeto (à vista):</div>
              <input type="number" value={valorManual} onChange={e=>setValorManual(e.target.value)} placeholder="ex: 8000"
                style={{padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12,width:140}}/>
              <span style={{fontSize:10,color:'var(--text3)'}}>vazio = usa o valor aprovado da proposta</span>
            </div>
          )}
          {tipo==='ocultas' && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:6}}>Parte do <b>valor cheio</b> e marque as categorias a <b>OCULTAR</b> — o valor vai diminuindo:</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {catsDisponiveis.length? catsDisponiveis.map(c=>(
                  <button key={c} onClick={()=>toggleCat(c)} style={{fontSize:11,padding:'5px 10px',borderRadius:14,cursor:'pointer',
                    border:`1px solid ${hiddenCats.includes(c)?'#DC2626':'var(--border)'}`,
                    background:hiddenCats.includes(c)?'rgba(220,38,38,0.15)':'var(--bg)',
                    color:hiddenCats.includes(c)?'#FCA5A5':'var(--text2)',fontFamily:'inherit',textDecoration:hiddenCats.includes(c)?'line-through':'none'}}>
                    {hiddenCats.includes(c)?'🚫 ':''}{c}</button>
                )):<span style={{fontSize:11,color:'var(--text3)'}}>Nenhuma categoria detectada nos itens da proposta.</span>}
              </div>
              {(()=>{ const cheio=valorCheioUI(); const atual=totalAtualUI()
                return <div style={{marginTop:8,display:'flex',gap:16,alignItems:'center',fontSize:12}}>
                  <span style={{color:'var(--text3)'}}>Valor cheio: <b style={{textDecoration:hiddenCats.length?'line-through':'none'}}>{fmt(cheio)}</b></span>
                  {hiddenCats.length>0 && <span style={{color:'#FCA5A5'}}>− {fmt(cheio-atual)}</span>}
                  <span style={{color:'var(--green)',fontWeight:700}}>Contrato: {fmt(atual)}</span>
                </div> })()}
            </div>
          )}
          {tipo==='avulsa' && (
            <div style={{marginTop:10,display:'grid',gap:8}}>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{fontSize:11,color:'var(--text2)'}}>Valor (R$):</div>
                <input type="number" value={valorManual} onChange={e=>setValorManual(e.target.value)} placeholder="vazio = valor da proposta"
                  style={{padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12,width:200}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>Forma de pagamento (texto livre):</div>
                <input value={pagamentoCustom} onChange={e=>setPagamentoCustom(e.target.value)} placeholder="ex: 3 parcelas iguais via PIX, sendo a 1ª na assinatura..."
                  style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>Objeto do contrato (texto livre, opcional):</div>
                <input value={objetoCustom} onChange={e=>setObjetoCustom(e.target.value)} placeholder="ex: manutenção mensal dos sistemas de automação..."
                  style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
              </div>
            </div>
          )}
          {/* Cláusulas editáveis — disponível em TODOS os tipos */}
          <details style={{marginTop:12,borderTop:'1px solid var(--border)',paddingTop:10}}>
            <summary style={{fontSize:12,fontWeight:600,color:'var(--text1)',cursor:'pointer',listStyle:'none',display:'flex',alignItems:'center',gap:6}}>
              <i className="ti ti-edit" aria-hidden/>Personalizar pagamento, prazo e garantia (opcional)
            </summary>
            <div style={{display:'grid',gap:8,marginTop:10}}>
              {tipo!=='avulsa' && <div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>Forma de pagamento <span style={{color:'var(--text3)'}}>(vazio = padrão do tipo)</span></div>
                <input value={pagamentoCustom} onChange={e=>setPagamentoCustom(e.target.value)} placeholder={tipo==='projeto'?'padrão: à vista no ato':'padrão: 50% assinatura + 50% entrega'}
                  style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
              </div>}
              <div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>Prazo <span style={{color:'var(--text3)'}}>(vazio = padrão)</span></div>
                <input value={prazoCustom} onChange={e=>setPrazoCustom(e.target.value)} placeholder="ex: 30 dias úteis a partir da assinatura"
                  style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>Garantia <span style={{color:'var(--text3)'}}>(vazio = padrão)</span></div>
                <input value={garantiaCustom} onChange={e=>setGarantiaCustom(e.target.value)} placeholder="ex: 90 dias de instalação + garantia de fábrica"
                  style={{width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',fontSize:12}}/>
              </div>
            </div>
          </details>
        </div>
        {/* Contract preview */}
        <iframe
          srcDoc={buildContract(proposal, client, opts)}
          style={{flex:1,border:'none',width:'100%'}}
          title="Contrato RARO Home"
        />
      </div>
    </div>
  )
}
