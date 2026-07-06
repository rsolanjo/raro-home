import { useState } from 'react'
import { LOGO_COVER } from '../logos.js'
import { demoWatermark } from '../brand.js'

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
  const ROG_SIG = `<div style="position:relative;display:inline-block"><div style="font-family:'Dancing Script',cursive;font-size:28px;color:#0369A1;opacity:0.9;letter-spacing:1px;line-height:1">RARO Home</div><div style="position:absolute;bottom:-2px;left:0;right:0;height:0.5px;background:#0369A1;opacity:0.4"></div></div>`

  // ── Configuração por TIPO de contrato ──────────────────────────────
  const ehProjeto = tipo==='projeto'
  const tituloDoc = ehProjeto ? 'Contrato de Projeto e Acompanhamento Técnico'
    : tipo==='avulsa' ? 'Contrato de Prestação de Serviços'
    : 'Contrato de Fornecimento, Instalação e Automação'
  const tipoBadge = ehProjeto ? 'PROJETO · ACOMPANHAMENTO'
    : tipo==='ocultas' ? 'FORNECIMENTO + INSTALAÇÃO'
    : tipo==='avulsa' ? 'SERVIÇO PERSONALIZADO' : 'FORNECIMENTO + INSTALAÇÃO'
  // Identificação do IMÓVEL da obra (onde a automação acontece) — montado dos campos do cliente.
  // Complemento só com número (ex.: "202") é tratado como apartamento; "Casa 2", "Sala 30" etc. entram como vieram.
  const _ocli = client||{}
  const _obRuaNum = [_ocli.street, _ocli.number?('nº '+String(_ocli.number)):''].filter(Boolean).join(', ')
  const _obCidUf = _ocli.city ? (_ocli.city + (_ocli.state?(' – '+_ocli.state):'')) : (_ocli.state||'')
  const _obApos = [_ocli.neighborhood, _obCidUf, _ocli.cep?('CEP '+_ocli.cep):''].filter(Boolean).join(', ')
  const _obRuaFull = [_obRuaNum, _obApos].filter(Boolean).join(', ')
  const _imovel = (()=>{
    let u = (_ocli.complement||'').trim()
    if(u && /^\d+\s*[A-Za-z]?$/.test(u)) u = 'apartamento '+u.replace(/\s+/g,'')   // só número → apartamento
    const fem = /^(casa|sala|cobertura|loja|unidade|quadra|kitnet|kitchenette|su[ií]te)\b/i.test(u)
    if(!u) return { a:'ao', em:'no', txt: _obRuaFull ? `imóvel localizado na ${_obRuaFull}` : 'imóvel objeto deste contrato' }
    const corpo = _obRuaFull ? `${u}, localizad${fem?'a':'o'} na ${_obRuaFull}` : u
    return { a: fem?'à':'ao', em: fem?'na':'no', txt: corpo }
  })()
  // Objeto do contrato
  const objetoTxt = opts.objetoCustom
    ? opts.objetoCustom
    : ehProjeto
    ? `O presente instrumento tem por objeto a elaboração do <strong>projeto técnico de automação residencial e infraestrutura</strong>, bem como o <strong>acompanhamento técnico</strong> da implantação das soluções previstas. Os serviços destinam-se ${_imovel.a} ${_imovel.txt}, conforme escopo técnico nº <strong>${proposal.code}</strong>. Este instrumento <strong>não inclui</strong> o fornecimento de equipamentos, materiais ou a execução física da instalação, que poderão ser contratados posteriormente por meio de proposta e contrato específicos.`
    : tipo==='avulsa'
    ? `O presente instrumento tem por objeto a prestação de serviços conforme escopo técnico nº <strong>${proposal.code}</strong>, que integra este contrato como Anexo I. Os serviços serão executados ${_imovel.em} ${_imovel.txt}.`
    : `O presente instrumento tem por objeto a prestação de serviços de automação residencial, fornecimento, instalação e configuração de equipamentos de tecnologia, conforme proposta técnica nº <strong>${proposal.code}</strong>, que integra este contrato como Anexo I. Os serviços serão executados ${_imovel.em} ${_imovel.txt}.`
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
    ['DO PRAZO DE ENTREGA DO PROJETO', prazoTxt],
    ['DO ACOMPANHAMENTO TÉCNICO','O acompanhamento técnico contempla visita técnica, suporte ilimitado e orientação durante a execução, visando assegurar a conformidade da instalação com o projeto desenvolvido. A CONTRATADA esclarecerá dúvidas e validará as etapas conforme combinado entre as partes.'],
    ['DA PROPRIEDADE INTELECTUAL', garantiaTxt],
    ['DAS REVISÕES','Estão incluídas até 3 (três) revisões do projeto. Revisões adicionais ou mudanças de escopo poderão ser cobradas à parte.'],
    ['DO SUPORTE','Dúvidas sobre o projeto serão atendidas via WhatsApp, no número (21) 98170-9009, de segunda a sexta, das 9h às 18h.'],
    ['DA CONFIDENCIALIDADE','As partes comprometem-se a manter sigilo sobre as informações técnicas, comerciais e pessoais trocadas no âmbito deste contrato.'],
  ] : [
    ['DO PRAZO', prazoTxt],
    ['DA GARANTIA', garantiaTxt],
    ['DO SUPORTE PÓS-ENTREGA','A CONTRATADA prestará suporte técnico via WhatsApp no número (21) 98170-9009, de segunda a sexta, das 9h às 18h. Atendimentos emergenciais fora deste horário poderão ser cobrados separadamente.'],
    ['DAS OBRIGAÇÕES DO CONTRATANTE','Garantir acesso ao imóvel nos horários acordados; fornecer energia elétrica estabilizada no local de instalação; não efetuar modificações nos sistemas instalados sem prévia autorização técnica da CONTRATADA; manter os equipamentos afastados de fontes de umidade excessiva e calor.'],
    ['DAS EXCLUSÕES DE GARANTIA','Não estão cobertos: danos causados por mau uso, sobretensão elétrica, raio, inundação, quedas físicas, modificações realizadas por pessoas não autorizadas, ou uso fora das especificações técnicas dos fabricantes.'],
    ['DO CANCELAMENTO','Em caso de cancelamento por parte do CONTRATANTE após o início da execução dos serviços, serão devidos os valores proporcionais aos serviços já prestados e materiais já adquiridos, acrescidos de multa de <strong>20% (vinte por cento)</strong> sobre o valor total contratado.'],
    ['DA CONFIDENCIALIDADE','As partes comprometem-se a manter sigilo sobre as informações técnicas, comerciais e pessoais trocadas no âmbito deste contrato.'],
  ]
  // cláusulas extras (avulsa)
  const extras = (opts.clausulasExtras||[]).filter(x=>(x.titulo||x.texto))
  extras.forEach(x=>clausulas.push([x.titulo||'CLÁUSULA ADICIONAL', x.texto||'']))

  // qualificação do contratante (apenas 1) — CPF opcional/ocultável; o endereço aparece no objeto como local da obra
  const hideCpf = !!opts.hideCpf
  const _cpf1q = hideCpf ? '' : (client?.cpf1 ? `, portador do CPF nº ${client.cpf1}` : ', portador do CPF nº ___.___.___-__')
  const contratanteQualif = `<strong>${name1}</strong>${_cpf1q}.`

  // ── MODELO CLÁSSICO ────────────────────────────────────────────────
  // Layout enxuto e institucional (fiel ao contrato R&-5683). Vale para QUALQUER tipo.
  // Reaproveita todo o cálculo acima (total, extenso, cláusulas, escopo). Só muda a diagramação.
  if(opts.modelo==='classico'){
    return buildContractClassico({
      proposal, client, tipo, ehProjeto, tituloDoc, objetoTxt, pagamentoTxt,
      scopeRooms, mostraEscopoItens, total, totalExtenso, clausulas,
      name1, housing, hideCpf, today
    })
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>${tituloDoc} — ${client?.name1||proposal.client_name||'Cliente'}${proposal.code?' ('+proposal.code+')':''}</title>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  @page{ size:A4; margin:0 }
  body{ font-family:'EB Garamond','Georgia',serif; font-size:11.7px; line-height:1.47; color:#23282F; text-align:justify; background:#fff; padding:0; hyphens:auto; -webkit-font-smoothing:antialiased }
  .sheet{ padding:10mm 15mm 7mm }
  @media print{ .no-print{display:none!important} }
  .head{ text-align:center; margin-bottom:3px }
  .head img{ width:80px; height:auto; margin:0 auto 4px; display:block }
  .head .firm{ font-size:10px; color:#5C6470; line-height:1.5 }
  .head .firm strong{ color:#1A2740 }
  .rule{ border:none; border-top:1px solid #9C7B45; width:60%; margin:5px auto 2px }
  .rule.thin{ border-top:1px solid #E3E6EB; width:100%; margin:5px auto }
  .title{ text-align:center; font-weight:600; font-size:16px; color:#1A2740; letter-spacing:.4px; margin:5px 0 3px; line-height:1.2 }
  .subtitle{ text-align:center; font-size:10.5px; font-style:italic; color:#5C6470; margin-bottom:7px }
  .preamble p{ margin-bottom:4px }
  .party-line{ margin:4px 0; padding-left:16px }
  .party-line .lbl{ font-variant:small-caps; font-weight:600; letter-spacing:.5px; color:#1A2740 }
  .clause{ margin:5px 0; break-inside:avoid }
  .clause-h{ font-weight:600; font-size:12px; color:#1A2740; letter-spacing:.6px; margin-bottom:3px; text-align:left }
  .clause-b p{ margin-bottom:3px }
  .value{ text-align:center; margin:5px auto; padding:4px 0; border-top:1px solid #CDD2DA; border-bottom:1px solid #CDD2DA; width:78% }
  .value .vl{ font-variant:small-caps; letter-spacing:2px; font-size:10px; color:#9C7B45 }
  .value .vn{ font-size:19px; font-weight:600; color:#1A2740; line-height:1.15; margin:2px 0 1px }
  .value .ve{ font-size:10.5px; font-style:italic; color:#5C6470 }
  table.scope{ width:100%; border-collapse:collapse; margin:9px 0; font-size:10.7px }
  table.scope td{ padding:7px 4px; border-bottom:1px solid #E3E6EB; vertical-align:top }
  table.scope td.amb{ font-weight:600; color:#1A2740; width:30%; white-space:nowrap }
  table.scope tr:first-child td{ border-top:1px solid #CDD2DA }
  strong{ font-weight:600; color:#1A2740 }
  .nota{ font-style:italic; color:#5C6470; font-size:10.5px; margin-top:6px }
  .closing{ margin:4px 0 2px }
  .sigs{ display:flex; gap:50px; padding-top:3mm; break-inside:avoid }
  .sig{ flex:1; text-align:center }
  .sigspace{ height:27px; display:flex; align-items:flex-end; justify-content:center; padding-bottom:3px }
  .sigline{ border-top:1px solid #23282F; margin-bottom:5px }
  .signame{ font-weight:600; color:#1A2740; font-size:11px }
  .sigrole{ font-size:9.5px; font-style:italic; color:#5C6470 }
  .hand{ font-style:italic; font-size:19px; color:#1A2740 }
  .footer{ margin-top:5px; padding-top:5px; border-top:1px solid #E3E6EB; font-size:8.5px; color:#9AA1AB; text-align:center; line-height:1.6 }
  </style>
</head><body>${demoWatermark()}
  <div class="no-print" style="position:sticky;top:0;background:#1A2740;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;font-size:11px;z-index:99">
    <span>${tituloDoc} — ${proposal.code||''} — ${client?.name1||proposal.client_name||''}</span>
    <button onclick="window.print()" style="background:#9C7B45;color:#fff;border:none;padding:6px 16px;border-radius:4px;font-size:11px;cursor:pointer;font-family:sans-serif">⬇ Salvar como PDF</button>
  </div>

  <div class="sheet">
  <div class="head">
    <img src="${LOGO_CONTRACT}" alt="RARO Home"/>
    <div class="firm"><strong>RARO Home Tecnologia</strong> · contato@rarohome.com.br · (21) 98170-9009<br/>www.rarohome.com.br · @rarohome</div>
    <hr class="rule"/>
  </div>

  <div class="title">${tituloDoc}</div>
  <div class="subtitle">Contrato nº ${proposal.code||proposal.id} · Rio de Janeiro, ${today}</div>

  <div class="preamble">
    <p>Pelo presente instrumento particular, as partes a seguir qualificadas:</p>
    <div class="party-line"><span class="lbl">Contratada:</span> <strong>RARO Home Tecnologia</strong>, prestadora de serviços de automação residencial, com sede no Rio de Janeiro/RJ, neste ato representada por <strong>seu representante legal</strong>.</div>
    <div class="party-line"><span class="lbl">Contratante:</span> ${contratanteQualif}</div>
    <p>As partes, de comum acordo, resolvem celebrar o presente contrato, que se regerá pelas cláusulas e condições a seguir.</p>
  </div>

  <div class="clause">
    <div class="clause-h">CLÁUSULA 1ª — DO OBJETO</div>
    <div class="clause-b">
      <p>${objetoTxt}</p>
      ${mostraEscopoItens?`<p style="margin-top:4px">Os ambientes e itens contemplados são os seguintes:</p>
      <table class="scope">${scopeRooms.map(r=>`<tr><td class="amb">${r.name}</td><td>${r.itemList.join(', ')}.</td></tr>`).join('')}</table>`:''}
    </div>
  </div>

  <div class="clause">
    <div class="clause-h">CLÁUSULA 2ª — DO VALOR E DA FORMA DE PAGAMENTO</div>
    <div class="clause-b">
      <p>${ehProjeto?'Pelo projeto técnico e pelo acompanhamento objeto deste contrato':'Pelos serviços e equipamentos objeto deste contrato'}, o CONTRATANTE pagará à CONTRATADA o valor total de:</p>
      <div class="value">
        <div class="vl">${ehProjeto?'Valor do projeto e acompanhamento':'Investimento total do projeto'}</div>
        <div class="vn">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        <div class="ve">(${totalExtenso})</div>
      </div>
      <p>${pagamentoTxt}</p>
      ${ehProjeto?'':`<p class="nota">O detalhamento completo dos equipamentos por ambiente consta na Proposta Técnica nº ${proposal.code}, parte integrante deste contrato.</p>`}
    </div>
  </div>

  ${clausulas.map((cl,i)=>`<div class="clause"><div class="clause-h">CLÁUSULA ${i+3}ª — ${cl[0]}</div><div class="clause-b"><p>${cl[1]}</p></div></div>`).join('')}

  <hr class="rule thin"/>
  <div class="closing">
    <p>E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, declarando tê-lo lido, compreendido e aceito integralmente.</p>
    <p style="margin-top:4px"><strong>Rio de Janeiro, ${today}.</strong></p>
  </div>

  <div class="sigs">
    <div class="sig"><div class="sigspace"></div><div class="sigline"></div><div class="signame">${name1}</div><div class="sigrole">Contratante${(!hideCpf&&client?.cpf1)?' · CPF '+client.cpf1:''}</div></div>
    <div class="sig"><div class="sigspace"></div><div class="sigline"></div><div class="signame">RARO Home Tecnologia</div><div class="sigrole">Contratada</div></div>
  </div>

  <div class="footer">
    RARO Home Tecnologia · contato@rarohome.com.br · (21) 98170-9009 · www.rarohome.com.br<br/>
    Contrato nº ${proposal.code||proposal.id} · Emitido em ${today}${proposal.valid_days?' · Proposta válida por '+proposal.valid_days+' dias':''}
  </div>
  </div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELO CLÁSSICO — layout enxuto e institucional, fiel ao contrato R&-5683.
// Recebe os dados já calculados pelo buildContract. Vale para qualquer tipo.
// Cabeçalho azul, seções numeradas 1..5, cláusulas 4.1..4.x, assinatura cursiva.
// ═══════════════════════════════════════════════════════════════════════════
function buildContractClassico(D){
  const { proposal, client, ehProjeto, tituloDoc, objetoTxt, pagamentoTxt,
    scopeRooms, mostraEscopoItens, total, totalExtenso, clausulas,
    name1, housing, hideCpf, today } = D
  const code = proposal.code || proposal.id
  const contato = [client?.phone1, client?.email].filter(Boolean).join(' · ') || '— · —'
  const _rua = [client?.street, client?.number].filter(Boolean).join(', ')
  const _resto = [client?.neighborhood, client?.city, client?.state].filter(Boolean).join(', ')
  const local = [_rua, _resto, client?.cep?('CEP '+client.cep):''].filter(Boolean).join(' — ') || '—'
  // ambientes em grid (nome + contagem), como no PDF
  const ambientes = scopeRooms.map(r=>`<div class="amb-item"><span class="dia">◈</span> ${r.name} <span class="cnt">(${r.total} ${r.total===1?'item':'itens'})</span></div>`).join('')
  // cláusulas numeradas 4.1, 4.2... (tira <strong> do título, mantém no corpo)
  const clausulasHtml = clausulas.map((cl,i)=>`<p class="cond"><span class="cnum">4.${i+1}</span> <span class="ctit">${cl[0]}:</span> ${cl[1]}</p>`).join('')
  const objetoLimpo = objetoTxt.replace(/<\/?strong>/g,'')
  const pagamentoLimpo = (pagamentoTxt||'').replace(/<\/?strong>/g,'')

  return `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>${tituloDoc} — ${name1||proposal.client_name||'Cliente'}${code?' ('+code+')':''}</title>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  @page{ size:A4; margin:0 }
  body{ font-family:'Helvetica Neue',Arial,sans-serif; font-size:9.4px; line-height:1.5; color:#2B2B2B; background:#fff }
  .sheet{ padding:14mm 16mm }
  @media print{ .no-print{display:none!important} }
  .brandbar{ text-align:center; margin-bottom:10px }
  .brandbar img{ width:66px; height:auto; margin:0 auto 6px; display:block }
  .doctitle{ font-size:15px; font-weight:700; color:#1C6AA6; letter-spacing:2px; text-transform:uppercase }
  .docsub{ font-size:10px; color:#5A6B78; font-style:italic; margin-top:2px }
  .brandmeta{ font-size:8px; color:#8A97A2; margin-top:6px; line-height:1.6 }
  .brandmeta b{ color:#1C6AA6; font-weight:600 }
  .cnumber{ font-size:8.5px; color:#5A6B78; margin-top:5px }
  .sech{ color:#1C6AA6; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; margin:16px 0 7px; padding-bottom:3px; border-bottom:1.5px solid #DCE6EE }
  .parties{ display:flex; gap:26px }
  .party{ flex:1 }
  .party .role{ font-size:8px; font-weight:700; letter-spacing:1px; color:#1C6AA6; text-transform:uppercase; margin-bottom:5px }
  .field{ margin-bottom:5px }
  .field .k{ font-size:7px; letter-spacing:1.5px; color:#9AA7B1; text-transform:uppercase }
  .field .v{ font-size:9.6px; color:#2B2B2B }
  .amb-head{ font-size:8px; font-weight:700; letter-spacing:1px; color:#5A6B78; text-transform:uppercase; margin:9px 0 5px }
  .amb-grid{ display:grid; grid-template-columns:1fr 1fr; gap:3px 20px }
  .amb-item{ font-size:9.2px; color:#2B2B2B }
  .amb-item .dia{ color:#1C6AA6 }
  .amb-item .cnt{ color:#8A97A2 }
  .valuebox{ text-align:center; margin:6px 0 8px }
  .valuebox .k{ font-size:8px; letter-spacing:2px; color:#1C6AA6; text-transform:uppercase }
  .valuebox .v{ font-size:22px; font-weight:700; color:#1A2740; margin:3px 0 1px }
  .valuebox .e{ font-size:9.5px; font-style:italic; color:#5A6B78 }
  .obj, .paytext{ text-align:justify; margin-bottom:4px }
  .nota{ font-size:8.6px; font-style:italic; color:#7A8794; margin-top:5px }
  .cond{ text-align:justify; margin-bottom:6px }
  .cnum{ color:#1C6AA6; font-weight:700 }
  .ctit{ font-weight:700; color:#1A2740; letter-spacing:.3px }
  .accept{ margin:6px 0 0; text-align:justify }
  .sigs{ display:flex; gap:60px; margin-top:26px }
  .sig{ flex:1; text-align:center }
  .sigline{ border-top:1px solid #9AA7B1; margin-bottom:5px; height:34px }
  .signame{ font-weight:700; color:#1A2740; font-size:10px }
  .sigrole{ font-size:8px; color:#7A8794; margin-top:1px }
  .hand{ font-family:'Dancing Script',cursive; font-size:26px; color:#1C6AA6; line-height:1; margin-bottom:-4px }
  .foot{ margin-top:16px; padding-top:8px; border-top:1px solid #E4E9ED; text-align:center; font-size:7.8px; color:#9AA7B1; line-height:1.7 }
  </style>
</head><body>${demoWatermark()}
  <div class="no-print" style="position:sticky;top:0;background:#1C6AA6;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-size:11px;z-index:99">
    <span>${tituloDoc} · modelo clássico — ${code} — ${name1||proposal.client_name||''}</span>
    <button onclick="window.print()" style="background:#fff;color:#1C6AA6;border:none;padding:6px 16px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600">⬇ Salvar como PDF</button>
  </div>

  <div class="sheet">
    <div class="brandbar">
      <img src="${LOGO_CONTRACT}" alt="RARO Home"/>
      <div class="doctitle">Contrato de Prestação de Serviços</div>
      <div class="docsub">${ehProjeto?'Termo de Execução de Projeto':'Termo de Execução de Projeto'}</div>
      <div class="brandmeta">Automação Residencial · Tecnologia · Lazer<br/><b>RARO Home Tecnologia</b><br/>contato@rarohome.com.br · (21) 98170-9009<br/>www.rarohome.com.br · @rarohome</div>
      <div class="cnumber">Contrato nº ${code} &nbsp;·&nbsp; Rio de Janeiro, ${today}</div>
    </div>

    <div class="sech">1. Partes Contratantes</div>
    <div class="parties">
      <div class="party">
        <div class="role">Contratada</div>
        <div class="field"><div class="k">Empresa</div><div class="v">RARO Home Tecnologia</div></div>
        <div class="field"><div class="k">Responsável</div><div class="v">Rogério Silva</div></div>
      </div>
      <div class="party">
        <div class="role">Contratante</div>
        <div class="field"><div class="k">Nome completo</div><div class="v">${name1||'—'}</div></div>
        <div class="field"><div class="k">Contato</div><div class="v">${contato}</div></div>
        <div class="field"><div class="k">Local de execução</div><div class="v">${local}</div></div>
        <div class="field"><div class="k">Tipo de imóvel</div><div class="v">${housing||'residencial'}</div></div>
      </div>
    </div>

    <div class="sech">2. Objeto do Contrato</div>
    <div class="obj">${objetoLimpo}</div>
    ${mostraEscopoItens?`<div class="amb-head">Ambientes contemplados:</div><div class="amb-grid">${ambientes}</div>`:''}

    <div class="sech">3. Valor Total e Forma de Pagamento</div>
    <div class="valuebox">
      <div class="k">${ehProjeto?'Valor do projeto e acompanhamento':'Investimento total do projeto'}</div>
      <div class="v">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
      <div class="e">(${totalExtenso})</div>
    </div>
    <div class="paytext">${pagamentoLimpo || 'O valor total inclui fornecimento de todos os equipamentos, materiais, mão de obra especializada, instalação, configuração, testes e treinamento ao contratante. A forma de pagamento será definida conforme acordado na proposta comercial.'}</div>
    ${ehProjeto?'':`<div class="nota">Nota: O detalhamento completo dos equipamentos por ambiente consta na Proposta Técnica nº ${code}, parte integrante deste contrato.</div>`}

    <div class="sech">4. Cláusulas e Condições</div>
    ${clausulasHtml}

    <div class="sech">5. Aceite e Assinaturas</div>
    <div class="accept">As partes declaram ter lido, compreendido e concordado com todas as cláusulas deste instrumento, assinando-o em duas vias de igual teor e forma.</div>
    <p style="margin-top:8px"><strong>Rio de Janeiro, ${today}.</strong></p>

    <div class="sigs">
      <div class="sig"><div class="sigline"></div><div class="signame">${name1||'—'}</div><div class="sigrole">Contratante · CPF: ${hideCpf?'—':(client?.cpf1||'___.___.___-__')}</div></div>
      <div class="sig"><div class="hand">Rogério Silva</div><div class="sigline" style="border-top:none;height:0;margin-bottom:5px"></div><div class="signame">Rogério Silva</div><div class="sigrole">RARO Home Tecnologia · Contratada</div></div>
    </div>

    <div class="foot">
      RARO Home Tecnologia · contato@rarohome.com.br · (21) 98170-9009 · www.rarohome.com.br<br/>
      Contrato nº ${code} · Emitido em ${today}${proposal.valid_days?' · Proposta válida por '+proposal.valid_days+' dias':' · Proposta válida por 30 dias'}
    </div>
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
    cpf2: baseClient?.cpf2 || '',
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
    cpf1:edits.cpf1, cpf:edits.cpf1, cpf2:edits.cpf2, street:edits.street, number:edits.number, complement:edits.complement,
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
      const st = j.statusLabel || j.status || 'desconhecido'
      let msg = `Status: ${st}\n`
      if(Array.isArray(j.signers) && j.signers.length){
        msg += '\nSignatários:\n'
        j.signers.forEach(s=>{ msg += `• ${s.name||s.email}: ${s.signed?'✓ ASSINADO'+(s.signed_at?' em '+new Date(s.signed_at).toLocaleDateString('pt-BR'):''):'⏳ Pendente'}\n` })
      } else if(j.progress?.total){
        msg += `Progresso: ${j.progress.signed||0} de ${j.progress.total} assinaram\n`
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
  const [modelo, setModelo] = useState('novo')  // 'novo' (layout atual) | 'classico' (layout enxuto R&-5683)
  const [valorManual, setValorManual] = useState('')
  const [hiddenCats, setHiddenCats] = useState([])
  const [pagamentoCustom, setPagamentoCustom] = useState('')
  const [objetoCustom, setObjetoCustom] = useState('')
  const [prazoCustom, setPrazoCustom] = useState('')
  const [garantiaCustom, setGarantiaCustom] = useState('')
  const [hideCpf, setHideCpf] = useState(false)
  // categorias presentes na proposta (para o modo "ocultas")
  const catsDisponiveis = (()=>{ try{
    const fl = Array.isArray(proposal.floors)?proposal.floors:(typeof proposal.floors==='string'?JSON.parse(proposal.floors||'[]'):[])
    const s=new Set(); fl.forEach(f=>(f.rooms||[]).forEach(r=>(r.items||[]).forEach(it=>{ const c=(it.category||it.cat||'').trim(); if(c)s.add(c) })))
    const arr=[...s].sort()
    if(Number(proposal.labor)>0) arr.push('Mão de obra')   // mão de obra é ocultável
    return arr
  }catch{return []} })()
  const opts = { tipo, modelo, valorManual, hiddenCats, hideCpf,
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
    // Abre via document.write para que o <title> vire o nome sugerido do PDF.
    // (Não usamos o render do servidor aqui: o Chromium serverless não roda de forma
    //  confiável neste Vercel; a margem é controlada pelo padding do corpo no @media print.)
    const html = buildContract(proposal, client, opts)
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close(); return }
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
    const msg = encodeURIComponent(`Olá ${name}! 🏠\n\nSeguem os documentos do seu projeto RARO Home:\n📋 *Proposta:* ${proposal.code}\n💰 *Total:* R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}\n\nO contrato foi enviado em anexo nesta conversa para sua assinatura.\n\nQualquer dúvida estou à disposição!\n— RARO Home\n📱 (21) 98170-9009`)
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
  function abrirWhatsappCliente(){
    const tel = String(client?.phone1||'').replace(/\D/g,'')
    if(!tel){ alert('O cliente não tem telefone cadastrado. Adicione o telefone nos dados do cliente acima.'); return }
    const num = tel.startsWith('55') ? tel : '55'+tel
    const msg = encodeURIComponent(`Olá ${client?.name||''}! 👋\n\nSegue o link para você assinar digitalmente o contrato da RARO Home (validade jurídica, ICP-Brasil):\n\n👉 cole aqui o link copiado da Assinafy\n\nQualquer dúvida, é só chamar.`)
    window.open(`https://wa.me/${num}?text=${msg}`,'_blank')
  }
  async function enviarParaAssinatura(){
    const emailCliente = (client?.email||'').trim()
    if(!emailCliente){ alert('O cliente não tem e-mail cadastrado. Adicione o e-mail nos dados acima para enviar para assinatura.'); return }
    if(!window.confirm(`Enviar o contrato para assinatura digital?\n\nSerá enviado para:\n• ${bothNames} <${emailCliente}>\n• RARO Home <contato@rarohome.com.br>\n\nVia Assinafy (ICP-Brasil).`)) return
    setSigning(true)
    try{
      const htmlBase = buildContract(proposal, client, opts)
      let pdfBase64 = null

      // ── CAMINHO 1 (preferencial): gerar no SERVIDOR via Chromium → PDF com TEXTO VETORIAL,
      // nítido em qualquer zoom. Tira a barra de controle e o padding (a margem vem do A4).
      try{
        const htmlSrv = htmlBase
          .replace(/<div class="no-print"[\s\S]*?<\/div>/, '')
          .replace('</head>', '<style>body{padding:0 !important}</style></head>')
        const rr = await fetch('/api/render-pdf', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ html: htmlSrv })
        })
        if(rr.ok){
          const rj = await rr.json().catch(()=>({}))
          if(rj && rj.pdfBase64 && rj.pdfBase64.length > 5000) pdfBase64 = rj.pdfBase64
        }
      }catch(_){ /* servidor indisponível → cai no navegador abaixo */ }

      // ── CAMINHO 2 (fallback): gerar no NAVEGADOR (html2canvas) caso o servidor não responda.
      if(!pdfBase64){
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        if(!window.html2canvas) throw new Error('html2canvas não carregou do CDN')
        if(!(window.jspdf && window.jspdf.jsPDF)) throw new Error('jsPDF não carregou do CDN')

        let html = htmlBase
        // a EB Garamond (web font) sai com as PALAVRAS GRUDADAS no html2canvas mesmo embutida.
        // Forçamos Georgia (serif do sistema), que o html2canvas rasteriza com o espaçamento correto.
        html = html
          .replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^'"]*['"]\);?/g, '')
          .replace('</head>', "<style>*{font-family:Georgia,'Times New Roman','Times',serif !important} body{font-size:12.3px !important}</style></head>")
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:300px;border:none;background:#fff'
        document.body.appendChild(iframe)
        const idoc = iframe.contentDocument || iframe.contentWindow.document
        idoc.open(); idoc.write(html); idoc.close()
        await new Promise(r=>setTimeout(r,1800))
        try{
          const _logo = idoc.querySelector('.head img')
          if(_logo && /^data:image\/svg/.test(_logo.src||'')){
            await new Promise(res=>{
              const probe = new Image()
              probe.onload = ()=>{
                try{
                  const W=360, H=Math.round(W*(probe.naturalHeight||694)/(probe.naturalWidth||600))
                  const cv=document.createElement('canvas'); cv.width=W; cv.height=H
                  const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,W,H); cx.drawImage(probe,0,0,W,H)
                  _logo.src=cv.toDataURL('image/png'); _logo.setAttribute('width','120'); _logo.removeAttribute('height')
                }catch(_){}
                res()
              }
              probe.onerror=()=>res()
              probe.src=_logo.src
            })
            await new Promise(r=>setTimeout(r,200))
          }
        }catch(_){}
        idoc.querySelectorAll('.no-print').forEach(el=>el.remove())
        idoc.body.style.textAlign = 'left'
        try{ if(idoc.fonts && idoc.fonts.ready){ await idoc.fonts.ready } }catch(_){}
        // altura REAL do conteúdo (fundo do último elemento), ignorando o espaço morto do fim
        let _cb = idoc.body.scrollHeight
        try{
          const _bt = idoc.body.getBoundingClientRect().top
          const _last = idoc.querySelector('.footer') || idoc.body.lastElementChild
          if(_last){ _cb = Math.ceil(_last.getBoundingClientRect().bottom - _bt) + 14 }
        }catch(_){}
        const fullH = Math.max(_cb, 1123)
        iframe.style.height = fullH+'px'
        await new Promise(r=>setTimeout(r,250))
        const canvas = await window.html2canvas(idoc.body, {
          scale:3, useCORS:true, logging:false, backgroundColor:'#ffffff',
          width:794, windowWidth:794, windowHeight:fullH, x:0, y:0, scrollX:0, scrollY:0
        })
        const imgData = canvas.toDataURL('image/png')
        const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF
        if(!JsPDF) throw new Error('jsPDF não disponível')
        const pdf = new JsPDF({ unit:'mm', format:'a4', orientation:'portrait' })
        const pageW = 210, pageH = 297
        let imgW = pageW
        let imgH = canvas.height * pageW / canvas.width
        // se o conteúdo estoura 2 páginas por pouco (até ~2.6), encaixa em 2 páginas exatas,
        // comprimindo proporcionalmente (sobra uma margem lateral mínima). Mata a 3ª página.
        const naturalPages = Math.ceil((imgH - 2) / pageH)
        if(naturalPages >= 3 && imgH <= 2.6 * pageH){
          const r = (2 * pageH) / imgH
          imgW = pageW * r; imgH = 2 * pageH
        }
        const xOff = (pageW - imgW) / 2
        let heightLeft = imgH, position = 0
        pdf.addImage(imgData, 'PNG', xOff, position, imgW, imgH, undefined, 'FAST')
        heightLeft -= pageH
        while(heightLeft > 12){
          position -= pageH
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', xOff, position, imgW, imgH, undefined, 'FAST')
          heightLeft -= pageH
        }
        const pdfBlob = pdf.output('blob')
        document.body.removeChild(iframe)
        if(!pdfBlob || pdfBlob.size < 5000) throw new Error('PDF (fallback) inválido: '+(pdfBlob?.size||0)+' bytes')
        pdfBase64 = await new Promise((res,rej)=>{
          const r=new FileReader()
          r.onload=()=>res(String(r.result).split(',')[1])
          r.onerror=()=>rej(new Error('Erro ao converter PDF para base64'))
          r.readAsDataURL(pdfBlob)
        })
      }

      if(!pdfBase64) throw new Error('Não foi possível gerar o PDF do contrato.')

      // 5) envia para a função serverless /api/sign
      const resp = await fetch('/api/sign', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          fileName:`Contrato-${proposal.code||'RARO'}.pdf`, pdfBase64,
          signers:[ {name:bothNames, email:emailCliente, phone:client?.phone1, cpf:client?.cpf1}, {name:'RARO Home', email:'contato@rarohome.com.br'} ],
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
          const abrir = window.confirm(`O contrato subiu para a Assinafy, mas o disparo automático não confirmou.\n\nMotivo: ${j.error||'desconhecido'}\n\nMuitas vezes é só o documento ainda processando: aguarde alguns segundos e use "Verificar assinaturas".\n\n→ OK para abrir o painel da Assinafy\n→ Cancelar para ver os detalhes técnicos`)
          if(abrir){
            window.open(`https://app.assinafy.com.br/documents/${j.documentId}`, '_blank')
          } else {
            const det = j.detail ? `\n${JSON.stringify(j.detail).slice(0,300)}` : ''
            const st = j.steps ? `\nEtapas: ${JSON.stringify(j.steps).slice(0,500)}` : ''
            alert(`Detalhes técnicos:\n\nDocumento ID: ${j.documentId}\nSignatários criados: ${(j.signerIds&&j.signerIds.length)||0}\n${j.error||''}${det}${st}`)
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
          <button className="btn" style={{padding:'5px 10px',borderColor:'#7C3AED',color:'#7C3AED'}} onClick={()=>window.open('https://app.assinafy.com.br','_blank')} title="Abrir a Assinafy para assinar como RARO Home e acompanhar">
            <i className="ti ti-external-link" aria-hidden/>Abrir Assinafy
          </button>
          <button className="btn" style={{padding:'5px 10px',borderColor:'#16A34A',color:'#16A34A'}} onClick={abrirWhatsappCliente} title="Abrir o WhatsApp do cliente para enviar o link de assinatura">
            <i className="ti ti-brand-whatsapp" aria-hidden/>WhatsApp pro cliente
          </button>
          <button className="btn" style={{padding:'5px 10px',borderColor:'#D97706',color:'#D97706'}} onClick={()=>window.open('https://webmail.rarohome.com.br','_blank')} title="Abrir o webmail da RARO Home (HostGator) para ver o e-mail de assinatura">
            <i className="ti ti-mail" aria-hidden/>E-mail RARO Home
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
              {[['name1','Nome completo (1º contratante)'],['name2','Nome completo (2º contratante)'],['cpf1','CPF (1º contratante)'],['cpf2','CPF (2º contratante)'],['phone1','Telefone'],['email','E-mail'],['street','Rua / Logradouro do imóvel'],['number','Número'],['complement','Complemento'],['neighborhood','Bairro'],['city','Cidade'],['state','Estado'],['cep','CEP']].map(([k,lb])=>(
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

          {/* Modelo visual do documento (independente do tipo) */}
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <i className="ti ti-layout-board-split" style={{color:'var(--accent)'}} aria-hidden/>
              <b style={{fontSize:13}}>Modelo do documento</b>
              <span style={{fontSize:10.5,color:'var(--text3)'}}>vale para qualquer tipo acima</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                ['novo','Novo','Layout atual, serifado e detalhado','ti-sparkles'],
                ['classico','Clássico','Enxuto e institucional (modelo R&-5683)','ti-file-text'],
              ].map(([v,t,sub,ic])=>(
                <button key={v} onClick={()=>setModelo(v)} style={{textAlign:'left',padding:'10px 12px',borderRadius:8,cursor:'pointer',
                  border:`1.5px solid ${modelo===v?'var(--accent)':'var(--border)'}`,background:modelo===v?'rgba(14,165,233,0.1)':'var(--bg)',color:'var(--text1)',fontFamily:'inherit'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:600}}><i className={'ti '+ic} aria-hidden/>{t}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{sub}</div>
                </button>
              ))}
            </div>
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
          {/* Opções gerais — todos os tipos */}
          <div style={{marginTop:10,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--text2)',cursor:'pointer',userSelect:'none'}}>
              <input type="checkbox" checked={hideCpf} onChange={e=>setHideCpf(e.target.checked)}/>
              Ocultar CPF do cliente
            </label>
            <span style={{fontSize:10,color:'var(--text3)'}}>Contratante único · o endereço do cliente entra como local da obra</span>
          </div>
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
