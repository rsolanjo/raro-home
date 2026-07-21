import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TAXONOMY, inferCategory, genItemId } from '../taxonomy.js'
import { LOGO_EXEC } from '../logos.js'
import { demoWatermark, brandLogoExec, brandName, isDemo } from '../brand.js'
import { openHtmlDoc, safeFileName } from './openDoc.js'
import { supabase } from '../db/supabase.js'

const EQUIP_STYLE = {
  'Gateway':{c:'#0EA5E9',s:'G'},'NVR':{c:'#7C3AED',s:'N'},'Câmera':{c:'#DC2626',s:'C'},
  'Keypad':{c:'#059669',s:'K'},'Hub IR':{c:'#D97706',s:'I'},'Módulo':{c:'#6366F1',s:'M'},
  'Som':{c:'#BE185D',s:'S'},'Wi-Fi':{c:'#0E7490',s:'W'},'Sensor':{c:'#16A34A',s:'P'},
  'Tomada':{c:'#475569',s:'T'},
  'Switch':{c:'#2563EB',s:'SW'},'Patch':{c:'#0891B2',s:'PP'},'Keystone':{c:'#0284C7',s:'KS'},
  'Nobreak':{c:'#B45309',s:'NB'},'Organizador':{c:'#64748B',s:'OR'},'Rack':{c:'#4C1D95',s:'R'},
  'Quadro':{c:'#92540B',s:'QD'},'Interruptor':{c:'#0D9488',s:'S'},'Luz':{c:'#CA8A04',s:'L'},
  'TV':{c:'#7C3AED',s:'TV'},'Fonte':{c:'#9333EA',s:'F'},'Roteador':{c:'#0EA5E9',s:'RT'},'Modem':{c:'#0D9488',s:'ON'},
  'Outro':{c:'#374151',s:'•'},
}

function isRackItem(name='', code='') {
  const n=(name+' '+code).toLowerCase()
  return /\b(hd|nvr|dvr|switch|patch|nobreak|no-break|path ?cord|dream machine|udm|controladora|servidor|fonte|r[aá]ck rack|mini rack|rack)\b/.test(n)
    && !/gateway/.test(n)
}

function equipType(name='') {
  const n=name.toLowerCase()
  if(n.includes('gateway')||n.includes('dream machine')||n.includes('udm')) return 'Gateway'
  if(n.includes('nvr')||n.includes('gravador')||n.includes('dvr')) return 'NVR'
  if(n.includes('câmera')||n.includes('camera')||n.includes('dome')||n.includes('bullet')) return 'Câmera'
  if(n.includes('hub ir')||n.includes('qair')) return 'Hub IR'
  if(n.includes('keypad')||n.includes('botão')||n.includes('pulsador')||n.includes('pulsante')) return 'Keypad'
  if(n.includes('interruptor')) return 'Interruptor'
  if(n.includes('módulo')||n.includes('modulo')||n.includes('qarz')||n.includes('cortina')||n.includes('persiana')) return 'Módulo'
  if(n.includes('subwoofer')||n.includes('amplificador')||n.includes('som')||n.includes('caixa ac')||n.includes('caixa de som')||n.includes('receiver')||n.includes('soundbar')) return 'Som'
  if(n.includes('access point')||n.includes('ponto de acesso')||/\bap\b/.test(n)||n.includes('wi-fi')||n.includes('wifi')||n.includes('u6')||n.includes('u7')||n.includes('uap')) return 'Wi-Fi'
  if(n.includes('ont')||n.includes('modem')||n.includes('fibra')||n.includes('onu')||n.includes('operadora')) return 'Modem'
  if(n.includes('roteador')||n.includes('router')) return 'Roteador'
  if(n.includes('switch')) return 'Switch'
  if(n.includes('patch panel')||n.includes('patch')) return 'Patch'
  if(n.includes('keystone')) return 'Keystone'
  if(n.includes('nobreak')||n.includes('no-break')||n.includes('ups')) return 'Nobreak'
  if(n.includes('organizador')||n.includes('passa cabo')||n.includes('passa-cabo')||n.includes('guia de cabo')) return 'Organizador'
  if((n.includes('rack')||n.includes('cpd'))&&!n.includes('keypad')) return 'Rack'
  if(n.includes('quadro')||n.includes('qdl')||n.includes('disjuntor')||n.includes('dr ')||n.includes('dps')) return 'Quadro'
  if(n.includes('sensor')||n.includes('presença')) return 'Sensor'
  if(n.includes('arandela')||n.includes('luminária')||n.includes('luminaria')||n.includes('spot')||n.includes('lustre')||n.includes('plafon')||n.includes('ponto de luz')||n.includes('fita led')) return 'Luz'
  if(n.includes('tv')||n.includes('telão')||n.includes('televis')||n.includes('projetor')) return 'TV'
  if(n.includes('fonte')) return 'Fonte'
  if(n.includes('tomada')) return 'Tomada'
  return 'Outro'
}

// GRUPO AMPLO de cada categoria (Automação, Redes, Segurança, Som, Elétrica, AV) — usado no
// filtro do editor pra ocultar um mundo inteiro de uma vez. Cai em "Outros" o que não encaixa.
const EQUIP_GRUPO = {
  Gateway:'Automação', Keypad:'Automação', 'Hub IR':'Automação', 'Módulo':'Automação', Sensor:'Automação',
  'Wi-Fi':'Redes', Switch:'Redes', Patch:'Redes', Keystone:'Redes', Roteador:'Redes', Modem:'Redes', Rack:'Redes', Nobreak:'Redes', Organizador:'Redes',
  'Câmera':'Segurança', NVR:'Segurança',
  Som:'Som',
  Tomada:'Elétrica', Interruptor:'Elétrica', Luz:'Elétrica', Quadro:'Elétrica',
  TV:'AV', Fonte:'Outros', Outro:'Outros',
}
const equipGrupo = cat => EQUIP_GRUPO[cat] || 'Outros'
const GRUPO_ORDEM = ['Automação','Redes','Segurança','Som','Elétrica','AV','Outros']

// ─────────────────────────────────────────────────────────────────────────
// SÍMBOLOS ELÉTRICOS — padrão da prancha de legenda da RARO (foto do quadro
// "LEGENDA DE PONTOS DE ELÉTRICA", 16/07/2026). Espaço ~20×20 centrado em (0,0).
//
// A GRAMÁTICA (não inventar fora dela):
//  · Todo ponto de parede é um "pirulito": HASTE horizontal à esquerda (encosta
//    na parede) + CABEÇA que diz o que é.
//  · PREENCHIMENTO = ALTURA. Vazado = 0,30m · metade = 1,10m · cheio = 1,80m.
//    (era o "tracinho" de 2px de antes — invisível impresso; o preenchimento
//    se lê de longe e sobrevive ao preto e branco.)
//  · PISO e TETO saem da parede: viram a cabeça DENTRO DE UM QUADRADO, sem
//    haste. Piso = vazado (é o mais baixo), teto = cheio (o mais alto).
//  · COR = sistema. Vermelho = comando/iluminação (keypad, arandela, luz).
//    Azul = o resto (tomada, rede, som).
//  · Keypad: círculo vermelho + N-1 traços radiais = N teclas (1 tecla = liso).
//    As letras a/b/c da prancha original nomeiam o CIRCUITO de cada tecla —
//    não se aplicam aqui: na RARO é tudo Zigbee/cena, o keypad não fia circuito.
//  · Three-way (3W) e four-way (4W) da prancha NÃO entram: são topologia de
//    fiação, e a RARO não puxa paralelo — dois keypads na mesma luz é cena.
// ─────────────────────────────────────────────────────────────────────────
const ELE_AZUL = '#2563EB'   // tomada, rede, som — tudo que não é comando
const ELE_VERM = '#DC2626'   // keypad, arandela, ponto de luz — comando/iluminação
// Haste do pirulito: sai à esquerda e encosta na cabeça.
const _haste = (cor=ELE_AZUL) => `<line x1="-11.5" y1="0" x2="-6" y2="0" stroke="${cor}" stroke-width="1.3"/>`
// Cabeça triangular da tomada, apontando pra direita. nivel: 0 vazado · 1 metade · 2 cheio.
// O "metade" corta na vertical: enche a porção colada na haste.
const _seta = (nivel, cor=ELE_AZUL) => {
  const pts='-6,-6.5 6,0 -6,6.5'
  if(nivel>=2) return `<polygon points="${pts}" fill="${cor}" stroke="${cor}" stroke-width="1.2" stroke-linejoin="round"/>`
  const base=`<polygon points="${pts}" fill="#fff" stroke="${cor}" stroke-width="1.2" stroke-linejoin="round"/>`
  if(nivel<=0) return base
  return base+`<polygon points="-6,-6.5 0,-3.25 0,3.25 -6,6.5" fill="${cor}"/>`
}
// Caixa de piso/teto: a cabeça dentro de um quadrado, sem haste.
const _caixa = (cor=ELE_AZUL) => `<rect x="-9.5" y="-9.5" width="19" height="19" fill="#fff" stroke="${cor}" stroke-width="1.3"/>`
// Meia-lua da arandela (luz de parede), preenchida conforme a altura.
const _arandela = (nivel) => {
  const meia='M-7 5 A7 7 0 0 1 7 5 Z'
  const corpo = nivel>=2
    ? `<path d="${meia}" fill="${ELE_VERM}" stroke="${ELE_VERM}" stroke-width="1.2"/>`
    : nivel>=1
    ? `<path d="${meia}" fill="#fff" stroke="${ELE_VERM}" stroke-width="1.2"/><path d="M-7 5 A7 7 0 0 1 0 -2 L0 5 Z" fill="${ELE_VERM}"/>`
    : `<path d="${meia}" fill="#fff" stroke="${ELE_VERM}" stroke-width="1.2"/>`
  return corpo+`<line x1="-9" y1="5" x2="9" y2="5" stroke="${ELE_VERM}" stroke-width="1.3"/>`
}
// Keypad: círculo vermelho + (n-1) traços radiais no topo = n teclas.
const _keypad = (n) => {
  const t=[]
  for(let i=1;i<Math.min(n,6);i++){
    const ang=-90+(i-(Math.min(n,6)-1)/2)*22
    const r1=7, r2=10.5, rad=ang*Math.PI/180
    t.push(`<line x1="${(Math.cos(rad)*r1).toFixed(2)}" y1="${(Math.sin(rad)*r1).toFixed(2)}" x2="${(Math.cos(rad)*r2).toFixed(2)}" y2="${(Math.sin(rad)*r2).toFixed(2)}" stroke="${ELE_VERM}" stroke-width="1.2" stroke-linecap="round"/>`)
  }
  return `<circle r="7" fill="#fff" stroke="${ELE_VERM}" stroke-width="1.4"/>${t.join('')}`
}
// Cabeça quadrada com letra dentro (rede, som, caixa de passagem) — como na prancha.
const _letra = (L, cor=ELE_AZUL, nivel=0) => {
  const q=`<rect x="-6.5" y="-6.5" width="13" height="13" fill="#fff" stroke="${cor}" stroke-width="1.3"/>`
  const meio = nivel>=2 ? `<rect x="-6.5" y="-6.5" width="13" height="13" fill="${cor}"/>`
    : nivel>=1 ? `<rect x="-6.5" y="0" width="13" height="6.5" fill="${cor}"/>` : ''
  const txt = L ? `<text x="0" y="3.2" font-size="8" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="${nivel>=2?'#fff':cor}">${L}</text>` : ''
  return q+meio+txt
}
const ELE_SYMBOLS = {
  // Tomada baixa (até 0,30m) — círculo com meia-lua preenchida + 2 traços (NBR 5444)
  // ── TOMADAS (azul) — haste + seta; preenchimento = altura ──
  tomada_baixa: _haste() + _seta(0),
  tomada_media: _haste() + _seta(1),
  tomada_alta:  _haste() + _seta(2),
  tomada_piso:  _caixa() + `<polygon points="-5,-5.5 5,0 -5,5.5" fill="#fff" stroke="${ELE_AZUL}" stroke-width="1.2" stroke-linejoin="round"/>`,
  tomada_teto:  _caixa() + `<polygon points="-5,-5.5 5,0 -5,5.5" fill="${ELE_AZUL}" stroke="${ELE_AZUL}" stroke-width="1.2" stroke-linejoin="round"/>`,

  // ── REDE / KEYSTONE (azul) — cabeça quadrada com R, preenchimento = altura ──
  // 5 alturas, espelhando a tomada (Raphael): piso · baixo 0,30 · média 1,10 · alto 1,80 · teto.
  // preenchimento do R = altura (0 vazado · 1 metade · 2 cheio); piso/teto saem da parede (caixa).
  keystone_piso:  _caixa() + `<text x="0" y="3.2" font-size="8" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="${ELE_AZUL}">R</text><line x1="-6" y1="6" x2="6" y2="-6" stroke="${ELE_AZUL}" stroke-width="1"/>`,
  keystone_baixo: _haste() + _letra('R', ELE_AZUL, 0),
  keystone_media: _haste() + _letra('R', ELE_AZUL, 1),
  keystone_alto:  _haste() + _letra('R', ELE_AZUL, 2),
  keystone_teto:  _caixa() + `<text x="0" y="3.2" font-size="8" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="${ELE_AZUL}">R</text>`,

  // ── SOM (azul) — cabeça quadrada com S, como "CAIXA DE SOM NA PAREDE" da prancha ──
  ponto_som_parede: _haste() + _letra('S', ELE_AZUL, 2),
  ponto_som_teto:   _caixa() + `<text x="0" y="3.2" font-size="8" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="${ELE_AZUL}">S</text>`,
  ponto_som_piso:   _caixa() + `<text x="0" y="3.2" font-size="8" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="600" fill="${ELE_AZUL}">S</text>`,

  // ── PONTO DE ENERGIA / FORÇA (azul) — cabeça REDONDA, não seta. É assim que a prancha separa
  // "TOMADA FORÇA ALTA" (círculo) das tomadas comuns (seta), e é o que diferencia o ponto de
  // elétrica no teto da tomada de teto: quadrado com CÍRCULO × quadrado com TRIÂNGULO.
  ponto_energia_parede: _haste() + `<circle r="6.5" fill="#fff" stroke="${ELE_AZUL}" stroke-width="1.3"/><path d="M-6.5 0 A6.5 6.5 0 0 0 6.5 0 Z" fill="${ELE_AZUL}"/>`,
  ponto_energia_teto:   _caixa() + `<circle r="5.5" fill="${ELE_AZUL}"/>`,
  ponto_energia_piso:   _caixa() + `<circle r="5.5" fill="#fff" stroke="${ELE_AZUL}" stroke-width="1.3"/>`,

  // ── KEYPADS (vermelho) — traços radiais = nº de teclas. Sem 3W/4W: a RARO não faz paralelo. ──
  interruptor_simples:       _haste(ELE_VERM) + _keypad(1),
  interruptor_paralelo:      _haste(ELE_VERM) + _keypad(2),   // nome legado = 2 teclas
  interruptor_intermediario: _haste(ELE_VERM) + _keypad(3),   // nome legado = 3 teclas
  interruptor_4:             _haste(ELE_VERM) + _keypad(4),
  interruptor_6:             _haste(ELE_VERM) + _keypad(6),

  // ── ILUMINAÇÃO (vermelho) ──
  arandela:      _haste(ELE_VERM) + _arandela(1),
  arandela_teto: _caixa(ELE_VERM) + `<path d="M-6 4 A6 6 0 0 1 6 4 Z" fill="${ELE_VERM}"/>`,
  ponto_luz:     `<circle r="6.5" fill="#fff" stroke="${ELE_VERM}" stroke-width="1.3"/><line x1="-9.5" y1="0" x2="-6.5" y2="0" stroke="${ELE_VERM}" stroke-width="1.2"/><line x1="6.5" y1="0" x2="9.5" y2="0" stroke="${ELE_VERM}" stroke-width="1.2"/><line x1="0" y1="-9.5" x2="0" y2="-6.5" stroke="${ELE_VERM}" stroke-width="1.2"/><line x1="0" y1="6.5" x2="0" y2="9.5" stroke="${ELE_VERM}" stroke-width="1.2"/><circle r="2" fill="${ELE_VERM}"/>`,

  // ── CAIXA DE PASSAGEM (azul) — quadrado limpo, como na prancha ──
  caixa_conduite: _haste() + _letra('', ELE_AZUL, 0),

  // ── Fora da prancha da RARO: não têm símbolo na legenda, desenhados no mesmo idioma ──
  modulo_cabeceira: _haste() + `<rect x="-6.5" y="-6.5" width="13" height="13" fill="#fff" stroke="${ELE_AZUL}" stroke-width="1.3"/><rect x="-6.5" y="0" width="13" height="6.5" fill="${ELE_AZUL}"/><text x="0" y="-1.5" font-size="6" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="${ELE_AZUL}">M</text>`,
  quadro: `<rect x="-10" y="-7" width="20" height="14" fill="#fff" stroke="${ELE_VERM}" stroke-width="1.5"/><line x1="-10" y1="-2.5" x2="10" y2="-2.5" stroke="${ELE_VERM}" stroke-width="1"/><line x1="-5" y1="-7" x2="-5" y2="-2.5" stroke="${ELE_VERM}" stroke-width="1"/><line x1="0" y1="-7" x2="0" y2="-2.5" stroke="${ELE_VERM}" stroke-width="1"/><line x1="5" y1="-7" x2="5" y2="-2.5" stroke="${ELE_VERM}" stroke-width="1"/>`,
  prumada: `<circle r="8" fill="#fff" stroke="${ELE_AZUL}" stroke-width="1.5"/><path d="M0 -5 L0 5 M-3 -2 L0 -5 L3 -2 M-3 2 L0 5 L3 2" fill="none" stroke="${ELE_AZUL}" stroke-width="1.4" stroke-linecap="round"/>`,
  generico: `<circle r="6" fill="#fff" stroke="#111" stroke-width="1.2"/><circle r="1.6" fill="#111"/>`,
}
// classifica um marcador em símbolo elétrico NBR
const ELE_TYPE_INFO = {
  tomada_piso:{label:'TUG-P', tipo:'Tomada de piso'},
  tomada_baixa:{label:'TUG-B', tipo:'Tomada baixa (0,30m)'},
  tomada_media:{label:'TUG-M', tipo:'Tomada média (1,10m)'},
  tomada_alta:{label:'TUG-A', tipo:'Tomada alta (1,80m)'},
  tomada_teto:{label:'TUG-T', tipo:'Tomada de teto'},
  ponto_energia_teto:{label:'⊕T', tipo:'Ponto elétrica no teto (fase+neutro)'},
  ponto_energia_piso:{label:'⊕P', tipo:'Ponto elétrica no piso'},
  ponto_energia_parede:{label:'⊕', tipo:'Ponto elétrica na parede'},
  // As chaves interruptor_paralelo/intermediario são LEGADO: os nomes dizem topologia
  // (paralelo = three-way, intermediário = four-way), mas sempre significaram nº de teclas
  // aqui. A RARO não puxa paralelo — é tudo Zigbee/cena —, então a topologia não existe no
  // escopo e a única propriedade é a tecla. Chave mantida pra não quebrar projeto salvo.
  interruptor_simples:{label:'1 tecla', tipo:'Interruptor 1 tecla'},
  interruptor_paralelo:{label:'2 teclas', tipo:'Interruptor 2 teclas'},
  interruptor_intermediario:{label:'3 teclas', tipo:'Interruptor 3 teclas'},
  interruptor_4:{label:'4 teclas', tipo:'Interruptor 4 teclas'},
  interruptor_6:{label:'6 teclas', tipo:'Interruptor 6 teclas'},
  modulo_cabeceira:{label:'MOD', tipo:'Módulo cabeceira (tomada+interruptor+2 USB)'},
  // Keystone: 5 alturas iguais à tomada. ATENÇÃO ao legado: até a v315 keystone_alto queria
  // dizer MÉDIA (1,10m) — o nome era errado. Agora keystone_alto = 1,80m (correto) e a média
  // ganhou a chave própria keystone_media. Ponto salvo antigo com keystone_alto passa a mostrar
  // 1,80m; se algum vier assim, é só reescolher a altura no editor.
  keystone_piso:{label:'KS-P', tipo:'Keystone de piso CAT6'},
  keystone_baixo:{label:'KS-B', tipo:'Keystone baixo (0,30m) CAT6'},
  keystone_media:{label:'KS-M', tipo:'Keystone parede média (1,10m) CAT6'},
  keystone_alto:{label:'KS-A', tipo:'Keystone alto (1,80m) CAT6'},
  keystone_teto:{label:'KS-T', tipo:'Keystone de teto (rede)'},
  ponto_som_teto:{label:'♪T', tipo:'Ponto de som no teto'},
  ponto_som_parede:{label:'♪P', tipo:'Ponto de som parede alta'},
  ponto_som_piso:{label:'♪C', tipo:'Ponto de som no piso'},
  ponto_luz:{label:'L', tipo:'Ponto de luz'},
  arandela:{label:'L', tipo:'Arandela de parede'},
  arandela_teto:{label:'L', tipo:'Arandela de teto'},
  prumada:{label:'⇵', tipo:'Prumada (descida entre pavimentos)'},
  caixa_conduite:{label:'CX', tipo:'Caixa de conduíte (passagem/derivação)'},
  quadro:{label:'QDL', tipo:'Quadro de Distribuição'},
}
// caixa de embutir padrão por tipo: 6 teclas → 4x4; demais interruptores e tomadas → 4x2
function caixaPadrao(sym){
  if(sym==='interruptor_6'||sym==='interruptor_4') return '4x4'
  if(/interruptor/.test(sym||'')) return '4x2'
  if(/tomada|modulo/.test(sym||'')) return '4x2'
  return ''
}
// Nº de teclas é propriedade do SÍMBOLO — fica aqui, num lugar só. Sem isto, o caminho manual
// (tipo escolhido no dropdown do editor) devolvia o tipo SEM `teclas`, o desenho caía no
// `teclas || 1` e interruptor de 1, 2 e 3 teclas saía com O MESMO traço na planta e na legenda.
const TECLAS_POR_SYM = { interruptor_simples:1, interruptor_paralelo:2, interruptor_intermediario:3, interruptor_4:4, interruptor_6:6 }
// FONTE ÚNICA do nome/rótulo do tipo: ELE_TYPE_INFO. O caminho inferido NÃO repete o texto.
function _eleInfo(sym, extra){
  const t = TECLAS_POR_SYM[sym]
  return { sym, ...(ELE_TYPE_INFO[sym]||{}), ...(t?{teclas:t}:{}), ...(extra||{}) }
}
// ── ALTURA DENTRO DO TIPO DO PONTO ───────────────────────────────────────────────
// Raphael: "todos desse menu precisam ter as 5 posições (piso, baixa, média, alta, teto)".
// Em vez de inventar ~30 símbolos novos (interruptor_simples_piso, _baixa, _media…), a altura
// vira um SUFIXO do tipo: "interruptor_simples@baixa". O símbolo continua sendo o mesmo — quem
// mostra a altura no desenho é o preenchimento do pino, que já faz isso. Tipo sem sufixo
// (tudo que já estava salvo) segue funcionando igual: baseEleType devolve ele mesmo.
const ALTURAS_PONTO = ['piso','baixa','media','alta','teto']
function baseEleType(v){ const s=String(v||''); const i=s.indexOf('@'); return i<0 ? s : s.slice(0,i) }
function altEleType(v){ const s=String(v||''); const i=s.indexOf('@'); if(i<0) return null
  const a=s.slice(i+1); return ALTURAS_PONTO.includes(a) ? a : null }
function classifyEle(m){
  // 1) tipo elétrico definido manualmente (dropdown no marcador) tem prioridade.
  // Passa pelo _eleInfo igual ao caminho inferido — senão volta a sair sem `teclas`.
  const _b = baseEleType(m && m.eleType)
  if(_b && ELE_TYPE_INFO[_b]) return _eleInfo(_b)
  if(m.eleType==='nenhum') return null  // marcado explicitamente como "não é elétrico"
  // 2) senão, infere pelo nome/nota
  const n=((m.name||'')+' '+(m.note||'')).toLowerCase()
  if(/keystone.*teto|teto.*keystone/.test(n)) return _eleInfo('keystone_teto')
  if(/keystone.*(piso|ch[ãa]o)/.test(n)) return _eleInfo('keystone_piso')
  if(/keystone.*(alto|alta|1[,.]?80|2[,.]?00)/.test(n)) return _eleInfo('keystone_alto')
  if(/keystone.*(m[ée]dia|banca|1[,.]?10|1[,.]?30|0[,.]?90)/.test(n)) return _eleInfo('keystone_media')
  if(/keystone.*(baixo|baixa|0[,.]?30)/.test(n)) return _eleInfo('keystone_baixo')
  if(/keystone/.test(n)) return _eleInfo('keystone_media')
  if(/ponto.*energia.*teto|energia.*teto.*fase|fase.*neutro.*teto/.test(n)) return _eleInfo('ponto_energia_teto')
  if(/ponto.*som.*teto|som.*teto|caixa.*embutida.*som|teto.*som/.test(n)) return _eleInfo('ponto_som_teto')
  if(/modulo.*cabeceira|cabeceira|tomada.*usb|usb.*tomada/.test(n)) return _eleInfo('modulo_cabeceira')
  if(/caixa.*conduite|conduite.*caixa|caixa.*passagem|caixa.*deriva|junction/.test(n)) return _eleInfo('caixa_conduite')
  if(/prumada|shaft|descida.*andar|descida.*pavimento|coluna.*vertical/.test(n)) return _eleInfo('prumada')
  if(/quadro|qdl|qd |distribui/.test(n)) return _eleInfo('quadro')
  // Keypad: a ÚNICA propriedade que importa é o nº de teclas — a RARO não puxa paralelo
  // (three-way) nem intermediário (four-way): dois keypads na mesma luz é cena Zigbee, não
  // fiação. Por isso "paralelo/three-way/hotel" no nome NÃO define topologia aqui; se vier,
  // o nº de teclas do nome continua mandando. Chaves interruptor_paralelo/intermediario são
  // legado e valem 2 e 3 teclas (ver ELE_TYPE_INFO).
  if(/keypad|botão|botões|botoes|tecla|interruptor|pulsador|paralelo/.test(n)){
    const mb=n.match(/(\d+)\s*(bot|tecla|gang)/)
    const nb=mb?parseInt(mb[1]):1
    const nTec=Math.max(1,nb)
    const info=(sym)=>({sym, teclas:nTec, label:`${nTec} tecla${nTec>1?'s':''}`, tipo:`Interruptor ${nTec} tecla${nTec>1?'s':''}`})
    // 4-5 teclas → interruptor_4. Antes caía em interruptor_intermediario, que DESENHA 3 traços,
    // com a sigla escrita "S4" — o mesmo ponto dizia S3 e S4. E interruptor_4 é o que
    // caixaPadrao() usa pra devolver 4x4; sem passar por aqui, keypad de 4 teclas ia pro
    // quantitativo como 4x2.
    if(nTec>=6) return info('interruptor_6')
    if(nTec>=4) return info('interruptor_4')
    if(nTec===3) return info('interruptor_intermediario')
    if(nTec===2) return info('interruptor_paralelo')
    return info('interruptor_simples')
  }
  if(/tomada.*teto|tomada de teto/.test(n)) return _eleInfo('tomada_teto')
  if(/tomada.*piso|tomada.*ch[ãa]o/.test(n)) return _eleInfo('tomada_piso')
  if(/tomada.*(alta|1[,.]80|2[,.]00|for[çc]a)/.test(n)) return _eleInfo('tomada_alta')
  if(/tomada.*(m[ée]dia|1[,.]10|1[,.]30|banca|0[,.]90)/.test(n)) return _eleInfo('tomada_media')
  if(/tomada/.test(n)) return _eleInfo('tomada_baixa')
  if(/ponto.*el[ée]tric|ponto.*energia|ponto.*for[çc]a/.test(n)){
    if(/teto|forro/.test(n)) return _eleInfo('ponto_energia_teto')
    if(/piso|ch[ãa]o/.test(n)) return _eleInfo('ponto_energia_piso')
    return _eleInfo('ponto_energia_parede')
  }
  if(/arandela.*teto|arandela de teto/.test(n)) return _eleInfo('arandela_teto')
  if(/arandela/.test(n)) return _eleInfo('arandela')
  if(/luz|luminária|luminaria|spot|lustre|plafon|ponto de luz/.test(n)) return _eleInfo('ponto_luz')
  return null  // não é elétrico → não entra na planta elétrica
}

// ─────────────────────────────────────────────────────────────────────────
// CAIXA E CABO POR PONTO — FONTE ÚNICA.
//
// É a resposta do Plano de Obra: o peão está com a parede crua na frente e só
// precisa saber ONDE deixar a ponta e QUE cabo é. Antes isto vivia em TRÊS lugares
// que se contradiziam no MESMO documento (o ponto KP-04, keypad de 2 teclas, saía
// como "4×4 + NEUTRO · 3×1,5mm² (F+N+T)" na Automação e "4x2 · 2×1,5mm² (retorno)"
// na Planta Elétrica):
//   · caboDe()/caixaDe()  — hardcoded dentro do gerador sem IA
//   · caixaPadrao()       — no módulo, usado pela planta elétrica e pelo quantitativo
//   · fiosDe()            — hardcoded dentro do renderizador
// Agora é só isto aqui. Se divergir de novo, é porque alguém recriou uma tabela.
//
// REGRAS (ditadas pelo Raphael + convenções RARO já escritas no prompt da IA):
//  · Caixa do keypad: até 3 teclas = 4x2 · acima de 3 = 4x4.
//  · Cabo do keypad: SEMPRE fase+neutro+terra 2,5mm². Keypad Zigbee é dispositivo
//    ALIMENTADO — não é interruptor burro, não leva "retorno". O "2×1,5mm² (retorno)"
//    que a Planta Elétrica mostrava tratava o keypad como interruptor comum.
// FAMÍLIA DO CABO DO PONTO — fonte única, e com regra dura por cima do cadastro.
//
// "Keypad nunca é rede, é elétrica... keystone é" (Raphael). É regra do negócio, não default:
// o keypad Zigbee é alimentado (3×1,5mm² F+N+T), então marcá-lo como Rede/Dados fazia o MESMO
// ponto declarar duas famílias no documento — selo R na planta e cabo elétrico na tabela.
// Por isso aqui a regra VENCE o m.cableType gravado: dado torto no cadastro (ou semente antiga)
// não tem direito de contradizer o cabo. guessCableType já classificava certo — o problema era
// que ele só falava quando não havia cableType.
function guessCableType(from, to){
  const n=((from&&from.name)+' '+(to&&to.name)).toLowerCase()
  if(/uplink|gateway|dream machine|provedor|ont|modem/.test(n)) return 'uplink'
  if(/som|caixa ac[uú]stica|caixa de som|amplificador|receiver|subwoofer|sub /.test(n)) return 'som'
  if(/tv|hdmi|tel[aã]o|projetor|matriz de v[ií]deo/.test(n)) return 'hdmi'
  if(/sensor|presen[çc]a|mmwave|infraverm|receptor ir/.test(n)) return 'eletrica'
  if(/keypad|interruptor|tomada|m[óo]dulo|cortina|hub ir|quadro|qdl|pulsador|pulsante/.test(n)) return 'eletrica'
  return 'dados'
}
// Família do cabo do ponto. Quem MANDA são os dois campos do editor — "Tipo do ponto" e
// "Cabo que chega neste ponto". O app não sobrepõe a escolha de quem cadastrou: se não houver
// escolha, sugere pelo nome (guessCableType, que já sabe que keypad é elétrica).
// A coerência entre tipo e cabo é CONFERIDA, não imposta — ver alertaDoPonto().
function familiaDoPontoTipo(m){
  const n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
  // Sensor IR e mmWave de presença são SEMPRE elétricos (Raphael): alimentação, não rede —
  // vale mesmo se alguém tiver marcado outro cabo antes.
  if(/receptor ir|emissor ir|hub ir|infraverm|\bir\b|sensor|presen[çc]a|mm-?wave|mv-?wave|\bmmw\b/.test(n)) return 'eletrica'
  // Interruptor/keypad ANTES do cableType genérico: o padrão é 3×1,5 + retornos (Raphael: "se for
  // interruptor é sempre 1,5"). Só respeita uma escolha EXPLÍCITA int15/int25; o 'eletrica'
  // genérico (default antigo = 2,5, da tomada) não vale pra interruptor e vira 1,5.
  const sym=(classifyEle(m)||{}).sym||''
  if(/^interruptor/.test(sym)) return (m.cableType==='eletrica_int25'||m.cableType==='eletrica_int15') ? m.cableType : 'eletrica_int15'
  if(m && m.cableType) return m.cableType
  return guessCableType(m, m)
}

// FAMÍLIA QUE O TIPO EXIGE fisicamente — ou null quando o tipo aceita mais de uma.
// Não serve pra sobrescrever nada; serve pra saber quando avisar.
function familiaExigidaPeloTipo(m){
  const c = classifyEle(m)
  if(c){
    if(/^interruptor/.test(c.sym) || c.sym==='modulo_cabeceira') return 'eletrica'
    if(/^tomada/.test(c.sym) || /^ponto_energia/.test(c.sym)) return 'eletrica'
    if(c.sym==='ponto_luz' || /^arandela/.test(c.sym)) return 'eletrica'
    if(/^keystone/.test(c.sym)) return 'dados'
    if(/^ponto_som/.test(c.sym)) return 'som'
    return null
  }
  // Fora do classifyEle (que só conhece ponto ELÉTRICO): sensor mmW e módulo/cortina são
  // Zigbee alimentados — exigem elétrica. Sem isto o sensor não era conferido por ninguém.
  const n = (((m && m.name) || '') + ' ' + ((m && m.note) || '')).toLowerCase()
  if(/sensor|presen[çc]a|mmwave/.test(n)) return 'eletrica'
  if(/cortina|persiana|m[óo]dulo|qarz/.test(n)) return 'eletrica'
  return null
}

// ALTURA QUE O TIPO AFIRMA — o nome do tipo carrega a altura chumbada ("Keystone alto/bancada
// (1,10m)", "Tomada baixa (0,30m)", "Ponto de som no teto"). Quando o tipo é inferido pelo NOME
// e a altura vem do DADO, os dois divergem e o documento imprime "Keystone parede média (1,10m)
// · 0,30 m" — afirmando duas alturas para o mesmo ponto. Null = o tipo não afirma altura.
function alturaAfirmadaPeloTipo(m){
  const c = classifyEle(m)
  if(!c) return null
  // sufixo "@altura" no tipo manda em tudo (é escolha explícita no dropdown)
  const suf = altEleType(m && m.eleType)
  if(suf) return suf
  const A = {
    keystone_piso:'piso', keystone_baixo:'baixa', keystone_media:'media', keystone_alto:'alta', keystone_teto:'teto',
    tomada_baixa:'baixa', tomada_media:'media', tomada_alta:'alta', tomada_piso:'piso', tomada_teto:'teto',
    ponto_som_teto:'teto', ponto_som_piso:'piso',
    ponto_energia_teto:'teto', ponto_energia_piso:'piso',
    arandela_teto:'teto', ponto_luz:'teto',
  }
  return A[c.sym] || null
}
const _ALT_NOME = { piso:'no chão', baixa:'0,30 m', media:'1,10 m', alta:'1,80 m', teto:'no teto' }

// ALERTA de combinação impossível: "tomada no teto com cabo de rede" não existe — não tem como.
// Devolve null quando está coerente, ou o texto do aviso. Quem decide continua sendo o editor;
// isto só bate na mesa antes de virar documento e ir pra obra.
const _FAM_NOME = { eletrica:'elétrica', dados:'rede', som:'som', hdmi:'HDMI', uplink:'uplink', fibra:'fibra óptica' }
function alertaDoPonto(m){
  const c = classifyEle(m)
  const oQue = (c && c.tipo) || 'este ponto'
  // 1) Cabo × tipo
  const exige = familiaExigidaPeloTipo(m)
  if(exige){
    const tem = familiaDoPontoTipo(m)
    // Compara a FAMÍLIA (ele/som/rede), não o tipo cru — senão eletrica_int15/int25 (o cabo
    // padrão do interruptor) dispara falso alerta contra 'eletrica'. (bug que o Raphael viu)
    if(cableFamily(tem).k !== cableFamily(exige).k) return `${oQue} não recebe cabo de ${_FAM_NOME[tem]||tem} — é ponto de ${_FAM_NOME[exige]||exige}.`
  }
  // 2) Altura × tipo — o tipo foi deduzido do NOME e afirma uma altura; a altura real vem do
  // dado. Divergiu, o documento imprime as duas ("Keystone parede média (1,10m) · 0,30 m").
  const altTipo = alturaAfirmadaPeloTipo(m)
  if(altTipo){
    const altReal = alturaOf(m)
    if(altReal !== altTipo)
      return `${oQue} está a ${_ALT_NOME[altReal]||altReal} — o tipo diz ${_ALT_NOME[altTipo]||altTipo}. Corrija o tipo do ponto ou a altura.`
  }
  return null
}
const SPEC_PADRAO = { caixa:'—', cabo:'—' }
// O que é CAIXA DE VERDADE (coisa que se compra) × o que é só o LUGAR do ponto.
// "forro", "quadro" e "passagem" dizem onde o ponto mora, não uma caixa a comprar — contá-los
// no quantitativo gerava linhas absurdas tipo "Caixa de embutir forro — 23 un".
function ehCaixaDeEmbutir(cx){ return /^4x2$|^4x4$|^octogonal$|caixa de piso/i.test(String(cx||'')) }
function specDoPonto(m){
  if(!m) return SPEC_PADRAO
  if(m.pilha) return { caixa:'—', cabo:'pilha (sem cabo)' } // sensor a pilha não puxa cabo
  // QDL não tem tamanho nem especificação (Raphael): o quadro JÁ está na casa e é bem maior
  // que qualquer caixa de embutir — o ponto dele na planta é só pra ilustrar ONDE ele fica.
  // Por isso ignora até um caixaTipo gravado: "4x4 no QDL" é dado sem sentido, não escolha.
  if((classifyEle(m)||{}).sym==='quadro') return SPEC_PADRAO
  if(m.caixaTipo || m.caboTipo){
    const base = _specAuto(m)
    return { caixa: m.caixaTipo || base.caixa, cabo: m.caboTipo || base.cabo }
  }
  return _specAuto(m)
}
function _specAuto(m){
  const c = classifyEle(m)
  const sym = (c && c.sym) || ''
  const n = (((m && m.name) || '') + ' ' + ((m && m.note) || '')).toLowerCase()
  if(/interruptor/.test(sym)){
    const t = (c && c.teclas) || 1
    const cx = t<=3 ? '4x2' : '4x4'
    // O interruptor pode ter alimentação 2,5 ou 1,5 (Raphael escolhe no "Cabo que chega neste
    // ponto"); o RETORNO é sempre 1,5mm². Sem contar quantos: "respectivos retornos".
    const alim = m.cableType==='eletrica_int25' ? '3×2,5mm² (F+N+T)'
               : m.cableType==='eletrica_int15' ? '3×1,5mm² (F+N+T)'
               : '3×1,5mm² (F+N+T)'  // padrão do projeto
    return { caixa: cx, cabo:`${alim} + respectivos retornos 1,5mm²` }
  }
  if(sym==='modulo_cabeceira')            return { caixa:'4x2', cabo:'3×1,5mm² + 3×2,5mm² (F+N+T)' }
  if(/^tomada/.test(sym))                 return { caixa: sym==='tomada_piso' ? 'caixa de piso' : sym==='tomada_teto' ? 'forro' : '4x2', cabo:'3×2,5mm²' }
  if(/^ponto_energia/.test(sym))          return { caixa: sym==='ponto_energia_piso' ? 'caixa de piso' : sym==='ponto_energia_teto' ? 'forro' : '4x2', cabo:'3×1,5mm² (F+N+T)' }
  if(/^keystone/.test(sym))               return { caixa: sym==='keystone_teto' ? 'forro' : sym==='keystone_piso' ? 'caixa de piso' : '4x2', cabo:'CAT6' }
  if(/^ponto_som/.test(sym))              return { caixa: sym==='ponto_som_teto' ? 'forro' : sym==='ponto_som_piso' ? 'caixa de piso' : '4x2', cabo:'2×1,5mm²' }
  if(sym==='ponto_luz'||/^arandela/.test(sym)) return { caixa:'forro', cabo:'2×1,5mm²' }
  if(sym==='quadro')                      return { caixa:'quadro', cabo:'alimentação geral' }
  if(sym==='caixa_conduite')              return { caixa:'passagem', cabo:'—' }
  if(sym==='prumada')                     return { caixa:'—', cabo:'—' }
  // Não-elétricos: câmera, AP, sensor, cortina/módulo — caem pelo nome.
  if(/cortina|persiana/.test(n))          return { caixa:'forro', cabo:'2×2,5mm² (F+N)' }
  if(/m[óo]dulo|qarz/.test(n))            return { caixa:'forro', cabo:'2×2,5mm² (F+N)' }
  // Sem PoE = DOIS cabos no mesmo ponto: dados + alimentação. Vai escrito na tabela e vira
  // dois selos no pino (ver cableFamiliesOf).
  if(/c[âa]mera|camera|dome|access point|\bap\b|wi-?fi/.test(n))
    return { caixa:'forro', cabo: semPoe(m) ? 'CAT6 + 2×2,5mm² (F+N) — sem PoE' : 'CAT6 PoE' }
  // Sensor mmW é ELÉTRICA (Raphael) — eu tinha escrito CAT6 aqui, chutando. É dispositivo
  // Zigbee alimentado, igual ao módulo: fase+neutro no forro, não puxa rede.
  if(/sensor|presen[çc]a|mmwave/.test(n)) return { caixa:'forro', cabo:'2×2,5mm² (F+N)' }
  if(/som|caixa ac|amplificador|receiver/.test(n)) return { caixa:'forro', cabo:'2×1,5mm²' }
  return SPEC_PADRAO
}

// ─────────────────────────────────────────────────────────────────────────
// IDIOMA DOS PINOS (planta de pontos) — definido pelo Raphael, 16/07/2026.
// Duas leituras só, e cada uma tem UM dono:
//   · FORMA + COR = o que o ponto é.
//   · PREENCHIMENTO = a altura.  (mesma lógica da prancha de elétrica deles)
// Mais os traços do interruptor = nº de teclas (1 traço = 1 tecla, 6 = 6).
// Antes a cor era "categoria" (6 cores) e a forma era o plano de montagem, com um
// tracinho de 2px pra altura — ilegível impresso. Agora a altura é o preenchimento,
// que se lê de longe e sobrevive ao P&B.
// ─────────────────────────────────────────────────────────────────────────
const CABLE_PALETTE_CAMERA = '#92400E' // cor do cabo de câmera (bate com CABLE_PALETTE.camera do componente)
// Cabo de REDE (CAT6) — 90m é o limite do padrão; a partir de 80m sobe um alerta (Raphael),
// porque com folga de instalação e patch cords o lance real pode estourar os 90/100m.
function _ehCaboRede(t){ return /^(dados|ap|camera|uplink|hdmi)$/.test(String(t||'')) }
function mtCel(mt, tipoCabo){
  if(mt==null) return '—'
  const alerta = mt>=80 && _ehCaboRede(tipoCabo)
  return `${mt}m${alerta?` <span style="color:#DC2626;font-weight:800" title="CAT6 acima de 80m — perto do limite de 90m. Prever fibra ou switch intermediário.">⚠</span>`:''}`
}
const PIN_TIPOS = {
  interruptor: { forma:'circulo',  cor:'#DC2626', nome:'Interruptor' },
  tomada:      { forma:'seta',     cor:'#2563EB', nome:'Tomada' },
  rede:        { forma:'meialua',  cor:'#F59E0B', nome:'Ponto de rede' },
  som:         { forma:'quadrado', cor:'#BE185D', nome:'Ponto de som' },  // rosa = mesma cor do cabo/conduíte de som (Raphael)
  eletrica:    { forma:'losango',  cor:'#111827', nome:'Ponto de elétrica' },
  quadro:      { forma:'quadro',   cor:'#111827', nome:'Quadro QDL' },
  prumada:     { forma:'hexagono', cor:'#06B6D4', nome:'Prumada' },  // hexágono CIANO + ↕: forma e cor únicas (Raphael)
}
function pinTipoDe(m){
  const c = classifyEle(m)
  const sym = (c && c.sym) || ''
  const n = (((m && m.name) || '') + ' ' + ((m && m.code) || '')).toLowerCase()
  // Câmera e AP são SEMPRE ponto de rede — decidido pelo NOME, antes de qualquer sym elétrico.
  // Sem isto, uma câmera com eleType elétrico gravado (clique antigo no "Tipo do ponto", hoje
  // sem como desfazer) saía como losango PRETO em vez de rede (bug que o Raphael viu na Suíte 02).
  if(/c[âa]mera|camera|dome|bullet|access point|\bap\b|wi-?fi/.test(n)) return 'rede'
  if(sym==='quadro' || /quadro|qdl/.test(n)) return 'quadro'
  if(sym==='prumada' || /prumada/.test(n)) return 'prumada'
  if(/^interruptor/.test(sym)) return 'interruptor'
  if(/^tomada/.test(sym)) return 'tomada'
  if(/^keystone/.test(sym)) return 'rede'
  if(/^ponto_som/.test(sym)) return 'som'
  if(/^ponto_energia/.test(sym) || sym==='ponto_luz' || /^arandela/.test(sym) || sym==='modulo_cabeceira') return 'eletrica'
  // Fora do classifyEle: o que importa é o PONTO que fica na parede, não o aparelho.
  if(/keystone|\bks\b/.test(n)) return 'rede'
  if(/som|caixa ac|caixa de som|alto-?falante|speaker|subwoofer/.test(n)) return 'som'
  if(/sensor|presen[çc]a|mmwave|cortina|persiana|m[óo]dulo|qarz/.test(n)) return 'eletrica'
  return 'eletrica'
}
// Um ponto TEM tipo se o app sabe desenhá-lo (elétrico OU rede/câmera/AP/sensor/som/cortina).
// O validador antigo usava só classifyEle (que só conhece ponto ELÉTRICO), então câmera, AP e
// sensor caíam como "SEM TIPO" mesmo sendo detectados pelo nome — o falso alarme do Raphael.
function pontoTemTipo(m){
  if(classifyEle(m)) return true
  if(isRackItem(m&&m.name, m&&m.code)) return true
  const n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
  return /c[âa]mera|dome|bullet|access point|\bap\b|wi-?fi|u6|u7|uap|unifi|keystone|\bks\b|sensor|presen[çc]a|mm-?wave|mmwave|receptor ir|emissor ir|hub ir|infraverm|\bir\b|cortina|persiana|som|caixa ac|alto-?falante|speaker|subwoofer|m[óo]dulo/.test(n)
}
// Letra dentro da meia lua: diz QUAL ponto de rede é. Substitui o selo "R", que só repetia
// o que a cor amarela já diz.
function pinLetraDe(m){
  const n = (((m && m.name) || '') + ' ' + ((m && m.code) || '')).toLowerCase()
  // Sensor de presença (mmWave) e cortina não são ponto de rede — caem no losango preto e
  // ficavam sem marca nenhuma, indistinguíveis de qualquer outro ponto de elétrica (Raphael).
  // '~' é tratado como DESENHO de onda no pinNovoSVG, não como texto.
  // IR vem ANTES do sensor: "sensor IR"/"receptor IR" tem 'sensor' no nome e cairia na onda,
  // mas IR é infravermelho (emissor/receptor de controle), não presença mmWave (Raphael).
  if(/receptor ir|emissor ir|hub ir|infraverm|\bir\b/.test(n)) return 'IR'
  if(/sensor|presen[çc]a|mm-?wave|mv-?wave|\bmmw\b/.test(n)) return '~'
  if(/cortina|persiana/.test(n)) return 'c'
  // Tomada → T · Interruptor → i (Raphael). Dão nome ao símbolo dentro do próprio pino, como as
  // letras da rede fazem — a seta azul e o círculo vermelho ganham identidade sem depender da cor.
  // Módulo de cabeceira: marca própria "MC" no pino (Raphael) — é um ponto especial (USB+tomada+
  // som na cabeceira), não um ponto de elétrica qualquer.
  if((classifyEle(m)||{}).sym==='modulo_cabeceira' || /cabeceira/.test(n)) return 'MC'
  if((classifyEle(m)||{}).sym==='prumada' || /prumada/.test(n)) return '↕'
  const _t=pinTipoDe(m)
  if(_t==='tomada') return 'T'
  if(_t==='interruptor') return 'i'
  if(_t!=='rede') return ''
  if(/c[âa]mera|camera|dome|bullet/.test(n)) return 'C'
  if(/access point|\bap\b|wi-?fi|u6|u7|uap/.test(n)) return 'A'
  return 'K'
}
// Preenchimento = altura. vazio 0,30 · metade horizontal 1,10 · metade vertical 1,80 ·
// cheio teto · X piso.
function pinFillDe(m){
  const a = alturaOf(m)
  if(a==='teto')  return 'cheio'
  if(a==='piso')  return 'x'
  if(a==='alta')  return 'meiaV'
  if(a==='media') return 'meiaH'
  return 'vazio'
}
let _pinSeq = 0
function pinNovoSVG({ m, size=22, label='', sel=false }){
  const tipo = pinTipoDe(m)
  const T = PIN_TIPOS[tipo] || PIN_TIPOS.eletrica
  // Câmera usa a MESMA cor do cabo de câmera (Raphael) — se destaca dos outros pontos de rede
  // (AP/keystone amarelos). A letra C dentro do pino continua distinguindo.
  const _n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
  const cor = (tipo==='rede' && /c[âa]mera|camera|dome|bullet/.test(_n)) ? (CABLE_PALETTE_CAMERA) : T.cor
  const fill = tipo==='quadro' ? 'cheio' : tipo==='prumada' ? 'vazio' : pinFillDe(m)
  const id = 'pc'+(++_pinSeq)
  const corpo = {
    circulo:  `<circle cx="12" cy="12" r="9.5"/>`,
    seta:     `<polygon points="4,3.5 20.5,12 4,20.5"/>`,
    meialua:  `<path d="M12 2.5 A9.5 9.5 0 0 1 12 21.5 Z"/>`,
    quadrado: `<rect x="3" y="3" width="18" height="18" rx="1.5"/>`,
    losango:  `<polygon points="12,2 22,12 12,22 2,12"/>`,
    quadro:   `<rect x="1.5" y="5.5" width="21" height="13" rx="1.5"/>`,
    hexagono: `<polygon points="12,1.5 21,6.5 21,17.5 12,22.5 3,17.5 3,6.5"/>`,
  }[T.forma]
  // A área preenchida é sempre recortada pela própria forma — nunca vaza.
  const recorte = {
    vazio: '',
    meiaH: `<rect x="0" y="12" width="24" height="12"/>`,
    meiaV: `<rect x="0" y="0" width="12" height="24"/>`,
    cheio: `<rect x="0" y="0" width="24" height="24"/>`,
    x:     '',
  }[fill]
  // O retângulo da metade é desenhado DENTRO do clip da forma — por isso nunca vaza.
  const preenchimento = fill==='x'
    ? `<g clip-path="url(#${id})"><line x1="1" y1="1" x2="23" y2="23" stroke="${cor}" stroke-width="3"/><line x1="23" y1="1" x2="1" y2="23" stroke="${cor}" stroke-width="3"/></g>`
    : fill==='vazio' ? ''
    : `<g clip-path="url(#${id})">${recorte.replace('/>',` fill="${cor}"/>`)}</g>`
  // Traços do interruptor = nº de teclas.
  const teclas = tipo==='interruptor' ? (((classifyEle(m)||{}).teclas) || 1) : 0
  let tics=''
  for(let i=0;i<teclas;i++){
    const ang = -90 + (i-(teclas-1)/2)*22
    const r = ang*Math.PI/180
    // Traços mais longos (r 9→15,5) e grossos (2px), com contorno branco por baixo. Com 1,6px
    // indo só até r=13 eles não se distinguiam no tamanho da legenda: 1, 2 e 3 teclas pareciam
    // o MESMO desenho — foi a queixa do Raphael na foto. Mesmo erro do tracinho de altura de
    // 2px que a gente já tinha matado uma vez: detalhe fino não sobrevive ao papel.
    const x1=(12+Math.cos(r)*9).toFixed(2), y1=(12+Math.sin(r)*9).toFixed(2)
    const x2=(12+Math.cos(r)*15.5).toFixed(2), y2=(12+Math.sin(r)*15.5).toFixed(2)
    tics += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`
      + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="2" stroke-linecap="round"/>`
  }
  const letra = pinLetraDe(m)
  // LETRA E NÚMERO CONVIVEM (Raphael). Antes a letra SUBSTITUÍA o número, e câmera, AP e
  // keystone ficavam sem o nº que cruza com as tabelas — a dica da legenda ("pontos 5, 14")
  // não achava correspondência no desenho. A meia lua ocupa só a METADE DIREITA do pino, então
  // o número vai na metade esquerda, que está vazia: os dois cabem sem disputar espaço.
  // O número obedece ao toggle "Nº dentro do pino"; a letra não — ela diz o que o ponto é.
  // Número MENOR (Raphael): a fonte 10 cobria o símbolo no pino de 18px da planta — o X do som
  // no piso, por exemplo, sumia atrás do número e não batia com a legenda. Reduzido pra 7,5 e
  // empurrado pro alto, liberando o miolo do símbolo. Continua ocultável pelo "Nº dentro do pino".
  // NÚMERO NO CANTO, não no miolo (Raphael: "quero igual à legenda"). Dentro do símbolo ele
  // cobria o desenho — o X do som no piso sumia atrás dele. Agora vai num badge pequeno no
  // canto superior esquerdo (o selo do cabo fica no direito), deixando o símbolo limpo,
  // idêntico ao da legenda. Continua ocultável pelo toggle "Nº dentro do pino".
  const txt = (label!=='' && label!=null)
    ? `<circle cx="4.5" cy="4.5" r="5" fill="#fff" stroke="${cor}" stroke-width="1.2"/><text x="4.5" y="6.9" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="800" font-size="6.5" fill="${cor}">${label}</text>`
    : ''
  // Onda do sensor de presença: 3 arcos, desenhados (uma letra "~" some no papel).
  const ondaSVG = `<g stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" paint-order="stroke" style="paint-order:stroke">
      <path d="M9.5 16.5 A4 4 0 0 1 14.5 16.5"/><path d="M7.6 13.6 A7 7 0 0 1 16.4 13.6"/><path d="M5.7 10.7 A10 10 0 0 1 18.3 10.7"/></g>
    <g stroke="#FDE68A" stroke-width="1.5" fill="none" stroke-linecap="round">
      <path d="M9.5 16.5 A4 4 0 0 1 14.5 16.5"/><path d="M7.6 13.6 A7 7 0 0 1 16.4 13.6"/><path d="M5.7 10.7 A10 10 0 0 1 18.3 10.7"/></g>`
  const letraTxt = !letra ? ''
    : letra==='~' ? ondaSVG
    : `<text x="15.5" y="15.4" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="800" font-size="${letra.length>1?6:8}" fill="#7C4A03" stroke="#fff" stroke-width="2" paint-order="stroke" style="paint-order:stroke">${letra}</text>`
  const halo = sel ? `<g opacity="0.32">${corpo.replace('/>',` fill="${cor}"/>`)}</g>` : ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45))">`
    + `<defs><clipPath id="${id}">${corpo}</clipPath></defs>`
    + halo
    + corpo.replace('/>',` fill="#fff" stroke="${cor}" stroke-width="1.8" stroke-linejoin="round"/>`)
    + preenchimento + tics
    + (tipo==='quadro' ? `<line x1="1.5" y1="9.5" x2="22.5" y2="9.5" stroke="#fff" stroke-width="1.1"/>` : '')
    + letraTxt + txt
    + `</svg>`
}

// ─────────────────────────────────────────────────────────────────────────
// FORMA DO PIN POR LOCAL DE INSTALAÇÃO (cor = categoria/tipo, forma = onde monta)
// Convenção RARO Home: ○ parede · △ teto · □ chão.
// (Atenção: a antiga NBR 5444 — cancelada em 2014 — usava ○=teto, △=tomada, □=piso.
//  Aqui seguimos o padrão pedido pela operação. Para inverter, basta mexer em SHAPE_BY_MOUNT.)
const SHAPE_BY_MOUNT = { parede:'circulo', teto:'triangulo', chao:'quadrado' }
// Cinco alturas (sistema da Ful): forma dá o plano, tracinho dá o nível na parede.
const SHAPE_BY_ALT = { piso:'quadrado', baixa:'circulo', media:'circulo', alta:'circulo', teto:'triangulo' }
const ALT_H = { piso:'0,00', baixa:'0,30', media:'1,10', alta:'1,80', teto:'teto' }
const ALT_LABEL = { piso:'Piso', baixa:'Baixa (0,30)', media:'Média (1,10)', alta:'Alta (1,80)', teto:'Teto' }
// Um grupo do dropdown "Tipo do ponto" com as 5 alturas. `especiais` mapeia a altura pra uma
// chave própria quando ela já existe (ex.: piso e teto do som têm símbolo próprio); as demais
// viram "base@altura". Assim o menu ganha as 5 posições sem inventar símbolo novo.
// Nº de teclas ↔ símbolo. O menu de tipo não precisa de um grupo por tecla: escolhe a ALTURA
// e mantém as teclas que o ponto já tem (vêm do nome do item, "Keypad 4 teclas"), ajustáveis
// no seletor "Teclas". Se o ponto não é interruptor, o padrão é 1 tecla.
const SYM_POR_TECLAS = { 1:'interruptor_simples', 2:'interruptor_paralelo', 3:'interruptor_intermediario', 4:'interruptor_4', 6:'interruptor_6' }
function symInterruptorDe(m){
  const s=(classifyEle(m)||{}).sym||''
  return /^interruptor/.test(s) ? s : 'interruptor_simples'
}
function teclasDe(m){ return ((classifyEle(m)||{}).teclas) || 1 }
function alturasDoTipo(grupo, nome, base, especiais={}){
  return <optgroup key={grupo} label={grupo}>
    {ALTURAS_PONTO.map(a=>{ const v=especiais[a]||`${base}@${a}`
      return <option key={v} value={v}>{nome} · {ALT_LABEL[a]}</option> })}
  </optgroup>
}
// Cor = categoria (6 cores). Selo do cabo (R/S/E) vem de cableFamily.
const CAT_COLOR = { keypad:'#16A34A', ap:'#F59E0B', camera:'#DC2626', som:'#BE185D', energia:'#111827', sensor:'#EA580C' }
function catColorOf(m){
  const n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
  const sym=classifyEle(m)?.sym||''
  if(/keypad|pulsador|pulsante|bot[aã]o|\bkp\b/.test(n)) return CAT_COLOR.keypad
  if(/access point|\bap\b|wi-?fi|roteador|u6|u7/.test(n)) return CAT_COLOR.ap
  if(/c[âa]mera|dome|bullet|\bcam\b/.test(n)) return CAT_COLOR.camera
  if(/som|caixa (ac[uú]stica|de som|som)|alto-?falante|speaker|jbl|receiver|subwoofer/.test(n)) return CAT_COLOR.som
  if(/sensor|presen[çc]a|mmwave|\bmw\b|infraverm|receptor ir|\bir\b/.test(n)) return CAT_COLOR.sensor
  if(/ponto de energia|\bpe\b|tomada|for[çc]a|quadro|qdl|energia/.test(n) || /tomada|energia|quadro/.test(sym)) return CAT_COLOR.energia
  return null // deixa o chamador cair na cor antiga (EQUIP_STYLE) p/ itens de rede/rack
}
function _textOn(hex){
  const c=(hex||'#000').replace('#',''); if(c.length<6) return '#fff'
  const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16)
  return (0.299*r+0.587*g+0.114*b)/255>0.62?'#111827':'#fff'
}

// Descobre onde o item é montado: manual (m.mount) tem prioridade; senão infere.
// Conjunto único do que é ponto ELÉTRICO de verdade (entra na planta elétrica e na lista geral).
// Rede (keystone), som e dados NÃO entram aqui: têm suas próprias plantas/tabelas.
const ELE_SYMS_SET = new Set(['tomada_baixa','tomada_media','tomada_alta','tomada_piso','tomada_teto','modulo_cabeceira',
  'interruptor_simples','interruptor_paralelo','interruptor_intermediario','interruptor_4','interruptor_6',
  'ponto_luz','ponto_energia_teto','ponto_energia_piso','ponto_energia_parede','arandela','arandela_teto','quadro','prumada'])
function isPontoEletrico(m){
  const n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
  // Câmera / AP / keystone NUNCA são ponto elétrico — mesmo com um eleType elétrico gravado por
  // engano (clique antigo no "Tipo do ponto"). Era o "ponto fantasma" na planta elétrica (Raphael).
  if(/c[âa]mera|dome|bullet|access point|\bap\b|wi-?fi|u6|u7|uap|unifi|keystone|\bks\b/.test(n)) return false
  const c=classifyEle(m); return !!(c && ELE_SYMS_SET.has(c.sym))
}

function mountOf(m){
  const a=((m&&m.altura)||'').toLowerCase()
  if(a){ if(a==='teto'||a==='forro') return 'teto'; if(a==='piso'||a==='chao'||a==='chão') return 'chao'; return 'parede' }
  // altura escolhida no próprio tipo ("interruptor_simples@teto") define o plano
  const suf=altEleType(m&&m.eleType)
  if(suf) return suf==='teto' ? 'teto' : suf==='piso' ? 'chao' : 'parede'
  if(m && (m.mount==='teto'||m.mount==='parede'||m.mount==='chao')) return m.mount
  const n=(((m&&m.name)||'')+' '+((m&&m.note)||'')).toLowerCase()
  const sym=classifyEle(m)?.sym||''
  if(sym==='tomada_piso' || sym==='ponto_energia_piso' || sym==='ponto_som_piso' || sym==='keystone_piso' || /\bpiso\b|ch[ãa]o|subwoofer|\bsub\b/.test(n)) return 'chao'
  if(['tomada_teto','keystone_teto','ponto_som_teto','ponto_energia_teto','ponto_luz','arandela_teto'].includes(sym)) return 'teto'
  if(/teto|forro|c[âa]mera|dome|bullet|access point|\bap\b|wi-?fi|spot|lustre|plafon|luminári|luminari|sensor|presen[çc]a|mmwave|proje(tor|ção|cao)|caixa (ac[uú]stica|de som|som)|alto-?falante|speaker|\bir\b|infraverm|receptor ir/.test(n)) return 'teto'
  return 'parede'
}
// Altura fina (5 níveis). Manual (m.altura) tem prioridade; senão infere a partir do plano + tipo.
function alturaOf(m){
  // 1º) altura escolhida à mão no ponto — o mais explícito que existe.
  const man=((m&&m.altura)||'').toLowerCase()
  if(man==='piso'||man==='chao'||man==='chão') return 'piso'
  if(man==='baixa') return 'baixa'
  if(man==='media'||man==='média') return 'media'
  if(man==='alta') return 'alta'
  if(man==='teto'||man==='forro') return 'teto'
  // 2º) altura escolhida DENTRO do tipo ("interruptor_intermediario@baixa"). Vem antes do
  // m.mount porque mount costuma ser derivado (o app deduz o plano), não escolha de ninguém —
  // sem isto, escolher "Interruptor 3 · Baixa" num ponto que o app achou que era de teto não
  // mudava nada e ainda acusava divergência.
  const suf=altEleType(m&&m.eleType)
  if(suf) return suf
  const mnt=((m&&m.mount)||'').toLowerCase()
  if(mnt==='chao') return 'piso'
  if(mnt==='teto') return 'teto'
  const mo=mountOf(m)
  if(mo==='teto') return 'teto'
  if(mo==='chao') return 'piso'
  const n=(((m&&m.name)||'')+' '+((m&&m.note)||'')).toLowerCase()
  const sym=classifyEle(m)?.sym||''
  if(sym==='tomada_baixa'||/rodap|0[.,]30|\bbaixa\b/.test(n)) return 'baixa'
  if(sym==='tomada_alta'||sym==='ponto_som_parede'||/1[.,]80|\balta\b|for[çc]a|access point|\bap\b/.test(n)) return 'alta'
  return 'media'
}

// Reduz os vários tipos de cabo do sistema a 3 famílias de legenda: Elétrico · Som · Rede
function cableFamily(type){
  if(String(type||'').startsWith('eletrica')) return { k:'ele',  L:'E', nome:'Elétrico', cor:'#16A34A' }
  if(type==='som')      return { k:'som',  L:'S', nome:'Som',      cor:'#BE185D' }
  return { k:'rede', L:'R', nome:'Rede/Dados', cor:'#2563EB' } // dados, ap, câmera, uplink, fibra, hdmi...
}
// Subwoofer é caso especial: cabo RCA de sinal (som) + alimentação elétrica → dois selos S e E.
function isSubwoofer(m){ const n=((m?.name||'')+' '+(m?.code||'')).toLowerCase(); return /subwoofer|\bsub\b/.test(n) }
// Aparelho de rede que NÃO é alimentado pelo cabo de rede (AP/câmera com fonte externa).
// Marcado à mão no ponto (semPoe): não dá pra adivinhar pelo nome — é decisão de projeto.
// Raphael: "tem AP que não vai ser PoE e você precisa representar isso nas plantas".
function semPoe(m){ return !!(m && m.semPoe) }
function cableFamiliesOf(m, type){
  // Sensor a PILHA não puxa cabo nenhum (Raphael): sem selo — o ponto só marca a posição.
  if(m && m.pilha) return []
  // Subwoofer ATIVO tem amplificador embutido → precisa de tomada (S+E). PASSIVO é só falante,
  // vai no cabo de som do rack/receiver e NÃO puxa elétrica (Raphael). Marcado à mão (subPassivo)
  // porque não dá pra saber pelo nome — modelos ativos e passivos se chamam igual "Subwoofer".
  if(isSubwoofer(m)){
    if(m && m.subPassivo) return [ { k:'som', L:'S', nome:'Som (passivo — cabo de alto-falante)', cor:'#BE185D' } ]
    return [ { k:'som', L:'S', nome:'Som (RCA de sinal)', cor:'#BE185D' }, { k:'ele', L:'E', nome:'Elétrico', cor:'#16A34A' } ]
  }
  // dois cabos chegam no ponto: dados + energia → dois selos no pino, igual ao subwoofer
  if(semPoe(m)) return [ cableFamily(type), { k:'ele', L:'E', nome:'Elétrico (fonte externa — sem PoE)', cor:'#16A34A' } ]
  return [ cableFamily(type) ]
}
// Normaliza o TYPE do cabo (dados, som, eletrica, hdmi, uplink, fibra) para a chave da família (ele/som/rede).
// Os chips de filtro guardam o type; o desenho usa a chave. Sem essa ponte, o filtro nunca casa.
function famChaveDe(type){ return cableFamily(type).k }
// Fábrica: recebe o Set hideFams (que guarda types) e devolve uma função que diz se uma família (por chave) está oculta.
// Considera oculta a família se TODOS os types daquela família estiverem marcados.
function fazFamOculta(hideFamsSet){
  const porChave = { ele:['eletrica','eletrica_int25','eletrica_int15'], som:['som'], rede:['dados','hdmi','uplink','fibra'] }
  return (chaveOuType) => {
    // aceita tanto a chave da família ('ele') quanto o type ('eletrica')
    const chave = porChave[chaveOuType] ? chaveOuType : famChaveDe(chaveOuType)
    const types = porChave[chave] || []
    return types.length > 0 && types.every(t => hideFamsSet.has(t))
  }
}

// Desenha o pin como SVG (forma + borda branca + número). Reutilizável no editor e nas plantas geradas.
// Tamanho do pino nas plantas do documento. 18px é o da "Planta Completa" do Plano de Obra,
// que o Raphael aprovou — a Planta de Pontos usava 24 e ficava desproporcional.
const PIN_PX = 18
// Recebendo o MARCADOR (m), desenha no idioma novo: forma+cor = o que é, preenchimento =
// altura, traços = teclas. Sem m (exemplos genéricos da legenda antiga), cai no desenho
// velho — os modelos legados continuam coerentes com a legenda deles.
function pinShapeSVG({ m=null, mount='parede', alt='', color='#374151', label='', size=22, sel=false }){
  if(m) return pinNovoSVG({ m, size, label, sel })
  const shape = SHAPE_BY_ALT[alt] || SHAPE_BY_MOUNT[mount] || 'circulo'
  const stroke='#fff', sw=2, txt=_textOn(color)
  let body='', halo=''
  if(shape==='triangulo'){
    body=`<polygon points="12,2.5 21.5,21 2.5,21" fill="${color}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
    if(sel) halo=`<polygon points="12,0 23.5,22.5 0.5,22.5" fill="${color}" opacity="0.32"/>`
  } else if(shape==='quadrado'){
    body=`<rect x="2.5" y="2.5" width="19" height="19" rx="3.5" fill="${color}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(sel) halo=`<rect x="0.5" y="0.5" width="23" height="23" rx="4.5" fill="${color}" opacity="0.32"/>`
  } else {
    body=`<circle cx="12" cy="12" r="9.5" fill="${color}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(sel) halo=`<circle cx="12" cy="12" r="11.5" fill="${color}" opacity="0.32"/>`
  }
  // Tracinho de altura na PAREDE: baixo / meio / alto (mesma lógica do preenchimento da prancha)
  let tick=''
  if(shape==='circulo' && (alt==='baixa'||alt==='media'||alt==='alta')){
    const ty = alt==='baixa' ? 18.4 : alt==='alta' ? 3.4 : 10.9
    tick = `<rect x="-2.4" y="${ty}" width="4.6" height="2.2" rx="1.1" fill="${color}" stroke="#fff" stroke-width="0.8"/>`
  }
  const ty = shape==='triangulo' ? 18 : 15.6
  const fs = shape==='triangulo' ? 8.5 : 10
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${halo}${body}${tick}<text x="12" y="${ty}" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="800" font-size="${fs}" fill="${txt}">${label}</text></svg>`
}

// Pin completo posicionado (forma por local + cor + selo de cabo opcional + rótulo opcional).
// `label` vem de FORA: quem chama é que sabe se o nº dentro do pino está ligado (é estado do
// componente, e isto aqui é escopo de módulo). Sem label explícito, mostra o nº do ponto.
function drawPin(m, { size=20, color='#374151', idLabel='', badgeFam=null, label=null }={}){
  const col = catColorOf(m) || color
  const core = pinShapeSVG({m:m, mount:mountOf(m), alt:alturaOf(m), color:col, label: label!=null ? label : String((m&&m.n)??''), size })
  const _fams = Array.isArray(badgeFam) ? badgeFam : (badgeFam ? [badgeFam] : [])
  const badge = _fams.length
    ? _fams.map((f,i)=>`<div style="position:absolute;top:-3px;right:${-3 - i*11}px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`).join('')
    : ''
  const idl = idLabel
    ? `<div style="position:absolute;left:50%;top:${size+2}px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:8px;white-space:nowrap;font-family:monospace;font-weight:600">${idLabel}</div>`
    : ''
  return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3;width:${size}px;height:${size}px">${core}${badge}${idl}</div>`
}

// Legenda de formas e cabos para as plantas geradas (a NBR manda diferenciar sistemas por legenda).
function pontosLegenda(){
  const cat=(cor,nome)=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#334155"><span style="width:13px;height:13px;border-radius:50%;background:${cor};border:1.5px solid #fff;box-shadow:0 0 0 1px #cbd5e1"></span>${nome}</span>`
  const cab=(cor,L,nome)=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#334155"><span style="width:14px;height:14px;border-radius:7px;background:${cor};color:#fff;font-size:8.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #fff">${L}</span>${nome}</span>`
  const frm=(alt,nome)=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#334155">${pinShapeSVG({alt,color:'#64748B',label:'',size:18})}${nome}</span>`
  // A marca que vai DENTRO do pino. A onda é desenhada (um "~" de texto some no papel), igual
  // ao pino — legenda e desenho têm que ser a mesma coisa.
  const mrc=(L,nome)=>{ const glifo = L==='~'
      ? `<svg viewBox="0 0 24 24" width="15" height="15" style="display:block"><g stroke="#B45309" stroke-width="2" fill="none" stroke-linecap="round"><path d="M9.5 16.5 A4 4 0 0 1 14.5 16.5"/><path d="M7.6 13.6 A7 7 0 0 1 16.4 13.6"/><path d="M5.7 10.7 A10 10 0 0 1 18.3 10.7"/></g></svg>`
      : `<span style="font-size:10px;font-weight:800;color:#7C4A03;font-family:'DM Sans',sans-serif">${L}</span>`
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#334155"><span style="width:17px;height:17px;border-radius:9px;background:#F1F5F9;border:1px solid #CBD5E1;display:inline-flex;align-items:center;justify-content:center">${glifo}</span>${nome}</span>` }
  return `<div style="display:flex;flex-wrap:wrap;gap:14px 16px;align-items:center;margin-top:10px;padding:11px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Cor · categoria</span>
    ${cat(CAT_COLOR.keypad,'Keypad')} ${cat(CAT_COLOR.ap,'Access Point')} ${cat(CAT_COLOR.camera,'Câmera')} ${cat(CAT_COLOR.som,'Som')} ${cat(CAT_COLOR.energia,'Ponto de energia')} ${cat(CAT_COLOR.sensor,'Sensor mmW')}
    <span style="width:100%;height:1px;background:#E2E8F0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Forma · local e altura</span>
    ${frm('piso','Chão')} ${frm('baixa','Parede 0,30')} ${frm('media','Parede 1,10')} ${frm('alta','Parede 1,80')} ${frm('teto','Teto')}
    <span style="width:100%;height:1px;background:#E2E8F0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Marca dentro do pino</span>
    ${mrc('T','Tomada')} ${mrc('i','Interruptor')} ${mrc('MC','Módulo de cabeceira')} ${mrc('C','Câmera')} ${mrc('A','Access Point')} ${mrc('K','Keystone / rede')} ${mrc('~','Sensor de presença (mmWave)')} ${mrc('IR','Sensor / receptor IR')} ${mrc('c','Cortina / persiana')}
    <span style="width:100%;height:1px;background:#E2E8F0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Selo · cabo</span>
    ${cab('#16A34A','E','Elétrica')} ${cab('#BE185D','S','Som')} ${cab('#2563EB','R','Rede/Dados')}
    <span style="font-size:9px;color:#94A3B8;width:100%;line-height:1.5">Três leituras num pin: a <b>cor</b> diz o que é, a <b>forma</b> diz onde instalar (triângulo teto, círculo parede com o tracinho na altura, quadrado chão), o <b>selo</b> diz o cabo. O número ao lado é a altura em metros. <b>Dois selos = dois cabos no mesmo ponto</b>: subwoofer (S+E, RCA de sinal mais alimentação) e <b>AP ou câmera sem PoE</b> (R+E, CAT6 de dados mais 2×2,5mm² de energia).</span>
  </div>`
}

// Versão COMPACTA da legenda (Raphael: "dá ênfase à planta"). Uma faixa fina, só o essencial
// pra decodificar o pino — cor, forma/altura e selo do cabo — sem a grade NBR nem o texto longo.
function pontosLegendaCompacta(){
  const cat=(cor,nome)=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#334155"><span style="width:10px;height:10px;border-radius:50%;background:${cor};border:1px solid #fff;box-shadow:0 0 0 1px #cbd5e1"></span>${nome}</span>`
  const frm=(alt,nome)=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:#334155">${pinShapeSVG({alt,color:'#64748B',label:'',size:14})}${nome}</span>`
  const cab=(cor,L)=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:#334155"><span style="width:12px;height:12px;border-radius:6px;background:${cor};color:#fff;font-size:7.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center">${L}</span></span>`
  const sep=`<span style="width:1px;height:14px;background:#E2E8F0;margin:0 2px"></span>`
  return `<div style="display:flex;flex-wrap:wrap;gap:9px 12px;align-items:center;margin-top:6px;padding:6px 10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;font-size:9px">
    <b style="color:#94A3B8;text-transform:uppercase;letter-spacing:.4px;font-size:8px">Legenda</b>
    ${cat(CAT_COLOR.keypad,'Keypad')} ${cat(CAT_COLOR.ap,'AP')} ${cat(CAT_COLOR.camera,'Câmera')} ${cat(CAT_COLOR.som,'Som')} ${cat(CAT_COLOR.energia,'Energia')} ${cat(CAT_COLOR.sensor,'Sensor')}
    ${sep}${frm('piso','chão')} ${frm('baixa','0,30')} ${frm('media','1,10')} ${frm('alta','1,80')} ${frm('teto','teto')}
    ${sep}<span style="color:#64748B">cabo:</span> ${cab('#16A34A','E')}elétr. ${cab('#BE185D','S')}som ${cab('#2563EB','R')}rede
  </div>`
}

// Legenda COMPLETA de símbolos elétricos (ABNT NBR 5444) — referência fixa da RARO.
// Mostra todos os símbolos agrupados, cada um com significado. Vai na planta elétrica.
// usados = Set de syms presentes na planta. Só mostra esses (Raphael: "só os símbolos das
// coisas que contêm na planta"). Sem o Set (ou vazio), cai no comportamento antigo (mostra tudo).
function abntLegendaCompleta(usados){
  const grupos = [
    ['Tomadas', ['tomada_baixa','tomada_media','tomada_alta','tomada_piso','tomada_teto']],
    ['Interruptores', ['interruptor_simples','interruptor_paralelo','interruptor_intermediario','interruptor_4','interruptor_6']],
    ['Iluminação', ['ponto_luz','arandela','arandela_teto']],
    ['Pontos de energia', ['ponto_energia_parede','ponto_energia_teto','ponto_energia_piso']],
    ['Som', ['ponto_som_parede','ponto_som_teto','ponto_som_piso']],
    ['Rede / Dados', ['keystone_piso','keystone_baixo','keystone_media','keystone_alto','keystone_teto']],
    ['Infraestrutura', ['quadro','caixa_conduite','prumada','modulo_cabeceira']],
  ]
  // ── CONDUTORES: F, N, T e os RETORNOS (Raphael) ────────────────────────────────
  // Cada tecla do interruptor tem o SEU retorno: 1 tecla → R1; 3 teclas → R1, R2, R3. É o que
  // o eletricista precisa saber pra dimensionar o eletroduto e não errar a caixa.
  const TECLAS_LEGENDA = { interruptor_simples:1, interruptor_paralelo:2, interruptor_intermediario:3, interruptor_4:4, interruptor_6:6 }
  const fio = (L,cor,nome,desc)=>`<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;padding:4px 7px;border:1px solid #E2E8F0;border-radius:6px;background:#fff">
      <span style="flex-shrink:0;width:17px;height:17px;border-radius:9px;background:${cor};color:#fff;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 0 0 1px #CBD5E1">${L}</span>
      <span><b>${nome}</b>${desc?` — ${desc}`:''}</span></div>`
  const condutoresHtml = (usadosSet)=>{
    const temInterruptor = !usadosSet || !usadosSet.size || [...Object.keys(TECLAS_LEGENDA)].some(s=>usadosSet.has(s))
    const retornos = !usadosSet || !usadosSet.size
      ? Object.entries(TECLAS_LEGENDA)
      : Object.entries(TECLAS_LEGENDA).filter(([s])=>usadosSet.has(s))
    const linhaRet = retornos.map(([s,t])=>{
      const info=ELE_TYPE_INFO[s]||{label:s}
      const rs=Array.from({length:t},(_,i)=>`R${i+1}`).join(' · ')
      return `<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;padding:4px 7px;border:1px solid #E2E8F0;border-radius:6px;background:#fff">
        <svg viewBox="-12 -14 24 32" width="20" height="26" style="flex-shrink:0">${ELE_SYMBOLS[s]||ELE_SYMBOLS.generico}</svg>
        <span><b>${info.tipo||info.label}</b> → <b style="color:#B45309">${rs}</b></span></div>` }).join('')
    return `<div style="margin-bottom:9px">
      <div style="font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#94A3B8;margin-bottom:5px">Condutores</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${fio('F','#111827','Fase','preto ou vermelho · <b>1,5mm²</b>')}
        ${fio('N','#38BDF8','Neutro','azul-claro · <b>1,5mm²</b>')}
        ${fio('T','#16A34A','Terra','verde ou verde-amarelo · proteção · <b>1,5mm²</b>')}
        ${fio('R','#F59E0B','Retorno','do interruptor até a luz · <b>1,5mm²</b>')}
      </div>
      <div style="font-size:9px;color:#94A3B8;margin-top:5px;line-height:1.5">
        Padrão deste projeto: elétrica de automação em <b>3×1,5mm² (F+N+T)</b>.
        O keypad é alimentado <b>direto do quadro</b> e o que sai dele
        pra luz é <b>retorno 1,5mm²</b> — duas bitolas no mesmo ponto. Som: <b>2×1,5mm²</b>.
        Cortina, módulo e sensor: <b>2×2,5mm² (F+N)</b>. A bitola de cada ponto está na tabela por cômodo. O dimensionamento final dos circuitos (bitola × corrente × proteção no quadro) é do projeto elétrico.
      </div>
      ${temInterruptor&&linhaRet?`<div style="font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#94A3B8;margin:8px 0 5px">Retorno por interruptor</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${linhaRet}</div>
      <div style="font-size:9px;color:#94A3B8;margin-top:5px;line-height:1.5">Cada tecla comanda um circuito e leva o <b>seu</b> retorno. Na caixa do interruptor chega <b>F</b> (e <b>N</b> quando é keypad) e saem <b>R1…Rn</b> — uma por tecla. O <b>T</b> acompanha o circuito.</div>`:''}
    </div>`
  }
  const usa = (usados && usados.size) ? (s=>usados.has(s)) : (()=>true)
  const gruposFiltrados = grupos.map(([t,syms])=>[t, syms.filter(usa)]).filter(([,syms])=>syms.length)
  // Os condutores valem mesmo quando nenhum símbolo passou no filtro: F/N/T é referência do doc.
  if(!gruposFiltrados.length) return ''
  const item = sym => { const info=ELE_TYPE_INFO[sym]||{label:'',tipo:sym}
    return `<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#334155;padding:4px 7px;border:1px solid #E2E8F0;border-radius:6px;background:#fff">
      <svg viewBox="-12 -14 24 32" width="22" height="28" style="flex-shrink:0">${ELE_SYMBOLS[sym]||ELE_SYMBOLS.generico}</svg>
      <span><b>${info.label}</b> — ${info.tipo}</span></div>` }
  return `<div style="margin-top:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
    <div style="font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#0D1420;margin-bottom:2px">Legenda de Símbolos — Elétrica (ABNT NBR 5444)</div>
    <div style="font-size:9.5px;color:#94A3B8;margin-bottom:9px">Só os símbolos que aparecem nesta planta.</div>
    ${gruposFiltrados.map(([titulo,syms])=>`<div style="margin-bottom:9px"><div style="font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#94A3B8;margin-bottom:5px">${titulo}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${syms.map(item).join('')}</div></div>`).join('')}
    ${condutoresHtml(usados)}
  </div>`
}

async function downscale(dataUrl, maxDim=1568, q=0.85) {
  return new Promise(res=>{
    const img=new Image()
    img.onload=()=>{
      const sc=Math.min(1,maxDim/Math.max(img.width,img.height))
      const cv=document.createElement('canvas')
      cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc)
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height)
      res(cv.toDataURL('image/jpeg',q))
    }
    img.onerror=()=>res(dataUrl); img.src=dataUrl
  })
}
async function pdfToImg(b64){
  return new Promise((resolve,reject)=>{
    function go(){
      const lib=window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0))
      lib.getDocument({data:bytes}).promise.then(p=>p.getPage(1)).then(pg=>{
        const vp=pg.getViewport({scale:2}); const cv=document.createElement('canvas')
        cv.width=vp.width; cv.height=vp.height
        pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise.then(()=>resolve(cv.toDataURL('image/jpeg',0.85))).catch(reject)
      }).catch(reject)
    }
    if(window.pdfjsLib) go()
    else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=go;s.onerror=()=>reject(new Error('pdf.js'));document.head.appendChild(s)}
  })
}

async function askClaude(messages, imageB64=null, mime='image/jpeg', maxTokens=1500, onCost=null) {
  // No modo demonstração não há backend /api/claude nem IA. Bloqueia toda chamada de API.
  if(isDemo()) throw new Error('__DEMO_SEM_IA__')
  const content = []
  if(imageB64) content.push({type:'image',source:{type:'base64',media_type:mime,data:imageB64}})
  const apiMessages = messages.map(m=>({role:m.role, content: m.role==='user' && m===messages[messages.length-1] && imageB64
    ? [...content, {type:'text',text:m.text}]
    : m.text }))
  const payload = JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:maxTokens,clientStream:true,messages:apiMessages})
  // estimativa de tokens de entrada (≈4 chars/token; imagem ≈ 1300 tokens)
  const inChars = messages.reduce((s,m)=>s+(m.text?.length||0),0)
  const inTokens = Math.ceil(inChars/4) + (imageB64?1300:0)

  const res = await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})
  if(!res.ok){
    const t = await res.text()
    throw new Error('API '+res.status+': '+t.slice(0,150))
  }
  const ct = res.headers.get('content-type')||''
  if(ct.includes('application/json')){
    const data = await res.json()
    const txt = data.content?.[0]?.text || ''
    reportCost(onCost, inTokens, data.usage?.output_tokens ?? Math.ceil(txt.length/4))
    return txt
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full='', buffer=''
  while(true){
    const {done,value} = await reader.read()
    if(done) break
    buffer += decoder.decode(value,{stream:true})
    const lines = buffer.split('\n')
    buffer = lines.pop()||''
    for(const line of lines){
      if(!line.startsWith('data:')) continue
      const d=line.slice(5).trim()
      if(!d||d==='[DONE]') continue
      try{
        const evt=JSON.parse(d)
        if(evt.type==='content_block_delta' && evt.delta?.text) full+=evt.delta.text
        if(evt.type==='error') throw new Error(evt.error?.message||'erro no stream')
      }catch(e){ if(e.message&&e.message!=='Unexpected end of JSON input') {/*parcial*/} }
    }
  }
  reportCost(onCost, inTokens, Math.ceil(full.length/4))
  return full
}
// Preço Sonnet (US$/milhão de tokens): input 3, output 15. Câmbio aproximado.
const USD_BRL = 5.40
function reportCost(onCost, inTokens, outTokens){
  if(!onCost) return
  const usd = (inTokens/1e6)*3 + (outTokens/1e6)*15
  onCost({ inTokens, outTokens, usd, brl: usd*USD_BRL })
}

// Seção colapsável para filtros na sidebar do editor
function FilterSection({ title, badge, onClear, defaultOpen=false, children }){
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:'100%',background:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',padding:'7px 10px',
          display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.5)',fontFamily:'inherit',fontSize:10}}>
        <i className={`ti ${open?'ti-chevron-down':'ti-chevron-right'}`} style={{fontSize:10,flexShrink:0}} aria-hidden/>
        <span style={{flex:1,textAlign:'left',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>{title}</span>
        {badge>0&&<span style={{background:'#38BDF8',color:'#000',borderRadius:8,padding:'0 5px',fontSize:8,fontWeight:700}}>{badge}</span>}
        {onClear&&badge>0&&<span onClick={e=>{e.stopPropagation();onClear()}} style={{fontSize:8,color:'rgba(255,255,255,0.35)',cursor:'pointer',padding:'1px 4px',borderRadius:3,background:'rgba(255,255,255,0.06)'}}>limpar</span>}
      </button>
      {open&&<div style={{padding:'6px 10px 8px',background:'#0a1020'}}>{children}</div>}
    </div>
  )
}

// ── Rack Modal: seleciona equipamentos dentro do rack ─────────────────────────
function RackModal({ catalog, rackEquip, onChange, markers, onClose, onApply }){
  const [equip, setEquip] = React.useState(rackEquip.length ? rackEquip : [
    {code:'ONT',name:'ONT / Modem da operadora',qty:1,u:'U1',funcao:'Fibra → Internet'},
    {code:'UDM-SE',name:'Dream Machine SE',qty:1,u:'U2-U3',funcao:'Roteador/Gateway'},
    {code:'PP-24',name:'Patch Panel 24 portas CAT6',qty:1,u:'U4-U5',funcao:'Organização cabos'},
    {code:'ORG-1U',name:'Organizador horizontal 1U',qty:2,u:'U6,U7',funcao:'Gestão de cabos'},
    {code:'PDU-8',name:'Régua 8 tomadas filtrada',qty:1,u:'U8',funcao:'Alimentação'},
  ])
  const [catFilter, setCatFilter] = React.useState('Todos')
  function isRackCandidate(c){
    const n=(c.name||'').toLowerCase(), sub=(c.subcategory||'').toLowerCase(), cat=(c.category||'').toLowerCase()
    return n.includes('rack')||n.includes('patch panel')||n.includes('patch cord')||n.includes('organizador')||n.includes('régua')||
      n.includes('switch')||n.includes('dream machine')||n.includes('amplificador')||n.includes('receiver')||n.includes('udm')||
      n.includes('ont')||n.includes('modem')||n.includes('fibra')||n.includes('onu')||n.includes('nobreak')||
      sub==='rack'||sub==='switch'||sub==='patch panel'||sub==='patch cord'||sub==='amplificador'||sub==='receiver'||
      cat==='redes'||cat==='sonorização'
  }
  const allCats = ['Todos', ...new Set((catalog||[]).filter(isRackCandidate).map(c=>c.category||'Outros'))]
  const rackItems = (catalog||[]).filter(c=>isRackCandidate(c) && (catFilter==='Todos'||c.category===catFilter))
  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:580,maxHeight:'85vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-server" style={{marginRight:6,color:'#7C3AED'}} aria-hidden/>Rack / CPD — Equipamentos</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:12}}>Configure os equipamentos dentro do rack. O rack aparece como um único pin na planta.</div>
          <div style={{display:'flex',gap:6,alignItems:'center',padding:'0 0 4px',fontSize:9,fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>
            <span style={{width:54}}>Posição U</span><span style={{flex:1}}>Equipamento</span><span style={{flex:1}}>Função</span><span style={{width:54,textAlign:'center'}}>Qtd</span><span style={{width:20}}/>
          </div>
          {/* Equipment list */}
          {equip.map((it,i)=>(
            <div key={i} style={{display:'flex',gap:6,alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
              <input value={it.u} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,u:e.target.value}:x))}
                style={{width:54,fontSize:11}} placeholder="U1-U2" title="Posição U"/>
              <input value={it.name} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                style={{flex:1,fontSize:11}} placeholder="Equipamento"/>
              <input value={it.funcao||''} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,funcao:e.target.value}:x))}
                style={{flex:1,fontSize:11}} placeholder="Função"/>
              <div style={{display:'flex',alignItems:'center',gap:2,width:54}}>
                <button onClick={()=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,qty:Math.max(1,(parseInt(x.qty)||1)-1)}:x))} style={{width:18,height:22,border:'1px solid var(--border)',borderRadius:4,background:'var(--surf)',cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>−</button>
                <input value={it.qty} type="number" min="1" onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,qty:parseInt(e.target.value)||1}:x))}
                  style={{width:28,fontSize:11,textAlign:'center',padding:'2px 0'}} title="Quantidade"/>
                <button onClick={()=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,qty:(parseInt(x.qty)||1)+1}:x))} style={{width:18,height:22,border:'1px solid var(--border)',borderRadius:4,background:'var(--surf)',cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>+</button>
              </div>
              <button onClick={()=>setEquip(eq=>eq.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14,flexShrink:0,width:20}}>✕</button>
            </div>
          ))}
          {/* Add from catalog — filtrado por categoria */}
          <div style={{marginTop:12,background:'var(--surf)',borderRadius:6,padding:10,border:'1px solid var(--border)'}}>
            <div style={{fontSize:10,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',marginBottom:8}}>Adicionar do catálogo</div>
            <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap'}}>
              {allCats.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)}
                  style={{fontSize:9,padding:'2px 8px',borderRadius:8,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                    borderColor:catFilter===c?'var(--accent)':'var(--border)',
                    background:catFilter===c?'var(--accent-lt)':'transparent',
                    color:catFilter===c?'var(--accent)':'var(--text3)'}}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
              {rackItems.length===0
                ? <div style={{fontSize:11,color:'var(--text3)',padding:'8px 0'}}>Nenhum item no catálogo para esta categoria.</div>
                : rackItems.map(c=>(
                  <button key={c.code} onClick={()=>setEquip(eq=>[...eq,{code:c.code,name:c.name,qty:1,u:`U${eq.length+1}`,funcao:c.subcategory||''}])}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:11,textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surf2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{fontWeight:600,fontFamily:'monospace',fontSize:10,color:'var(--accent)',minWidth:60}}>{c.code}</span>
                    <span style={{flex:1}}>{c.name}</span>
                    <span style={{fontSize:9,color:'var(--text3)'}}>{c.subcategory||c.category}</span>
                    <span style={{fontSize:10,color:'var(--accent)',fontWeight:700}}>+</span>
                  </button>
                ))}
            </div>
          </div>
          <button onClick={()=>setEquip(eq=>[...eq,{code:'',name:'',qty:1,u:`U${eq.length+1}`,funcao:''}])}
            style={{marginTop:8,background:'none',border:'1px dashed var(--border)',borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:11,color:'var(--text3)',width:'100%'}}>
            + Adicionar equipamento manual
          </button>
        </div>
        <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center'}}>
          <span style={{fontSize:10,color:'var(--text3)',flex:1}}>{equip.length} equipamento{equip.length!==1?'s':''} no rack</span>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={()=>onApply(equip)}>Salvar e colocar na planta</button>
        </div>
      </div>
    </div>
  )
}

// Error boundary to show errors instead of blank page
class ExecErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={err:null} }
  static getDerivedStateFromError(err){ return {err} }
  componentDidCatch(err,info){ console.error('ProjetoExecutivo crash:', err, info) }
  render(){
    if(this.state.err) return (
      <div style={{position:'fixed',inset:0,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:32}}>
        <div style={{color:'#F87171',fontSize:16,fontWeight:700}}>❌ Erro no Projeto Executivo</div>
        <div style={{color:'rgba(255,255,255,0.6)',fontSize:13,fontFamily:'monospace',background:'rgba(255,255,255,0.05)',padding:12,borderRadius:6,maxWidth:600,wordBreak:'break-all'}}>
          {this.state.err.message}
        </div>
        <button onClick={()=>{this.setState({err:null}); this.props.onReset?.()}}
          style={{background:'#0EA5E9',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',cursor:'pointer',fontSize:13}}>
          Tentar novamente
        </button>
      </div>
    )
    return this.props.children
  }
}

// Componente inline para adicionar cômodo sem prompt()
function AddRoomInline({ onAdd }){
  const [name, setName] = React.useState('')
  const [floor, setFloor] = React.useState('Pavimento 1')
  const [open, setOpen] = React.useState(false)
  if(!open) return (
    <button onClick={()=>setOpen(true)} style={{width:'100%',background:'rgba(56,189,248,0.1)',border:'1px dashed rgba(56,189,248,0.3)',borderRadius:5,color:'#38BDF8',cursor:'pointer',padding:'5px 0',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontFamily:'inherit'}}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(56,189,248,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(56,189,248,0.1)'}>
      <i className="ti ti-plus" style={{fontSize:12}} aria-hidden/> Adicionar cômodo
    </button>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <input autoFocus placeholder="Nome do cômodo" value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==='Escape'&&setOpen(false)}
        style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(56,189,248,0.4)',borderRadius:4,color:'#fff',fontSize:11,padding:'4px 7px',outline:'none'}}/>
      <input placeholder="Pavimento (ex: Pavimento 1)" value={floor} onChange={e=>setFloor(e.target.value)}
        style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,color:'#fff',fontSize:11,padding:'4px 7px',outline:'none'}}/>
      <div style={{display:'flex',gap:4}}>
        <button onClick={()=>{ if(name.trim()){ onAdd({name:name.trim(),floor:floor.trim()}); setName(''); setOpen(false) } }}
          style={{flex:1,background:'#0EA5E9',border:'none',borderRadius:4,color:'#fff',cursor:'pointer',padding:'4px 0',fontSize:11,fontFamily:'inherit'}}>Confirmar</button>
        <button onClick={()=>setOpen(false)} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'4px 0',fontSize:11,fontFamily:'inherit'}}>Cancelar</button>
      </div>
    </div>
  )
}

// ── PLANTAS POR PAVIMENTO (modelo/armazenamento) ─────────────────────────────────
// Prepara o dado pra receber UMA planta por pavimento (Raphael: a imagem única de todos os
// andares fica com resolução ruim). RETROCOMPATÍVEL: projeto antigo (imagem única) vira
// automaticamente "1 pavimento", sem quebrar nada. Cada pavimento: {id, nome, image, imgRatio}.
// Cada marcador ganha floorId. O editor e a geração ainda NÃO usam multi-pavimento — por ora só
// o formato de dados e a persistência estão prontos.
function normalizePlantaFloors(planta){
  if(!planta) return { floors:[], activeId:'pav-1' }
  let floors = (Array.isArray(planta.floors) && planta.floors.length) ? planta.floors : null
  if(!floors){ // legado: imagem única → 1 pavimento
    floors = planta.image ? [{ id:'pav-1', nome:'Pavimento único', image:planta.image, imgRatio:planta.imgRatio||0.75 }] : []
  }
  return { floors, activeId: (floors[0] && floors[0].id) || 'pav-1' }
}

function ProjetoExecutivoInner({ catalog=[], clients=[], preClient, fromProposal, onSaveToProposal, onClose, currentUser }) {
  // planta_data pode vir como objeto OU string JSON (do Supabase) — normaliza
  const initPlanta = (()=>{ let pd=fromProposal?.planta_data; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const initPlantaCliente = (()=>{ let pd=fromProposal?.planta_cliente; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const [step, setStep] = useState(()=> (initPlanta?.markers?.length || initPlanta?.image) ? 'editor' : 'upload')
  const [bgImage, setBgImage] = useState(()=> initPlanta?.image || null)
  // Pavimentos: migra o legado (imagem única → 1 pavimento). Por ora há sempre 1 pavimento ativo;
  // o bgImage segue sendo a imagem do pavimento ativo, então o editor atual não muda de comportamento.
  const [plantaFloors, setPlantaFloors] = useState(()=> normalizePlantaFloors(initPlanta).floors)
  const [activeFloorId, setActiveFloorId] = useState(()=> normalizePlantaFloors(initPlanta).activeId)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState(()=>{ const fid=normalizePlantaFloors(initPlanta).activeId; return (initPlanta?.markers||[]).map(m=> m.floorId ? m : {...m, floorId:fid}) })
  // Monta o array de pavimentos pra salvar, com a imagem/ratio do pavimento ATIVO sincronizados com
  // o que está no editor agora. Com 1 pavimento é igual ao de sempre — só que já no formato novo.
  const _floorsSave = () => {
    const fid = activeFloorId || (plantaFloors[0] && plantaFloors[0].id) || 'pav-1'
    const base = plantaFloors.length ? plantaFloors : [{ id:fid, nome:'Pavimento único', image:bgImage, imgRatio }]
    return base.map(f=> f.id===fid ? { ...f, image:bgImage, imgRatio } : f)
  }
  const _mkSave = () => (markers||[]).map(m=> m.floorId ? m : { ...m, floorId: activeFloorId || 'pav-1' })
  // Payload único de planta_data pra TODOS os saves — garante floors[] + floorId sempre.
  const plantaDataSave = (exec_data) => ({ image:bgImage, floors:_floorsSave(), markers:_mkSave(), cables, scale:plantScale, calibSamples, imgRatio, folgaPct, exec_data, credenciais:creds })
  const [history, setHistory] = useState([])   // (legado — pushHistory virou no-op; histórico agora é automático)
  // ── DESFAZER / REFAZER automático (Raphael): grava markers+cables a cada mudança e permite
  // andar pra trás E pra frente, como no Word. ~30 passos (bem mais que os 5 pedidos). ──
  const histRef = useRef({ stack:[], idx:-1, applying:false })
  const [histInfo, setHistInfo] = useState({ canUndo:false, canRedo:false })
  // ── Roteamento de cabos (planta elétrica) ──
  const [cableMode, setCableMode]   = useState(false)        // ativa o modo de traçar cabos
  const [hideCables, setHideCables] = useState(false)        // oculta os cabos (mostra só itens)
  const [hideConduites, setHideConduites] = useState(false)  // oculta conduítes livres separadamente
  const [hideCaixas, setHideCaixas] = useState(false)        // oculta caixas de conduíte
  const [conduitEditMode, setConduitEditMode] = useState(false) // modo: clicar cabos/itens pra adicionar ao conduíte selecionado
  const [cables, setCables]         = useState(()=> initPlanta?.cables || []) // [{id,fromUid,toUid,points:[{x,y}],color,meters?}]
  // ── Escala da planta (metros) ──
  const [plantScale, setPlantScale] = useState(()=> initPlanta?.scale || null) // metros por unidade-de-distância-%  (null = não calibrado)
  const [imgRatio, setImgRatio]     = useState(()=> initPlanta?.imgRatio || 0.75) // altura/largura da imagem (p/ converter % em distância real)
  const [calibMode, setCalibMode]   = useState(false)   // ativa o modo de calibrar clicando 2 pontos
  const [calibPts, setCalibPts]     = useState([])       // [{x,y}] até 2 pontos
  const [calibSamples, setCalibSamples] = useState(()=> initPlanta?.calibSamples || []) // [{d, metros}] medições de parede (multi-amostra)
  const [folgaPct, setFolgaPct]     = useState(15)       // folga de instalação (%)
  // ── CREDENCIAIS DO PROJETO ────────────────────────────────────────────────
  // Guardadas no app e impressas MASCARADAS no documento; em claro só na "Folha de
  // Credenciais", gerada sob demanda pra entrega em mão (decisão do Raphael).
  // ATENÇÃO: ficam em TEXTO PURO no banco, junto do projeto. Quem tiver acesso ao Supabase
  // ou a um backup lê tudo. Cifrar antes de gravar é o passo que falta — está registrado
  // como pendência, não foi feito.
  const [showCreds, setShowCreds] = useState(false)
  const [creds, setCreds] = useState(()=>{
    let pd = fromProposal?.planta_data
    if(typeof pd==='string'){ try{ pd=JSON.parse(pd) }catch{ pd=null } }
    const c = pd?.credenciais
    return { wifi:(c?.wifi)||[], cams:{ user:c?.cams?.user||'', senha:c?.cams?.senha||'', obs:c?.cams?.obs||'' }, obs:c?.obs||'' }
  })
  const [showCredSheet, setShowCredSheet] = useState(false)
  const [cableDraft, setCableDraft] = useState(null)         // {fromUid, points:[]} enquanto desenha
  const [selCable, setSelCable]     = useState(null)
  const [dragPoint, setDragPoint]   = useState(null)         // {cableId, idx}
  // ── Conduíte LIVRE (desenho na parede, sem precisar de itens origem/destino) ──
  const [conduitMode, setConduitMode] = useState(false)      // ativa o modo desenho livre de conduíte

  // ── COLABORAÇÃO EM TEMPO REAL (Supabase Presence) ─────────────────────────
  const [colaboradores, setColaboradores] = React.useState([])
  React.useEffect(()=>{
    if(!fromProposal?.id) return
    const deviceId = 'dev_'+Math.random().toString(36).slice(2,8)
    const canal = supabase.channel('exec_collab_'+fromProposal.id, { config:{ presence:{ key: deviceId } } })
    canal
      .on('presence', { event:'sync' }, ()=>{
        const state = canal.presenceState()
        const outros = Object.entries(state)
          .filter(([k])=>k!==deviceId)
          .map(([,v])=>v[0]).filter(Boolean)
        setColaboradores(outros)
      })
      .subscribe(async status=>{
        if(status==='SUBSCRIBED'){
          await canal.track({ deviceId, at: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) })
        }
      })
    return ()=>{ canal.untrack(); supabase.removeChannel(canal) }
  }, [fromProposal?.id])
  const [conduitType, setConduitType] = useState('conduite_dados')  // tipo do conduíte sendo desenhado
  const [conduitDraft, setConduitDraft] = useState([])       // [{x,y}] pontos clicados enquanto desenha
  // snapshot para undo — agora NO-OP: o histórico é automático (useEffect abaixo). Mantido
  // como stub pra não quebrar as chamadas antigas.
  const pushHistory = () => {}
  // Grava cada estado de markers+cables. Se a mudança veio do undo/redo, não regrava.
  useEffect(()=>{
    const h=histRef.current
    if(h.applying){ h.applying=false; setHistInfo({canUndo:h.idx>0, canRedo:h.idx<h.stack.length-1}); return }
    h.stack=h.stack.slice(0,h.idx+1)
    h.stack.push({markers, cables})
    if(h.stack.length>30) h.stack.shift()
    h.idx=h.stack.length-1
    setHistInfo({canUndo:h.idx>0, canRedo:false})
  },[markers, cables])
  // acumulador de custo da API Anthropic durante a geração do executivo
  const apiCostRef = useRef({ inTokens:0, outTokens:0, usd:0, brl:0, calls:0 })
  const accumulateCost = (c)=>{ const a=apiCostRef.current; a.inTokens+=c.inTokens; a.outTokens+=c.outTokens; a.usd+=c.usd; a.brl+=c.brl; a.calls++ }
  const [projectInfo, setProjectInfo] = useState({
    client: preClient?`${preClient.name1||''}${preClient.name2?' & '+preClient.name2:''}`
          : fromProposal?.client_name || '',
    notes:''
  })
  const [selClient, setSelClient] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [catFocus, setCatFocus] = useState(false) // busca focada/ativa → some os atalhos e a lista cresce
  const [catFilter, setCatFilter] = useState('')
  const [subcatFilter, setSubcatFilter] = useState('')
  const [editorSearch, setEditorSearch] = useState('')         // busca nos markers na planta
  const [filterRooms, setFilterRooms] = useState(new Set())   // cômodos selecionados (vazio = todos)
  const [filterCateg, setFilterCateg] = useState(new Set())   // categorias selecionadas (vazio = todas)
  const [filterItem, setFilterItem] = useState('')            // filtra mapa por nome de item (resumo)
  const [showRackModal, setShowRackModal] = useState(false)
  const [showFloorsModal, setShowFloorsModal] = useState(false)
  const [showSplit, setShowSplit] = useState(false)   // painel "dividir planta em pavimentos"
  const [splitDir, setSplitDir]   = useState('h')      // 'h' = um andar em cima do outro · 'v' = lado a lado
  const [splitAt, setSplitAt]     = useState(50)       // onde cortar, em % da imagem
  const [rackEquip, setRackEquip] = useState([])   // [{code,name,qty,u}]
  // gerador de ID único e monotônico (evita colisão de Date.now() em cliques rápidos)
  const _uidSeq = React.useRef(0)
  const uniqId = (pref='')=> pref + Date.now().toString(36) + '-' + (++_uidSeq.current).toString(36) + Math.random().toString(36).slice(2,6)
  const [execDoc, setExecDoc] = useState(()=> fromProposal?.exec_doc || null)         // versão Completa (HTML)
  const [execDocObra, setExecDocObra] = useState(()=> fromProposal?.exec_doc_obra || null) // versão Obra/Pedreiro (HTML)
  const [execDocEletrica, setExecDocEletrica] = useState(()=> fromProposal?.exec_doc_eletrica || null) // versão Elétrica (HTML)
  const [execDocConduites, setExecDocConduites] = useState(()=> fromProposal?.exec_doc_conduites || null) // relatório de conduítes (HTML)
  const [execDocInstal, setExecDocInstal] = useState(()=> fromProposal?.exec_doc_instalacao || null)      // plano de instalação (HTML)
  const [execMode, setExecMode] = useState('completo') // 'completo' | 'obra' | 'eletrica'
  const [showHeatmap, setShowHeatmap] = useState(true)  // mostrar mapa de calor de Wi-Fi no executivo
  const [showIds, setShowIds] = useState(false)  // códigos nos pinos DO EDITOR (para trabalhar)
  const [showIdsPdf, setShowIdsPdf] = useState(false)  // códigos nas plantas DO RELATÓRIO/PDF (default: limpo)
  // Número do ponto DENTRO do pino, nas plantas do PDF. Desligado, o pino vira só o símbolo —
  // a planta fica limpa, e quem precisa cruzar com as tabelas religa.
  const [showNumPin, setShowNumPin] = useState(false)  // (Raphael) padrão: pino só com o símbolo, sem nº
  const [filterLevels, setFilterLevels] = useState(()=>new Set())   // filtro por nível: piso/baixa/media/alta/teto (vazio = todos)
  const [showCabo, setShowCabo] = useState(true)   // mostrar a legenda de cabo (E/S/R) ao lado do pin
  const [showLegenda, setShowLegenda] = useState(true) // incluir o bloco de legenda (formas + cabos) nas plantas geradas
  const [showIdsTbl, setShowIdsTbl] = useState(false)  // (Raphael) padrão: sem coluna de ID nas tabelas
  // ── Filtros do relatório (ocultar coisas na GERAÇÃO, sem apagar nada do projeto) ──
  const [pdfFiltersOpen, setPdfFiltersOpen] = useState(false)
  const [showPdfOpts, setShowPdfOpts] = useState(false)  // painel de opções na hora de gerar o PDF
  const [hideFams, setHideFams] = useState(new Set())      // famílias de cabo fora do PDF (dados, som, camera...)
  const [hideCats, setHideCats] = useState(new Set())      // categorias de equipamento fora das plantas do PDF
  const [hidePdfConduites, setHidePdfConduites] = useState(false) // tirar todos os conduítes do PDF
  const [hideCondIds, setHideCondIds] = useState(true) // (Raphael) padrão: sem rótulo de conduíte na planta (só o traçado)
  const [legendaCompacta, setLegendaCompacta] = useState(false) // legenda em faixa fina (dá ênfase à planta)
  const [compactaObra, setCompactaObra] = useState(true) // (Raphael) Plano de Obra "Compacta" LIGADA por padrão (só afeta o modo Obra)
  // t_pecas ("Equipamentos por Cômodo e Lista de Peças") vem OCULTO por padrão (Raphael);
  // religa no seletor de tópicos do painel de PDF.
  const [hideSecs, setHideSecs] = useState(()=>new Set(['t_pecas']))  // seções fora do PDF
  const secOff = k => hideSecs.has(k)
  const [pageOrient, setPageOrient] = useState('original') // orientação da PLANTA no documento: 'original' | 'paisagem' | 'retrato' — o app gira a imagem e converte pins/cabos
  const [rotBg, setRotBg] = useState(null) // planta girada 90° (gerada em canvas quando necessário)
  const [plantPct, setPlantPct] = useState(100) // largura da planta nas páginas do documento (%) — ajustável na tela
  // ── Editor do documento (WYSIWYG) — planta como objeto ──
  // O palco (.ex-plant-stage) emula a caixa de margem da página. Horizontal: overflow:hidden
  // RECORTA (margem). Vertical: o palco CRESCE com o zoom (aspect-ratio inclui o zoom), então
  // aumentar a planta EMPURRA o conteúdo de baixo pra baixo (reflow) — pedido do Raphael.
  // Cada planta tem seu próprio transform {x,y,zoom} (individual), guardado por chave execMode:índice.
  const [plantTransforms, setPlantTransforms] = useState({}) // { 'completo:0': {x,y,zoom}, ... }
  const [selPlant, setSelPlant] = useState(0)      // índice da planta selecionada no editor
  const [plantList, setPlantList] = useState([])   // plantas lidas da própria prévia (todas as seções)
  const plantTransformsRef = useRef({})            // espelho p/ os handlers do arraste lerem sem re-anexar
  const [plantAlign, setPlantAlign] = useState('center') // 'left' | 'center' | 'right' (largura/alinhamento da página)
  const [showBreaks, setShowBreaks] = useState(true) // guias de onde a página quebra no PDF (só na prévia)
  const [hideAllPlants, setHideAllPlants] = useState(false) // ocultar TODAS as plantas do documento
  const [hideAllTables, setHideAllTables] = useState(false) // ocultar TODAS as tabelas do documento
  const _plantKey = i => `${execMode}:${i}`
  const _plantT = i => plantTransforms[_plantKey(i)] || {x:0,y:0,zoom:1}
  const _setPlantT = (i,patch) => setPlantTransforms(p=>{ const k=_plantKey(i); return {...p,[k]:{...(p[k]||{x:0,y:0,zoom:1}),...patch}} })
  const [showDocEditor, setShowDocEditor] = useState(false) // novo editor do documento (substitui o painel de opções)
  // ── Edição inline (Fase 3): torna a prévia editável (contentEditable) e exporta o que foi editado ──
  const previewIframeRef = useRef(null)
  const [docEditMode, setDocEditMode] = useState(false)  // modo "Editar textos" ligado
  const [editFrozenHtml, setEditFrozenHtml] = useState('') // snapshot congelado (com CSS de impressão) enquanto edita
  // ── Blocos como objetos (Fase 4): ocultar e reordenar blocos de topo do documento ──
  const [blockHidden, setBlockHidden] = useState(new Set()) // chaves de blocos ocultos
  const [blockOrder, setBlockOrder]   = useState([])         // ordem desejada (array de chaves); vazio = ordem natural
  const [execData, setExecData] = useState(()=> fromProposal?.planta_data?.exec_data || null) // dados crus da IA — persistidos p/ reconstruir o documento com as opções atuais
  // Modelo do documento: OPUS é o padrão e o único visível.
  // Os legados (Novo/Clássico/Fable) só reaparecem se reabilitados em Admins → Modelos de documento.
  const modelosLegadosOn = (()=>{ try{ return localStorage.getItem('raro_modelos_legados')==='1' }catch{ return false } })()
  const [execVersao, setExecVersao] = useState('opus')
  const [execProgress, setExecProgress] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [addItem, setAddItem] = useState(null)
  const [addMode, setAddMode] = useState(false)
  // Trava de edição: no celular/tablet começa LIGADA (dá pra dar zoom/rolar sem mover item).
  const [editLock, setEditLock] = useState(()=>{ try{ return (('ontouchstart' in window) || navigator.maxTouchPoints>0) && window.matchMedia('(max-width:1024px)').matches }catch{ return false } })
  const [rooms, setRooms] = useState([])          // [{id,name,floor,x,y}] — cômodos identificados pela IA
  const [editingRoom, setEditingRoom] = useState(null)  // id sendo editado na lista
  const [imgZoom, setImgZoom]   = useState(1)
  const [imgPan,  setImgPan]    = useState({x:0, y:0})
  const [panning, setPanning]   = useState(null)   // {startX, startY, panX, panY}
  const imgContainerRef = useRef()

  // Reset zoom/pan quando trocar de imagem
  useEffect(()=>{ setImgZoom(1); setImgPan({x:0,y:0}) },[bgImage])

  function onImgWheel(e){
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    setImgZoom(z => Math.min(8, Math.max(0.3, z + delta * z)))
  }
  function onImgMouseDown(e){
    if(e.button !== 0) return
    e.preventDefault()
    setPanning({startX: e.clientX, startY: e.clientY, panX: imgPan.x, panY: imgPan.y})
  }
  function onImgMouseMove(e){
    if(!panning) return
    setImgPan({x: panning.panX + (e.clientX - panning.startX), y: panning.panY + (e.clientY - panning.startY)})
  }
  function onImgMouseUp(){ setPanning(null) }
  function onImgDblClick(){ setImgZoom(1); setImgPan({x:0,y:0}) }

  const chatEndRef = useRef()
  const fileRef = useRef()
  const bgOnlyRef = useRef()
  const containerRef = useRef()
  const canvasRef = useRef()                 // wrapper rolável da planta no editor
  const contentBoxRef = useRef(null)         // bbox (%) do DESENHO na planta (área não-branca), pra posicionar pontos importados
  // Detecta a área desenhada da planta (ignora margem/moldura branca) via canvas.
  // Guarda em contentBoxRef como {x0,y0,x1,y1} em %. Se falhar, deixa null (usa 0-100).
  function computeContentBox(imgEl){
    try{
      if(!imgEl||!imgEl.naturalWidth) return
      const W=Math.min(imgEl.naturalWidth,900), H=Math.round(imgEl.naturalHeight*(W/imgEl.naturalWidth))
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H
      const ctx=cv.getContext('2d'); ctx.drawImage(imgEl,0,0,W,H)
      const d=ctx.getImageData(0,0,W,H).data
      let minX=W,maxX=0,minY=H,maxY=0,hit=0
      for(let y=0;y<H;y+=2){ for(let x=0;x<W;x+=2){ const i=(y*W+x)*4
        if(d[i]<225||d[i+1]<225||d[i+2]<225){ hit++; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y } } }
      if(hit<50){ contentBoxRef.current=null; return }
      const box={ x0:minX/W*100, y0:minY/H*100, x1:maxX/W*100, y1:maxY/H*100 }
      // só usa se a "moldura" for relevante (o desenho ocupa < 88% de alguma dimensão)
      contentBoxRef.current = ((box.x1-box.x0)<88 || (box.y1-box.y0)<88) ? box : null
    }catch{ contentBoxRef.current=null }
  }
  const [canvasPan, setCanvasPan] = useState(null)  // {sx,sy,sl,st} enquanto arrasta o fundo

  // Attach wheel with passive:false so preventDefault() works
  useEffect(()=>{
    const el = imgContainerRef.current
    if(!el) return
    el.addEventListener('wheel', onImgWheel, {passive:false})
    return ()=> el.removeEventListener('wheel', onImgWheel)
  }) // re-runs each render to always get latest handler; cheap since no real side-effect

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[chat])

  // Gera markers a partir dos itens da proposta (distribuídos por cômodo na planta)
  function markersFromProposal(startN=1){
    const floors = typeof fromProposal?.floors==='string' ? (()=>{try{return JSON.parse(fromProposal.floors)}catch{return[]}})() : (fromProposal?.floors||[])
    const grupos=[]; let n=startN
    floors.forEach(fl=>(fl.rooms||[]).forEach(r=>{
      const items=[]
      ;(r.items||[]).forEach(it=>{
        if(!it.name && !it.code) return
        const cat=catalog.find(c=>c.code===it.code)
        const qty=parseInt(it.qty)||1
        for(let i=0;i<qty;i++){
          if(isRackItem(it.name||cat?.name||'', it.code||'')) continue
          items.push({code:it.code||cat?.code||'', name:it.name||cat?.name||'Item', room:r.name||'',
            cost:it.cost_price||cat?.cost_price||0, sale:it.sale_price||cat?.sale_price||0, category:it.category||cat?.category||''})
        }
      })
      if(items.length) grupos.push({name:r.name||'', items})
    }))
    const mk=[]
    // mapa nome-do-cômodo -> posição real na planta (vinda da etapa "cômodos", se houver)
    const norm = s => (s||'').toLowerCase().trim()
    const roomPos = {}
    ;(rooms||[]).forEach(r=>{ if(r && norm(r.name)) roomPos[norm(r.name)] = {x:Number(r.x)||50, y:Number(r.y)||50} })

    // grade de fallback (quando o cômodo não tem posição conhecida)
    const semPos = grupos.filter(g=>!roomPos[norm(g.name)])
    const cols=Math.ceil(Math.sqrt(semPos.length))||1
    const rows=Math.ceil(semPos.length/cols)||1
    let fbIdx=0
    // Área útil = onde o DESENHO está (ignora moldura branca). Sem bbox conhecido, usa a folha toda.
    const CB=contentBoxRef.current
    const bx0=CB?CB.x0+1:3, bx1=CB?CB.x1-1:97, by0=CB?CB.y0+1:4, by1=CB?CB.y1-1:96
    const bw=Math.max(6,bx1-bx0), bh=Math.max(6,by1-by0)

    grupos.forEach((room)=>{
      const per=room.items.length
      const icols=Math.ceil(Math.sqrt(per))||1
      const irows=Math.ceil(per/icols)||1
      const pos = roomPos[norm(room.name)]
      let baseX, baseY, spreadX, spreadY
      if(pos){
        // agrupa os itens em torno do CENTRO real do cômodo, num quadrante compacto
        const clusterW=Math.min(22, 6+icols*3.2), clusterH=Math.min(20, 6+irows*3.2)
        baseX = pos.x - clusterW/2
        baseY = pos.y - clusterH/2
        spreadX = icols>1 ? clusterW/(icols-1) : 0
        spreadY = irows>1 ? clusterH/(irows-1) : 0
      } else {
        // fallback: grade DENTRO da área desenhada (não na moldura branca)
        const cx=fbIdx%cols, cy=Math.floor(fbIdx/cols); fbIdx++
        const cellW=bw/cols, cellH=bh/rows
        baseX = bx0+cellW*cx+cellW*0.18; baseY = by0+cellH*cy+cellH*0.18
        spreadX = (cellW*0.64)/Math.max(1,icols-0); spreadY = (cellH*0.64)/Math.max(1,irows)
      }
      room.items.forEach((it,ii)=>{
        const ix=ii%icols, iy=Math.floor(ii/icols)
        const sub = inferCategory(it.name, it.category||'').sub || ''
        const newId = genItemId(it.room||'', sub, mk)
        mk.push({uid:Date.now()+Math.random(), n:n++, id:newId, code:it.code, name:it.name, room:it.room, note:'',
          x:Math.min(bx1,Math.max(bx0, baseX+ix*spreadX)),
          y:Math.min(by1,Math.max(by0, baseY+iy*spreadY)),
          cost:it.cost, sale:it.sale, category:it.category})
      })
    })
    return mk
  }

  // Reencaixa os pontos JÁ existentes dentro da área desenhada da planta (útil quando
  // vieram espalhados na moldura branca). Mantém o layout relativo. É desfazível.
  function encaixarPontosNaPlanta(){
    if(!markers.length){ alert('Não há pontos para encaixar.'); return }
    const im=containerRef.current?.querySelector('img'); if(im) computeContentBox(im)
    const CB=contentBoxRef.current
    if(!CB){ alert('A planta ocupa a folha inteira (sem moldura branca detectada), então os pontos já estão sobre o desenho. Se ainda saírem, me mande essa planta.'); return }
    const xs=markers.map(m=>m.x), ys=markers.map(m=>m.y)
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
    const rx=(maxX-minX)||1, ry=(maxY-minY)||1
    const bx0=CB.x0+2, bx1=CB.x1-2, by0=CB.y0+2, by1=CB.y1-2
    if(!window.confirm(`Encaixar ${markers.length} ponto(s) dentro da área desenhada da planta?\n\nMantém a disposição relativa e dá para desfazer (Ctrl+Z).`)) return
    pushHistory()
    setMarkers(ms=>ms.map(m=>({...m,
      x:+(bx0+(m.x-minX)/rx*(bx1-bx0)).toFixed(2),
      y:+(by0+(m.y-minY)/ry*(by1-by0)).toFixed(2) })))
  }

  useEffect(()=>{
    if(fromProposal && !initPlanta?.markers?.length && !markers.length){
      const mk=markersFromProposal(1)
      if(mk.length){ setMarkers(mk); if(!initPlanta?.image) setStep('editor') }
    }
  },[])  // eslint-disable-line

  // Se há planta cadastrada no cliente, guarda para mostrar na tela de upload
  const [clientePlanta, setClientePlanta] = useState(null) // {url, label}

  useEffect(()=>{
    if(bgImage || initPlanta?.image) return
    const cli = clients.find(c=> c.id===Number(fromProposal?.client_id))
      || (preClient && clients.find(c=>c.id===Number(preClient.id)))
      || preClient || null
    const planta = cli?.planta_medidas || cli?.planta_eletrica
    if(!planta?.data) return
    let cancelled=false
    ;(async()=>{
      try{
        let url = planta.data
        if((planta.type||'').includes('pdf') || /^data:application\/pdf/.test(url)){
          url = await pdfToImg(url.split(',')[1])
        }
        url = await downscale(url)
        const label = cli?.planta_medidas ? 'Planta de Medidas' : 'Planta Elétrica'
        if(!cancelled) setClientePlanta({url, label})
      }catch(e){ console.warn('planta cliente:', e?.message) }
    })()
    return ()=>{ cancelled=true }
  },[])  // eslint-disable-line

  function usarPlantaCliente(){
    if(!clientePlanta) return
    setBgImage(clientePlanta.url)
    setStep('rooms')
    startRooms(clientePlanta.url)
  }

  async function handleFile(e){
    const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url)
      setBgImage(url)
      setStep('rooms')
      startRooms(url)
    }
    reader.readAsDataURL(f)
  }

  // Troca só o fundo da planta sem reiniciar a análise (usado no editor)
  async function handleBgOnly(e){
    const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url)
      const ratio=await _imgRatioOf(url)
      setBgImage(url); setImgRatio(ratio)
      // Sincroniza a imagem do pavimento ATIVO (mantém markers; não reinicia).
      setPlantaFloors(fs=>{ const fid=activeFloorId||'pav-1'
        return fs.some(x=>x.id===fid) ? fs.map(x=>x.id===fid?{...x,image:url,imgRatio:ratio}:x)
                                      : [{id:fid,nome:'Pavimento único',image:url,imgRatio:ratio}] })
    }
    reader.readAsDataURL(f)
  }
  // ── PAVIMENTOS: upload de UMA imagem por andar (Raphael) ─────────────────────────
  function _imgRatioOf(url){ return new Promise(res=>{ try{ const im=new Image(); im.onload=()=>res(im.naturalWidth?im.naturalHeight/im.naturalWidth:0.75); im.onerror=()=>res(0.75); im.src=url }catch(_){ res(0.75) } }) }
  function newFloorId(){ const n=plantaFloors.reduce((m,f)=>Math.max(m, parseInt(String(f.id).replace(/\D/g,''),10)||0),0); return 'pav-'+(n+1) }
  function setActiveFloor(id){ const f=plantaFloors.find(x=>x.id===id); setActiveFloorId(id); if(f){ setBgImage(f.image||null); if(f.imgRatio) setImgRatio(f.imgRatio) } }
  function addFloor(){ const id=newFloorId(); const nome='Pavimento '+(plantaFloors.length+1); setPlantaFloors(fs=>[...fs,{id,nome,image:null,imgRatio:0.75}]) } // não troca o ativo — sobe a imagem e depois "Editar"
  function renameFloor(id,nome){ setPlantaFloors(fs=>fs.map(f=>f.id===id?{...f,nome}:f)) }
  function deleteFloor(id){ if(plantaFloors.length<=1){ alert('Precisa haver ao menos um pavimento.'); return }
    if(!confirm('Remover este pavimento? Os pontos marcados nele continuam no projeto (ficam sem andar até você reatribuir).')) return
    setPlantaFloors(fs=>{ const rest=fs.filter(f=>f.id!==id)
      if(activeFloorId===id && rest[0]){ setActiveFloorId(rest[0].id); setBgImage(rest[0].image||null); if(rest[0].imgRatio) setImgRatio(rest[0].imgRatio) }
      return rest }) }
  // ── DIVIDIR UMA PLANTA EM DOIS PAVIMENTOS ───────────────────────────────────────
  // Caso do Raphael: a planta veio com os dois andares na MESMA imagem (um embaixo do outro),
  // o que imprime mal. Recortar é fácil; o que não pode é perder os pinos — e eles guardam x/y
  // em % DA IMAGEM INTEIRA. Depois do corte cada metade volta a valer 0–100%, então a
  // coordenada precisa ser RECALCULADA; sem isso todo pino escorrega de lugar.
  function _cropImg(url, x0,y0,x1,y1){
    return new Promise(res=>{ try{
      const im=new Image()
      im.onload=()=>{ const W=im.naturalWidth, H=im.naturalHeight
        const w=Math.max(1,Math.round(W*(x1-x0))), h=Math.max(1,Math.round(H*(y1-y0)))
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h
        cv.getContext('2d').drawImage(im, Math.round(W*x0), Math.round(H*y0), w, h, 0, 0, w, h)
        res({ url:cv.toDataURL('image/jpeg',0.9), ratio:h/w }) }
      im.onerror=()=>res(null); im.src=url
    }catch(_){ res(null) } })
  }
  async function dividirPlantaEmPavimentos(){
    const fAtivo=plantaFloors.find(x=>x.id===activeFloorId)
    const img=(fAtivo&&fAtivo.image)||bgImage
    if(!img){ alert('Carregue a planta antes de dividir.'); return }
    const corte=Math.min(95,Math.max(5,Number(splitAt)||50))
    const horiz=splitDir==='h', p=corte/100
    const doAndar=m=>(m.floorId||activeFloorId)===activeFloorId
    const naParte2=m=>horiz ? ((m.y||0)>=corte) : ((m.x||0)>=corte)
    const dosPontos=markers.filter(doAndar)
    const n2=dosPontos.filter(naParte2).length, n1=dosPontos.length-n2
    if(!confirm(`Dividir a planta ${horiz?'na horizontal':'na vertical'} em ${corte}%?\n\n`
      +`• Pavimento atual fica com ${n1} ponto${n1!==1?'s':''}\n`
      +`• Novo pavimento recebe ${n2} ponto${n2!==1?'s':''}\n\n`
      +`As posições são recalculadas para a nova imagem. Confira e depois salve o projeto.`)) return
    const a=await _cropImg(img, 0, 0, horiz?1:p, horiz?p:1)
    const b=await _cropImg(img, horiz?0:p, horiz?p:0, 1, 1)
    if(!a||!b){ alert('Não consegui recortar a imagem.'); return }
    const novoId=newFloorId()
    // Regra de três: a metade recortada volta a valer 0–100%.
    const conv=(v,p2)=> p2 ? (v-corte)/(100-corte)*100 : v/corte*100
    const trava=v=>Math.max(0,Math.min(100,v))
    const remapPonto=m=>{ const p2=naParte2(m)
      return horiz ? {...m, y:trava(conv(m.y||0,p2)), floorId:p2?novoId:activeFloorId}
                   : {...m, x:trava(conv(m.x||0,p2)), floorId:p2?novoId:activeFloorId} }
    // Cabos: os pontos intermediários também estão em % da imagem inteira. Uso o lado da ORIGEM
    // pra converter o traçado inteiro — cabo que cruza o corte é prumada, e prumada já é tratada.
    const ladoDoCabo=c=>{ const o=markers.find(m=>m.uid===c.fromUid)||((c.points||[])[0])
      return o ? naParte2(o) : false }
    setCables(cs=>cs.map(c=>{ if(!(c.points||[]).length) return c
      const p2=ladoDoCabo(c)
      return {...c, points:c.points.map(pt=> horiz ? {...pt, y:trava(conv(pt.y||0,p2))} : {...pt, x:trava(conv(pt.x||0,p2))} )} }))
    setMarkers(ms=>ms.map(m=> doAndar(m) ? remapPonto(m) : m))
    setPlantaFloors(fs=>{
      const atual=fs.map(x=>x.id===activeFloorId?{...x, nome:x.nome||'Pavimento 1', image:a.url, imgRatio:a.ratio}:x)
      return [...atual, { id:novoId, nome:'Pavimento '+(fs.length+1), image:b.url, imgRatio:b.ratio }] })
    setBgImage(a.url); setImgRatio(a.ratio)
    setShowSplit(false)
  }
  async function handleFloorImage(id,e){ const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{ let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url); const ratio=await _imgRatioOf(url)
      setPlantaFloors(fs=>fs.map(x=>x.id===id?{...x,image:url,imgRatio:ratio}:x))
      if(id===activeFloorId){ setBgImage(url); setImgRatio(ratio) } }
    reader.readAsDataURL(f); e.target.value='' }

  // ETAPA 1: IA identifica cômodos com posições (x,y %) na imagem
  async function startRooms(imgUrl){
    if(isDemo()){ setStep('editor'); return }  // demo não tem IA: vai direto pro editor manual
    setLoading(true)
    const prompt = `Você é um projetista da RARO Home. Analise esta planta baixa e identifique TODOS os ambientes/cômodos visíveis.

Retorne SOMENTE um JSON válido, sem nenhum texto antes ou depois:
{"rooms":[{"id":1,"name":"Sala de Estar","floor":"Pavimento 1","x":25,"y":35},{"id":2,"name":"Cozinha","floor":"Pavimento 1","x":60,"y":40}]}

Campos:
- id: número sequencial (1, 2, 3...)
- name: nome do cômodo em português
- floor: "Pavimento 1", "Pavimento 2" etc. Se for apenas um pavimento use "Único"
- x: posição horizontal do CENTRO do cômodo na imagem (0=esquerda, 100=direita)
- y: posição vertical do CENTRO do cômodo na imagem (0=topo, 100=fundo)

Identifique TODOS os cômodos: salas, quartos, banheiros, cozinha, área de serviço, garagem, varanda, etc.`
    try{
      const reply = await askClaude([{role:'user',text:prompt}], imgUrl.split(',')[1], 'image/jpeg', 2000, accumulateCost)
      let clean = reply.trim().replace(/\`\`\`json?\n?/g,'').replace(/\`\`\`/g,'').trim()
      const s=clean.indexOf('{'); if(s>0) clean=clean.slice(s)
      const e=clean.lastIndexOf('}'); if(e>=0) clean=clean.slice(0,e+1)
      const parsed = JSON.parse(clean)
      if(Array.isArray(parsed.rooms)){
        setRooms(parsed.rooms.map((r,i)=>({...r, id:r.id||i+1, x:Math.max(3,Math.min(97,Number(r.x)||50)), y:Math.max(3,Math.min(97,Number(r.y)||50)) })))
      }
    }catch(err){ console.warn('startRooms parse error:', err); setRooms([]) }
    setLoading(false)
  }

  // ETAPA 2: IA faz perguntas sobre o projeto (após cômodos confirmados)
  async function startChat(imgUrl, confirmedRooms){
    setLoading(true)
    const catList = (catalog||[]).slice(0,100).map(c=>`- ${c.name} (${c.category||'geral'})`).join('\n')
    const roomsList = confirmedRooms.map(r=>`${r.id}. ${r.name}${r.floor?' ('+r.floor+')':''}`).join('\n')
    const sys = `Você é um projetista especialista da RARO Home (automação residencial Zigbee/Matter).

CÔMODOS CONFIRMADOS pelo cliente:
${roomsList}

CATÁLOGO RARO Home:
${catList}

REGRAS DO PROJETO:
1. CABECEIRA DE CAMA: combo por lado — keypad 1 botão (H=0,70m) + tomada USB (H=0,90m) + tomada comum (H=0,30m).
2. Banheiros/entrada: sensor mmWave no teto.
3. Ambientes com AC e/ou TV: Hub IR.
4. Wi-Fi: 1 AP por 50m², teto centro.
5. Rack: Dream Machine SE + switch PoE+ se >6 dispositivos PoE.

Com base nos cômodos listados, faça APENAS 4 ou 5 perguntas objetivas essenciais. Inclua OBRIGATORIAMENTE:
- Pergunta sobre KEYPADS por cômodo (quantas teclas em cada ambiente — 1, 2, 3, 4 ou 6 botões)
- Pergunta sobre TOMADAS por cômodo (quantidade e posições desejadas além das cabeceiras)
- Pergunta sobre ar-condicionado e TV (ambientes com Hub IR)
- Pergunta sobre câmeras e som ambiente
Cada pergunta em parágrafo separado. Seja direto e objetivo.`
    try{
      const reply = await askClaude([{role:'user',text:sys+'\n\nFaça as perguntas sobre este projeto.'}], null, 'image/jpeg', 800, accumulateCost)
      setChat([{role:'assistant',text:reply}])
    }catch(err){ setChat([{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function sendChat(directText){
    const text = directText || chatInput
    if(!text?.trim()||loading) return
    const userMsg={role:'user',text:text.trim()}
    const newChat=[...chat,userMsg]
    setChat(newChat); setChatInput(''); setLoading(true)
    try{
      const reply=await askClaude(newChat.map(m=>({role:m.role,text:m.text})), null, 'image/jpeg', 1200, accumulateCost)
      setChat([...newChat,{role:'assistant',text:reply}])
    }catch(err){ setChat([...newChat,{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function generatePositions(){
    setLoading(true); setExecProgress('Analisando a planta e posicionando os equipamentos...')
    const catSummary = catalog.slice(0,80).map(c=>`${c.code}: ${c.name} (${c.category})`).join('\n')
    const conversation = chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const roomsConfirmed = rooms.length
      ? `\nCÔMODOS CONFIRMADOS com posições na planta (use x,y como REFERÊNCIA CENTRAL de cada cômodo):\n${rooms.map(r=>`${r.id}. ${r.name}${r.floor?' ('+r.floor+')':''} — centro aproximado: x=${Math.round(r.x||50)}, y=${Math.round(r.y||50)}`).join('\n')}\n\nPOSICIONAMENTO: distribua os equipamentos DENTRO do cômodo correspondente, próximo ao x,y indicado (variação ±10% para não sobrepor). NUNCA empilhe itens.\n`
      : ''
    const prompt = `Você é um projetista de automação RARO Home. Posicione os equipamentos na planta.
${roomsConfirmed}
CONVERSA (premissas):
${conversation}

CATÁLOGO (use só estes códigos):
${catSummary}

REGRAS DE POSICIONAMENTO:
- Identifique visualmente cada AMBIENTE na planta.
- Keypad entrada: ao lado da porta, lado maçaneta, H=1,10m. Quantidade de botões conforme premissas da conversa (1, 2, 3, 4 ou 6 botões).
- CABECEIRA DE CAMA (OBRIGATÓRIO em todo quarto/suíte): combo em CADA lado: 1x keypad 1 botão (H=0,70m) + 1x tomada USB (H=0,90m) + 1x tomada comum (H=0,30m).
- TOMADAS POR CÔMODO: adicione tomadas conforme premissas da conversa — H=0,30m padrão, H=0,90m altura de mesa/bancada.
- SALA DE ESTAR (sempre que houver TV): posicione 5 caixas de som embutidas no teto (5.1) — frontal L/R, central, surround L/R — + subwoofer no chão próximo ao rack.
- Câmera: canto alto do ambiente, H=2,50m.
- Hub IR: só em ambientes com AR-CONDICIONADO E/OU TV, visão do aparelho.
- Sensor mmWave: entrada principal + todos os banheiros, no teto H=2,70m.
- Access Point: 1 por área de 50m², teto centro.
- Som: distribuído no teto do ambiente.
- NÃO empilhe itens. Items do rack (switch, patch panel) NÃO vão na planta.

Responda APENAS JSON válido:
{"itens":[{"id":"K1","code":"QAT42Z2B","room":"Sala","x":20,"y":40,"nota":"ao lado da porta, H=110cm"}]}`
    try{
      const reply=await askClaude(
        [{role:'user',text:prompt}],
        bgImage.split(',')[1],'image/jpeg',6000
      )
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      const s=j.indexOf('{')
      if(s>=0) j=j.slice(s)
      let parsed
      try{ parsed=JSON.parse(j) }
      catch(pe){
        const objs=[...j.matchAll(/\{[^{}]*\}/g)].map(m=>m[0])
        if(objs.length){
          try{ parsed={itens: objs.map(o=>JSON.parse(o))} }
          catch(e2){ throw new Error('A IA cortou a resposta. Clique em "Gerar sugestão" de novo.') }
        } else {
          throw new Error('A IA não retornou JSON. Tente novamente.')
        }
      }
      let cid=Date.now()
      const _mkAcc=[]
      const mk=(parsed.itens||[])
        .filter(it=>{ const cat=catalog.find(c=>c.code===it.code); return !isRackItem(cat?.name||it.name||'', it.code||'') })
        .map(it=>{
        const cat=catalog.find(c=>c.code===it.code) || catalog.find(c=>(c.name||'').toLowerCase()===(it.name||'').toLowerCase())
        const nm=cat?.name||it.name||it.code||'Item'
        const sub=inferCategory(nm, cat?.category||'').sub||''
        const idFinal = it.id || genItemId(it.room||'', sub, _mkAcc)
        const obj = {uid:cid++, id:idFinal, code:it.code||cat?.code||'', name:nm,
          room:it.room||'', x:Math.max(2,Math.min(98,Number(it.x)||50)), y:Math.max(2,Math.min(96,Number(it.y)||50)),
          note:it.nota||it.note||'', cost:cat?.cost_price||0, sale:cat?.sale_price||0, category:cat?.category||''}
        _mkAcc.push(obj)
        return obj
      })
      if(!mk.length) throw new Error('A IA não sugeriu itens. Verifique se há equipamentos no catálogo e tente novamente.')
      mk.forEach((m,i)=>{ m.n = i+1 })
      setMarkers(mk)
      setStep('editor')
    }catch(err){ alert('Erro ao posicionar: '+err.message) }
    setLoading(false)
  }

  function onDown(e,uid){ e.preventDefault(); e.stopPropagation(); setSelected(uid)
    if(editLock) return   // trava ligada: seleciona pra ver, mas não arrasta
    const r=containerRef.current.getBoundingClientRect(); setDragging({uid,ox:e.clientX,oy:e.clientY,r}) }
  const onMove=useCallback(e=>{ if(!dragging)return; const{uid,ox,oy,r}=dragging
    const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY
    const dx=((cx-ox)/r.width)*100, dy=((cy-oy)/r.height)*100
    setMarkers(ms=>ms.map(m=>m.uid!==uid?m:{...m,x:Math.max(0,Math.min(98,m.x+dx)),y:Math.max(0,Math.min(96,m.y+dy))}))
    setDragging(d=>({...d,ox:cx,oy:cy})) },[dragging])
  const onUp=useCallback(()=>setDragging(null),[])
  useEffect(()=>{
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
    window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onUp)
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)
      window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onUp)}},[onMove,onUp])

  function onCanvasClick(e){
    // modo conduíte livre: cada clique adiciona um ponto ao caminho do eletroduto
    if(conduitMode){
      const r=containerRef.current.getBoundingClientRect()
      const x=((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100
      // snap: caixa de conduíte OU rack/CPD quando perto
      const snapMarker = markers.find(m=>{
        const dist=Math.sqrt((m.x-x)**2+(m.y-y)**2)
        if(dist>=4) return false
        const sym=classifyEle(m)?.sym
        return sym==='caixa_conduite' || isRackItem(m.name||'',m.code||'')
      })
      const pt = snapMarker
        ? {x:+snapMarker.x.toFixed(1), y:+snapMarker.y.toFixed(1), caixaUid:snapMarker.uid, snapName:snapMarker.name}
        : {x:+x.toFixed(1), y:+y.toFixed(1)}
      setConduitDraft(prev=>[...prev, pt])
      return
    }
    // modo calibração: coleta 2 pontos e pergunta a distância real (precisão: milésimo de %)
    if(calibMode){
      const r=containerRef.current.getBoundingClientRect()
      const x=((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100
      setCalibPts(prev=>{
        const next=[...prev,{x:+x.toFixed(3),y:+y.toFixed(3)}]
        if(next.length===2){
          const d=polyLenWidthUnits(next)  // distância entre os 2 pontos em unidades-de-largura
          const resp=window.prompt('Quantos METROS tem essa distância que você marcou?\n(ex: 4,52 — use a medida real da parede, quanto mais exata melhor)')
          const metros=parseFloat((resp||'').replace(',','.'))
          if(metros>0 && d>0){
            const novas=[...calibSamples, {d:+d.toFixed(6), metros}]
            const escalas=novas.map(s=>s.metros/s.d)
            const media=escalas.reduce((a,b)=>a+b,0)/escalas.length
            setCalibSamples(novas); setPlantScale(media)
            let msg=`✅ Medição ${novas.length} registrada: ${metros}m.\nLargura total da planta: ~${media.toFixed(2)}m.`
            if(escalas.length>1){
              const desvio=(Math.max(...escalas)-Math.min(...escalas))/media*100
              msg+=`\n\nConferência cruzada (${escalas.length} paredes): desvio de ${desvio.toFixed(1)}%.`
              if(desvio>3) msg+=`\n⚠ Acima de 3%: alguma medição está imprecisa. Recomendo zerar a escala e medir de novo com calma (paredes maiores dão mais precisão).`
              else msg+=`\n✓ Dentro da tolerância profissional. Escala = média das medições.`
            } else {
              msg+=`\n\nPara precisão profissional, meça uma SEGUNDA parede (de preferência na outra direção). Eu cruzo as duas e te digo o desvio.`
            }
            const outra=window.confirm(msg+'\n\n→ OK para medir OUTRA parede agora\n→ Cancelar para terminar')
            if(outra){ setCalibPts([]); return [] }
          }
          setCalibMode(false); return []
        }
        return next
      })
      return
    }
    // clicar no fundo (sem modo ativo) desseleciona o conduíte/cabo e sai do modo edição
    if(!addMode && !cableMode && !calibMode){
      if(selCable || conduitEditMode){
        setSelCable(null); setConduitEditMode(false)
        return
      }
    }
    if(!addMode||!addItem)return
    const r=containerRef.current.getBoundingClientRect()
    const x=((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100
    const {cat, sub} = inferCategory(addItem.name, addItem.category||'')
    pushHistory()
    const ehPrumada = addItem.eleType==='prumada'
    setMarkers(ms=>{
      const newId = genItemId('', sub, ms)
      return [...ms,{uid:uniqId('mk'),n:ms.length+1,id:newId,code:addItem.code,name:addItem.name,floorId:activeFloorId,
        room:'',x,y,note:addItem.note||'',cost:addItem.cost_price||0,sale:addItem.sale_price||0,category:cat,subcategory:sub||'',
        ...(addItem.eleType?{eleType:addItem.eleType}:{}),
        ...(addItem.prumadaCode?{prumadaCode:addItem.prumadaCode}:{}),
        ...(addItem.prumadaAltura?{prumadaAltura:addItem.prumadaAltura}:{})}]
    })
    // Fluxo de PAR de prumada: ao colocar a 1ª, já arma a 2ª com o mesmo código
    if(ehPrumada && !addItem._segunda){
      const usados = markers.filter(m=>classifyEle(m)?.sym==='prumada').map(m=>(m.prumadaCode||'').toUpperCase())
      let cod=addItem.prumadaCode
      if(!cod){ let i=1; while(usados.includes('PR'+i)) i++; cod='PR'+i }
      const alturaResp = window.prompt(`Prumada ${cod} criada no 1º ponto.\n\nQual a ALTURA real entre os andares (pé-direito, em metros)?\nEx: 3`, '3')
      const altura = (alturaResp||'').replace(',','.')
      // grava o código+altura na prumada recém-criada
      setMarkers(ms=>ms.map((m,i)=> i===ms.length-1 && classifyEle(m)?.sym==='prumada' ? {...m, prumadaCode:cod, prumadaAltura:altura||m.prumadaAltura} : m))
      // re-arma o modo de adicionar para a SEGUNDA prumada do par (mesmo código)
      setAddItem({...addItem, prumadaCode:cod, prumadaAltura:altura, _segunda:true})
      setAddMode(true)
      alert(`Agora clique no OUTRO andar para posicionar o par da prumada ${cod} (mesmo furo, andar de baixo).`)
      return
    }
    setAddMode(false); setAddItem(null)
  }

  // ── Desfazer / Refazer (automático, markers+cables) ──
  function undo(){ const h=histRef.current; if(h.idx<=0) return; h.idx--; const s=h.stack[h.idx]; h.applying=true; setMarkers(s.markers); setCables(s.cables) }
  function redo(){ const h=histRef.current; if(h.idx>=h.stack.length-1) return; h.idx++; const s=h.stack[h.idx]; h.applying=true; setMarkers(s.markers); setCables(s.cables) }
  // pede senha 123 + confirmação para ações destrutivas / que regeram o documento
  const SENHA_ACAO = '123'
  function confirmarComSenha(mensagem){
    const senha = window.prompt(`${mensagem}\n\n⚠ Ação protegida. Digite a senha para confirmar:`)
    if(senha===null) return false   // cancelou
    if(senha.trim()!==SENHA_ACAO){ alert('Senha incorreta. Ação cancelada.'); return false }
    return true
  }
  function limparItens(){
    if(!markers.length){ alert('Não há itens para limpar.'); return }
    if(!confirmarComSenha(`Remover todos os ${markers.length} itens da planta? A planta e os cômodos continuam.`)) return
    pushHistory(); setMarkers([]); setCables([])
  }
  function recomecar(){
    if(!confirmarComSenha('Recomeçar o projeto do zero? Volta para a tela inicial e descarta planta, itens e cabos NÃO salvos.')) return
    setMarkers([]); setCables([]); setHistory([]); setBgImage(null); setChat([]); setStep('upload')
  }
  function apagarProjeto(){
    if(!confirmarComSenha('Apagar o projeto inteiro? Remove a planta, todos os itens e os cabos.')) return
    pushHistory(); setMarkers([]); setCables([]); setBgImage(null)
  }
  // Importa/sincroniza os itens da proposta. Mantém o que você já posicionou,
  // adiciona o que é novo e avisa o que saiu da proposta — perguntando antes.
  function importarDaProposta(){
    const desejados = markersFromProposal(1)   // itens que a proposta TEM agora (com IDs estáveis)
    // planta (imagem) da proposta, se ainda não houver uma carregada
    let plantaImg = null
    if(!bgImage){
      const pd = initPlanta || (()=>{ let x=fromProposal?.planta_data; if(typeof x==='string'){try{x=JSON.parse(x)}catch{x=null}} return x })()
      const pc = initPlantaCliente || (()=>{ let x=fromProposal?.planta_cliente; if(typeof x==='string'){try{x=JSON.parse(x)}catch{x=null}} return x })()
      plantaImg = pd?.image || pc?.image || null
    }
    if(!desejados.length && !plantaImg){ alert('A proposta não tem itens nem planta para importar.'); return }

    // chave estável por item (cômodo+código+ocorrência) para casar proposta ↔ planta
    const norm = s => (s||'').toString().toLowerCase().trim()
    const keyOf = (m, occ) => `${norm(m.room)}|${norm(m.code||m.name)}|${occ}`
    const withKeys = (arr) => { const seen={}; return arr.map(m=>{ const base=`${norm(m.room)}|${norm(m.code||m.name)}`; seen[base]=(seen[base]||0)+1; return {...m, _key:keyOf(m,seen[base])} }) }
    const desKeyed = withKeys(desejados)
    const existExec = markers.filter(m=>!isRackItem(m.name,m.code))
    const exKeyed = withKeys(existExec)
    const exByKey = new Map(exKeyed.map(m=>[m._key,m]))
    const desByKey = new Map(desKeyed.map(m=>[m._key,m]))

    const novos = desKeyed.filter(d=>!exByKey.has(d._key))         // estão na proposta, faltam na planta
    const removidos = exKeyed.filter(e=>!desByKey.has(e._key))     // estão na planta, saíram da proposta
    const mantidos = exKeyed.filter(e=>desByKey.has(e._key))       // já posicionados e ainda na proposta

    const primeiraVez = existExec.length===0
    if(primeiraVez){
      if(!desejados.length && !plantaImg){ return }
      if(!confirmarComSenha(`Importar da proposta?\n\n${desejados.length?`• ${desejados.length} itens serão posicionados nos cômodos\n`:''}${plantaImg?'• a planta da proposta será carregada\n':''}`)) return
      pushHistory()
      if(plantaImg) setBgImage(plantaImg)
      if(desejados.length) setMarkers(desejados)
      if(step!=='editor' && (bgImage||plantaImg||initPlanta?.image)) setStep('editor')
      return
    }

    // Re-sincronização: pergunta antes de mexer
    if(novos.length===0 && removidos.length===0){
      alert('Tudo certo! A planta já está igual à última proposta salva — mesmos itens.')
      if(plantaImg && !bgImage) setBgImage(plantaImg)
      return
    }
    const linhas = []
    if(novos.length) linhas.push(`• ${novos.length} item(ns) NOVO(s) da proposta serão adicionados`)
    if(removidos.length) linhas.push(`• ${removidos.length} item(ns) que saíram da proposta serão REMOVIDOS:\n   ${removidos.slice(0,8).map(m=>m.id||m.name).join(', ')}${removidos.length>8?'…':''}`)
    linhas.push(`• ${mantidos.length} item(ns) que você já posicionou serão MANTIDOS no lugar`)
    if(!window.confirm(`Sincronizar com a última proposta salva?\n\n${linhas.join('\n')}\n\nOK para aplicar · Cancelar para manter como está.`)) return

    pushHistory()
    // monta o novo conjunto: mantidos (na posição atual) + novos (na posição calculada). Remove os que saíram.
    const rackKeep = markers.filter(m=>isRackItem(m.name,m.code))
    let nn = 1
    const resultado = [
      ...mantidos.map(m=>{ const {_key,...rest}=m; return rest }),
      ...novos.map(m=>{ const {_key,...rest}=m; return rest }),
    ]
    // renumera o pino sequencialmente para ficar limpo
    resultado.forEach(m=>{ m.n = nn++ })
    rackKeep.forEach(m=>{ m.n = nn++ })
    setMarkers([...resultado, ...rackKeep])
    if(plantaImg && !bgImage) setBgImage(plantaImg)
    if(step!=='editor') setStep('editor')
  }
  // voltar uma etapa do fluxo
  const STEP_ORDER = ['upload','rooms','chat','editor','exec']
  function voltarEtapa(){
    const i=STEP_ORDER.indexOf(step)
    if(i>0) setStep(STEP_ORDER[i-1])
  }
  function avancarEtapa(){
    const i=STEP_ORDER.indexOf(step)
    if(i>=0 && i<STEP_ORDER.length-1) setStep(STEP_ORDER[i+1])
  }
  useEffect(()=>{
    function onKey(e){
      if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')&&step==='editor'){ e.preventDefault(); e.shiftKey?redo():undo() }
      if((e.ctrlKey||e.metaKey)&&(e.key==='y'||e.key==='Y')&&step==='editor'){ e.preventDefault(); redo() }
      if(e.key==='Escape'&&step==='editor'){
        // cancela tudo: desenho de conduíte, seleção, modo edição
        if(conduitMode){ setConduitMode(false); setConduitDraft([]) }
        else if(selCable||conduitEditMode){ setSelCable(null); setConduitEditMode(false) }
        else if(cableMode){ setCableMode(false); setCableDraft(null) }
      }
    }
    window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey)
  }) // eslint-disable-line

  // Na montagem: se há uma planta da Área de Clientes pronta, pergunta se puxa dela
  const askedClienteRef = useRef(false)
  useEffect(()=>{
    if(askedClienteRef.current) return
    askedClienteRef.current = true
    const temCliente = initPlantaCliente && (initPlantaCliente.markers?.length || initPlantaCliente.image)
    if(!temCliente) return
    // só pergunta se a Área de Clientes tem conteúdo diferente/adicional
    const usar = window.confirm('Existe uma planta montada na Área de Clientes para esta proposta.\n\nOK = puxar a planta e os itens da Área de Clientes\nCancelar = continuar com o Projeto Executivo atual')
    if(usar){
      setBgImage(initPlantaCliente.image||null)
      setMarkers(initPlantaCliente.markers||[])
      if(initPlantaCliente.cables) setCables(initPlantaCliente.cables)
      setStep('editor')
    }
  }, []) // eslint-disable-line

  // ── Pan (arrastar o fundo) + zoom por scroll no canvas do editor ──
  function onCanvasPanDown(e){
    // só inicia pan se o clique foi no fundo (não num marker/cabo) e não está adicionando item
    if(addMode || cableMode) return
    if(e.target.closest('.mk-item') || e.target.closest('.cable-handle')) return
    const el=canvasRef.current; if(!el) return
    const t=e.touches?e.touches[0]:e
    setCanvasPan({sx:t.clientX, sy:t.clientY, sl:el.scrollLeft, st:el.scrollTop})
  }
  const onCanvasPanMove=useCallback((e)=>{
    if(!canvasPan||!canvasRef.current) return
    const t=e.touches?e.touches[0]:e
    canvasRef.current.scrollLeft = canvasPan.sl - (t.clientX - canvasPan.sx)
    canvasRef.current.scrollTop  = canvasPan.st - (t.clientY - canvasPan.sy)
  },[canvasPan])
  const onCanvasPanUp=useCallback(()=>setCanvasPan(null),[])
  useEffect(()=>{
    if(canvasPan){
      window.addEventListener('mousemove',onCanvasPanMove); window.addEventListener('mouseup',onCanvasPanUp)
      window.addEventListener('touchmove',onCanvasPanMove,{passive:false}); window.addEventListener('touchend',onCanvasPanUp)
      return ()=>{ window.removeEventListener('mousemove',onCanvasPanMove); window.removeEventListener('mouseup',onCanvasPanUp)
        window.removeEventListener('touchmove',onCanvasPanMove); window.removeEventListener('touchend',onCanvasPanUp) }
    }
  },[canvasPan,onCanvasPanMove,onCanvasPanUp])
  function onCanvasWheel(e){
    if(!bgImage) return
    e.preventDefault()
    const d = e.deltaY<0 ? 0.15 : -0.15
    setZoom(z=>Math.min(4, Math.max(0.4, +(z+d).toFixed(2))))
  }

  // ── Roteamento de cabos ──
  // Legenda de cores dos cabos (segue o padrão da planta)
  const CABLE_PALETTE = { dados:'#2563EB', ap:'#F59E0B', camera:'#92400E', uplink:'#DC2626', hdmi:'#7C3AED', som:'#BE185D', eletrica:'#16A34A', fibra:'#0D9488', conduite_dados:'#1E3A8A', conduite_eletrica:'#EAB308' }
  const CABLE_LABELS  = { dados:'Keystone', ap:'AP / Access Point', camera:'Câmera', uplink:'Uplink', hdmi:'HDMI', som:'Som', eletrica:'Elétrica', eletrica_int25:'Elétrica (interruptor)', eletrica_int15:'Elétrica (interruptor)', fibra:'Fibra Óptica', conduite_dados:'Conduíte KEYSTONE', conduite_eletrica:'Conduíte ELÉTRICA' }
  // tipos de "conduíte" são eletrodutos compartilhados — desenhados grossos para o pedreiro
  const CABLE_CONDUITE = { conduite_dados:true, conduite_eletrica:true }
  const CABLE_SPEC = {
    dados:    { spec:'CAT6 U/UTP', uso:'Dados / rede', conector:'RJ45 / Keystone' },
    ap:       { spec:'CAT6 U/UTP (PoE)', uso:'Access Point', conector:'RJ45 PoE' },
    camera:   { spec:'CAT6 U/UTP (PoE)', uso:'Câmera IP', conector:'RJ45 PoE' },
    uplink:   { spec:'CAT6 / Fibra', uso:'Uplink / WAN', conector:'RJ45 / SFP' },
    hdmi:     { spec:'HDMI 2.0 / HDBaseT', uso:'Vídeo / TV', conector:'HDMI' },
    som:      { spec:'2×1,5mm² (paralelo)', uso:'Áudio / caixas', conector:'Borne / banana' },
    eletrica: { spec:'3×2,5mm² (F+N+T)', uso:'Energia / 110-220V', conector:'Direto / caixa 4×4' },
    // Duas opções pro INTERRUPTOR: a alimentação muda de bitola conforme o circuito, o retorno
    // é sempre 1,5mm². São da MESMA família elétrica (ver cableFamily/prefixo 'eletrica').
    eletrica_int25: { spec:'3×2,5mm² (F+N+T) + respectivos retornos 1,5mm²', uso:'Interruptor / keypad', conector:'Caixa 4×2 / 4×4' },
    eletrica_int15: { spec:'3×1,5mm² (F+N+T) + respectivos retornos 1,5mm²', uso:'Interruptor / keypad', conector:'Caixa 4×2 / 4×4' },
    fibra:    { spec:'Fibra óptica (drop/ONT)', uso:'Internet operadora → ONT/Modem', conector:'SC/APC' },
    conduite_dados:    { spec:'Eletroduto 3/4" (dados)', uso:'Conduíte compartilhado de DADOS', conector:'Caixa 4×4 / 4×2' },
    conduite_eletrica: { spec:'Eletroduto 3/4"–1" (elétrica)', uso:'Conduíte compartilhado de ELÉTRICA', conector:'Caixa 4×4' },
  }
  const mk = uid => markers.find(m=>m.uid===uid)
  // adivinha o tipo de cabo pela natureza dos itens conectados
  function onCableItemClick(uid){
    // modo de edição de conduíte: clique num item → adiciona ou retira seus cabos do conduíte selecionado
    if(conduitEditMode && selCable){
      const conduit = cables.find(x=>x.id===selCable)
      if(conduit?.free){
        // chave: conduiteId (auto C1/C2...) > label > id
        const chaveReal = conduit.conduiteId || (conduit.label||'').trim() || conduit.id
        const cabosDoItem = cables.filter(c=>!c.free && (c.fromUid===uid||c.toUid===uid))
        if(cabosDoItem.length===0) return true
        const jaEstaDentro = cabosDoItem.some(c=>c.conduite===chaveReal)
        if(jaEstaDentro){
          setCables(cs=>cs.map(c=> (!c.free && (c.fromUid===uid||c.toUid===uid) && c.conduite===chaveReal) ? {...c,conduite:undefined} : c ))
          return true
        }
        const emOutro = cabosDoItem.filter(c=>c.conduite && c.conduite!==chaveReal)
        if(emOutro.length>0){
          const nomes=[...new Set(emOutro.map(c=>c.conduite))].join(', ')
          const mover = window.confirm(`Este item já tem cabo(s) no conduíte "${nomes}".\n\nMOVER para este conduíte?\n\nOK = Mover  |  Cancelar = Adicionar nos dois`)
          setCables(cs=>cs.map(c=> (!c.free && (c.fromUid===uid||c.toUid===uid)) ? {...c,conduite:mover?chaveReal:(c.conduite||chaveReal)} : c ))
          return true
        }
        // adiciona normalmente
        setCables(cs=>cs.map(c=> (!c.free && (c.fromUid===uid||c.toUid===uid)) ? {...c,conduite:chaveReal} : c ))
        return true
      }
    }
    if(!cableMode) return false
    if(!cableDraft){ setCableDraft({fromUid:uid}); return true }
    if(cableDraft.fromUid===uid){ setCableDraft(null); return true }
    const from=mk(cableDraft.fromUid), to=mk(uid)
    if(from&&to){
      // cria 3 pontos intermediários distribuídos entre origem e destino (para moldar ao caminho)
      const pts=[1,2,3].map(i=>({
        x:+(from.x + (to.x-from.x)*(i/4)).toFixed(1),
        y:+(from.y + (to.y-from.y)*(i/4)).toFixed(1)
      }))
      const type = to?.cableType || from?.cableType || guessCableType(from,to)
      const newCable={ id:uniqId('cab'), fromUid:cableDraft.fromUid, toUid:uid,
        points:pts, color:CABLE_PALETTE[type], type }

      // Continuação de um percurso vindo da prumada (fluxo contínuo)
      if(cableDraft._run){
        newCable.runId=cableDraft._run.runId; newCable.runFromUid=cableDraft._run.runFromUid
        newCable.type=cableDraft._run.type; newCable.color=cableDraft._run.color
      }

      // ── INTELIGÊNCIA DA PRUMADA ──
      // FLUXO CONTÍNUO: se o cabo CHEGA numa prumada que tem par no outro pavimento,
      // o traçado continua automaticamente a partir do par — basta clicar no destino final.
      const fromEhPrumada = classifyEle(from)?.sym==='prumada'
      const toEhPrumada   = classifyEle(to)?.sym==='prumada'
      if(toEhPrumada && !fromEhPrumada){
        const cod=(to.prumadaCode||'').trim().toLowerCase()
        const par = cod ? markers.find(m=>m.uid!==to.uid && classifyEle(m)?.sym==='prumada' && (m.prumadaCode||'').trim().toLowerCase()===cod) : null
        if(par){
          const runId = newCable.runId || uniqId('run')
          newCable.runId = runId
          newCable.runToUid = par.uid
          if(!newCable.runFromUid) newCable.runFromUid = from.uid
          setCables(cs=>[...cs,newCable]); setSelCable(newCable.id)
          // continua o traçado a partir do par no outro pavimento
          setCableDraft({ fromUid:par.uid, _run:{ runId, runFromUid:newCable.runFromUid, type:newCable.type, color:newCable.color } })
          return true
        }
      }
      // FLUXO LEGADO: se este trecho SAI de uma prumada sem continuação armada, pergunta de qual item vem
      const prumadaUid = (fromEhPrumada && !cableDraft._run) ? from.uid : null
      if(prumadaUid){
        const cod=(from.prumadaCode||'').trim().toLowerCase()
        // prumadas do mesmo par (mesmo código), incluindo a do outro andar
        const parUids = new Set(markers.filter(m=>classifyEle(m)?.sym==='prumada' && (cod? (m.prumadaCode||'').trim().toLowerCase()===cod : m.uid===from.uid)).map(m=>m.uid))
        // cabos que CHEGAM em qualquer prumada do par e ainda não foram casados
        const candidatos = (cables||[]).filter(c=>!c.free && !c.runId && (parUids.has(c.toUid)||parUids.has(c.fromUid)))
          .map(c=>{ const outroUid = parUids.has(c.toUid)? c.fromUid : c.toUid; return {cabo:c, item:mk(outroUid)} })
          .filter(o=>o.item && classifyEle(o.item)?.sym!=='prumada')
        if(candidatos.length){
          const lista = candidatos.map((o,i)=>`${i+1}) #${o.item.n} ${o.item.name}${o.item.room?' ('+o.item.room+')':''}`).join('\n')
          const resp = window.prompt(`Este cabo sai da prumada ${from.prumadaCode||''} indo para ${to.name}.\n\nDe QUAL item do outro andar ele vem? Digite o número:\n\n${lista}\n\n(deixe vazio se for um cabo novo, sem par)`)
          const idx = parseInt(resp)-1
          if(idx>=0 && candidatos[idx]){
            const orig = candidatos[idx]
            const runId = orig.cabo.runId || uniqId('run')
            // marca os dois trechos com o mesmo runId e a identidade do item de origem
            newCable.runId = runId; newCable.runFromUid = orig.item.uid; newCable.type = orig.cabo.type; newCable.color = orig.cabo.color
            setCables(cs=>cs.map(c=>c.id===orig.cabo.id?{...c, runId, runToUid:uid}:c).concat(newCable))
            setSelCable(newCable.id); setCableDraft(null); return true
          }
        }
      }
      setCables(cs=>[...cs,newCable]); setSelCable(newCable.id)
    }
    setCableDraft(null); return true
  }
  // insere um ponto (dobra) no meio de um segmento do cabo
  function addCablePoint(cableId, segIdx, x, y){
    setCables(cs=>cs.map(c=>{ if(c.id!==cableId) return c
      const pts=[...c.points]; pts.splice(segIdx,0,{x:+x.toFixed(1),y:+y.toFixed(1)}); return {...c,points:pts} }))
  }
  function removeCablePoint(cableId, idx){
    setCables(cs=>cs.map(c=>c.id!==cableId?c:{...c,points:c.points.filter((_,i)=>i!==idx)}))
  }
  function deleteCable(id){ setCables(cs=>cs.filter(c=>c.id!==id)); setSelCable(null) }
  function setCableColor(id,type){ setCables(cs=>cs.map(c=>c.id===id?{...c,type,color:CABLE_PALETTE[type]}:c)) }
  // finaliza o conduíte livre desenhado (vira um cabo com free:true)
  // NÃO faz prompts — abre direto no modo edição no painel lateral
  function finishConduit(){
    if(conduitDraft.length>=2){
      const novoId=uniqId('cab')
      const primeiro=conduitDraft[0], ultimo=conduitDraft[conduitDraft.length-1]
      // auto ID curto: C1, C2, C3...
      const usados=new Set((cables||[]).filter(c=>c.free&&c.conduiteId).map(c=>c.conduiteId))
      let seq=1; while(usados.has('C'+seq)) seq++
      const conduiteId='C'+seq
      // adiciona pontos intermediários entre cada par de cliques (para ter handles de edição desde o início)
      const ptsComIntermedios=[]
      const rawPts=conduitDraft.map(p=>({x:p.x,y:p.y}))
      rawPts.forEach((p,i)=>{
        ptsComIntermedios.push({x:p.x,y:p.y})
        if(i<rawPts.length-1){
          const n=rawPts[i+1]
          ptsComIntermedios.push({x:+((p.x+n.x)/2).toFixed(1), y:+((p.y+n.y)/2).toFixed(1)})
        }
      })
      const novo={ id:novoId, free:true, type:conduitType, color:CABLE_PALETTE[conduitType],
        conduiteId,
        points:ptsComIntermedios,
        fromCaixaUid: primeiro.caixaUid||undefined,
        toCaixaUid: ultimo.caixaUid||undefined,
        fromSnapName: primeiro.snapName||undefined,
        toSnapName: ultimo.snapName||undefined }
      pushHistory()
      setCables(cs=>[...cs, novo])
      setSelCable(novoId)
      setConduitEditMode(true)
      setConduitMode(false)
    }
    setConduitDraft([])
  }
  function cancelConduit(){ setConduitDraft([]) }
  // pontos completos do cabo: origem + intermediários + destino (em %)
  function cablePolyPoints(c){
    if(c.free) return c.points||[]   // conduíte livre: o caminho são os próprios pontos clicados
    const from=mk(c.fromUid), to=mk(c.toUid)
    if(!from||!to) return []
    return [{x:from.x,y:from.y}, ...(c.points||[]), {x:to.x,y:to.y}]
  }
  // comprimento da polilinha em "unidades de largura" (corrige proporção da imagem)
  function polyLenWidthUnits(pts, ratio=imgRatio){
    let L=0
    for(let i=1;i<pts.length;i++){
      const dx=(pts[i].x-pts[i-1].x)/100
      const dy=((pts[i].y-pts[i-1].y)/100)*ratio
      L+=Math.sqrt(dx*dx+dy*dy)
    }
    return L
  }
  // metros do cabo: se o usuário fixou .meters, usa; senão calcula pela escala + folga
  function cableMeters(c){
    if(c.meters!=null && c.meters!=='') return parseFloat(c.meters)
    if(!plantScale) return null
    const pts=cablePolyPoints(c); if(pts.length<2) return null
    const base = polyLenWidthUnits(pts)*plantScale            // metros do caminho na planta
    // PERCURSO PELA PRUMADA (runId): o cabo é UM só, dividido em trechos.
    // Cada trecho leva metade da subida/descida (1,5m) e o pé-direito conta UMA vez,
    // no trecho que CHEGA na prumada (runToUid). Senão o percurso infla 3m + 1 pé-direito.
    const ehRun = !!c.runId
    const subidaDescida = ehRun ? 1.5 : 3.0                    // ~3m no total do percurso
    // PRUMADA: soma a altura do PAR (pé-direito). Cada par (mesmo código) conta UMA vez por cabo.
    const prumadas = markers.filter(m=>classifyEle(m)?.sym==='prumada')
    const alturaDoPar = (p)=>{ const cod=(p.prumadaCode||'').trim().toLowerCase()
      if(cod){ const grupo=prumadas.filter(x=>(x.prumadaCode||'').trim().toLowerCase()===cod); const h=grupo.map(x=>parseFloat(x.prumadaAltura)||0).find(v=>v>0); return h||0 }
      return parseFloat(p.prumadaAltura)||0 }
    const chaveDoPar = (p)=> (p.prumadaCode||'').trim().toLowerCase() || ('uid'+p.uid)
    let prumadaH = 0
    if(!ehRun || c.runToUid){  // trecho final de um percurso NÃO soma o pé-direito de novo
      const paresContados = new Set()
      const tocaPrumada = (p)=>{
        if(!c.free && (c.fromUid===p.uid || c.toUid===p.uid)) return true
        return pts.some(pt=>{ const dx=(pt.x-p.x), dy=(pt.y-p.y)*imgRatio; return Math.sqrt(dx*dx+dy*dy) < 4 })
      }
      for(const p of prumadas){ const chave=chaveDoPar(p); if(paresContados.has(chave)) continue
        if(tocaPrumada(p)){ prumadaH += alturaDoPar(p); paresContados.add(chave) }
      }
    }
    const comFolga = (base+subidaDescida+prumadaH) * (1+folgaPct/100)
    return Math.round(comFolga*10)/10
  }
  // Unifica os trechos de um percurso pela prumada num cabo virtual único:
  // origem e destino REAIS preservados, metragem = soma dos trechos, marcado "via prumada".
  function cablesUnificados(cbs=cables, mks=markers){
    const runs={}, out=[]
    for(const c of (cbs||[])){
      if(!c.free && c.runId){ (runs[c.runId]=runs[c.runId]||[]).push(c) }
      else out.push(c)
    }
    const findM = uid => (mks||[]).find(m=>m.uid===uid)
    for(const grupo of Object.values(runs)){
      const seg1 = grupo.find(c=>c.runToUid) || grupo[0]
      const segF = grupo.find(c=>!c.runToUid) || grupo[grupo.length-1]
      const fromUid = seg1.runFromUid || seg1.fromUid
      const toUid = segF.toUid
      const total = grupo.reduce((s,c)=>{ const m=(c.meters!=null&&c.meters!=='')?parseFloat(c.meters):cableMeters(c); return s+(m||0) },0)
      const pr = findM(seg1.toUid)
      const cod = (pr?.prumadaCode||'').trim().toUpperCase()
      out.push({ ...seg1, id:seg1.runId, fromUid, toUid,
        meters: total>0 ? String(Math.round(total*10)/10) : seg1.meters,
        _via: `via prumada${cod?' '+cod:''}`, _runSegs: grupo.length })
    }
    return out
  }
  function setCableMetersManual(id, val){ setCables(cs=>cs.map(c=>c.id===id?{...c, meters: val===''?undefined:val}:c)) }
  // ── Conduíte compartilhado (MANUAL) ──
  // capacidade aproximada de cabos CAT6 por bitola de eletroduto (40% de ocupação NBR)
  const CONDUITE_CAP = { '3/4"':6, '1"':10, '1.1/4"':16, '1.1/2"':22 }
  function setCableConduite(id, grupo){ setCables(cs=>cs.map(c=>c.id===id?{...c, conduite: grupo||undefined}:c)) }
  // lista de grupos de conduíte já criados
  function conduiteGroups(){
    const g={}; (cables||[]).forEach(c=>{ if(c.conduite){ (g[c.conduite]=g[c.conduite]||[]).push(c) } }); return g
  }
  // arrastar um ponto intermediário do cabo
  const onPointMove = useCallback((e)=>{
    if(!dragPoint||!containerRef.current) return
    const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY
    const r=containerRef.current.getBoundingClientRect()
    const x=Math.max(0,Math.min(100,((cx-r.left)/r.width)*100))
    const y=Math.max(0,Math.min(100,((cy-r.top)/r.height)*100))
    setCables(cs=>cs.map(c=>c.id!==dragPoint.cableId?c:{...c,points:c.points.map((p,i)=>i===dragPoint.idx?{x:+x.toFixed(1),y:+y.toFixed(1)}:p)}))
  },[dragPoint])
  const onPointUp = useCallback(()=>setDragPoint(null),[])
  useEffect(()=>{
    if(dragPoint){ window.addEventListener('mousemove',onPointMove); window.addEventListener('mouseup',onPointUp)
      window.addEventListener('touchmove',onPointMove,{passive:false}); window.addEventListener('touchend',onPointUp)
      return ()=>{ window.removeEventListener('mousemove',onPointMove); window.removeEventListener('mouseup',onPointUp)
        window.removeEventListener('touchmove',onPointMove); window.removeEventListener('touchend',onPointUp) } }
  },[dragPoint,onPointMove,onPointUp])

  async function askJSON(prompt, maxTokens){
    for(let attempt=0; attempt<2; attempt++){
      const reply=await askClaude([{role:'user',text:prompt}],null,'image/jpeg',maxTokens,accumulateCost)
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      const s=j.indexOf('{'); if(s>0) j=j.slice(s)
      try{ const e=j.lastIndexOf('}'); return JSON.parse(e>0?j.slice(0,e+1):j) }
      catch(_){
        try{
          let t=j.replace(/,\s*$/,'')
          const lastObj=t.lastIndexOf('}'); if(lastObj>0) t=t.slice(0,lastObj+1)
          const oA=(t.match(/\[/g)||[]).length, cA=(t.match(/\]/g)||[]).length
          const oB=(t.match(/\{/g)||[]).length, cB=(t.match(/\}/g)||[]).length
          t+=']'.repeat(Math.max(0,oA-cA))+'}'. repeat(Math.max(0,oB-cB))
          return JSON.parse(t)
        }catch(e2){ if(attempt===0) continue; throw new Error('A IA cortou a resposta. Tente novamente.') }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GERAÇÃO SEM IA — monta o objeto `d` (mesma estrutura da IA) só a partir
  // dos marcadores posicionados + cabos + convenções RARO. Tudo determinístico.
  // ─────────────────────────────────────────────────────────────────────
  function buildExecDataFromMarkers(){
    const lc = s => (s||'').toLowerCase()
    const isKeypad = m => /keypad|interruptor|botão/.test(lc(m.name))
    const isCortina = m => /cortina|persiana/.test(lc(m.name))
    const isModulo  = m => /módulo|modulo|qarz/.test(lc(m.name))
    const isCam     = m => /câmera|camera|dome/.test(lc(m.name))
    const isAP      = m => /access point|\bap\b|wi-?fi/.test(lc(m.name))
    const isSom     = m => /som|caixa|amplificador|receiver/.test(lc(m.name))
    const isTomada  = m => /tomada/.test(lc(m.name))
    const isSensor  = m => /sensor|presença/.test(lc(m.name))
    const isHubIR   = m => /hub ir|qair/.test(lc(m.name))
    const alturaDe = m => isKeypad(m) ? '1,10m' : isTomada(m) ? '0,30m' : isCortina(m) ? '2,55m' : isModulo(m) ? 'forro' : isCam(m)||isAP(m) ? 'teto' : isSom(m) ? 'teto' : isSensor(m) ? '2,20m' : '—'
    // Caixa e cabo vêm da FONTE ÚNICA (specDoPonto). Antes eram hardcoded aqui e
    // contradiziam a planta elétrica no mesmo documento — inclusive dando "4×4 + NEUTRO"
    // pra todo keypad, quando a regra é 4x2 até 3 teclas.
    const caixaDe  = m => specDoPonto(m).caixa
    const caboDe   = m => specDoPonto(m).cabo

    const aps  = markers.filter(isAP).length
    const cams = markers.filter(isCam).length
    const totalPoe = aps+cams
    const precisaSwitch = totalPoe > 6

    // pontos por ambiente (parede/dist/alt/caixa/cabo/orientação)
    const byRoom = {}
    markers.forEach(m=>{ if(isRackItem(m.name,m.code)) return; const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
    const pontos = Object.entries(byRoom).map(([ambiente,ms])=>({
      ambiente,
      linhas: ms.map(m=>({ ponto:m.id||m.code||('#'+m.n), equip:m.name, parede:m.note||'—', dist:'—',
        alt:alturaDe(m), caixa:caixaDe(m), cabo:caboDe(m), virado:'frente p/ ambiente' }))
    }))

    // cabos elétricos por cômodo (keypads, tomadas, cortinas, módulos)
    const cabos_eletricos_por_comodo = Object.entries(byRoom).map(([comodo,ms])=>{
      const itens = ms.filter(m=>isKeypad(m)||isTomada(m)||isCortina(m)||isModulo(m)).map((m,i)=>({
        id:`ELT-${(m.id||m.code||m.n)}`, equip:m.name,
        tipo:isKeypad(m)?'fase+neutro+terra':'fase+neutro',
        fios:caboDe(m), origem:'Quadro QDL', destino:`${m.room||''} H=${alturaDe(m)}`,
        metros:'—', obs:isKeypad(m)?'NEUTRO obrigatório':'' }))
      return itens.length?{comodo,itens}:null
    }).filter(Boolean)

    // cabos de rede a partir dos cabos desenhados na planta (se houver)
    // Percursos pela prumada entram como UMA linha (origem e destino reais, metragem somada).
    const _portaSeq = {}
    // Tabela de Portas: SÓ cabos de rede (dados, AP, câmera, uplink). Som/elétrica/HDMI têm tabelas próprias.
    const CABO_REDE = new Set(['dados','ap','camera','uplink'])
    const CABO_COR = { uplink:'Cinza', ap:'Azul', camera:'Verde', dados:'Amarelo' }
    // ORIGEM DE VERDADE: cabo não sai do "rack" — sai de uma PORTA de um equipamento que está
    // dentro dele (Raphael). Antes o device era o NOME DO MARCADOR ("Rack CPD") e a porta um
    // contador inventado. Agora olha o que EXISTE no rack (rackMarker.rackEquip) e escolhe o
    // equipamento pelo tipo de cabo. A porta segue sequencial — é PROPOSTA de patch, não medida.
    const _rackEq = (markers.find(m=>isRackItem(m.name||'', m.code||''))||{}).rackEquip || []
    const _achaEq = re => _rackEq.find(e=>re.test((((e.name||'')+' '+(e.code||''))).toLowerCase()))
    const _devPara = tipo => {
      const sw=_achaEq(/switch/), gw=_achaEq(/dream machine|udm|gateway|roteador/),
            pp=_achaEq(/patch panel/), ont=_achaEq(/\bont\b|modem|onu/)
      if(tipo==='uplink') return (ont||gw||{}).name || 'ONT / Gateway'
      if(tipo==='ap'||tipo==='camera') return (sw||gw||{}).name || 'Switch PoE+'
      return (pp||sw||gw||{}).name || 'Patch Panel'
    }
    const rack_cable_table = cablesUnificados().filter(c=>!c.free && CABO_REDE.has(c.type)).map((c,i)=>{
      const from=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid)
      const mt=cableMeters(c)
      // Se a ponta de origem é o rack, quem manda é o equipamento lá dentro; se o cabo sai de
      // outro ponto (ex.: keystone → keystone), a origem é o próprio ponto.
      const dev = (from && isRackItem(from.name||'', from.code||'')) ? _devPara(c.type) : (from?.name || _devPara(c.type))
      _portaSeq[dev] = (_portaSeq[dev]||0)+1
      return { porta_patch:`P${String(i+1).padStart(2,'0')}`, device_origem:dev, porta_origem:String(_portaSeq[dev]),
        destino:(to?.name||'—')+(c._via?` · ${c._via}`:''), tipo:(CABLE_SPEC[c.type]?.spec)||'CAT6',
        metros: mt!=null?String(mt):'—',
        destino_n: to?.n ?? null, destino_uid: to?.uid || null,
        etiqueta:`${(to?.code||to?.name||'PT')}`.toUpperCase().slice(0,16), cor: CABO_COR[c.type]||'Roxo' }
    })

    // cabos de som → tabela_som (mesma estrutura que a IA gera, pra alimentar tblSom)
    const somMarks = markers.filter(m=>isSom(m) && !/receiver|amplificador/.test(lc(m.name)))
    const tabela_som = somMarks.map((m,i)=>{
      const cab=(cables||[]).find(c=>!c.free && (c.toUid===m.uid||c.fromUid===m.uid))
      const mt=cab?cableMeters(cab):null
      return { num_planta:m.n, id:m.code||`S${i+1}`, equip:m.name||'Caixa de som', ambiente:m.room||'—',
        zona:'—', tipo:mountOf(m)==='teto'?'embutida teto':'caixa', saida_amplif:`Canal ${i+1}`,
        cabo:`2×1,5mm²${mt!=null?` · ~${mt}m`:''}`, obs:'' }
    })
    // cabos de som (metragem crua, mantido para quantitativos)
    const cabos_som = markers.filter(isSom).map((m,i)=>{
      const cab=(cables||[]).find(c=>c.toUid===m.uid||c.fromUid===m.uid)
      const mt=cab?cableMeters(cab):null
      return { id:`SOM-${String(i+1).padStart(2,'0')}`, origem:'Amplificador no Rack', destino:`${m.name} (${m.room||''})`,
        tipo:'2×1,5mm²', metros: mt!=null?String(mt):'—', etiqueta:`SOM-${i+1}` }
    })

    // alimentação keypads
    const alim_keypads = markers.filter(isKeypad).map((m,i)=>({ id:`KEY-${String(i+1).padStart(2,'0')}`,
      origem:'Quadro QDL — disj. dedicado', destino:`${m.name} ${m.room||''}`, cota:alturaDe(m),
      comodo:m.room||'—', metros:'—', fios:'3×1,5mm² (F+N+T)' }))

    // rack: só se houver marcador de rack
    const rackMarker = markers.find(m=>isRackItem(m.name||'', m.code||''))
    const rack_items = rackMarker ? ((rackMarker.rackEquip||[]).length
      ? rackMarker.rackEquip.map(e=>({u:e.u||'',equip:e.name||e.equip||'',funcao:e.funcao||'',watts:e.watts||'—'}))
      : []) : []

    // itens por cômodo (consolidado simples)
    const pecasMap = {}
    markers.forEach(m=>{ if(!m.name) return; pecasMap[m.name]=(pecasMap[m.name]||0)+1 })
    const pecas = Object.entries(pecasMap).map(([item,qtd])=>({item,qtd}))

    return {
      // PREMISSAS E ESCOPO — elaborado (Raphael: "podia ser mais elaborado"). Antes eram 4
      // linhas genéricas. Agora diz o ESCOPO REAL medido na planta, as CONVENÇÕES da RARO
      // (com o porquê de cada uma) e, principalmente, o que NÃO está incluso — que é o que
      // gera briga na obra. Os números saem dos marcadores, não são chute.
      premissas:(()=>{
        const vis = markers.filter(m=>!isRackItem(m.name,m.code) && m.name)
        const comodos = new Set(vis.map(m=>(m.room||'').trim()).filter(Boolean)).size
        const keypads = vis.filter(m=>/^interruptor/.test((classifyEle(m)||{}).sym||'')).length
        const soms = vis.filter(m=>pinTipoDe(m)==='som').length
        const redes = vis.filter(m=>pinTipoDe(m)==='rede').length
        const mts = (cables||[]).filter(c=>!c.free).reduce((s,c)=>s+(cableMeters(c)||0),0)
        const L = []
        L.push(`<b>Escopo:</b> ${vis.length} pontos em ${comodos} cômodo${comodos>1?'s':''}${keypads?` · ${keypads} ponto${keypads>1?'s':''} de comando (keypad)`:''}${redes?` · ${redes} de rede`:''}${soms?` · ${soms} de som`:''}${(plantScale&&mts)?` · ~${Math.round(mts)}m de cabo`:''}.`)
        L.push('<b>Este documento é a pré-instalação.</b> Ele define onde deixar cada ponta de cabo e em que caixa, antes de fechar parede e forro. Equipamento nenhum é instalado nesta fase.')
        L.push('<b>Comando é Zigbee, não fiação.</b> Dois keypads acendendo a mesma luz é cena, configurada em software — não se puxa paralelo (three-way) nem intermediário. O keypad é <b>alimentado direto do quadro</b> (fase + neutro + terra) e o neutro é obrigatório — a bitola da alimentação e dos retornos está na tabela por cômodo de cada ponto.')
        L.push('<b>Cabeamento estruturado:</b> CAT6 do rack/CPD até cada ponto, em lance único — sem emenda dentro da parede. Cada cabo é etiquetado nas duas pontas.')
        L.push('<b>Dados e elétrica não dividem eletroduto.</b> Conduítes separados, sempre — indução da rede elétrica degrada o par trançado.')
        L.push('<b>Caixa por ponto:</b> keypad até 3 teclas em 4x2; acima de 3 teclas, 4x4. Tomada, keystone e ponto de som em 4x2. Pontos de teto e forro não levam caixa de embutir.')
        L.push(precisaSwitch
          ? `<b>Rede:</b> ${totalPoe} dispositivos PoE (APs + câmeras) — acima das 8 portas do Dream Machine SE, então entra um Switch PoE+.`
          : `<b>Rede:</b> ${totalPoe} dispositivo${totalPoe===1?'':'s'} PoE — cabem nas 8 portas do Dream Machine SE, sem switch adicional.`)
        L.push('<b>Rede segmentada em VLANs:</b> Principal, IoT, Câmeras e Guest. A VLAN de câmeras não tem saída para a internet e a de visitantes não enxerga a casa. Detalhes no tópico de Wi-Fi.')
        L.push('<b>Alturas de referência:</b> tomada 0,30m · keypad e keystone de bancada 1,10m · tomada alta 1,80m · cortina 2,55m · som e sensores no teto. Cada ponto tem a sua altura na tabela por cômodo — a tabela manda, não esta lista.')
        L.push('<b>Não está incluso:</b> o projeto elétrico assinado (dimensionamento de circuitos e disjuntores é do engenheiro eletricista, com ART/NBR 5410), a alvenaria e o rasgo de parede, a infraestrutura de eletrodutos até o rack, e o quadro de distribuição — que já existe na casa.')
        L.push('<b>Medidas de cabo são estimativas</b> tiradas da planta, com folga de instalação. Servem para compra; a metragem real depende do caminho executado na obra.')
        return L
      })(),
      rack_config:{ dream_machine_portas:8, aps, cameras:cams, precisa_switch:precisaSwitch, switch_portas:precisaSwitch?16:0 },
      rack_items,
      rack_detalhe: rackMarker ? ['Rack embutido em armário ventilado','Tomada 110V dedicada para a régua filtrada','Fibra do provedor direto na porta WAN do Dream Machine SE'] : [],
      rack_cable_table,
      pontos,
      cabos_eletricos_por_comodo,
      cabos_som,
      tabela_som,
      alim_keypads,
      pecas,
      checklist_obra:[
        'Passar eletroduto 3/4" em todas as paredes antes do revestimento',
        'Deixar caixa 4×4 em CADA keypad com NEUTRO chegando (obrigatório)',
        'Eletroduto seco 3/4" do rack até o forro para câmeras e APs',
        'Tomada 110V dedicada + aterramento no nicho do rack',
        'Deixar fio-guia em todos os eletrodutos',
        'Sangria no teto para cada caixa de som embutida',
        'Identificar todos os circuitos no quadro',
        'Marcar com fita todos os pontos antes de rebocar',
      ],
      checklist_raro:[
        'Conferir neutro chegando em 100% das caixas de keypad',
        'Testar continuidade de cada cabo CAT6 antes de terminar',
        'Crimpar patch panel com etiquetas conforme tabela',
        'Parear todos os keypads e módulos Zigbee',
      ],
      _manual:true,
    }
  }

  // Gera o documento SEM chamar a IA (na mão)
  // ── VALIDADOR: roda antes de gerar (com ou sem IA). Lista o que está faltando ou
  // inconsistente, por bloco, e deixa a Ful ignorar e gerar mesmo assim.
  function validateProject(){
    const issues=[]
    // formata um ponto de forma rastreável: #nº · ID · cômodo · nome
    const ref=m=>`#${m.n}${(m.id||m.code)?' · '+(m.id||m.code):''}${m.room?' · '+m.room:' · (sem cômodo)'}${m.name?' · '+m.name:''}`
    const lista=(arr,max=12)=>arr.slice(0,max).map(ref).join('\n   ')+(arr.length>max?`\n   …e mais ${arr.length-max}`:'')
    if(!plantScale) issues.push('ESCALA não definida. Todas as metragens de cabo sairão vazias ou erradas. Use o botão Escala (meça 1 ou 2 paredes).')
    const semRoom=markers.filter(m=>!(m.room||'').trim())
    if(semRoom.length) issues.push(`${semRoom.length} ponto(s) SEM CÔMODO (viram "Geral" nas tabelas):\n   ${lista(semRoom)}`)
    const semId=markers.filter(m=>!(m.id||m.code||'').trim())
    if(semId.length) issues.push(`${semId.length} ponto(s) SEM ID (coluna ID vazia, etiqueta do cabo genérica):\n   ${lista(semId)}`)
    const semTipo=markers.filter(m=>!pontoTemTipo(m))
    if(semTipo.length) issues.push(`${semTipo.length} ponto(s) SEM TIPO definido nem detectado (saem com símbolo genérico na planta):\n   ${lista(semTipo)}`)
    const cabosSemMetro=(cables||[]).filter(c=>{ const mt=cableMeters(c); return mt==null })
    if(cabosSemMetro.length) issues.push(`${cabosSemMetro.length} cabo(s) SEM METRAGEM (sem escala e sem valor manual).`)
    const portasVazias=(cables||[]).filter(c=>!c.free && !markers.find(m=>m.uid===c.toUid))
    if(portasVazias.length) issues.push(`${portasVazias.length} cabo(s) com DESTINO não encontrado, item apagado. Linha sai com "—" na Tabela de Portas.`)
    return issues
  }
  function confirmarGeracao(){
    const issues=validateProject()
    if(!issues.length) return true
    return window.confirm(`⚠ ANTES DE GERAR — encontrei ${issues.length} pendência(s):\n\n${issues.map((s,i)=>`${i+1}. ${s}`).join('\n\n')}\n\n→ OK: gerar assim mesmo (as tabelas saem com "—" onde falta dado)\n→ Cancelar: voltar e ajustar`)
  }
  function generateExecManual(){
    if(!markers.length){ alert('Posicione ao menos um item na planta antes de gerar.'); return }
    if(!confirmarGeracao()) return
    try {
      const data = buildExecDataFromMarkers()
      setExecData(data)
      const full = buildExecHtml(data,'completo')
      const obra = buildExecHtml(data,'obra')
      const eletrica = buildExecHtml(data,'eletrica')
      const conduites = buildExecHtml(data,'conduites')
      const instal = buildExecHtml(data,'instalacao')
      setExecDoc(full); setExecDocObra(obra); setExecDocEletrica(eletrica); setExecDocConduites(conduites); setExecDocInstal(instal)
      setExecMode('completo')
      setStep('exec')
      if(fromProposal?.id){
        import('../db/supabase.js').then(({saveProposal})=>{
          saveProposal({ ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, exec_doc_conduites:conduites, planta_data:plantaDataSave(data) }).catch(e=>console.warn('Auto-save manual falhou:',e.message))
        })
      }
    } catch(err){
      console.error('generateExecManual error:', err)
      alert('Não consegui gerar o documento sem IA: '+(err?.message||err)+'\n\nVerifique se os pontos têm cômodo definido e tente de novo.')
    }
  }

  async function generateExec(){
    // Regerar com IA sobrescreve o documento (e gasta API): exige senha.
    if(!confirmarComSenha('Gerar/Regerar o documento com IA? Isso substitui o documento atual.')) return
    if(!confirmarGeracao()) return
    setLoading(true)
    setExecProgress('Coletando dados...')
    const itemsList=markers.map(m=>`#${m.n} ${m.name} (${m.code}) — ${m.room} — ${m.note}`).join('\n')
    const conversation=chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const ctx=`Premissas da conversa:\n${conversation}\n\nPontos posicionados:\n${itemsList}`
    const conv=`Convenções RARO Home: CPD/Rack centraliza tudo. Keypads SEMPRE fase+neutro 2,5mm² do quadro. Keypads entrada: 1,10m; cabeceira: 0,70m. Câmeras/APs CAT6 PoE. Som 2×1,5mm² do amplificador. Hub IR só com AC/TV. Alturas: tomada 0,30m, USB 0,90m, som teto, módulo forro, cortina 2,55m. Rack: sempre Dream Machine SE (8 portas). Se APs+Câmeras > 6, adicionar Switch PoE+. NÃO usar NVR separado. NÃO usar DIO.`

    // Conta APs e câmeras para decidir se precisa de switch
    const aps = markers.filter(m=>m.name.toLowerCase().includes('access point')||m.name.toLowerCase().includes('ap ')||m.name.toLowerCase().includes('wi-fi')||m.name.toLowerCase().includes('wifi')).length
    const cams = markers.filter(m=>m.name.toLowerCase().includes('câmera')||m.name.toLowerCase().includes('camera')||m.name.toLowerCase().includes('dome')).length
    const precisaSwitch = (aps+cams) > 6
    const rackNote = `APs: ${aps}, Câmeras: ${cams}. Dream Machine SE tem 8 portas. ${precisaSwitch?'PRECISA de Switch PoE+ adicional ('+((aps+cams)-6)+' portas a mais que o DM).':'Dream Machine SE comporta tudo ('+( aps+cams)+' dispositivos PoE).'}`

    try{
      // BLOCO 1 — premissas, rack (com visual), pontos por ambiente, módulos
      setExecProgress('Rack, premissas e pontos... (1/2)')
      const d1=await askJSON(
`Projetista RARO Home. Responda APENAS JSON válido (sem markdown). ${conv}\n\n${ctx}\n\nINFO RACK: ${rackNote}\n\n{
 "premissas":["FIBRA do provedor chega diretamente no RACK/CPD — sem roteador intermediário do provedor (Dream Machine SE É o roteador)","Rack centraliza TODOS os equipamentos ativos: DM SE, switch PoE+, amplificador de som, patch panel","Todo cabeamento estruturado CAT6 sai do rack até cada ponto","Keypads SEMPRE fase+neutro+terra do quadro (neutro obrigatório)","..."],
 "rack_config":{"dream_machine_portas":8,"aps":${aps},"cameras":${cams},"precisa_switch":${precisaSwitch},"switch_portas":${precisaSwitch?16:0},"observacao":"..."},
 "rack_items":[
  {"u":"U1","equip":"Dream Machine SE","funcao":"Roteador principal, controller UniFi, gateway Zigbee integrado, 8 portas PoE","watts":"25W"},
  {"u":"U2","equip":"Switch PoE+ 16p","funcao":"Alimentação adicional APs/câmeras PoE (somente se precisa_switch=true)","watts":"120W"},
  {"u":"U3","equip":"Amplificador multicanal 8 zonas","funcao":"Som ambiente — conecta caixas por zona","watts":"200W"},
  {"u":"U4-U5","equip":"Patch Panel 24 portas CAT6","funcao":"Organização de todos os cabos estruturados","watts":"—"},
  {"u":"U6","equip":"Organizador horizontal 1U","funcao":"Gestão de cabos patch cord — 1 por Patch Panel","watts":"—"},
  {"u":"U7","equip":"Régua 8 tomadas filtrada","funcao":"Alimentação filtrada dos equipamentos","watts":"—"}
],
 "rack_detalhe":["Rack embutido no armário...","Tomada 110V dedicada 20A...","Ventilação forçada...","..."],
 "pontos":[{"ambiente":"Estar (8,00×6,20m)","linhas":[{"ponto":"K1","equip":"Keypad 6 botões","parede":"entrada","dist":"0,15m","alt":"1,10m","caixa":"4×4 + NEUTRO","cabo":"2,5mm² ~8m"}]}],
 "modulos_teto":[{"ambiente":"Estar","itens":["5x spot LED M1","Módulo cortina M2 (forro, 2,55m)","Caixa som S1-S5 (teto, 2,70m)","Sensor mmWave P1 (teto centro)"]}],
 "modulos":[{"id":"M1","funcao":"Iluminação","ambiente":"Sala","carga":"5 spots LED","posicao":"forro gesso"}],
 "banheiros_sensores":[{"ambiente":"Banheiro Master","ponto":"Sensor mmWave teto","obs":"luz automática, umidade"}],
 "tabela_automacao":[{"num_planta":1,"id":"K1","equip":"Keypad 3 botões","ambiente":"Sala","funcao":"Liga/Desliga iluminação","protocolo":"Zigbee","posicao":"parede entrada H=1,10m","obs":"neutro obrigatório"}],
 "tabela_seguranca":[{"num_planta":2,"id":"CAM1","equip":"Câmera Dome 5MP","ambiente":"Entrada","resolucao":"5MP","tipo":"PoE CAT6","posicao":"teto H=2,80m","angulo":"120°","obs":""}],
 "_REGRA_CAMERAS":"TODAS as câmeras (mesmo Dome com Áudio) vão SEMPRE em tabela_seguranca, NUNCA em tabela_som. tabela_som contém apenas caixas, amplificador, receiver e subwoofer.",
 "tabela_som":[{"num_planta":3,"id":"S1","equip":"Caixa JBL 260","ambiente":"Sala","zona":"Zona 1","tipo":"embutida teto","saida_amplif":"Canal 1","cabo":"2×1,5mm² ~8m","obs":""}],
 "tabela_teto":[{"num_planta":4,"id":"AP1","equip":"Access Point U6+","ambiente":"Sala","tipo":"Wi-Fi 6","instalacao":"teto centro","origem":"Rack PP porta 1","cabo":"CAT6 PoE","metros":"12","obs":""}]
}`, 6000)

      // BLOCO 2 — cabos detalhados (por cômodo), alimentação, resumo, peças, checklists, riscos
      setExecProgress('Cabos detalhados e checklists... (2/2)')
      const d2=await askJSON(
`Projetista RARO Home. Responda APENAS JSON válido (sem markdown). ${conv}\n\n${ctx}\n\n{
 "rack_cable_table":[
  {"porta_patch":"P01","device_origem":"Dream Machine SE","porta_origem":"LAN1","destino":"Switch PoE+ (uplink)","device_nome":"switch-poe","tipo":"CAT6","metros":"0.5","etiqueta":"UPLINK-SW","cor":"Cinza"},
  {"porta_patch":"P02","device_origem":"Switch PoE+","porta_origem":"1","destino":"AP Sala de Estar #27","device_nome":"ap-sala-estar","tipo":"CAT6 PoE","metros":"15","etiqueta":"AP-SALA-ESTAR","cor":"Azul"},
  {"porta_patch":"P03","device_origem":"Switch PoE+","porta_origem":"2","destino":"AP Área Gourmet #28","device_nome":"ap-area-gourmet","tipo":"CAT6 PoE","metros":"18","etiqueta":"AP-GOURMET","cor":"Azul"},
  {"porta_patch":"P04","device_origem":"Switch PoE+","porta_origem":"3","destino":"AP Garagem #29","device_nome":"ap-garagem","tipo":"CAT6 PoE","metros":"22","etiqueta":"AP-GARAGEM","cor":"Azul"},
  {"porta_patch":"P05","device_origem":"Switch PoE+","porta_origem":"4","destino":"AP Suíte Master #30","device_nome":"ap-master","tipo":"CAT6 PoE","metros":"20","etiqueta":"AP-MASTER","cor":"Azul"},
  {"porta_patch":"P06","device_origem":"Switch PoE+","porta_origem":"5","destino":"AP Suíte 02 #31","device_nome":"ap-suite02","tipo":"CAT6 PoE","metros":"25","etiqueta":"AP-SUITE02","cor":"Azul"},
  {"porta_patch":"P07","device_origem":"Switch PoE+","porta_origem":"6","destino":"AP Suíte 03","device_nome":"ap-suite03","tipo":"CAT6 PoE","metros":"28","etiqueta":"AP-SUITE03","cor":"Azul"},
  {"porta_patch":"P08","device_origem":"Switch PoE+","porta_origem":"7","destino":"AP Quarto Escritório","device_nome":"ap-escritorio","tipo":"CAT6 PoE","metros":"12","etiqueta":"AP-ESCRIT","cor":"Azul"},
  {"porta_patch":"P09","device_origem":"Switch PoE+","porta_origem":"8","destino":"Câmera Entrada Social #14","device_nome":"cam-entrada","tipo":"CAT6 PoE","metros":"25","etiqueta":"CAM-ENTRADA","cor":"Verde"},
  {"porta_patch":"P10","device_origem":"Switch PoE+","porta_origem":"9","destino":"Câmera Garagem #16","device_nome":"cam-garagem","tipo":"CAT6 PoE","metros":"20","etiqueta":"CAM-GARAGEM","cor":"Verde"},
  {"porta_patch":"P11","device_origem":"Switch PoE+","porta_origem":"10","destino":"Câmera Sala Estar #19","device_nome":"cam-sala","tipo":"CAT6 PoE","metros":"14","etiqueta":"CAM-SALA","cor":"Verde"},
  {"porta_patch":"P12","device_origem":"Dream Machine SE","porta_origem":"LAN2","destino":"Keystone Sala TV1 #45","device_nome":"ks-sala-tv1","tipo":"CAT6","metros":"15","etiqueta":"KS-SALA-TV1","cor":"Amarelo"},
  {"porta_patch":"P13","device_origem":"Dream Machine SE","porta_origem":"LAN3","destino":"Keystone Suíte Master TV1 #47","device_nome":"ks-master-tv1","tipo":"CAT6","metros":"20","etiqueta":"KS-MASTER-TV1","cor":"Amarelo"}
],
 ""cabos_rede":[{"id":"CAT-01","origem":"DM SE porta 1","destino":"AP #1 Sala","tipo":"CAT6 U/UTP","bitola":"24AWG","metros":"12","cor_etiqueta":"Azul","porta_patch":"P01","etiqueta":"AP-SALA"}],
 "cabos_som":[{"id":"SOM-01","origem":"Amplificador rack saída 1","destino":"Caixa S1 Sala","tipo":"2×1,5mm²","metros":"5","etiqueta":"SOM-S1"}],
 "cabos_eletricos_por_comodo":[{"comodo":"Sala","itens":[{"id":"ELT-01","equip":"Keypad K1 entrada","tipo":"fase+neutro+terra","fios":"3x2,5mm²","origem":"Quadro QDL disj.C1","destino":"caixa 4x4 parede, H=1,10m","metros":"8","obs":"NEUTRO obrigatório"},{"id":"ELT-02","equip":"Módulo Cortina M2","tipo":"fase+neutro","fios":"2x2,5mm²","origem":"Quadro QDL disj.C2","destino":"forro 2,55m","metros":"10","obs":""}]}],
 "alim_keypads":[{"id":"KEY-01","origem":"Quadro luz disj.K1","destino":"Keypad K1 entrada Sala","cota":"1,10m","comodo":"Sala","metros":"8","fios":"2x2,5mm² F+N"}],
 "resumo_cabos":[{"tipo":"CAT6 U/UTP interno","metros_total":"275"},{"tipo":"Cabo 2×1,5mm² som","metros_total":"62"},{"tipo":"Cabo elétrico 2,5mm² keypads","metros_total":"420"},{"tipo":"Cabo elétrico 2,5mm² módulos","metros_total":"80"}],
 "pecas":[{"item":"Keypad Zigbee 1 botão","qtd":"6"}],
 "checklist_obra":["1. Passar eletroduto 3/4\" em todas as paredes antes do revestimento","2. Deixar caixa 4×4 em CADA keypad com NEUTRO chegando (obrigatório)","3. Eletroduto seco 3/4\" do rack até forro para câmeras","4. Passe de cabo CAT6 do rack até cada AP no teto antes de fechar forro","5. Tomada 110V 20A dedicada + aterramento no nicho do rack","6. Prever vão adequado no móvel/armário para o rack (largura 19pol + ventilação)","7. Deixar fio-guia em todos os eletrodutos","8. Sangria no teto para cada caixa de som embutida","9. Ponto de força para cada módulo de cortina no forro","10. Identificar todos os circuitos no quadro","11. Caixa de passagem no teto para CAT6 (se necessário)","12. Marcar com fita todos os pontos antes de rebocar"],
 "checklist_raro":["1. Conferir neutro chegando em 100% das caixas de keypad","2. Testar continuidade de cada cabo CAT6 antes de terminar","3. Crimpar patch panel com etiquetas conforme tabela","4. Energizar Dream Machine SE e configurar Wi-Fi","5. Parear todos os keypads e módulos Zigbee","6. Configurar cenas e automações por ambiente","7. Testar cobertura Wi-Fi em todos os cômodos","8. Testar som por zona e ajustar volume","9. Configurar monitoramento de câmeras","10. Treinar cliente no app"],
 "riscos":["Neutro ausente nas caixas pode danificar keypads — conferir antes de instalar","Interferência Wi-Fi em 2.4GHz com vizinhos — configurar canais manualmente","Forro de gesso pode dificultar passagem de cabo após obra — confirmar antes do fechamento"]
}`, 5500)

      setExecProgress('Montando documento...')
      const data={...d1,...d2}
      setExecData(data)
      const full=buildExecHtml(data,'completo')
      const obra=buildExecHtml(data,'obra')
      const eletrica=buildExecHtml(data,'eletrica')
      const conduites=buildExecHtml(data,'conduites')
      setExecDoc(full)
      setExecDocObra(obra)
      setExecDocEletrica(eletrica)
      setExecDocConduites(conduites)
      setExecDocInstal(buildExecHtml(data,'instalacao'))
      setStep('exec')
      setExecProgress('')

      // AUTO-SAVE se veio de proposta
      if(fromProposal?.id){
        try{
          const { saveProposal } = await import('../db/supabase.js')
          const updated = { ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, exec_doc_conduites:conduites, planta_data:plantaDataSave(data) }
          await saveProposal(updated)
        }catch(e){ console.warn('Auto-save falhou:', e.message) }
      }
    }catch(err){ alert('Erro ao gerar projeto: '+err.message); setExecProgress('') }
    setLoading(false)
  }

  // Gera a planta girada 90° (horário) num canvas, quando a orientação pedida exigir
  useEffect(()=>{
    let vivo=true
    const naturalRetrato=(imgRatio||0.75)>1
    const girar = pageOrient!=='original' && ((pageOrient==='paisagem'&&naturalRetrato)||(pageOrient==='retrato'&&!naturalRetrato))
    if(!bgImage || !girar){ setRotBg(null); return }
    const img=new Image()
    img.onload=()=>{ if(!vivo) return
      const cv=document.createElement('canvas'); cv.width=img.height; cv.height=img.width
      const ctx=cv.getContext('2d'); ctx.translate(cv.width,0); ctx.rotate(Math.PI/2); ctx.drawImage(img,0,0)
      setRotBg(cv.toDataURL('image/jpeg',0.9)) }
    img.src=bgImage
    return ()=>{ vivo=false }
  },[bgImage, pageOrient, imgRatio])

  // A planta deve ser girada? Compara a orientação pedida com a natural (imgRatio>1 = retrato)
  function _precisaGirar(){
    if(pageOrient==='original') return false
    const naturalRetrato = (imgRatio||0.75) > 1
    return (pageOrient==='paisagem' && naturalRetrato) || (pageOrient==='retrato' && !naturalRetrato)
  }
  // Visão do documento: se girar, converte imagem, pins e cabos (90° horário: x,y -> 100-y, x)
  // Metragem é carimbada ANTES da rotação para não distorcer os metros.
  function _docView(){
    if(!_precisaGirar() || !rotBg) return { bg:bgImage, mks:markers, cbs:cables, ratio:imgRatio }
    const T=(x,y)=>({ x:+(100-(y??0)).toFixed(2), y:+(x??0).toFixed(2) })
    return {
      bg: rotBg,
      mks: markers.map(m=>({ ...m, ...T(m.x,m.y) })),
      cbs: cables.map(c=>({ ...c,
        meters: (c.meters!=null&&c.meters!=='') ? c.meters : (cableMeters(c) ?? undefined),
        points: (c.points||[]).map(pt=>({ ...pt, ...T(pt.x,pt.y) })) })),
      ratio: 1/(imgRatio||0.75),
    }
  }
  // Views da planta POR PAVIMENTO — uma por andar que tenha imagem, já com os pontos e cabos
  // daquele andar. Com 1 pavimento devolve exatamente a view de hoje (inclusive a rotação do
  // _docView), então nada muda nos projetos de imagem única.
  // NOTA: com vários pavimentos a rotação (Paisagem/Retrato) não é aplicada — cada andar entra
  // na orientação natural da sua própria imagem.
  function _docViewsPorPav(){
    const comImagem=(plantaFloors||[]).filter(f=>f.image)
    if(comImagem.length<=1) return [{ ..._docView(), nome:null }]
    return comImagem.map(f=>{
      const mks=(markers||[]).filter(m=>(m.floorId||activeFloorId)===f.id)
      const uids=new Set(mks.map(m=>m.uid))
      const cbs=(cables||[]).filter(c=>{
        // Cabo livre (conduíte): não tem ponta — segue o floorId próprio; sem marca, cai no andar ativo.
        if(c.free) return (c.floorId||activeFloorId)===f.id
        // Cabo entre pontos: fica no andar quando as duas pontas estão nele.
        return (!c.fromUid||uids.has(c.fromUid)) && (!c.toUid||uids.has(c.toUid))
      })
      return { bg:f.image, mks, cbs, ratio:f.imgRatio||imgRatio, nome:f.nome||'Pavimento' }
    })
  }
  function buildExecHtml(d, mode='completo', versao, embedded=false){
    const { bg:bgImage, mks:markers, cbs:cables, ratio:imgRatio } = _docView()
    const famOculta = fazFamOculta(hideFams)   // filtro de cabo (Dados/Som/Elétrica/HDMI...) aplicado ao doc
    // Traçado dos cabos na visão do documento: as PONTAS vêm destes markers (girados quando a planta gira)
    const cablePolyPoints = c => {
      if(c.free) return c.points||[]
      const f=markers.find(m=>m.uid===c.fromUid), t=markers.find(m=>m.uid===c.toUid)
      return (f&&t) ? [{x:f.x,y:f.y}, ...(c.points||[]), {x:t.x,y:t.y}] : []
    }
    // Igual ao cablePolyPoints, mas as pontas vêm de UM conjunto de markers (o do pavimento).
    // Usado quando desenhamos uma planta por andar — cada andar tem seus próprios pontos.
    const cablePolyPointsIn = (c, mks) => {
      if(c.free) return c.points||[]
      const src = mks||markers
      const f=src.find(m=>m.uid===c.fromUid), t=src.find(m=>m.uid===c.toUid)
      return (f&&t) ? [{x:f.x,y:f.y}, ...(c.points||[]), {x:t.x,y:t.y}] : []
    }
    // Repete um render de planta POR PAVIMENTO. renderInner(view) recebe {bg,mks,cbs,ratio,nome}
    // e devolve o HTML da planta daquele andar (desenhado a partir de v.mks/v.bg/v.cbs). Com 1
    // pavimento sai EXATAMENTE como antes (uma planta, sem cabeçalho de andar, na visão _docView
    // — inclusive a rotação); com 2+ andares entra um <h3> com o nome do andar e cada planta
    // mostra só os pontos daquele andar. Rotação não é aplicada com vários andares (decisão do
    // Raphael: cada planta na orientação natural da sua imagem).
    const plantasPorPav = (renderInner) => _docViewsPorPav().filter(v=>v.bg).map((v,idx)=>{
      let inner = renderInner(v, idx)   // idx = índice do pavimento (útil pra ids únicos entre andares)
      if(!inner) return ''   // andar sem conteúdo pra este render → nem entra (sem cabeçalho órfão)
      // Grava a PROPORÇÃO deste andar na 1ª planta (data-mkratio). O palco do editor (aplicaPalco)
      // usa a proporção da PRÓPRIA planta em vez da do andar ativo — senão a planta do 2º andar
      // pega o aspecto do 1º, fica cortada/deslocada e os pinos parecem "andar" (Elton/Raphael).
      if(v.ratio) inner = inner.replace(/(<div class="ex-plant(?:-fig)?[^"]*")/, `$1 data-mkratio="${(+v.ratio).toFixed(4)}"`)
      const head = v.nome ? `<h3 class="ex-amb">${esc(v.nome)}${(v.mks?` · ${v.mks.length} ponto${v.mks.length===1?'':'s'}`:'')}</h3>` : ''
      return head + inner
    }).filter(Boolean).join('')
    // ── LEGENDA MESTRE (decisão 3): símbolo técnico NBR + pino da planta lado a lado,
    // só dos tipos presentes no projeto. Mesma legenda em todos os documentos.
    const legendaMestreHtml = (()=>{
      // Compacta (Raphael): uma faixa fina em vez da grade NBR/tabela inteira — a planta ganha
      // a página. Vale para todos os modelos, inclusive opus.
      if(legendaCompacta) return pontosLegendaCompacta()
      // OPUS: a legenda vira a lista dos tipos desta planta (legendaOpusHtml). Os outros
      // modelos seguem com a legenda abstrata cor/forma/selo + grade NBR, intactos.
      if((versao||execVersao)==='opus') return legendaOpusHtml()
      const vistos=new Map()
      markers.forEach(m=>{ const c=classifyEle(m); if(c && !vistos.has(c.sym)) vistos.set(c.sym,{sym:c.sym,tipo:(ELE_TYPE_INFO[c.sym]?.tipo)||c.tipo||'',m}) })
      const NIVL={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}
      const linhas=[...vistos.values()].map(u=>{ const alt=alturaOf(u.m)
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 7px;border:1px solid #E2E8F0;border-radius:6px;background:#fff">
          <svg viewBox="-12 -14 24 32" width="20" height="26">${ELE_SYMBOLS[u.sym]||ELE_SYMBOLS.generico}</svg>
          <span style="width:20px;height:20px;display:inline-block;flex-shrink:0">${pinShapeSVG({m:u.m, mount:mountOf(u.m),alt,color:catColorOf(u.m)||'#64748B',label:'',size:20})}</span>
          <span style="font-size:9.5px;color:#334155;line-height:1.3"><b>${String(u.tipo).replace(/</g,'&lt;')}</b><br><span style="color:#94A3B8">${NIVL[alt]||''}</span></span>
        </div>` }).join('')
      return pontosLegenda() + (linhas?`<div style="margin-top:8px;padding:10px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#64748B;margin-bottom:7px">Legenda mestre · símbolo técnico (NBR) + pino da planta · tipos usados neste projeto</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:5px">${linhas}</div>
      </div>`:'')
    })()
    const _ver = versao || execVersao
    const isObra = mode==='obra'

    // ── CÂMERAS: como configuramos e por quê ──────────────────────────────────
    // Padroniza a configuração em todas as casas e deixa registrado o que foi feito.
    // As credenciais entram MASCARADAS; em claro só na Folha de Credenciais.
    const temCam = markers.some(m=>/c[âa]mera|camera|dome|bullet|nvr/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
    // Rede/Wi-Fi no projeto: AP, gateway ou qualquer ponto de rede. Decide se o Plano de
    // Instalação ganha o capítulo de rede — se não tem, não enche o documento.
    const temWifiNoProjeto = markers.some(m=>/access point|\bap\b|wi-?fi|u6|u7|unifi|gateway|dream machine|udm|switch|keystone/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
    const blocoCamerasHtml = () => { if(!temCam) return ''
      const _ckc = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:15px;height:15px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:11px;line-height:1.45;color:#1F2937">${it}</span>
        </div>`).join('')}</div>`
      return `<h3 class="ex-amb" style="margin-top:16px">Como as câmeras são configuradas</h3>
        <p class="ex-p" style="font-size:10px;color:#64748B;margin:-2px 0 8px">Padrão RARO, igual em todas as casas. Câmera é o ponto mais sensível da instalação: ela vê dentro da casa do cliente.</p>
        ${_ckc([
          'Trocar a senha de fábrica de <b>todas</b> as câmeras e do NVR — senha padrão é a porta de entrada mais explorada.',
          'Câmeras em <b>VLAN própria</b>, isolada da rede da casa: câmera comprometida não enxerga computador nem celular da família.',
          '<b>O cliente acessa as câmeras pelo app, de onde estiver</b> — a VLAN não é fechada para a internet. O que se bloqueia é a câmera enxergar o resto da casa, não o dono ver a própria casa.',
          'Acesso remoto <b>pelo app do fabricante/gateway</b>, com a conta do cliente — sem abrir porta no roteador (nada de DMZ ou port forwarding). O app não precisa disso e a porta aberta é o que expõe a câmera na internet.',
          'UPnP desligado no gateway — é ele que abre porta sozinho, sem ninguém pedir.',
          'Usuário administrador só para a RARO; criar usuário separado, sem poder de configuração, para o cliente.',
          'Gravação contínua no NVR + retenção combinada com o cliente (conferir capacidade do HD).',
          'Horário/NTP sincronizado — gravação com hora errada não serve como prova.',
          'Conferir o ângulo de cada câmera com o cliente <b>antes</b> de fechar o forro.',
          'Nenhuma câmera apontada para área do vizinho ou via pública além do necessário.',
          'Firmware atualizado antes da entrega.',
          'Credenciais entregues em mão ao cliente (Folha de Credenciais) e removidas de qualquer grupo de mensagens.',
        ])}
        ${blocoCredenciaisHtml(false)}`
    }

    const _prem = _ver==='nova'
    // Tema do miolo do documento: no premium acompanha a casca (navy + dourado);
    // no clássico, cyan. NÃO mexe em cor que é dado (cabo, categoria, gráfico, telas de app).
    const _fable = _ver==='fable'
    const _opus = _ver==='opus'   // modelo OPUS: acabamento máximo + aproveitamento de folha
    const TH = _fable
      ? { rule:'#B0854C', pin:'#131A2C', accent:'#B0854C' }
      : _opus
      ? { rule:'#0D1B2A', pin:'#0D1B2A', accent:'#B08D57' }
      : _prem
      ? { rule:'#1A2740', pin:'#1A2740', accent:'#9C7B45' }
      : { rule:'#0EA5E9', pin:'#0EA5E9', accent:'#0EA5E9' }
    // Número de capítulo: premium/fable/opus = algarismo dourado inline (estilizado pelo CSS .ex-sec-num);
    // clássico = bolinha cyan inline.
    const _capNum = n => (_prem||_fable||_opus)
      ? `<span class="ex-sec-num">${n}</span>`
      : `<span class="ex-sec-num" style="background:#0EA5E9;color:#fff;padding:3px 10px;border-radius:5px;font-size:13px;margin-right:10px">${n}</span>`

    // ── PLANTA ELÉTRICA (ABNT NBR 5444) — símbolos técnicos sobre a planta ──
    // Desenha tomadas, interruptores, pontos de luz e QDL com símbolos normalizados,
    // eletrodutos (linhas) ligando cada ponto ao quadro, legenda e quadro de cargas.
    function buildPlantaEletrica(numFn){
      // SÓ pontos elétricos de verdade — exclui rede/dados (keystone) e som
      const ELE_ONLY = new Set(['tomada_baixa','tomada_media','tomada_alta','tomada_piso','tomada_teto','modulo_cabeceira',
        'interruptor_simples','interruptor_paralelo','interruptor_intermediario','interruptor_4','interruptor_6',
        'ponto_luz','ponto_energia_teto','ponto_energia_piso','ponto_energia_parede','arandela','arandela_teto','quadro','prumada'])
      const eleMarks = markers.map(m=>({m, cls:classifyEle(m)})).filter(x=>x.cls && ELE_ONLY.has(x.cls.sym))
      if(!bgImage || !eleMarks.length) return ''
      const qdl = eleMarks.find(x=>x.cls.sym==='quadro')
      const ratio = imgRatio || 0.66   // altura/largura real da planta
      // alturas padrão por tipo (para a tabela)
      const altPadrao = sym => ({tomada_baixa:'0,30m',tomada_alta:'1,30m',tomada_piso:'piso',tomada_teto:'teto',
        interruptor_simples:'1,10m',interruptor_paralelo:'1,10m',interruptor_intermediario:'1,10m',
        ponto_luz:'teto',ponto_energia_teto:'teto',arandela:'2,20m',arandela_teto:'teto',quadro:'1,50m'})[sym]||'—'
      // Bitola/fios: FONTE ÚNICA (specDoPonto), recebendo o MARCADOR — não o sym.
      // Antes esta tabela era hardcoded aqui e dizia "2×1,5mm² (retorno)" pro keypad,
      // tratando um dispositivo Zigbee alimentado como interruptor burro.
      const fiosDe = m => specDoPonto(m).cabo
      // ── símbolos como SVG individuais (cada um num quadradinho que NÃO distorce) ──
      // tomadas ficam menores (costumam ser muitas); demais maiores
      const symPxDe = sym => /tomada/.test(sym) ? 21 : 30
      // Overlay de símbolos elétricos para UM conjunto de pontos (o do pavimento).
      const symsDe = marks => marks.map(({m,cls})=>{
        const SYM_PX = symPxDe(cls.sym)
        // tensão: 110/220 a partir da nota do ponto
        const volt = /tomada/.test(cls.sym) ? ((/220/.test(m.note||'')?'220V':/110|127/.test(m.note||'')?'110V':'')) : ''
        return `
        <div style="position:absolute;left:${m.x}%;top:${m.y}%;width:${SYM_PX}px;height:${SYM_PX}px;transform:translate(-50%,-50%);z-index:3">
          <svg viewBox="-12 -14 24 30" width="${SYM_PX}" height="${SYM_PX}" style="overflow:visible">
            ${ELE_SYMBOLS[cls.sym]||ELE_SYMBOLS.generico}
            <circle cx="11" cy="-11" r="4.6" fill="#fff" stroke="#131A2C" stroke-width="1"/>
            <text x="11" y="-8.6" font-size="6.2" text-anchor="middle" font-weight="800" fill="#131A2C">${m.n}</text>
          </svg>
          ${volt?`<div style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);font-size:6.5px;font-weight:800;color:#fff;background:${volt==='220V'?'#DC2626':'#0891B2'};padding:0 3px;border-radius:5px;white-space:nowrap">${volt}</div>`:''}
          <div style="position:absolute;left:50%;top:${SYM_PX-3}px;transform:translateX(-50%);font-size:7.5px;font-weight:700;color:#0D1420;white-space:nowrap;background:rgba(255,255,255,0.8);padding:0 2px;border-radius:2px">${esc(cls.label)}${showIdsPdf&&(m.id||m.code)?`<span style="font-weight:600;color:#64748B;font-family:monospace"> ${esc(m.id||m.code)}</span>`:''}</div>
        </div>`}).join('')
      // sem traçados de cabos na planta elétrica — só os pontos (conforme solicitado)
      const dutos = ''
      // legenda
      const usados = [...new Map(eleMarks.map(x=>[x.cls.sym,x.cls])).values()]
      const legenda = `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
        ${usados.map(c=>`<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:#334155">
          <svg viewBox="-12 -14 24 32" width="24" height="32">${ELE_SYMBOLS[c.sym]||ELE_SYMBOLS.generico}</svg>
          <span><b>${esc(c.label)}</b> — ${esc(c.tipo)}</span></div>`).join('')}
      </div>`
      // ── LISTA GERAL de todos os pontos elétricos (item 1) ──
      const ELETR_T = new Set(['eletrica','eletrica_int25','eletrica_int15','conduite_eletrica'])
      const listaGeral = T(eleMarks.map(({m,cls})=>{
        const cab=(cables||[]).find(c=>(c.toUid===m.uid||c.fromUid===m.uid) && ELETR_T.has(c.type||''))
        const cond = cab ? (CABLE_CONDUITE[cab.type] ? 'compartilhado' : 'exclusivo') : '—'
        const mt = cab?cableMeters(cab):null
        const origem = cab ? (markers.find(x=>x.uid===(cab.fromUid===m.uid?cab.toUid:cab.fromUid))?.name||'Quadro') : (qdl?'Quadro QDL':'—')
        const cx = specDoPonto(m).caixa || '—'
        return `<tr>
          <td style="text-align:center"><span style="display:inline-flex;align-items:center;gap:3px"><svg viewBox="-12 -14 24 30" width="22" height="27" style="overflow:visible">${ELE_SYMBOLS[cls.sym]||ELE_SYMBOLS.generico}</svg><span style="font-size:8.5px;font-weight:800;color:#131A2C;border:1px solid #131A2C;border-radius:50%;width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center">${m.n}</span></span></td>
          <td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td>
          <td>${esc(cls.tipo)}</td>
          <td style="font-size:11px">${esc(m.room||'—')}</td>
          <td style="font-weight:700">${esc(m.note&&/\d/.test(m.note)?m.note:altPadrao(cls.sym))}</td>
          <td style="text-align:center;font-weight:600">${esc(cx)}</td>
          <td style="font-size:10.5px">${esc(fiosDe(m))}</td>
          <td>${esc(origem)}</td>
          <td style="font-size:10.5px">${esc(cond)}</td>
          <td style="text-align:right">${mt!=null?mt+'m':'—'}</td>
        </tr>`
      }).join(''),['Nº','ID','Tipo','Cômodo','Altura','Caixa','Fios/Bitola','Origem','Conduíte','Dist.'])
      // quadro de cargas
      const byRoomCarga={}
      eleMarks.forEach(({m,cls})=>{ if(cls.sym==='quadro')return; const r=m.room||'Geral'; (byRoomCarga[r]=byRoomCarga[r]||{tom:0,int:0,luz:0});
        if(/tomada/.test(cls.sym))byRoomCarga[r].tom++; else if(cls.sym.startsWith('interruptor'))byRoomCarga[r].int++; else if(/luz|arandela/.test(cls.sym))byRoomCarga[r].luz++ })
      const VA_TUG=100, VA_LUZ=60
      // Só cômodos com CARGA (tomada ou ponto de luz). Antes, cômodo só com interruptor entrava
      // com "— / — / 0 VA" e virava linha em branco (Raphael) — interruptor comanda carga, não é
      // carga. Na RARO a luz é via keypad/módulo (raramente há "ponto de luz" marcado), então
      // muitos cômodos ficavam 0 VA. Agora esses não entram no quadro.
      const cargaRows = Object.entries(byRoomCarga).filter(([,c])=>(c.tom*VA_TUG+c.luz*VA_LUZ)>0).map(([r,c])=>{
        const va=c.tom*VA_TUG+c.luz*VA_LUZ
        return `<tr><td><b>${esc(r)}</b></td><td style="text-align:center">${c.tom||'—'}</td><td style="text-align:center">${c.luz||'—'}</td><td style="text-align:right">${va} VA</td></tr>`
      }).join('')
      const totalVA = Object.values(byRoomCarga).reduce((s,c)=>s+(c.tom*VA_TUG+c.luz*VA_LUZ),0)
      const cargaTbl = cargaRows ? `<table class="ex-tbl"><thead><tr><th>Cômodo</th><th style="text-align:center">Tomadas</th><th style="text-align:center">Pts Luz</th><th style="text-align:right">Carga estimada</th></tr></thead><tbody>${cargaRows}<tr style="background:#0D1420;color:#fff"><td colspan="3"><b>Demanda total estimada</b></td><td style="text-align:right"><b>${totalVA} VA</b></td></tr></tbody></table>
        <p class="ex-p" style="font-size:9.5px;color:#94A3B8;margin-top:4px">Estimativa simplificada (TUG ${VA_TUG}VA · ponto de luz ${VA_LUZ}VA). Dimensionamento final por engenheiro eletricista (ART/NBR 5410).</p>` : ''
      // checklist elétrico
      // Checklist com CAIXA pra marcar (Raphael) — era <ul> de bolinhas, que não se marca.
      // Mesmo desenho do checklist do Plano de Obra, pra ser o mesmo gesto na obra inteira.
      const _chk = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:16px;height:16px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:11.5px;line-height:1.45;color:#1F2937">${it}</span>
        </div>`).join('')}</div>`
      const checklistEle = _chk([
        'Conferir NEUTRO chegando em 100% das caixas de interruptor/keypad.',
        'Circuitos de tomada e iluminação SEPARADOS no quadro QDL.',
        'Aterramento (fio terra verde) em todas as tomadas.',
        'Eletroduto de dados e de elétrica em conduítes SEPARADOS (nunca no mesmo).',
        'Identificar cada disjuntor no QDL conforme a lista geral acima.',
        'Testar todos os pontos antes do fechamento das paredes.',
      ])
      const head = `<div class="ex-plant-head" style="background:#0D1420;color:#38BDF8;font-size:12px;font-weight:700;padding:9px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>PLANTA ELÉTRICA — Símbolos ABNT NBR 5444</span><span style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:400">${eleMarks.length} pontos${qdl?' · QDL':''}</span></div>`
      // imagem com proporção REAL (padding-bottom = ratio), símbolos como HTML que NÃO distorcem
      // ex-plant-fig = o editor trata isto como PLANTA (arrastar/zoom/girar/ocultar), igual às demais.
      // UMA planta elétrica por PAVIMENTO (com 1 andar sai igual a antes). Cada andar mostra só os
      // seus pontos elétricos; andar sem ponto elétrico é pulado.
      const fig = plantasPorPav(v=>{
        const em = v.mks.map(m=>({m, cls:classifyEle(m)})).filter(x=>x.cls && ELE_ONLY.has(x.cls.sym))
        if(!em.length) return ''
        return `<div class="ex-plant-fig" data-mkuids="${em.map(x=>x.m.uid).join(',')}" style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;margin-bottom:10px">
          <div style="position:relative;width:100%;padding-bottom:${(((v.ratio||ratio))*100).toFixed(1)}%">
            <img src="${v.bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:grayscale(0.3) contrast(0.95) brightness(1.04)"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${dutos}</svg>
            ${symsDe(em)}
          </div></div>`
      })
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Planta Elétrica (ABNT NBR 5444)</h2>` : `<h2>Planta Elétrica (ABNT NBR 5444)</h2>`
      // Resumo de caixas de embutir = lista de compra do eletricista. Varre TODOS os pontos
      // (Raphael: "puxar todas as caixas de embutir"), não só os eleMarks: keystone e ponto de
      // som também pedem 4x2, mas ficam fora do ELE_SYMS_SET, então a lista saía CURTA.
      // Só entra o que é caixa de verdade — "forro" e "quadro" são lugar, não caixa.
      const _ehCaixa = cx => /^4x2$|^4x4$|^octogonal$|caixa de piso/i.test(cx||'')
      // Agrupa os PONTOS por caixa (não só conta): assim dá pra ver ONDE está cada caixa — quais
      // keypads são 4x4, onde ficam as de piso (Raphael). Também vira o diagnóstico: se um keypad
      // de 6 teclas aparecer em 4x2, o erro está no tipo/nome dele.
      const cxPontos={}
      markers.filter(m=>!isRackItem(m.name,m.code) && !hideCats.has(equipType(m.name)) && m.name).forEach(m=>{
        const cx=specDoPonto(m).caixa; if(_ehCaixa(cx)) (cxPontos[cx]=cxPontos[cx]||[]).push(m) })
      const cxResumo = Object.keys(cxPontos).length ? `<h3 class="ex-amb" style="margin-top:16px">Caixas de Embutir — Resumo</h3>
        <p class="ex-p" style="font-size:9.5px;color:#94A3B8;margin:-2px 0 6px">Todos os pontos do projeto que pedem caixa — elétrica, rede e som — e onde cada um está.</p>
        ${T(Object.entries(cxPontos).sort().map(([cx,ms])=>{
          const quais = ms.map(m=>`${esc(m.id||m.code||('#'+m.n))} (${esc(funcaoDoPonto(m))}${m.room?' · '+esc(m.room):''})`).join(' · ')
          return `<tr><td style="font-weight:700;text-align:center;vertical-align:top">${esc(cx)}</td><td style="text-align:center;vertical-align:top">${ms.length}</td><td style="font-size:9.5px;color:#475569;line-height:1.5">${quais}</td></tr>`
        }).join(''),['Caixa','Qtd','Pontos (ID · tipo · cômodo)'])}` : ''
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Pontos elétricos com símbolos normalizados (ABNT NBR 5444), em proporção real da planta. Mostra apenas os pontos elétricos (tomadas, interruptores, iluminação, quadro).</p>
        ${head}${fig}${abntLegendaCompleta(new Set(eleMarks.map(x=>x.cls.sym)))}
        ${(secOff('lista_geral')||secOff('t_eletrica_tab'))?'':`<h3 class="ex-amb" style="margin-top:18px">Lista Geral — Todos os Pontos Elétricos</h3>${listaGeral}`}
        ${(isObra||secOff('caixas_embutir')||secOff('t_eletrica_tab'))?'':cxResumo}
        ${(isObra||secOff('quadro_cargas')||secOff('t_eletrica_tab'))?'':`<h3 class="ex-amb" style="margin-top:16px">Quadro de Cargas — estimativa por cômodo</h3>${cargaTbl}`}
        <h3 class="ex-amb" style="margin-top:16px">Checklist Elétrico</h3>${checklistEle}
        ${isObra?'':blocoCenasHtml()}
      </div>`
    }

    // ── CENAS E CONFIGURAÇÕES (Raphael) — o que vamos programar e documentar ──────────
    // A obra entrega o cabo; a cena é o que o cliente sente. Aqui fica registrado o que
    // será programado, com espaço pra preencher à mão o que for definido com o cliente.
    // Sai junto da Planta Elétrica porque é o comando que aquela fiação vai servir.
    function blocoCenasHtml(){
      const keypads = markers.filter(m=>/^interruptor/.test((classifyEle(m)||{}).sym||''))
      if(!keypads.length) return ''
      const _ckc = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:15px;height:15px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:11px;line-height:1.45;color:#1F2937">${it}</span>
        </div>`).join('')}</div>`
      // Sugestão de cenas por CÔMODO (Raphael: "customizada pro item do cômodo"). Cada ambiente
      // ganha um par de cenas típicas como placeholder cinza — ponto de partida pra combinar com
      // o cliente, não texto fixo. A tecla 1 costuma ser a luz principal do ambiente.
      const sugereCena = (room, tecla)=>{
        const r=(room||'').toLowerCase()
        const par = /estar|sala|home|cinema|tv|living/.test(r) ? ['Luz geral','Cena cinema (spots + TV)']
          : /su[íi]te|quarto|dorm/.test(r) ? ['Luz geral','Cena leitura / noite']
          : /jantar/.test(r) ? ['Luz geral','Cena jantar (pendente + dimm)']
          : /cozinha|gourmet/.test(r) ? ['Luz geral','Luz de bancada']
          : /banh|lavabo|wc/.test(r) ? ['Luz geral','Luz espelho']
          : /externa|varanda|jardim|piscina|gourmet|churrasq/.test(r) ? ['Luz geral','Luz de fachada / paisagismo']
          : /circula|corredor|hall|escada/.test(r) ? ['Luz geral','Luz noturna (brilho baixo)']
          : /closet|vestiario/.test(r) ? ['Luz geral','Luz de espelho']
          : ['Luz geral','—']
        return tecla===0 ? par[0] : par[1]
      }
      // DIVISÃO POR CÔMODO (Raphael): cada ambiente ganha seu próprio cabeçalho e sua tabela de
      // teclas. Uma linha por TECLA, 2 cenas lado a lado (o keypad da RARO comporta 2 por tecla).
      const porComodo = {}
      keypads.forEach(m=>{ const r=m.room||'Sem cômodo'; (porComodo[r]=porComodo[r]||[]).push(m) })
      const blocosComodo = Object.keys(porComodo).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(room=>{
        const ms = porComodo[room]
        const teclasComodo = ms.reduce((s,m)=>s+((((classifyEle(m)||{}).teclas)||1)),0)
        const linhas = ms.map(m=>{
          const t = ((classifyEle(m)||{}).teclas)||1
          return Array.from({length:t},(_,i)=>`<tr>
            <td style="text-align:center;font-family:monospace;font-size:9.5px;color:#475569">${esc(m.id||m.code||('#'+m.n))}</td>
            <td style="text-align:center;font-size:12px;font-weight:800;color:#0369A1">${i+1}</td>
            <td style="border-left:2px solid #E5E7EB"><span style="font-size:8px;color:#B45309;font-weight:700">1ª</span> <span style="font-size:9px;color:#B8BEC9;font-style:italic">${esc(sugereCena(m.room,0))}</span></td>
            <td><span style="font-size:8px;color:#B45309;font-weight:700">2ª</span> <span style="font-size:9px;color:#B8BEC9;font-style:italic">${esc(sugereCena(m.room,1))}</span></td>
          </tr>`).join('')
        }).join('')
        return `<div style="break-inside:avoid;margin-top:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:12px;font-weight:800;color:#0D1420">${esc(room)}</span>
            <span style="font-size:9px;color:#94A3B8;font-weight:600">${ms.length} keypad${ms.length>1?'s':''} · ${teclasComodo*2} cenas</span>
          </div>
          <table class="ex-tbl"><thead><tr><th style="width:56px">Keypad</th><th style="width:40px;text-align:center">Tecla</th><th>Cena 1 (preencher)</th><th>Cena 2 (preencher)</th></tr></thead><tbody>${linhas}</tbody></table>
        </div>`
      }).join('')
      const totalTeclas = keypads.reduce((s,m)=>s+((((classifyEle(m)||{}).teclas)||1)),0)
      return `<h3 class="ex-amb" style="margin-top:18px">Cenas e Configurações</h3>
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:linear-gradient(90deg,#FFF7ED,#FFFBEB);border:1px solid #FCD9A8;margin:2px 0 10px">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:9px;background:#F59E0B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800">${totalTeclas*2}</div>
          <div style="font-size:10.5px;color:#7C4A03;line-height:1.4">
            <b>${totalTeclas*2} cenas a definir</b> — cada tecla comporta 2 (é sempre o dobro). Preencha com o cliente; cena em branco é tecla que não faz nada.
          </div>
        </div>
        ${blocosComodo}
        <h3 class="ex-amb" style="margin-top:14px">Configurações a fazer</h3>
        ${_ckc([
          'Nomear cada dispositivo pelo cômodo no app — nome genérico vira suporte eterno.',
          'Agrupar por ambiente (Estar, Suíte…) para comando por voz e por cômodo.',
          'Cena de <b>saída</b>: apaga tudo, fecha cortinas, arma o que for combinado.',
          'Cena de <b>chegada</b> e cena de <b>noite</b> (luz de circulação em brilho baixo).',
          'Tecla longa / duplo toque, se o keypad suportar — combinar o comportamento com o cliente.',
          'Rotina por horário (cortina de manhã, luz de fachada ao anoitecer).',
          'Comportamento na <b>queda de energia e de internet</b>: o que continua funcionando no botão físico.',
          'Assistente de voz vinculado (se contratado) e testado em cada ambiente.',
          'Acesso do cliente criado, com senha própria — a conta da RARO não fica sendo a do cliente.',
          'Treinamento de entrega feito com quem mora na casa, não só com quem contratou.',
        ])}`
    }

    // ── MAPA DE CALOR Wi-Fi — propagação aproximada dos APs (paredes de concreto) ──
    // Modelo simples: cada AP irradia um gradiente radial. Concreto atenua forte,
    // então o raio "bom" é curto. Gera mancha verde→amarelo→vermelho + aviso de zonas mortas.
    // Padrão RARO de rede — usado no Projeto Executivo E no Plano de Instalação.
    function blocoRedeHtml(){
        // ── PADRÃO RARO DE REDE: SSIDs, VLANs, guest e segurança — em forma de check ──
        // É o que a RARO faz em TODA casa. Vira checklist pra ninguém esquecer e pra o cliente
        // ver o que está sendo entregue. As credenciais entram MASCARADAS (folha à parte).
        // thW/tdW são locais daqui: os do buildHeatmap não alcançam esta função.
        const thW='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1"'
        const tdW='style="font-size:10.5px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
        const _ck = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
          <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
            <span style="flex-shrink:0;width:15px;height:15px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
            <span style="font-size:11px;line-height:1.45;color:#1F2937">${it}</span>
          </div>`).join('')}</div>`
        return `<h3 class="ex-amb" style="margin-top:16px">Padrão de rede RARO — SSIDs e VLANs</h3>
          <p class="ex-p" style="font-size:10px;color:#64748B;margin:-2px 0 8px">Separar em VLANs impede que um dispositivo comprometido enxergue os outros. É o mesmo padrão em todas as casas.</p>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr><th ${thW}>SSID</th><th ${thW}>VLAN</th><th ${thW}>Quem entra</th><th ${thW}>Por quê</th></tr></thead>
            <tbody>
              <tr><td ${tdW}><b>Principal</b></td><td ${tdW}>Confiável</td><td ${tdW}>Celulares e computadores da família</td><td ${tdW}>Acesso pleno à casa</td></tr>
              <tr><td ${tdW}><b>IoT</b></td><td ${tdW}>Automação</td><td ${tdW}>TVs, assistentes, eletros conectados</td><td ${tdW}>Isola quem tem firmware fraco</td></tr>
              <tr><td ${tdW}><b>Câmeras</b></td><td ${tdW}>CFTV</td><td ${tdW}>Câmeras e NVR</td><td ${tdW}>Isolada da casa; o cliente acessa pelo app normalmente</td></tr>
              <tr><td ${tdW}><b>Guest</b></td><td ${tdW}>Visitante</td><td ${tdW}>Visitas</td><td ${tdW}>Só internet — não enxerga nada da casa</td></tr>
            </tbody>
          </table>
          <h3 class="ex-amb" style="margin-top:14px">Checklist de configuração — rede</h3>
          ${_ck([
            'Criar as 4 VLANs no gateway e amarrar cada SSID à sua VLAN.',
            'Guest com <b>isolamento de cliente</b> ligado (visitante não vê visitante) e sem acesso às demais VLANs.',
            'VLAN de câmeras <b>sem rota para as outras VLANs</b> da casa. A internet fica liberada: é por ela que o app do cliente funciona de fora.',
            'Bloquear tráfego entre IoT e a VLAN principal, liberando só o necessário (cast, impressora).',
            'Trocar a senha padrão do gateway e desligar administração pela WAN.',
            'Firmware do gateway, switch e APs atualizado antes da entrega.',
            'IP fixo (ou reserva DHCP) para gateway, switch, APs, NVR e câmeras.',
            'Nomear cada AP pelo cômodo, para manutenção futura.',
            'Wi-Fi 2,4 GHz habilitado onde houver automação — sensor não fala 5 GHz.',
            'Senha do Wi-Fi principal e do guest anotadas na Folha de Credenciais e entregues ao cliente.',
          ])}
          ${blocoEquipConfigHtml()}
          ${(!secOff('tbl_seguranca') && temCam) ? `<h3 class="ex-amb" style="margin-top:16px">Segurança — Câmeras e Sensores</h3>${blocoSegurancaTbl()}` : ''}
          ${blocoCamerasHtml()}
          ${blocoCredenciaisHtml(false)}`
    }

    // Tabela de câmeras/sensores montada AQUI (dos marcadores) — o tblSeguranca do template vive
    // num IIFE fora do escopo desta função. Espelha as colunas úteis pra obra.
    function blocoSegurancaTbl(){
      const cams = markers.filter(m=>/c[âa]mera|camera|dome|bullet|sensor|presen[çc]a|nvr/.test((((m.name||'')+' '+(m.code||''))).toLowerCase()) && !isRackItem(m.name,m.code))
      if(!cams.length) return ''
      const rows = cams.map(m=>`<tr>${pinCell(m.id,m.code,m.n)}<td>${esc(funcaoDoPonto(m))}</td><td style="font-size:10px;color:#64748B">${esc(m.name||'—')}</td><td>${esc(m.room||'—')}</td></tr>`).join('')
      return T(rows,['Nº','Tipo','Equipamento','Cômodo'])
    }

    // ── CONFIGURAÇÃO E BOAS PRÁTICAS DOS EQUIPAMENTOS (Raphael) — UDM, switch, antenas, câmeras ──
    // Só entra o que existe no projeto (rack + marcadores). É o padrão RARO, igual em toda casa.
    function blocoEquipConfigHtml(){
      const _ck = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:9px;padding:6px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:14px;height:14px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:11px;line-height:1.45;color:#1F2937">${it}</span>
        </div>`).join('')}</div>`
      const nomes = m => (((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
      const rackEq = (markers.find(m=>isRackItem(m.name||'', m.code||''))||{}).rackEquip || []
      const txtRack = rackEq.map(e=>((e.name||'')+' '+(e.code||'')).toLowerCase()).join(' ')
      const has = re => markers.some(m=>re.test(nomes(m))) || re.test(txtRack)
      const hasUDM = has(/dream machine|udm|gateway|roteador|cloud key/)
      const hasSwitch = has(/switch/)
      const hasAP = has(/access point|\bap\b|\bu6\b|\bu7\b|unifi ap|antena/)
      const blocos = []
      if(hasUDM) blocos.push(['UDM / Gateway (Dream Machine)', [
        'Trocar a senha padrão do admin e habilitar 2FA na conta do fabricante.',
        'Administração pela WAN <b>desligada</b>; acesso remoto só pelo app oficial.',
        'Firmware atualizado antes da entrega e updates automáticos ligados.',
        'Backup da configuração salvo (nuvem do fabricante + cópia local).',
        'DNS e horário (NTP) corretos — base para logs e para as câmeras.',
      ]])
      if(hasSwitch) blocos.push(['Switch PoE', [
        'PoE ligado só nas portas usadas (AP e câmera); demais desabilitadas.',
        'Cada porta nomeada pelo destino (AP-Estar, CAM-Garagem…).',
        'VLANs propagadas do gateway; porta de câmera só na VLAN de CFTV.',
        'Firmware atualizado; senha padrão trocada.',
      ]])
      if(hasAP) blocos.push(['Antenas (Access Points)', [
        'Nome do AP = cômodo, para manutenção futura.',
        'Canais 2,4 e 5 GHz sem sobreposição entre APs vizinhos.',
        'Potência ajustada ao ambiente — potência máxima gera interferência, não cobertura.',
        'Band steering e fast roaming ligados para o cliente andar pela casa sem cair.',
        '2,4 GHz mantido onde há automação (sensor/keypad não fala 5 GHz).',
      ]])
      if(!blocos.length) return ''
      return `<h3 class="ex-amb" style="margin-top:16px">Equipamentos — configuração e boas práticas</h3>`
        + blocos.map(([t,itens])=>`<div style="font-size:11.5px;font-weight:700;color:#0369A1;margin:10px 0 2px">${t}</div>${_ck(itens)}`).join('')
    }

    function buildHeatmap(numFn){
      const aps = markers.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
      if(!bgImage || aps.length===0) return ''  // sem AP no projeto → não mostra mapa de calor
      // raios em % da largura da planta (aprox.). Concreto: cobertura útil menor.
      // forte ~ até 14%, médio ~ 22%, fraco ~ 30% do lado da imagem.
      const R_FORTE=14, R_MEDIO=22, R_FRACO=30
      // Overlay do mapa de calor para UM conjunto de APs (o do pavimento). O sufixo `key` deixa
      // os ids de gradiente únicos entre andares — senão o 2º pavimento referenciaria o gradiente
      // do 1º (posicionado nas coordenadas do 1º) e o mapa sairia errado.
      const heatSVGDe = (apsF, key) => {
        const grads = apsF.map((m,i)=>`
          <radialgradient id="ap${key}_${i}" cx="${m.x}%" cy="${m.y}%" r="${R_FRACO}%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#16A34A" stop-opacity="0.55"/>
            <stop offset="${(R_FORTE/R_FRACO*100).toFixed(0)}%" stop-color="#84CC16" stop-opacity="0.40"/>
            <stop offset="${(R_MEDIO/R_FRACO*100).toFixed(0)}%" stop-color="#FACC15" stop-opacity="0.30"/>
            <stop offset="100%" stop-color="#DC2626" stop-opacity="0.16"/>
          </radialgradient>`).join('')
        const manchas = apsF.map((m,i)=>`<circle cx="${m.x}" cy="${m.y}" r="${R_FRACO}" fill="url(#ap${key}_${i})"/>`).join('')
        const pinos = apsF.map((m,i)=>`<g transform="translate(${m.x},${m.y})">
          <circle r="2.2" fill="#0E7490" stroke="#fff" stroke-width="0.7"/>
          <text x="0" y="-3.2" font-size="3" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="#0E7490">AP${i+1}</text></g>`).join('')
        return `<defs>${grads}</defs>${manchas}${pinos}`
      }

      // detecção simples de "zona morta": cômodos cujo centro está fora do raio médio de todo AP
      const semCobertura = (rooms||[]).filter(r=>{
        const rx=r.x||50, ry=r.y||50
        return !aps.some(a=>{ const dx=a.x-rx, dy=a.y-ry; return Math.sqrt(dx*dx+dy*dy) <= R_MEDIO })
      }).map(r=>r.name)

      const aviso = aps.length===0
        ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#92400E;margin-top:10px">⚠ Nenhum Access Point posicionado na planta. Adicione APs para ver a cobertura Wi-Fi.</div>`
        : semCobertura.length
        ? `<div style="background:#FEE2E2;border:1px solid #DC2626;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#991B1B;margin-top:10px"><b>⚠ Possíveis zonas sem cobertura adequada:</b> ${semCobertura.map(esc).join(', ')}. Considere reposicionar ou adicionar um AP.</div>`
        : `<div style="background:#DCFCE7;border:1px solid #16A34A;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#065F46;margin-top:10px">✓ Todos os cômodos identificados estão dentro do alcance médio de pelo menos um AP.</div>`

      const head = `<div class="ex-plant-head" style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>COBERTURA Wi-Fi — Propagação aproximada</span><span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${aps.length} AP${aps.length!==1?'s':''} · paredes de concreto</span></div>`
      // UMA cobertura por PAVIMENTO (com 1 andar sai igual a antes). Cada andar usa só os seus APs.
      const fig = plantasPorPav((v, idx)=>{
        const apsF = v.mks.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
        if(!apsF.length) return ''
        return `<div class="ex-plant-fig" style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;margin-bottom:10px">
          <div style="position:relative;width:100%">
            <img src="${v.bg}" style="width:100%;display:block;filter:grayscale(0.5) brightness(1.05)"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${heatSVGDe(apsF, idx)}</svg>
          </div></div>`
      })
      const legenda = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:#334155">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#16A34A;opacity:.7"></span>Sinal forte</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#FACC15;opacity:.7"></span>Sinal médio</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#DC2626;opacity:.7"></span>Sinal fraco / borda</span>
      </div>`
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Cobertura Wi-Fi (Mapa de Calor)</h2>` : `<h2>Cobertura Wi-Fi (Mapa de Calor)</h2>`
      const disp = markers.length
      const iotZigbee = markers.filter(m=>/zigbee/.test(((m.name||'')+' '+(m.code||'')).toLowerCase())).length
      const cabeados = markers.filter(m=>/poe|cat6|access point|\bap\b|c[âa]mera|gateway|keystone|rack/.test(((m.name||'')+' '+(m.code||'')).toLowerCase())).length
      const thW='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1"'
      const tdW='style="font-size:10.5px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
      const tabelaBandas = `<h3 class="ex-amb" style="margin-top:14px">Como ler a sua rede Wi-Fi</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
          <thead><tr><th ${thW}>Banda</th><th ${thW}>Alcance</th><th ${thW}>Velocidade</th><th ${thW}>Melhor para</th></tr></thead>
          <tbody>
            <tr><td ${tdW}><b>2,4 GHz</b></td><td ${tdW}>Maior (atravessa melhor paredes)</td><td ${tdW}>Menor</td><td ${tdW}>Automação, sensores, dispositivos distantes</td></tr>
            <tr><td ${tdW}><b>5 GHz</b></td><td ${tdW}>Menor (sensível a paredes)</td><td ${tdW}>Maior</td><td ${tdW}>Streaming, videochamada, trabalho, jogos</td></tr>
          </tbody>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            <tr><td ${tdW}>Pontos de acesso (APs) neste projeto</td><td ${tdW} style="text-align:right;font-weight:700;padding:5px 8px;border-bottom:.5px solid #E2E8F0;font-size:10.5px">${aps.length}</td></tr>
            <tr><td ${tdW}>Dispositivos do projeto</td><td ${tdW} style="text-align:right;font-weight:700;padding:5px 8px;border-bottom:.5px solid #E2E8F0;font-size:10.5px">${disp} itens (${iotZigbee} Zigbee via gateway · ${cabeados} cabeados/PoE)</td></tr>
            <tr><td ${tdW}>Usuários simultâneos no Wi-Fi</td><td ${tdW} style="text-align:right;padding:5px 8px;border-bottom:.5px solid #E2E8F0;font-size:10.5px">depende do modelo do AP · conferir ficha técnica</td></tr>
          </tbody>
        </table>
        <p class="ex-p" style="font-size:9.5px;color:#94A3B8;margin-top:6px">Sensores e keypads Zigbee não ocupam o Wi-Fi: falam com o gateway numa rede própria (mesh), deixando o Wi-Fi livre para as pessoas.</p>`

      // As configs (SSID/VLAN, checklist, equipamentos, câmeras) saíram daqui pra um TÓPICO
      // próprio "Configurações e Melhores Práticas", ANTES do mapa de calor (Raphael). Aqui fica
      // só a cobertura Wi-Fi.
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Estimativa visual do alcance dos Access Points considerando <b>paredes de concreto</b> (alta atenuação). A mancha verde indica sinal forte; amarelo, médio; vermelho, sinal fraco na borda. É uma aproximação — a cobertura real depende de mobiliário, espelhos e interferências.</p>
        ${head}${fig}${legenda}${aviso}${tabelaBandas}</div>`
    }

    const cliente=projectInfo.client||fromProposal?.client_name||'Cliente'
    const hoje=new Date().toLocaleDateString('pt-BR')
    const T=(rows,cols)=>{
      let c=cols, r=rows
      // "IDs nas tabelas" desligado: remove a coluna cujo cabeçalho é exatamente "ID"
      // (do cabeçalho e a célula correspondente de cada linha). Uma vez só, vale p/ todas as tabelas T().
      if(!showIdsTbl){
        const idx=cols.indexOf('ID')
        if(idx>=0){
          c=cols.filter((_,i)=>i!==idx)
          r=rows.replace(/<tr[^>]*>[\s\S]*?<\/tr>/g,(tr)=>{
            const open=tr.match(/^<tr[^>]*>/)[0]
            const inner=tr.slice(open.length, tr.length-5)  // tira </tr>
            const cells=inner.split(/(?=<td)/).filter(s=>s.startsWith('<td'))
            if(cells.length>idx) cells.splice(idx,1)
            return open+cells.join('')+'</tr>'
          })
        }
      }
      // OPUS: remove colunas 100% vazias (só "—") — documento sem coluna morta.
      if(_opus){
        const ncol=c.length
        const trList=r.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]
        const parsed=trList.map(tr=>{ const open=tr.match(/^<tr[^>]*>/)[0]; const inner=tr.slice(open.length, tr.length-5); const cells=inner.split(/(?=<td)/).filter(s=>s.startsWith('<td')); return {open,cells} })
        const dataRows=parsed.filter(p=>p.cells.length===ncol)
        if(dataRows.length){
          const txtOf=cell=>cell.replace(/<[^>]*>/g,'').replace(/&[a-z]+;/gi,' ').replace(/ /g,' ').trim()
          const isBlank=t=>{ const s=t.replace(/[—–\-]/g,'').replace(/\s/g,''); return s===''||s==='m' }  // vazio, "—", "—m", "m"
          const drop=[]
          for(let i=1;i<ncol;i++){ if(dataRows.every(p=>isBlank(txtOf(p.cells[i])))) drop.push(i) }
          if(drop.length && drop.length<ncol-1){
            const keep=i=>!drop.includes(i)
            c=c.filter((_,i)=>keep(i))
            r=parsed.map(p=> p.cells.length===ncol ? (p.open+p.cells.filter((_,i)=>keep(i)).join('')+'</tr>') : (p.open+p.cells.join('')+'</tr>')).join('')
          }
        }
      }
      return `<table class="ex-tbl"><thead><tr>${c.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r}</tbody></table>`
    }
    const esc=s=>(s==null?'':String(s))

    // ── LISTA DE EQUIPAMENTOS (Raphael) — vai no FIM de todos os documentos, com quantidades.
    // Conta os pontos por PRODUTO (nome do catálogo) + os equipamentos do rack. É a lista de
    // compra/conferência: o que foi especificado e quanto.
    function blocoListaEquipamentos(brk=true){
      const cont=new Map()
      markers.filter(m=>!isRackItem(m.name,m.code) && m.name).forEach(m=>{
        const k=(m.name||'').trim(); if(!k) return
        cont.set(k,(cont.get(k)||0)+1)
      })
      const rackEq=(markers.find(m=>isRackItem(m.name||'', m.code||''))||{}).rackEquip || []
      rackEq.forEach(e=>{ const k=(e.name||e.equip||'').trim(); if(!k) return; cont.set(k,(cont.get(k)||0)+(Number(e.qty)||1)) })
      if(!cont.size) return ''
      const linhas=[...cont.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([nome,q])=>`<tr><td>${esc(nome)}</td><td style="text-align:center;font-weight:800">${q}</td></tr>`).join('')
      const total=[...cont.values()].reduce((s,q)=>s+q,0)
      return `<div class="ex-sec ex-breakable" ${brk?'style="page-break-before:always"':''}>
        <h2 style="border-bottom:3px solid ${TH.rule};padding-bottom:8px;margin-bottom:10px">Lista de Equipamentos</h2>
        <p class="ex-p" style="color:#6B7280;margin-bottom:8px">Todos os equipamentos do projeto e suas quantidades — pontos na planta + equipamentos do rack. Total: <b>${total}</b> ${total===1?'item':'itens'}.</p>
        ${T(linhas,['Equipamento','Qtd'])}
      </div>`
    }
    // ── Número do pino na planta — para cruzar tabela ↔ planta ──
    // Mesma linguagem da planta: forma pelo local de instalação (○ parede △ teto □ chão), cor pela categoria.
    const pin=(n,color=TH.pin,m=null)=>{
      if(m){
        const pino=pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||color,label:(_pinLabel(m)||String(n??"")),size:22})
        const fam=cableFamily(familiaDoPontoTipo(m))
        const seloFam = famOculta(fam.k) ? '' : `<span style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${fam.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif" title="${fam.nome}">${fam.L}</span>`
        return `<span style="position:relative;display:inline-block;width:22px;height:22px;vertical-align:middle">${pino}${seloFam}</span>`
      }
      return `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:800;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);vertical-align:middle">${n}</span>`
    }
    // versão fiel à planta: recebe o próprio marker
    const pinMk = m => { if(!m) return ''
      const cor=catColorOf(m)||(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c
      return `<span style="display:inline-flex;vertical-align:middle">${pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:cor,label:_pinLabel(m),size:20})}</span>` }
    const _normKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')
    const _findMk = (...keys)=>{
      for(const k of keys){ if(k==null) continue; const kk=_normKey(k); if(!kk) continue
        const hit = markers.find(m=> _normKey(m.id)===kk || _normKey(m.code)===kk || _normKey(m.n)===kk || _normKey('#'+m.n)===kk )
        if(hit) return hit
        const byName = markers.find(m=> (m.code && kk.includes(_normKey(m.code))) || (m.name && _normKey(m.name).includes(kk) && kk.length>=3) )
        if(byName) return byName
      }
      return null
    }
    const pinNum = (...keys)=>{ const m=_findMk(...keys); return m?m.n:null }
    // célula <td> com o pino fiel à planta (forma + cor), ou — quando não casar
    const pinCell = (...keys)=>{ const m=_findMk(...keys); return `<td style="text-align:center">${m?pinMk(m):'<span style="color:#CBD5E1">—</span>'}</td>` }

    // Planta com marcadores — UMA POR PAVIMENTO (com 1 andar sai igual a antes)
    let planta=''
    {
      const _dotsDe = mks => mks.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        const f=cableFamily(familiaDoPontoTipo(m))
        const badge=(showCabo && !famOculta(f.k))?`<div style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:22px;height:22px">${pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||st.c,label:_pinLabel(m),size:22})}${badge}</div>`}).join('')
      const blocos=_docViewsPorPav().filter(v=>v.bg).map(v=>
        `${v.nome?`<h3 class="ex-amb">${esc(v.nome)} · ${v.mks.length} ponto${v.mks.length===1?'':'s'}</h3>`:''}<div class="ex-plant" style="position:relative;display:inline-block;max-width:100%"><img src="${v.bg}" style="width:100%;display:block;border:1px solid #ddd;border-radius:6px"/>${_dotsDe(v.mks)}</div>`).join('')
      if(blocos) planta=`<div class="ex-sec"><h2>Planta de Pontos</h2>${blocos}${showLegenda?legendaMestreHtml:""}</div>`
    }

    const sec=(title,inner)=>inner?`<div class="ex-sec"><h2>${title}</h2>${inner}</div>`:''
    const list=arr=>arr&&arr.length?`<ul class="ex-ul">${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''

    // Tópico 3 — Rack com visual REALISTA (equipamentos vistos de frente)
    // REGRA: o RACK só aparece no documento se houver um marcador de rack na planta.
    // Sem rack posicionado, nada de rack "do nada".
    const rackMarker = markers.find(m=>isRackItem(m.name||'', m.code||''))
    const hasRack = !!rackMarker
    const rackCfg = d.rack_config || {}
    // itens do rack: prioriza o que VOCÊ configurou no rack da planta; só usa o da IA como apoio
    const rackItems = hasRack
      ? ((rackMarker.rackEquip||[]).length
          ? rackMarker.rackEquip.map(e=>({u:e.u||'',equip:e.name||e.equip||'',funcao:e.funcao||'',qty:e.qty||1,watts:e.watts||'—'}))
          : (d.rack_items || d.rack || []))
      : []
    const aps = rackCfg.aps||0, cams = rackCfg.cameras||0
    const totalPoe = aps+cams
    const precisaSwitch = rackCfg.precisa_switch || totalPoe > 6

    // Desenha a "face" de cada tipo de equipamento de forma realista
    const faceFor = (equip)=>{
      const e=(equip||'').toLowerCase()
      // helper: linha de portas RJ45/PoE
      const ports=(n,col='#1f2937')=>`<div style="display:flex;gap:2px;align-items:center">${Array.from({length:n}).map(()=>`<div style="width:7px;height:9px;background:${col};border:1px solid #475569;border-radius:1px"></div>`).join('')}</div>`
      const led=(c)=>`<div style="width:5px;height:5px;border-radius:50%;background:${c};box-shadow:0 0 3px ${c}"></div>`
      if(e.includes('dream machine')||e.includes('dm se')||e.includes('udm')||e.includes('gateway')||e.includes('roteador'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <div style="display:flex;align-items:center;gap:8px"><div style="width:34px;height:18px;background:#0b1220;border:1px solid #2dd4bf;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#2dd4bf;font-size:7px;font-family:monospace">LCD</div><span style="color:#94a3b8;font-size:8px;font-family:monospace">UniFi</span></div>
          <div style="display:flex;gap:8px;align-items:center">${ports(8,'#0f766e')}<div style="display:flex;gap:3px">${led('#22c55e')}${led('#22c55e')}${led('#3b82f6')}</div></div></div>`
      if(e.includes('switch'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <span style="color:#94a3b8;font-size:8px;font-family:monospace">PoE+ 16</span>
          <div style="display:flex;gap:6px">${ports(8)}${ports(8)}</div><div style="display:flex;gap:3px">${led('#22c55e')}${led('#f59e0b')}</div></div>`
      if(e.includes('patch'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <span style="color:#64748b;font-size:8px;font-family:monospace">PATCH 24</span>
          <div style="display:flex;gap:5px">${ports(12,'#334155')}${ports(12,'#334155')}</div></div>`
      if(e.includes('amplificad')||e.includes('receiver')||e.includes('áudio')||e.includes('audio')||e.includes('som'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:50%;border:2px solid #64748b"></div><div style="width:14px;height:14px;border-radius:50%;border:2px solid #64748b"></div></div>
          <span style="color:#94a3b8;font-size:8px;font-family:monospace">AMP 8 ZONAS</span>
          <div style="display:flex;gap:3px">${led('#22c55e')}${led('#ef4444')}</div></div>`
      if(e.includes('régua')||e.includes('regua')||e.includes('energia')||e.includes('tomada')||e.includes('pdu'))
        return `<div style="flex:1;display:flex;align-items:center;gap:6px;padding:0 12px;justify-content:center">${Array.from({length:8}).map(()=>`<div style="width:11px;height:11px;background:#1f2937;border:1px solid #475569;border-radius:2px;position:relative"><div style="position:absolute;top:3px;left:3px;width:5px;height:1.5px;background:#64748b"></div></div>`).join('')}<div style="margin-left:6px">${led('#ef4444')}</div></div>`
      if(e.includes('organizador')||e.includes('passa'))
        return `<div style="flex:1;display:flex;align-items:center;gap:10px;padding:0 14px;justify-content:center">${Array.from({length:5}).map(()=>`<div style="width:10px;height:14px;border:2px solid #475569;border-radius:0 0 6px 6px;border-top:none"></div>`).join('')}</div>`
      // genérico
      return `<div style="flex:1;display:flex;align-items:center;justify-content:flex-end;padding:0 12px;gap:4px">${led('#22c55e')}${led('#3b82f6')}</div>`
    }
    const uHeight = (u)=>{ const m=(''+(u||'')).match(/U(\d+)\s*[-–]\s*U(\d+)/i); if(m) return (parseInt(m[2])-parseInt(m[1])+1); return 1 }

    const rackVisual = `
<div style="margin:14px 0 22px;max-width:520px">
  <div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
    <span>RACK 12U — CPD (vista frontal)</span>
    <span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${totalPoe} disp. PoE · ${precisaSwitch?'+ Switch':'DM SE'}</span>
  </div>
  <div style="background:linear-gradient(180deg,#1e293b,#0f172a);padding:10px;border:3px solid #334155;border-top:none;border-radius:0 0 8px 8px;box-shadow:inset 0 2px 12px rgba(0,0,0,0.6)">
    ${rackItems.flatMap((r)=>{ const q=parseInt(r.qty)||1; return Array.from({length:q},(_,k)=>({...r,_dup:q>1?` (${k+1}/${q})`:''})) }).map((r,i)=>{const h=uHeight(r.u); return `
    <div style="display:flex;align-items:stretch;margin-bottom:5px;height:${22*h}px">
      <div style="width:20px;background:#0b1220;color:#475569;font-size:7px;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:2px 0 0 2px;flex-shrink:0;letter-spacing:-1px">${esc((''+(r.u||'')).replace(/[^\dU\-–]/g,''))}</div>
      <div style="flex:1;background:linear-gradient(180deg,#27272a,#18181b);border:1px solid #3f3f46;border-left:none;border-radius:0 3px 3px 0;display:flex;align-items:center;position:relative;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#52525b,#27272a)"></div>
        <div style="position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:8.5px;font-weight:700;color:#e4e4e7;font-family:'DM Sans',sans-serif;text-shadow:0 1px 1px #000;max-width:38%;line-height:1.1;z-index:2">${esc(r.equip)}${r._dup}</div>
        <div style="position:absolute;right:0;top:0;bottom:0;left:42%;display:flex;align-items:center">${faceFor(r.equip)}</div>
        <div style="position:absolute;right:4px;top:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;right:4px;bottom:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;left:4px;top:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;left:4px;bottom:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
      </div>
    </div>`}).join('')}
  </div>
  <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;padding:0 4px">
    <span style="font-size:10px;color:#374151"><b style="color:#16A34A">●</b> APs: <b>${aps}</b></span>
    <span style="font-size:10px;color:#374151"><b style="color:#DC2626">●</b> Câmeras: <b>${cams}</b></span>
    <span style="font-size:10px;color:#374151"><b style="color:${TH.accent}">●</b> PoE: <b>${totalPoe}/${rackCfg.dream_machine_portas||8}</b></span>
    ${precisaSwitch?`<span style="font-size:10px;color:#92400E;background:#FEF3C7;padding:2px 8px;border-radius:4px">⚠ Switch PoE+ ${rackCfg.switch_portas||16}p</span>`:`<span style="font-size:10px;color:#065F46;background:#D1FAE5;padding:2px 8px;border-radius:4px">✓ Dream Machine SE suficiente</span>`}
  </div>
</div>`

    const rackEquipTable = rackItems.length ? T(rackItems.map(r=>`<tr>
      <td style="font-family:monospace;font-size:10px;font-weight:700;color:#7C3AED">${esc(r.u||'—')}</td>
      <td><b>${esc(r.equip)}</b></td>
      <td style="font-size:11px;color:#475569">${esc(r.funcao||'—')}</td>
      <td style="text-align:center;font-weight:700">${esc(r.qty||1)}</td>
      <td style="text-align:right;font-size:11px">${esc(r.watts||'—')}</td>
    </tr>`).join(''),['Posição U','Equipamento','Função','Qtd','Consumo']) : ''

    const modulosTeto = d.modulos_teto || []
    const modulosTetoHtml = modulosTeto.length
      ? modulosTeto.map(mt=>`<h3 class="ex-amb">${esc(mt.ambiente)}</h3>${T((mt.itens||[]).map(it=>`<tr><td>${esc(it)}</td></tr>`).join(''),['Itens de teto / forro'])}`).join('')
      : (d.modulos||[]).length ? T(d.modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.carga)}</td><td>${esc(r.posicao)}</td></tr>`).join(''),['ID','Função','Ambiente','Carga','Posição']) : ''

    // Tabela de portas/cabos do rack — completa (APs, câmeras, keystones, uplinks)
    const rackCableTableHtml = (d.rack_cable_table||[]).length ? (()=>{
      const rows = d.rack_cable_table
      // Color legend
      const COR_LABEL = {'Azul':'#0EA5E9','Verde':'#16A34A','Amarelo':'#D97706','Cinza':'#6B7280','Vermelho':'#DC2626','Roxo':'#7C3AED'}
      const corBadge = (cor) => {
        const c = COR_LABEL[cor]||'#374151'
        return `<span style="display:inline-block;background:${c};color:#fff;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:600">${cor||'—'}</span>`
      }
      const renderRow = r => `<tr>
        <td style="text-align:center">${(()=>{ const m = r.destino_uid ? markers.find(x=>x.uid===r.destino_uid) : (r.destino_n!=null?markers.find(x=>x.n===r.destino_n):null); return m?pin(m.n,undefined,m):"—" })()}</td>
        <td><b style="font-family:monospace;background:#0D1420;color:#38BDF8;padding:2px 6px;border-radius:3px;font-size:10px">${esc(r.porta_patch)}</b></td>
        <td style="font-size:10px">${esc(r.device_origem)}</td>
        <td style="font-family:monospace;font-size:10px;color:#0369A1">${esc(r.porta_origem)}</td>
        <td>${esc(r.destino)}</td>
        <td style="font-family:monospace;font-size:10px;color:#059669">${esc(r.device_nome||'—')}</td>
        <td style="font-size:10px">${esc(r.tipo)}</td>
        <td style="font-size:10px">${esc(r.metros)}m</td>
        <td style="font-family:monospace;font-weight:700;color:#0D1420;font-size:10px;background:#FFF7ED;padding:2px 6px;border-radius:3px">${esc(r.etiqueta)}</td>
        <td>${corBadge(r.cor)}</td>
      </tr>`
      const headers = ['Ponto','Porta PP','Device Origem','Porta Origem','Destino','Nome no Sistema','Tipo','m','Etiqueta','Cor']
      const cols = headers.map(h=>`<th>${h}</th>`).join('')
      // Group by color for visual separation
      const uplink = rows.filter(r=>r.cor==='Cinza'||r.etiqueta?.includes('UPLINK'))
      const aps = rows.filter(r=>r.cor==='Azul'&&!r.etiqueta?.includes('UPLINK'))
      const cams = rows.filter(r=>r.cor==='Verde')
      const ks = rows.filter(r=>r.cor==='Amarelo')
      const outros = rows.filter(r=>!['Cinza','Azul','Verde','Amarelo'].includes(r.cor)&&!r.etiqueta?.includes('UPLINK'))
      const makeBlock = (label, color, rowsArr) => rowsArr.length ? `
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;padding:6px 0 3px;border-bottom:2px solid ${color};margin:12px 0 6px">${label} — ${rowsArr.length} cabo${rowsArr.length!==1?'s':''}</div>
        <table class="ex-tbl"><thead><tr>${cols}</tr></thead><tbody>${rowsArr.map(renderRow).join('')}</tbody></table>` : ''
      return [
        makeBlock('Uplink / Infraestrutura', '#6B7280', uplink),
        makeBlock('Access Points (PoE)', '#0EA5E9', aps),
        makeBlock('Câmeras de Segurança (PoE)', '#16A34A', cams),
        makeBlock('Keystones / Pontos de Dados', '#D97706', ks),
        makeBlock('Outros', '#7C3AED', outros),
      ].join('')
    })() : ''

    // Tópico 5 — Pontos de parede
    const pontosHtml=(d.pontos||[]).map(a=>`<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T((a.linhas||[]).map(l=>`<tr>${pinCell(l.ponto,l.equip)}<td><b>${esc(l.ponto)}</b></td><td>${esc(l.equip)}</td><td>${esc(l.parede)}</td><td>${esc(l.dist)}</td><td>${esc(l.alt)}</td><td>${esc(l.caixa)}</td><td>${esc(l.cabo)}</td></tr>`).join(''),['Nº','Ponto','Equip.','Parede ref.','Dist.','Alt.','Caixa','Cabo'])}`).join('')

    // Tópico 6 — Cabos de rede com patch panel e etiquetas
    const cabosRedeHtml = (d.cabos_rede||[]).length
      ? T(d.cabos_rede.map(r=>`<tr>${pinCell(r.destino,r.etiqueta,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.bitola)}</td><td>${esc(r.metros)}m</td><td><span style="background:${r.cor_etiqueta==='Azul'?'#0EA5E9':r.cor_etiqueta==='Amarelo'?'#D97706':r.cor_etiqueta==='Verde'?'#16A34A':r.cor_etiqueta==='Vermelho'?'#DC2626':'#374151'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${esc(r.cor_etiqueta||'Azul')}</span></td><td style="font-family:monospace;font-size:10px;background:#F0F9FF;color:#0369A1"><b>${esc(r.porta_patch||'-')}</b></td><td style="font-family:monospace;font-size:10px;font-weight:700;color:#0D1420">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['Nº','ID','Origem','Destino','Tipo','Bitola','Metros','Cor Cabo','Porta PP','Etiqueta'])
      : ''

    // Tópico 8 — Cabos elétricos detalhados por cômodo
    const cabosEletHtml = (d.cabos_eletricos_por_comodo||[]).length
      ? d.cabos_eletricos_por_comodo.map(comodo=>`
<h3 class="ex-amb">${esc(comodo.comodo)}</h3>
${T((comodo.itens||[]).map(r=>`<tr>${pinCell(r.id,r.equip)}<td><b>${esc(r.id)}</b></td><td>${esc(r.equip)}</td><td>${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.fios)}</td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.metros)}m</td><td style="color:#6B7280;font-size:10px">${esc(r.obs)}</td></tr>`).join(''),['Nº','ID','Equipamento','Tipo','Fios/Bitola','Origem','Destino','m','Obs'])}`).join('')
      : (d.cabos_eletricos||[]).length
        ? T(d.cabos_eletricos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.bitola)}</td><td>${esc(r.metros)}m</td></tr>`).join(''),['ID','Origem','Destino','Tipo de cabo','Bitola','Metros'])
        : ''

    // Tópico 10 — Módulos e cargas
    const modulosCargas = (d.modulos||[]).length
      ? T(d.modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.carga)}</td><td>${esc(r.ambiente)}</td></tr>`).join(''),['ID','Função','Carga','Ambiente'])
      : ''

    // Tópico 11 — Banheiros e sensores
    const banhHtml = (d.banheiros_sensores||[]).length
      ? T(d.banheiros_sensores.map(r=>`<tr><td><b>${esc(r.ambiente)}</b></td><td>${esc(r.ponto)}</td><td>${esc(r.obs)}</td></tr>`).join(''),['Ambiente','Ponto','Observação'])
      : ''

    // Tópico 19 — Itens por cômodo
    const byRoom={}; const geral={}
    markers.forEach(m=>{
      const r=m.room||'Geral'; const key=m.name||m.code||'Item'
      const inCat=catalog.some(c=>c.code===m.code || c.name===m.name)
      if(!byRoom[r]) byRoom[r]={}
      if(!byRoom[r][key]) byRoom[r][key]={qty:0,cat:inCat}
      byRoom[r][key].qty++
      if(!geral[key]) geral[key]={qty:0,cat:inCat}
      geral[key].qty++
    })
    // Categorias para item 7 — Segurança ANTES de Som (câmeras com "áudio" no nome são segurança)
    const CATS_MAP = {
      'Segurança': n=> /câmera|camera|dome|bullet|cftv|sensor mmwave|mmwave|sensor prese|alarme/i.test(n),
      'Rede':    n=> /access point|ap |wi-fi|wifi|keystone|switch|patch|roteador|router/i.test(n),
      'Som':     n=> /caixa|amplif|subwoofer|receiver|som ambiente|sonoriz/i.test(n),
      'Automação': n=> /keypad|hub ir|módulo|modulo|cortina|dimmer|tomada|interruptor|gateway|zigbee/i.test(n),
    }
    const getCateg = nm=>{for(const[c,fn]of Object.entries(CATS_MAP))if(fn(nm))return c; return 'Outros'}

    let itensComodoHtml=''
    Object.entries(byRoom).forEach(([room,items])=>{
      const total=Object.values(items).reduce((s,i)=>s+i.qty,0)
      // Group by category
      const byCateg={}
      Object.entries(items).forEach(([nm,i])=>{const c=getCateg(nm); if(!byCateg[c])byCateg[c]=[]; byCateg[c].push({nm,i})})
      const catColors={'Rede':'#0EA5E9','Som':'#BE185D','Segurança':'#DC2626','Automação':'#059669','Outros':'#6B7280'}
      const catHtml=Object.entries(byCateg).map(([cat,rows])=>`
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:700;color:${catColors[cat]||'#374151'};text-transform:uppercase;letter-spacing:0.5px;padding:3px 0;border-bottom:1px solid ${catColors[cat]||'#374151'}22;margin-bottom:3px">${cat}</div>
          ${T(rows.map(({nm,i})=>`<tr><td>${esc(nm)}</td><td><b>${i.qty}</b></td></tr>`).join(''),['Item','Qtd'])}
        </div>`).join('')
      itensComodoHtml+=`<h3 class="ex-amb">${esc(room)} — ${total} item(ns)</h3><div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:12px">${catHtml}</div>`
    })
    const totalGeralHtml=Object.keys(geral).length?T(
      Object.entries(geral).sort((a,b)=>b[1].qty-a[1].qty).map(([nm,i])=>`<tr><td>${esc(nm)}</td><td style="color:${{'Rede':'#0EA5E9','Som':'#BE185D','Segurança':'#DC2626','Automação':'#059669','Outros':'#6B7280'}[getCateg(nm)]||'#374151'};font-size:10px;font-weight:600">${getCateg(nm)}</td><td><b>${i.qty}</b></td></tr>`).join('')
       +`<tr style="background:#060B1A"><td style="color:#fff;font-weight:700">TOTAL GERAL</td><td></td><td style="color:#fff;font-weight:700">${Object.values(geral).reduce((s,i)=>s+i.qty,0)}</td></tr>`,
      ['Item','Categoria','Qtd total'])
      :''

    // ── Gráficos melhorados ─────────────────────────────────────────────────
    const totalPontos=markers.length
    const roomCounts=Object.entries(byRoom).map(([r,items])=>({room:r,qty:Object.values(items).reduce((s,i)=>s+i.qty,0)})).sort((a,b)=>b.qty-a.qty)
    const maxRoom=Math.max(1,...roomCounts.map(r=>r.qty))
    const CAT_COLORS={'Segurança':'#DC2626','Redes':'#0EA5E9','Sonorização':'#BE185D','Automação':'#059669','Gourmet':'#D97706','Outro':'#6B7280'}
    const catColors=['#0EA5E9','#059669','#DC2626','#BE185D','#D97706','#7C3AED','#0891B2','#65A30D']
    const barColors=['#1E3A5F','#0EA5E9','#059669','#DC2626','#7C3AED','#D97706','#0891B2','#BE185D']

    // Contagem por categoria
    const byCategCount={}
    markers.forEach(m=>{const c=m.category||'Outro'; byCategCount[c]=(byCategCount[c]||0)+1})
    const categEntries=Object.entries(byCategCount).sort((a,b)=>b[1]-a[1])
    const totalCateg=categEntries.reduce((s,[,v])=>s+v,0)

    // Gráfico 1 — Barras horizontais por ambiente (limpo, com % e qtd)
    const grafico1=`
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Pontos por Ambiente</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${totalPontos} pontos · ${roomCounts.length} ambientes</div>
  ${roomCounts.map((r,i)=>`
  <div style="display:grid;grid-template-columns:140px 1fr 30px;gap:8px;align-items:center;margin-bottom:6px">
    <div style="font-size:10px;color:#374151;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.room)}">${esc(r.room)}</div>
    <div style="background:#EEF4FB;border-radius:3px;height:18px;overflow:hidden">
      <div style="width:${Math.max(4,Math.round(r.qty/maxRoom*100))}%;background:${catColors[i%catColors.length]};height:100%;display:flex;align-items:center;padding-left:6px">
        <span style="color:#fff;font-size:9px;font-weight:700;white-space:nowrap">${r.qty}</span>
      </div>
    </div>
    <div style="font-size:9px;color:#6B7280;text-align:right">${Math.round(r.qty/totalPontos*100)}%</div>
  </div>`).join('')}
</div>`

    // Gráfico 2 — Contagem por categoria (cards limpos)
    const grafico2=categEntries.length ? `
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Equipamentos por Categoria</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${totalCateg} equipamentos · ${categEntries.length} categorias</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
    ${categEntries.map(([cat,qty])=>{const col=CAT_COLORS[cat]||'#6B7280'; const pct=Math.round(qty/totalCateg*100); return `
    <div style="border:1px solid ${col}40;border-radius:7px;padding:12px 14px;background:${col}08">
      <div style="font-size:22px;font-weight:800;color:${col};line-height:1">${qty}</div>
      <div style="font-size:11px;font-weight:600;color:#374151;margin-top:2px">${esc(cat)}</div>
      <div style="margin-top:6px;background:#E2E8F0;border-radius:2px;height:4px">
        <div style="width:${pct}%;background:${col};height:100%;border-radius:2px"></div>
      </div>
      <div style="font-size:9px;color:#6B7280;margin-top:3px">${pct}% do total</div>
    </div>`}).join('')}
  </div>
</div>` : ''

    // Gráfico 3 — Cabeamento (barras limpas)
    const resumoCabos = d.resumo_cabos || []
    const maxMetros = Math.max(1,...resumoCabos.map(r=>parseInt(r.metros_total)||0))
    const grafico3 = resumoCabos.length ? `
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Metragem de Cabeamento</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${resumoCabos.reduce((s,r)=>s+(parseInt(r.metros_total)||0),0)}m total estimado</div>
  ${resumoCabos.map((r,i)=>`
  <div style="display:grid;grid-template-columns:180px 1fr 50px;gap:8px;align-items:center;margin-bottom:7px">
    <div style="font-size:10px;color:#374151;text-align:right">${esc(r.tipo)}</div>
    <div style="background:#EEF4FB;border-radius:3px;height:20px">
      <div style="width:${Math.max(4,Math.round((parseInt(r.metros_total)||0)/maxMetros*100))}%;background:${catColors[i%catColors.length]};height:100%;border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px">
        <span style="color:#fff;font-size:9px;font-weight:700">${r.metros_total}m</span>
      </div>
    </div>
    <div style="font-size:10px;font-weight:700;color:#0369A1;text-align:right">${r.metros_total}m</div>
  </div>`).join('')}
</div>` : ''

    // Gráfico 4 — Fases do projeto (timeline limpa)
    const fases=['Infraestrutura','Cabeamento','Instalação','Configuração','Testes e Entrega']
    const fasesDesc=['Eletrodutos, caixas 4×4, nichos, tomadas dedicadas','CAT6, elétrico keypads, som, câmeras, APs','Rack, equipamentos, keypads, câmeras, sensores','Gateway Zigbee, parear dispositivos, cenas, app','Wi-Fi, som, câmeras, validação, treinamento cliente']
    const faseDuration=['2 sem','1 sem','2 sem','1 sem','3 dias']
    const faseColors=['#0EA5E9','#7C3AED','#059669','#D97706','#16A34A']
    const grafico4=`
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:16px">Fases do Projeto</div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0">
    ${fases.map((f,i)=>`
    <div style="position:relative;padding:0 4px">
      ${i<fases.length-1?`<div style="position:absolute;top:16px;left:50%;right:-50%;height:2px;background:linear-gradient(to right,${faseColors[i]},${faseColors[i+1]});z-index:0"></div>`:''}
      <div style="position:relative;z-index:1;text-align:center">
        <div style="width:32px;height:32px;border-radius:50%;background:${faseColors[i]};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;border:3px solid #fff;box-shadow:0 0 0 2px ${faseColors[i]}40">${i+1}</div>
        <div style="font-size:10px;font-weight:700;color:#0D1420;margin-bottom:3px">${f}</div>
        <div style="font-size:8.5px;color:#6B7280;line-height:1.4;margin-bottom:4px">${fasesDesc[i]}</div>
      </div>
    </div>`).join('')}
  </div>
</div>`

    const _eletr = mode==='eletrica'
    // Conduítes não tinha ramo de capa: caía no else e se apresentava como "Projeto Executivo".
    const _cond  = mode==='conduites'
    // ── PLANO DE INSTALAÇÃO ────────────────────────────────────────────────────────
    // Documento pra um TERCEIRO entrar na obra e instalar: keypad, crimpagem, item no teto,
    // configuração (Raphael). Ele chega depois do pedreiro: a parede está fechada e o cabo
    // já está lá. Por isso aqui NÃO é sobre caminho de cabo — é sobre O QUE vai em cada ponta.
    // Reusa as peças que já existem (mestra por cômodo, rack, cenas, credenciais mascaradas);
    // nada é recriado, senão vira mais uma fonte de verdade pra divergir.
    if(mode==='instalacao'){
      // NIVL e o pino são locais das outras seções — aqui declaro os meus, sem depender de
      // escopo alheio (foi assim que o _pinLabel quebrou uma vez).
      const NIVL={piso:'no chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'no teto'}
      const _fo = fazFamOculta(hideFams)
      const simbPin = m => { const fam=cableFamily(familiaDoPontoTipo(m))
        const pino=pinShapeSVG({m, mount:mountOf(m), alt:alturaOf(m), color:corDoPino(m), label:String(m.n??''), size:20})
        const selo=_fo(fam.k)?'':`<span style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${fam.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1px solid #fff;font-family:'DM Sans',sans-serif">${fam.L}</span>`
        return `<span style="position:relative;display:inline-block;width:20px;height:20px;vertical-align:middle">${pino}${selo}</span>` }
      const vis = markers.filter(m=>!isRackItem(m.name,m.code) && m.name)
      const byRoom={}; vis.forEach(m=>{ const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
      const rooms=Object.entries(byRoom)
      const _cki = (itens=[]) => `<div style="display:flex;flex-direction:column;gap:0">${itens.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:15px;height:15px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:11px;line-height:1.45;color:#1F2937">${it}</span>
        </div>`).join('')}</div>`
      const thI='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
      const tdI='style="font-size:10.5px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
      // Por cômodo: O QUE instalar em cada ponta — o item, não o cabo.
      const porComodo = rooms.map(([amb,ms])=>`
        <h3 class="ex-amb">${esc(amb)} · ${ms.length} ${ms.length===1?'ponto':'pontos'}</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th ${thI} style="width:44px;text-align:center">Ponto</th><th ${thI}>O que instalar</th><th ${thI} style="width:150px">Equipamento</th><th ${thI} style="width:70px">Altura</th><th ${thI} style="width:110px">Cabo que chega</th><th ${thI} style="width:70px;text-align:center">Instalado</th></tr></thead>
          <tbody>${ms.map(m=>{ const sp=specDoPonto(m); const fn=funcaoDoPonto(m); const eq=(m.name||'').trim()
            return `<tr>
              <td ${tdI} style="text-align:center;padding:3px 8px;border-bottom:.5px solid #E2E8F0">${simbPin(m)}</td>
              <td ${tdI} style="font-weight:600">${esc(fn)}</td>
              <td ${tdI} style="font-size:10px;color:#64748B">${(eq&&eq!==fn)?esc(eq):'—'}</td>
              <td ${tdI}>${NIVL[alturaOf(m)]||'—'}</td>
              <td ${tdI} style="font-size:10px">${esc(sp.cabo||'—')}</td>
              <td ${tdI} style="text-align:center"><span style="display:inline-block;width:14px;height:14px;border:2px solid #0D1420;border-radius:3px"></span></td>
            </tr>` }).join('')}</tbody>
        </table>`).join('')
      const secs = [
        `<div class="ex-sec" style="border:none"><h2 style="border:none;margin-bottom:4px">Plano de Instalação</h2>
          <p class="ex-p" style="color:#6B7280">Para quem entra depois do pedreiro: a parede está fechada e o cabo já está na caixa. Aqui está <b>o que vai em cada ponta</b>, como configurar e como testar. O caminho dos cabos está no Plano de Obra.</p>
          <h3 class="ex-amb" style="margin-top:14px">Antes de começar</h3>
          ${_cki([
            'Conferir se o cabo de cada ponto bate com a tabela — <b>se não bater, pare e avise</b>; não improvise.',
            'Testar continuidade e certificar os cabos de rede antes de crimpar o keystone.',
            'Keypad só energiza com <b>fase + neutro</b> na caixa. Se não houver neutro, o ponto não está pronto: registre e avise.',
            'Conferir a tensão (110/220) antes de energizar qualquer módulo.',
            'Rack montado, energizado e com internet antes de configurar os dispositivos.',
          ])}</div>`,
        bgImage ? (()=>{
          // UMA planta por PAVIMENTO (com 1 andar sai igual a antes) — cada andar com seus pontos.
          const plantas = plantasPorPav(v=>{
            const dots=v.mks.filter(m=>!isRackItem(m.name,m.code) && m.name && !hideCats.has(equipType(m.name))).map(m=>{
              const f=cableFamily(familiaDoPontoTipo(m))
              const badge=(showCabo && !_fo(f.k))?`<div style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
              return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:${PIN_PX}px;height:${PIN_PX}px">${pinShapeSVG({m, mount:mountOf(m), alt:alturaOf(m), color:corDoPino(m), label:_pinLabel(m), size:PIN_PX})}${badge}</div>` }).join('')
            return `<div class="ex-plant" style="position:relative;display:inline-block;max-width:100%;margin-bottom:10px"><img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>${dots}</div>`
          })
          return `<div class="ex-obra-page" style="page-break-before:always">
            <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Onde está cada ponto</h2>
            ${plantas}
            ${showLegenda?legendaMestreHtml:''}</div>` })() : '',
        `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Itens por Cômodo</h2>
          <p class="ex-p" style="color:#6B7280">Marque conforme for instalando.</p>${porComodo}</div>`,
        (rackEquipTable||rackCableTableHtml) ? `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Rack / CPD</h2>
          <p class="ex-p" style="color:#6B7280">Monte na ordem das U. A tabela de portas é a <b>proposta</b> de patch — se mudar, anote na coluna.</p>
          ${rackEquipTable||''}${rackVisual||''}${rackCableTableHtml||''}
          <h3 class="ex-amb" style="margin-top:16px">Crimpagem e organização</h3>
          ${_cki([
            'Padrão <b>T568A ou B — o mesmo nas duas pontas</b> e no projeto inteiro.',
            'Destrançar o mínimo possível no conector; capa do cabo entrando dentro do plug.',
            'Certificar cada lance depois de crimpar (par a par) e anotar o resultado.',
            'Etiquetar as duas pontas de todo cabo, com o mesmo código da tabela.',
            'Sobra organizada no rack — nem esticado, nem novelo. Raio de curva respeitado.',
            'Régua e fonte por último; nada energizado durante a crimpagem.',
          ])}</div>` : '',
        // Configuração: cenas + rede + câmeras. Cada bloco só entra se existir no projeto —
        // quem instala precisa das 3 coisas, não só das cenas (Raphael).
        `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Configuração</h2>
          ${blocoCenasHtml()}</div>`,
        // GUIA TÉCNICO PASSO A PASSO (Raphael) — só no Plano de Instalação, pra um terceiro
        // configurar do zero: VLANs, SSIDs, UniFi/owner, permissões, IoT externo, guest, sensores,
        // zigbee, som. Tailored pelo que existe no rack/projeto.
        temWifiNoProjeto ? `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Configuração de Rede — Passo a Passo</h2>
          ${(()=>{
            const nomes = m => (((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
            const rackEq = (markers.find(m=>isRackItem(m.name||'', m.code||''))||{}).rackEquip || []
            // detecção ampla: marcadores + rackEquip do marcador + rack_items da IA + tabela de portas
            const txtRack = [
              ...rackEq.map(e=>(e.name||'')+' '+(e.code||'')),
              ...((d.rack_items||[]).map(r=>(r.equip||r.name||''))),
              ...((d.rack_cable_table||[]).map(r=>(r.device_origem||'')+' '+(r.device_nome||''))),
            ].join(' ').toLowerCase()
            const has = re => markers.some(m=>re.test(nomes(m))) || re.test(txtRack)
            // Rede na RARO é sempre UniFi (Dream Machine): o passo de owner/permissões é core e
            // aparece sempre que há rede. Switch aparece se detectado OU se há PoE (câmera/AP).
            const hasCam = has(/c[âa]mera|camera|dome|bullet|nvr|protect/)
            const hasAP = has(/access point|\bap\b|\bu6\b|\bu7\b|unifi ap|antena|wi-?fi/)
            const hasUDM = true
            const hasSwitch = has(/switch/) || hasCam || hasAP
            const hasZig = has(/zigbee|hue|gateway zigbee|hub|bridge|controladora|conson|sonoff/)
            const hasSensor = has(/sensor|presen[çc]a|mmwave/)
            const hasSom = has(/som|amplificador|receiver|caixa ac|sonos|amp/)
            const hasSolar = has(/solar|inversor|fotovolt|painel/)
            const passo = (n,t,itens)=>`<div style="break-inside:avoid;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="flex-shrink:0;width:22px;height:22px;border-radius:6px;background:#0D1420;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</span><span style="font-size:12.5px;font-weight:700;color:#0D1420">${t}</span></div>
              ${_cki(itens)}</div>`
            // Campo em branco pra preencher à mão na obra (e-mail do cliente, nome do site…).
            const campo = (label)=>`<div style="display:flex;align-items:flex-end;gap:8px;margin:2px 0 10px 30px;font-size:11px;color:#1F2937;break-inside:avoid">
              <span style="font-weight:600;white-space:nowrap">${label}:</span>
              <span style="flex:1;border-bottom:1.5px solid #94A3B8;min-height:15px">&nbsp;</span></div>`
            let n=0
            const passos=[]
            // 1) CONTA — owner é o CLIENTE (Raphael): a RARO entra só como admin convidado.
            passos.push(passo(++n,'Conta UniFi e adoção — owner = CLIENTE',[
              'A conta dona (owner) do sistema é <b>do cliente</b>, no e-mail dele. A RARO entra como <b>administrador convidado</b> — nunca como owner.',
              'Criar a conta em <b>account.ui.com</b> com o e-mail do cliente e ativar 2FA. Anotar o e-mail abaixo.',
              'Adotar o gateway/console nessa conta (owner = cliente) e convidar a RARO como <b>Admin / Full Management</b> para instalar e dar manutenção.',
              'País, fuso e NTP corretos. Administração pela WAN, SSH e UPnP <b>desligados</b>.',
              'Firmware atualizado antes de tudo; updates automáticos ligados; backup de config (nuvem do cliente + cópia local RARO).',
            ]))
            passos.push(campo('E-mail do cliente (owner UniFi)')+campo('Nome do site/console'))
            // 2) VLANs — Settings → Networks
            passos.push(passo(++n,'VLANs — criar a segmentação (Settings → Networks)',[
              'Em <b>Settings → Networks → New Virtual Network</b>, criar uma rede para cada VLAN, com o <b>VLAN ID</b> e a sub-rede indicados.',
              '<b>VLAN 10 — Principal</b> (confiável) · ex. 192.168.10.0/24 · celulares e PCs da família. Acesso pleno.',
              '<b>VLAN 20 — IoT</b> · ex. 192.168.20.0/24 · TVs, assistentes, eletros, hub Zigbee. Isolada da 10.',
              '<b>VLAN 30 — Câmeras/CFTV</b> · ex. 192.168.30.0/24 · câmeras e NVR. Isolada das outras; só internet.',
              '<b>VLAN 40 — Guest</b> · marcar como rede <b>Guest</b> no UniFi (liga o isolamento de cliente automático).',
              hasSolar?'<b>VLAN 50 — Utilidades externas</b> · ex. 192.168.50.0/24 · inversor solar, portão, interfone IP. NÃO vai no Guest nem na Principal.':'Se houver inversor solar / portão / interfone IP: <b>VLAN própria</b> de utilidades externas (nunca no Guest nem na Principal).',
            ]))
            // 3) DHCP — dentro de cada Network
            passos.push(passo(++n,'DHCP — faixas, reservas e DNS (em cada Network)',[
              'Em cada VLAN, <b>DHCP Server ligado</b>. Deixar os primeiros IPs de fora do range (ex.: range .20–.250, reservando .2–.19 para fixos).',
              '<b>Reserva de DHCP</b> (IP fixo por MAC) para gateway, switch, APs, NVR, hub Zigbee e câmeras — assim o endereço não muda.',
              'DNS: o do próprio gateway, ou 1.1.1.1 / 8.8.8.8. Lease time padrão (24 h).',
              'Cada VLAN enxerga só o <b>seu</b> DHCP — nada de servidor DHCP cruzando VLAN.',
            ]))
            // 4) SSIDs — Settings → WiFi
            passos.push(passo(++n,'SSIDs — amarrar cada rede à sua VLAN (Settings → WiFi)',[
              'Em <b>Settings → WiFi → New</b>, para cada SSID escolher a <b>Network (VLAN)</b> correspondente no campo Network.',
              '<b>"[Casa]"</b> → VLAN 10 · WPA2/WPA3 · 2,4 + 5 GHz.',
              '<b>"[Casa]-IoT"</b> → VLAN 20 · <b>só 2,4 GHz</b> (a maioria dos IoT não fala 5 GHz).',
              '<b>"[Casa]-Guest"</b> → VLAN 40 (Guest) · limite de banda · portal com senha se o cliente quiser trocar fácil.',
              'Não criar SSID de câmeras — elas entram <b>por cabo</b> (PoE) na VLAN 30.',
            ]))
            // 5) Canais/potência das antenas — Devices → cada AP → Radios
            if(hasAP) passos.push(passo(++n,'Antenas (APs) — canais e potência (Devices → AP → Settings → Radios)',[
              'Fixar os canais <b>manualmente</b> (não deixar tudo em Auto). <b>2,4 GHz</b>: usar 1, 6 ou 11 sem repetir entre APs vizinhos; largura <b>20 MHz</b>.',
              '<b>5 GHz</b>: canais altos (menos ruído do vizinho); largura 40 ou 80 MHz; sem repetir canal entre APs próximos.',
              'Potência (<b>Transmit Power</b>) em <b>Medium/Low</b>, não High — potência demais gera interferência, não cobertura.',
              '<b>Band Steering</b> e <b>Fast Roaming</b> ligados para o cliente andar pela casa sem cair a conexão.',
              'Minimum RSSI para forçar o handoff quando o sinal cai; nomear cada AP pelo cômodo.',
              'Manter 2,4 GHz ativo onde há automação — sensor/keypad não fala 5 GHz.',
            ]))
            // 6) Switch PoE
            if(hasSwitch) passos.push(passo(++n,'Switch PoE — portas e VLANs',[
              'Porta de cada <b>câmera</b>: <b>PoE ligado + VLAN 30</b> (untagged CFTV).',
              'Porta de cada <b>AP</b>: perfil <b>trunk / All</b> (todas as VLANs de SSID) para o AP distribuir os SSIDs.',
              'Porta do hub Zigbee/IoT: VLAN 20. Porta do NVR: VLAN 30.',
              'Desligar PoE nas portas não usadas; nomear cada porta pelo destino (AP-Estar, CAM-Garagem…).',
            ]))
            // 7) Firewall
            passos.push(passo(++n,'Firewall entre VLANs (Settings → Security / Firewall)',[
              'Regra base: <b>bloquear tudo entre VLANs</b> e liberar só o necessário.',
              'IoT (20) → Principal (10): bloqueado, exceto mDNS/cast para TV e impressora.',
              'Câmeras (30): sem rota para 10/20/40; só saída de internet para o app.',
              'Guest (40): só internet. Externas/solar (50): só internet, sem acesso à casa.',
            ]))
            // 8) Filtros de conteúdo — Content Filtering
            passos.push(passo(++n,'Filtros de conteúdo (Content Filtering / Ad Blocking)',[
              'Em cada VLAN, ligar o <b>Content Filtering</b> conforme combinado com o cliente: <b>Family</b> (bloqueia adulto/malicioso) ou <b>Work</b>.',
              '<b>Ad Blocking</b> ligado na Principal e IoT, se o cliente quiser.',
              '<b>Guest</b>: filtro no nível mais restritivo.',
              'Rede de crianças/quarto (se houver): filtro <b>Family</b> nessa VLAN, com horário se pedido.',
            ]))
            // 9) Câmeras + partição de gravação (se UDM/Protect)
            if(hasCam) passos.push(passo(++n,'Câmeras / NVR — gravação e acesso',[
              'Trocar a senha de fábrica de <b>todas</b> as câmeras e do NVR.',
              'Câmeras na VLAN 30; acesso remoto <b>só pelo app do fabricante</b> (sem port forwarding / DMZ).',
              '<b>Partição de gravação</b>: se o gateway for <b>UDM Pro/SE com HD</b>, formatar o disco em <b>UniFi Protect</b> e definir a retenção (dias). Se for NVR dedicado, configurar RAID/retenção nele.',
              'Gravação <b>contínua + evento</b>; NTP sincronizado (hora certa = prova).',
              'Usuário admin só para a RARO durante a instalação; o dono (cliente) já é owner.',
            ]))
            if(hasZig) passos.push(passo(++n,'Hub Zigbee / Automação',[
              'Hub Zigbee na VLAN 20 (IoT), IP fixo (reserva DHCP).',
              'Parear keypads, módulos e sensores; nomear cada um pelo cômodo.',
              'Rotinas e cenas no hub/controlador (ver a tabela de Cenas); backup da config.',
            ]))
            if(hasSensor) passos.push(passo(++n,'Sensores de presença',[
              'Parear na VLAN de automação; definir sensibilidade e tempo de retardo por ambiente.',
              'Amarrar cada sensor à cena do cômodo (acende/mantém/apaga).',
              'Em circulação/escada: brilho baixo à noite, não acionar de dia.',
            ]))
            if(hasSom) passos.push(passo(++n,'Som ambiente',[
              'Amplificador/receiver na VLAN Principal (streaming) ou IoT, IP fixo.',
              'Nomear cada zona pelo cômodo; testar volume por zona.',
              'Integrar ao controlador para a cena "som" por ambiente.',
            ]))
            passos.push(passo(++n,'Entrega da rede',[
              'Confirmar que o console está no <b>e-mail do cliente (owner)</b> e a RARO como admin convidado.',
              'IP fixo (ou reserva DHCP) para gateway, switch, APs, NVR, hub e câmeras.',
              'Testar cada SSID no cômodo mais distante; guest sem enxergar a casa.',
              'Credenciais na Folha de Credenciais, entregues em mão ao cliente.',
            ]))
            return `<p class="ex-p" style="color:#6B7280;margin-bottom:10px">Configuração completa da rede, na ordem, com o caminho no controlador UniFi. Substitua "[Casa]" pelo nome do projeto e ajuste os números ao equipamento do rack. <b>O owner do sistema é sempre o cliente</b> — a RARO fica como administrador convidado.</p>${passos.join('')}`
          })()}
          ${blocoEquipConfigHtml()}</div>` : '',
        temCam ? `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Configuração — Câmeras</h2>
          ${blocoCamerasHtml()}</div>` : '',
        `<div class="ex-obra-page" style="page-break-before:always">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Entrega</h2>
          <h3 class="ex-amb">Teste final — ponto a ponto</h3>
          ${_cki([
            'Cada tecla de cada keypad aciona o que está na tabela de cenas.',
            'Todas as luzes acendem e apagam também <b>pelo botão físico</b>, com a internet fora.',
            'Cortinas abrem e fecham por completo, sem travar no fim de curso.',
            'Som toca em todas as zonas, no volume de cada uma.',
            'Todas as câmeras com imagem, no ângulo aprovado, gravando no NVR.',
            'Wi-Fi testado <b>no cômodo mais distante</b>, não só ao lado do AP.',
            'Guest testado: conecta na internet e não enxerga a rede da casa.',
          ])}
          <h3 class="ex-amb" style="margin-top:16px">Fechamento com o cliente</h3>
          ${_cki([
            'Treinamento feito com quem <b>mora</b> na casa, não só com quem contratou.',
            'Credenciais entregues em mão (Folha de Credenciais) e retiradas de qualquer grupo de mensagens.',
            'Acesso do cliente criado com senha própria.',
            'Pendências anotadas por escrito, com prazo.',
          ])}
          <div style="margin-top:26px;border-top:1px dashed #CBD5E1;padding-top:10px;font-size:10.5px;color:#64748B">
            Instalador: ______________________________  Data: ____/____/______<br><br>
            Recebi e testei: __________________________  Data: ____/____/______
          </div></div>`,
      ].filter(Boolean)
      return `<style>${_ver==='opus'?EXEC_CSS_OPUS:_ver==='fable'?EXEC_CSS_FABLE:_ver==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>
        <div class="ex-doc"><div class="ex-cover ex-doc-cover">
          <div class="ex-cover-top">DOCUMENTO DE OBRA · INSTALAÇÃO</div>
          <img src="${brandLogoExec()}" alt="Logo" style="width:170px;max-width:50%;margin:0 auto 8px;display:block"/>
          <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
          <div class="ex-cover-title">Plano de Instalação</div>
          <div class="ex-cover-sub">Itens por cômodo · Crimpagem · Configuração · Testes<br>Guia para quem instala e entrega</div>
          <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · ${brandName()}</div></div>
          <div class="ex-cover-foot">${brandName()}</div>
        </div>${secs.join('\n')}</div>`
    }

    // "Detalhes de Pontos por Cômodo" (ex-"Posição e Altura") deixa de sair solto antes dos
    // capítulos e entra na lista numerada como #2 (Raphael). Aqui só computo o CORPO (sem título);
    // o título numerado é aplicado lá embaixo, logo após Premissas.
    let _detalhesPontosBody = ''
    return `<style>${_ver==='opus'?EXEC_CSS_OPUS:_ver==='fable'?EXEC_CSS_FABLE:_ver==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>
<div class="ex-doc">
  <!-- CAPA -->
  <div class="ex-cover">
    <div class="ex-cover-top">${_cond?'DOCUMENTO TÉCNICO · CONDUÍTES':_eletr?'DOCUMENTO TÉCNICO · ELÉTRICA':isObra?'DOCUMENTO DE OBRA · INFRAESTRUTURA':'DOCUMENTO TÉCNICO · PROJETO EXECUTIVO'}</div>
    <img src="${brandLogoExec()}" alt="Logo" style="width:170px;max-width:50%;margin:0 auto 8px;display:block"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">${_cond?'Conduítes e Infraestrutura':_eletr?'Planta Elétrica':isObra?'Plano de Obra — Cabos e Infraestrutura':'Projeto Executivo de Automação'}</div>
    <div class="ex-cover-sub">${_cond?'Caminho dos eletrodutos · Bitolas · Caixas de passagem<br>Guia de infraestrutura para a obra':_eletr?'Símbolos ABNT NBR 5444 · Quadro de cargas<br>Pontos e circuitos elétricos':isObra?'Caminho dos cabos · Metragens · Alturas · Caixas 4×4<br>Guia direto para o eletricista e o pedreiro':'Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto'}</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · ${brandName()}</div></div>
    ${_opus?(()=>{ const vis=markers.filter(m=>!isRackItem(m.name,m.code))
      const pts=vis.length
      const rooms=new Set(vis.map(m=>(m.room||'').trim()).filter(Boolean)).size
      const sis=new Set(vis.map(m=>cableFamily(familiaDoPontoTipo(m)).nome)).size
      const mts=(cables||[]).filter(c=>!c.free).reduce((s,c)=>s+(cableMeters(c)||0),0)
      const cell=(n,l)=>`<div><div class="ex-scope-n">${n}</div><div class="ex-scope-l">${l}</div></div>`
      return `<div class="ex-cover-scope">${cell(pts,'pontos')}${cell(rooms,'cômodos')}${cell(sis,'sistemas')}${(plantScale&&mts)?cell('~'+Math.round(mts)+'m','cabeamento'):''}</div>` })():''}
    <div class="ex-cover-foot">${brandName()}${brandName()==='RARO Home'?' · contato@rarohome.com.br · (21) 98170-9009':''}</div>
  </div>

  ${(()=>{ if(isObra||_eletr||secOff('t_planta')) return ''
    {
      // UMA planta por pavimento (com 1 andar sai igual a antes)
      const _dotsDe = mks => mks.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        const f=cableFamily(familiaDoPontoTipo(m))
        const badge=showCabo?`<div style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
        // 18px = mesmo tamanho da "Planta Completa" do Plano de Obra, que o Raphael aprovou.
        // Estava 24px: 33% maior numa planta MAIS ESTREITA, então proporcionalmente o pino
        // dominava o desenho. O número acompanha (o SVG é viewBox 24 escalado por size).
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:${PIN_PX}px;height:${PIN_PX}px">${pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||st.c,label:_pinLabel(m),size:PIN_PX})}${badge}</div>`}).join('')
      const blocos=_docViewsPorPav().filter(v=>v.bg).map(v=>
        `${v.nome?`<h3 class="ex-amb">${esc(v.nome)} · ${v.mks.length} ponto${v.mks.length===1?'':'s'}</h3>`:''}<div class="ex-plant" style="position:relative;display:inline-block;max-width:100%"><img src="${v.bg}" style="width:100%;display:block;border:1px solid #D1E6F8;border-radius:6px"/>${_dotsDe(v.mks)}</div>`).join('')
      if(blocos) return `<div class="ex-sec"><h2>Planta de Pontos</h2>${blocos}${showLegenda?legendaMestreHtml:""}</div>`
    }
    return ''
  })()}

  ${(()=>{ if(isObra||_eletr||secOff('pos_altura')) return ''
    const NIV={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}
    const LOC={teto:'Teto',chao:'Piso',parede:'Parede'}
    const byRoom={}
    markers.filter(m=>!isRackItem(m.name,m.code)&&!hideCats.has(equipType(m.name))).forEach(m=>{ const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
    const rooms=Object.entries(byRoom)
    if(!rooms.length) return ''
    const th='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
    const td='style="font-size:11px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
    const withId = showIdsTbl
    const idTh = withId ? `<th ${th} style="width:70px;text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">ID</th>` : ''
    const simb=(m)=>{ const pino=pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||'#64748B',label:_pinLabel(m),size:24}); const fam=cableFamily(familiaDoPontoTipo(m))
      return `<span style="position:relative;display:inline-block;width:24px;height:24px;vertical-align:middle">${pino}<span style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${fam.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif" title="${fam.nome}">${fam.L}</span></span>` }
    // Layout da tabela IGUAL à de Equipamentos do Rack (Raphael): usa o helper T(), que gera
    // <table class="ex-tbl"> com o cabeçalho navy + dourado do OPUS, em vez do header cinza inline.
    _detalhesPontosBody = `<p style="font-size:10.5px;color:#64748B;margin:-4px 0 10px">Conferência para a obra, cômodo a cômodo: <b>onde</b> deixar a ponta e <b>qual cabo</b> é. O símbolo repete o da planta — <b>forma</b> = local, <b>selo</b> = família do cabo.</p>
      ${(()=>{ const temNota=true // coluna Nota sempre presente (Raphael); célula "—" quando vazia
        return rooms.map(([amb,ms])=>{
        const cols = ['Ponto', ...(withId?['ID']:[]), 'Item','Equip.','Local','Altura','Caixa','Cabo', ...(temNota?['Nota']:[])]
        const rowsHtml = ms.map(m=>{ const sp=specDoPonto(m); const fn=funcaoDoPonto(m); const eq=(m.name||'').trim()
          return `<tr><td style="text-align:center">${simb(m)}</td>${withId?`<td style="font-family:monospace;font-size:10px">${m.id||m.code||('#'+m.n)}</td>`:''}<td style="font-weight:600">${fn}</td><td style="font-size:10px;color:#64748B">${(eq&&eq!==fn)?esc(eq):'—'}</td><td>${LOC[mountOf(m)]||'—'}</td><td style="font-weight:600">${NIV[alturaOf(m)]||'—'}</td><td style="text-align:center;font-weight:700">${sp.caixa||'—'}</td><td style="font-size:10.5px">${sp.cabo||'—'}</td>${temNota?`<td style="font-size:10px;color:#475569">${esc((m.note||'').trim()||'—')}</td>`:''}</tr>` }).join('')
        return `<h3 class="ex-amb" style="margin-top:14px">${esc(amb)} <span style="font-weight:400;color:#94A3B8">· ${ms.length} ${ms.length===1?'ponto':'pontos'}</span></h3>${T(rowsHtml, cols)}`
      }).join('') })()}`
    return ''
  })()}

  ${(()=>{ if(isObra||_eletr||secOff('itens_unicos')) return ''
    // OPUS: a legenda embaixo da planta JÁ é esta tabela (mesma dedup, e ainda com ABNT +
    // desempate). Manter as duas era imprimir o mesmo conteúdo 2×. Os outros modelos seguem.
    if(_opus) return ''
    // Tabela de ITENS ÚNICOS: um item por tipo (dedup por nome+altura+local+sistema),
    // com a quantidade. Ex.: 3 câmeras externas viram 1 linha "Câmera externa 4MP ·×3".
    const NIV={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}
    const LOC={teto:'Teto',chao:'Piso',parede:'Parede'}
    const vis=markers.filter(m=>!isRackItem(m.name,m.code)&&!hideCats.has(equipType(m.name))&&m.name)
    if(!vis.length) return ''
    const grupos=new Map()
    vis.forEach(m=>{ const fam=cableFamily(familiaDoPontoTipo(m)); const chave=[m.name,alturaOf(m),mountOf(m),fam.k].join('|')
      if(!grupos.has(chave)) grupos.set(chave,{m,fam,qtd:0}); grupos.get(chave).qtd++ })
    const linhas=[...grupos.values()].sort((a,b)=>(a.m.name||'').localeCompare(b.m.name||''))
    const th='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
    const td='style="font-size:11px;padding:6px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
    const simb=(m,fam)=>{ const pino=pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||'#64748B',label:'',size:24})
      return `<span style="position:relative;display:inline-block;width:24px;height:24px;vertical-align:middle">${pino}<span style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${fam.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif" title="${fam.nome}">${fam.L}</span></span>` }
    return `<div class="ex-sec"><h2>Resumo por Item (tipos únicos)</h2>
      <p style="font-size:10.5px;color:#64748B;margin:-4px 0 10px">Cada tipo de ponto aparece <b>uma vez</b>, com a quantidade total. Serve de legenda: o símbolo ao lado é o mesmo que se repete na planta. <b>Cor</b> = categoria, <b>forma</b> = local, <b>selo</b> = cabo (E elétrica, R rede, S som).</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th ${th} style="width:70px;text-align:center;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Símbolo</th><th ${th}>Item</th><th ${th}>Local</th><th ${th}>Altura</th><th ${th}>Sistema</th><th ${th} style="text-align:right;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Qtd.</th></tr></thead>
        <tbody>${linhas.map(({m,fam,qtd})=>`<tr><td ${td} style="text-align:center;padding:4px 8px;border-bottom:.5px solid #E2E8F0">${simb(m,fam)}</td><td ${td} style="font-weight:600">${m.name||'—'}</td><td ${td}>${LOC[mountOf(m)]||'—'}</td><td ${td}>${NIV[alturaOf(m)]||'—'}</td><td ${td} style="font-weight:600;color:${fam.cor}">${famOculta(fam.k)?'—':fam.nome}</td><td ${td} style="text-align:right;font-weight:800">×${qtd}</td></tr>`).join('')}</tbody>
      </table>
    </div>`
  })()}

  ${(()=>{ let _n=0
    const secN=(title,inner,breakable=false)=> inner ? `<div class="ex-sec${breakable?' ex-breakable':''}"><h2><span class="ex-sec-num">${++_n}</span>${title}</h2>${inner}</div>` : ''
    const fotosTxt=`
<p class="ex-p">O mestre de obra deve fotografar cada ponto pelo número antes de fechar a parede, registrando no app RARO Home. Assim cada foto fica atrelada ao ponto correspondente.</p>
<div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap">

  <!-- Card 1: Foto da caixa elétrica com número -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:#0EA5E9;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">K1</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Keypad Entrada</span>
    </div>
    <div style="background:#E2E8F0;height:110px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" width="160" height="110">
        <rect width="160" height="110" fill="#D1D5DB"/>
        <!-- parede com caixa 4x4 -->
        <rect x="55" y="25" width="50" height="60" rx="3" fill="#9CA3AF"/>
        <rect x="60" y="30" width="40" height="50" rx="2" fill="#6B7280" stroke="#4B5563" stroke-width="1"/>
        <!-- fios saindo -->
        <line x1="80" y1="80" x2="80" y2="100" stroke="#FBBF24" stroke-width="2"/>
        <line x1="85" y1="80" x2="85" y2="100" stroke="#1D4ED8" stroke-width="2"/>
        <!-- etiqueta K1 -->
        <rect x="62" y="40" width="36" height="18" rx="2" fill="#0EA5E9"/>
        <text x="80" y="53" font-size="12" fill="#fff" text-anchor="middle" font-weight="800" font-family="monospace">K1</text>
        <!-- câmera foto -->
        <circle cx="140" cy="15" r="8" fill="#1F2937" opacity="0.85"/>
        <circle cx="140" cy="15" r="4" fill="#374151"/>
        <circle cx="140" cy="15" r="2" fill="#60A5FA"/>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Caixa 4×4 antes de fechar</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Neutro + fase identificados · H=1,10m</div>
    </div>
  </div>

  <!-- Card 2: Planta com pin marcado -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:#059669;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">AP</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Access Point Sala</span>
    </div>
    <div style="background:#E2E8F0;height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" width="160" height="110">
        <rect width="160" height="110" fill="#F1F5F9"/>
        <!-- planta simplificada -->
        <rect x="10" y="10" width="140" height="90" rx="2" fill="none" stroke="#94A3B8" stroke-width="1.5"/>
        <line x1="80" y1="10" x2="80" y2="100" stroke="#94A3B8" stroke-width="1" stroke-dasharray="3,3"/>
        <line x1="10" y1="55" x2="150" y2="55" stroke="#94A3B8" stroke-width="1" stroke-dasharray="3,3"/>
        <!-- porta -->
        <line x1="10" y1="55" x2="10" y2="75" stroke="#475569" stroke-width="2"/>
        <!-- pin AP -->
        <circle cx="80" cy="32" r="10" fill="#059669" stroke="#fff" stroke-width="2"/>
        <text x="80" y="36" font-size="9" fill="#fff" text-anchor="middle" font-weight="800" font-family="monospace">AP</text>
        <line x1="80" y1="42" x2="80" y2="50" stroke="#059669" stroke-width="1.5" stroke-dasharray="2,2"/>
        <!-- sinal wifi -->
        <path d="M74 25 Q80 19 86 25" fill="none" stroke="#A7F3D0" stroke-width="1.5"/>
        <path d="M71 22 Q80 14 89 22" fill="none" stroke="#6EE7B7" stroke-width="1"/>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Posição exata na planta</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Teto centro sala · CAT6 confirmado</div>
    </div>
  </div>

  <!-- Card 3: Relatório diário resumido -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#7C3AED;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">📋</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Relatório do Dia</span>
    </div>
    <div style="background:#F8FAFC;padding:10px;height:110px;overflow:hidden">
      <div style="font-size:8px;color:#475569;font-family:'DM Sans',sans-serif;line-height:1.7">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding-bottom:3px;margin-bottom:3px">
          <b style="color:#0F172A">Data:</b> <span>14/06/2026</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#16A34A;font-size:9px">✓</span><span>K1 — Keypad entrada (foto OK)</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#16A34A;font-size:9px">✓</span><span>AP1 — Teto sala (foto OK)</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#D97706;font-size:9px">⏳</span><span>CAM1 — Aguardando eletroduto</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <span style="color:#DC2626;font-size:9px">⚠</span><span>K3 — Neutro ausente (verificar)</span>
        </div>
      </div>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC;border-top:1px solid #E2E8F0">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Acompanhamento em tempo real</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Pendências sinalizadas · app RARO Home</div>
    </div>
  </div>

</div>
<p class="ex-p" style="font-size:10px;color:#64748B;font-style:italic">Cada foto é vinculada ao ponto pelo número (ex: K1, AP1, CAM2). O relatório diário mostra o status de cada ponto — concluído ✓, pendente ⏳ ou com problema ⚠.</p>
`
    // ── Helper: pin badge com número da planta ──────────────────────────────
    // (pin/pinNum/pinCell já definidos no topo de buildExecHtml)
    const CATCOLOR={'Redes':'#0EA5E9','Segurança':'#DC2626','Sonorização':'#BE185D','Automação':'#059669','Gourmet':'#D97706'}
    const catColor=(cat)=>CATCOLOR[cat]||'#6B7280'
    // Coluna de ID nas tabelas de IA — respeita o toggle "IDs nas tabelas".
    const withId = showIdsTbl
    const idCell = (v) => withId ? `<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(v)}</td>` : ''
    const idHdr = withId ? ['ID'] : []

    // ── Tabela Automação (Interruptores, Tomadas, Sensores, Hub IR, Módulos) ──
    const tblAutomacao = (d.tabela_automacao||[]).length
      ? T((d.tabela_automacao||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Automação'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}${idCell(r.id)}<td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.funcao)}</td><td style="font-size:10px">${esc(r.protocolo||'Zigbee')}</td><td style="text-align:center;font-size:10px;font-weight:600">${(()=>{ const m=_findMk(r.id,r.equip); const cx=m?(m.caixaTipo||caixaPadrao(classifyEle(m)?.sym)):''; return cx?esc(cx):'—' })()}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#',...idHdr,'Equipamento','Ambiente','Função','Protocolo','Caixa','Posição/Altura','Obs'])
      : ''

    // ── Tabela Segurança (Câmeras, Sensores de Alarme) ────────────────────────
    const tblSeguranca = (d.tabela_seguranca||[]).length
      ? T((d.tabela_seguranca||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Segurança'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}${idCell(r.id)}<td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.resolucao||'—')}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px">${esc(r.angulo||'—')}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#',...idHdr,'Equipamento','Ambiente','Resolução','Tipo','Posição','Ângulo','Obs'])
      : ''


    // ── Tabela Som Ambiente ────────────────────────────────────────────────────
    const tblSom = (d.tabela_som||[]).length
      ? T((d.tabela_som||[]).map(r=>{const _sub=/subwoofer|\bsub\b/.test(((r.equip||'')+' '+(r.id||'')).toLowerCase()); const _cabo=_sub?'RCA de sinal + elétrica':esc(r.cabo); const _obs=_sub?esc(r.obs||'Subwoofer: cabo RCA de sinal do amplificador + ponto de energia no local.'):esc(r.obs||''); return `<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Sonorização'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}${idCell(r.id)}<td>${esc(r.equip)}${_sub?' <span style="font-size:8px;background:#BE185D;color:#fff;padding:1px 4px;border-radius:6px;font-weight:700">S+E</span>':''}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.zona)}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.saida_amplif)}</td><td style="font-size:10px${_sub?';font-weight:700;color:#BE185D':''}">${_cabo}</td><td style="font-size:10px;color:#D97706">${_obs}</td></tr>`}).join(''),
        ['#',...idHdr,'Equipamento','Ambiente','Zona','Tipo','Saída Amplif.','Cabo','Obs'])
      : ''

    // ── Tabela Devices no Teto (APs, Câmeras, Caixas de Som, Sensores) ────────
    const tblTeto = (d.tabela_teto||[]).length
      ? T((d.tabela_teto||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor(r.categoria||'Redes'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}${idCell(r.id)}<td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.instalacao)}</td><td style="font-family:monospace;font-size:10px">${esc(r.origem)}</td><td style="font-size:10px">${esc(r.cabo)}</td><td style="font-size:10px">${esc(r.metros)}m</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#',...idHdr,'Equipamento','Ambiente','Posição Teto','Vem de / Origem','Cabo','m','Obs'])
      : (d.modulos_teto||[]).length
        ? (d.modulos_teto||[]).map(mt=>`<h3 class="ex-amb">${esc(mt.ambiente)}</h3>${T((mt.itens||[]).map(it=>`<tr><td>${esc(it)}</td></tr>`).join(''),['Itens de teto / forro'])}`).join('')
        : ''

    // ── Seção de Itens no Teto (planta + tabela) ──────────────────────────────
    const tetoSyms = new Set(['tomada_teto','keystone_teto','ponto_som_teto'])
    // "Pontos aéreos" = tudo que é instalado no teto/forro: câmeras, APs, sensores, luzes,
    // som embutido e os pontos elétricos de teto. Usa o mesmo detector de local dos pins.
    const isTeto = m => mountOf(m)==='teto'
    const tetoMarkers = markers.filter(m=>isTeto(m) && !hideCats.has(equipType(m.name)))
    const tblTetoSec = tetoMarkers.length ? `
      <h3 class="ex-amb" style="margin-top:14px">Itens no Teto — tabela</h3>
      ${T(tetoMarkers.map(m=>{ const cab=(cables||[]).find(c=>!c.free&&(c.toUid===m.uid||c.fromUid===m.uid)); const mt=cab?cableMeters(cab):null
        const nm=((m.name||'')+' '+(m.code||'')).toLowerCase()
        const tipo=classifyEle(m)?.tipo || equipType(m.name) || '—'
        // Cabo pela FONTE ÚNICA (specDoPonto) + metragem quando existe cabo traçado. Antes esta
        // tabela derivava o cabo por conta própria e destoava do resto do documento: o sensor
        // saía "—" e o AP saía "CAT6 (PoE) · trace na planta" enquanto as outras diziam "CAT6 PoE".
        const cabo=(()=>{ const base=specDoPonto(m).cabo
          const ok = base && base!=='—' ? base : (cab ? cableFamily(cab.type||'dados').nome : '')
          if(!ok) return '—'
          return mt!=null ? `${ok} · ${mt}m` : ok })()
        return `<tr>${pinCell(m.id,m.code,m.n)}<td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td><td>${esc(m.name)}</td><td style="font-size:11px">${esc(m.room||'—')}</td><td style="font-size:11px">${esc(tipo)}</td><td style="font-size:10px">${cabo}</td><td style="font-size:10px;color:#D97706">${esc(m.note||'')}</td></tr>` }).join(''),
        ['Nº','ID','Item','Cômodo','Tipo','Cabo','Obs'])}
    ` : ''
    const plantaTeto = (bgImage && tetoMarkers.length) ? (() => {
      // UMA planta de teto por PAVIMENTO (com 1 andar sai igual a antes). Cada andar mostra só os
      // itens de teto e os cabos de teto daquele andar; andar sem item de teto é pulado.
      const plantas = plantasPorPav(v=>{
        const tm = v.mks.filter(m=>isTeto(m) && !hideCats.has(equipType(m.name)))
        if(!tm.length) return ''
        const dots=tm.map(m=>{
          const color=(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c
          const badgeFam=showCabo?cableFamiliesOf(m,familiaDoPontoTipo(m)):null
          return drawPin({label:_pinLabel(m),...m,mount:'teto'},{size:20,color,idLabel:showIdsPdf?esc(m.id||m.code||''):'',badgeFam})
        }).join('')
        const cabosLinha=(v.cbs||[]).filter(c=>!c.free&&tm.some(m=>m.uid===c.fromUid||m.uid===c.toUid)).map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''; return `<path d="${pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')}" fill="none" stroke="${c.color||'#0891B2'}" stroke-dasharray="4,2.5" vector-effect="non-scaling-stroke" style="stroke-width:2px"/>`}).join('')
        return `<div class="ex-plant" style="border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;margin-bottom:10px">
          <img src="${v.bg}" style="filter:grayscale(0.4)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${cabosLinha}</svg>${dots}
        </div>`
      })
      return `<div class="ex-sec ex-breakable"><h2>Planta — Itens no Teto</h2>
        <p class="ex-p" style="margin-bottom:8px">Pontos aéreos (teto/forro): câmeras, access points, sensores, luzes, som embutido e pontos elétricos de teto. Cabos em tracejado passam pelo forro.</p>
        ${plantas}${tblTetoSec}</div>`
    })() : ''
    const mComObs = markers.filter(m=>m.note&&m.note.trim())
    const tblObservacoes = mComObs.length ? T(mComObs.map(m=>`<tr>
      ${pinCell(m.id,m.code,m.n)}
      <td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td>
      <td>${esc(m.name)}</td>
      <td style="font-size:11px">${esc(m.room||'—')}</td>
      <td style="color:#D97706;font-weight:500">${esc(m.note)}</td>
    </tr>`).join(''),['Nº','ID','Item','Cômodo','Observação']) : ''
    const gestaoTxt=`
<p class="ex-p">A RARO Home entrega uma solução completa de gestão inteligente. Abaixo, as principais interfaces de controle disponíveis após a instalação.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0">

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#0EA5E9;display:flex;align-items:center;justify-content:center;font-size:12px">📶</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Rede Wi-Fi e APs — App UniFi</span>
    </div>
    <div style="background:#EBF4FF;height:100px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#EBF4FF"/>
        <rect x="6" y="6" width="76" height="88" rx="5" fill="#fff" stroke="#CBD5E1" stroke-width=".8"/>
        <rect x="6" y="6" width="76" height="16" rx="5" fill="#0D1420"/>
        <text x="44" y="17" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">UniFi Network</text>
        <circle cx="30" cy="52" r="14" fill="#0EA5E920"/><circle cx="30" cy="52" r="7" fill="#0EA5E9"/><text x="30" y="74" font-size="5.5" fill="#0369A1" text-anchor="middle" font-family="sans-serif">AP-Sala</text>
        <circle cx="66" cy="52" r="14" fill="#16A34A20"/><circle cx="66" cy="52" r="7" fill="#16A34A"/><text x="66" y="74" font-size="5.5" fill="#166534" text-anchor="middle" font-family="sans-serif">AP-Quarto</text>
        <rect x="90" y="6" width="164" height="88" rx="5" fill="#fff" stroke="#CBD5E1" stroke-width=".8"/>
        <rect x="90" y="6" width="164" height="16" rx="5" fill="#0D1420"/>
        <text x="172" y="17" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">Velocidade · Clientes · Status</text>
        <rect x="98" y="28" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="28" width="110" height="9" rx="2" fill="#0EA5E9"/><text x="250" y="35.5" font-size="5" fill="#0369A1" font-family="sans-serif">AP-Sala</text>
        <rect x="98" y="42" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="42" width="95" height="9" rx="2" fill="#16A34A"/><text x="197" y="49.5" font-size="5" fill="#166534" font-family="sans-serif">AP-Quarto</text>
        <rect x="98" y="56" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="56" width="130" height="9" rx="2" fill="#7C3AED"/><text x="232" y="63.5" font-size="5" fill="#4C1D95" font-family="sans-serif">AP-Ext</text>
        <rect x="98" y="72" width="148" height="14" rx="3" fill="#F1F5F9"/>
        <text x="172" y="82" font-size="6" fill="#374151" text-anchor="middle" font-family="sans-serif">3 APs · 28 clientes conectados · 500Mbps</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Gestão completa da rede</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Status APs · Cobertura por cômodo · Velocidade · App iOS e Android</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#7C3AED;display:flex;align-items:center;justify-content:center;font-size:12px">📱</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Automação — App RARO Home</span>
    </div>
    <div style="background:#F5F0FF;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#F5F0FF"/>
        <rect x="6" y="6" width="58" height="88" rx="8" fill="#0D1420" stroke="#1E293B" stroke-width=".8"/>
        <rect x="9" y="16" width="52" height="70" rx="2" fill="#1E293B"/>
        <rect x="9" y="16" width="52" height="11" fill="#2D1B69"/>
        <text x="35" y="24.5" font-size="5.5" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">RARO Home</text>
        <rect x="12" y="30" width="21" height="15" rx="2" fill="#05966950"/><text x="22.5" y="40.5" font-size="5" fill="#A7F3D0" text-anchor="middle" font-family="sans-serif">Sala ON</text>
        <rect x="37" y="30" width="21" height="15" rx="2" fill="#37415150"/><text x="47.5" y="40.5" font-size="5" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Qt OFF</text>
        <rect x="12" y="49" width="46" height="10" rx="2" fill="#1D4ED850"/><text x="35" y="57" font-size="5" fill="#BFDBFE" text-anchor="middle" font-family="sans-serif">▶ Modo Cinema</text>
        <rect x="12" y="63" width="21" height="16" rx="2" fill="#D9780650"/><text x="22.5" y="73.5" font-size="5" fill="#FDE68A" text-anchor="middle" font-family="sans-serif">Cort 75%</text>
        <rect x="37" y="63" width="21" height="16" rx="2" fill="#0891B250"/><text x="47.5" y="73.5" font-size="5" fill="#BAE6FD" text-anchor="middle" font-family="sans-serif">AC 22°</text>
        <rect x="76" y="6" width="178" height="88" rx="5" fill="#fff" stroke="#DDD6FE" stroke-width=".8"/>
        <rect x="76" y="6" width="178" height="14" rx="5" fill="#4C1D95"/>
        <text x="165" y="16" font-size="6" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">Cenas · Horários · Automações</text>
        <rect x="84" y="24" width="40" height="18" rx="3" fill="#FEF3C7" stroke="#E2E8F0" stroke-width=".5"/><text x="104" y="35.5" font-size="6.5" fill="#92400E" text-anchor="middle" font-family="sans-serif">Bom dia ☀</text>
        <rect x="130" y="24" width="40" height="18" rx="3" fill="#1E1B4B" stroke="#E2E8F0" stroke-width=".5"/><text x="150" y="35.5" font-size="6.5" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">Cinema 🎬</text>
        <rect x="176" y="24" width="40" height="18" rx="3" fill="#FFF7ED" stroke="#E2E8F0" stroke-width=".5"/><text x="196" y="35.5" font-size="6.5" fill="#9A3412" text-anchor="middle" font-family="sans-serif">Jantar 🍷</text>
        <rect x="84" y="48" width="132" height="18" rx="3" fill="#F0FDF4" stroke="#BBF7D0" stroke-width=".5"/>
        <text x="150" y="57" font-size="5.5" fill="#374151" text-anchor="middle" font-family="sans-serif">Automação ativa: presença detectada → luz liga</text>
        <text x="150" y="64" font-size="5" fill="#64748B" text-anchor="middle" font-family="sans-serif">Sensor mmWave · Banheiro Master · Online</text>
        <rect x="84" y="72" width="132" height="14" rx="3" fill="#EFF6FF" stroke="#BFDBFE" stroke-width=".5"/>
        <text x="150" y="81" font-size="5.5" fill="#1D4ED8" text-anchor="middle" font-family="sans-serif">⚡ 24 dispositivos pareados · Todos online</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Controle total no smartphone</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Cenas · Automações · Cortinas · AC · Keypads · iOS e Android</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#DC2626;display:flex;align-items:center;justify-content:center;font-size:12px">📷</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Câmeras — UniFi Protect</span>
    </div>
    <div style="background:#1C1917;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#1C1917"/>
        <rect x="6" y="6" width="56" height="42" rx="3" fill="#292524"/><rect x="8" y="8" width="52" height="30" fill="#111"/><text x="34" y="26" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Entrada</text><rect x="8" y="8" width="16" height="6" rx="1" fill="#DC2626"/><text x="16" y="12.5" font-size="4" fill="#fff" text-anchor="middle" font-family="sans-serif">AO VIVO</text>
        <rect x="6" y="52" width="56" height="42" rx="3" fill="#292524"/><text x="34" y="76" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Garagem</text>
        <rect x="68" y="6" width="56" height="42" rx="3" fill="#292524"/><rect x="70" y="8" width="52" height="30" fill="#0A0A0A"/><circle cx="96" cy="23" r="7" fill="#37415130"/><text x="96" y="26.5" font-size="6.5" fill="#9CA3AF" text-anchor="middle" font-family="sans-serif">🌙</text><text x="96" y="40" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Gourmet</text>
        <rect x="68" y="52" width="56" height="42" rx="3" fill="#292524"/><text x="96" y="76" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Piscina</text>
        <rect x="134" y="6" width="120" height="88" rx="4" fill="#0D1117"/>
        <text x="194" y="18" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">Linha do Tempo</text>
        <rect x="140" y="22" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="22" width="55" height="10" rx="2" fill="#DC262630"/><text x="144" y="30" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Entrada 07:14</text>
        <rect x="140" y="36" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="36" width="82" height="10" rx="2" fill="#DC262630"/><text x="144" y="44" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Garagem 07:32</text>
        <rect x="140" y="50" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="50" width="38" height="10" rx="2" fill="#DC262630"/><text x="144" y="58" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Gourmet 18:45</text>
        <rect x="140" y="64" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="64" width="70" height="10" rx="2" fill="#DC262630"/><text x="144" y="72" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Entrada 23:02</text>
        <rect x="140" y="78" width="108" height="10" rx="2" fill="#0D1117" stroke="#374151" stroke-width=".5"/>
        <text x="194" y="86" font-size="5.5" fill="#64748B" text-anchor="middle" font-family="sans-serif">Gravação contínua 24h · 30 dias</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Monitoramento via Dream Machine SE</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Ao vivo · Gravação 24h · Linha do tempo · UniFi Protect</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#059669;display:flex;align-items:center;justify-content:center;font-size:12px">⚡</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Automação Zigbee — Ecossistema</span>
    </div>
    <div style="background:#F0FDF4;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#F0FDF4"/>
        <rect x="100" y="36" width="60" height="28" rx="5" fill="#059669"/>
        <text x="130" y="48" font-size="6.5" fill="#fff" text-anchor="middle" font-family="sans-serif" font-weight="bold">Gateway</text>
        <text x="130" y="57" font-size="5.5" fill="#A7F3D0" text-anchor="middle" font-family="sans-serif">Zigbee 3.0</text>
        <line x1="22" y1="22" x2="100" y2="50" stroke="#0EA5E9" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="6" y="14" width="36" height="16" rx="3" fill="#0EA5E920" stroke="#0EA5E9" stroke-width=".8"/><text x="24" y="24.5" font-size="5.5" fill="#0EA5E9" text-anchor="middle" font-family="sans-serif">Keypad</text>
        <line x1="218" y1="22" x2="160" y2="50" stroke="#0EA5E9" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="218" y="14" width="36" height="16" rx="3" fill="#0EA5E920" stroke="#0EA5E9" stroke-width=".8"/><text x="236" y="24.5" font-size="5.5" fill="#0EA5E9" text-anchor="middle" font-family="sans-serif">Keypad</text>
        <line x1="14" y1="72" x2="100" y2="60" stroke="#16A34A" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="6" y="68" width="36" height="16" rx="3" fill="#16A34A20" stroke="#16A34A" stroke-width=".8"/><text x="24" y="78.5" font-size="5.5" fill="#16A34A" text-anchor="middle" font-family="sans-serif">Sensor</text>
        <line x1="240" y1="72" x2="160" y2="60" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="218" y="68" width="36" height="16" rx="3" fill="#7C3AED20" stroke="#7C3AED" stroke-width=".8"/><text x="236" y="78.5" font-size="5.5" fill="#7C3AED" text-anchor="middle" font-family="sans-serif">Módulo</text>
        <line x1="95" y1="88" x2="115" y2="64" stroke="#D97706" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="76" y="82" width="36" height="14" rx="3" fill="#D9780620" stroke="#D97706" stroke-width=".8"/><text x="94" y="91.5" font-size="5.5" fill="#D97706" text-anchor="middle" font-family="sans-serif">Hub IR</text>
        <line x1="168" y1="88" x2="148" y2="64" stroke="#0891B2" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="150" y="82" width="36" height="14" rx="3" fill="#0891B220" stroke="#0891B2" stroke-width=".8"/><text x="168" y="91.5" font-size="5.5" fill="#0891B2" text-anchor="middle" font-family="sans-serif">Tomada</text>
        <rect x="6" y="4" width="248" height="8" rx="2" fill="#DCFCE7"/>
        <text x="130" y="10.5" font-size="5.5" fill="#166534" text-anchor="middle" font-family="sans-serif">Todos os dispositivos online · Latência &lt;20ms · Matter-ready</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Ecossistema Zigbee centralizado</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Keypads · Sensores · Módulos · Hub IR · Tomadas · Matter-ready</div>
    </div>
  </div>

</div>
<p class="ex-p" style="font-size:9px;color:#64748B;font-style:italic">Todos os sistemas são gerenciados remotamente pelo smartphone. A RARO Home realiza configuração completa e treinamento na entrega.</p>
`

    // ── Cabos elétricos consolidado por marcador ──────────────────────────────
    const allEletMarkers = markers.filter(m=>{
      const n=(m.name||'').toLowerCase()
      return n.includes('keypad')||n.includes('interruptor')||n.includes('módulo')||n.includes('tomada')||n.includes('cortina')||n.includes('hub ir')
    })
    const cabosEletConsolidado = allEletMarkers.length
      ? T(allEletMarkers.map(m=>`<tr><td>${pin(m.n,undefined,m)}</td><td style="font-family:monospace;font-size:10px;font-weight:700">${esc(m.id||m.code||'—')}</td><td>${esc(m.name)}</td><td>${esc(m.room||'—')}</td><td style="font-size:10px">${(m.name||'').toLowerCase().includes('keypad')||(m.name||'').toLowerCase().includes('interruptor')?'Fase + Neutro + Terra':'Fase + Neutro'}</td><td style="font-family:monospace;font-size:10px">2,5mm²</td><td style="font-size:10px">${(m.name||'').toLowerCase().includes('keypad')||(m.name||'').toLowerCase().includes('interruptor')?'QDL — disj. dedicado':'Ponto mais próximo'}</td><td style="font-size:9.5px;color:#D97706">${esc(m.note||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Alimentação','Bitola','Origem','Obs'])
      : ''

    // ══════════════════════════════════════════════════════════════════
    // VERSÃO OBRA / PEDREIRO — só infraestrutura para quem executa:
    // planta com caminho dos cabos · tabela origem→destino/metros/tipo ·
    // altura e orientação de cada ponto · eletrodutos e caixas 4×4 por parede.
    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    // VERSÃO ELÉTRICA — documento separado: planta elétrica (NBR 5444),
    // cobertura Wi-Fi (mapa de calor, opcional) e quadro de cargas.
    // ══════════════════════════════════════════════════════════════════
    if (mode==='conduites') {
      // RELATÓRIO DE CONDUÍTES — uma planta por tipo (dados/som/elétrica) + uma com todos.
      if(!bgImage) return `<div class="ex-sec"><p class="ex-p" style="color:#B45309">Carregue a planta e trace os conduítes no editor.</p></div>`
      const ratio=imgRatio||0.66
      // agrupa por "família" de conduíte: usa o tipo do cabo; conduite_* e os tipos normais entram
      const fam = c => {
        const t=c.type||'dados'
        if(t==='conduite_eletrica'||String(t||'').startsWith('eletrica')) return 'Elétrica'
        if(t==='som') return 'Som'
        if(t==='conduite_dados'||t==='dados'||t==='ap'||t==='camera'||t==='uplink'||t==='hdmi'||t==='fibra') return 'Redes'
        return 'Redes'
      }
      const famColor = { 'Elétrica':'#EAB308','Som':'#BE185D','Redes':'#1E3A8A' }
      // caixas de conduíte na planta
      const caixasConduite = markers.filter(m=>classifyEle(m)?.sym==='caixa_conduite')
      // mapa: chave do conduíte → cabos que estão dentro
      const conduitesFree = (cables||[]).filter(c=>c.free)
      const chaveConduite = c => c.conduiteId || (c.label||'').trim() || c._chave || c.id
      const cabosNoConduite = (cables||[]).filter(c=>!c.free && c.conduite)
      // match: cabo.conduite bate em qualquer variante de chave do conduíte
      const cabosDoConduite = cond => cabosNoConduite.filter(c=>
        c.conduite===chaveConduite(cond) || c.conduite===cond.id || c.conduite===(cond.label||'').trim() || (cond._chave&&c.conduite===cond._chave)
      )
      // itens cujos cabos estão em algum conduíte
      const itensComConduite = new Set()
      cabosNoConduite.forEach(c=>{ if(c.fromUid)itensComConduite.add(c.fromUid); if(c.toUid)itensComConduite.add(c.toUid) })
      // itens sem conduíte (têm cabo traçado mas não estão em nenhum conduíte)
      const todosItensComCabo = new Set(); (cables||[]).filter(c=>!c.free).forEach(c=>{todosItensComCabo.add(c.fromUid);todosItensComCabo.add(c.toUid)})
      const itensSemConduite = markers.filter(m=>todosItensComCabo.has(m.uid)&&!itensComConduite.has(m.uid)&&!isRackItem(m.name,m.code)&&classifyEle(m)?.sym!=='caixa_conduite'&&classifyEle(m)?.sym!=='prumada')

      // ── PLANTA: só conduítes livres + caixas + itens que têm cabos em conduítes ──
      const desenhaPlanta = (conduites, corLinha)=>{
        const condIds = new Set(conduites.map(c=>c.id).filter(Boolean))
        // UMA planta por PAVIMENTO (com 1 andar sai igual a antes) — cada andar mostra só os
        // conduítes desta família que estão nele (floorId do conduíte, via v.cbs).
        return plantasPorPav(v=>{
          const conds = v.cbs.filter(c=> c.free && (conduites.includes(c) || (c.id && condIds.has(c.id))) )
          if(!conds.length) return ''
          // cabos (não-livres) que estão dentro destes conduítes, restritos ao andar
          const cabosNoCondV = (v.cbs||[]).filter(c=>!c.free && c.conduite)
          const cabosNaFam = cabosNoCondV.filter(c=>conds.some(cond=>
            c.conduite===chaveConduite(cond)||c.conduite===cond.id||c.conduite===(cond.label||'').trim()||(cond._chave&&c.conduite===cond._chave)
          ))
          const uidsNaFam = new Set(); cabosNaFam.forEach(c=>{uidsNaFam.add(c.fromUid);uidsNaFam.add(c.toUid)})
          // pins de itens: só quem tem cabo nesta família de conduítes
          const itemDots = v.mks.filter(m=>uidsNaFam.has(m.uid)||isRackItem(m.name,m.code)).map(m=>{
            const isR=isRackItem(m.name||'',m.code||'')
            if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
              <div style="width:16px;height:16px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
            </div>`
            return drawPin(m,{label:_pinLabel(m),size:16,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c})
          }).join('')
          // caixas (do andar)
          const caixaDots = v.mks.filter(m=>classifyEle(m)?.sym==='caixa_conduite').map(m=>`
            <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
              <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
              ${m.n?`<div style="position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:6.5px;color:#1E3A8A;white-space:nowrap">#${m.n}</div>`:''}
            </div>`).join('')
          // só linhas dos conduítes livres (sem os cabos normais)
          const lines = conds.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            const col = c.color||CABLE_PALETTE[c.type]||corLinha
            const dashP=({teto:'',piso:'4,2',parede:'2,2'})[c.passagem||'parede']
            return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" ${dashP?`stroke-dasharray="${dashP}"`:''} style="stroke-width:5px" vector-effect="non-scaling-stroke"/>`}).join('')
          const condLabels = hideCondIds ? '' : conds.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            const idLabel=c.conduiteId||(c.label?c.label.slice(0,8):''); if(!idLabel)return''
            // rótulo no ponto do conduíte mais longe de qualquer pino (não cobre item)
            const cand=[]
            for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]
              cand.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2},{x:a.x*0.75+b.x*0.25,y:a.y*0.75+b.y*0.25},{x:a.x*0.25+b.x*0.75,y:a.y*0.25+b.y*0.75}) }
            const d2=(p,m)=>{const dx=p.x-m.x,dy=p.y-m.y;return dx*dx+dy*dy}
            let mid=cand[0]||pts[Math.floor(pts.length/2)], bestD=-1
            cand.forEach(p=>{ let mn=Infinity; v.mks.forEach(m=>{ const d=d2(p,m); if(d<mn)mn=d }); if(mn>bestD){bestD=mn;mid=p} })
            return `<div style="position:absolute;left:${mid.x}%;top:${mid.y}%;transform:translate(-50%,-50%);z-index:6;background:${c.color||col};color:#fff;font-size:9px;font-weight:800;font-family:monospace;padding:1px 5px;border-radius:7px;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 0 0 1.5px rgba(0,0,0,0.18)">${esc(idLabel)}</div>`}).join('')
          return `<div class="ex-plant-fig" style="position:relative;width:100%;padding-bottom:${(((v.ratio||ratio))*100).toFixed(1)}%;border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;margin-top:8px">
            <img src="${v.bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:grayscale(0.4)"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${lines}</svg>${itemDots}${caixaDots}${condLabels}
          </div>`
        })
      }
      // ── TABELA por conduíte: lista os cabos dentro ──
      const tabela = conduites => {
        if(!conduites.length) return ''
        const rows = conduites.map(cond=>{
          const chave = chaveConduite(cond)
          const cabos = cabosDoConduite(cond)
          const mt = cableMeters(cond); const mtTxt = mt?Math.round(mt)+'m':'—'
          const n = cabos.length
          const bitola = cond.diametro || (n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"')
          const cabosHtml = cabos.map(c=>{ const a=markers.find(m=>m.uid===c.fromUid), b=markers.find(m=>m.uid===c.toUid)
            return `<div style="display:flex;align-items:center;gap:4px;margin-top:3px">
              <span style="width:6px;height:6px;border-radius:50%;background:${c.color||'#888'};flex-shrink:0"></span>
              <span style="font-size:9px;color:#475569">${CABLE_LABELS[c.type]||c.type}: <b>#${a?.n||'?'} ${esc(a?.name||'?')}</b> → <b>#${b?.n||'?'} ${esc(b?.name||'?')}</b></span>
            </div>` }).join('')
          const itensHtml = [...new Set(cabos.flatMap(c=>[c.fromUid,c.toUid]))].map(uid=>{ const m=markers.find(x=>x.uid===uid); return m?`#${m.n} ${esc(m.name)}`:'?' }).join(', ')
          return `<tr>
            <td style="vertical-align:top">
              <span style="font-family:monospace;font-weight:800;color:#0369A1;font-size:12px">${esc(cond.conduiteId||'—')}</span>
              ${cond.label?`<span style="font-size:10px;color:#64748B;margin-left:6px">${esc(cond.label)}</span>`:''}
              ${cabosHtml||'<div style="font-size:9px;color:#94A3B8;margin-top:2px">Nenhum cabo atribuído</div>'}
            </td>
            <td style="text-align:center;vertical-align:top;font-weight:700">${cond.diametro || (n>0?bitola:'—')}</td>
            <td style="text-align:right;vertical-align:top">${mtTxt}</td>
            <td style="font-size:9.5px;color:#D97706;vertical-align:top">${esc(cond.obs||'')}</td>
          </tr>`
        }).join('')
        return T(rows,['Conduíte / Cabos dentro','Eletroduto','Metros','Obs'])
      }
      // ── TABELA DE ITENS SEM CONDUÍTE ──
      const tabelaSemConduite = itensSemConduite.length ? `
        <div class="ex-obra-page" style="page-break-before:always">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #DC2626;padding-bottom:8px;margin-bottom:14px">
            <div style="width:30px;height:30px;border-radius:8px;background:#DC2626;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">⚠</div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">Itens sem conduíte (${itensSemConduite.length})</div>
            <div style="font-size:12px;color:#64748B">Cabos traçados mas ainda não atribuídos a nenhum conduíte.</div></div>
          </div>
          ${T(itensSemConduite.map(m=>{const cat=inferCategory(m.name||'').cat||'—'
            return `<tr>
              <td style="text-align:center">${pin(m.n,undefined,m)}</td>
              <td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td>
              <td>${esc(m.name)}</td>
              <td>${esc(m.room||'—')}</td>
              <td style="font-size:10px;color:#0369A1">${esc(cat)}</td>
            </tr>`}).join(''),['Nº','ID','Item','Cômodo','Categoria'])}
        </div>` : ''
      const tabelaCaixas = caixasConduite.length ? `
        <h3 class="ex-amb" style="color:#1E3A8A;margin-top:16px">Caixas de Conduíte</h3>
        ${T(caixasConduite.map(m=>`<tr><td style="text-align:center">${pin(m.n,undefined,m)}</td><td><b>${esc(m.id||m.code||'CX')}</b></td><td>${esc(m.room||'—')}</td><td style="font-size:11px">${esc(m.note||'')}</td></tr>`).join(''),['Nº','ID','Cômodo','Observação'])}` : ''

      // agrupa conduítes livres por família
      const porFam={}; conduitesFree.forEach(c=>{ const f=fam(c); (porFam[f]=porFam[f]||[]).push(c) })
      const paginas = Object.entries(porFam).map(([f,arr],i)=>`
        <div class="ex-obra-page" style="page-break-before:${i===0?'auto':'always'}">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid ${famColor[f]};padding-bottom:8px;margin-bottom:6px">
            <div style="width:30px;height:30px;border-radius:8px;background:${famColor[f]};display:flex;align-items:center;justify-content:center"><span style="width:18px;height:5px;background:#fff;border-radius:3px"></span></div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">Conduítes — ${f}</div>
            <div style="font-size:12px;color:#64748B">${arr.length} conduíte(s)</div></div>
          </div>
          ${desenhaPlanta(arr, famColor[f])}
          <h3 class="ex-amb" style="color:${famColor[f]};margin-top:14px">Relação de Conduítes — ${f}</h3>
          ${tabela(arr)}
          ${tabelaCaixas}
        </div>`).join('')
      // página de prumadas (descidas entre pavimentos)
      const prumadas = markers.filter(m=>classifyEle(m)?.sym==='prumada')
      const paginaPrumadas = prumadas.length ? `
        <div class="ex-obra-page" style="page-break-before:always">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #7C3AED;padding-bottom:8px;margin-bottom:6px">
            <div style="width:30px;height:30px;border-radius:8px;background:#7C3AED;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">⇵</div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">Prumadas — descidas entre pavimentos</div>
            <div style="font-size:12px;color:#64748B">${prumadas.length} prumada(s)</div></div>
          </div>
          ${(()=>{ // agrupa por código do par; prumadas sem código entram isoladas
            const grupos={}; prumadas.forEach(p=>{ const k=(p.prumadaCode||'').trim()||('#'+p.n); (grupos[k]=grupos[k]||[]).push(p) })
            return T(Object.entries(grupos).map(([cod,gr])=>{
              const uids=new Set(gr.map(p=>p.uid))
              const ligados=(cables||[]).filter(c=>!c.free && (uids.has(c.fromUid)||uids.has(c.toUid)))
              const n=ligados.length, bitola=n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"'
              const tipos=[...new Set(ligados.map(c=>CABLE_LABELS[c.type]||c.type))].join(', ')||'—'
              const alt=gr.map(p=>parseFloat(p.prumadaAltura)||0).find(v=>v>0)||0
              const lbl=gr.map(p=>p.prumadaPav).filter(Boolean)[0]||gr.map(p=>p.room).filter(Boolean).join(' ↔ ')||'—'
              const andares=gr.length
              return `<tr><td style="text-align:center"><b>${esc(cod)}</b></td><td>${esc(lbl)}${andares>1?` <span style="color:#16A34A;font-size:9px">(par ✓)</span>`:` <span style="color:#F59E0B;font-size:9px">(sozinha)</span>`}</td><td style="text-align:center">${alt?alt+'m':'—'}</td><td style="text-align:center">${n}</td><td style="font-size:11px">${esc(tipos)}</td><td style="text-align:center;font-weight:700">${n?bitola:'—'}</td></tr>`
            }).join(''),['Par','Liga andares','Altura','Nº cabos','Tipos','Eletroduto vertical'])
          })()}
          <p class="ex-p" style="font-size:10px;color:#64748B;margin-top:6px">Prumadas com o mesmo código são o mesmo furo em andares diferentes (par). A altura é somada uma vez por par na metragem dos cabos que passam por ele.</p>
        </div>` : ''
      const paginaTodos = conduitesFree.length>1 ? `
        <div class="ex-obra-page" style="page-break-before:always">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #0D1420;padding-bottom:8px;margin-bottom:6px">
            <div style="width:30px;height:30px;border-radius:8px;background:#0D1420;display:flex;align-items:center;justify-content:center"><i class="ti ti-stack-2" style="color:#fff"></i></div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">Todos os Conduítes</div>
            <div style="font-size:12px;color:#64748B">${conduitesFree.length} conduíte(s) — visão geral</div></div>
          </div>
          ${desenhaPlanta(conduitesFree,'#0D1420')}
        </div>` : ''
      const corpo = (Object.keys(porFam).length?paginas:`<p class="ex-p" style="color:#B45309">Nenhum conduíte/cabo traçado. Use o modo "Cabos" no editor.</p>`)
      return `<div class="ex-sec" style="border:none"><h2 style="border:none;margin-bottom:4px">Relatório de Conduítes</h2>
        <p class="ex-p" style="color:#6B7280">Caminhos de eletrodutos por família (Dados, Som, Elétrica) e uma visão com todos juntos. Para o pedreiro saber onde passar cada conduíte.</p></div>
        ${corpo}${paginaPrumadas}${paginaTodos}${tabelaSemConduite}</div>`
    }
    if (mode==='eletrica') {
      let _ne=0
      const hasQuadro = markers.some(m=>classifyEle(m)?.sym==='quadro')
      const eleMarks = markers.filter(isPontoEletrico)
      const ELETR = new Set(['eletrica','conduite_eletrica'])
      const cabosEle = cablesUnificados(cables, markers).filter(c=>!c.free && ELETR.has(c.type||''))
      // tabela de fios elétricos (cabos elétricos desenhados) origem→destino
      const tblFios = cabosEle.length ? (()=>{
        const rows=cabosEle.map(c=>{ const f=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid); const mt=cableMeters(c)
          const sp=CABLE_SPEC[c.type]||{spec:'3×1,5mm²'}
          return `<tr>${pinCell(to?.id,to?.code,to?.n)}<td>${f?`<b>#${f.n}</b> ${esc(f.name)}`:'Quadro'}</td><td>${to?`<b>#${to.n}</b> ${esc(to.name)}`:'—'}${c._via?` <span style="font-size:9px;color:#7C3AED;font-weight:600">· ${esc(c._via)}</span>`:''}</td><td style="font-size:11px">${esc(to?.room||'—')}</td><td style="font-size:11px">${esc(sp.spec)}</td><td style="text-align:right;font-weight:700">${mt!=null?mt+'m':'—'}</td></tr>` }).join('')
        const totM=cabosEle.reduce((s,c)=>s+(cableMeters(c)||0),0)
        return `<h3 class="ex-amb" style="color:#16A34A">Fios elétricos traçados${totM>0?` · total ~${Math.round(totM)}m`:''}</h3>${T(rows,['Nº','Origem','Destino','Cômodo','Bitola','Metros'])}`
      })() : ''
      const avisoQuadro = !hasQuadro && eleMarks.length
        ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#92400E;margin:10px 0"><b>⚠ Falta posicionar o Quadro de Distribuição (QDL) na planta.</b><br>Volte ao editor, use o atalho elétrico <b>"Quadro QDL"</b> e posicione o quadro. Os fios partem dele.</div>`
        : ''
      const eleSecs = [
        `<div class="ex-sec" style="border:none"><h2 style="border:none;margin-bottom:4px">Planta Elétrica — ABNT NBR 5444</h2>
          <p class="ex-p" style="color:#6B7280">Apenas pontos que usam elétrica (tomadas, interruptores, luz, quadro) e os fios elétricos traçados. Paredes consideradas de concreto.</p></div>`,
        avisoQuadro,
        buildPlantaEletrica(()=>++_ne),
        tblFios,
      ].filter(Boolean)
      const eleBody = eleSecs.join('\n')
      const semEle = !bgImage || !eleMarks.length
      return eleBody + (semEle?`<div class="ex-sec"><p class="ex-p" style="color:#B45309">Adicione pontos elétricos (tomadas, interruptores, luz, QDL) na planta para gerar este documento.</p></div>`:'') + '</div>'
    }

    if (isObra) {
      // PROJETO DE OBRA — uma PÁGINA por categoria de cabo (formato impressora grande/A3).
      // NADA de elétrica aqui (vai tudo na Planta Elétrica). Conduítes de DADOS entram.
      const ELETR = new Set(['eletrica','conduite_eletrica'])
      const usados = (cables||[]).filter(c=>!ELETR.has(c.type||'') && !c.free)
      const byType={}
      usados.forEach(c=>{ const t=c.type||'dados'; (byType[t]=byType[t]||[]).push(c) })
      const ordem=['dados','ap','camera','uplink','hdmi','som','conduite_dados']
      const tipos = Object.keys(byType).filter(t=>!hideFams.has(t)).sort((a,b)=>(ordem.indexOf(a)+99)-(ordem.indexOf(b)+99))

      // ── classificadores precisos de itens por família ──
      const lc = s => (s||'').toLowerCase()
      const isItemDaFamilia = (m, t) => {
        const n = lc(m.name||'')+' '+lc(m.code||'')
        if(t==='ap')     return /access.?point|\bap\b|wi.?fi|u6|u7|unifi.*ap|ap.*unifi|lite.*ap|nano.*ap/.test(n) && !/câmera|camera|keystone|ks|cat6.*ks/.test(n)
        if(t==='camera') return /câmera|camera|dome|bullet|nvr|gravad/.test(n) && !/access.?point|\bap\b/.test(n)
        if(t==='som')    return /\bsom\b|caixa.*som|speaker|amplif|receiver|subwoofer/.test(n)
        if(t==='uplink') return /uplink|fibra|onu|ont|modem/.test(n)
        if(t==='hdmi')   return /hdmi|matrix|extensor|projetor/.test(n)
        if(t==='dados')  return /keystone|patch|cat6|cat 6|tomada.*rede|rede.*tomada/.test(n)
        return false // tipos genéricos: não filtra por item específico
      }

      // ── planta de TODOS os itens (sem cabos/conduítes) ── igual ao relatório de conduítes
      const plantaGeralItens = bgImage ? (()=>{
        // todos os itens do projeto/proposta posicionados na planta, sem nenhum filtro
        const _dotsDe = mks => mks.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{
          const isR=isRackItem(m.name||'',m.code||'')
          const isCx=classifyEle(m)?.sym==='caixa_conduite'
          const isPrum=classifyEle(m)?.sym==='prumada'
          const idLabel=showIdsPdf?esc(m.id||m.code||''):''
          if(isR||isCx||isPrum){
            const bg=isR?'#4C1D95':isCx?'#1E3A8A':'#7C3AED'
            const label=isCx?'CX':isPrum?'⇵':'R'
            return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
              <div style="width:18px;height:18px;border-radius:${isCx?'2px':'50%'};background:${bg};color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff">${label}</div>
              <div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 3px;font-size:7px;white-space:nowrap;font-family:monospace;font-weight:600">${idLabel}</div>
            </div>`
          }
          const color=(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c
          const badgeFam=showCabo?cableFamiliesOf(m,familiaDoPontoTipo(m)):null
          return drawPin(m,{label:_pinLabel(m),size:18,color,idLabel,badgeFam})
        }).join('')
        // UMA planta por PAVIMENTO (com 1 andar sai igual a antes) — cada andar com seus itens.
        const plantas = plantasPorPav(v=>`<div class="ex-plant" style="margin-bottom:10px" data-mkuids="${v.mks.map(m=>m.uid).join(',')}">
          <img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>${_dotsDe(v.mks)}
        </div>`)
        return `${plantas}${showLegenda?legendaMestreHtml:''}`
      })() : ''

      // ── planta de CABOS de uma família (só itens dessa família + rack) ──
      const pagePlantaCabos = (t, arr, col)=>{
        if(!bgImage) return ''
        const condW = 2.4
        const ids = new Set(arr.map(c=>c.id).filter(Boolean))
        // UMA planta por PAVIMENTO (com 1 andar sai igual a antes). Cada andar mostra só os cabos
        // desta família QUE ESTÃO nele (via v.cbs — pontas no andar) + os itens ligados.
        return plantasPorPav(v=>{
          const arrF = v.cbs.filter(c=> !c.free && (arr.includes(c) || (c.id && ids.has(c.id))) )
          if(!arrF.length) return ''   // andar sem cabo desta família → pula
          const uids = new Set(); arrF.forEach(c=>{ uids.add(c.fromUid); uids.add(c.toUid) })
          // só itens da família + rack (não todos os itens da planta)
          const dots = v.mks.filter(m=> uids.has(m.uid)).map(m=>{
            const isR=isRackItem(m.name||'',m.code||'')
            if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
              <div style="width:20px;height:20px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
              ${showIdsPdf?`<div style="position:absolute;left:50%;top:22px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:8px;white-space:nowrap;font-family:monospace;font-weight:600">${esc(m.id||m.code||m.name||'')}</div>`:''}
            </div>`
            return drawPin(m,{label:_pinLabel(m),size:20,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c,idLabel:showIdsPdf?esc(m.id||m.code||m.name||''):''})
          }).join('')
          const lines = arrF.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:${condW}px" vector-effect="non-scaling-stroke"/>` }).join('')
          const uidList=v.mks.filter(m=>uids.has(m.uid)).map(m=>m.uid).join(',')
          return `<div class="ex-plant" style="margin-bottom:10px" data-mkuids="${uidList}">
            <img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${lines}</svg>${dots}
          </div>`
        })
      }

      // ── planta de CONDUÍTES de uma família ──
      const pagePlantaConduites = (conduites, col)=>{
        if(!bgImage || !conduites.length) return ''
        const condIds = new Set(conduites.map(c=>c.id).filter(Boolean))
        // UMA planta por PAVIMENTO (com 1 andar sai igual a antes). Cada andar mostra só os
        // conduítes desta família que estão nele (via floorId do conduíte, em v.cbs).
        return plantasPorPav(v=>{
          const conds = v.cbs.filter(c=> c.free && (conduites.includes(c) || (c.id && condIds.has(c.id))) )
          if(!conds.length) return ''
          const cabosNaoCond = (v.cbs||[]).filter(c=>!c.free && c.conduite && conds.some(cond=>
            c.conduite===(cond.conduiteId||(cond.label||'').trim()||cond.id)||c.conduite===cond.id||(cond._chave&&c.conduite===cond._chave)
          ))
          const uidsNaFam = new Set(); cabosNaoCond.forEach(c=>{uidsNaFam.add(c.fromUid);uidsNaFam.add(c.toUid)})
          const dots = v.mks.filter(m=>uidsNaFam.has(m.uid)||isRackItem(m.name,m.code)).map(m=>{
            const isR=isRackItem(m.name||'',m.code||'')
            if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
              <div style="width:18px;height:18px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
            </div>`
            return drawPin(m,{label:_pinLabel(m),size:18,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c})
          }).join('')
          const caixaDots = v.mks.filter(m=>classifyEle(m)?.sym==='caixa_conduite').map(m=>`
            <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
              <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
            </div>`).join('')
          const lines = conds.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            const dashP=({teto:'',piso:'4,2',parede:'2,2'})[c.passagem||'parede']
            return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" ${dashP?`stroke-dasharray="${dashP}"`:''} style="stroke-width:5px" vector-effect="non-scaling-stroke"/>`}).join('')
          const condLabels = hideCondIds ? '' : conds.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            const idLabel=c.conduiteId||(c.label||'').slice(0,6)||''; if(!idLabel)return''
            const cand=[]
            for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]
              cand.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2},{x:a.x*0.75+b.x*0.25,y:a.y*0.75+b.y*0.25},{x:a.x*0.25+b.x*0.75,y:a.y*0.25+b.y*0.75}) }
            const d2=(p,m)=>{const dx=p.x-m.x,dy=p.y-m.y;return dx*dx+dy*dy}
            let mid=cand[0]||pts[Math.floor(pts.length/2)], bestD=-1
            cand.forEach(p=>{ let mn=Infinity; v.mks.forEach(m=>{ const d=d2(p,m); if(d<mn)mn=d }); if(mn>bestD){bestD=mn;mid=p} })
            return `<div style="position:absolute;left:${mid.x}%;top:${mid.y}%;transform:translate(-50%,-50%);z-index:6;background:${c.color||col};color:#fff;font-size:9px;font-weight:800;font-family:monospace;padding:1px 5px;border-radius:7px;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 0 0 1.5px rgba(0,0,0,0.18)">${esc(idLabel)}</div>`}).join('')
          return `<div class="ex-plant" style="margin-bottom:10px">
            <img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px;filter:grayscale(0.3)"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${lines}</svg>${dots}${caixaDots}${condLabels}
          </div>`
        })
      }

      // ── planta COMPLETA (cabos + conduítes sobrepostos) ──
      const pagePlantaCompleta = (cabos, conduites, col, catFiltro)=>{
        if(!bgImage) return ''
        const cabosIds = new Set(cabos.map(c=>c.id).filter(Boolean))
        const condIds = new Set(conduites.map(c=>c.id).filter(Boolean))
        // UMA planta por PAVIMENTO (com 1 andar sai igual a antes) — cabos + conduítes do andar.
        return plantasPorPav(v=>{
          const cabosF = v.cbs.filter(c=> !c.free && (cabos.includes(c) || (c.id && cabosIds.has(c.id))) )
          const condsF = v.cbs.filter(c=> c.free && (conduites.includes(c) || (c.id && condIds.has(c.id))) )
          if(!cabosF.length && !condsF.length) return ''
          const uids = new Set(); cabosF.forEach(c=>{uids.add(c.fromUid);uids.add(c.toUid)})
          const dots = v.mks.filter(m=>isRackItem(m.name,m.code)||(uids.has(m.uid)&&(!catFiltro||equipType(m.name)===catFiltro))).map(m=>{
            const isR=isRackItem(m.name||'',m.code||'')
            if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
              <div style="width:20px;height:20px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
              ${showIdsPdf?`<div style="position:absolute;left:50%;top:22px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:8px;white-space:nowrap;font-family:monospace;font-weight:600">${esc(m.id||m.code||m.name||'')}</div>`:''}
            </div>`
            const badgeFam=showCabo?cableFamiliesOf(m,familiaDoPontoTipo(m)):null
            return drawPin(m,{label:_pinLabel(m),size:20,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c,idLabel:showIdsPdf?esc(m.id||m.code||m.name||''):'',badgeFam})
          }).join('')
          const caixaDots = v.mks.filter(m=>classifyEle(m)?.sym==='caixa_conduite').map(m=>`
            <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
              <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
            </div>`).join('')
          const linesCabos = cabosF.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:2px;opacity:0.8" vector-effect="non-scaling-stroke"/>`}).join('')
          const linesCond = condsF.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:5px;opacity:0.5" vector-effect="non-scaling-stroke"/>`}).join('')
          const condLabelsC = hideCondIds ? '' : condsF.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
            const idLabel=c.conduiteId||(c.label||'').slice(0,6)||''; if(!idLabel)return''
            // Posição do rótulo: ponto ao longo do conduíte MAIS LONGE de qualquer pino,
            // pra não carimbar em cima de um item (some na impressão). Rótulo 100% opaco.
            const cand=[]
            for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]
              cand.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2},{x:a.x*0.75+b.x*0.25,y:a.y*0.75+b.y*0.25},{x:a.x*0.25+b.x*0.75,y:a.y*0.25+b.y*0.75}) }
            const d2=(p,m)=>{const dx=p.x-m.x,dy=p.y-m.y;return dx*dx+dy*dy}
            let pos=cand[0]||pts[Math.floor(pts.length/2)], bestD=-1
            cand.forEach(p=>{ let mn=Infinity; v.mks.forEach(m=>{ const d=d2(p,m); if(d<mn)mn=d }); if(mn>bestD){bestD=mn;pos=p} })
            return `<div style="position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);z-index:6;background:${c.color||col};color:#fff;font-size:8.5px;font-weight:800;font-family:monospace;padding:1px 4px;border-radius:6px;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 0 0 1.5px rgba(0,0,0,0.18)">${esc(idLabel)}</div>`}).join('')
          return `<div class="ex-plant" style="margin-bottom:10px">
            <img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${linesCabos}${linesCond}</svg>${dots}${caixaDots}${condLabelsC}
          </div>`
        })
      }

      // ── uma página por família ──
      const conduitesMostrados = new Set()
      // deriva o trecho real (Rack -> Cômodo) a partir das pontas dos cabos dentro do conduíte
      const trechoCond = cabosD => {
        const ends=[]; cabosD.forEach(c=>{ if(c.fromUid)ends.push(c.fromUid); if(c.toUid)ends.push(c.toUid) })
        const uniq=[...new Set(ends)].map(uid=>markers.find(m=>m.uid===uid)).filter(Boolean)
        if(!uniq.length) return '—'
        const rk=uniq.find(m=>isRackItem(m.name,m.code))
        const dest=uniq.filter(m=>!isRackItem(m.name,m.code))
        const origem=rk?'Rack':(`#${uniq[0].n} ${uniq[0].name}`)
        const comodos=[...new Set(dest.map(m=>m.room).filter(Boolean))]
        const destTxt=comodos.length?comodos.join(', '):(dest.length?dest.map(m=>`#${m.n} ${m.name}`).join(', '):'—')
        return `${esc(origem)} → ${esc(destTxt)}`
      }
      const categoriaPaginas = tipos.map((t,idx)=>{
        const arr=byType[t], col=CABLE_PALETTE[t]||'#374151', lb=CABLE_LABELS[t]||t, sp=CABLE_SPEC[t]||{spec:'—',conector:'—'}
        // tabela de cabos com info útil: origem, destino, cômodo, spec, metros, conduíte
        const rows=arr.map(c=>{ const f=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid); const mt=cableMeters(c)
          return `<tr>
            ${pinCell(to?.id,to?.code,to?.n)}
            <td style="font-size:11px">${f?`<b>#${f.n}</b> ${esc(f.name)}`:'—'} <span style="color:#94A3B8">→</span> ${to?`<b>#${to.n}</b> ${esc(to.name)}`:'—'}</td>
            <td style="font-size:11px">${esc(to?.room||'—')}</td>
            <td style="font-size:10px;color:#475569">${esc(sp.spec)}</td>
            <td style="text-align:right;font-weight:700">${mtCel(mt,t)}</td>
            <td style="font-size:9.5px;color:#0369A1;font-family:monospace">${esc(c.conduite||'—')}</td>
          </tr>` }).join('')
        const totM=arr.reduce((s,c)=>s+(cableMeters(c)||0),0)
        // conduítes desta família
        const conduitesFamilia = hidePdfConduites ? [] : (cables||[]).filter(c2=>{
          if(!c2.free) return false
          const chave = c2.conduiteId||(c2.label||'').trim()||c2._chave||c2.id
          return arr.some(cabo=>cabo.conduite && (cabo.conduite===chave||cabo.conduite===c2.id||cabo.conduite===(c2.label||'').trim()||(c2._chave&&cabo.conduite===c2._chave)))
        })
        const rowsCond = conduitesFamilia.map(cond=>{
          conduitesMostrados.add(cond.id)
          const chv = cond.conduiteId||(cond.label||'').trim()||cond._chave||cond.id
          const cabosD = arr.filter(c=>c.conduite===chv||c.conduite===cond.id||c.conduite===(cond.label||'').trim()||(cond._chave&&c.conduite===cond._chave))
          const n=cabosD.length, bitola=cond.diametro || (n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"')
          const mt=cableMeters(cond); const mtTxt=mt?Math.round(mt)+'m':'—'
          const fDe=cond.fromSnapName||(cond.fromCaixaUid?`CX#${markers.find(m=>m.uid===cond.fromCaixaUid)?.n||'?'}`:'de')
          const fPara=cond.toSnapName||(cond.toCaixaUid?`CX#${markers.find(m=>m.uid===cond.toCaixaUid)?.n||'?'}`:'até')
          const cabosLinha=cabosD.map(c=>{ const f2=markers.find(m=>m.uid===c.fromUid),to2=markers.find(m=>m.uid===c.toUid); return `#${f2?.n||'?'}→#${to2?.n||'?'}` }).join(', ')
          return `<tr>
            <td style="font-family:monospace;font-weight:800;color:#0369A1;font-size:12px">${esc(cond.conduiteId||cond.label||'—')}</td>
            <td style="font-size:10px">${(cond.fromSnapName||cond.toSnapName)?`${esc(fDe)} → ${esc(fPara)}`:trechoCond(cabosD)}</td>
            <td style="text-align:center;font-weight:700">${n}×</td>
            <td style="text-align:center;font-weight:700">${bitola}</td>
            <td style="text-align:right">${mtTxt}</td>
            <td style="font-size:9.5px;color:#475569">${esc(cabosLinha)}</td>
            <td style="font-size:9.5px;color:#D97706">${esc(cond.obs||'')}</td>
          </tr>` }).join('')

        const _famHeader = `<div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid ${col};padding-bottom:8px;margin-bottom:10px;break-after:avoid;page-break-after:avoid">
            <div style="width:30px;height:30px;border-radius:8px;background:${col};display:flex;align-items:center;justify-content:center"><span style="width:18px;height:4px;background:#fff;border-radius:2px"></span></div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">${lb}</div>
            <div style="font-size:12px;color:#64748B">${arr.length} cabo(s) · ${sp.spec} · ${sp.conector}${totM>0?` · total ~${Math.round(totM)}m`:''}${conduitesFamilia.length?` · ${conduitesFamilia.length} conduíte(s)`:''}</div></div>
          </div>`
        if(_opus){
          // OPUS: planta COMPACTA + tabela na MESMA folha; sem "visão completa" redundante.
          return `<div class="ex-obra-page" style="page-break-before:${idx===0?'auto':'always'}">
            <div style="break-inside:avoid;page-break-inside:avoid">${_famHeader}
            <h3 class="ex-amb" style="color:${col};margin-bottom:4px">Planta e Cabos — ${lb}</h3></div>
            <div class="ex-opus-fig">${pagePlantaCabos(t,arr,col)}</div>
            ${T(rows,['Nº','Origem → Destino','Cômodo','Cabo','Metros','Conduíte'])}
            ${conduitesFamilia.length ? `
            <h3 class="ex-amb" style="color:${col};margin-top:16px;margin-bottom:4px;break-after:avoid;page-break-after:avoid">Conduítes — ${lb}</h3>
            <div class="ex-opus-fig">${pagePlantaConduites(conduitesFamilia, col)}</div>
            ${T(rowsCond,['ID','Trecho','Nº','Eletroduto','Metros','Cabos dentro','Obs'])}` : ''}
          </div>`
        }
        return `<div class="ex-obra-page" style="page-break-before:${idx===0?'auto':'always'}">
          <div style="break-inside:avoid;page-break-inside:avoid">${_famHeader}
          <h3 class="ex-amb" style="color:${col};margin-bottom:4px">Cabos — ${lb}</h3>
          </div>
          ${T(rows,['Nº','Origem → Destino','Cômodo','Cabo','Metros','Conduíte'])}
          <div class="ex-plant-page" style="page-break-before:always;break-before:page">
            <h3 class="ex-amb" style="color:${col};margin:0 0 4px">Planta — Cabos ${lb}</h3>
            ${pagePlantaCabos(t,arr,col)}
          </div>

          ${conduitesFamilia.length ? `
          <div style="break-inside:avoid;page-break-inside:avoid;page-break-before:always;break-before:page">
          <h3 class="ex-amb" style="color:${col};margin-top:0;margin-bottom:4px">Conduítes — ${lb}</h3>
          </div>
          ${T(rowsCond,['ID','Trecho','Nº','Eletroduto','Metros','Cabos dentro','Obs'])}
          <div class="ex-plant-page" style="page-break-before:always;break-before:page">
            <h3 class="ex-amb" style="color:${col};margin:0 0 4px">Planta — Conduítes ${lb}</h3>
            ${pagePlantaConduites(conduitesFamilia, col)}
          </div>

          <div style="break-inside:avoid;page-break-inside:avoid;page-break-before:always;break-before:page">
          <h3 class="ex-amb" style="color:${col};margin-top:0;margin-bottom:4px">Visão completa — Cabos + Conduítes</h3>
          ${pagePlantaCompleta(arr, conduitesFamilia, col, {ap:'Wi-Fi',camera:'Câmera',som:'Som'}[t])}
          </div>
          ` : ''}
        </div>`
      })
      // conduítes que NÃO apareceram em nenhuma família (mas têm cabos ou existem na planta)
      const conduitesRestantes = hidePdfConduites ? [] : (cables||[]).filter(c=>c.free && !conduitesMostrados.has(c.id))
      const paginaRestantes = conduitesRestantes.length ? (()=>{
        const rowsR = conduitesRestantes.map(cond=>{
          const chv = cond.conduiteId||(cond.label||'').trim()||cond._chave||cond.id
          const cabosD = (cables||[]).filter(c=>!c.free && (c.conduite===chv||c.conduite===cond.id||c.conduite===(cond.label||'').trim()||(cond._chave&&c.conduite===cond._chave)))
          const n=cabosD.length, bitola=cond.diametro || (n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"')
          const mt=cableMeters(cond); const mtTxt=mt?Math.round(mt)+'m':'—'
          const fDe=cond.fromSnapName||(cond.fromCaixaUid?`CX#${markers.find(m=>m.uid===cond.fromCaixaUid)?.n||'?'}`:'de')
          const fPara=cond.toSnapName||(cond.toCaixaUid?`CX#${markers.find(m=>m.uid===cond.toCaixaUid)?.n||'?'}`:'até')
          const cabosLinha=cabosD.map(c=>{ const f2=markers.find(m=>m.uid===c.fromUid),to2=markers.find(m=>m.uid===c.toUid); return `#${f2?.n||'?'}→#${to2?.n||'?'}` }).join(', ')||'(sem cabos atribuídos)'
          return `<tr>
            <td style="font-family:monospace;font-weight:800;color:#0369A1;font-size:12px">${esc(cond.conduiteId||cond.label||'—')}</td>
            <td style="font-size:10px">${(cond.fromSnapName||cond.toSnapName)?`${esc(fDe)} → ${esc(fPara)}`:trechoCond(cabosD)}</td>
            <td style="text-align:center;font-weight:700">${n}×</td>
            <td style="text-align:center;font-weight:700">${bitola}</td>
            <td style="text-align:right">${mtTxt}</td>
            <td style="font-size:9.5px;color:#475569">${esc(cabosLinha)}</td>
          </tr>`}).join('')
        return `<div class="ex-obra-page" style="page-break-before:always">
          <h3 class="ex-amb" style="color:#0D1420;margin-bottom:4px">Outros Conduítes</h3>
          <p class="ex-p" style="color:#64748B;font-size:11px;margin-bottom:6px">Conduítes que não se encaixaram numa família específica de cabo acima.</p>
          <div style="break-inside:avoid;page-break-inside:avoid">
          ${pagePlantaConduites(conduitesRestantes,'#0D1420')}
          </div>
          ${T(rowsR,['ID','Trecho','Nº','Eletroduto','Metros','Cabos dentro'])}
        </div>`
      })() : ''
      // notas finais
      const eletrodutoNotas = (d.checklist_obra||[]).filter(x=>/eletroduto|caixa 4|4×4|4x4|sangria|passagem|fio-guia|condu/i.test(x))
      // ── Decisão 2: blocos que fecham o serviço do mestre dentro do Plano de Obra ──
      const NIVL={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}, LOCL={teto:'Teto',chao:'Piso',parede:'Parede'}
      // ── Planta completa (todos os itens) para abrir o Plano de Obra ──
      const obraPlantaCompleta = plantaGeralItens ? `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Planta Completa do Projeto</h2>
        <p class="ex-p" style="color:#6B7280">Todos os pontos posicionados na planta, visão geral antes de detalhar por tópico.</p>
        ${plantaGeralItens}</div>` : ''
      // MESMA tabela do Projeto Executivo (Raphael: "quero igual do projeto executivo").
      // Era um SEGUNDO construtor da mesma coisa — sem Equip./Caixa/Cabo e mostrando o nome
      // comercial em vez da função. Duas fontes de verdade pra uma tabela só; quando o executivo
      // ganhou colunas na v304, esta ficou pra trás. Agora ela ganha as mesmas colunas e as
      // mesmas regras (funcaoDoPonto + specDoPonto).
      const obraPosAlt = (()=>{ if(secOff('pos_altura')) return ''
        const byRoom={}
        markers.filter(m=>!isRackItem(m.name,m.code)).forEach(m=>{ const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
        const rooms=Object.entries(byRoom); if(!rooms.length) return ''
        return `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Detalhes de Pontos por Cômodo</h2>
          <p class="ex-p" style="color:#6B7280">Cômodo a cômodo: <b>onde</b> deixar a ponta e <b>qual cabo</b> é. O símbolo repete o da planta.</p>`+
          rooms.map(([amb,ms])=>`<h3 class="ex-amb">${esc(amb)} · ${ms.length} ${ms.length===1?'ponto':'pontos'}</h3>`+
            T(ms.map(m=>{ const sp=specDoPonto(m); const fn=funcaoDoPonto(m); const eq=(m.name||'').trim()
              return `<tr><td style="text-align:center">${pin(m.n,undefined,m)}</td><td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||('#'+m.n))}</b></td><td style="font-weight:600">${esc(fn)}</td><td style="font-size:10px;color:#64748B">${(eq&&eq!==fn)?esc(eq):'—'}</td><td>${LOCL[mountOf(m)]||'—'}</td><td style="font-weight:700">${NIVL[alturaOf(m)]||'—'}</td><td style="text-align:center;font-weight:700">${esc(sp.caixa||'—')}</td><td style="font-size:10px">${esc(sp.cabo||'—')}</td></tr>` }).join(''),
              ['Ponto','ID','Item','Equip.','Local','Altura','Caixa','Cabo'])).join('')+`</div>`
      })()
      // ── ELÉTRICA TUDO JUNTO: planta NBR + caixas/alturas + alimentação dos keypads, num tópico só ──
      const obraEletricaCompleta = (()=>{ const els=markers.filter(isPontoEletrico)
        if(!els.length && !(d.alim_keypads||[]).length) return ''
        const plantaEle = embedded ? '' : buildPlantaEletrica(null)  // no Completo, _full já traz a planta elétrica; aqui ficam só as tabelas
        const tabelaCaixas = (!secOff('pontos_tabela') && els.length) ? `<h3 class="ex-amb" style="margin-top:18px">Pontos Elétricos — Caixas e Alturas</h3>
          <p class="ex-p" style="color:#6B7280">Qual caixa embutir e em que altura, por ponto.</p>`+
          T(els.map(m=>{ const cls=classifyEle(m); const sp=specDoPonto(m)
            return `<tr><td style="text-align:center">${pin(m.n,undefined,m)}</td><td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td><td>${esc(cls.tipo)}</td><td>${esc(m.room||'—')}</td><td style="text-align:center;font-weight:700">${esc(sp.caixa||'—')}</td><td style="font-weight:700">${NIVL[alturaOf(m)]||'—'}</td><td style="font-size:10px">${esc(sp.cabo||'—')}</td></tr>`}).join(''),['Nº','ID','Tipo','Cômodo','Caixa','Altura','Cabo']) : ''
        const tabelaAlim = (!secOff('alim_keypads') && (d.alim_keypads||[]).length) ? `<h3 class="ex-amb" style="margin-top:18px">Alimentação dos Keypads (Fase + Neutro)</h3>
          <p class="ex-p" style="color:#6B7280">Keypads exigem neutro no fundo da caixa. Circuito dedicado do quadro.</p>`+
          T(d.alim_keypads.map(r=>`<tr>${pinCell(r.destino,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">${esc(r.fios||'2x1,5mm²')}</td></tr>`).join(''),['Nº','ID','Origem','Destino (Keypad)','Altura','Cômodo','m','Fios']) : ''
        return `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">${embedded?'Elétrica — Caixas e Alimentação (detalhe de obra)':'Elétrica — Planta, Caixas e Alimentação'}</h2>
          <p class="ex-p" style="color:#6B7280">${embedded?'A caixa e altura de cada ponto e a alimentação dos keypads. A planta elétrica NBR está no capítulo de Elétrica acima.':'Tudo da parte elétrica num lugar só: a planta com símbolos NBR, a caixa e altura de cada ponto, e a alimentação dos keypads.'}</p>
          ${plantaEle}${tabelaCaixas}${tabelaAlim}</div>`
      })()
      const obraQuant = (()=>{
        // Varre TODOS os pontos (keystone e som pedem 4x2 e ficam fora do isPontoEletrico) e só
        // conta o que é caixa de verdade — "forro"/"quadro" saíam como "Caixa de embutir forro".
        const caixas={}
        markers.filter(m=>!isRackItem(m.name,m.code) && !hideCats.has(equipType(m.name)) && m.name).forEach(m=>{
          const cx=specDoPonto(m).caixa; if(ehCaixaDeEmbutir(cx)) caixas[cx]=(caixas[cx]||0)+1 })
        const fams={}; cablesUnificados(cables,markers).filter(c=>!c.free).forEach(c=>{ const f=cableFamily(c.type||'dados'); if(famOculta(f.k)) return; const mt=cableMeters(c)||0; fams[f.nome]=(fams[f.nome]||0)+mt })
        const conds=(cables||[]).filter(c=>c.free); const condM=conds.reduce((s,c)=>s+(cableMeters(c)||0),0)
        const rows=[
          ...Object.entries(caixas).sort().map(([k,v])=>['Caixa de embutir '+k, v+' un']),
          ...Object.entries(fams).map(([k,v])=>['Cabo '+k, (plantScale? Math.round(v)+' m':'defina a escala')]),
          ...(conds.length?[['Eletrodutos (conduítes)', conds.length+' trecho'+(conds.length>1?'s':'')+(plantScale&&condM?' · ~'+Math.round(condM)+' m':'')]]:[]),
        ]
        if(!rows.length) return ''
        return `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Quantitativo de Material</h2>
          <p class="ex-p" style="color:#6B7280">Metragens já incluem subida/descida ao forro e folga de instalação (${folgaPct}%). Percursos pela prumada contam o pé-direito uma vez.</p>`+
          T(rows.map(r=>`<tr><td>${r[0]}</td><td style="text-align:right;font-weight:700">${r[1]}</td></tr>`).join(''),['Material','Quantidade'])+`</div>`
      })()
      // ── Checklist com caixa real pra marcar à caneta na obra ──
      const checkList = (items=[]) => items.length ? `<div style="display:flex;flex-direction:column;gap:0">${items.map(it=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 4px;border-bottom:1px solid #E5E7EB;break-inside:avoid">
          <span style="flex-shrink:0;width:17px;height:17px;border:2px solid #0D1420;border-radius:3px;margin-top:1px;display:inline-block"></span>
          <span style="font-size:12px;line-height:1.45;color:#1F2937">${esc(it)}</span>
        </div>`).join('')}</div>` : '<p class="ex-p" style="color:#9CA3AF">Sem itens.</p>'
      const obraChecklists = `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Checklists de Obra e Instalação</h2>
        <p class="ex-p" style="color:#6B7280">Marque cada item à caneta conforme for cumprindo. Imprima para levar ao canteiro.</p>
        <h3 class="ex-amb" style="margin-top:14px">Checklist de Obra — Arquiteto / Eletricista</h3>${checkList(d.checklist_obra)}
        <h3 class="ex-amb" style="margin-top:20px">Checklist de Instalação — Equipe RARO Home</h3>${checkList(d.checklist_raro)}</div>`
      // ── TÓPICO REDES (consolidado) ─────────────────────────────────────────────────
      // Uma visão única de TODO o cabeamento de rede — Keystone, AP e Câmera (Raphael) — numa
      // planta só, com a tabela geral de cabos e a de conduítes que levam cabo de rede. As
      // páginas por família (abaixo) continuam detalhando cada uma; aqui é o retrato do todo.
      const redeSection = (()=>{
        const REDE_TIPOS = new Set(['dados','ap','camera'])
        const cabosRede = (cables||[]).filter(c=>!c.free && REDE_TIPOS.has(c.type||'dados'))
        if(!cabosRede.length) return ''
        // planta: todos os cabos de rede juntos, cada tipo na sua cor; pinos das pontas + rack
        const plantaRede = bgImage ? (()=>{
          const redeIds = new Set(cabosRede.map(c=>c.id).filter(Boolean))
          // UMA planta de rede por PAVIMENTO (com 1 andar sai igual a antes).
          return plantasPorPav(v=>{
            const cabosF = v.cbs.filter(c=> !c.free && REDE_TIPOS.has(c.type||'dados') && (cabosRede.includes(c) || (c.id && redeIds.has(c.id))) )
            if(!cabosF.length) return ''
            const lines=cabosF.map(c=>{ const pts=cablePolyPointsIn(c, v.mks); if(pts.length<2)return''
              const col=CABLE_PALETTE[c.type||'dados']||'#2563EB'
              return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:2.4px" vector-effect="non-scaling-stroke"/>` }).join('')
            const uids=new Set(); cabosF.forEach(c=>{uids.add(c.fromUid);uids.add(c.toUid)})
            const dots=v.mks.filter(m=>uids.has(m.uid)||isRackItem(m.name,m.code)).map(m=>{
              const isR=isRackItem(m.name||'',m.code||'')
              if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3"><div style="width:20px;height:20px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div></div>`
              return drawPin(m,{label:_pinLabel(m),size:20,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c,idLabel:showIdsPdf?esc(m.id||m.code||m.name||''):''}) }).join('')
            const uidList=v.mks.filter(m=>uids.has(m.uid)).map(m=>m.uid).join(',')
            return `<div class="ex-plant" style="margin-bottom:10px" data-mkuids="${uidList}"><img src="${v.bg}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${lines}</svg>${dots}</div>` }) })() : ''
        // legenda de cores dos tipos presentes
        const tiposPresentes=[...new Set(cabosRede.map(c=>c.type||'dados'))]
        const legRede=`<div style="display:flex;flex-wrap:wrap;gap:12px;margin:8px 0 10px">${tiposPresentes.map(t=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:#334155"><span style="width:16px;height:4px;border-radius:2px;background:${CABLE_PALETTE[t]||'#2563EB'}"></span>${esc(CABLE_LABELS[t]||t)}</span>`).join('')}</div>`
        // tabela geral de cabos de rede (com coluna Tipo)
        const rowsRede=cabosRede.map(c=>{ const f=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid); const mt=cableMeters(c); const sp=CABLE_SPEC[c.type]||{spec:'CAT6'}
          return `<tr>${pinCell(to?.id,to?.code,to?.n)}
            <td style="font-size:11px">${esc(CABLE_LABELS[c.type||'dados']||'Keystone')}</td>
            <td style="font-size:11px">${f?`<b>#${f.n}</b> ${esc(f.name)}`:'Rack'} <span style="color:#94A3B8">→</span> ${to?`<b>#${to.n}</b> ${esc(to.name)}`:'—'}</td>
            <td style="font-size:11px">${esc(to?.room||'—')}</td>
            <td style="font-size:10px;color:#475569">${esc(sp.spec)}</td>
            <td style="text-align:right;font-weight:700">${mtCel(mt,c.type)}</td>
            <td style="font-size:9.5px;color:#0369A1;font-family:monospace">${esc(c.conduite||'—')}</td>
          </tr>` }).join('')
        const totRede=cabosRede.reduce((s,c)=>s+(cableMeters(c)||0),0)
        // conduítes que levam ao menos um cabo de rede
        const chaveDe=cond=>cond.conduiteId||(cond.label||'').trim()||cond._chave||cond.id
        const condRede=hidePdfConduites?[]:(cables||[]).filter(cond=>{ if(!cond.free) return false
          const chv=chaveDe(cond); return cabosRede.some(cabo=>cabo.conduite && (cabo.conduite===chv||cabo.conduite===cond.id||cabo.conduite===(cond.label||'').trim()||(cond._chave&&cabo.conduite===cond._chave))) })
        const rowsCondRede=condRede.map(cond=>{ const chv=chaveDe(cond)
          const dentro=cabosRede.filter(c=>c.conduite===chv||c.conduite===cond.id||c.conduite===(cond.label||'').trim()||(cond._chave&&c.conduite===cond._chave))
          const n=dentro.length, bitola=cond.diametro || (n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"'); const mt=cableMeters(cond)
          return `<tr><td style="font-family:monospace;font-weight:800;color:#0369A1;font-size:12px">${esc(cond.conduiteId||cond.label||'—')}</td>
            <td style="text-align:center;font-weight:700">${n}×</td><td style="text-align:center;font-weight:700">${bitola}</td>
            <td style="text-align:right">${mt?Math.round(mt)+'m':'—'}</td>
            <td style="font-size:9.5px;color:#475569">${dentro.map(c=>`#${markers.find(m=>m.uid===c.fromUid)?.n||'?'}→#${markers.find(m=>m.uid===c.toUid)?.n||'?'}`).join(', ')}</td></tr>` }).join('')
        return `<div class="ex-obra-page"><div style="break-inside:avoid;page-break-inside:avoid">
            <h2 style="border-bottom:3px solid #1E3A8A;padding-bottom:8px">Redes — Cabeamento Estruturado</h2>
            <p class="ex-p" style="color:#6B7280">Todo o cabo de rede da casa num lugar só: pontos Keystone, câmeras e access points. É o CAT6 que passa pelo forro e paredes até o rack. As páginas por família, adiante, detalham cada uma.</p>
            <div style="font-size:12px;color:#334155;margin:6px 0 2px"><b>${cabosRede.length}</b> cabo(s) de rede${totRede>0?` · total ~${Math.round(totRede)}m`:''}${condRede.length?` · ${condRede.length} conduíte(s)`:''}</div>
            ${legRede}</div>
          ${plantaRede?`<div class="ex-opus-fig">${plantaRede}</div>`:''}
          ${T(rowsRede,['Nº','Tipo','Origem → Destino','Cômodo','Cabo','Metros','Conduíte'])}
          ${condRede.length?`<h3 class="ex-amb" style="color:#1E3A8A;margin-top:16px;margin-bottom:4px;break-after:avoid;page-break-after:avoid">Conduítes de rede — planta</h3>
            <div class="ex-opus-fig">${pagePlantaConduites(condRede, '#1E3A8A')}</div>`:''}
          ${rowsCondRede?`<h3 class="ex-amb" style="color:#1E3A8A;margin-top:14px;margin-bottom:4px;break-after:avoid;page-break-after:avoid">Conduítes de rede — tabela</h3>${T(rowsCondRede,['ID','Nº cabos','Eletroduto','Metros','Trechos'])}`:''}
          </div>`
      })()

      const obraSections = [
        // A abertura do Plano de Obra saiu (Raphael): era o título + o aviso de A3 + a legenda
        // repetida. A capa já diz o que é o documento, e a legenda aparece colada em cada
        // planta — aqui ela era só uma cópia solta antes de qualquer desenho. Tudo é A4 agora.
        embedded?'':obraPlantaCompleta,   // no Completo, _full já tem a Planta de Pontos
        (embedded||secOff('pos_altura'))?'':obraPosAlt,            // no Completo, _full já tem a Posição e Altura
        secOff('t_obra_eletrica')?'':obraEletricaCompleta,
        secOff('t_quant')?'':obraQuant,
        // Tópico Redes (consolidado). Sentinelas pro Executivo extrair e pôr como tópico próprio.
        secOff('t_cabos')?'':'<!--REDES-INI-->',
        secOff('t_cabos')?'':redeSection,
        secOff('t_cabos')?'':'<!--REDES-FIM-->',
        // Sentinelas: o Projeto Executivo extrai estas plantas de cabo (por família) daqui, sem
        // duplicar código — antes o PE só tinha as plantas de conduíte e faltava a de cabos.
        secOff('t_cabos')?'':'<!--CABOS-INI-->',
        ...(secOff('t_cabos')?[]:(categoriaPaginas.length?categoriaPaginas:[`<p class="ex-p" style="color:#B45309">⚠ Nenhum cabo desenhado na planta. Use o modo "Cabos" no editor.</p>`])),
        secOff('t_cabos')?'':'<!--CABOS-FIM-->',
        secOff('t_cabos')?'':paginaRestantes,
        (!secOff('tbl_teto') && plantaTeto) ? `<div class="ex-obra-page" style="page-break-before:always">${plantaTeto.replace('<div class="ex-sec ex-breakable">','<div>')}</div>` : '',
        secOff('t_checklists')?'':obraChecklists,
        `<div class="ex-obra-page" style="page-break-before:always">
          <div style="break-inside:avoid;page-break-inside:avoid">
          <h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Notas de Infraestrutura</h2>
          ${list(eletrodutoNotas.length?eletrodutoNotas:[
            'Usar eletroduto 3/4" para conduítes de dados; 3/4"–1" para conduítes elétricos.',
            'Conduítes compartilhados: passar cabos de DADOS e ELÉTRICA em eletrodutos SEPARADOS.',
            'Deixar fio-guia em todos os conduítes.',
            'Caixa 4×4 em todos os pontos com mais de um cabo chegando.',
          ])}</div></div>`,
      ].filter(Boolean)
      return obraSections.join('\n') + '</div>'
    }


    // ── capítulos numerados (profissional, sem duplicação) ──
    let _cap = 0
    const cap = (t,brk=false) => `<div class="ex-sec ex-breakable" style="${brk?'page-break-before:always;':''}"><h2 style="border-bottom:3px solid ${TH.rule};padding-bottom:8px;margin-bottom:12px">${_capNum(++_cap)}${t}</h2>`

    // ── gera os conteúdos de Obra e Conduítes inline (sem duplicação) ──
    let obraInline = '', conduitesInline = '', cabosInline = '', redesInline = ''
    try {
      const obraFull = buildExecHtml(d,'obra')
      const condFull = buildExecHtml(d,'conduites')
      const extrair = html => { const i=html.indexOf('<div class="ex-obra-page"'); const j=html.lastIndexOf('</div>'); return (i>=0)?html.slice(i, j):'' }
      obraInline = extrair(obraFull)
      conduitesInline = extrair(condFull)
      // Plantas de cabo por família, extraídas do doc de obra pelas sentinelas — mesmas plantas
      // que o Plano de Obra, agora também no Executivo (Raphael: "faltou a planta com os cabos").
      const ci=obraFull.indexOf('<!--CABOS-INI-->'), cf=obraFull.indexOf('<!--CABOS-FIM-->')
      if(ci>=0 && cf>ci) cabosInline = obraFull.slice(ci+16, cf)
      // Tópico Redes (consolidado) — mesma extração por sentinela.
      const ri=obraFull.indexOf('<!--REDES-INI-->'), rf=obraFull.indexOf('<!--REDES-FIM-->')
      if(ri>=0 && rf>ri) redesInline = obraFull.slice(ri+16, rf)
    } catch(e){ console.warn('inline obra/cond:',e) }

    return [
    // 1. PREMISSAS — o que o projeto entrega
    (!secOff('t_premissas') && d.premissas?.length) ? cap('Premissas e Escopo do Projeto') + list(d.premissas) + '</div>' : '',

    // 2. DETALHES DE PONTOS POR CÔMODO (ex-"Posição e Altura", movida pra cá como #2 — Raphael).
    _detalhesPontosBody ? cap('Detalhes de Pontos por Cômodo') + _detalhesPontosBody + '</div>' : '',

    // 3-4. SISTEMAS. Som e Segurança agora entram DENTRO de Cabeamento e Conduítes (ver #7),
    // nos tópicos respectivos — pedido do Raphael. Ficam fora daqui.

    // 5. REDE / RACK
    !secOff('tbl_rack') && hasRack && (d.rack_detalhe||rackItems.length) ? cap('Rack / CPD — Equipamentos e Portas',true) + (list(d.rack_detalhe)+((rackEquipTable&&!secOff('tbl_rack_tab'))?`<h3 class="ex-amb">Equipamentos do Rack</h3>${rackEquipTable}`:'')+rackVisual+((rackCableTableHtml&&!secOff('tbl_rack_tab'))?`<h3 class="ex-amb" style="margin-top:20px">Tabela de Portas — Cabos de Rede</h3>${rackCableTableHtml}`:'')) + '</div>' : '',

    // CONFIGURAÇÕES E MELHORES PRÁTICAS (Raphael) — SSID/VLAN, checklist de rede, boas práticas
    // dos equipamentos, segurança e câmeras. Vem ANTES do mapa de calor Wi-Fi, em tópico próprio.
    secOff('t_wifi') ? '' : cap('Configurações e Melhores Práticas',true) + blocoRedeHtml() + '</div>',

    // 6. PLANTA ELÉTRICA (NBR) e MAPA WI-FI
    // Wi-Fi ANTES da elétrica (Raphael): rede é o que o cliente vê; a elétrica fecha o bloco técnico.
    secOff('t_wifi') ? '' : (()=>{ const aps=markers.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
      return (showHeatmap && aps.length) ? (()=>{_cap++; return buildHeatmap(()=>_capNum(_cap))})() : '' })(),
    secOff('t_eletrica') ? '' : buildPlantaEletrica(()=>_capNum(++_cap)),

    // 6. TETO
    (!secOff('tbl_teto') && plantaTeto) ? cap('Planta de Teto — Itens sobre Forro e Laje',true) + plantaTeto.replace('<div class="ex-sec ex-breakable"><h2>Planta — Itens no Teto</h2>','') + '</div>' : '',

    // 7a. REDES (consolidado) — todo o cabeamento de rede (Keystone/AP/Câmera) num tópico só,
    // ANTES do detalhamento por família. redesInline vem do doc de obra pela sentinela; tem o
    // próprio h2, que troco pelo cabeçalho numerado do capítulo.
    (secOff('t_conduites')||!redesInline) ? '' : cap('Redes — Cabeamento Estruturado',true) +
      redesInline.replace(/<h2[^>]*>Redes — Cabeamento Estruturado<\/h2>/,'') +
      '</div>',

    // 7. CABEAMENTO E CONDUÍTES — plantas de cabo por família (cabosInline) + conduítes.
    // Som Ambiente foi REMOVIDO (Raphael). Segurança/Câmeras foi movido pro tópico 3 (Rede).
    secOff('t_conduites') ? '' : cap('Cabeamento e Conduítes',true) +
      `<p class="ex-p" style="margin-bottom:10px">Por família de cabo (Keystone, Som, Elétrica): a planta com o caminho dos cabos e a dos conduítes, com as tabelas de execução.</p>` +
      (cabosInline || (conduitesInline||'')) +
      '</div>',

    // 8. EQUIPAMENTOS E PEÇAS — mantido como estava (Raphael: "pode manter como está").
    secOff('t_pecas') ? '' : cap('Equipamentos por Cômodo e Lista de Peças') +
    (itensComodoHtml ? itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml : '') +
    ((d.pecas||[]).length?'<h3 class="ex-amb" style="margin-top:16px">Lista Completa de Peças</h3>' + T(d.pecas.map(r=>`<tr><td>${esc(r.item)}</td><td style="text-align:center"><b>${esc(r.qtd)}</b></td></tr>`).join(''),['Item','Qtd']):'') + '</div>',

    // 9. GRÁFICOS E GESTÃO
    secOff('t_graficos') ? '' : cap('Gráficos e Gestão do Projeto') + (grafico1 + grafico2 + grafico3 + grafico4) +
    (gestaoTxt ? '<h3 class="ex-amb" style="margin-top:18px">Gestão e Controle</h3>' + gestaoTxt : '') + '</div>',

    // 10. FOTOS — a tabela "Observações dos Pontos" saiu (Raphael): a observação de cada ponto
    // já viaja junto do ponto nas tabelas por cômodo; repetir tudo numa lista solta no fim não
    // ajudava ninguém. As fotos do diário ficam.
    (!secOff('t_observ') && fotosTxt) ? cap('Fotos do Diário de Obra') + fotosTxt + '</div>' : '',

  ].filter(Boolean).join('\n') })()}
</div>`
  }

  // Número dentro do pino, nas plantas do documento — obedece ao toggle "Nº dentro do pino".
  // Declarada como function pra ser içada (hoisted): as plantas são montadas acima daqui.
  function _pinLabel(m){ return showNumPin ? String((m&&m.n)??'') : '' }

  // FOLHA DE CREDENCIAIS — única saída com as senhas em CLARO, e só sob demanda. Documento
  // separado, pra entregar em mão; não é anexo do projeto executivo. Em useEffect porque abrir
  // janela é efeito colateral: fazer isso no corpo do render não roda de forma confiável.
  useEffect(()=>{
    if(!showCredSheet) return
    setShowCredSheet(false)
    const cli = projectInfo.client || fromProposal?.client_name || 'Cliente'
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de Credenciais — ${cli}</title>`
      + `<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">`
      + `<style>@page{size:A4;margin:16mm} body{margin:0;font-family:'DM Sans',sans-serif;color:#0D1B2A}
         h1{font-family:'DM Serif Display',serif;font-size:24px;margin:0 0 2px}
         .ex-amb{font-size:12px;font-weight:700;color:#0369A1;margin:14px 0 5px}
         .ex-p{font-size:11px;line-height:1.5;color:#334155;margin:6px 0}
         table{width:100%;border-collapse:collapse}</style></head><body style="margin:0">`
      + `${isDemo()?demoWatermark():''}`
      + `<div style="border-bottom:3px solid #0D1B2A;padding-bottom:8px;margin-bottom:4px">
           <h1>Folha de Credenciais</h1>
           <div style="font-size:11px;color:#64748B">${cli} · ${new Date().toLocaleDateString('pt-BR')} · ${brandName()}</div>
         </div>`
      + blocoCredenciaisHtml(true)
      + `<div style="margin-top:26px;border-top:1px dashed #CBD5E1;padding-top:10px;font-size:10.5px;color:#64748B">
           Recebi as credenciais acima: ____________________________________  Data: ____/____/______
         </div></body></html>`
    try{ openHtmlDoc(html, `Folha-de-Credenciais-${safeFileName(cli)}.html`) }
    catch(e){ alert('Erro ao abrir a folha: '+e.message) }
  },[showCredSheet]) // eslint-disable-line

  // ── CREDENCIAIS: no documento sai MASCARADO; em claro só na folha à parte ────────────
  // A máscara é aplicada AQUI, ao montar o HTML — a senha nunca entra na string do documento
  // normal. Não é CSS escondendo: se não está na string, não vaza por "inspecionar elemento"
  // nem por PDF que preserva texto oculto.
  const _mask = s => { const v=String(s||''); return v ? '•'.repeat(Math.min(Math.max(v.length,6),12)) : '—' }
  const _ec = s => String(s==null?'':s).replace(/</g,'&lt;')
  function credsVazias(){
    return !(creds.wifi||[]).some(w=>w.ssid||w.senha) && !creds.cams.user && !creds.cams.senha
  }
  // claro=true só é chamado pela Folha de Credenciais.
  function blocoCredenciaisHtml(claro=false){
    if(credsVazias()) return ''
    const val = v => claro ? (_ec(v)||'—') : _mask(v)
    const th='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
    const td='style="font-size:11px;padding:6px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
    const tbl=(linhas,cols)=>`<table style="width:100%;border-collapse:collapse"><thead><tr>${cols.map(c=>`<th ${th}>${c}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>`
    const wifi=(creds.wifi||[]).filter(w=>w.ssid||w.senha)
    const linhasWifi=wifi.map(w=>`<tr>
      <td ${td} style="font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0">${_ec(w.ssid)||'—'}</td>
      <td ${td} style="text-align:center;padding:6px 8px;border-bottom:.5px solid #E2E8F0">${_ec(w.vlan)||'—'}</td>
      <td ${td} style="font-size:10px;color:#64748B;padding:6px 8px;border-bottom:.5px solid #E2E8F0">${_ec(w.uso)||'—'}</td>
      <td ${td} style="font-family:monospace;font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0;color:${claro?'#0D1B2A':'#94A3B8'}">${val(w.senha)}</td>
    </tr>`).join('')
    const camsTxt=(creds.cams.user||creds.cams.senha) ? `
      <h3 class="ex-amb" style="margin-top:14px">Câmeras — acesso</h3>
      ${tbl(`<tr><td ${td} style="font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0">Usuário</td><td ${td} style="font-family:monospace;padding:6px 8px;border-bottom:.5px solid #E2E8F0">${_ec(creds.cams.user)||'—'}</td></tr>
            <tr><td ${td} style="font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0">Senha</td><td ${td} style="font-family:monospace;font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0;color:${claro?'#0D1B2A':'#94A3B8'}">${val(creds.cams.senha)}</td></tr>
            ${creds.cams.obs?`<tr><td ${td} style="font-weight:700;padding:6px 8px;border-bottom:.5px solid #E2E8F0">Observações</td><td ${td} style="padding:6px 8px;border-bottom:.5px solid #E2E8F0">${_ec(creds.cams.obs)}</td></tr>`:''}`,['Campo','Valor'])}` : ''
    const aviso = claro
      ? `<div style="margin-top:14px;padding:10px 12px;border:1.5px solid #DC2626;border-radius:8px;background:#FEF2F2;color:#991B1B;font-size:11px;line-height:1.5">
          <b>Documento confidencial — contém senhas legíveis.</b> Entregue em mão ao responsável. Não anexe em grupo de mensagens e destrua a via impressa depois de configurar.</div>`
      : `<p class="ex-p" style="font-size:10px;color:#94A3B8;margin-top:6px">As senhas não são impressas neste documento. Peça a <b>Folha de Credenciais</b> ao responsável do projeto.</p>`
    return `${wifi.length?`<h3 class="ex-amb">Wi-Fi — redes do projeto</h3>${tbl(linhasWifi,['SSID','VLAN','Uso','Senha'])}`:''}${camsTxt}${creds.obs?`<p class="ex-p" style="margin-top:8px">${_ec(creds.obs)}</p>`:''}${aviso}`
  }

  // Cor do pino — FONTE ÚNICA. A planta desenha com catColorOf(m) || EQUIP_STYLE; a legenda
  // caía num cinza fixo quando catColorOf devolvia null (itens sem categoria mapeada, tipo
  // "Módulo de cortina"), então legenda e planta mostravam o MESMO ponto em cores diferentes
  // (cinza #64748B × índigo #6366F1). Quem desenha pino usa isto, e só isto.
  function corDoPino(m){
    return catColorOf(m) || (EQUIP_STYLE[equipType(m && m.name)] || EQUIP_STYLE.Outro).c
  }

  // O QUE O PONTO É — função, não modelo. A legenda de obra não quer saber que o item do
  // catálogo se chama "Keypad Premium Zigbee 2 Botões Prata": quer saber que é um interruptor
  // de 2 teclas. classifyEle devolve a função normalizada ("Interruptor 2 teclas", "Tomada
  // baixa (0,30m)") — é ela que descasca o nome comercial.
  // Sem classificação, cai no NOME DO ITEM — nunca em equipType. equipType é categoria
  // genérica ("Módulo") e achataria "Módulo de cortina" e "Módulo de iluminação 4 canais" no
  // mesmo rótulo. Isto AQUI é só exibição: quem agrupa é o item (ver a chave da dedup).
  function funcaoDoPonto(m){
    // Ponto de rede: nome limpo por função (Raphael). Câmera → "Câmera", access point → "Antena",
    // keystone → "Ponto de Rede {Baixo/Médio/Alto/Piso/Teto}". O modelo do produto fica na
    // coluna Equip.; aqui é a FUNÇÃO. A letra do pino (C/A/K) já distingue os três desenhos.
    if(pinTipoDe(m)==='rede'){
      const L = pinLetraDe(m)
      if(L==='C') return 'Câmera'
      if(L==='A') return 'Antena de Internet'
      const A = {piso:'Piso',baixa:'Baixo',media:'Médio',alta:'Alto',teto:'Teto'}
      return 'Ponto de Rede'+(A[alturaOf(m)]?' '+A[alturaOf(m)]:'')
    }
    // Sensores: a legenda deve DIZER que é sensor de presença (mmWave/IR), não só o nome comercial
    // (Raphael). A marca no pino (~ ou IR) casa com este texto.
    const _n=(((m&&m.name)||'')+' '+((m&&m.code)||'')).toLowerCase()
    if(/receptor ir|emissor ir|hub ir|infraverm|\bir\b/.test(_n)) return 'Sensor de presença IR'
    if(/sensor|presen[çc]a|mm-?wave|mv-?wave|\bmmw\b/.test(_n)) return 'Sensor de presença (mmWave)'
    const cls = classifyEle(m)
    let tipo = (cls && cls.tipo) ? cls.tipo : ((m && m.name) || '—')
    // Ocultar IDs (tabela) também esconde o "N teclas" do interruptor (Raphael): fica só
    // "Interruptor". A contagem de teclas é dado de detalhe, no mesmo nível do ID.
    if(!showIdsTbl) tipo = tipo.replace(/\s*\d+\s*teclas?/i,'').trim()
    return tipo
  }

  // Legenda OPUS: a legenda É a lista do que existe NESTA planta, uma linha por FUNÇÃO
  // (10 keystones no teto = 1 linha ×10). Substitui a legenda abstrata cor/forma/selo, que
  // obrigava o peão a fazer 3 consultas e combinar de cabeça.
  function legendaOpusHtml(){
    const _fo = fazFamOculta(hideFams)
    const _e = s => String(s==null?'':s).replace(/</g,'&lt;')
    const vis = markers.filter(m=>!isRackItem(m.name,m.code) && !hideCats.has(equipType(m.name)) && m.name)
    if(!vis.length) return ''
    const NIVL={piso:'no chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'no teto'}
    const grupos=new Map()
    // LEGENDA: um de cada (Raphael). Agrupa pelo que a LINHA MOSTRA — desenho (tipo, forma,
    // preenchimento, traços, letra) + o texto (função) + o cabo. Dois produtos diferentes com a
    // mesma função desenham igual e escrevem igual: na legenda são a MESMA linha.
    // A regra "não fundir itens" continua valendo nas TABELAS, onde o item é o assunto; aqui o
    // assunto é o símbolo — agrupar por m.name gerava linhas gêmeas ("Interruptor 3 teclas ×3"
    // e "×4" logo abaixo), que é ruído, não informação.
    vis.forEach(m=>{ const fam=cableFamily(familiaDoPontoTipo(m))
      const fams=cableFamiliesOf(m,familiaDoPontoTipo(m))
      // semPoe entra na chave: AP com PoE e AP com fonte externa são linhas DIFERENTES —
      // desenham igual mas recebem cabos diferentes, que é justamente o que a legenda informa.
      const chave=[funcaoDoPonto(m),pinTipoDe(m),pinFillDe(m),((classifyEle(m)||{}).teclas)||0,pinLetraDe(m),fams.map(f=>f.k).join('+')].join('|')
      if(!grupos.has(chave)) grupos.set(chave,{m,fam,fams,qtd:0})
      grupos.get(chave).qtd++ })
    const linhas=[...grupos.values()].sort((a,b)=>funcaoDoPonto(a.m).localeCompare(funcaoDoPonto(b.m)))
    // Quando dois itens desenham IGUAL, a linha diz em quais pontos aquele item está. Só nesses
    // casos: desenho único não ganha nada, então não incha quando o projeto é grande.
    // A assinatura é exatamente o que o pino desenha — tipo (forma+cor), preenchimento (altura),
    // nº de traços (teclas) e a letra da meia lua. Nada mais entra: se bate nos quatro, o peão
    // vê a mesma coisa. (Antes usava a cor velha e o símbolo ABNT; a cor velha não desenha mais
    // nada e a coluna ABNT saiu, então o teste estava medindo o que não existe.)
    const desenho=g=>[pinTipoDe(g.m),pinFillDe(g.m),((classifyEle(g.m)||{}).teclas)||0,pinLetraDe(g.m)].join('|')
    const porDesenho=new Map()
    linhas.forEach(g=>{ const d=desenho(g); porDesenho.set(d,(porDesenho.get(d)||0)+1) })
    const numerosDe=g=>vis.filter(m=>m.name===g.m.name && alturaOf(m)===alturaOf(g.m) && mountOf(m)===mountOf(g.m))
      .map(m=>m.n).filter(n=>n!=null).sort((a,b)=>a-b)

    const th='style="text-align:left;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:4px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
    const td='style="font-size:10.5px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
    // A coluna ABNT saiu: os símbolos da elétrica e os pinos passaram a falar a MESMA língua
    // (v301), então ela virava um espelho do desenho ao lado — o interruptor aparecia como
    // círculo vermelho com traços nas duas colunas.
    // Desenha TODOS os selos do ponto (2 quando chegam dois cabos: subwoofer S+E, AP sem PoE R+E),
    // no mesmo escalonamento do pino da planta — legenda e desenho têm que bater.
    const simb=(m,fams)=>{ const pino=pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:corDoPino(m),label:'',size:22})
      const selos=(Array.isArray(fams)?fams:[fams]).filter(f=>!_fo(f.k))
        .map((f,i)=>`<span style="position:absolute;top:-3px;right:${-3 - i*11}px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</span>`).join('')
      return `<span style="position:relative;display:inline-block;width:22px;height:22px;vertical-align:middle">${pino}${selos}</span>` }
    const corpo=linhas.map(g=>{
      const {m,fam,qtd}=g
      const fams=g.fams||[fam]
      const ambiguo=(porDesenho.get(desenho(g))||0)>1
      const ns=ambiguo?numerosDe(g):[]
      const dica=ns.length?`<div style="font-size:9px;color:#B45309;font-weight:600;margin-top:1px">mesmo desenho de outro item — ${ns.length===1?'ponto':'pontos'} ${ns.join(', ')}</div>`:''
      return `<tr>
        <td ${td} style="text-align:center;padding:3px 8px;border-bottom:.5px solid #E2E8F0">${simb(m,fams)}</td>
        <td ${td} style="font-weight:600">${_e(funcaoDoPonto(m))}${dica}</td>
        <td ${td}>${NIVL[alturaOf(m)]||'—'}</td>
        <td ${td} style="font-weight:600;color:${_fo(fam.k)?'#94A3B8':fam.cor}">${
          fams.filter(f=>!_fo(f.k)).length ? fams.filter(f=>!_fo(f.k)).map(f=>_e(f.nome)).join(' + ') : '—'
        }<div style="font-size:9px;font-weight:500;color:#64748B">${_e(specDoPonto(m).cabo||'')}</div></td>
        <td ${td} style="text-align:right;font-weight:800">×${qtd}</td>
      </tr>` }).join('')

    return `<div style="margin-top:10px;padding:11px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#94A3B8;margin-bottom:7px">Legenda — o que existe nesta planta</div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E2E8F0;border-radius:6px">
        <thead><tr>
          <th ${th} style="width:44px;text-align:center;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:4px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Pino</th>
          <th ${th}>O que é</th><th ${th} style="width:62px;text-align:left;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:4px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Altura</th>
          <th ${th} style="width:132px;text-align:left;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:4px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Cabo</th>
          <th ${th} style="width:38px;text-align:right;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:4px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Qtd.</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`
  }
  // Legenda VERTICAL pra prancha (planta grande + legenda na coluna lateral, como um projeto de
  // arquitetura). Uma linha por função, empilhada, estreita — cabe numa coluna de ~230px. Sem
  // <table>, pra não ser apagada pelo "ocultar tabelas" (é injetada DEPOIS do hide, mas mesmo
  // assim div é mais robusto no fluxo estreito).
  // Legenda lateral da prancha. Com `mksArg` (subconjunto), mostra SÓ os itens daquela planta
  // (Raphael); sem argumento, usa todos os markers (comportamento antigo).
  function legendaLateralHtml(mksArg){
    const base = Array.isArray(mksArg) ? mksArg : markers
    const vis = base.filter(m=>!isRackItem(m.name,m.code) && !hideCats.has(equipType(m.name)) && m.name)
    if(!vis.length) return ''
    const NIVL={piso:'chão',baixa:'0,30',media:'1,10',alta:'1,80',teto:'teto'}
    const _e=s=>String(s==null?'':s).replace(/</g,'&lt;')
    const grupos=new Map()
    vis.forEach(m=>{ const fams=cableFamiliesOf(m,familiaDoPontoTipo(m))
      const chave=[funcaoDoPonto(m),pinTipoDe(m),pinFillDe(m),((classifyEle(m)||{}).teclas)||0,pinLetraDe(m),fams.map(f=>f.k).join('+')].join('|')
      if(!grupos.has(chave)) grupos.set(chave,{m,fams,qtd:0}); grupos.get(chave).qtd++ })
    const linhas=[...grupos.values()].sort((a,b)=>funcaoDoPonto(a.m).localeCompare(funcaoDoPonto(b.m))).map(g=>{
      const pino=pinShapeSVG({m:g.m, mount:mountOf(g.m),alt:alturaOf(g.m),color:corDoPino(g.m),label:'',size:20})
      const _fo=fazFamOculta(hideFams)
      const selos=g.fams.filter(f=>!_fo(f.k)).map((f,i)=>`<span style="position:absolute;top:-2px;right:${-2-i*10}px;min-width:8px;height:8px;border-radius:5px;background:${f.cor};color:#fff;font-size:5.5px;font-weight:800;line-height:8px;text-align:center;border:1px solid #fff">${f.L}</span>`).join('')
      // Bitola/composição do fio (F+N+T + retornos) — Raphael: a legenda precisa dizer o cabo/retorno.
      const cabo=(()=>{ try{ const c=(specDoPonto(g.m)||{}).cabo; return (c&&c!=='—')?String(c):''; }catch(_){ return '' } })()
      return `<div style="display:flex;align-items:flex-start;gap:7px;padding:3px 0;border-bottom:.5px solid #E8ECF1">
        <span style="position:relative;display:inline-block;width:20px;height:20px;flex-shrink:0">${pino}${selos}</span>
        <span style="font-size:8.5px;line-height:1.25;color:#1E293B"><b>${_e(funcaoDoPonto(g.m))}</b> <span style="color:#94A3B8">${NIVL[alturaOf(g.m)]||''}</span> <b style="color:#334155">×${g.qtd}</b>${cabo?`<br><span style="font-size:7px;color:#64748B;line-height:1.2">${_e(cabo)}</span>`:''}</span>
      </div>` }).join('')
    return `<div style="border:1px solid #CBD5E1;border-radius:6px;overflow:hidden">
      <div style="background:#0D1420;color:#fff;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:6px 8px">Legenda</div>
      <div style="padding:4px 8px;background:#fff">${linhas}</div>
    </div>`
  }

  // Página "parede da obra" (#4): planta completa GRANDE (A4 paisagem), só planta + legenda,
  // ancorada por aspect-ratio + object-fit:fill (pinos em % ficam exatos). Aparece 1× e por último.
  function buildWallPage(){
    if(!bgImage) return ''
    const _fo=fazFamOculta(hideFams)
    const _e=s=>String(s==null?'':s).replace(/</g,'&lt;')
    const dotsDe = mks => mks.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
      const f=cableFamily(familiaDoPontoTipo(m))
      const badge=(showCabo && !_fo(f.k))?`<div style="position:absolute;top:-3px;right:-3px;min-width:9px;height:9px;padding:0;border-radius:5px;background:${f.cor};color:#fff;font-size:6px;font-weight:800;line-height:9px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
      return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:22px;height:22px">${pinShapeSVG({m:m, mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||st.c,label:_pinLabel(m),size:22})}${badge}</div>`}).join('')
    // UMA página-parede por PAVIMENTO — SÓ a planta (sem legenda embaixo). Cada andar na sua
    // orientação natural. A legenda vem UMA vez só, numa folha final (Raphael): as duas plantas
    // primeiro, depois a legenda completa. Fora do .ex-plant → não passa pelo montaPranchas.
    const views=_docViewsPorPav().filter(v=>v.bg)
    const plantas=views.map(v=>{
      const _wr=v.ratio||imgRatio||0.66
      const tit = v.nome ? `PLANTA COMPLETA — MAPA DE PONTOS · PARA A OBRA · ${_e(v.nome)}` : 'PLANTA COMPLETA — MAPA DE PONTOS · PARA A OBRA'
      return `<div class="ex-wall-page" style="page:wallpage;page-break-before:always;text-align:center">
        <div style="font-family:'DM Sans',sans-serif;font-weight:800;font-size:14px;color:#0D1420;letter-spacing:.5px;margin-bottom:6px">${tit}</div>
        <div style="position:relative;margin:0 auto;max-width:100%;max-height:186mm;aspect-ratio:${(1/_wr).toFixed(4)};border:1px solid #bbb;overflow:hidden">
          <img src="${v.bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill"/>${dotsDe(v.mks)}
        </div>
      </div>`
    }).join('')
    if(!plantas) return ''
    // Legenda completa numa folha só, no fim (uma vez para todos os pavimentos).
    const legenda=`<div class="ex-wall-page" style="page:wallpage;page-break-before:always;text-align:left">
      <div style="font-family:'DM Sans',sans-serif;font-weight:800;font-size:14px;color:#0D1420;letter-spacing:.5px;margin-bottom:8px">LEGENDA — MAPA DE PONTOS</div>
      ${execVersao==='opus'?legendaOpusHtml():pontosLegenda()}
    </div>`
    return plantas + legenda
  }
  // LISTA DE EQUIPAMENTOS — montada aqui (escopo do componente) e anexada UMA vez pelo
  // buildFullHtml, no fim do documento final. Antes eu anexava dentro do buildExecHtml, mas os
  // sub-documentos (obra/conduítes) são extraídos e embutidos no Executivo, então a lista deles
  // vazava e aparecia 2-3×. Aqui é o único ponto de montagem do doc final: uma lista, sempre.
  function listaEquipamentosHtml(){
    const cont=new Map()
    ;(markers||[]).filter(m=>!isRackItem(m.name,m.code) && m.name).forEach(m=>{ const k=(m.name||'').trim(); if(k) cont.set(k,(cont.get(k)||0)+1) })
    const rk=((markers||[]).find(m=>isRackItem(m.name||'', m.code||''))||{}).rackEquip || []
    rk.forEach(e=>{ const k=(e.name||e.equip||'').trim(); if(k) cont.set(k,(cont.get(k)||0)+(Number(e.qty)||1)) })
    if(!cont.size) return ''
    const _e=s=>String(s==null?'':s).replace(/</g,'&lt;')
    const total=[...cont.values()].reduce((s,q)=>s+q,0)
    const rows=[...cont.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([n,q])=>`<tr><td>${_e(n)}</td><td style="text-align:center;font-weight:800">${q}</td></tr>`).join('')
    return `<div class="ex-sec ex-breakable" style="page-break-before:always">
      <h2 style="border-bottom:3px solid #0D1B2A;padding-bottom:8px;margin-bottom:10px">Lista de Equipamentos</h2>
      <p class="ex-p" style="color:#6B7280;margin-bottom:8px">Todos os equipamentos do projeto e suas quantidades — pontos na planta + equipamentos do rack. Total: <b>${total}</b> ${total===1?'item':'itens'}.</p>
      <table class="ex-tbl"><thead><tr><th>Equipamento</th><th>Qtd</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`
  }

  // ── PÓS-PROCESSADOR DE LAYOUT (WYSIWYG) ──────────────────────────────────────────
  // Roda no browser (prévia e exportação). Envolve cada planta num PALCO que emula a caixa de
  // margem da página (overflow:hidden = RECORTA o que passar) e aplica a transform da planta
  // (arrastar/zoom/alinhar) DENTRO do palco — nada vaza pra fora da margem nem quebra pra outra
  // página. Deslocamentos em % pra prévia e PDF baterem em qualquer escala. Também aplica os
  // mestres "ocultar todas as plantas / todas as tabelas". Se algo falhar, devolve o HTML cru.
  // Seletor ÚNICO de "isto é uma planta". .ex-plant é a planta clássica (imagem + pinos);
  // .ex-plant-fig são as figuras de proporção fixa (Elétrica, Mapa de Calor, Conduítes) que
  // antes ficavam INVISÍVEIS pro editor — não listavam, não arrastavam e não sumiam no
  // "ocultar todas as plantas". Duas classes porque o CSS de .ex-plant img quebraria essas.
  const PLANT_SEL='.ex-plant,.ex-plant-fig'

  // ── DOIS MODOS DE QUEBRA DE TEXTO (como no Word) ─────────────────────────────────
  // "Alinhado" (padrão): o palco ocupa espaço na página — aumentar a planta EMPURRA as
  // tabelas pra baixo, e o overflow:hidden recorta na margem.
  // "Em frente ao texto": o palco não ocupa espaço nenhum (height:0, overflow visível) e a
  // planta flutua POR CIMA do conteúdo, posicionável livremente. Nada é empurrado.
  const _MARGEM_PALCO={ left:'0 auto 0 0', center:'0 auto', right:'0 0 0 auto' }
  function aplicaPalco(stage, pl, t, ratio){
    const z=t.zoom||1, mg=_MARGEM_PALCO[plantAlign]||'0 auto'
    // Proporção da PRÓPRIA planta (por pavimento, gravada em data-mkratio); sem ela, usa a global.
    const _mkr = pl && pl.getAttribute && parseFloat(pl.getAttribute('data-mkratio'))
    if(_mkr && _mkr>0) ratio = _mkr
    if(t.front){
      stage.dataset.front='1'
      // z-index alto = fica na frente do texto; height:0 = não reserva espaço (não empurra nada)
      stage.setAttribute('style',`position:relative;width:${plantPct}%;margin:${mg};overflow:visible;height:0;z-index:5`)
    }else{
      delete stage.dataset.front
      // aspect-ratio INCLUI o zoom: com z>1 o palco fica mais ALTO, empurrando o conteúdo de
      // baixo pra baixo (reflow). Horizontal segue recortado (overflow) = trava de margem.
      stage.setAttribute('style',`position:relative;width:${plantPct}%;margin:${mg};overflow:hidden;aspect-ratio:${(1/(ratio*z)).toFixed(4)};background:#fff`)
    }
  }
  function aplicaPlanta(pl, t){
    if(!pl) return
    const z=t.zoom||1
    pl.style.position='absolute'; pl.style.left='50%'
    pl.style.width='100%'; pl.style.maxWidth='100%'; pl.style.margin='0'; pl.style.display='block'
    if(t.front){
      // ancorada no topo: cresce pra baixo a partir do ponto do texto onde ela está
      pl.style.top='0'; pl.style.transformOrigin='center top'
      pl.style.transform=`translate(calc(-50% + ${t.x||0}%), calc(${t.y||0}%)) scale(${z}) rotate(${t.rot||0}deg)`
    }else{
      pl.style.top='50%'; pl.style.transformOrigin='center center'
      pl.style.transform=`translate(calc(-50% + ${t.x||0}%), calc(-50% + ${t.y||0}%)) scale(${z}) rotate(${t.rot||0}deg)`
    }
  }
  // Nas PRANCHAS (Compacta/impressão) a planta de IMAGEM SIMPLES (.ex-plant) vira uma UNIDADE limpa:
  // bloco relativo (inline-block), a imagem cabe na caixa mantendo o aspecto (max-width/height), e os
  // pinos (position:absolute em %) são % da PRÓPRIA planta. Isso cola os pinos na imagem em QUALQUER
  // mídia — no PDF/impressão a montagem antiga (palco com aspect-ratio + planta absoluta) recalculava
  // diferente e os pinos de baixo (a câmera do muro) se soltavam pra fora (Elton/Raphael). O
  // .ex-plant-fig (elétrica: padding-box + object-fit) já é auto-colado, então fica como está.
  function _colaPlanta(stage, maxH){
    try{
      const pl=stage.querySelector('.ex-plant'); if(!pl) return
      pl.style.cssText='position:relative;display:inline-block;max-width:100%;max-height:'+maxH+';margin:0;vertical-align:top;overflow:hidden'
      const im=pl.querySelector('img')
      if(im){ im.style.setProperty('width','auto','important'); im.style.setProperty('height','auto','important'); im.style.setProperty('max-width','100%','important'); im.style.setProperty('max-height',maxH,'important') }
      stage.style.height='auto'; stage.style.aspectRatio='auto'
    }catch(_){}
  }
  // Converte as seções COM planta em pranchas paisagem (planta grande à esquerda, legenda na
  // coluna direita, título no topo) e ESCONDE as seções sem planta. Roda só no modo "ocultar
  // tabelas". Um <div.ex-plant-stage> = uma planta = uma folha (então cada pavimento sai numa
  // página, porque cada andar já é um .ex-plant separado).
  function montaPranchas(doc){
    const legendaLateral = legendaLateralHtml()
    const secoes=[...doc.querySelectorAll('.ex-sec, .ex-obra-page')].filter(s=>s.style.display!=='none')
    let primeira=true
    secoes.forEach(sec=>{
      const stages=[...sec.querySelectorAll('.ex-plant-stage')].filter(s=>s.style.display!=='none')
      // título: h2 numerado; se não houver (páginas de cabo têm só h3/cabeçalho), cai no h3
      // ou no cabeçalho grande da família ("Planta e Cabos — Keystone").
      let tituloTxt=(sec.querySelector('h2')?.textContent||'').replace(/^\s*\d+\s*/,'').trim()
      if(!tituloTxt){ const h3=[...sec.querySelectorAll('h3')].find(h=>h.style.display!=='none'&&h.textContent.trim())
        tituloTxt=(h3?.textContent||'').trim() }
      // páginas de cabo por família: o nome está no cabeçalho GRANDE (div font-size:20px do
      // _famHeader), não num h2/h3. Sem isto elas saem como "Planta" genérico.
      if(!tituloTxt){ const big=[...sec.querySelectorAll('div')].find(x=>/font-size:20px/.test(x.getAttribute('style')||'')&&x.textContent.trim().length>2&&x.textContent.trim().length<40)
        if(big) tituloTxt='Planta e Cabos — '+big.textContent.trim() }
      if(!stages.length){ sec.style.display='none'; return }  // seção sem planta: some (só planta)
      const frag=doc.createDocumentFragment()
      stages.forEach(stage=>{
        // rótulo do pavimento: h3 logo antes do palco (Planta de Pontos põe "Pavimento X · N pontos")
        let pav=''
        let p=stage.previousElementSibling
        while(p && p.style && p.style.display==='none') p=p.previousElementSibling
        if(p && /^H3$/.test(p.tagName)){ pav=p.textContent.trim(); p.style.display='none' }
        // barra escura das figuras (Elétrica/Wi-Fi): usa como subtítulo e remove do fluxo
        const cap=stage.previousElementSibling
        if(cap && cap.classList && cap.classList.contains('ex-plant-head')) cap.style.display='none'
        // CABE NA FOLHA mantendo o aspecto: o container tem ALTURA fixa (altura útil da folha), o
        // palco herda essa altura (height:100%) e a largura sai do aspect-ratio, limitada a 100%.
        // Assim uma planta girada pra retrato encolhe pra caber numa página só — não QUEBRA em duas
        // (era o bug: a parte de baixo ia pra outra página levando os pinos junto). Aspecto mantido
        // = pinos (em %) continuam colados na planta.
        stage.style.height='100%'; stage.style.width='auto'; stage.style.maxWidth='100%'
        stage.style.margin='0'; stage.style.breakInside='avoid'
        _colaPlanta(stage, '176mm')  // planta = imagem + pinos colados (não solta no PDF)
        const page=doc.createElement('div')
        page.className='ex-prancha ex-obra-page'
        page.setAttribute('style',`page:wallpage;${primeira?'':'page-break-before:always;'}break-inside:avoid;page-break-inside:avoid`)
        primeira=false
        const tTop=[tituloTxt, pav.replace(/·.*$/,'').trim()].filter(Boolean).join(' — ')
        page.innerHTML=`<h2 style="margin:0 0 8px;border-bottom:2px solid #0D1420;padding-bottom:6px;font-size:18px">${tTop.replace(/</g,'&lt;')||'Planta'}</h2>
          <div class="ex-prancha-row" style="display:flex;gap:12px;align-items:flex-start">
            <div class="ex-prancha-plant" style="flex:1;min-width:0;display:flex;justify-content:center">
              <div class="ex-prancha-inner" style="height:176mm;max-width:100%;display:flex;justify-content:center;align-items:flex-start"></div></div>
            <div style="width:236px;flex-shrink:0">${legendaLateral}</div>
          </div>`
        page.querySelector('.ex-prancha-inner').appendChild(stage)
        frag.appendChild(page)
      })
      sec.replaceWith(frag)
      primeira=false
    })
  }
  // Título de uma seção com planta (h2 numerado > h3 > cabeçalho grande da família).
  function _tituloSecao(sec){
    // h3 de PAVIMENTO ("Térreo · 8 pontos") não é título de seção — foi adicionado pelo multi-andar
    // (plantasPorPav). Se ele fosse tratado como título, a Compacta não casava a KEEP e esvaziava.
    const _ehCabecalhoPav = h => /·\s*\d+\s*pontos?\b/i.test(h.textContent||'')
    let t=(sec.querySelector('h2')?.textContent||'').replace(/^\s*\d+\s*/,'').trim()
    if(!t){ const h3=[...sec.querySelectorAll('h3')].find(h=>h.style.display!=='none'&&h.textContent.trim()&&!_ehCabecalhoPav(h)); t=(h3?.textContent||'').trim() }
    if(!t){ const big=[...sec.querySelectorAll('div')].find(x=>/font-size:20px/.test(x.getAttribute('style')||'')&&x.textContent.trim().length>2&&x.textContent.trim().length<40); if(big) t='Planta e Cabos — '+big.textContent.trim() }
    return t
  }
  // ── PLANO DE OBRA "COMPACTA" (Raphael) ───────────────────────────────────────────
  // Só as plantas-chave, uma por página (e um pavimento por página): Planta Completa (com
  // legenda, sem tabelas), Redes (cabos+conduítes, sem tabelas), Som (cabos+conduítes, sem
  // tabelas) e Itens no Teto (COM a tabela). O resto some. É a versão pra imprimir e pregar.
  function montaCompacta(doc){
    const KEEP=[
      {re:/planta de pontos|planta completa|planta de itens|planta com todos/i, tabela:false, leg:true},
      {re:/el[ée]trica|nbr ?5444/i, tabela:false, leg:true}, // (Raphael) planta elétrica na Compacta, por pavimento + legenda ao lado
      {re:/redes|cabeamento estruturado/i, tabela:false, leg:true}, // (Raphael #3) legenda compacta ao lado
      {re:/(cabos|planta).*som|som.*(cabos|planta)|— som\b/i, tabela:false, leg:true}, // (Raphael #3) idem
      {re:/teto|forro/i, tabela:true, leg:false},
    ]
    const secoes=[...doc.querySelectorAll('.ex-sec, .ex-obra-page')]
    let primeira=true
    secoes.forEach(sec=>{
      if(sec.style.display==='none') return
      const stages=[...sec.querySelectorAll('.ex-plant-stage')].filter(s=>s.style.display!=='none')
      const titulo=_tituloSecao(sec)
      const keep=KEEP.find(k=>k.re.test(titulo))
      if(!stages.length || !keep){ sec.style.display='none'; return } // fora da lista → some
      // tabelas: só o Teto mantém; nas outras, esconde
      const tabelasHtml = keep.tabela ? [...sec.querySelectorAll('table')].map(t=>t.outerHTML).join('') : ''
      const frag=doc.createDocumentFragment()
      stages.forEach(stage=>{
        let pav=''; let p=stage.previousElementSibling
        while(p && p.style && p.style.display==='none') p=p.previousElementSibling
        if(p && /^H3$/.test(p.tagName)){ pav=p.textContent.trim() }
        const cap=stage.previousElementSibling
        if(cap && cap.classList && cap.classList.contains('ex-plant-head')) cap.style.display='none'
        // Planta ocupa a folha inteira. A tabela do Teto NÃO fica mais embaixo da planta — vai
        // numa PÁGINA SÓ depois das plantas dos pavimentos (Raphael #2).
        const maxH = '176mm'
        // Legenda lateral SÓ com os itens DESTA planta (uids gravados na geração via data-mkuids).
        // Assim Redes mostra só rede, Som só som, e cada pavimento só os seus (Raphael).
        const _plantEl=stage.querySelector('.ex-plant,.ex-plant-fig')
        // data-mkuids é STRING (uids separados por vírgula → split dá strings). O uid do marker pode
        // ser NÚMERO — e Set<string>.has(number) dá false, derrubando esses pontos da legenda (o bug
        // do Elton: Som sumia inteiro, Completa só mostrava o teto). Comparar SEMPRE como string.
        const _uids=new Set((((_plantEl&&_plantEl.getAttribute('data-mkuids'))||'').split(',')).filter(Boolean))
        const _sub = _uids.size ? markers.filter(m=>_uids.has(String(m.uid))) : null
        const legendaLateral = keep.leg ? legendaLateralHtml(_uids.size?_sub:undefined) : ''
        stage.style.height='100%'; stage.style.width='auto'; stage.style.maxWidth='100%'
        stage.style.margin='0'; stage.style.breakInside='avoid'
        // PLANTA COMO UNIDADE LIMPA (imagem + pinos colados). O palco (aspect-ratio) + planta
        // absoluta recalculava diferente NO PRINT e DESGRUDAVA os pinos (a câmera de baixo descia
        // pra fora). A .ex-plant vira um bloco RELATIVO: a imagem cabe na caixa (aspecto natural,
        // max-width/height) e os pinos são % da PRÓPRIA planta — colam igual em tela e PDF. O
        // .ex-plant-fig (elétrica) já é auto-colado (padding-box+object-fit), segue no palco.
        _colaPlanta(stage, maxH)
        const page=doc.createElement('div')
        page.className='ex-prancha ex-obra-page'
        page.setAttribute('style',`page:wallpage;${primeira?'':'page-break-before:always;'}break-inside:avoid;page-break-inside:avoid`)
        primeira=false
        const tTop=[titulo, pav.replace(/·.*$/,'').trim()].filter(Boolean).join(' — ')
        // Com legenda (só na Planta Completa) → planta à esquerda + legenda à direita.
        // Sem legenda → planta ocupa a folha toda. Teto: a tabela entra abaixo da planta.
        page.innerHTML=`<h2 style="margin:0 0 8px;border-bottom:2px solid #0D1420;padding-bottom:6px;font-size:18px">${tTop.replace(/</g,'&lt;')||'Planta'}</h2>
          <div class="ex-prancha-row" style="display:flex;gap:12px;align-items:flex-start">
            <div class="ex-prancha-plant" style="flex:1;min-width:0;display:flex;justify-content:center"><div class="ex-prancha-inner" style="height:${maxH};max-width:100%;display:flex;justify-content:center;align-items:flex-start"></div></div>
            ${keep.leg?`<div style="width:236px;flex-shrink:0">${legendaLateral}</div>`:''}
          </div>`
        page.querySelector('.ex-prancha-inner').appendChild(stage)
        frag.appendChild(page)
      })
      // Tabela (só o Teto tem, keep.tabela): numa PÁGINA SÓ, DEPOIS das plantas de todos os
      // pavimentos, com os itens dos dois andares juntos (Raphael #2).
      if(tabelasHtml){
        const tPage=doc.createElement('div')
        tPage.className='ex-obra-page'
        tPage.setAttribute('style','page-break-before:always;break-inside:avoid')
        tPage.innerHTML=`<h2 style="margin:0 0 10px;border-bottom:2px solid #0D1420;padding-bottom:6px;font-size:18px">${(titulo||'Itens no Teto').replace(/</g,'&lt;')} — Tabela</h2>${tabelasHtml}`
        frag.appendChild(tPage)
      }
      sec.replaceWith(frag)
    })
  }
  // "Documento ficou em branco?" — sem texto visível E sem nenhuma figura/tabela. Usado pra
  // desfazer a Compacta/Prancha quando elas esvaziam tudo (títulos que não bateram etc.).
  function _pareceVazioDoc(d){
    try{ return !((d.body.textContent||'').trim()) && !d.body.querySelector('img,svg,table') }
    catch(_){ return false }
  }
  function applyLayout(html, opts={}){
    if(typeof DOMParser==='undefined') return html
    try{
      const doc=new DOMParser().parseFromString(html,'text/html')
      // Proporção EFETIVA: quando a planta é girada (Paisagem/Retrato) o _docView já entrega a
      // imagem girada e os pinos convertidos — o palco precisa usar 1/imgRatio, senão o quadro
      // fica com aspecto errado e os pinos saem do lugar (bug que o Raphael viu no Retrato).
      const _girou = (()=>{ try{ return _precisaGirar() && !!rotBg }catch(_){ return false } })()
      const ratio = _girou ? (1/(imgRatio||0.75)) : (imgRatio||0.66)
      let pi=0
      doc.querySelectorAll(PLANT_SEL).forEach(pl=>{
        if(pl.closest('.ex-wall-page')) return // a folha-parede tem palco próprio (A4 paisagem)
        if(pl.closest('.ex-plant-stage')) return // já dentro de um palco (aninhamento) — ignora
        const pkey=_plantKey(pi); const t=_plantT(pi); pi++
        const stage=doc.createElement('div')
        stage.className='ex-plant-stage'
        stage.dataset.pkey=pkey  // cada planta endereçável (arrastar/zoom direto na prévia)
        aplicaPalco(stage, pl, t, ratio)
        pl.parentNode.insertBefore(stage,pl)
        stage.appendChild(pl)
        aplicaPlanta(pl, t)
        if(hideAllPlants){ stage.style.display='none'
          // a barra escura ("PLANTA ELÉTRICA…", "COBERTURA Wi-Fi…") é a tampa da figura:
          // some junto, senão fica o resquício que o Raphael reclamou.
          const cap=stage.previousElementSibling
          if(cap && cap.classList.contains('ex-plant-head')) cap.style.display='none' }
      })
      // COMPACTA (Plano de Obra): cura as seções e devolve já pronto — pula o resto do pipeline.
      // Só no PLANO DE OBRA (a lista KEEP é de plantas de obra); no Completo/Elétrica/Conduítes ela
      // destruiria o documento. Assim dá pra deixar a Compacta LIGADA por padrão sem estragar os outros.
      if(compactaObra && execMode==='obra'){
        // montaCompacta MUTA o doc (esconde seções, move plantas). Se estourar no meio, o doc fica
        // meio-esvaziado e a prévia sai EM BRANCO. Snapshot antes → restaura se falhar, caindo no
        // layout normal em vez de página vazia (era a causa do "às vezes vem em branco", Raphael).
        const _snap=doc.body.innerHTML
        try{ montaCompacta(doc)
          // Se a Compacta ESVAZIOU o documento (nenhuma seção casou com a lista KEEP — pode
          // acontecer quando os títulos não batem), NÃO devolve página em branco: cai no doc
          // normal (não-compacto). É melhor mostrar o documento inteiro do que uma folha vazia.
          if(_pareceVazioDoc(doc)) throw new Error('compacta esvaziou o documento')
        }catch(e){ console.warn('compacta:',e.message); doc.body.innerHTML=_snap }
        return '<!doctype html>'+doc.documentElement.outerHTML }
      if(hideAllTables){
        // Esconde TODA tabela (não só as .ex-tbl) E os rótulos/cabeçalhos coladinhos nela (o título
        // h3 e os cabeçalhos coloridos do makeBlock que vivem FORA da <table>), pra não sobrar
        // resquício (Raphael: "ocultar tudo, não ficar resquício").
        const escondeRotulosAntes=(el)=>{ let p=el.previousElementSibling
          while(p){ const tag=p.tagName
            if(!/^(H3|H4|DIV|P)$/.test(tag)) break
            if(p.querySelector('table,img,.ex-plant,.ex-plant-fig,.ex-plant-stage')) break
            if((p.textContent||'').trim().length>90) break
            const ant=p.previousElementSibling; p.style.display='none'; p=ant } }
        doc.querySelectorAll('table').forEach(t=>{ t.style.display='none'; escondeRotulosAntes(t) })
        // Colapsa contêineres que ficaram SEM nada visível (ex.: os wrappers por cômodo das Cenas,
        // que só tinham um rótulo + a tabela). Multi-passada pra propagar de baixo pra cima.
        let mudou=true, guard=0
        while(mudou && guard++<6){ mudou=false
          doc.querySelectorAll('div,section').forEach(el=>{ if(el.style.display==='none') return
            if(el.querySelector('img,svg,.ex-plant,.ex-plant-fig,.ex-plant-stage')) return
            if(el.children.length===0) return // sem filhos = texto próprio (badge, nota) → mantém
            if([...el.children].some(c=>c.style.display!=='none')) return // ainda tem filho visível
            el.style.display='none'; mudou=true }) }
        // Títulos órfãos que sobraram (a seção virou só o título): h3/h4 cujo próximo visível é
        // outro título ou nada → some também.
        ;[...doc.querySelectorAll('h3,h4')].forEach(h=>{ if(h.style.display==='none') return
          let n=h.nextElementSibling; while(n && n.style.display==='none') n=n.nextElementSibling
          if(!n || /^H[1-4]$/.test(n.tagName)) h.style.display='none' })
        // ── PRANCHA: com as tabelas fora, cada planta vira uma folha paisagem — título + planta
        // GRANDE + legenda na lateral, um pavimento por página (Raphael). Some tudo que não é
        // planta; a planta ganha a página.
        // Mesma proteção da Compacta: se montaPranchas estourar no meio, restaura o doc pré-prancha
        // (com tabelas ocultas) em vez de devolver uma página meio-montada/em branco.
        const _snapPr=doc.body.innerHTML
        try{ montaPranchas(doc)
          if(_pareceVazioDoc(doc)) throw new Error('pranchas esvaziou o documento')
        }catch(e){ console.warn('pranchas:',e.message); doc.body.innerHTML=_snapPr }
      }
      // ── BLOCOS COMO OBJETOS (Fase 4): ocultar e reordenar blocos de topo ──
      const body=doc.body
      const blocos=[...body.children].filter(_ehBlocoDoc)
      blocos.forEach((el,i)=>{ el.dataset.bkey=blocoKeyOf(el,i) })
      if(blockHidden&&blockHidden.size) blocos.forEach(el=>{ if(blockHidden.has(el.dataset.bkey)) el.style.display='none' })
      if(blockOrder&&blockOrder.length){
        const byKey={}; blocos.forEach(el=>{ byKey[el.dataset.bkey]=el })
        const naOrdem=blockOrder.map(k=>byKey[k]).filter(Boolean)
        const resto=blocos.filter(el=>!blockOrder.includes(el.dataset.bkey))
        ;[...naOrdem,...resto].forEach(el=>body.appendChild(el)) // reanexa na nova ordem
      }
      // ── GUIAS DE QUEBRA DE PÁGINA (só na prévia) ──────────────────────────────────
      // Linhas vermelhas a cada altura de página A4, pra o Raphael saber onde o PDF vai quebrar.
      // A largura do corpo da prévia representa a área útil A4 (186mm); altura útil = 273mm.
      // pageH(px) = larguraCorpo(px) × 273/186. Desenhado com repeating-linear-gradient no corpo.
      if(opts.preview && showBreaks){
        const bodyW = _pgIsA3PreviewWidth() // largura em px que o corpo da prévia assume
        const pageH = Math.round(bodyW * (273/186))
        const st=doc.createElement('style')
        st.textContent=`body{background-image:repeating-linear-gradient(to bottom, transparent 0, transparent ${pageH-2}px, rgba(220,38,38,.32) ${pageH-2}px, rgba(220,38,38,.32) ${pageH}px)!important;background-attachment:local}
          .ex-pgbrk-badge{position:absolute;left:0;right:0;text-align:center;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:700;color:#DC2626;pointer-events:none}`
        doc.head.appendChild(st)
        // rótulos "quebra de página" nas linhas (algumas, pra não poluir)
        const n=Math.min(20, Math.floor((doc.body.scrollHeight||pageH*6)/pageH))
        let badges=''
        for(let i=1;i<=n;i++){ badges+=`<div class="ex-pgbrk-badge" style="top:${i*pageH-14}px">— quebra de página ${i+1} —</div>` }
        const wrap=doc.createElement('div'); wrap.style.cssText='position:absolute;top:0;left:0;width:100%;height:0'; wrap.innerHTML=badges
        doc.body.style.position='relative'; doc.body.appendChild(wrap)
      }
      return '<!doctype html>'+doc.documentElement.outerHTML
    }catch(e){ console.warn('applyLayout falhou:',e.message); return html }
  }
  // Largura (px) que o CORPO da prévia assume — bate com o _previewCss (703 retrato / 1512 largo).
  function _pgIsA3PreviewWidth(){ return (execMode==='obra'||execMode==='eletrica'||execMode==='conduites') ? 1512 : 703 }
  // É um bloco de conteúdo do documento? (exclui script/style, vazios e a marca d'água do demo)
  function _ehBlocoDoc(el){
    if(!el||el.nodeType!==1) return false
    if(/^(SCRIPT|STYLE)$/.test(el.tagName)) return false
    if(el.getAttribute&&el.getAttribute('aria-hidden')==='true') return false
    if(/position:\s*fixed/.test(el.getAttribute?.('style')||'')) return false
    return !!el.textContent.trim()
  }
  // Chave estável de um bloco de topo: título (h1/h2) OU início do texto — sobrevive à regeneração.
  function blocoKeyOf(el,i){
    const h=el.querySelector('h1,h2,h3')
    const t=(h?h.textContent:el.textContent).trim().replace(/\s+/g,' ').slice(0,48)
    return t ? t.toLowerCase() : ('bloco-'+i)
  }
  // Rótulo amigável de um bloco (pro painel de Blocos). Separa o número da seção que vem colado
  // no título ("7Cabeamento" → "7 · Cabeamento").
  function blocoLabelOf(el){
    const h=el.querySelector('h1,h2,h3')
    if(h) return h.textContent.trim().replace(/\s+/g,' ').replace(/^(\d+)(?=\S)/,'$1 · ').slice(0,42)
    if(el.querySelector(PLANT_SEL)) return 'Planta'
    if(el.querySelector('.ex-tbl,table')) return 'Tabela'
    return (el.textContent.trim().replace(/\s+/g,' ').slice(0,42))||'Bloco'
  }
  // Lista os blocos de topo do documento atual (pro painel). Usa o HTML cru (antes do applyLayout).
  function enumDocBlocks(){
    if(typeof DOMParser==='undefined') return []
    try{
      const doc=new DOMParser().parseFromString(buildFullHtml(false),'text/html')
      const blocos=[...doc.body.children].filter(_ehBlocoDoc)
      return blocos.map((el,i)=>({ key:blocoKeyOf(el,i), label:blocoLabelOf(el), plant:!!el.querySelector(PLANT_SEL), table:!!el.querySelector('.ex-tbl,table') }))
    }catch(e){ return [] }
  }
  // Lista as PLANTAS do documento atual (índice + rótulo), na mesma ordem que o applyLayout numera.
  function enumPlants(){
    if(typeof DOMParser==='undefined') return []
    try{
      const doc=new DOMParser().parseFromString(buildFullHtml(false),'text/html')
      const plants=[...doc.querySelectorAll(PLANT_SEL)].filter(pl=>!pl.closest('.ex-wall-page'))
      return plants.map((pl,i)=>{ const sec=pl.closest('.ex-sec,.ex-obra-page'); const h=sec&&sec.querySelector('h1,h2,h3')
        const lbl=h?h.textContent.trim().replace(/\s+/g,' ').replace(/^(\d+)(?=\S)/,'$1 · ').slice(0,34):('Planta '+(i+1))
        const img=(pl.querySelector('img')?.getAttribute('src'))||null
        return { i, label:lbl, img } })
    }catch(e){ return [] }
  }

  // ── MESCLA DE ANEXOS NO PROJETO EXECUTIVO ────────────────────────────────────────
  // O Completo colava o Plano de Obra INTEIRO — com capa e tudo — no meio do documento
  // (a "junção que não faz sentido"). Aqui o anexo entra como CONTINUAÇÃO: sem a capa,
  // sem o <style> repetido, e SEM as seções cujo título o documento principal já tem —
  // é essa a trava contra repetir informação.
  const _tituloChave = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/^\s*\d+[\.\)]?\s*/,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase()

  // Chaves de identidade de um pedaço: o h2 quando existe; senão os h3/.ex-amb (as páginas de
  // planta do Plano de Obra não têm h2 — só "Planta e Cabos — Dados" em h3 — e era por aí que a
  // repetição escapava). Prefixo separa os níveis pra um h3 não casar com um h2 homônimo.
  function chavesDe(el){
    const h2=[...el.querySelectorAll('h2')].map(h=>'h2:'+_tituloChave(h.textContent)).filter(k=>k!=='h2:')
    if(h2.length) return h2
    return [...el.querySelectorAll('h3,.ex-amb')].map(h=>'h3:'+_tituloChave(h.textContent)).filter(k=>k!=='h3:')
  }

  // Lê os títulos que um HTML já apresenta — alimenta o "já visto" do documento principal.
  function titulosDe(html){
    const out=new Set()
    if(typeof DOMParser==='undefined'||!html) return out
    try{ const d=new DOMParser().parseFromString(html,'text/html')
      d.querySelectorAll('h2').forEach(h=>{ const k=_tituloChave(h.textContent); if(k) out.add('h2:'+k) })
      d.querySelectorAll('h3,.ex-amb').forEach(h=>{ const k=_tituloChave(h.textContent); if(k) out.add('h3:'+k) })
    }catch(_){}
    return out
  }

  // Devolve o corpo do anexo pronto pra concatenar (string vazia se não sobrou nada útil).
  function mesclaAnexo(html, rotulo, vistos, descartar=[]){
    if(!html || typeof DOMParser==='undefined') return ''
    try{
      const fora=new Set(descartar.flatMap(t=>['h2:'+_tituloChave(t),'h3:'+_tituloChave(t)]))
      const doc=new DOMParser().parseFromString(html,'text/html')
      doc.querySelectorAll('style').forEach(s=>s.remove())      // CSS já veio do principal
      doc.querySelectorAll('.ex-cover,.ex-doc-cover').forEach(c=>c.remove()) // adeus capa colada
      const raiz=doc.querySelector('.ex-doc')||doc.body
      let manteve=0
      ;[...raiz.children].forEach(el=>{
        const chaves=chavesDe(el)
        if(!chaves.length) return // pedaço sem título nenhum (nota, rodapé) — mantém
        // sai se TODO título dele já apareceu no documento, ou se está na lista de descarte
        // (mesmo conteúdo com outro nome — ex.: "Planta — Itens no Teto" = tópico 6)
        if(chaves.every(k=>vistos.has(k)||fora.has(k))){ el.remove(); return }
        chaves.forEach(k=>vistos.add(k)); manteve++
      })
      // nada de próprio sobrou → nem divisor: anexo vazio é ruído, não informação
      if(!manteve) return ''
      const corpo=raiz.innerHTML.trim()
      if(!corpo) return ''
      const divisor=`<div class="ex-sec" style="border:none;page-break-before:always;break-before:page">
        <div style="font-size:10px;letter-spacing:2px;color:#B0854C;font-weight:700;margin-bottom:2px">CONTINUAÇÃO DO PROJETO EXECUTIVO</div>
        <h2 style="margin-top:0">${String(rotulo||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</h2></div>`
      return divisor+corpo
    }catch(e){ console.warn('mesclaAnexo falhou:',e.message); return '' }
  }

  function buildFullHtml(preview=false){
    const cliNome=(projectInfo.client||fromProposal?.client_name||'Cliente').replace(/[\\/:*?"<>|]/g,'')
    const codigo=(fromProposal?.code||'').replace(/[\\/:*?"<>|]/g,'')
    const nomeDoc = execMode==='obra' ? 'Plano de Obra' : execMode==='eletrica' ? 'Planta Elétrica' : execMode==='conduites' ? 'Conduites' : 'Projeto Executivo'
    const tituloPdf=`${nomeDoc} — RARO Home — ${cliNome}${codigo?' — '+codigo:''}`
    const _fresh = (m,emb=false) => { if(!execData) return null; try{ return buildExecHtml(execData, m, undefined, emb) }catch(e){ console.warn('rebuild export falhou:',e.message); return null } }
    // No Completo, a obra entra como anexo ENXUTO (sem repetir planta/posição-altura que o corpo já tem)
    const _full=_fresh('completo')|| execDoc, _obra=_fresh('obra', execMode==='completo')||execDocObra,
          _ele=_fresh('eletrica')||execDocEletrica, _cond=_fresh('conduites')||execDocConduites,
          _inst=_fresh('instalacao')||execDocInstal
    // Tamanho/alinhamento da planta agora são do applyLayout (palco). Aqui fica vazio pra o
    // !important antigo não brigar com o palco.
    const _plantSizeCss = ''
    let body, pageCss
    if(execMode==='completo'){
      // Mesmo @page dos outros documentos (Raphael: o PE tinha margem diferente). O bleed da capa
      // (.ex-doc-cover margin:-12mm) foi removido pra a margem bater com o resto.
      pageCss='@page{size:A4;margin:12mm} .ex-plant img{max-height:250mm!important} @page wallpage{size:A4 landscape;margin:6mm}'+_plantSizeCss
      // O Projeto Executivo é o documento COMPLETO: traz o que Obra, Instalação, Elétrica e
      // Conduítes têm de próprio. Cada anexo entra sem capa e sem as seções que o corpo já
      // apresentou — o mesclaAnexo mantém o registro do que já foi dito (Raphael: "precisa ter
      // todas as informações de todos os documentos, mas sem repetir").
      const vistos=titulosDe(_full||'')
      // "Planta — Itens no Teto" (obra) e "Plano de Instalação" (título do próprio anexo) são o
      // mesmo conteúdo com outro nome — o dedupe por título não pega, então vão na mão.
      const anexos = mesclaAnexo(_obra,'Plano de Obra — cabos e infraestrutura',vistos,['Planta — Itens no Teto'])
        + mesclaAnexo(_ele,'Planta Elétrica — NBR 5444 e quadro de cargas',vistos)
        // Conduítes NÃO entra: o tópico 7 (Cabeamento e Conduítes) já cobre os caminhos por
        // família — o relatório era o mesmo conteúdo em outro nível de detalhe (decisão do
        // Raphael). Continua saindo inteiro no documento "Conduítes", à parte.
        + mesclaAnexo(_inst,'Plano de Instalação — ponto a ponto, testes e entrega',vistos,['Plano de Instalação'])
      body = (_full||'') + anexos + listaEquipamentosHtml() + buildWallPage()
    } else {
      // TUDO A4 (Raphael). Obra, elétrica e conduítes saíam em A3 PAISAGEM — só o Completo era
      // A4. Era a origem do "Para impressão em A3" que abria o Plano de Obra, e da diferença de
      // escala entre os documentos. A folha da parede segue A4 paisagem: ela é uma só, pra pregar.
      pageCss = '@page{size:A4;margin:12mm} .ex-plant img{max-height:250mm!important} @page wallpage{size:A4 landscape;margin:6mm}'+_plantSizeCss
      body = ((execMode==='obra'?_obra:execMode==='eletrica'?_ele:execMode==='conduites'?_cond:execMode==='instalacao'?_inst:_full)||'') + listaEquipamentosHtml()
      // wall page só no Plano de Obra (e no executivo/completo acima), por último
      if(execMode==='obra') body += buildWallPage()
    }
    const fontLink='<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;1,500&display=swap" rel="stylesheet">'
    const fluido='<style>.ex-sec,.ex-sec.ex-breakable,.ex-obra-page,.ex-doc-cover,.ex-cover{page-break-before:auto!important;page-break-inside:auto!important;break-before:auto!important;break-inside:auto!important;min-height:0!important}.ex-doc-cover,.ex-cover{margin:0!important}</style>'
    // Quebras de página inteligentes: título NUNCA fica órfão (cola no conteúdo seguinte),
    // planta/figura não parte no meio, linha de tabela não corta, cabeçalho de tabela repete.
    const quebras='<style>'
      +'h2,h3,h4,.ex-amb{break-after:avoid!important;page-break-after:avoid!important}'
      +'.ex-plant,.ex-plant-fig,.ex-plant-wrap,.ex-plant-stage{break-inside:avoid!important;page-break-inside:avoid!important}'
      +'.ex-plant img,.ex-obra-page img{break-inside:avoid!important}'
      +'div[style*="padding-bottom:"][style*="position:relative"]{break-inside:avoid!important;page-break-inside:avoid!important}'
      +'.ex-p{orphans:3;widows:3}'
      +'.ex-tbl tr,.ex-tbl thead,tbody tr{break-inside:avoid!important}.ex-tbl thead{display:table-header-group}'
      +'</style>'
    const _pgIsA3 = (execMode==='obra'||execMode==='eletrica'||execMode==='conduites')
    const _previewCss = preview ? `<style>html{background:#525659}body{max-width:${_pgIsA3?1512:703}px;margin:10px auto!important;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.35);padding:0 8px}</style>` : ''
    return `<html><head><title>${tituloPdf}</title><meta charset="utf-8">${fontLink}
      <style>${pageCss} body{margin:0}${execVersao==='opus'?EXEC_CSS_OPUS:execVersao==='fable'?EXEC_CSS_FABLE:execVersao==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>${fluido}${quebras}${_previewCss}</head><body>
      ${demoWatermark()}
      ${body}
      </body></html>`
  }
  async function exportPdf(){
    const w=window.open('','_blank')
    if(!w){ alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.'); return }
    // Editando: exporta o HTML VIVO da prévia (com as edições de texto/tabela feitas à mão).
    let html=null
    if(docEditMode){ try{ const ifr=previewIframeRef.current; if(ifr&&ifr.contentDocument) html='<!doctype html>'+ifr.contentDocument.documentElement.outerHTML }catch(_){} }
    w.document.write(html || applyLayout(buildFullHtml()))
    w.document.close(); setTimeout(()=>w.print(),700)
  }
  // preview ao vivo: regenera o HTML quando qualquer opção muda (só enquanto o editor está aberto).
  // Enquanto EDITANDO, a prévia fica congelada (editFrozenHtml) pra não apagar as edições do usuário.
  const pdfPreviewHtml = useMemo(()=>{
    if(!(showPdfOpts||showDocEditor)) return ''
    // Guarda: se a geração/layout estourar, mostra um aviso DENTRO da prévia em vez de derrubar
    // o editor inteiro no error boundary (ou sair em branco). O console.error dá o erro real.
    try{ return applyLayout(buildFullHtml(true), {preview:true}) }
    catch(e){ console.error('[prévia] falha ao gerar o documento:', e)
      return `<!doctype html><html><body style="font-family:sans-serif;padding:40px;color:#334155;line-height:1.5">
        <h2 style="color:#B45309;margin:0 0 8px">Não consegui montar a prévia deste documento</h2>
        <p style="margin:0 0 8px">Erro: <code style="background:#F1F5F9;padding:2px 5px;border-radius:4px">${String((e&&e.message)||e).replace(/</g,'&lt;').slice(0,300)}</code></p>
        <p style="margin:0;color:#64748B">Tente <b>Regerar</b> o documento ou trocar de modo (Completo/Obra/Elétrica/Conduítes). Se persistir, me manda esse texto do erro.</p>
      </body></html>` }
  },
    // NÃO inclui plantTransforms/plantPct/plantAlign: mexer na planta NÃO pode regerar o documento
    // inteiro (era isso que fazia o iframe recarregar e dar aquele "blink"/reset de rolagem).
    // Essas mudanças são aplicadas ao vivo no DOM da prévia pelo efeito _patchPlantasNaPrevia.
    [showPdfOpts, showDocEditor, showLegenda, legendaCompacta, compactaObra, showIdsPdf, showIdsTbl, showNumPin, pageOrient, showBreaks, hideAllPlants, hideAllTables, blockHidden, blockOrder, hideFams, hideCats, hideSecs, hideConduites, hidePdfConduites, hideCondIds, execMode, execData, execVersao, rotBg, bgImage, markers, cables, creds]) // eslint-disable-line
  // Liga/desliga o contentEditable no corpo da prévia conforme o modo de edição.
  useEffect(()=>{
    const ifr=previewIframeRef.current; if(!ifr) return
    const aplica=()=>{ try{ const b=ifr.contentDocument&&ifr.contentDocument.body; if(b){ b.contentEditable=docEditMode?'true':'false'; b.style.outline='none'; b.style.cursor=docEditMode?'text':'' } }catch(_){} }
    aplica(); ifr.addEventListener('load',aplica); return ()=>ifr.removeEventListener('load',aplica)
  },[docEditMode, editFrozenHtml, pdfPreviewHtml, showDocEditor])
  // Aplica posição/zoom/rotação/largura das plantas AO VIVO no DOM da prévia — sem regerar o
  // documento e sem recarregar o iframe (é o que elimina o "blink"/reset ao mexer na planta).
  useEffect(()=>{ plantTransformsRef.current = plantTransforms },[plantTransforms])
  // MIGRAÇÃO "já troca todos" (Raphael): interruptor com cabo 'eletrica' genérico (2,5, o antigo
  // padrão que era da tomada) passa a 'eletrica_int15' (3×1,5 + retornos). Roda uma vez.
  const _migIntRef = useRef(false)
  useEffect(()=>{ if(_migIntRef.current) return; _migIntRef.current=true
    setMarkers(ms=>{ let mudou=false
      const out=ms.map(m=>{ const s=(classifyEle(m)||{}).sym||''
        if(/^interruptor/.test(s) && m.cableType==='eletrica'){ mudou=true; return {...m, cableType:'eletrica_int15'} }
        return m })
      return mudou?out:ms })
  },[]) // eslint-disable-line
  // Só muda quando alguma planta entra/sai do modo "em frente ao texto" — serve pra re-anexar as
  // alças (que trocam de canto) sem trazer plantTransforms inteiro pras deps do arraste.
  const frontSig = Object.entries(plantTransforms||{}).filter(([,v])=>v&&v.front).map(([k])=>k).sort().join(',')
  useEffect(()=>{
    const ifr=previewIframeRef.current; if(!ifr || docEditMode) return
    const d=ifr.contentDocument; if(!d) return
    const girou=(()=>{ try{ return _precisaGirar() && !!rotBg }catch(_){ return false } })()
    const ratio = girou ? (1/(imgRatio||0.75)) : (imgRatio||0.66)
    d.querySelectorAll('.ex-plant-stage').forEach(stage=>{
      // Planta dentro de PRANCHA/Compacta já é dimensionada pra caber na folha (height:100%,
      // width:auto) pelo montaCompacta/montaPranchas. Reaplicar o aplicaPalco aqui (width:%,
      // aspect-ratio) quebra o flex da prancha e COLAPSA a planta pra 0×0 — a planta some (e as
      // outras junto). Então nesses casos NÃO mexe (o zoom/posição não vale em prancha). (Raphael)
      if(stage.closest('.ex-prancha')) return
      const key=stage.dataset.pkey; if(!key) return
      const t=plantTransforms[key]||{x:0,y:0,zoom:1,rot:0}
      const pl=stage.querySelector(PLANT_SEL)
      const escondido=stage.style.display==='none'
      // MESMAS funções do applyLayout: prévia e PDF não podem divergir de jeito nenhum
      aplicaPalco(stage, pl, t, ratio)
      aplicaPlanta(pl, t)
      if(escondido) stage.style.display='none' // aplicaPalco reescreve o style inteiro
    })
  },[plantTransforms, plantPct, plantAlign, pdfPreviewHtml, docEditMode, imgRatio, rotBg, pageOrient])

  // Lista as plantas a partir da PRÓPRIA prévia (garante que apareçam TODAS as de todos os
  // tópicos — antes eu reparsava o HTML e podia divergir do que está na tela).
  useEffect(()=>{
    if(!showDocEditor) return
    const ifr=previewIframeRef.current; if(!ifr) return
    const ler=()=>{ const d=ifr.contentDocument; if(!d) return
      const lista=[...d.querySelectorAll('.ex-plant-stage')].map((s,i)=>{
        const sec=s.closest('.ex-sec,.ex-obra-page')
        const h=sec&&sec.querySelector('h1,h2,h3')
        const perto=s.previousElementSibling&&/^H[1-4]$/.test(s.previousElementSibling.tagName)?s.previousElementSibling.textContent:''
        const lbl=(perto||(h?h.textContent:'')||'').trim().replace(/\s+/g,' ').replace(/^(\d+)(?=\S)/,'$1 · ').slice(0,44)
        // Imagem DESTA planta (o andar dela) — multi-pavimento: cada planta pode ter uma imagem
        // diferente, então o mini-preview precisa mostrar a do andar selecionado, não sempre a 1ª.
        const img=(s.querySelector('img')?.getAttribute('src'))||null
        return { key:s.dataset.pkey||String(i), i, label: lbl || `Planta ${i+1}`, img }
      })
      setPlantList(lista) }
    ler(); ifr.addEventListener('load',ler); return ()=>ifr.removeEventListener('load',ler)
  },[showDocEditor, pdfPreviewHtml])

  // ── ARRASTAR / REDIMENSIONAR a planta DIRETO na prévia (à direita), estilo Word ──
  // Enquanto NÃO está editando texto: cada planta da prévia vira arrastável (mover) e ganha uma
  // alça no canto pra redimensionar (zoom). O gesto atualiza a planta ao vivo e só grava no estado
  // (plantTransforms) ao soltar — aí a prévia se regenera com a posição nova. Cada planta é
  // endereçada pelo data-pkey (então mexe em QUALQUER planta, não só na primeira).
  useEffect(()=>{
    if(!showDocEditor || docEditMode) return
    const ifr=previewIframeRef.current; if(!ifr) return
    let limpar=[]
    const setT=(key,patch)=>setPlantTransforms(p=>({...p,[key]:{...(p[key]||{x:0,y:0,zoom:1}),...patch}}))
    const wire=()=>{
      const d=ifr.contentDocument; if(!d) return
      limpar.forEach(fn=>{try{fn()}catch(_){}}); limpar=[]
      d.querySelectorAll('.ex-plant-stage').forEach(stage=>{
        if(stage.closest('.ex-prancha')) return // planta em prancha/compacta não é arrastável/zoomável (fit-to-page)
        const key=stage.dataset.pkey; const pl=stage.querySelector(PLANT_SEL); if(!key||!pl) return
        stage.style.cursor='move'; stage.style.outline='1px dashed rgba(14,165,233,0.55)'; stage.style.outlineOffset='-1px'
        const cur=()=> (plantTransformsRef.current[key]||{x:0,y:0,zoom:1,rot:0})
        // Em "frente ao texto" o palco tem ALTURA ZERO: as alças não podem ancorar no rodapé dele
        // (ficariam na linha do texto, longe da planta) — vão pro topo, sobre a imagem.
        const flutua=stage.dataset.front==='1'
        const posAlca=(dir)=> flutua ? `left:${dir}px;top:3px` : `right:${dir}px;bottom:3px`
        // altura útil: com o palco em height:0, a régua do arraste é o tamanho da própria planta
        const alturaUtil=()=>{ const h=stage.getBoundingClientRect().height; if(h>1) return h
          const hp=pl.getBoundingClientRect().height; return hp>1?hp:1 }
        const handle=d.createElement('div')
        handle.textContent='⤢'
        handle.setAttribute('style',`position:absolute;${posAlca(3)};width:20px;height:20px;background:#0EA5E9;color:#fff;font-size:12px;line-height:20px;text-align:center;border-radius:5px;cursor:nwse-resize;z-index:9;box-shadow:0 1px 4px rgba(0,0,0,.3)`)
        stage.appendChild(handle)
        // Botão GIRAR (90° por clique) na própria planta
        const rot=d.createElement('div')
        rot.textContent='↻'; rot.title='Girar 90°'
        rot.setAttribute('style',`position:absolute;${posAlca(27)};width:20px;height:20px;background:#7C3AED;color:#fff;font-size:13px;line-height:20px;text-align:center;border-radius:5px;cursor:pointer;z-index:9;box-shadow:0 1px 4px rgba(0,0,0,.3)`)
        stage.appendChild(rot)
        const onRot=e=>{ e.preventDefault(); e.stopPropagation(); setT(key,{rot:(((cur().rot||0)+90)%360)}) }
        rot.addEventListener('pointerdown',onRot)
        const onDown=e=>{ if(e.target===handle||e.target===rot) return; e.preventDefault()
          const r=stage.getBoundingClientRect(), t0=cur(), sx=e.clientX, sy=e.clientY
          const rh=alturaUtil()
          const dxy=ev=>({ x:(t0.x||0)+(ev.clientX-sx)/r.width*100, y:(t0.y||0)+(ev.clientY-sy)/rh*100 })
          const mv=ev=>{ const p=dxy(ev); aplicaPlanta(pl,{...t0,...p}) }
          const up=ev=>{ d.removeEventListener('pointermove',mv); d.removeEventListener('pointerup',up)
            setT(key,dxy(ev)) }
          d.addEventListener('pointermove',mv); d.addEventListener('pointerup',up) }
        const onH=e=>{ e.preventDefault(); e.stopPropagation()
          const t0=cur(), sy=e.clientY, rh=alturaUtil()
          const calc=cy=>Math.max(0.3,Math.min(4, Math.round(((t0.zoom||1)+(cy-sy)/rh*2)*100)/100))
          // mesma proporção EFETIVA do applyLayout: se está girada, o palco usa 1/imgRatio —
          // senão o quadro pula de aspecto no meio do redimensionamento.
          const _g=(()=>{ try{ return _precisaGirar() && !!rotBg }catch(_){ return false } })()
          const rEf=_g ? (1/(imgRatio||0.75)) : (imgRatio||0.66)
          const mv=ev=>{ const nz=calc(ev.clientY); const t1={...t0,zoom:nz}
            aplicaPalco(stage,pl,t1,rEf); aplicaPlanta(pl,t1) }
          const up=ev=>{ d.removeEventListener('pointermove',mv); d.removeEventListener('pointerup',up); setT(key,{zoom:calc(ev.clientY)}) }
          d.addEventListener('pointermove',mv); d.addEventListener('pointerup',up) }
        stage.addEventListener('pointerdown',onDown); handle.addEventListener('pointerdown',onH)
        limpar.push(()=>{ try{stage.removeEventListener('pointerdown',onDown); rot.removeEventListener('pointerdown',onRot); handle.remove(); rot.remove(); stage.style.cursor=''; stage.style.outline=''}catch(_){} })
      })
    }
    wire(); ifr.addEventListener('load',wire)
    return ()=>{ limpar.forEach(fn=>{try{fn()}catch(_){}}); ifr.removeEventListener('load',wire) }
    // SEM plantTransforms nas deps: os handlers leem do ref, então não re-anexam (nem piscam os
    // botões) a cada arraste. Só re-anexa quando a prévia é regerada de fato — ou quando alguma
    // planta troca de modo (frontSig), porque aí as alças mudam de canto.
  },[showDocEditor, docEditMode, pdfPreviewHtml, frontSig]) // eslint-disable-line

  // Alterna o modo de edição: ao ligar, congela um snapshot com CSS de impressão (não o de prévia,
  // senão o PDF sairia com o fundo cinza/estreito da tela).
  const toggleDocEdit=()=>{
    if(docEditMode){ setDocEditMode(false); setEditFrozenHtml('') }
    else {
      // Se a geração estourar, não entra em modo edição com HTML vazio (ficaria em branco):
      // avisa e mantém o modo prévia normal.
      let html=''
      try{ html=applyLayout(buildFullHtml(false)) }catch(e){ console.error('[editar] falha ao gerar:', e) }
      if(!html || !html.trim()){ alert('Não consegui gerar o documento para edição agora. Tente Regerar o documento primeiro.'); return }
      setEditFrozenHtml(html); setDocEditMode(true)
    }
  }

  async function saveToProposal(docOverride){
    const docToSave = typeof docOverride==='string' ? docOverride : execDoc
    const obraToSave = execDocObra
    const eletrToSave = execDocEletrica
    const roomMap={}
    markers.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
    const floors=[{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
      name, items:items.map(m=>({name:m.name,code:m.code,qty:'1',cost_price:m.cost,sale_price:m.sale,category:m.category})),
      price:String(items.reduce((s,m)=>s+(m.sale||0),0))
    }))}]

    const apiCost = { ...apiCostRef.current, model:'claude-sonnet-4-5', at:new Date().toISOString() }
    if(fromProposal?.id){
      try{
        const { saveProposal } = await import('../db/supabase.js')
        const updated = { ...fromProposal, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, exec_doc_conduites:execDocConduites, planta_data:plantaDataSave(execData), exec_api_cost:apiCost }
        await saveProposal(updated)
        alert(`✅ Salvo no orçamento! A página vai atualizar.`)
        onClose && onClose()
        setTimeout(()=>{ try{ window.location.reload() }catch{} }, 200)  // item 5: refresh automático
        return
      }catch(e){ alert('Erro ao salvar: '+e.message); return }
    }
    if(onSaveToProposal) onSaveToProposal({ floors, planta_data:plantaDataSave(execData), client_name:projectInfo.client||selClient, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, exec_doc_conduites:execDocConduites, exec_api_cost:apiCost })
  }

  const catGroups={}
  Object.keys(TAXONOMY).forEach(cat=>{catGroups[cat]=[]})
  ;(catalog||[]).forEach(c=>{const g=c.category||inferCategory(c.name).cat||'Automação';(catGroups[g]=catGroups[g]||[]).push(c)})

  return (
    <div style={{position:'fixed',inset:0,background:'#0f172a',zIndex:1000,display:'flex',flexDirection:'column'}}>
      {loading && (
        <div style={{position:'fixed',inset:0,background:'rgba(6,11,26,0.82)',zIndex:2000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:24}}>
          <div style={{width:54,height:54,border:'4px solid rgba(124,58,237,0.25)',borderTopColor:'#A78BFA',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
          <div style={{color:'#fff',fontSize:15,fontWeight:600,textAlign:'center'}}>{execProgress||'Processando com IA...'}</div>
          <div style={{width:'min(300px,80vw)',height:6,background:'rgba(255,255,255,0.12)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#7C3AED,#38BDF8)',borderRadius:3,animation:'progslide 1.4s ease-in-out infinite',width:'40%'}}/>
          </div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'center',maxWidth:280}}>Isso pode levar alguns segundos. Não feche a tela.</div>
        </div>
      )}
      {/* Toolbar */}
      <div style={{background:'#060B1A',padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <button onClick={onClose} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Sair</button>
        <div style={{color:'#38BDF8',fontWeight:600,fontSize:14}}>
          <i className="ti ti-brain" style={{marginRight:6}} aria-hidden/>Projeto Executivo com IA
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:6,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
          {['upload','rooms','chat','editor','exec'].map((s,i)=>{
            // pode ir para qualquer etapa; as que dependem de planta exigem bgImage
            const needsPlanta=['rooms','chat','editor','exec'].includes(s)
            const allowed = s==='upload' || (needsPlanta && bgImage)
            return <span key={s} onClick={()=>{ if(allowed) setStep(s) }}
              style={{padding:'3px 10px',borderRadius:12,background:step===s?'#0EA5E9':'rgba(255,255,255,0.08)',color:step===s?'#fff':allowed?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)',cursor:allowed?'pointer':'not-allowed',userSelect:'none'}}
              title={allowed?`Ir para ${s}`:'Carregue a planta primeiro'}>
              {i+1}. {s==='upload'?'Planta':s==='rooms'?'Cômodos':s==='chat'?'Perguntas':s==='editor'?'Editor':'Projeto'}
            </span>
          })}
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        {/* STEP UPLOAD */}
        {step==='upload' && (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{textAlign:'center',color:'#fff',maxWidth:420}}>
              <i className="ti ti-upload" style={{fontSize:48,color:'#38BDF8',display:'block',marginBottom:16}} aria-hidden/>
              <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>Carregue a planta do cliente</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:20}}>JPG, PNG ou PDF</div>

              {preClient ? (
                <div style={{marginBottom:20,textAlign:'left',background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.3)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontSize:11,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Cliente</div>
                  <div style={{fontSize:15,color:'#fff',fontWeight:600}}>{preClient.name1}{preClient.name2?' & '+preClient.name2:''}</div>
                  {preClient.neighborhood && <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{preClient.neighborhood}</div>}
                </div>
              ) : (
              <div style={{marginBottom:20,textAlign:'left'}}>
                <label style={lbl}>Cliente</label>
                <input value={clientSearch} onChange={e=>{setClientSearch(e.target.value);setSelClient('')}}
                  placeholder="Digite o nome do cliente..." style={{...inputDark,marginBottom:6,fontSize:14,padding:'10px 12px'}}/>
                {clientSearch && !selClient && (
                  <div style={{maxHeight:180,overflowY:'auto',background:'rgba(255,255,255,0.06)',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)'}}>
                    {clients.filter(c=>{
                      const q=clientSearch.toLowerCase()
                      return (c.name1||'').toLowerCase().includes(q)||(c.name2||'').toLowerCase().includes(q)||(c.neighborhood||'').toLowerCase().includes(q)
                    }).slice(0,8).map(c=>(
                      <div key={c.id} onClick={()=>{
                          setSelClient(c.id)
                          setClientSearch(`${c.name1||''}${c.name2?' & '+c.name2:''}`)
                          setProjectInfo(p=>({...p,client:`${c.name1||''}${c.name2?' & '+c.name2:''}`}))
                        }}
                        style={{padding:'10px 12px',cursor:'pointer',color:'#fff',fontSize:13,borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(14,165,233,0.2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {c.name1}{c.name2?' & '+c.name2:''}{c.neighborhood?` · ${c.neighborhood}`:''}
                      </div>
                    ))}
                  </div>
                )}
                {selClient && <div style={{fontSize:12,color:'#38BDF8',marginTop:4}}><i className="ti ti-check" aria-hidden/> Cliente selecionado</div>}
              </div>
              )}

              {/* Planta do cliente disponível → mostra preview + pergunta */}
              {clientePlanta ? (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,color:'#38BDF8',fontWeight:600,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>
                    <i className="ti ti-photo-check" style={{marginRight:6}} aria-hidden/>
                    {clientePlanta.label} encontrada no cadastro
                  </div>
                  <div style={{border:'2px solid #38BDF8',borderRadius:8,overflow:'hidden',marginBottom:12}}>
                    <img src={clientePlanta.url} style={{width:'100%',maxHeight:200,objectFit:'contain',display:'block',background:'#111'}} alt="planta do cliente"/>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={usarPlantaCliente} style={{...btnPrimary,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-check" aria-hidden/> Usar essa planta
                    </button>
                    <button onClick={()=>fileRef.current?.click()} style={{...btnGhost,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-upload" aria-hidden/> Escolher outra
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>fileRef.current?.click()} style={btnPrimary}>Selecionar planta e começar</button>
              )}
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
            </div>
          </div>
        )}

        {/* STEP ROOMS — planta + pins arrastáveis + lista editável */}
        {step==='rooms' && (
          <div style={{flex:1,display:'flex',minHeight:0}}>
            {/* Planta com pins arrastáveis */}
            <div ref={imgContainerRef} style={{flex:1,position:'relative',overflow:'hidden',background:'#111827',cursor:panning?'grabbing':'grab',userSelect:'none'}}
              onMouseDown={e=>{if(e.target===e.currentTarget||e.target.tagName==='IMG') onImgMouseDown(e)}}
              onMouseMove={onImgMouseMove} onMouseUp={onImgMouseUp} onMouseLeave={onImgMouseUp} onDoubleClick={onImgDblClick}>
              {bgImage && <img src={bgImage} draggable={false} alt="planta" id="rooms-planta-img"
                style={{position:'absolute',top:'50%',left:'50%',transform:`translate(calc(-50% + ${imgPan.x}px), calc(-50% + ${imgPan.y}px)) scale(${imgZoom})`,transformOrigin:'center center',maxWidth:'none',width:'90%',transition:panning?'none':'transform 0.1s ease',pointerEvents:'none'}}/>}
              {/* Pins numerados arrastáveis */}
              {rooms.map(r=>{
                // Calcula posição do pin usando a imagem real (não proporção hardcoded)
                const cont = imgContainerRef.current
                const rect = cont ? cont.getBoundingClientRect() : {width:800,height:600}
                // Usa a imagem DOM para pegar a proporção real
                const imgEl = cont ? cont.querySelector('#rooms-planta-img') : null
                const natRatio = (imgEl && imgEl.naturalWidth && imgEl.naturalHeight)
                  ? imgEl.naturalHeight / imgEl.naturalWidth
                  : 0.75
                const imgW = rect.width * 0.9 * imgZoom
                const imgH = imgW * natRatio
                const originX = rect.width/2 + imgPan.x
                const originY = rect.height/2 + imgPan.y
                const px = originX + (r.x/100 - 0.5)*imgW
                const py = originY + (r.y/100 - 0.5)*imgH
                return (
                  <div key={r.id} style={{position:'absolute',left:px,top:py,transform:'translate(-50%,-100%)',zIndex:10,cursor:'grab',userSelect:'none'}}
                    onMouseDown={e=>{
                      e.stopPropagation()
                      const startX=e.clientX, startY=e.clientY, ox=r.x, oy=r.y
                      const cont2=imgContainerRef.current; if(!cont2) return
                      const onMove=ev=>{
                        const rc2=cont2.getBoundingClientRect()
                        const imgEl2=cont2.querySelector('#rooms-planta-img')
                        const natR=(imgEl2&&imgEl2.naturalWidth&&imgEl2.naturalHeight)?imgEl2.naturalHeight/imgEl2.naturalWidth:0.75
                        const iW=rc2.width*0.9*imgZoom, iH=iW*natR
                        const dx=ev.clientX-startX, dy=ev.clientY-startY
                        const nx=ox+(dx/iW)*100, ny=oy+(dy/iH)*100
                        // sem clamp — o usuário move livremente, pode colocar no canto
                        setRooms(rs=>rs.map(x=>x.id===r.id?{...x,x:nx,y:ny}:x))
                      }
                      const onUp=()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
                      window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp)
                    }}>
                    {/* Pin: número + nome */}
                    <div style={{background:'#0EA5E9',color:'#fff',borderRadius:'50% 50% 50% 0',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,border:'2px solid #fff',boxShadow:'0 2px 6px rgba(0,0,0,0.5)',transform:'rotate(-45deg)'}}>
                      <span style={{transform:'rotate(45deg)'}}>{r.id}</span>
                    </div>
                    <div style={{background:'rgba(0,0,0,0.75)',color:'#fff',fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,whiteSpace:'nowrap',marginTop:2,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',backdropFilter:'blur(4px)'}}>{r.name}</div>
                  </div>
                )
              })}
              {/* HUD */}
              <div style={{position:'absolute',bottom:10,left:10,right:10,display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
                <div style={{background:'rgba(0,0,0,0.65)',color:'#fff',fontSize:11,padding:'3px 8px',borderRadius:5}}>
                  🔍 {Math.round(imgZoom*100)}% · scroll=zoom · arrastar fundo=mover · arrastar pin=reposicionar
                </div>
                <div style={{display:'flex',gap:4,pointerEvents:'all'}}>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.min(8,z*1.4))}} style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.max(0.3,z/1.4))}} style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                </div>
              </div>
              {loading && <div style={{position:'absolute',inset:0,background:'rgba(10,15,30,0.7)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
                <i className="ti ti-loader-2" style={{fontSize:32,color:'#38BDF8',animation:'spin 1s linear infinite'}} aria-hidden/>
                <div style={{color:'#fff',fontSize:13}}>IA identificando os cômodos…</div>
              </div>}
            </div>
            {/* Painel direito: lista editável + botão confirmar */}
            <div style={{width:260,background:'#0f1729',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>
                  <i className="ti ti-map-pin" style={{marginRight:5}} aria-hidden/>Cômodos identificados
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Edite os nomes, arraste os pins na planta, adicione ou remova.</div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
                {[...rooms].sort((a,b)=>{
                  const fA=(a.floor||'').localeCompare(b.floor||'','pt-BR')
                  return fA!==0 ? fA : (a.name||'').localeCompare(b.name||'','pt-BR')
                }).map((r,idx)=>(
                  <div key={r.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 8px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    {/* Número do pin */}
                    <div style={{width:22,height:22,borderRadius:'50% 50% 50% 0',background:'#0EA5E9',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,transform:'rotate(-45deg)'}}>
                      <span style={{transform:'rotate(45deg)'}}>{r.id}</span>
                    </div>
                    {/* Nome editável */}
                    <div style={{flex:1,minWidth:0}}>
                      {editingRoom===r.id
                        ? <input autoFocus value={r.name} onChange={e=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}
                            onBlur={()=>setEditingRoom(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape')setEditingRoom(null)}}
                            style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid #38BDF8',borderRadius:3,color:'#fff',fontSize:11,padding:'2px 5px',outline:'none'}}/>
                        : <div style={{fontSize:11,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.3}}
                            title={r.name}>{r.name}
                            {r.floor && <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>{r.floor}</div>}
                          </div>
                      }
                    </div>
                    {/* Botão editar */}
                    <button onClick={()=>setEditingRoom(editingRoom===r.id?null:r.id)} title="Editar nome"
                      style={{background:'none',border:'none',cursor:'pointer',padding:3,lineHeight:1,flexShrink:0,
                        color:editingRoom===r.id?'#38BDF8':'rgba(255,255,255,0.3)',borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color='#38BDF8'}
                      onMouseLeave={e=>e.currentTarget.style.color=editingRoom===r.id?'#38BDF8':'rgba(255,255,255,0.3)'}>
                      <i className="ti ti-pencil" style={{fontSize:12}} aria-hidden/>
                    </button>
                    {/* Botão deletar — renumera sequencialmente após remover */}
                    <button onClick={()=>setRooms(rs=>{
                      const filtered = rs.filter(x=>x.id!==r.id)
                      // renumera: mantém x,y,name,floor mas reescreve id sequencialmente
                      return filtered.map((x,i)=>({...x, id:i+1}))
                    })} title="Remover cômodo"
                      style={{background:'none',border:'none',cursor:'pointer',padding:3,lineHeight:1,flexShrink:0,color:'rgba(255,255,255,0.25)',borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color='#F87171'}
                      onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
                      <i className="ti ti-trash" style={{fontSize:12}} aria-hidden/>
                    </button>
                  </div>
                ))}
              </div>
              {/* Adicionar cômodo manualmente */}
              <div style={{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,0.08)',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <AddRoomInline onAdd={r=>setRooms(rs=>{const maxId=rs.reduce((m,x)=>Math.max(m,x.id||0),0); return [...rs,{...r,id:maxId+1,x:50,y:50}]})}/>
              </div>
              {/* Botão confirmar */}
              <div style={{padding:12}}>
                {!isDemo() && <button disabled={rooms.length===0||loading} onClick={()=>{ setStep('chat'); startChat(bgImage, rooms) }}
                  style={{...btnPrimary,width:'100%',justifyContent:'center',gap:8,opacity:rooms.length===0?0.4:1}}>
                  <i className="ti ti-message-2" aria-hidden/>
                  Confirmar e ir para as perguntas ({rooms.length} cômodo{rooms.length!==1?'s':''})
                </button>}
                <button onClick={()=>setStep('editor')} disabled={loading}
                  style={{...btnPrimary,width:'100%',justifyContent:'center',marginTop:isDemo()?0:6,gap:6}}>
                  <i className="ti ti-hand-finger" aria-hidden/>{isDemo()?'Ir para o editor':'Pular IA — editar na mão'}
                </button>
                {!isDemo() && <button onClick={()=>startRooms(bgImage)} disabled={loading}
                  style={{...btnGhost,width:'100%',justifyContent:'center',marginTop:6,fontSize:11}}>
                  <i className="ti ti-refresh" aria-hidden/>Reanalisar planta
                </button>}
              </div>
            </div>
          </div>
        )}

        {/* STEP CHAT */}
        {step==='chat' && (
          <div className="pe-chat-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            {/* Painel da planta com zoom (scroll) + pan (arrastar) + reset (duplo clique) */}
            <div
              ref={imgContainerRef}
              className="pe-chat-img"
              style={{width:'48%',borderRight:'1px solid rgba(255,255,255,0.08)',overflow:'hidden',
                position:'relative',background:'#111827',cursor:panning?'grabbing':'grab',userSelect:'none'}}
              onMouseDown={onImgMouseDown}
              onMouseMove={onImgMouseMove}
              onMouseUp={onImgMouseUp}
              onMouseLeave={onImgMouseUp}
              onDoubleClick={onImgDblClick}
            >
              {bgImage && (
                <img
                  src={bgImage}
                  draggable={false}
                  style={{
                    position:'absolute', top:'50%', left:'50%',
                    transform:`translate(calc(-50% + ${imgPan.x}px), calc(-50% + ${imgPan.y}px)) scale(${imgZoom})`,
                    transformOrigin:'center center',
                    maxWidth:'none', width:'90%',
                    transition: panning ? 'none' : 'transform 0.1s ease',
                    pointerEvents:'none',
                  }}
                  alt="planta"
                />
              )}
              {/* HUD: zoom level + instrução */}
              <div style={{position:'absolute',bottom:10,left:10,right:10,display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
                <div style={{background:'rgba(0,0,0,0.65)',color:'#fff',fontSize:11,padding:'3px 8px',borderRadius:5,backdropFilter:'blur(4px)'}}>
                  🔍 {Math.round(imgZoom*100)}% · scroll = zoom · arrastar = mover · 2× clique = reset
                </div>
                <div style={{display:'flex',gap:4,pointerEvents:'all'}}>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.min(8,z*1.4))}}
                    style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.max(0.3,z/1.4))}}
                    style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                </div>
              </div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                  <i className="ti ti-map-pin" style={{marginRight:4,color:'#38BDF8'}} aria-hidden/>{rooms.length} cômodo{rooms.length!==1?'s':''} confirmado{rooms.length!==1?'s':''}
                  {rooms.slice(0,4).map(r=><span key={r.id} style={{marginLeft:6,background:'rgba(56,189,248,0.12)',padding:'0 5px',borderRadius:3,color:'#38BDF8',fontSize:10}}>{r.name}</span>)}
                  {rooms.length>4&&<span style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginLeft:4}}>+{rooms.length-4}</span>}
                </div>
                <button onClick={()=>setStep('rooms')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:11,display:'flex',alignItems:'center',gap:3}}>
                  <i className="ti ti-edit" aria-hidden/>Editar cômodos
                </button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:20}}>
                {chat.map((m,i)=>(
                  <div key={i} style={{marginBottom:14,display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'88%',padding:'10px 14px',borderRadius:10,fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',
                      background:m.role==='user'?'#0EA5E9':'rgba(255,255,255,0.08)',color:'#fff'}}>{m.text}</div>
                    {/* Quick-reply buttons apenas na última mensagem da IA */}
                    {m.role==='assistant' && i===chat.length-1 && !loading && (()=>{
                      // Detecta perguntas sim/não ou listas na mensagem
                      const isYesNo = /\b(tem|terá|haverá|existe|vai ter|deseja|quer)\b.*\?/i.test(m.text)
                      const hasAC = /ar.condiciona|AC\b|split/i.test(m.text)
                      const hasSom = /som.ambie|música|caixa/i.test(m.text)
                      const hasCam = /câmera|camera/i.test(m.text)
                      const hasRack = /rack|CPD|armário/i.test(m.text)
                      const quickReplies = []
                      if(hasAC) quickReplies.push('Sim, todos têm AC','Alguns ambientes têm AC','Não há AC')
                      if(hasSom) quickReplies.push('Sim, quero som ambiente','Só na sala','Não quero som')
                      if(hasCam) quickReplies.push('Sim, entrada e áreas externas','Entrada apenas','Não quero câmeras')
                      if(hasRack) quickReplies.push('Rack na sala de estar','Rack no corredor','Rack no home office')
                      if(!quickReplies.length && isYesNo) quickReplies.push('Sim','Não','Somente em alguns')
                      if(!quickReplies.length) return null
                      return <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:6,maxWidth:'88%'}}>
                        {quickReplies.map(qr=>(
                          <button key={qr} onClick={()=>sendChat(qr)}
                            style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:16,color:'rgba(255,255,255,0.8)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(14,165,233,0.25)'}
                            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                            {qr}
                          </button>
                        ))}
                      </div>
                    })()}
                  </div>
                ))}
                {loading && <div style={{color:'rgba(255,255,255,0.4)',fontSize:12}}><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/> IA pensando...</div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <button onClick={generatePositions} disabled={loading} style={{...btnPrimary,flex:1,background:'#7C3AED',justifyContent:'center'}}>
                    <i className="ti ti-sparkles" aria-hidden/> {markers.length?'Refazer sugestão':'Gerar sugestão na planta'}
                  </button>
                  {markers.length>0 && (
                    <button onClick={()=>setStep('editor')} disabled={loading} style={{...btnPrimary,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-edit" aria-hidden/> Ir para o editor
                    </button>
                  )}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat() } }}
                    placeholder="Responda à IA... (Enter envia, Shift+Enter quebra linha)" rows={2}
                    style={{...inputStyle,resize:'none',minHeight:44,maxHeight:120,lineHeight:1.4}}/>
                  <button onClick={()=>sendChat()} disabled={loading} style={{...btnPrimary,height:44}}><i className="ti ti-send" aria-hidden/></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP EDITOR */}
        {step==='editor' && (
          <div className="pe-editor-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            {/* ── Sidebar esquerda: catálogo principal + filtros colapsáveis ── */}
            <div className="pe-editor-cat" style={{width:260,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

              {/* ── CATÁLOGO (sempre visível, rolável) ── */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                {/* Atalhos elétricos — some quando a busca está ativa (Raphael: a lista de resultados
                    cresce e fica fácil de pesquisar). Voltam ao limpar/desfocar a busca. */}
                {!(catSearch.trim()||catFocus) && <div style={{padding:'8px 10px',background:'#0a1020',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:.5,fontWeight:700,marginBottom:6}}>⚡ Atalhos: um clique posiciona · altura ajustável no menu da direita</div>
                  {(()=>{
                    // Itens mais usados (Raphael). Os que existem no CATÁLOGO (sensor/câmera/AP/som/
                    // cortina/keystone) vêm do catálogo real (com código); os elétricos são atalhos.
                    const achaCat=(re)=>(catalog||[]).find(c=>re.test((((c.name||'')+' '+(c.code||''))).toLowerCase()))
                    // MODELO EXATO primeiro, genérico como reserva (Raphael #4): puxa o item real do
                    // catálogo (JBL Stage 260CSA, G5 Bullet MIC, Keypad Premium Zigbee) em vez do genérico.
                    const achaCatPref=(...res)=>{ for(const re of res){ const c=achaCat(re); if(c) return c } return null }
                    const camCat=achaCatPref(/g5.*bullet.*mic|bullet.*externa.*mic/, /g5.*bullet|bullet.*mic/, /c[âa]mera|dome|bullet/)
                    const apCat=achaCat(/access point|\bap\b|wi-?fi|u6|u7|unifi/)
                    const somCat=achaCatPref(/jbl.*stage.*260|stage ?260 ?csa|260csa/, /jbl.*stage/, /caixa.*som|som.*embutid|alto-?falante|speaker|arandela.*som/)
                    const keypadCat=achaCatPref(/keypad.*premium.*zigbee/, /keypad.*premium/, /keypad/)
                    const presCat=achaCat(/sensor.*(presen|mmwave|micro-?ond|24 ?ghz|zigbee)|presen[çc]a/)
                    const irCat=achaCat(/sensor.*ir|receptor ir|infraverm|\bir\b/)
                    const cortinaCat=achaCat(/cortina|persiana/)
                    const keyCat=achaCat(/keystone/)
                    const grupos=[
                      {cat:'Elétrica', cor:'#F59E0B', itens:[
                        {label:'Tomada',sub:'padrão',eleType:'tomada_media',name:'Tomada'},
                        {label:'Ponto de energia',sub:'só força, sem tomada',eleType:'ponto_energia_parede',name:'Ponto de energia'},
                        {label:'Módulo cabeceira',sub:'tom+int+USB',eleType:'modulo_cabeceira',name:'Módulo de cabeceira'},
                      ]},
                      {cat:'Interruptores', cor:'#16A34A', itens:[
                        // (Raphael #4) Keypad Premium Zigbee do catálogo, com as respectivas teclas.
                        // O nº de teclas vem do eleType; o modelo/código vem do item do catálogo.
                        // Sem o item no catálogo, cai no interruptor genérico de sempre.
                        ...[{n:1,ele:'interruptor_simples'},{n:2,ele:'interruptor_paralelo'},{n:3,ele:'interruptor_intermediario'},{n:6,ele:'interruptor_6'}].map(({n,ele})=>
                          keypadCat
                            ? {label:`Keypad ${n}`,sub:`${(keypadCat.name||'Keypad').slice(0,16)} · ${n}T`,catItem:{...keypadCat, eleType:ele, teclas:n}}
                            : {label:`${n===6?'Keypad 6':'Interruptor '+n}`,sub:`${n} tecla${n>1?'s':''}`,eleType:ele,name:`${n===6?'Keypad 6':'Interruptor '+n} teclas`}
                        ),
                      ]},
                      {cat:'Rede / Segurança', cor:'#0EA5E9', itens:[
                        keyCat?{label:'Keystone',sub:keyCat.code||'CAT6',catItem:keyCat}:{label:'Keystone',sub:'CAT6',eleType:'keystone_media',name:'Keystone'},
                        camCat&&{label:'Câmera',sub:(camCat.name||'').slice(0,20),catItem:camCat},
                        apCat&&{label:'AP',sub:(apCat.name||'').slice(0,20),catItem:apCat},
                      ].filter(Boolean)},
                      {cat:'Sensores', cor:'#EA580C', itens:[
                        presCat&&{label:'Sensor presença',sub:(presCat.name||'').slice(0,16),catItem:presCat},
                        irCat&&{label:'Sensor IR',sub:(irCat.name||'').slice(0,16),catItem:irCat},
                        cortinaCat&&{label:'Cortina',sub:(cortinaCat.name||'').slice(0,16),catItem:cortinaCat},
                      ].filter(Boolean)},
                      {cat:'Som', cor:'#7C3AED', itens:[
                        somCat?{label:'Caixa de som',sub:(somCat.name||'').slice(0,16),catItem:somCat}:{label:'Som teto',sub:'cabo 2×1,5',eleType:'ponto_som_teto',name:'Ponto de som (teto)'},
                      ]},
                      {cat:'Infraestrutura', cor:'#6B7280', itens:[
                        {label:'Quadro QDL',sub:'1,50m',eleType:'quadro',name:'Quadro de luz QDL'},
                        {label:'Prumada ↕',sub:'entre andares',eleType:'prumada',name:'Prumada'},
                        {label:'Caixa conduíte',sub:'passagem',eleType:'caixa_conduite',name:'Caixa de conduíte'},
                      ]},
                    ].filter(g=>g.itens.length)
                    return grupos.map(g=>(
                    <div key={g.cat} style={{marginBottom:7}}>
                      <div style={{fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:g.cor,marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:g.cor,display:'inline-block'}}/>{g.cat}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {g.itens.map(b=>{
                          const it = b.catItem ? {...b.catItem} : {code:'',name:b.name,note:b.note||'',eleType:b.eleType,category:'Automação'}
                          const active = addMode && addItem?.name===it.name && (b.catItem? (addItem?.code===it.code && (!it.eleType || addItem?.eleType===it.eleType)) : addItem?.eleType===b.eleType)
                          return <button key={b.label} onClick={()=>{ setAddItem(it); setAddMode(true) }}
                            style={{fontSize:10,padding:'4px 8px',borderRadius:8,cursor:'pointer',
                              border:`1px solid ${active?g.cor:'rgba(255,255,255,0.15)'}`,
                              background:active?`${g.cor}33`:'rgba(255,255,255,0.05)',color:active?'#fff':'rgba(255,255,255,0.8)',
                              display:'inline-flex',flexDirection:'column',alignItems:'flex-start',lineHeight:1.2,gap:1}}>
                            <span style={{fontWeight:600}}>{b.label}</span>
                            <span style={{fontSize:8,color:active?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.4)'}}>{b.sub}</span>
                          </button>
                        })}
                      </div>
                    </div>
                  )) })()}
                </div>}
                {/* Busca + filtros de categoria — sticky */}
                <div style={{padding:'8px 10px',background:'#0a1020',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
                  <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} onFocus={()=>setCatFocus(true)} onBlur={()=>setCatFocus(false)} placeholder="Buscar no catálogo..."
                    style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'7px 10px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:6}}/>
                  <div style={{display:'flex',gap:4,marginBottom: catFilter ? 5 : 0}}>
                    <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setSubcatFilter('')}}
                      style={{flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:5,padding:'5px 8px',color:'#fff',fontSize:11,fontFamily:'inherit'}}>
                      <option value="">Todas as categorias</option>
                      {Object.keys(catGroups).map(g=><option key={g} value={g}>{g}</option>)}
                    </select>
                    {catFilter&&<button onClick={()=>{setCatFilter('');setSubcatFilter('')}} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:5,color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'0 8px',fontSize:12,flexShrink:0}}>×</button>}
                  </div>
                  {catFilter && TAXONOMY[catFilter]?.length>0 && (
                    <select value={subcatFilter} onChange={e=>setSubcatFilter(e.target.value)}
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:5,padding:'5px 8px',color:'rgba(255,255,255,0.6)',fontSize:11,fontFamily:'inherit',boxSizing:'border-box'}}>
                      <option value="">Todas as subcategorias</option>
                      {TAXONOMY[catFilter].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                {addMode&&addItem&&<div style={{padding:'6px 12px',background:'rgba(14,165,233,0.15)',fontSize:11,color:'#38BDF8',flexShrink:0}}>
                  📍 Clique na planta: <b>{addItem.name}</b><br/>
                  <span onClick={()=>{setAddMode(false);setAddItem(null)}} style={{cursor:'pointer',textDecoration:'underline',fontSize:10}}>cancelar</span>
                </div>}
                {/* Lista do catálogo — rolável */}
                <div style={{flex:1,overflowY:'auto'}}>
                  {Object.entries(catGroups).filter(([g])=>!catFilter||g===catFilter).map(([g,items])=>{
                    const subGroups={}
                    items.forEach(it=>{const sub=it.subcategory||inferCategory(it.name,g).sub||g;(subGroups[sub]=subGroups[sub]||[]).push(it)})
                    const allFil=items.filter(it=>{
                      const mS=!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase())
                      const mSub=!subcatFilter||(it.subcategory||inferCategory(it.name,g).sub||g)===subcatFilter
                      return mS&&mSub
                    })
                    if(!allFil.length) return null
                    return <div key={g}>
                      <div style={{padding:'6px 10px 3px',fontSize:9,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:.5,fontWeight:700,background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{g}</div>
                      {Object.entries(subGroups).map(([sub,sitems])=>{
                        const sfil=sitems.filter(it=>{
                          const mS=!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase())
                          return mS&&(!subcatFilter||sub===subcatFilter)
                        })
                        if(!sfil.length) return null
                        return <div key={sub}>
                          <div style={{padding:'3px 12px 2px',fontSize:8,color:'rgba(255,255,255,0.28)',letterSpacing:.3}}>↳ {sub}</div>
                          {sfil.map((it,i)=>{const st=EQUIP_STYLE[equipType(it.name)]||EQUIP_STYLE.Outro
                            return <div key={i} onClick={()=>{setAddItem(it);setAddMode(true)}}
                              style={{padding:'7px 12px 7px 18px',cursor:'pointer',display:'flex',gap:8,alignItems:'center',minHeight:32}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <span style={{width:16,height:16,borderRadius:'50%',background:st.c,color:'#fff',fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.s}</span>
                              <span style={{fontSize:11,color:'rgba(255,255,255,0.85)',lineHeight:1.3,flex:1}}>{it.name}</span>
                            </div>})}
                        </div>})}
                    </div>})}
                </div>
              </div>

              {/* ── FILTROS COLAPSÁVEIS (fundo da sidebar) ── */}
              <FilterSection title="📋 Resumo de itens" badge={filterItem?'•':null} onClear={filterItem?()=>setFilterItem(''):null} defaultOpen={false}>
                {(()=>{
                  const g={}
                  markers.forEach(m=>{ const nm=m.name; if(!nm)return; const q=parseInt(m.qty)||1
                    if(!g[nm]) g[nm]={name:nm,qty:0,rooms:{},type:equipType(nm)}
                    g[nm].qty+=q; const r=m.room||'Sem cômodo'; g[nm].rooms[r]=(g[nm].rooms[r]||0)+q })
                  const list=Object.values(g).sort((a,b)=>b.qty-a.qty)
                  if(!list.length) return <div style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Sem itens.</div>
                  return <div>
                    {filterItem&&<button onClick={()=>setFilterItem('')} style={{width:'100%',marginBottom:6,fontSize:10,padding:'5px',borderRadius:5,border:'1px solid #38BDF8',background:'rgba(56,189,248,0.15)',color:'#38BDF8',cursor:'pointer',fontFamily:'inherit'}}>✕ Mostrar todos</button>}
                    {list.map(it=>{
                      const st=EQUIP_STYLE[it.type]||EQUIP_STYLE.Outro; const sel=filterItem===it.name
                      const roomsTxt=Object.entries(it.rooms).map(([r,q])=>q>1?`${r} (${q})`:r).join(', ')
                      return <button key={it.name} onClick={()=>setFilterItem(sel?'':it.name)} title="Clique para ver só este item no mapa"
                        style={{display:'block',width:'100%',textAlign:'left',background:sel?'rgba(56,189,248,0.12)':'transparent',border:`1px solid ${sel?'#38BDF8':'transparent'}`,borderRadius:5,padding:'5px 6px',cursor:'pointer',marginBottom:2,fontFamily:'inherit'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,color:'#fff',fontSize:11}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:st.c,flexShrink:0}}/>
                          <b style={{color:'#38BDF8',minWidth:18}}>{it.qty}</b>
                          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</span>
                        </div>
                        <div style={{fontSize:8.5,color:'rgba(255,255,255,0.4)',marginLeft:13,marginTop:1}}>{roomsTxt}</div>
                      </button>
                    })}
                  </div>
                })()}
              </FilterSection>

              <FilterSection title="🔍 Buscar na planta" defaultOpen={false}>
                <input value={editorSearch} onChange={e=>setEditorSearch(e.target.value)}
                  placeholder="Nome, código ou cômodo..."
                  style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:5,padding:'5px 8px',color:'#fff',fontSize:11,fontFamily:'inherit',boxSizing:'border-box'}}/>
                {editorSearch&&<div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                  {markers.filter(m=>m.name?.toLowerCase().includes(editorSearch.toLowerCase())||m.code?.toLowerCase().includes(editorSearch.toLowerCase())||m.room?.toLowerCase().includes(editorSearch.toLowerCase())).length} resultado(s)
                </div>}
              </FilterSection>

              <FilterSection title="🏠 Filtrar cômodos" badge={filterRooms.size||null} onClear={filterRooms.size?()=>setFilterRooms(new Set()):null} defaultOpen={false}>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>m.room||'Sem cômodo'))].sort().map(r=>{
                    const sel=filterRooms.has(r)
                    return <button key={r} onClick={()=>setFilterRooms(prev=>{const s=new Set(prev);if(s.has(r))s.delete(r);else s.add(r);return s})}
                      style={{fontSize:9,padding:'2px 6px',borderRadius:6,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                        borderColor:sel?'#38BDF8':'rgba(255,255,255,0.15)',background:sel?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.03)',
                        color:sel?'#38BDF8':'rgba(255,255,255,0.5)'}}>
                      {r}
                    </button>})}
                </div>
              </FilterSection>

              <FilterSection title="🏷 Filtrar categorias" badge={filterCateg.size||null} onClear={filterCateg.size?()=>setFilterCateg(new Set()):null} defaultOpen={false}>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>inferCategory(m.name||'').cat||'Outros'))].sort().map(t=>{
                    const cc={'Segurança':'#DC2626','Sonorização':'#BE185D','Redes':'#0EA5E9','Automação':'#059669','Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED','Outros':'#6B7280'}[t]||'#6B7280'
                    const sel=filterCateg.has(t)
                    return <button key={t} onClick={()=>setFilterCateg(prev=>{const s=new Set(prev);if(s.has(t))s.delete(t);else s.add(t);return s})}
                      style={{fontSize:9,padding:'2px 8px',borderRadius:6,border:'1px solid',cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:4,
                        borderColor:sel?cc:'rgba(255,255,255,0.15)',background:sel?cc+'28':'rgba(255,255,255,0.03)',
                        color:sel?cc:'rgba(255,255,255,0.5)'}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:cc}}/>{t}
                    </button>})}
                </div>
              </FilterSection>

            </div>
            {/* ── Canvas ── */}
            <div ref={canvasRef} className="pe-editor-canvas" onMouseDown={onCanvasPanDown} onTouchStart={onCanvasPanDown} onWheel={onCanvasWheel}
              style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'block',padding:20,position:'relative',cursor:canvasPan?'grabbing':(addMode||cableMode?'default':'grab'),touchAction:'none'}}>
              {/* ── Banner de colaboração em tempo real ── */}
              {colaboradores.length>0 && <div style={{position:'sticky',top:0,left:0,right:0,zIndex:50,background:'rgba(234,179,8,0.15)',border:'1px solid #EAB308',borderRadius:8,padding:'7px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:11}}>
                <span style={{fontSize:15}}>👥</span>
                <span style={{color:'#FDE68A',fontWeight:600}}>Atenção: {colaboradores.length} outro{colaboradores.length>1?'s':''} usuário{colaboradores.length>1?'s':''} {colaboradores.length>1?'estão':'está'} editando esta planta ao mesmo tempo</span>
                <span style={{color:'rgba(253,230,138,0.6)',fontSize:10}}>Salve com frequência para evitar conflitos</span>
              </div>}
              <div className="pe-toolbar" style={{position:'sticky',top:-20,left:-20,right:-20,zIndex:30,display:'flex',gap:6,background:'#0d1322',borderBottom:'1px solid rgba(255,255,255,0.1)',padding:'8px 10px',margin:'-20px -20px 14px',height:'fit-content',flexWrap:'wrap',justifyContent:'flex-start',alignItems:'center',width:'calc(100% + 40px)',boxShadow:'0 2px 10px rgba(0,0,0,0.35)'}}>
                <button onClick={()=>setEditLock(v=>!v)} style={{height:32,borderRadius:6,border:`1px solid ${editLock?'#DC2626':'#16A34A'}`,background:editLock?'rgba(220,38,38,0.18)':'#16A34A',color:editLock?'#FCA5A5':'#fff',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:700}} title={editLock?'Itens travados: dá pra dar zoom e rolar sem mover nada. Toque para liberar a edição.':'Edição liberada: arrastar move os itens. Toque para travar e navegar com segurança.'}>
                  <i className={editLock?'ti ti-lock':'ti ti-lock-open'} aria-hidden/>{editLock?'Travado':'Editar: ON'}
                </button>
                <button onClick={()=>setCableMode(m=>!m)} style={{height:32,borderRadius:6,border:`1px solid ${cableMode?'#F59E0B':'#F59E0B88'}`,background:cableMode?'#F59E0B':'rgba(245,158,11,0.15)',color:cableMode?'#1a1a2e':'#FBBf24',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Traçar cabos ligando item a item">
                  <i className="ti ti-route" aria-hidden/>{cableMode?'Cabos: ON':'Cabos'}
                </button>
                <button onClick={()=>{ setConduitMode(m=>{ const nv=!m; if(nv){setCableMode(false);setAddMode(false);setCalibMode(false)} else {setConduitDraft([])} return nv }) }} style={{height:32,borderRadius:6,border:`1px solid ${conduitMode?'#1E3A8A':'#1E3A8A88'}`,background:conduitMode?'#1E3A8A':'rgba(30,58,138,0.15)',color:conduitMode?'#fff':'#93C5FD',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Desenhar conduíte livre na parede (sem precisar ligar itens)">
                  <i className="ti ti-vector" aria-hidden/>{conduitMode?'Conduíte: ON':'Conduíte'}
                </button>
                <button onClick={()=>{
                  const opc=window.prompt('ESCALA DA PLANTA — escolha:\n\n1 = Medir parede na planta (clica 2 pontos + digita os metros reais). Pode medir várias paredes: eu cruzo e aviso o desvio.\n2 = Digitar a largura total da planta em metros\n3 = Zerar a escala e as medições (recomeçar a calibração)\n\nDigite 1, 2 ou 3:', plantScale?'(já calibrado) 1, 2 ou 3':'1')
                  if(opc==null) return
                  const o=opc.trim()
                  if(o.startsWith('1')){ setCalibMode(true); setCalibPts([]); setCableMode(false); setAddMode(false) }
                  else if(o.startsWith('2')){ const w=window.prompt('Largura TOTAL da planta, em metros (ex: 12,40):'); const wm=parseFloat((w||'').replace(',','.')); if(wm>0){ setPlantScale(wm); setCalibSamples([]); alert(`✅ Escala definida: ${wm}m de largura. Cabos com metragem automática.`) } }
                  else if(o.startsWith('3')){ setPlantScale(null); setCalibSamples([]); setCalibPts([]); alert('Escala zerada. Meça de novo com calma: dica, use as paredes maiores e dê zoom antes de clicar.') }
                }} style={{height:32,borderRadius:6,border:`1px solid ${calibMode?'#0EA5E9':(plantScale?'#16A34A88':'rgba(255,255,255,0.2)')}`,background:calibMode?'#0EA5E9':(plantScale?'rgba(22,163,74,0.15)':'rgba(255,255,255,0.08)'),color:calibMode?'#fff':(plantScale?'#6EE7B7':'#fff'),cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={plantScale?`Largura total da planta: ${plantScale.toFixed(2)}m · ${calibSamples.length||'?'} medição(ões)${(()=>{ if(calibSamples.length<2) return ''; const es=calibSamples.map(s=>s.metros/s.d); const me=es.reduce((a,b)=>a+b,0)/es.length; return ` · desvio ${(((Math.max(...es)-Math.min(...es))/me)*100).toFixed(1)}%` })()}`:'Definir a escala em metros para calcular a metragem dos cabos'}>
                  <i className="ti ti-ruler-2" aria-hidden/>{calibMode?(calibPts.length===0?'Clique o 1º ponto...':'Clique o 2º ponto...'):(plantScale?`Escala ✓ ${(plantScale).toFixed(2)}m${calibSamples.length>1?` · ${calibSamples.length}×`:''}`:'Escala')}
                </button>
                <button onClick={()=>setShowIds(v=>!v)} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:showIds?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={showIds?'Ocultar os códigos (planta limpa)':'Mostrar os códigos dos pontos'}>
                  <i className={showIds?'ti ti-tag':'ti ti-tag-off'} aria-hidden/>{showIds?'IDs visíveis':'IDs ocultos'}
                </button>
                {(()=>{ const niveis=[['piso','Piso'],['baixa','Baixa'],['media','Média'],['alta','Alta'],['teto','Teto']]
                  const toggle=v=>setFilterLevels(s=>{ const n=new Set(s); n.has(v)?n.delete(v):n.add(v); return n })
                  const on=filterLevels.size>0
                  return <div style={{display:'flex',alignItems:'center',gap:3,height:32,padding:'0 6px',borderRadius:6,border:`1px solid ${on?'#0891B288':'rgba(255,255,255,0.2)'}`,background:on?'rgba(8,145,178,0.14)':'rgba(255,255,255,0.06)'}} title="Filtra a planta por nível de instalação">
                    <i className="ti ti-stack-2" aria-hidden style={{color:'rgba(255,255,255,0.55)',fontSize:13,marginRight:1}}/>
                    {niveis.map(([v,lb])=>{ const act=filterLevels.has(v)
                      return <button key={v} onClick={()=>toggle(v)} style={{height:24,padding:'0 7px',borderRadius:5,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:10.5,fontWeight:act?700:500,
                        background:act?'#0891B2':'rgba(255,255,255,0.08)',color:act?'#fff':'rgba(255,255,255,0.55)'}}>{lb}</button> })}
                    {on && <button onClick={()=>setFilterLevels(new Set())} title="Ver todos os níveis" style={{height:24,width:22,borderRadius:5,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:12}}>×</button>}
                  </div> })()}
                <button onClick={()=>setShowCabo(v=>!v)} style={{height:32,borderRadius:6,border:`1px solid ${showCabo?'#2563EB88':'rgba(255,255,255,0.2)'}`,background:showCabo?'rgba(37,99,235,0.18)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={showCabo?'Ocultar a legenda de cabo (E/S/R)':'Mostrar a legenda de cabo (Elétrico/Som/Rede)'}>
                  <i className="ti ti-plug-connected" aria-hidden/>{showCabo?'Cabo E/S/R':'Cabo oculto'}
                </button>
                {(()=>{ const temEle=markers.some(m=>classifyEle(m)); const qdls=markers.filter(m=>classifyEle(m)?.sym==='quadro').length
                  // prumadas pareadas indicam que há mais de um pavimento na planta
                  const pares=new Set(markers.filter(m=>classifyEle(m)?.sym==='prumada'&&(m.prumadaCode||'').trim()).map(m=>(m.prumadaCode||'').trim().toLowerCase()))
                  const multiPav = pares.size>0
                  if(!temEle) return null
                  if(qdls===0) return <span style={{height:32,borderRadius:6,border:'1px solid #DC2626',background:'rgba(220,38,38,0.18)',color:'#FCA5A5',fontSize:11,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontWeight:600}} title="Use o atalho 'Quadro QDL' e posicione na planta">
                    <i className="ti ti-alert-triangle" aria-hidden/>Falta o Quadro de Luz (QDL)
                  </span>
                  if(multiPav && qdls<2) return <span style={{height:32,borderRadius:6,border:'1px solid #F59E0B',background:'rgba(245,158,11,0.18)',color:'#FBBF24',fontSize:11,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontWeight:600}} title="Há prumada (2 pavimentos). Cada andar costuma ter seu próprio QDL.">
                    <i className="ti ti-alert-triangle" aria-hidden/>{qdls} QDL — 2 pavimentos? coloque 1 por andar
                  </span>
                  return null })()}
                {cables.length>0 && <button onClick={()=>setHideCables(h=>!h)} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:hideCables?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={hideCables?'Mostrar cabos':'Ocultar cabos (só itens)'}>
                  <i className={hideCables?'ti ti-eye-off':'ti ti-eye'} aria-hidden/>{hideCables?'Cabos ocultos':'Ocultar cabos'}
                </button>}
                {cables.some(c=>c.free) && <button onClick={()=>setHideConduites(h=>!h)} style={{height:32,borderRadius:6,border:`1px solid ${hideConduites?'#1E3A8A88':'rgba(255,255,255,0.2)'}`,background:hideConduites?'rgba(30,58,138,0.25)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={hideConduites?'Mostrar conduítes':'Ocultar conduítes livres'}>
                  <i className={hideConduites?'ti ti-vector-off':'ti ti-vector'} aria-hidden/>{hideConduites?'Condts ocultos':'Ocultar condts'}
                </button>}
                {markers.some(m=>classifyEle(m)?.sym==='caixa_conduite') && <button onClick={()=>setHideCaixas(h=>!h)} style={{height:32,borderRadius:6,border:`1px solid ${hideCaixas?'#1E3A8A88':'rgba(255,255,255,0.2)'}`,background:hideCaixas?'rgba(30,58,138,0.25)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}}>
                  <i className="ti ti-box" aria-hidden/>{hideCaixas?'Caixas ocultas':'Ocultar caixas'}
                </button>}
                <button onClick={undo} disabled={!histInfo.canUndo} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:histInfo.canUndo?'#fff':'rgba(255,255,255,0.3)',cursor:histInfo.canUndo?'pointer':'default',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Desfazer (Ctrl+Z)">
                  <i className="ti ti-arrow-back-up" aria-hidden/>Desfazer
                </button>
                <button onClick={redo} disabled={!histInfo.canRedo} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:histInfo.canRedo?'#fff':'rgba(255,255,255,0.3)',cursor:histInfo.canRedo?'pointer':'default',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Refazer (Ctrl+Shift+Z)">
                  <i className="ti ti-arrow-forward-up" aria-hidden/>Refazer
                </button>
                <button onClick={limparItens} style={{height:32,borderRadius:6,border:'1px solid #DC262688',background:'rgba(220,38,38,0.12)',color:'#FCA5A5',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Remover todos os itens">
                  <i className="ti ti-eraser" aria-hidden/>Limpar
                </button>
                {bgImage && markers.length>0 && <button onClick={encaixarPontosNaPlanta} style={{height:32,borderRadius:6,border:'1px solid #0EA5E9',background:'rgba(14,165,233,0.15)',color:'#7DD3FC',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',fontWeight:600}} title="Traz os pontos que ficaram na margem branca para dentro do desenho da planta (desfazível)">
                  <i className="ti ti-viewport-narrow" aria-hidden/>Encaixar na planta
                </button>}
                <button onClick={voltarEtapa} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Voltar uma etapa">
                  <i className="ti ti-chevron-left" aria-hidden/>Voltar
                </button>
                <button onClick={avancarEtapa} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Avançar uma etapa">
                  Avançar<i className="ti ti-chevron-right" aria-hidden/>
                </button>
                <button onClick={recomecar} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Recomeçar do zero">
                  <i className="ti ti-refresh" aria-hidden/>Recomeçar
                </button>
                {fromProposal && <button onClick={importarDaProposta} style={{height:32,borderRadius:6,border:'1px solid #059669',background:'rgba(5,150,105,0.18)',color:'#6EE7B7',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Adicionar os itens da proposta aos cômodos">
                  <i className="ti ti-download" aria-hidden/>Importar da proposta
                </button>}
                <button onClick={apagarProjeto} style={{height:32,borderRadius:6,border:'1px solid #DC2626',background:'rgba(220,38,38,0.18)',color:'#FCA5A5',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Apagar planta, itens e cabos">
                  <i className="ti ti-trash" aria-hidden/>Apagar projeto
                </button>
                <button onClick={()=>setShowRackModal(true)} style={{height:32,borderRadius:6,border:'1px solid #7C3AED',background:'rgba(124,58,237,0.2)',color:'#C4B5FD',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}>
                  <i className="ti ti-server" aria-hidden/>Rack CPD
                </button>
                <button onClick={()=>setShowCreds(true)} style={{height:32,borderRadius:6,border:'1px solid #F59E0B',background:'rgba(245,158,11,0.18)',color:'#FCD34D',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="SSIDs, VLANs e senhas do projeto. No documento saem mascaradas.">
                  <i className="ti ti-key" aria-hidden/>Credenciais{(creds.wifi||[]).filter(w=>w.ssid||w.senha).length||creds.cams.user||creds.cams.senha?' ✓':''}
                </button>
                <button onClick={()=>setShowFloorsModal(true)} style={{height:32,borderRadius:6,border:'1px solid #0EA5E9',background:'rgba(14,165,233,0.18)',color:'#7DD3FC',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Uma planta por pavimento — suba a imagem de cada andar em alta resolução."><i className="ti ti-stack-2" aria-hidden/>Pavimentos{plantaFloors.length>1?` (${plantaFloors.length})`:''}</button>
                <button onClick={e=>{e.stopPropagation();bgOnlyRef.current?.click()}} style={{height:32,borderRadius:6,border:'none',background:'#0EA5E9',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Troca a imagem do pavimento ativo."><i className="ti ti-upload" aria-hidden/>{bgImage?'Trocar planta':'Carregar planta'}</button>
                <input ref={bgOnlyRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleBgOnly}/>
                <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>−</button>
                <span style={{color:'#fff',fontSize:11,display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>Math.min(3,z+0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>+</button>
              </div>
              {plantaFloors.length>1 && <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',padding:'0 0 8px',justifyContent:'center'}}>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.6,marginRight:2}}>Pavimento</span>
                {plantaFloors.map((f,i)=>{ const ativo=f.id===activeFloorId; const n=markers.filter(m=>(m.floorId||activeFloorId)===f.id).length
                  return <button key={f.id} onClick={()=>setActiveFloor(f.id)} title={f.image?'Editar este pavimento':'Este pavimento ainda não tem imagem'}
                    style={{height:30,padding:'0 12px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:ativo?700:500,display:'flex',alignItems:'center',gap:6,
                      border:`1px solid ${ativo?'#0EA5E9':'rgba(255,255,255,0.18)'}`,background:ativo?'rgba(14,165,233,0.22)':'rgba(255,255,255,0.05)',color:ativo?'#7DD3FC':'rgba(255,255,255,0.7)'}}>
                    {!f.image && <span title="sem imagem" style={{opacity:0.6}}>○</span>}
                    {f.nome||`Pavimento ${i+1}`}
                    <span style={{fontSize:9.5,opacity:0.7}}>{n}</span>
                  </button> })}
                <button onClick={()=>setShowFloorsModal(true)} title="Gerenciar pavimentos" style={{height:30,width:30,borderRadius:8,cursor:'pointer',border:'1px dashed rgba(255,255,255,0.25)',background:'transparent',color:'rgba(255,255,255,0.6)',fontSize:14,fontFamily:'inherit'}}>+</button>
              </div>}
              <div ref={containerRef} style={{position:'relative',display:'block',margin:'0 auto',cursor:addMode?'crosshair':'default',width:bgImage?`${zoom*100}%`:`${Math.min(640*zoom,window.innerWidth*0.82)}px`,transformOrigin:'top center'}} onClick={onCanvasClick}>
                {bgImage ? <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false} onLoad={e=>{const im=e.target; if(im.naturalWidth)setImgRatio(im.naturalHeight/im.naturalWidth); computeContentBox(im)}}/>
                  : <div style={{width:'100%',aspectRatio:'4/3',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px)',backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:10,position:'relative'}}>
                      <div style={{position:'absolute',top:10,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.45)',pointerEvents:'none'}}>Pontos posicionados — arraste para ajustar, ou carregue a planta.</div>
                    </div>}
                {/* ── Camada de CABOS (planta elétrica) ── */}
                {<svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:4,overflow:'visible'}} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {cables.map(c=>{
                    // conduítes livres: respeitam hideConduites; em modo edição, oculta TODOS exceto o selecionado
                    if(c.free && (hideConduites || (conduitEditMode && c.id!==selCable))) return null
                    if(!c.free && hideCables) return null
                    // PAVIMENTO: cabo cujos pontos são de outro andar não aparece aqui.
                    // (conduíte livre não tem ponta — segue visível em todos os andares por ora)
                    { const _fa=(markers.find(x=>x.uid===c.fromUid)||{}).floorId
                      const _fb=(markers.find(x=>x.uid===c.toUid)||{}).floorId
                      if((_fa&&_fa!==activeFloorId)||(_fb&&_fb!==activeFloorId)) return null }
                    // oculta o cabo conforme a categoria FILTRADA. Usa o tipo do cabo (não os itens),
                    // assim cabos que tocam prumada/quadro/rack (estruturais) não somem indevidamente.
                    if(filterCateg.size>0 && !c.free){
                      // categoria a que o cabo pertence, pelo seu tipo
                      const catDoCabo = (t=>{
                        if(['dados','ap','uplink','hdmi','fibra','conduite_dados'].includes(t)) return 'Redes'
                        if(['camera'].includes(t)) return 'Segurança'
                        if(['som'].includes(t)) return 'Sonorização'
                        if(['eletrica','conduite_eletrica'].includes(t)) return 'Automação'
                        return null
                      })(c.type)
                      // também considera a categoria dos itens das pontas (ignorando estruturais)
                      const estrut = x=> !x || isRackItem(x.name,x.code) || ['prumada','quadro'].includes(classifyEle(x)?.sym)
                      const a=mk(c.fromUid), b=mk(c.toUid)
                      const catItem = x=> estrut(x)? null : (inferCategory(x.name||'').cat||null)
                      const cats = [catDoCabo, catItem(a), catItem(b)].filter(Boolean)
                      // visível se QUALQUER categoria associada ao cabo estiver entre as filtradas
                      const visivel = cats.length===0 ? true : cats.some(cat=>filterCateg.has(cat))
                      if(!visivel) return null
                    }
                    const pts=cablePolyPoints(c); if(pts.length<2) return null
                    const d=pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
                    const sel=selCable===c.id
                    const isCond=CABLE_CONDUITE[c.type]||c.free
                    // em modo edição de conduíte: realça cabos que estão dentro do conduíte selecionado
                    const condEdit = conduitEditMode && selCable && (() => { const cond=cables.find(x=>x.id===selCable); if(!cond?.free||c.free) return false; const chv=cond.conduiteId||(cond.label||'').trim()||cond.id; return !!chv&&c.conduite===chv })()
                    const isTeto=(uid)=>{ const m=mk(uid); if(!m)return false; const sym=classifyEle(m)?.sym||''; return ['tomada_teto','keystone_teto','ponto_som_teto'].includes(sym)||(sym==='ponto_luz'&&/teto/.test((m.note||'').toLowerCase())) }
                    const ehTeto=!c.free&&(isTeto(c.fromUid)||isTeto(c.toUid))
                    // representação por passagem (NBR 5444): teto=contínua c/ quadradinho, piso=traço longo, parede=traço curto
                    const dashPorPassagem = c.free ? ({teto:undefined, piso:'4,2', parede:'2,2'})[c.passagem||'parede'] : undefined
                    return <path key={c.id} d={d} fill="none" stroke={c.color}
                      strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                      strokeDasharray={c.free?dashPorPassagem:(ehTeto?'5,3':undefined)}
                      style={{pointerEvents:(cableMode||conduitMode||conduitEditMode||isCond)?'stroke':'none',cursor:'pointer',
                        filter:condEdit?`drop-shadow(0 0 4px ${c.color}) drop-shadow(0 0 6px #fff)`:sel?'drop-shadow(0 0 2px '+c.color+')':'none',
                        strokeWidth:sel?(isCond?6:3):condEdit?4:(isCond?5:2),opacity:conduitEditMode&&!condEdit&&!isCond?0.3:1}}
                      onClick={e=>{e.stopPropagation()
                        if(conduitEditMode && selCable){
                          const cond=cables.find(x=>x.id===selCable)
                          if(cond?.free && cond.label && !c.free){
                            const label=cond.label; const jaEstaDentro=c.conduite===label
                            if(jaEstaDentro){ setCables(cs=>cs.map(x=>x.id===c.id?{...x,conduite:undefined}:x)); return }
                            if(c.conduite && c.conduite!==label){
                              const mover=window.confirm(`Este cabo está no conduíte "${c.conduite}".\nMOVER para "${label}"?\n\nOK = Mover  |  Cancelar = Adicionar nos dois`)
                              // mover: troca o conduíte; adicionar nos dois: não faz nada especial (já vai ter o novo label)
                              setCables(cs=>cs.map(x=>x.id===c.id?{...x,conduite:mover?label:x.conduite}:x))
                              if(!mover){/* adiciona nos dois — mantém o antigo e adiciona outro apontando ao novo conduíte via nota */}
                              return
                            }
                            setCables(cs=>cs.map(x=>x.id===c.id?{...x,conduite:label}:x)); return
                          }
                        }
                        setSelCable(c.id)
                        if(c.free) setConduitEditMode(true)   // clicar no conduíte abre edição direta
                        else setConduitEditMode(false)}}/>
                  })}
                  {/* preview ao vivo do conduíte livre sendo desenhado */}
                  {conduitMode && conduitDraft.length>0 && <>
                    <path d={conduitDraft.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')} fill="none" stroke={CABLE_PALETTE[conduitType]} strokeDasharray="2,1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{strokeWidth:5,opacity:0.85}}/>
                  </>}
                  {/* linha da calibração de escala */}
                  {calibMode && calibPts.length>0 && <>
                    {calibPts.length===2 && <line x1={calibPts[0].x} y1={calibPts[0].y} x2={calibPts[1].x} y2={calibPts[1].y} stroke="#0EA5E9" strokeDasharray="1.5,1" vectorEffect="non-scaling-stroke" style={{strokeWidth:2.5}}/>}
                  </>}
                </svg>}
                {/* mira dos pontos de calibração */}
                {calibMode && calibPts.map((p,i)=>(
                  <div key={'cal'+i} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',width:16,height:16,zIndex:9,pointerEvents:'none'}}>
                    <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1.5,background:'#0EA5E9',transform:'translateX(-50%)'}}/>
                    <div style={{position:'absolute',top:'50%',left:0,right:0,height:1.5,background:'#0EA5E9',transform:'translateY(-50%)'}}/>
                    <div style={{position:'absolute',inset:3,border:'1.5px solid #0EA5E9',borderRadius:'50%',background:'rgba(14,165,233,0.15)'}}/>
                  </div>
                ))}
                {/* bolinhas dos pontos do conduíte livre em desenho */}
                {conduitMode && conduitDraft.map((p,i)=>(
                  <div key={'cd'+i} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',width:10,height:10,borderRadius:'50%',background:CABLE_PALETTE[conduitType],border:'2px solid #fff',zIndex:8,pointerEvents:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.5)'}}/>
                ))}
                {/* rótulos dos conduítes livres já criados */}
                {!hideConduites && cables.filter(c=>c.free && (c.conduiteId||c.label) && (!conduitEditMode || c.id===selCable)).map(c=>{ const pts=c.points||[]; if(pts.length<2) return null
                  const mid=pts[Math.floor(pts.length/2)]
                  const tag = c.conduiteId || (c.label||'').slice(0,8)
                  return <div key={'lbl'+c.id} onClick={e=>{e.stopPropagation(); setSelCable(c.id); setConduitEditMode(true)}} style={{position:'absolute',left:`${mid.x}%`,top:`${mid.y}%`,transform:'translate(-50%,-50%)',background:c.color||CABLE_PALETTE[c.type],color:'#fff',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:8,zIndex:8,whiteSpace:'nowrap',border:'1px solid #fff',boxShadow:'0 1px 3px rgba(0,0,0,0.4)',cursor:'pointer',fontFamily:'monospace',letterSpacing:0.5}}>{tag}</div>
                })}
                {/* pontos arrastáveis — cabos normais (só em cableMode) + conduítes livres (sempre que selecionado) */}
                {cables.filter(c=>{
                  if(c.id!==selCable) return false
                  if(c.free) return !hideConduites && !!selCable  // conduíte: handles sempre que selecionado
                  return !hideCables && cableMode               // cabo normal: só em cableMode
                }).map(c=>{
                  const pts=cablePolyPoints(c)
                  return <div key={'pts'+c.id}>
                    {(c.points||[]).map((p,idx)=>(
                      <div key={idx} className="cable-handle"
                        onMouseDown={e=>{e.stopPropagation(); if(!editLock) setDragPoint({cableId:c.id,idx})}}
                        onTouchStart={e=>{e.stopPropagation(); if(!editLock) setDragPoint({cableId:c.id,idx})}}
                        onDoubleClick={e=>{e.stopPropagation(); removeCablePoint(c.id,idx)}}
                        title="Arraste para curvar · duplo-clique remove ponto"
                        style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',zIndex:15,touchAction:'none',
                          /* conduíte agora com a MESMA alça do cabo (círculo 18px): pega melhor (Raphael) */
                          width:18,height:18,borderRadius:'50%',background:'#fff',border:`3px solid ${c.color}`,cursor:'move',boxShadow:'0 1px 4px rgba(0,0,0,0.6)'}}/>
                    ))}
                    {pts.slice(0,-1).map((p,i)=>{ const n=pts[i+1]; const mx=(p.x+n.x)/2, my=(p.y+n.y)/2
                      return <div key={'mid'+i} className="cable-handle"
                        onClick={e=>{e.stopPropagation(); addCablePoint(c.id,i,mx,my)}}
                        title="Clique para adicionar um ponto aqui (curvar)"
                        style={{position:'absolute',left:`${mx}%`,top:`${my}%`,transform:'translate(-50%,-50%)',zIndex:14,
                          width:12,height:12,borderRadius:c.free?2:3,background:c.color+'cc',border:'2px solid #fff',cursor:'copy',opacity:0.7}}/>
                    })}
                  </div>
                })}
                {markers.map(m=>{
                  const srch=editorSearch.toLowerCase()
                  const matchS=!editorSearch||m.name?.toLowerCase().includes(srch)||m.code?.toLowerCase().includes(srch)||m.room?.toLowerCase().includes(srch)
                  const matchR=filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo')
                  const matchC=filterCateg.size===0||filterCateg.has(inferCategory(m.name||'').cat||'Outros')
                  const matchI=!filterItem||m.name===filterItem
                  const matchL=filterLevels.size===0||filterLevels.has(alturaOf(m))
                  // PAVIMENTO: só os pontos do andar ativo. Ponto sem floorId (legado em memória)
                  // aparece no ativo pra não sumir do mapa.
                  const matchF=(m.floorId||activeFloorId)===activeFloorId
                  const isRack = isRackItem(m.name||'', m.code||'')
                  const _ele = classifyEle(m)
                  const isCaixaCond = _ele?.sym==='caixa_conduite'
                  const isQuadro = _ele?.sym==='quadro' || _ele?.sym==='prumada' || isCaixaCond
                  const visible = ((isRack||isQuadro) ? (matchS&&matchR&&matchI && !(isCaixaCond&&hideCaixas)) : (matchS&&matchR&&matchC&&matchI)) && matchL && matchF  // nível e pavimento valem para todos
                  const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
                  const sel=selected===m.uid
                  const isCableOrigin = cableDraft?.fromUid===m.uid
                  // em modo edição de conduíte: mostra se item já está dentro (tem cabo no conduíte)
                  const conduitAtivo = conduitEditMode && selCable ? cables.find(x=>x.id===selCable) : null
                  const conduitChave = conduitAtivo ? (conduitAtivo.conduiteId||(conduitAtivo.label||'').trim()||conduitAtivo.id) : null
                  const itemNoConduite = conduitAtivo?.free && conduitChave ? cables.some(x=>!x.free && x.conduite===conduitChave && (x.fromUid===m.uid||x.toUid===m.uid)) : false
                  return <div key={m.uid} className="mk-item" style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:5,
                    cursor:(cableMode||conduitEditMode)?'pointer':'grab',
                    opacity:visible?(conduitEditMode&&!itemNoConduite&&!isRack&&!isQuadro?0.4:1):0.07,
                    pointerEvents:visible?'auto':'none',transition:'opacity 0.15s',touchAction:'none'}}
                    onMouseDown={e=>{ if(!cableMode && !conduitEditMode) onDown(e,m.uid) }}
                    onTouchStart={e=>{ if(!cableMode && !conduitEditMode){ const t=e.touches[0]; onDown({preventDefault:()=>{},stopPropagation:()=>e.stopPropagation(),clientX:t.clientX,clientY:t.clientY},m.uid) } }}
                    onClick={e=>{ 
                      if(conduitMode){ e.stopPropagation(); return } // em modo desenho, clique na planta é detectado pelo onCanvasClick
                      if(cableMode){ e.stopPropagation(); onCableItemClick(m.uid) }
                      else if(conduitEditMode){ e.stopPropagation(); onCableItemClick(m.uid) }
                      else if(classifyEle(m)?.sym==='caixa_conduite'){ e.stopPropagation(); setSelected(m.uid) }
                    }}>
                    {/* anel verde ao redor dos itens já dentro do conduíte ativo */}
                    {itemNoConduite && <div style={{position:'absolute',inset:-5,borderRadius:'50%',border:`2.5px solid ${conduitAtivo?.color||'#22D3EE'}`,pointerEvents:'none',boxShadow:`0 0 6px ${conduitAtivo?.color||'#22D3EE'}`}}/>}
                    {isCableOrigin && <div style={{position:'absolute',inset:-7,borderRadius:'50%',border:'3px dashed #F59E0B',pointerEvents:'none'}}/>}
                    {/* anel de snap em modo conduíte: mostra onde pode conectar */}
                    {conduitMode && isCaixaCond && <div style={{position:'absolute',inset:-8,background:'rgba(34,211,238,0.2)',border:'2.5px solid #22D3EE',borderRadius:4,pointerEvents:'none',animation:'pulse 1.5s infinite'}}/>}
                    {isRack
                      ? <div style={{width:sel?30:24,height:sel?30:24,borderRadius:5,background:'#4C1D95',color:'#C4B5FD',fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #7C3AED',boxShadow:sel?`0 0 0 3px #7C3AED`:'0 2px 6px rgba(0,0,0,0.6)'}}><i className="ti ti-server" aria-hidden style={{fontSize:13}}/></div>
                      : (()=>{ const mount=mountOf(m)
                          // TODOS os selos (subwoofer S+E, AP/câmera sem PoE R+E) — a tela precisa
                          // mostrar o mesmo que o documento, senão o dois-cabos só aparece no PDF.
                          const fams=cableFamiliesOf(m,familiaDoPontoTipo(m))
                          return <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <div dangerouslySetInnerHTML={{__html: pinShapeSVG({m, mount, alt:alturaOf(m), color:catColorOf(m)||st.c, label:_pinLabel(m), size:sel?26:22, sel})}}/>
                            {showCabo && fams.map((f,i)=><div key={f.k} title={`Cabo: ${f.nome}`} style={{position:'absolute',top:-3,right:-3-i*11,minWidth:9,height:9,padding:0,borderRadius:5,background:f.cor,color:'#fff',fontSize:6,fontWeight:800,lineHeight:'9px',textAlign:'center',border:'1px solid #fff',pointerEvents:'none',fontFamily:"'DM Sans',sans-serif"}}>{f.L}</div>)}
                          </div> })()}
                    {/* rótulo de código só quando selecionado ou no modo "ver IDs" — planta mais limpa */}
                    {(sel||showIds) && <div style={{position:'absolute',left:'50%',top:sel?28:24,transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:isRack?'#C4B5FD':'#fff',borderRadius:3,padding:'1px 4px',fontSize:7.5,whiteSpace:'nowrap',fontFamily:'monospace',fontWeight:600,pointerEvents:'none'}}>{isRack?'RACK CPD':m.code}</div>}
                  </div>})}
              </div>
            </div>
            {/* ── Painel direito ── */}
            <div className="pe-editor-side" style={{width:220,background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
              {/* ── PAINEL DO CONDUÍTE (modo ativo) ── */}
              {conduitMode && <div style={{padding:14,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{color:'#93C5FD',fontWeight:700,marginBottom:8,fontSize:13}}><i className="ti ti-vector" aria-hidden/> Traçando conduíte</div>
                <div style={{display:'flex',gap:4,marginBottom:10}}>
                  {[['conduite_dados','DADOS','#1E3A8A'],['conduite_eletrica','ELÉTRICA','#EAB308'],['som','SOM','#BE185D']].map(([t,lb,col])=>(
                    <button key={t} onClick={()=>setConduitType(t)} style={{flex:1,fontSize:10,padding:'5px 0',borderRadius:8,border:`1.5px solid ${conduitType===t?col:'rgba(255,255,255,0.15)'}`,background:conduitType===t?col+'55':'transparent',color:conduitType===t?'#fff':'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>{lb}</button>
                  ))}
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:10,textAlign:'center'}}>{conduitDraft.length===0?'Clique na planta para marcar o caminho':conduitDraft.length===1?'Continue clicando...':conduitDraft.length+` pontos${plantScale?' · ~'+Math.round((polyLenWidthUnits(conduitDraft)*plantScale)*1.15+1)+'m':''}`}</div>
                <button onClick={finishConduit} disabled={conduitDraft.length<2} style={{width:'100%',fontSize:12,padding:'8px 0',borderRadius:8,border:'none',background:conduitDraft.length<2?'rgba(255,255,255,0.08)':'#16A34A',color:conduitDraft.length<2?'rgba(255,255,255,0.25)':'#fff',cursor:conduitDraft.length<2?'default':'pointer',fontWeight:700,marginBottom:6}}>✓ Finalizar</button>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setConduitDraft(p=>p.slice(0,-1))} disabled={conduitDraft.length===0} style={{flex:1,fontSize:10,padding:'5px 0',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer'}}>↶ desfazer</button>
                  <button onClick={cancelConduit} style={{flex:1,fontSize:10,padding:'5px 0',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer'}}>Cancelar</button>
                </div>
              </div>}
              {/* ── PAINEL DO CONDUÍTE SELECIONADO ── */}
              {!conduitMode && selCable && (()=>{ const c=cables.find(x=>x.id===selCable); if(!c?.free) return null
                const label=(c.label||'').trim()
                const chave = c.conduiteId || label || c.id
                const cabosNaoCond = cables.filter(x=>!x.free && x.conduite===chave)
                const mets=cableMeters(c); const mt=mets?Math.round(mets)+'m':''
                return <div style={{padding:14,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  {/* Cabeçalho */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:c.color||'#1E3A8A',flexShrink:0}}/>
                    <div style={{flex:1,fontSize:12,fontWeight:700,color:'#fff'}}>{label||'Conduíte sem rótulo'}</div>
                    {mt&&<div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{mt}</div>}
                    <button onClick={()=>{setSelCable(null);setConduitEditMode(false)}} title="Fechar / desselecionar (Esc)" style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 2px'}}>×</button>
                  </div>
                  {/* Tipo */}
                  <div style={{display:'flex',gap:4,marginBottom:10}}>
                    {[['conduite_dados','DADOS','#1E3A8A'],['conduite_eletrica','ELÉTRICA','#EAB308'],['som','SOM','#BE185D']].map(([t,lb,col])=>(
                      <button key={t} onClick={()=>setCableColor(c.id,t)} style={{flex:1,fontSize:9.5,padding:'4px 0',borderRadius:7,border:`1.5px solid ${c.type===t?col:'rgba(255,255,255,0.12)'}`,background:c.type===t?col+'44':'transparent',color:c.type===t?'#fff':'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>{lb}</button>
                    ))}
                  </div>
                  {/* ID do conduíte + conexões */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{background:'rgba(255,255,255,0.1)',borderRadius:6,padding:'4px 10px',fontSize:14,fontWeight:800,color:'#fff',letterSpacing:1,fontFamily:'monospace'}}>{c.conduiteId||'?'}</div>
                    {(c.fromSnapName||c.fromCaixaUid) && <div style={{fontSize:9,color:'#93C5FD',flex:1}}>de: <b>{c.fromSnapName||`CX#${markers.find(m=>m.uid===c.fromCaixaUid)?.n||'?'}`}</b></div>}
                    {(c.toSnapName||c.toCaixaUid) && <div style={{fontSize:9,color:'#93C5FD',flex:1}}>para: <b>{c.toSnapName||`CX#${markers.find(m=>m.uid===c.toCaixaUid)?.n||'?'}`}</b></div>}
                  </div>
                  {/* Descrição (opcional) */}
                  <input value={c.label||''} onChange={e=>setCables(cs=>cs.map(x=>x.id===c.id?{...x,label:e.target.value}:x))} placeholder="Descrição opcional (ex: Sala → Rack)"
                    style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'5px 8px',color:'rgba(255,255,255,0.7)',fontSize:10,fontFamily:'inherit',boxSizing:'border-box',marginBottom:8}}/>
                  {/* Passagem: teto / piso / parede (muda a representação na planta) */}
                  <div style={{fontSize:8.5,color:'rgba(255,255,255,0.4)',marginBottom:3}}>Passagem do conduto</div>
                  <div style={{display:'flex',gap:4,marginBottom:8}}>
                    {[['teto','▱ Teto'],['piso','┄ Piso'],['parede','╌ Parede']].map(([p,lb])=>(
                      <button key={p} onClick={()=>setCables(cs=>cs.map(x=>x.id===c.id?{...x,passagem:p}:x))} style={{flex:1,fontSize:9,padding:'4px 0',borderRadius:6,border:`1px solid ${(c.passagem||'parede')===p?'#22D3EE':'rgba(255,255,255,0.12)'}`,background:(c.passagem||'parede')===p?'rgba(34,211,238,0.18)':'transparent',color:(c.passagem||'parede')===p?'#22D3EE':'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>{lb}</button>
                    ))}
                  </div>
                  {/* Diâmetro do eletroduto (Raphael): 1/2", 3/4" ou 1". Auto = pelo nº de cabos. */}
                  <div style={{fontSize:8.5,color:'rgba(255,255,255,0.4)',marginBottom:3}}>Diâmetro do eletroduto</div>
                  <div style={{display:'flex',gap:4,marginBottom:8}}>
                    {[['','Auto'],['1/2"','1/2"'],['3/4"','3/4"'],['1"','1"']].map(([v,lb])=>{ const on=(c.diametro||'')===v
                      return <button key={lb} onClick={()=>setCables(cs=>cs.map(x=>x.id===c.id?{...x,diametro:v||undefined}:x))} style={{flex:1,fontSize:9.5,padding:'4px 0',borderRadius:6,border:`1px solid ${on?'#22D3EE':'rgba(255,255,255,0.12)'}`,background:on?'rgba(34,211,238,0.18)':'transparent',color:on?'#22D3EE':'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontWeight:on?800:600}}>{lb}</button> })}
                  </div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Cabos dentro ({cabosNaoCond.length})</div>
                  {cabosNaoCond.length>0 && <div style={{marginBottom:8}}>
                    {cabosNaoCond.map(x=>{ const a=mk(x.fromUid),b=mk(x.toUid); return <div key={x.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 6px',background:'rgba(255,255,255,0.05)',borderRadius:6,marginBottom:4}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:x.color||'#fff',flexShrink:0}}/>
                      <span style={{flex:1,fontSize:9.5,color:'rgba(255,255,255,0.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}><b>#{a?.n}</b> → <b>#{b?.n}</b> {CABLE_LABELS[x.type]||x.type}</span>
                      <button onClick={()=>setCables(cs=>cs.map(q=>q.id===x.id?{...q,conduite:undefined}:q))} style={{fontSize:10,background:'none',border:'none',color:'rgba(255,50,50,0.7)',cursor:'pointer',padding:0,flexShrink:0}}>✕</button>
                    </div>})}
                  </div>}
                  {/* Instrução para adicionar — sempre visível */}
                  <div style={{background:conduitEditMode?'rgba(34,211,238,0.12)':'rgba(255,255,255,0.04)',border:`2px solid ${conduitEditMode?'#22D3EE':'rgba(255,255,255,0.1)'}`,borderRadius:8,padding:'8px 10px',marginBottom:8,cursor:'pointer',textAlign:'center',transition:'all 0.15s'}} onClick={()=>setConduitEditMode(v=>!v)}>
                    {conduitEditMode
                      ? <><div style={{fontSize:11,fontWeight:700,color:'#22D3EE'}}>✓ Clique nos itens da planta</div>
                          <div style={{fontSize:9,color:'rgba(34,211,238,0.7)',marginTop:2}}>itens dentro ficam com anel colorido · clique de novo pra tirar</div></>
                      : <><div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>Editar cabos dentro</div>
                          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:2}}>toque aqui e clique nos itens/cabos na planta</div></>}
                  </div>
                  {/* Caixa de passagem */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:10,marginTop:2}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Caixa de passagem</div>
                    {(()=>{ const cxFrom=c.fromCaixaUid?markers.find(m=>m.uid===c.fromCaixaUid):null
                             const cxTo=c.toCaixaUid?markers.find(m=>m.uid===c.toCaixaUid):null
                      return <>{(cxFrom||cxTo)&&<div style={{marginBottom:8}}>
                        {cxFrom&&<div style={{fontSize:9.5,color:'#93C5FD',padding:'3px 6px',background:'rgba(30,58,138,0.15)',borderRadius:5,marginBottom:3}}>↗ Sai da caixa #{cxFrom.n} {cxFrom.note||''}</div>}
                        {cxTo&&<div style={{fontSize:9.5,color:'#93C5FD',padding:'3px 6px',background:'rgba(30,58,138,0.15)',borderRadius:5}}>↘ Chega na caixa #{cxTo.n} {cxTo.note||''}</div>}
                      </div>}
                      <button onClick={()=>{ const cx=cxTo||cxFrom
                        setConduitDraft(cx?[{x:cx.x,y:cx.y,caixaUid:cx.uid}]:[])
                        setConduitType(c.type||'conduite_dados')
                        setConduitMode(true); setSelCable(null); setConduitEditMode(false) }}
                        style={{width:'100%',fontSize:10.5,padding:'7px 0',borderRadius:7,border:'1.5px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                        ➕ {cxFrom||cxTo?`Novo conduíte da caixa #${(cxTo||cxFrom).n}`:'Traçar novo conduíte a partir de uma caixa'}
                      </button>
                      {!cxFrom&&!cxTo&&<div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:5,textAlign:'center'}}>Ao traçar um conduíte, clique numa caixa CX para conectar</div>}</>
                    })()}
                  </div>
                  {/* Obs + Remover */}
                  <input value={c.obs||''} onChange={e=>setCables(cs=>cs.map(x=>x.id===c.id?{...x,obs:e.target.value}:x))} placeholder="Observação (opcional)"
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 8px',color:'rgba(255,255,255,0.6)',fontSize:10,fontFamily:'inherit',boxSizing:'border-box',marginTop:10,marginBottom:8}}/>
                  <button onClick={()=>{ deleteCable(c.id); setConduitEditMode(false) }} style={{width:'100%',fontSize:10,padding:'6px 0',borderRadius:7,border:'1px solid rgba(220,38,38,0.4)',background:'transparent',color:'#FCA5A5',cursor:'pointer'}}>
                    <i className="ti ti-trash" aria-hidden/> Apagar conduíte
                  </button>
                </div>
              })()} 
              {/* ── PAINEL DO CABO NORMAL SELECIONADO ── */}
              {!conduitMode && selCable && (()=>{ const c=cables.find(x=>x.id===selCable); if(!c||c.free) return null
                return <div style={{padding:12,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{color:'#FBBf24',fontWeight:700,marginBottom:8,fontSize:12}}><i className="ti ti-route" aria-hidden/> Cabo</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginBottom:8}}><b>{mk(c.fromUid)?.name||'?'}</b> → <b>{mk(c.toUid)?.name||'?'}</b>
                  {c.runId&&(()=>{ const grupo=cables.filter(x=>x.runId===c.runId)
                    const seg1=grupo.find(x=>x.runToUid)||grupo[0], segF=grupo.find(x=>!x.runToUid)||grupo[grupo.length-1]
                    const oM=mk(seg1?.runFromUid||seg1?.fromUid), dM=mk(segF?.toUid)
                    const tot=grupo.reduce((s,x)=>s+(cableMeters(x)||0),0)
                    return <div style={{marginTop:3,fontSize:9,color:'#6EE7B7',background:'rgba(16,163,74,0.12)',borderRadius:4,padding:'3px 6px',lineHeight:1.45}}>
                      ↳ Percurso pela prumada: <b>{oM?.name||'?'}</b> → <b>{dM?.name||'?'}</b>{tot>0?<> · total ~{Math.round(tot*10)/10}m</>:null}
                      <br/><span style={{opacity:.7}}>Nas tabelas sai como UMA linha, com essa origem e esse destino. Pé-direito contado uma vez.</span>
                    </div> })()}
                </div>
                <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8}}>
                  {[['dados','Keystone','#2563EB'],['ap','AP','#F59E0B'],['camera','Câm','#92400E'],['uplink','Uplk','#DC2626'],['hdmi','HDMI','#7C3AED'],['som','Som','#BE185D'],['eletrica','Elét','#16A34A'],['fibra','Fibra','#0D9488'],['conduite_dados','C.KEY','#1E3A8A'],['conduite_eletrica','C.ELÉT','#EAB308']].map(([t,lb,col])=>(
                    <button key={t} onClick={()=>setCableColor(c.id,t)} style={{fontSize:9,padding:'2px 6px',borderRadius:8,border:`1px solid ${c.type===t?col:'rgba(255,255,255,0.15)'}`,background:c.type===t?col+'33':'transparent',color:c.type===t?'#fff':'rgba(255,255,255,0.45)',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:6,height:6,borderRadius:'50%',background:col}}/>{lb}</button>
                  ))}
                </div>
                {CABLE_SPEC[c.type]&&<div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:8,padding:'3px 6px',background:'rgba(255,255,255,0.04)',borderRadius:5}}>{CABLE_LABELS[c.type]} · {CABLE_SPEC[c.type].spec}</div>}
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,fontSize:10,color:'rgba(255,255,255,0.6)'}}>
                  <span>Metros:</span>
                  <input type="number" step="0.5" value={c.meters??''} placeholder={plantScale?(cableMeters({...c,meters:undefined})??'auto'):'—'} onChange={e=>setCableMetersManual(c.id,e.target.value)}
                    style={{width:60,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,padding:'3px 6px',color:'#fff',fontSize:10,fontFamily:'inherit'}}/>
                  {c.meters!=null&&c.meters!==''&&<button onClick={()=>setCableMetersManual(c.id,'')} style={{fontSize:9,padding:'2px 5px',borderRadius:4,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}>auto</button>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>deleteCable(c.id)} style={{flex:1,fontSize:10,padding:'5px 0',borderRadius:7,border:'1px solid rgba(220,38,38,0.4)',background:'transparent',color:'#FCA5A5',cursor:'pointer'}}><i className="ti ti-trash" aria-hidden/> Apagar</button>
                  <button onClick={()=>setSelCable(null)} style={{flex:1,fontSize:10,padding:'5px 0',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.5)',cursor:'pointer'}}>Fechar</button>
                </div>
              </div> })()}
              {/* ── INSTRUÇÃO MODO CABOS (sem seleção) ── */}
              {!conduitMode && cableMode && !selCable && <div style={{padding:14,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{color:'#FBBf24',fontWeight:700,marginBottom:6,fontSize:12}}><i className="ti ti-route" aria-hidden/> Modo cabos</div>
                {!cableDraft
                  ? <div style={{color:'rgba(255,255,255,0.55)',fontSize:10,lineHeight:1.5}}>Clique no item de <b>origem</b>, depois no <b>destino</b>. O cabo é traçado automaticamente.</div>
                  : <div style={{color:'#FBBf24',fontSize:10,lineHeight:1.5}}>{cableDraft._run
                      ? <>Cabo atravessou a prumada. Continuando do par <b>{mk(cableDraft.fromUid)?.name}</b> no outro pavimento — clique no <b>destino final</b>.</>
                      : <>Origem: <b>{mk(cableDraft.fromUid)?.name}</b><br/>Agora clique no destino.</>} <span onClick={()=>setCableDraft(null)} style={{textDecoration:'underline',cursor:'pointer',color:'rgba(255,255,255,0.5)'}}>cancelar</span></div>}
              </div>}
              {selected ? (()=>{const m=markers.find(x=>x.uid===selected); if(!m)return null
                const rNames=[...new Set([...rooms.map(r=>r.name), ...markers.map(x=>x.room).filter(Boolean)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt'))
                return <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Item {m.id}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{m.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'monospace',marginBottom:10}}>{m.code}</div>
                  {/* If this is a rack item, show rack config button */}
                  {isRackItem(m.name,m.code) && <button onClick={()=>{setRackEquip(m.rackEquip||[]); setShowRackModal(true)}}
                    style={{width:'100%',background:'rgba(124,58,237,0.2)',border:'1px solid #7C3AED',borderRadius:5,color:'#C4B5FD',cursor:'pointer',padding:'7px',fontSize:11,marginBottom:10,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <i className="ti ti-server" aria-hidden/>{(m.rackEquip||[]).reduce((s,e)=>s+(parseInt(e.qty)||1),0)} equipamentos no rack — editar
                  </button>}
                  <label style={lbl}>Ambiente</label>
                  <select value={rNames.includes(m.room)?m.room:(m.room?'__custom__':'')} onChange={e=>{
                    const val=e.target.value
                    if(val==='__new__'){
                      const nome=window.prompt('Nome do novo cômodo:')
                      if(!nome?.trim())return
                      if(!window.confirm(`Confirmar: adicionar "${nome.trim()}" à lista de cômodos?`))return
                      const maxId=rooms.reduce((mx,r)=>Math.max(mx,r.id||0),0)
                      setRooms(rs=>[...rs,{id:maxId+1,name:nome.trim(),floor:'',x:50,y:50}])
                      const newId = genItemId(nome.trim(), m.subcategory||inferCategory(m.name).sub||'', markers)
                      setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,room:nome.trim(),id:newId}:x))
                    } else {
                      const newId = genItemId(val, m.subcategory||inferCategory(m.name).sub||'', markers.filter(x=>x.uid!==m.uid))
                      setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,room:val,id:newId}:x))
                    }
                  }} style={{...inputDark,marginBottom:8}}>
                    <option value="">— selecionar —</option>
                    {rNames.map(r=><option key={r} value={r}>{r}</option>)}
                    {m.room&&!rNames.includes(m.room)&&<option value="__custom__">{m.room}</option>}
                    <option value="__new__">+ Novo cômodo…</option>
                  </select>
                  <label style={lbl}>ID único</label>
                  <input value={m.id} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,id:e.target.value}:x))} style={inputDark}/>
                  <label style={lbl}>Local e altura (forma + tracinho do pin)</label>
                  {(()=>{ const cur=alturaOf(m); const auto=alturaOf({...m,altura:undefined,mount:undefined})
                    const opt=[['baixa','○ Baixa 0,30'],['media','○ Média 1,10'],['alta','○ Alta 1,80'],['piso','□ Piso'],['teto','△ Teto']]
                    return <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:4}}>
                      {opt.map(([v,lb])=>{ const on=cur===v; const isAuto=!(m.altura||m.mount)
                        return <button key={v} onClick={()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,altura:(m.altura===v?undefined:v),mount:undefined}:x))}
                          title={isAuto?`Automático → ${ALT_LABEL[auto]}`:'Clique de novo para voltar ao automático'}
                          style={{flex:'1 0 30%',fontSize:10.5,padding:'5px 0',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600,
                            border:`1px solid ${on?'#38BDF8':'rgba(255,255,255,0.15)'}`,
                            background:on?'rgba(56,189,248,0.18)':'transparent',
                            color:on?'#7DD3FC':'rgba(255,255,255,0.55)'}}>{lb}</button> })}
                    </div> })()}
                  <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Cor = categoria · forma = plano · tracinho = altura · selo = cabo.</div>
                  {/* "Tipo do ponto" e "Teclas" saíram (Raphael): quem decide o tipo e o nº de
                      teclas é o ITEM (o nome do produto). Categoriar isso no painel era redundante
                      com os quadrinhos de altura acima. Pra mudar tipo/teclas, troca-se o item. */}
                  {(()=>{ const det=classifyEle(m)
                    if(!det) return null
                    return <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginBottom:8,padding:'5px 8px',background:'rgba(255,255,255,0.04)',borderRadius:6}}>
                      Tipo (pelo item): <b style={{color:'rgba(255,255,255,0.7)'}}>{det.tipo}</b></div>
                  })()}
                  {/* Caixa de embutir — só para pontos que usam caixa (interruptor/tomada) */}
                  {(()=>{ const sym=classifyEle(m)?.sym; if(!/interruptor|tomada|modulo/.test(sym||'')) return null
                    const padrao=caixaPadrao(sym); const atual=m.caixaTipo||padrao
                    return <><label style={lbl}>Caixa de embutir {!m.caixaTipo&&<span style={{color:'#6EE7B7',fontWeight:400}}>(auto: {padrao})</span>}</label>
                    <select value={m.caixaTipo||'auto'} onChange={e=>{const v=e.target.value; setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,caixaTipo:v==='auto'?undefined:v}:x))}} style={inputDark}>
                      <option value="auto">✨ Automático → {padrao}</option>
                      <option value="4x2">Caixa 4×2 (1 a 3 módulos)</option>
                      <option value="4x4">Caixa 4×4 (4+ módulos / 6 teclas)</option>
                      <option value="octogonal">Octogonal (teto)</option>
                    </select></>
                  })()}
                  {/* Alimentação de AP/câmera: PoE (1 cabo) ou fonte externa (CAT6 + elétrica).
                      Não dá pra adivinhar pelo modelo — é decisão de projeto, então pergunta. */}
                  {(()=>{ const n=((m.name||'')+' '+(m.code||'')).toLowerCase()
                    if(!/c[âa]mera|camera|dome|bullet|access point|\bap\b|wi-?fi|u6|u7|uap/.test(n)) return null
                    const bAlim=(txt,on,onClick)=><button onClick={onClick} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:on?700:500,
                      border:`1px solid ${on?'#38BDF8':'rgba(255,255,255,0.2)'}`,background:on?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{txt}</button>
                    return <><label style={lbl}>Alimentação</label>
                    <div style={{display:'flex',gap:8,marginBottom:8}}>
                      {bAlim('PoE · 1 cabo',!m.semPoe,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,semPoe:false}:x)))}
                      {bAlim('Fonte externa · 2 cabos',!!m.semPoe,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,semPoe:true}:x)))}
                    </div>
                    <div style={{fontSize:9.5,color:m.semPoe?'#6EE7B7':'rgba(255,255,255,0.4)',marginBottom:8,lineHeight:1.5}}>
                      {m.semPoe
                        ? <>Chegam <b>dois cabos</b>: CAT6 (dados) + 2×2,5mm² (F+N). Na planta o pino ganha <b>dois selos</b> — R e E.</>
                        : <>Um cabo só: CAT6 com PoE leva dados e energia juntos.</>}
                    </div></>
                  })()}
                  {/* Subwoofer: ativo (amplificador embutido → precisa de tomada) x passivo (só
                      falante, cabo de som, sem elétrica). Não dá pra saber pelo nome. */}
                  {(()=>{ if(!isSubwoofer(m)) return null
                    const bSub=(txt,on,onClick)=><button onClick={onClick} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:on?700:500,
                      border:`1px solid ${on?'#38BDF8':'rgba(255,255,255,0.2)'}`,background:on?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{txt}</button>
                    return <><label style={lbl}>Subwoofer</label>
                    <div style={{display:'flex',gap:8,marginBottom:8}}>
                      {bSub('Ativo · som + tomada',!m.subPassivo,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,subPassivo:false}:x)))}
                      {bSub('Passivo · só cabo de som',!!m.subPassivo,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,subPassivo:true}:x)))}
                    </div>
                    <div style={{fontSize:9.5,color:m.subPassivo?'#6EE7B7':'rgba(255,255,255,0.4)',marginBottom:8,lineHeight:1.5}}>
                      {m.subPassivo
                        ? <>Passivo: só o <b>cabo de som</b> (do receiver/amplificador). <b>Não precisa de tomada</b> — o pino fica só com o selo <b>S</b>.</>
                        : <>Ativo (amplificador embutido): <b>dois cabos</b> — RCA de sinal + tomada. O pino ganha <b>S e E</b>.</>}
                    </div></>
                  })()}
                  {/* Sensor: elétrica (cabo) ou pilha (sem cabo nenhum) — Raphael. */}
                  {(()=>{ const n=((m.name||'')+' '+(m.code||'')).toLowerCase()
                    if(!/sensor|presen[çc]a|mm-?wave|mv-?wave|\bmmw\b|receptor ir|emissor ir|hub ir|infraverm/.test(n)) return null
                    const bSen=(txt,on,onClick)=><button onClick={onClick} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:on?700:500,
                      border:`1px solid ${on?'#38BDF8':'rgba(255,255,255,0.2)'}`,background:on?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{txt}</button>
                    return <><label style={lbl}>Alimentação do sensor</label>
                    <div style={{display:'flex',gap:8,marginBottom:8}}>
                      {bSen('Elétrica · cabo',!m.pilha,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,pilha:false}:x)))}
                      {bSen('Pilha · sem cabo',!!m.pilha,()=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,pilha:true}:x)))}
                    </div>
                    <div style={{fontSize:9.5,color:m.pilha?'#6EE7B7':'rgba(255,255,255,0.4)',marginBottom:8,lineHeight:1.5}}>
                      {m.pilha
                        ? <>A pilha alimenta o sensor: <b>não passa cabo</b>. O ponto fica só marcando a posição — sem selo de cabo.</>
                        : <>Alimentado por <b>2×2,5mm² (F+N)</b> do quadro. Selo <b>E</b> no pino.</>}
                    </div></>
                  })()}
                  <label style={lbl}>Cabo que chega neste ponto</label>
                  {(()=>{ const det=familiaDoPontoTipo(m); const detL=CABLE_LABELS[det]||det
                    return <select value={m.cableType||'auto'} onChange={e=>{const v=e.target.value; setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,cableType:v==='auto'?undefined:v}:x))}} style={{...inputDark,marginBottom:8}}>
                    <option value="auto">✨ Automático → {detL}</option>
                    {Object.entries(CABLE_LABELS).filter(([k])=>k!=='ap'&&k!=='camera').map(([k,v])=><option key={k} value={k}>{k==='dados'?'Keystone (rede CAT6)':v} · {CABLE_SPEC[k]?.spec||''}</option>)}
                  </select> })()}
                  {/* Conferência, não trava: quem manda é o tipo + o cabo escolhidos acima.
                      Só avisa quando a combinação não existe ("tomada com cabo de rede"). */}
                  {(()=>{ const al=alertaDoPonto(m); if(!al) return null
                    return <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:8,padding:'7px 9px',borderRadius:7,background:'rgba(220,38,38,0.13)',border:'1px solid rgba(248,113,113,0.45)',color:'#FCA5A5',fontSize:11,lineHeight:1.4}}>
                      <i className="ti ti-alert-triangle" aria-hidden style={{fontSize:13,flexShrink:0,marginTop:1}}/><span>{al}</span>
                    </div> })()}
                  {/tomada|modulo_cabeceira/.test(classifyEle(m)?.sym||'') && (()=>{
                    const volt = /220/.test(m.note||'')?'220':/110|127/.test(m.note||'')?'110':''
                    const setVolt=v=>{ const base=(m.note||'').replace(/\b(110|127|220)\s*V?\b/gi,'').replace(/\s{2,}/g,' ').trim()
                      setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,note:(base?base+' ':'')+(v?v+'V':'')}:x)) }
                    return <div style={{marginBottom:8}}>
                      <label style={{...lbl,marginTop:0}}>Tensão</label>
                      <div style={{display:'flex',gap:5}}>
                        {[['','—'],['110','110V'],['220','220V']].map(([v,lb])=>(
                          <button key={v} onClick={()=>setVolt(v)} style={{flex:1,fontSize:11,padding:'5px 0',borderRadius:6,cursor:'pointer',border:`1px solid ${volt===v?(v==='220'?'#DC2626':v==='110'?'#0891B2':'rgba(255,255,255,0.25)'):'rgba(255,255,255,0.15)'}`,background:volt===v?(v==='220'?'rgba(220,38,38,0.25)':v==='110'?'rgba(8,145,178,0.25)':'rgba(255,255,255,0.1)'):'transparent',color:'#fff',fontFamily:'inherit'}}>{lb}</button>
                        ))}
                      </div>
                    </div> })()}
                    {classifyEle(m)?.sym==='caixa_conduite' && (()=>{
                      const chegam = cables.filter(c=>c.free && (c.toCaixaUid===m.uid || c.fromCaixaUid===m.uid))
                      return <div style={{background:'rgba(30,58,138,0.15)',border:'1.5px solid #1E3A8A',borderRadius:8,padding:'10px',marginBottom:10}}>
                        <div style={{fontSize:11,color:'#93C5FD',fontWeight:700,marginBottom:8}}>⊞ Caixa {m.n||''} — {chegam.length} conduíte(s)</div>
                        {chegam.map(c=><div key={c.id} onClick={()=>{setSelCable(c.id);setSelected(null);setConduitEditMode(false)}} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',background:'rgba(255,255,255,0.05)',borderRadius:6,marginBottom:4,cursor:'pointer'}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:c.color||'#1E3A8A',flexShrink:0}}/>
                          <div style={{flex:1,fontSize:9.5,color:'rgba(255,255,255,0.8)',fontFamily:'monospace',fontWeight:700}}>{c.conduiteId||'?'}</div>
                          <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>{c.fromCaixaUid===m.uid?'↗ sai':'↘ chega'}</div>
                        </div>)}
                        <button onClick={()=>{setConduitDraft([{x:m.x,y:m.y,caixaUid:m.uid,snapName:m.name}]);setConduitMode(true);setSelected(null);setConduitEditMode(false)}}
                          style={{width:'100%',fontSize:10.5,padding:'7px 0',borderRadius:7,border:'1.5px solid #1E3A8A',background:'rgba(30,58,138,0.2)',color:'#93C5FD',cursor:'pointer',fontFamily:'inherit',fontWeight:600,marginTop:4}}>
                          ➕ Novo conduíte desta caixa
                        </button>
                      </div>
                    })()}
                    {classifyEle(m)?.sym==='prumada' && (()=>{
                    const par = markers.filter(x=>x.uid!==m.uid && classifyEle(x)?.sym==='prumada' && (x.prumadaCode||'').trim() && (x.prumadaCode||'').trim().toLowerCase()===(m.prumadaCode||'').trim().toLowerCase())
                    const altPar = parseFloat(m.prumadaAltura) || (par.find(x=>parseFloat(x.prumadaAltura))?.prumadaAltura) || 0
                    return <div style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.4)',borderRadius:6,padding:'8px 10px',marginBottom:8}}>
                    <div style={{fontSize:10,color:'#C4B5FD',fontWeight:700,marginBottom:6}}><i className="ti ti-arrows-vertical" aria-hidden/> PRUMADA — subida/descida entre andares</div>
                    <label style={{...lbl,marginTop:0}}>Código do par (mesmo nos 2 andares)</label>
                    <input value={m.prumadaCode||''} placeholder="ex: PR1"
                      onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,prumadaCode:e.target.value}:x))} style={inputDark}/>
                    {par.length>0
                      ? <div style={{fontSize:9.5,color:'#6EE7B7',marginTop:4,background:'rgba(16,163,74,0.12)',borderRadius:5,padding:'4px 7px'}}>✓ Pareada com a prumada #{par[0].n} ({par[0].room||'outro andar'}). Os cabos que entram numa saem na outra.</div>
                      : <div style={{fontSize:9,color:'#FBBF24',marginTop:4}}>⚠ Crie outra prumada com o MESMO código no outro andar para fechar o par.</div>}
                    <label style={lbl}>Altura do par (pé-direito, em metros)</label>
                    <input type="number" step="0.1" value={m.prumadaAltura||''} placeholder={altPar?`${altPar} (definida no par)`:'ex: 3'}
                      onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,prumadaAltura:e.target.value}:x))} style={inputDark}/>
                    <label style={lbl}>Rótulo (opcional)</label>
                    <input value={m.prumadaPav||''} placeholder="ex: Pav 2 → Pav 1 (CPD)"
                      onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,prumadaPav:e.target.value}:x))} style={inputDark}/>
                    <div style={{fontSize:9,color:'rgba(196,181,253,0.7)',marginTop:5,lineHeight:1.3}}>Crie 2 prumadas com o <b>mesmo código</b> (uma em cada andar). Ligue os pontos do andar de cima à prumada de cima, e a prumada de baixo ao CPD. O sistema entende que é o mesmo furo e soma a altura uma vez.<br/><b>Rede:</b> trate como cabo contínuo (sem emenda real).</div>
                  </div> })()}
                  <label style={lbl}>Nota (posição/altura)</label>
                  <textarea value={m.note} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,note:e.target.value}:x))} rows={3} style={{...inputDark,resize:'vertical'}}/>
                  <button onClick={()=>{
                      // Prumada é estrutural e vem em par entre pavimentos: apagar por engano
                      // desmancha a ligação. Pede o código 123 antes (Raphael).
                      if(classifyEle(m)?.sym==='prumada'){ const cod=window.prompt('Prumada é estrutural (par entre andares). Digite 1 2 3 para confirmar a remoção:'); if((cod||'').replace(/\s/g,'')!=='123'){ return } }
                      setMarkers(ms=>ms.filter(x=>x.uid!==m.uid).map((x,i)=>({...x,n:i+1})));setSelected(null)
                    }} style={{...btnGhost,width:'100%',marginTop:10,color:'#FCA5A5',borderColor:'rgba(220,38,38,0.4)'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                </div>})() : (
                <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Resumo</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8}}>{markers.length} equipamentos posicionados</div>
                  {(filterRooms.size>0||filterCateg.size>0||editorSearch||filterItem)&&<div style={{marginTop:8,fontSize:11,color:'#38BDF8',background:'rgba(56,189,248,0.1)',padding:'6px 8px',borderRadius:5}}>
                    Visíveis: {markers.filter(m=>{const s=editorSearch.toLowerCase();return((m.floorId||activeFloorId)===activeFloorId)&&(!editorSearch||m.name?.toLowerCase().includes(s)||m.code?.toLowerCase().includes(s)||m.room?.toLowerCase().includes(s))&&(filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo'))&&(filterCateg.size===0||filterCateg.has(inferCategory(m.name||'').cat||'Outros'))&&(!filterItem||m.name===filterItem)}).length} / {markers.length}
                  </div>}
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:10,lineHeight:1.6}}>
                    {conduitMode ? 'Clique na planta para traçar o conduíte.' : cableMode ? 'Clique na origem, depois no destino.' : 'Clique num marcador para editar.\nArraste para mover.\nUse o painel esquerdo para adicionar.'}
                  </div>
              </div>
            )}
            </div>
          </div>
        )}

        {step==='exec' && (
          <div style={{flex:1,overflowY:'auto',background:'#e8eaed',padding:'20px 0'}}>
            <style>{execVersao==='fable'?EXEC_CSS_FABLE:execVersao==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>
            {/* Seletor de versão do documento (Completo · Obra · Elétrica) */}
            <div style={{maxWidth:820,margin:'0 auto 14px',display:'flex',gap:8,alignItems:'center',padding:'0 4px',flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#475569',fontWeight:600,marginRight:4}}>Documento:</span>
              {/* Ordem pedida pelo Raphael: é a ordem da OBRA acontecendo — primeiro o pedreiro
                  deixa a infra, depois o projeto, depois o instalador, e a elétrica/conduíte
                  como anexos técnicos. */}
              {[['obra','Plano de Obra','ti-tools'],['completo','Projeto Executivo','ti-file-text'],['instalacao','Plano de Instalação','ti-plug'],['eletrica','Elétrica','ti-bolt'],['conduites','Conduítes','ti-route']].map(([m,label,icon])=>{
                const _stored = m==='obra'?execDocObra:m==='eletrica'?execDocEletrica:m==='conduites'?execDocConduites:m==='instalacao'?execDocInstal:execDoc
                let doc=_stored
                if(execData){ try{ doc=buildExecHtml(execData, m) }catch(e){ console.warn('re-render preview falhou, usando salvo:',e.message); doc=_stored } }
                if(doc && plantPct!==100) doc = `<style>.ex-plant{width:${plantPct}%!important;max-width:${plantPct}%!important}.ex-plant img{width:100%!important;max-width:100%!important}.ex-plant{margin-left:auto;margin-right:auto}</style>` + doc
                return (
                <button key={m} onClick={()=>{
                  setExecMode(m)
                  // sempre regenera ao clicar — garante que reflete o estado atual da planta (cabos, conduítes, itens)
                  try{
                    const d=buildExecDataFromMarkers()
                    const full=buildExecHtml(d,'completo'), obra=buildExecHtml(d,'obra')
                    const eletrica=buildExecHtml(d,'eletrica'), conduites=buildExecHtml(d,'conduites')
                    setExecDoc(full); setExecDocObra(obra); setExecDocEletrica(eletrica); setExecDocConduites(conduites); setExecDocInstal(buildExecHtml(d,'instalacao'))
                  }catch(e){ console.warn('tab-regen:',e) }
                }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,fontSize:12.5,fontWeight:execMode===m?700:500,cursor:'pointer',opacity:doc?1:0.55,
                    border:`1.5px solid ${execMode===m?'#7C3AED':'#CBD5E1'}`,background:execMode===m?'#7C3AED':'#fff',color:execMode===m?'#fff':'#475569'}}>
                  <i className={`ti ${icon}`} aria-hidden/>{label}
                </button>
              )})}
              {!isDemo() && modelosLegadosOn && <><span style={{width:1,height:22,background:'#E2E8F0',margin:'0 6px'}}/>
              <span style={{fontSize:12,color:'#475569',fontWeight:600,marginRight:2}}>Estilo:</span>
              {[['opus','Opus ✦'],['nova','Novo'],['antiga','Clássico'],['fable','Fable']].map(([v,label])=>(
                <button key={v} onClick={()=>{
                  setExecVersao(v)
                  try{
                    const d = execData || buildExecDataFromMarkers()
                    setExecDoc(buildExecHtml(d,'completo',v)); setExecDocObra(buildExecHtml(d,'obra',v))
                    setExecDocEletrica(buildExecHtml(d,'eletrica',v)); setExecDocConduites(buildExecHtml(d,'conduites',v)); setExecDocInstal(buildExecHtml(d,'instalacao',v))
                  }catch(e){ console.warn('versao-regen:',e) }
                }}
                  style={{padding:'7px 12px',borderRadius:8,fontSize:12.5,fontWeight:execVersao===v?700:500,cursor:'pointer',
                    border:`1.5px solid ${execVersao===v?'#9C7B45':'#CBD5E1'}`,background:execVersao===v?'#9C7B45':'#fff',color:execVersao===v?'#fff':'#475569'}}>
                  {label}
                </button>
              ))}</>}
              <div style={{flex:1}}/>
              {execMode==='completo' && <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#475569',cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={showHeatmap} onChange={e=>{
                  const v=e.target.checked; setShowHeatmap(v)
                  // regera o executivo com/sem o mapa de calor (sem IA)
                  const data = execData || buildExecDataFromMarkers()
                  setTimeout(()=>{ const full=buildExecHtml(data,'completo'); setExecDoc(full) },0)
                }}/>
                Mostrar mapa de calor Wi-Fi
              </label>}
            </div>
            {/* Todos os documentos são A4 agora — mesma largura de preview (Raphael: o PE mostrava
                margens diferentes do resto porque usava 820 e os outros 1180). */}
            <div style={{maxWidth:1180,margin:'0 auto',background:'#fff',boxShadow:'0 2px 16px rgba(0,0,0,0.12)',transition:'max-width 0.2s'}}>
              {(()=>{ const cur = execMode==='obra'?execDocObra:execMode==='eletrica'?execDocEletrica:execMode==='conduites'?execDocConduites:execMode==='instalacao'?execDocInstal:execDoc
                const nome = execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='instalacao'?'Instalacao':'Completa'
                return cur
                ? <div dangerouslySetInnerHTML={{__html:cur}}/>
                : <div style={{padding:'48px 32px',textAlign:'center',color:'#64748B'}}>
                    <i className="ti ti-file-off" style={{fontSize:32,color:'#CBD5E1'}} aria-hidden/>
                    <p style={{margin:'12px 0 4px',fontSize:14,fontWeight:600,color:'#475569'}}>Versão {nome} ainda não gerada</p>
                    <p style={{margin:0,fontSize:12.5}}>Este projeto foi salvo antes desta versão existir. Clique em <b>Gerar sem IA</b> ou <b>Regerar com IA</b> no editor para criar as três versões.</p>
                  </div>
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── CREDENCIAIS ── SSIDs/VLANs e acesso das câmeras. Ficam no projeto e saem
           MASCARADAS no documento; em claro só na Folha de Credenciais, sob demanda. ── */}
      {showCreds && (()=>{
        const inp={width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.14)',background:'#0A1120',color:'#E2E8F0',fontSize:12.5,fontFamily:'inherit'}
        const lb={fontSize:10.5,color:'#94A3B8',display:'block',marginBottom:3,marginTop:8}
        const setW=(i,k,v)=>setCreds(c=>({...c, wifi:c.wifi.map((w,j)=>j===i?{...w,[k]:v}:w)}))
        return <div onClick={()=>setShowCreds(false)} style={{position:'fixed',inset:0,background:'rgba(3,10,20,0.82)',zIndex:3200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0F172A',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'min(720px,96vw)',maxHeight:'90vh',overflow:'auto',color:'#E2E8F0',fontFamily:'inherit',padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:700}}>Credenciais do projeto</div>
              <button onClick={()=>setShowCreds(false)} style={{background:'none',border:'none',color:'#94A3B8',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#94A3B8',marginBottom:12}}>Ficam salvas no projeto. No documento saem <b>mascaradas</b>; em claro só na Folha de Credenciais.</div>
            <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'9px 11px',borderRadius:8,background:'rgba(220,38,38,0.12)',border:'1px solid rgba(248,113,113,0.4)',color:'#FCA5A5',fontSize:11,lineHeight:1.45,marginBottom:14}}>
              <i className="ti ti-alert-triangle" aria-hidden style={{fontSize:14,flexShrink:0,marginTop:1}}/>
              <span>Estas senhas ficam em <b>texto puro no banco</b>, junto do projeto. Quem tiver acesso ao Supabase ou a um backup consegue lê-las. Só coloque aqui o que você aceita que fique assim.</span>
            </div>

            <div style={{fontSize:12.5,fontWeight:700,marginBottom:2}}>Wi-Fi</div>
            {(creds.wifi||[]).map((w,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1.2fr .8fr 1.2fr 1.2fr 28px',gap:6,alignItems:'end',marginBottom:6}}>
                <div><label style={lb}>SSID</label><input value={w.ssid||''} onChange={e=>setW(i,'ssid',e.target.value)} style={inp} placeholder="Casa-Principal"/></div>
                <div><label style={lb}>VLAN</label><input value={w.vlan||''} onChange={e=>setW(i,'vlan',e.target.value)} style={inp} placeholder="Confiável"/></div>
                <div><label style={lb}>Uso</label><input value={w.uso||''} onChange={e=>setW(i,'uso',e.target.value)} style={inp} placeholder="Família"/></div>
                <div><label style={lb}>Senha</label><input value={w.senha||''} onChange={e=>setW(i,'senha',e.target.value)} style={inp}/></div>
                <button onClick={()=>setCreds(c=>({...c,wifi:c.wifi.filter((_,j)=>j!==i)}))} style={{height:34,borderRadius:6,border:'1px solid rgba(248,113,113,0.4)',background:'rgba(220,38,38,0.14)',color:'#FCA5A5',cursor:'pointer'}} title="Remover"><i className="ti ti-trash" aria-hidden/></button>
              </div>
            ))}
            <button onClick={()=>setCreds(c=>({...c,wifi:[...(c.wifi||[]),{ssid:'',vlan:'',uso:'',senha:''}]}))} style={{marginTop:6,height:30,borderRadius:6,border:'1px dashed rgba(255,255,255,0.25)',background:'none',color:'#CBD5E1',cursor:'pointer',fontSize:11.5,padding:'0 12px',fontFamily:'inherit'}}>+ Adicionar rede</button>

            <div style={{fontSize:12.5,fontWeight:700,marginTop:18,marginBottom:2}}>Câmeras</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div><label style={lb}>Usuário</label><input value={creds.cams.user} onChange={e=>setCreds(c=>({...c,cams:{...c.cams,user:e.target.value}}))} style={inp}/></div>
              <div><label style={lb}>Senha</label><input value={creds.cams.senha} onChange={e=>setCreds(c=>({...c,cams:{...c.cams,senha:e.target.value}}))} style={inp}/></div>
            </div>
            <label style={lb}>Observações (NVR, app, retenção…)</label>
            <input value={creds.cams.obs} onChange={e=>setCreds(c=>({...c,cams:{...c.cams,obs:e.target.value}}))} style={inp}/>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18}}>
              <button onClick={()=>{ setShowCreds(false); setShowCredSheet(true) }} style={{height:34,borderRadius:7,border:'1px solid #F59E0B',background:'rgba(245,158,11,0.18)',color:'#FCD34D',cursor:'pointer',fontSize:12,padding:'0 14px',fontFamily:'inherit',fontWeight:600,display:'flex',alignItems:'center',gap:6}}><i className="ti ti-printer" aria-hidden/>Folha de Credenciais</button>
              <button onClick={()=>setShowCreds(false)} style={{height:34,borderRadius:7,border:'none',background:'#0EA5E9',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 18px',fontFamily:'inherit',fontWeight:700}}>Pronto</button>
            </div>
          </div>
        </div>
      })()}

      {/* ── RACK MODAL ── */}
      {showRackModal && <RackModal
        catalog={catalog}
        rackEquip={rackEquip}
        onChange={setRackEquip}
        markers={markers}
        onClose={()=>setShowRackModal(false)}
        onApply={(equip)=>{
          // Verifica se já existe um marcador de rack
          const existingRack = markers.find(m=>isRackItem(m.name,m.code))
          if(existingRack){
            // Atualiza o marcador existente com os itens do rack
            setMarkers(ms=>ms.map(x=>x.uid===existingRack.uid ? {...x, rackEquip:equip, name:'Rack CPD', note:`${equip.length} equipamentos`} : x))
          } else {
            // Adiciona um marcador de rack no centro
            setMarkers(ms=>[...ms,{uid:uniqId('mk'),n:ms.length+1,id:'RACK-CPD',code:'RACK',name:'Rack CPD',room:'',x:50,y:50,note:`${equip.length} equipamentos`,cost:0,sale:0,category:'Redes / WiFi',subcategory:'Rack / Enclosure',rackEquip:equip}])
          }
          setRackEquip(equip)
          setShowRackModal(false)
        }}
      />}

      {showFloorsModal && (()=>{
        const _btn=(bg,bd,col)=>({height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:600,border:`1px solid ${bd}`,background:bg,color:col,padding:'0 12px',display:'inline-flex',alignItems:'center',gap:6})
        return <div onClick={()=>setShowFloorsModal(false)} style={{position:'fixed',inset:0,background:'rgba(3,10,20,0.82)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0F172A',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'min(680px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',color:'#E2E8F0',fontFamily:'inherit',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
              <div><div style={{fontSize:15,fontWeight:700}}>Plantas por pavimento</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Uma imagem por andar, em alta resolução. O pavimento <b>ativo</b> é o que você edita na planta.</div></div>
              <button onClick={()=>setShowFloorsModal(false)} style={{background:'none',border:'none',color:'#94A3B8',fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'12px 18px',overflowY:'auto'}}>
              {plantaFloors.length===0 && <div style={{fontSize:12,color:'#94A3B8',marginBottom:10}}>Nenhum pavimento ainda. Adicione o primeiro e suba a imagem dele.</div>}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {plantaFloors.map((f,i)=>{ const ativo=f.id===activeFloorId; const nPts=markers.filter(m=>m.floorId===f.id).length
                  return <div key={f.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 10px',borderRadius:10,background:ativo?'rgba(14,165,233,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${ativo?'#0EA5E9':'rgba(255,255,255,0.08)'}`}}>
                    <div onClick={()=>setActiveFloor(f.id)} title="Editar este pavimento na planta" style={{width:78,height:58,flexShrink:0,borderRadius:6,overflow:'hidden',background:'#0B1220',border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {f.image ? <img src={f.image} style={{width:'100%',height:'100%',objectFit:'contain'}}/> : <span style={{fontSize:9,color:'#64748B'}}>sem imagem</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <input value={f.nome||''} onChange={e=>renameFloor(f.id,e.target.value)} placeholder={`Pavimento ${i+1}`} style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,color:'#E2E8F0',fontSize:12.5,fontWeight:600,padding:'5px 8px',fontFamily:'inherit',outline:'none'}}/>
                      <div style={{fontSize:10,color:'#94A3B8',marginTop:3}}>{nPts} ponto{nPts!==1?'s':''} neste andar {ativo?'· ✎ ativo':''}</div>
                    </div>
                    <label style={{..._btn(f.image?'rgba(255,255,255,0.06)':'#0EA5E9',f.image?'rgba(255,255,255,0.2)':'#0EA5E9',f.image?'rgba(255,255,255,0.8)':'#fff'),cursor:'pointer'}}>
                      <i className="ti ti-upload" aria-hidden/>{f.image?'Trocar':'Subir imagem'}
                      <input type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={e=>handleFloorImage(f.id,e)}/>
                    </label>
                    {!ativo && <button onClick={()=>setActiveFloor(f.id)} style={_btn('rgba(255,255,255,0.06)','rgba(255,255,255,0.2)','rgba(255,255,255,0.75)')}>Editar</button>}
                    <button onClick={()=>deleteFloor(f.id)} title="Remover pavimento" style={{width:30,height:30,flexShrink:0,borderRadius:7,border:'1px solid rgba(220,38,38,0.4)',background:'rgba(220,38,38,0.12)',color:'#FCA5A5',cursor:'pointer',fontSize:14}}>×</button>
                  </div> })}
              </div>
              <button onClick={addFloor} style={{...( _btn('rgba(16,185,129,0.15)','#059669','#6EE7B7')),marginTop:12,height:34}}><i className="ti ti-plus" aria-hidden/> Adicionar pavimento</button>
              {/* DIVIDIR: planta que veio com dois andares na mesma imagem (imprime mal). Corta a
                  imagem e RECALCULA a posição dos pinos, que estão em % da imagem inteira. */}
              {(()=>{ const fA=plantaFloors.find(x=>x.id===activeFloorId); const img=(fA&&fA.image)||bgImage
                if(!img) return null
                const horiz=splitDir==='h'
                const doAndar=m=>(m.floorId||activeFloorId)===activeFloorId
                const pts=markers.filter(doAndar)
                const n2=pts.filter(m=>horiz?((m.y||0)>=splitAt):((m.x||0)>=splitAt)).length
                return <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                  {!showSplit
                    ? <button onClick={()=>setShowSplit(true)} style={{..._btn('rgba(124,58,237,0.15)','#7C3AED','#C4B5FD'),height:34}}>
                        <i className="ti ti-scissors" aria-hidden/> Dividir esta planta em dois pavimentos</button>
                    : <>
                      <div style={{fontSize:12.5,fontWeight:700,marginBottom:2}}>Dividir a planta do pavimento ativo</div>
                      <div style={{fontSize:10.5,color:'#94A3B8',marginBottom:10,lineHeight:1.5}}>
                        Para plantas que vieram com <b>dois andares na mesma imagem</b>. A imagem é recortada em duas e
                        a posição de cada ponto é <b>recalculada</b> — os pinos não se perdem.
                      </div>
                      <div style={{display:'flex',gap:8,marginBottom:10}}>
                        {[['h','Um em cima do outro'],['v','Lado a lado']].map(([k,txt])=>{ const on=splitDir===k
                          return <button key={k} onClick={()=>setSplitDir(k)} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:on?700:500,
                            border:`1px solid ${on?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:on?'rgba(14,165,233,0.18)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{txt}</button> })}
                      </div>
                      <div style={{position:'relative',maxWidth:360,margin:'0 auto 8px',border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,overflow:'hidden',background:'#fff'}}>
                        <img src={img} style={{width:'100%',display:'block'}}/>
                        {markers.filter(doAndar).map(m=><div key={m.uid} style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,width:5,height:5,borderRadius:3,transform:'translate(-50%,-50%)',background:(horiz?(m.y||0)>=splitAt:(m.x||0)>=splitAt)?'#F59E0B':'#0EA5E9',border:'1px solid #fff'}}/>)}
                        <div style={horiz
                          ? {position:'absolute',left:0,right:0,top:`${splitAt}%`,height:2,background:'#DC2626',boxShadow:'0 0 0 1px rgba(255,255,255,.6)'}
                          : {position:'absolute',top:0,bottom:0,left:`${splitAt}%`,width:2,background:'#DC2626',boxShadow:'0 0 0 1px rgba(255,255,255,.6)'}}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <span style={{fontSize:11,color:'#94A3B8',minWidth:44}}>Corte</span>
                        <input type="range" min="5" max="95" value={splitAt} onChange={e=>setSplitAt(Number(e.target.value))} style={{flex:1}}/>
                        <b style={{fontSize:12,minWidth:38,textAlign:'right'}}>{splitAt}%</b>
                      </div>
                      <div style={{fontSize:10.5,color:'#94A3B8',marginBottom:10}}>
                        <span style={{color:'#38BDF8',fontWeight:700}}>● {pts.length-n2}</span> ficam no pavimento atual ·{' '}
                        <span style={{color:'#FBBF24',fontWeight:700}}>● {n2}</span> vão para o novo
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={dividirPlantaEmPavimentos} style={{..._btn('rgba(124,58,237,0.2)','#7C3AED','#C4B5FD'),height:34,flex:1,justifyContent:'center'}}>
                          <i className="ti ti-scissors" aria-hidden/> Dividir agora</button>
                        <button onClick={()=>setShowSplit(false)} style={{..._btn('rgba(255,255,255,0.06)','rgba(255,255,255,0.2)','rgba(255,255,255,0.7)'),height:34}}>Cancelar</button>
                      </div>
                    </>}
                </div> })()}
              <div style={{fontSize:10.5,color:'#64748B',marginTop:12,lineHeight:1.5}}>Dica: com vários pavimentos, o editor mostra a planta do pavimento <b>ativo</b>. A troca de andar dentro do editor e a geração dos documentos por pavimento vêm nas próximas etapas — por ora dá pra cadastrar as imagens de cada andar e elas já ficam salvas no projeto.</div>
            </div>
            <div style={{padding:'12px 18px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
              <button onClick={()=>setShowFloorsModal(false)} style={{...btnPrimary,padding:'9px 18px'}}>Pronto</button>
            </div>
          </div>
        </div>
      })()}

      {/* Footer actions */}
      {step==='editor' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,alignItems:'center'}}>
          <button onClick={()=>setStep('chat')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Voltar à análise</button>
          <div style={{flex:1}}/>
          {/* Item 3: Salvar Projeto — salva posição dos marcadores sem gerar documento */}
          <button onClick={async ()=>{
            if(!fromProposal?.id){ alert('Abra o executivo a partir de um orçamento para poder salvar.'); return }
            try{
              const { saveProposal, addAuditLog } = await import('../db/supabase.js')
              const updated = { ...fromProposal, planta_data:plantaDataSave(execData) }
              await saveProposal(updated)
              await addAuditLog({ type:'exec_save_markers', user_name:currentUser?.name||'—',
                after:JSON.stringify({markers:markers.length, rooms:rooms.length, proposal_id:fromProposal.id}) })
              alert(`✅ Projeto salvo! ${markers.length} marcadores gravados.`)
            } catch(e){ alert('Erro ao salvar: '+e.message) }
          }} disabled={loading} style={{...btnGhost,borderColor:'rgba(56,189,248,0.4)',color:'#38BDF8',gap:6}}>
            <i className="ti ti-device-floppy" aria-hidden/> Salvar projeto
          </button>
          {execDoc && <button onClick={()=>{ setExecMode('completo'); setStep('exec') }} disabled={loading} style={{...btnGhost,borderColor:'rgba(110,231,183,0.5)',color:'#6EE7B7',gap:6}} title="Abrir o documento já gerado, sem chamar a IA de novo">
            <i className="ti ti-eye" aria-hidden/> Ver documento salvo
          </button>}
          <button onClick={generateExecManual} disabled={loading} style={isDemo()?{...btnPrimary,gap:6}:{...btnGhost,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1',gap:6}} title="Monta o documento a partir dos pontos posicionados, sem usar IA">
            <i className="ti ti-file-pencil" aria-hidden/> {isDemo()?(loading?'Gerando...':(execDoc?'Regerar documento':'Gerar documento')):'Gerar sem IA'}
          </button>
          {!isDemo() && <button onClick={generateExec} disabled={loading} style={{...btnPrimary,background:'#7C3AED'}}>
            <i className="ti ti-sparkles" aria-hidden/> {loading?(execProgress||'Gerando...'):(execDoc?'Regerar com IA':'Gerar com IA')}
          </button>}
        </div>
      )}
      {step==='exec' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setStep('editor')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Editor</button>
          <div style={{flex:1}}/>
          <button onClick={generateExecManual} disabled={loading} style={{...btnGhost,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1',gap:6}} title="Regera os 3 documentos a partir dos pontos, sem IA">
            <i className="ti ti-refresh" aria-hidden/> Regerar sem IA
          </button>
          {(fromProposal?.id || onSaveToProposal) && <button onClick={saveToProposal} disabled={loading} style={{...btnGhost,borderColor:'rgba(56,189,248,0.4)',color:'#38BDF8',gap:6}} title="Grava o documento no orçamento. É uma ação separada do download, e só ela toca o banco."><i className="ti ti-device-floppy" aria-hidden/> Salvar no orçamento</button>}
          <button onClick={()=>setShowDocEditor(true)} style={btnPrimary} title="Abre o editor do documento: planta como objeto, ocultar plantas/tabelas, filtros — e baixar o PDF."><i className="ti ti-edit" aria-hidden/> Editor do documento ({execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='conduites'?'Conduítes':execMode==='instalacao'?'Instalação':'Completo'})</button>
        </div>
      )}
      {showDocEditor && (()=>{
        const famList=['dados','som','eletrica','hdmi','uplink','fibra']
        const catList=[...new Set(markers.map(m=>equipType(m.name)))].sort()
        const modo = execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='conduites'?'Conduítes':execMode==='instalacao'?'Instalação':'Completo'
        // Lista vinda da PRÓPRIA prévia (todas as seções). Fallback pro enumPlants se ainda não leu.
        const plants=(plantList.length?plantList:enumPlants())
        const selP=Math.min(selPlant, Math.max(0,plants.length-1))
        const curP=_plantT(selP)
        // Imagem do mini-preview = a da planta SELECIONADA (o andar dela). Sem multi-andar, é a
        // mesma bgImage de sempre. Corrige o "só pega a primeira planta": ao escolher uma planta de
        // outro pavimento, o mini agora mostra a imagem daquele andar, não sempre a do 1º.
        const _selPlantObj=plants.find(p=>p.i===selP)
        const miniImg=(_selPlantObj&&_selPlantObj.img)||bgImage
        const rowSt={display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}
        const secTit=t=><div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,textTransform:'uppercase',color:'#64748B',margin:'14px 0 4px'}}>{t}</div>
        const tgl=(on,onClick,onLbl,offLbl)=><button onClick={onClick} style={{minWidth:82,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:600,border:`1px solid ${on?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:on?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{on?onLbl:offLbl}</button>
        const chip=(on,label,onClick)=><button key={label} onClick={onClick} style={{fontSize:10.5,padding:'4px 10px',borderRadius:14,border:`1px solid ${on?'#DC2626':'rgba(255,255,255,0.25)'}`,background:on?'rgba(220,38,38,0.25)':'rgba(255,255,255,0.06)',color:on?'#FCA5A5':'rgba(255,255,255,0.75)',cursor:'pointer',fontFamily:'inherit',textDecoration:on?'line-through':'none'}}>{label}</button>
        const miniBtn=(lbl,onClick,active)=><button onClick={onClick} style={{height:28,padding:'0 10px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:active?700:500,border:`1px solid ${active?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:active?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',color:active?'#7DD3FC':'rgba(255,255,255,0.7)'}}>{lbl}</button>
        const stepBtn=(txt,onClick)=><button onClick={onClick} style={{width:28,height:28,borderRadius:6,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',fontSize:15,lineHeight:1}}>{txt}</button>
        const _wr=imgRatio||0.66, miniW=300, miniH=Math.round(miniW*_wr)
        return <div onClick={()=>setShowDocEditor(false)} style={{position:'fixed',inset:0,background:'rgba(3,10,20,0.82)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0F172A',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'97vw',height:'93vh',display:'flex',flexDirection:'column',color:'#E2E8F0',fontFamily:'inherit',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
              <div><div style={{fontSize:15,fontWeight:700}}>Editor do documento <span style={{fontSize:11,fontWeight:500,color:'#94A3B8'}}>· {modo}</span></div><div style={{fontSize:10.5,color:'#94A3B8'}}>Arraste a planta <b>direto na prévia</b> (à direita) pra mover; use a alça azul no canto pra aumentar/diminuir. Cada planta é independente.</div></div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button onClick={toggleDocEdit} title="Liga a edição de textos e tabelas direto na prévia. Enquanto edita, os filtros/planta ficam congelados." style={{height:38,padding:'0 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,border:`1px solid ${docEditMode?'#0EA5E9':'rgba(255,255,255,0.25)'}`,background:docEditMode?'rgba(14,165,233,0.22)':'rgba(255,255,255,0.06)',color:docEditMode?'#7DD3FC':'rgba(255,255,255,0.8)',display:'flex',alignItems:'center',gap:6}}><i className="ti ti-pencil" aria-hidden/> {docEditMode?'Editando textos ✓':'Editar textos'}</button>
                <button onClick={exportPdf} style={{...btnPrimary,padding:'9px 16px'}}><i className="ti ti-file-download" aria-hidden/> Baixar PDF ({modo})</button>
                <button onClick={()=>{setDocEditMode(false);setEditFrozenHtml('');setShowDocEditor(false)}} style={{background:'none',border:'none',color:'#94A3B8',fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{flex:1,display:'flex',minHeight:0}}>
              <div style={{width:360,flexShrink:0,overflowY:'auto',padding:'2px 18px 18px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>
                {secTit('Planta — objeto (cada uma individual)')}
                {bgImage ? <>
                  {plants.length>1 && <div style={{marginBottom:8}}>
                    <div style={{fontSize:10.5,color:'#94A3B8',marginBottom:4}}>Qual planta editar ({plants.length} no documento)</div>
                    <select value={selP} onChange={e=>setSelPlant(Number(e.target.value))} style={{width:'100%',height:32,borderRadius:7,background:'rgba(255,255,255,0.06)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.2)',fontFamily:'inherit',fontSize:11.5,padding:'0 8px'}}>
                      {plants.map(p=><option key={p.i} value={p.i} style={{background:'#0F172A'}}>{`Planta ${p.i+1} — ${p.label}`}</option>)}
                    </select>
                  </div>}
                  <div onPointerDown={e=>{
                        const r=e.currentTarget.getBoundingClientRect(); const sx=e.clientX, sy=e.clientY, x0=curP.x||0, y0=curP.y||0
                        try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
                        const mv=ev=>{ _setPlantT(selP,{x:x0+(ev.clientX-sx)/r.width*100, y:y0+(ev.clientY-sy)/r.height*100}) }
                        const up=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up) }
                        window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up)
                      }}
                      style={{position:'relative',width:miniW,height:miniH,margin:'0 auto',overflow:'hidden',background:'#fff',border:'1px solid rgba(255,255,255,0.25)',borderRadius:4,cursor:'grab',touchAction:'none'}}>
                    <img src={miniImg} draggable={false} style={{position:'absolute',top:'50%',left:'50%',width:'100%',transformOrigin:'center center',transform:`translate(calc(-50% + ${curP.x||0}%), calc(-50% + ${curP.y||0}%)) scale(${curP.zoom||1})`,pointerEvents:'none'}}/>
                    <div style={{position:'absolute',inset:0,boxShadow:'inset 0 0 0 1px rgba(220,38,38,0.35)',pointerEvents:'none'}}/>
                  </div>
                  <div style={{fontSize:9.5,color:'#64748B',textAlign:'center',margin:'4px 0 8px'}}>
                    {curP.front
                      ? <>Arraste pra posicionar. <b>Em frente ao texto</b>: a planta flutua por cima e <b>não empurra nada</b> — posicione livre.</>
                      : <>Arraste pra posicionar. Aumentar o zoom <b>empurra as tabelas de baixo pra baixo</b>; o que passar da margem (borda vermelha) é recortado.</>}
                  </div>
                  {/* Quebra de texto, igual ao Word: alinhado (ocupa espaço) x em frente ao texto (flutua) */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:11,color:'#94A3B8',minWidth:38}}>Texto</span>
                    {miniBtn('▭ Alinhado',()=>_setPlantT(selP,{front:false}),!curP.front)}
                    {miniBtn('⬒ Em frente ao texto',()=>_setPlantT(selP,{front:true}),!!curP.front)}
                  </div>
                  {curP.front && <div style={{fontSize:9.5,color:'#FCD34D',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:6,padding:'5px 8px',marginBottom:8}}>
                    Flutuando, a planta pode cair em cima de uma quebra de página. Deixe as <b>guias vermelhas</b> ligadas e confira antes de gerar o PDF.
                  </div>}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:11,color:'#94A3B8',minWidth:38}}>Zoom</span>
                    {stepBtn('−',()=>_setPlantT(selP,{zoom:Math.max(0.3,Math.round(((curP.zoom||1)-0.1)*10)/10)}))}
                    <b style={{minWidth:44,textAlign:'center',fontSize:12}}>{Math.round((curP.zoom||1)*100)}%</b>
                    {stepBtn('+',()=>_setPlantT(selP,{zoom:Math.min(4,Math.round(((curP.zoom||1)+0.1)*10)/10)}))}
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    {miniBtn('◎ Centralizar',()=>_setPlantT(selP,{x:0,y:0}))}
                    {miniBtn('↺ Ajustar',()=>_setPlantT(selP,{x:0,y:0,zoom:1}))}
                    {plants.length>1 && miniBtn('⇉ Todas iguais',()=>setPlantTransforms(p=>{const q={...p}; plants.forEach(pl=>{q[_plantKey(pl.i)]={...curP}}); return q}))}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:11,color:'#94A3B8',minWidth:38}}>Alinhar</span>
                    {miniBtn('Esquerda',()=>setPlantAlign('left'),plantAlign==='left')}
                    {miniBtn('Centro',()=>setPlantAlign('center'),plantAlign==='center')}
                    {miniBtn('Direita',()=>setPlantAlign('right'),plantAlign==='right')}
                  </div>
                  <div style={rowSt}>
                    <div><div style={{fontSize:12.5,fontWeight:600}}>Largura na página</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Tamanho do quadro da planta</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {stepBtn('−',()=>setPlantPct(v=>Math.max(40,v-5)))}
                      <b style={{minWidth:40,textAlign:'center',fontSize:12}}>{plantPct}%</b>
                      {stepBtn('+',()=>setPlantPct(v=>Math.min(100,v+5)))}
                    </div>
                  </div>
                  <div style={{...rowSt,display:'block'}}>
                    <div style={{fontSize:12.5,fontWeight:600,marginBottom:6}}>Orientação da planta</div>
                    <div style={{display:'flex',gap:5}}>
                      {[['original','Original'],['paisagem','Paisagem'],['retrato','Retrato']].map(([v,l])=>
                        <button key={v} onClick={()=>setPageOrient(v)} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:pageOrient===v?700:500,border:`1px solid ${pageOrient===v?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:pageOrient===v?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',color:pageOrient===v?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{l}</button>)}
                    </div>
                  </div>
                </> : <div style={{fontSize:12,color:'#94A3B8',padding:'8px 0 12px'}}>Sem planta de fundo neste projeto.</div>}

                <div style={{...rowSt,marginTop:2}}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Guias de quebra de página</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Linhas vermelhas mostram onde o PDF quebra</div></div>
                  {tgl(showBreaks,()=>setShowBreaks(v=>!v),'Mostrando','Ocultas')}
                </div>

                {secTit('Ocultar em bloco')}
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Todas as plantas</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Some com toda planta deste documento</div></div>
                  {tgl(hideAllPlants,()=>setHideAllPlants(v=>!v),'Ocultas','Visíveis')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Todas as tabelas</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Some com toda tabela deste documento</div></div>
                  {tgl(hideAllTables,()=>setHideAllTables(v=>!v),'Ocultas','Visíveis')}
                </div>

                {secTit('Pinos, IDs e legenda')}
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Legenda no documento</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Quadro de formas e cabos</div></div>
                  {tgl(showLegenda,()=>setShowLegenda(v=>!v),'Incluída','Sem')}
                </div>
                {showLegenda && <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Tamanho da legenda</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Compacta = uma faixa fina, dá ênfase à planta</div></div>
                  {tgl(legendaCompacta,()=>setLegendaCompacta(v=>!v),'Compacta','Completa')}
                </div>}
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Versão Compacta (obra)</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Só as plantas-chave, 1 por página/pavimento: Completa (c/ legenda), Redes, Som e Teto (c/ tabela). O resto some.</div></div>
                  {tgl(compactaObra,()=>setCompactaObra(v=>!v),'Ligada','Desligada')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>IDs nas plantas</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Códigos dos pontos sobre a planta</div></div>
                  {tgl(showIdsPdf,()=>setShowIdsPdf(v=>!v),'Com IDs','Limpo')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Nº dentro do pino</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Desligado, o pino vira só o símbolo</div></div>
                  {tgl(showNumPin,()=>setShowNumPin(v=>!v),'Com nº','Só símbolo')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>IDs nas tabelas</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Coluna de código nas tabelas</div></div>
                  {tgl(showIdsTbl,()=>setShowIdsTbl(v=>!v),'Com IDs','Sem')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>IDs dos conduítes</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Rótulo de cada conduíte na planta. Limpo, fica só o traçado.</div></div>
                  {tgl(!hideCondIds,()=>setHideCondIds(v=>!v),'Com IDs','Limpo')}
                </div>

                {secTit('Filtros — tirar do documento')}
                <div style={{fontSize:10.5,color:'#94A3B8',marginBottom:10}}>Clique para <b style={{color:'#FCA5A5'}}>tirar do PDF</b> (riscado = fora). Não apaga nada do projeto.</div>
                {(()=>{
                  const filtroLinha=(label,chips)=><div style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:0.6,marginBottom:5}}>{label}</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',paddingLeft:2}}>{chips}</div>
                  </div>
                  const presentes=GRUPO_ORDEM.filter(g=>catList.some(c=>equipGrupo(c)===g))
                  return <>
                    {filtroLinha('Cabos', <>{famList.map(f=>chip(hideFams.has(f), CABLE_LABELS[f]||f, ()=>setHideFams(p=>{const x=new Set(p); x.has(f)?x.delete(f):x.add(f); return x})))}{chip(hidePdfConduites,'Conduítes',()=>setHidePdfConduites(v=>!v))}</>)}
                    {filtroLinha('Grupos', presentes.map(g=>{ const cats=catList.filter(c=>equipGrupo(c)===g); const n=markers.filter(m=>cats.includes(equipType(m.name))).length
                      const todosFora=cats.length>0 && cats.every(c=>hideCats.has(c))
                      return chip(todosFora, `${g} · ${n}`, ()=>setHideCats(p=>{const x=new Set(p); if(todosFora){cats.forEach(c=>x.delete(c))}else{cats.forEach(c=>x.add(c))} return x})) }))}
                    {filtroLinha('Categorias', catList.map(c=>{ const n=markers.filter(m=>equipType(m.name)===c).length; return chip(hideCats.has(c), `${c} · ${n}`, ()=>setHideCats(p=>{const x=new Set(p); x.has(c)?x.delete(c):x.add(c); return x})) }))}
                  </>
                })()}

                {secTit('Ocultar por tópico — '+modo)}
                <div style={{fontSize:10,color:'rgba(255,255,255,0.42)',marginBottom:7}}><b>Tópico</b> tira o título + planta + tabela. <b>Só tabela</b> mantém a planta. Riscado = fora. Só aparecem os tópicos <b>deste documento</b>.</div>
                {(()=>{
                  const EXEC=[['t_premissas','Premissas e escopo'],['t_planta','Planta de pontos'],['pos_altura','Detalhes de pontos por cômodo'],['itens_unicos','Resumo por item (únicos)'],['tbl_som','Som ambiente (em Cabeamento)'],['tbl_seguranca','Segurança (em Cabeamento)'],['tbl_rack','Rack / CPD','tbl_rack_tab'],['t_eletrica','Planta elétrica (ABNT)','t_eletrica_tab'],['t_wifi','Cobertura Wi-Fi'],['tbl_teto','Teto'],['t_conduites','Cabeamento e conduítes'],['t_pecas','Equipamentos e peças (oculto por padrão)'],['t_graficos','Gráficos e gestão'],['t_observ','Observações e fotos']]
                  const OBRA=[['t_obra_eletrica','1. Elétrica (caixas + alimentação)'],['lista_geral','↳ Lista geral de pontos elétricos'],['pontos_tabela','↳ Pontos elétricos — caixas e alturas'],['alim_keypads','↳ Alimentação dos keypads'],['t_quant','2. Quantitativo de material'],['t_cabos','3. Cabeamento por família'],['t_checklists','4. Checklists de obra']]
                  const ELE=[['t_eletrica','Planta elétrica (ABNT)','t_eletrica_tab'],['lista_geral','Lista geral de pontos elétricos'],['caixas_embutir','Caixas de embutir — resumo'],['quadro_cargas','Quadro de cargas']]
                  const COND=[['t_conduites','Cabeamento e conduítes'],['t_cabos','Cabeamento por família']]
                  // Só os grupos de tópico FIÉIS ao documento na tela (Raphael).
                  const grupos = execMode==='completo' ? [['Projeto Executivo',EXEC],['Plano de Obra (anexo)',OBRA]]
                    : execMode==='obra' ? [['Plano de Obra',OBRA]]
                    : execMode==='eletrica' ? [['Planta Elétrica',ELE]]
                    : execMode==='conduites' ? [['Conduítes',COND]]
                    : [] // instalação: sem tópicos configuráveis
                  const allKeys=[...new Set(grupos.flatMap(g=>g[1]).map(t=>t[0]))]
                  const off=k=>hideSecs.has(k)
                  const tglSec=k=>()=>setHideSecs(p=>{const x=new Set(p); x.has(k)?x.delete(k):x.add(k); return x})
                  const allOff=allKeys.length>0 && allKeys.every(k=>off(k))
                  const row=([k,label,tab])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'2px 0'}}>
                      <span style={{flex:1,fontSize:11,minWidth:0,color:off(k)?'rgba(255,255,255,0.32)':'rgba(255,255,255,0.82)',textDecoration:off(k)?'line-through':'none'}}>{label}</span>
                      {chip(off(k),'tópico',tglSec(k))}
                      {tab?chip(off(k)||off(tab),'só tabela',tglSec(tab)):<span style={{width:70,flexShrink:0}}/>}
                    </div>)
                  if(!grupos.length) return <div style={{fontSize:11,color:'#94A3B8'}}>Este documento não tem tópicos configuráveis — use <b>Blocos do documento</b> abaixo para ocultar/reordenar.</div>
                  return <>
                    <div style={{marginBottom:6}}>{chip(allOff,'✦ Ocultar tudo',()=>setHideSecs(p=>{const x=new Set(p); if(allOff){allKeys.forEach(k=>x.delete(k))}else{allKeys.forEach(k=>x.add(k))} return x}))}</div>
                    {grupos.map(([titulo,lista])=><div key={titulo} style={{marginBottom:6}}>
                      <span style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5,display:'block',margin:'6px 0 3px'}}>{titulo}</span>
                      {lista.map(row)}
                    </div>)}
                  </>
                })()}

                {/* Blocos do documento — vem DEPOIS do "Ocultar por tópico" (Raphael): a lista só traz o
                    que NÃO foi ocultado por tópico, porque enumDocBlocks lê o HTML já filtrado (hideSecs). */}
                {secTit('Blocos do documento — ordem e visibilidade')}
                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:6,lineHeight:1.5}}>Esta é a lista, <b>na ordem do PDF</b>, de cada grande pedaço do documento — cada <b>seção</b> (¶), <b>planta</b> (🗺) e <b>tabela</b> (▦). Já <b>não mostra</b> o que você tirou em <b>Ocultar por tópico</b>. Use <b>↑ ↓</b> para <b>mudar a ordem</b> e o <b>olho 👁</b> para <b>esconder</b> um pedaço. Vale só para este documento.</div>
                {(()=>{
                  const base=enumDocBlocks()
                  const byKey={}; base.forEach(b=>{ byKey[b.key]=b })
                  const ordered=[...blockOrder.map(k=>byKey[k]).filter(Boolean), ...base.filter(b=>!blockOrder.includes(b.key))]
                  const keys=ordered.map(b=>b.key)
                  const move=(i,dir)=>{ const j=i+dir; if(j<0||j>=keys.length)return; const a=[...keys]; const t=a[i]; a[i]=a[j]; a[j]=t; setBlockOrder(a) }
                  const iconBtn=(txt,onClick,dim)=><button onClick={onClick} style={{width:24,height:24,flexShrink:0,borderRadius:5,border:'1px solid rgba(255,255,255,0.18)',background:'rgba(255,255,255,0.05)',color:dim?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:12,lineHeight:1,padding:0}}>{txt}</button>
                  if(!ordered.length) return <div style={{fontSize:11,color:'#94A3B8'}}>Gere o documento para listar os blocos.</div>
                  return <div style={{display:'flex',flexDirection:'column',gap:3,maxHeight:260,overflowY:'auto',paddingRight:2}}>
                    {ordered.map((b,i)=>{ const off=blockHidden.has(b.key)
                      return <div key={b.key+i} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 5px',borderRadius:6,background:'rgba(255,255,255,0.04)'}}>
                        <span style={{fontSize:11,flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:off?'rgba(255,255,255,0.32)':'rgba(255,255,255,0.85)',textDecoration:off?'line-through':'none'}} title={b.label}>{b.plant?'🗺 ':b.table?'▦ ':'¶ '}{b.label}</span>
                        {iconBtn('↑',()=>move(i,-1),i===0)}
                        {iconBtn('↓',()=>move(i,1),i===ordered.length-1)}
                        <button onClick={()=>setBlockHidden(p=>{const x=new Set(p); x.has(b.key)?x.delete(b.key):x.add(b.key); return x})} title={off?'Mostrar':'Ocultar'} style={{width:24,height:24,flexShrink:0,borderRadius:5,border:`1px solid ${off?'#DC2626':'rgba(255,255,255,0.18)'}`,background:off?'rgba(220,38,38,0.2)':'rgba(255,255,255,0.05)',color:off?'#FCA5A5':'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:12,lineHeight:1,padding:0}}>{off?'🚫':'👁'}</button>
                      </div> })}
                    {(blockOrder.length>0||blockHidden.size>0) && <button onClick={()=>{setBlockOrder([]);setBlockHidden(new Set())}} style={{marginTop:4,fontSize:10.5,padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',cursor:'pointer'}}>↺ Restaurar ordem e ocultos</button>}
                  </div>
                })()}
              </div>
              <div style={{flex:1,background:'#525659',padding:12,minWidth:0,position:'relative'}}>
                {docEditMode && <div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',zIndex:5,background:'rgba(14,165,233,0.95)',color:'#fff',fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:20,pointerEvents:'none'}}>✎ Clique num texto ou célula e edite. O que você escrever sai no PDF.</div>}
                {(docEditMode?editFrozenHtml:pdfPreviewHtml)
                  ? <iframe ref={previewIframeRef} title="Prévia do documento" srcDoc={docEditMode?editFrozenHtml:pdfPreviewHtml} style={{width:'100%',height:'100%',border:docEditMode?'2px solid #0EA5E9':'none',background:'#fff',borderRadius:4}}/>
                  : <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:13}}>Gere o executivo primeiro para ver a prévia aqui.</div>}
              </div>
            </div>
          </div>
        </div>
      })()}
      {showPdfOpts && (()=>{
        const famList=['dados','som','eletrica','hdmi','uplink','fibra']
        const catList=[...new Set(markers.map(m=>equipType(m.name)))].sort()
        const modo = execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='conduites'?'Conduítes':execMode==='instalacao'?'Instalação':'Completo'
        const rowSt={display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}
        const tgl=(on,onClick,onLbl,offLbl)=><button onClick={onClick} style={{minWidth:76,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:600,border:`1px solid ${on?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:on?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',color:on?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{on?onLbl:offLbl}</button>
        const chip=(on,label,onClick)=><button key={label} onClick={onClick} style={{fontSize:10.5,padding:'4px 10px',borderRadius:14,border:`1px solid ${on?'#DC2626':'rgba(255,255,255,0.25)'}`,background:on?'rgba(220,38,38,0.25)':'rgba(255,255,255,0.06)',color:on?'#FCA5A5':'rgba(255,255,255,0.75)',cursor:'pointer',fontFamily:'inherit',textDecoration:on?'line-through':'none'}}>{label}</button>
        return <div onClick={()=>setShowPdfOpts(false)} style={{position:'fixed',inset:0,background:'rgba(3,10,20,0.80)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0F172A',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,width:'96vw',height:'92vh',display:'flex',flexDirection:'column',color:'#E2E8F0',fontFamily:'inherit',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
              <div><div style={{fontSize:15,fontWeight:700}}>Opções do documento</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Mexa nos controles à esquerda, o documento à direita atualiza na hora.</div></div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button onClick={exportPdf} style={{...btnPrimary,padding:'9px 16px'}}><i className="ti ti-file-download" aria-hidden/> Baixar PDF ({modo})</button>
                <button onClick={()=>setShowPdfOpts(false)} style={{background:'none',border:'none',color:'#94A3B8',fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{flex:1,display:'flex',minHeight:0}}>
              <div style={{width:340,flexShrink:0,overflowY:'auto',padding:'4px 18px 18px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Legenda no documento</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Quadro de formas e cabos nas plantas</div></div>
                  {tgl(showLegenda,()=>setShowLegenda(v=>!v),'Incluída','Sem')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Códigos dos pontos (IDs)</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Mostrar os IDs nas plantas do PDF</div></div>
                  {tgl(showIdsPdf,()=>setShowIdsPdf(v=>!v),'Com IDs','Limpo')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Nº dentro do pino</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Desligado, o pino vira só o símbolo. É o nº que cruza com as tabelas.</div></div>
                  {tgl(showNumPin,()=>setShowNumPin(v=>!v),'Com nº','Só símbolo')}
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>IDs nas tabelas</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Coluna de código dentro das tabelas</div></div>
                  {tgl(showIdsTbl,()=>setShowIdsTbl(v=>!v),'Com IDs','Sem')}
                </div>
                <div style={{...rowSt,display:'block'}}>
                  <div style={{fontSize:12.5,fontWeight:600,marginBottom:6}}>Orientação da planta</div>
                  <div style={{display:'flex',gap:5}}>
                    {[['original','Original'],['paisagem','Paisagem'],['retrato','Retrato']].map(([v,l])=>
                      <button key={v} onClick={()=>setPageOrient(v)} style={{flex:1,height:30,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:pageOrient===v?700:500,border:`1px solid ${pageOrient===v?'#0EA5E9':'rgba(255,255,255,0.2)'}`,background:pageOrient===v?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',color:pageOrient===v?'#7DD3FC':'rgba(255,255,255,0.6)'}}>{l}</button>)}
                  </div>
                </div>
                <div style={rowSt}>
                  <div><div style={{fontSize:12.5,fontWeight:600}}>Tamanho da planta</div><div style={{fontSize:10.5,color:'#94A3B8'}}>Largura nas páginas</div></div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <button onClick={()=>setPlantPct(v=>Math.max(40,v-10))} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',fontSize:15}}>−</button>
                    <b style={{minWidth:44,textAlign:'center',fontSize:13}}>{plantPct}%</b>
                    <button onClick={()=>setPlantPct(v=>Math.min(100,v+10))} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',fontSize:15}}>+</button>
                  </div>
                </div>
                <div style={{padding:'12px 0 2px'}}>
                  {(()=>{ const fora=markers.filter(m=>hideCats.has(equipType(m.name))); const dentro=markers.length-fora.length
                    const porCom={}; fora.forEach(m=>{ const r=m.room||'Geral'; porCom[r]=(porCom[r]||0)+1 })
                    return <>
                      <div style={{fontSize:12.5,fontWeight:600,marginBottom:2}}>Filtros do relatório <span style={{fontWeight:400,color:dentro<markers.length?'#FBBF24':'#94A3B8'}}>· no PDF: {dentro} de {markers.length} itens</span></div>
                      {fora.length>0 && <div style={{fontSize:10,color:'#FCA5A5',margin:'2px 0 4px'}}>Fora do PDF: {fora.length} item{fora.length>1?'s':''} · {Object.entries(porCom).map(([r,n])=>`${r}: ${n}`).join(' · ')}</div>}
                    </> })()}
                  <div style={{fontSize:10.5,color:'#94A3B8',marginBottom:8}}>Clique para <b style={{color:'#FCA5A5'}}>tirar do PDF</b> (riscado = fora). Não apaga nada do projeto.</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center',marginBottom:7}}>
                    <span style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5}}>Cabos</span>
                    {famList.map(f=>chip(hideFams.has(f), CABLE_LABELS[f]||f, ()=>setHideFams(p=>{const x=new Set(p); x.has(f)?x.delete(f):x.add(f); return x})))}
                    {chip(hidePdfConduites,'Conduítes',()=>setHidePdfConduites(v=>!v))}
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5}}>Categorias</span>
                    {catList.map(c=>{ const n=markers.filter(m=>equipType(m.name)===c).length; return chip(hideCats.has(c), `${c} · ${n}`, ()=>setHideCats(p=>{const x=new Set(p); x.has(c)?x.delete(c):x.add(c); return x})) })}
                  </div>
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:8,marginTop:4}}>
                    <span style={{fontSize:12,color:'#fff',fontWeight:600,display:'block'}}>Ocultar do documento — por tópico</span>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.42)',display:'block',margin:'2px 0 7px'}}><b>Tópico</b> tira o título + planta + tabela. <b>Só tabela</b> mantém a planta. Riscado = fora.</span>
                    {(()=>{
                      const EXEC=[['t_premissas','Premissas e escopo'],['t_planta','Planta de pontos'],['pos_altura','Detalhes de pontos por cômodo'],['itens_unicos','Resumo por item (únicos)'],['tbl_som','Som ambiente (em Cabeamento)'],['tbl_seguranca','Segurança (em Cabeamento)'],['tbl_rack','Rack / CPD','tbl_rack_tab'],['t_eletrica','Planta elétrica (ABNT)','t_eletrica_tab'],['t_wifi','Cobertura Wi-Fi'],['tbl_teto','Teto'],['t_conduites','Cabeamento e conduítes'],['t_pecas','Equipamentos e peças (oculto por padrão)'],['t_graficos','Gráficos e gestão'],['t_observ','Observações e fotos']]
                      const OBRA=[['t_obra_eletrica','1. Elétrica (caixas + alimentação)'],['lista_geral','↳ Lista geral de pontos elétricos'],['pontos_tabela','↳ Pontos elétricos — caixas e alturas'],['alim_keypads','↳ Alimentação dos keypads'],['t_quant','2. Quantitativo de material'],['t_cabos','3. Cabeamento por família'],['t_checklists','4. Checklists de obra']]
                      const allKeys=[...EXEC,...OBRA].map(t=>t[0])
                      const off=k=>hideSecs.has(k)
                      const tgl=k=>()=>setHideSecs(p=>{const x=new Set(p); x.has(k)?x.delete(k):x.add(k); return x})
                      const allOff=allKeys.every(k=>off(k))
                      const row=([k,label,tab])=>(
                        <div key={k} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'1.5px 0'}}>
                          <span style={{flex:1,fontSize:11,minWidth:0,color:off(k)?'rgba(255,255,255,0.32)':'rgba(255,255,255,0.82)',textDecoration:off(k)?'line-through':'none'}}>{label}</span>
                          {chip(off(k),'tópico',tgl(k))}
                          {tab?chip(off(k)||off(tab),'só tabela',tgl(tab)):<span style={{width:70,flexShrink:0}}/>}
                        </div>)
                      return <>
                        <div style={{marginBottom:5}}>{chip(allOff,'✦ Ocultar tudo',()=>setHideSecs(p=>{const x=new Set(p); if(allOff){allKeys.forEach(k=>x.delete(k))}else{allKeys.forEach(k=>x.add(k))} return x}))}</div>
                        <span style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5,display:'block',margin:'6px 0 2px'}}>Projeto Executivo</span>
                        {EXEC.map(row)}
                        <span style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:0.5,display:'block',margin:'8px 0 2px'}}>Plano de Obra (anexo)</span>
                        {OBRA.map(row)}
                      </>
                    })()}
                  </div>
                </div>
              </div>
              <div style={{flex:1,background:'#525659',padding:12,minWidth:0}}>
                {pdfPreviewHtml
                  ? <iframe title="Prévia do documento" srcDoc={pdfPreviewHtml} style={{width:'100%',height:'100%',border:'none',background:'#fff',borderRadius:4}}/>
                  : <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:13}}>Gere o executivo primeiro para ver a prévia aqui.</div>}
              </div>
            </div>
          </div>
        </div>
      })()}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes progslide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
    </div>
  )
}

const EXEC_CSS=`
/* ── Base ──────────────────────────────────────────────────────────────── */
.ex-doc{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;font-size:11.5px;line-height:1.55;background:#F5FAFF;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ex-doc *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── Capa ───────────────────────────────────────────────────────────────── */
.ex-cover{background:#F5FAFF;color:#0D1420;padding:60px 40px;text-align:center;border-bottom:3px solid #0EA5E9;page-break-after:always;break-after:page}
.ex-cover-top{font-size:10px;letter-spacing:3px;color:#6B8CAE;text-transform:uppercase;margin-bottom:30px}
.ex-cover-tag{font-size:10px;letter-spacing:4px;color:#0EA5E9;margin:6px 0 40px}
.ex-cover-title{font-family:'DM Serif Display',Georgia,serif;font-size:34px;line-height:1.15;margin-bottom:16px;color:#0D1420}
.ex-cover-sub{font-size:13px;color:#456;line-height:1.7;margin-bottom:40px}
.ex-cover-client{background:#fff;border:1px solid #cfe3f5;border-radius:10px;padding:20px;margin:0 auto;max-width:380px}
.ex-cc-name{font-size:20px;font-weight:700;color:#0D1420}
.ex-cc-meta{font-size:11px;color:#6B8CAE;margin-top:4px}
.ex-cover-foot{margin-top:40px;font-size:9px;color:#8fa3b8}

/* ── Seções ─────────────────────────────────────────────────────────────── */
.ex-sec{padding:20px 36px 24px;border-bottom:2px solid #E8F0F8;background:#fff;margin-bottom:0}
.ex-sec h2{font-family:'DM Serif Display',Georgia,serif;font-size:17px;color:#060B1A;margin:0 0 12px;padding-bottom:6px;
  border-bottom:2px solid #0EA5E9;display:flex;align-items:center;gap:8px;page-break-after:avoid;break-after:avoid}
.ex-sec-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;min-width:24px;
  border-radius:50%;background:#0EA5E9;color:#fff;font-size:11px;font-weight:800;font-family:'DM Sans',sans-serif}

/* Ambiente sub-header dentro de seção */
.ex-amb{font-size:12px;color:#0369A1;font-weight:700;margin:14px 0 5px;background:#EFF6FF;padding:5px 10px;
  border-left:3px solid #0EA5E9;border-radius:0 4px 4px 0;page-break-after:avoid;break-after:avoid}

/* ── Tabelas ─────────────────────────────────────────────────────────────── */
.ex-tbl{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:10.5px;
  page-break-inside:auto;break-inside:auto}
.ex-tbl thead{display:table-header-group} /* repete cabeçalho em página nova */
.ex-tbl th{background:#0D1A30;color:#fff;padding:6px 8px;text-align:left;font-size:9.5px;font-weight:700;letter-spacing:.2px;white-space:nowrap}
.ex-tbl td{padding:5px 8px;border-bottom:1px solid #ECF2F8;vertical-align:top}
.ex-tbl tr:nth-child(even) td{background:#F7FAFE}
.ex-tbl tr:hover td{background:#EEF6FF}
/* Linha de continuação quando tabela quebra de página */
.ex-tbl tbody tr{page-break-inside:avoid;break-inside:avoid}

/* Grupos de linhas que NÃO devem quebrar — use ex-tbl-group */
.ex-tbl-group td{border-top:2px solid #D1E6F8}

/* ── Listas ──────────────────────────────────────────────────────────────── */
.ex-ul{margin:5px 0 8px 20px}
.ex-ul li{margin-bottom:4px;line-height:1.5}
.ex-p{font-size:11.5px;line-height:1.65;color:#374151;margin:0 0 8px}

/* ── Páginas de OBRA / ELÉTRICA (impressora grande A3) ─────────────────────── */
.ex-obra-page{padding:18px 28px 26px;background:#fff;border-bottom:2px solid #E8F0F8}
.ex-obra-page h2{font-family:'DM Serif Display',Georgia,serif;font-size:20px;color:#060B1A;margin:0 0 10px}
.ex-obra-page img{width:100%;display:block;border:1px solid #ccc;border-radius:8px}
/* plantas grandes e legíveis: imagem ocupa a largura toda, com altura mínima generosa */
.ex-plant-wrap{position:relative;width:100%;margin:8px 0}
.ex-plant-wrap img{width:100%;display:block}
.ex-plant{position:relative;display:block;width:fit-content;max-width:100%;margin:8px auto;break-inside:avoid;page-break-inside:avoid;break-before:avoid;page-break-before:avoid}
.ex-plant img{width:100%!important;height:auto;max-width:100%;display:block;border:1px solid #CDD2DA;border-radius:6px}

/* ── Print ───────────────────────────────────────────────────────────────── */
@media print{
  .no-print{display:none!important}
  h2,h3{page-break-after:avoid;break-after:avoid}
  .ex-tbl tbody tr{page-break-inside:avoid;break-inside:avoid}
  .ex-cover{page-break-after:always;break-after:page}
  .ex-sec{page-break-inside:avoid;break-inside:avoid;padding:16px 28px 20px}
  /* Seções longas PODEM quebrar — desativa avoid nelas */
  .ex-sec.ex-breakable{page-break-inside:auto;break-inside:auto}
  .ex-obra-page{page-break-inside:auto;break-inside:auto}
  .ex-tbl thead{display:table-header-group}
  .ex-tbl{font-size:10px}
  .ex-tbl th{padding:5px 7px;font-size:9px}
  .ex-tbl td{padding:5px 7px}
  h2{font-size:16px}
  .ex-amb{font-size:11.5px}
}
`
const EXEC_CSS_PREMIUM=`
/* ===== RELATÓRIO — VERSÃO NOVA (premium sóbria) — mesmas classes do clássico ===== */
.ex-doc{font-family:'EB Garamond','Georgia',serif;color:#23282F;font-size:11.8px;line-height:1.6;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ex-doc *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ex-doc strong{color:#1A2740;font-weight:600}
.ex-cover{background:#fff;color:#1A2740;padding:72px 40px;text-align:center;border-bottom:1px solid #9C7B45;page-break-after:always;break-after:page}
.ex-cover-top{font-size:10px;letter-spacing:3px;color:#5C6470;text-transform:uppercase;margin-bottom:26px}
.ex-cover-tag{font-variant:small-caps;font-size:13px;letter-spacing:4px;color:#9C7B45;margin:6px 0 34px}
.ex-cover-title{font-family:'EB Garamond',Georgia,serif;font-weight:600;font-size:33px;line-height:1.16;margin-bottom:13px;color:#1A2740}
.ex-cover-sub{font-size:13px;font-style:italic;color:#5C6470;line-height:1.6;margin-bottom:32px}
.ex-cover-client{background:#fff;border-top:1px solid #1A2740;border-bottom:1px solid #1A2740;padding:18px 20px;margin:0 auto;max-width:420px}
.ex-cc-name{font-size:19px;font-weight:600;color:#1A2740}
.ex-cc-meta{font-size:11px;color:#5C6470;margin-top:4px}
.ex-cover-foot{margin-top:34px;font-size:9.5px;color:#9AA1AB}
.ex-sec{padding:22px 36px 24px;border-bottom:1px solid #E3E6EB;background:#fff}
.ex-sec h2{font-family:'EB Garamond',Georgia,serif;font-weight:600;font-size:17px;color:#1A2740;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid #1A2740;display:flex;align-items:baseline;gap:10px;page-break-after:avoid;break-after:avoid}
.ex-sec-num{display:inline;width:auto;height:auto;min-width:0;background:none;border-radius:0;color:#9C7B45;font-size:14px;font-weight:600;font-variant:small-caps;letter-spacing:1px;font-family:'EB Garamond',serif}
.ex-amb{font-variant:small-caps;letter-spacing:1px;font-size:12.5px;color:#1A2740;font-weight:600;margin:16px 0 6px;background:none;border-left:2px solid #9C7B45;padding:2px 0 2px 11px;border-radius:0;page-break-after:avoid;break-after:avoid}
.ex-tbl{width:100%;border-collapse:collapse;margin:8px 0 14px;font-family:'Inter',system-ui,sans-serif;font-size:9.5px;page-break-inside:auto;break-inside:auto}
.ex-tbl thead{display:table-header-group}
.ex-tbl th{background:#1A2740;color:#fff;padding:6px 8px;text-align:left;font-size:8.5px;font-weight:600;letter-spacing:.2px;text-transform:uppercase;white-space:nowrap}
.ex-tbl td{padding:6px 8px;border-bottom:1px solid #E3E6EB;vertical-align:top}
.ex-tbl tr:nth-child(even) td{background:#FAFBFC}
.ex-tbl tbody tr{page-break-inside:avoid;break-inside:avoid}
.ex-tbl-group td{border-top:1.5px solid #CDD2DA}
.ex-ul{margin:5px 0 8px 20px}
.ex-ul li{margin-bottom:4px;line-height:1.55}
.ex-p{font-family:'EB Garamond',Georgia,serif;font-size:11.8px;line-height:1.65;color:#23282F;margin:0 0 8px}
.ex-obra-page{padding:18px 28px 26px;background:#fff;border-bottom:1px solid #E3E6EB}
.ex-obra-page h2{font-family:'EB Garamond',Georgia,serif;font-weight:600;font-size:20px;color:#1A2740;margin:0 0 10px}
.ex-obra-page img{width:100%;display:block;border:1px solid #CDD2DA;border-radius:6px}
.ex-plant-wrap{position:relative;width:100%;margin:8px 0}
.ex-plant-wrap img{width:100%;display:block}
.ex-plant{position:relative;display:block;width:fit-content;max-width:100%;margin:8px auto;break-inside:avoid;page-break-inside:avoid;break-before:avoid;page-break-before:avoid}
.ex-plant img{width:100%!important;height:auto;max-width:100%;display:block;border:1px solid #CDD2DA;border-radius:6px}
@media print{
  .no-print{display:none!important}
  h2,h3{page-break-after:avoid;break-after:avoid}
  .ex-tbl tbody tr{page-break-inside:avoid;break-inside:avoid}
  .ex-cover{page-break-after:always;break-after:page}
  .ex-sec{page-break-inside:avoid;break-inside:avoid;padding:18px 28px 20px}
  .ex-sec.ex-breakable{page-break-inside:auto;break-inside:auto}
  .ex-obra-page{page-break-inside:auto;break-inside:auto}
  .ex-tbl thead{display:table-header-group}
  .ex-tbl{font-size:9px}.ex-tbl th{padding:5px 7px;font-size:8px}.ex-tbl td{padding:5px 7px}
  h2{font-size:16px}.ex-amb{font-size:12px}
}
`

// ── EXEC_CSS_FABLE: assinatura editorial Fable. Estrutura do premium, pele própria:
// papel creme, tinta navy-ink, fio dourado, Fraunces no display. Uma voz, três leituras.
const EXEC_CSS_FABLE = EXEC_CSS_PREMIUM + `
.ex-doc{background:#fff;color:#1B2337;font-family:'Inter','DM Sans',system-ui,sans-serif}
.ex-sec{background:#fff;border-bottom:1px solid #E4D9C4}
.ex-sec h2{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#131A2C;font-weight:600}
.ex-sec-num{color:#B0854C;border-color:#B0854C}
.ex-amb{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#8A6A38;font-weight:600}
.ex-p{color:#3C4557}
.ex-cover{background:#fff;color:#131A2C;border-bottom:4px solid #B0854C}
.ex-cover-top{color:#8A6A38}
.ex-cover-tag{color:#B0854C}
.ex-cover-title{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#131A2C;font-weight:600}
.ex-cover-sub{color:#5B6478}
.ex-cover-client{background:#FAF5EC;border:1px solid #E4D9C4}
.ex-cc-name{color:#131A2C}
.ex-cc-meta{color:#6B7280}
.ex-cover-foot{color:#8B93A8}
.ex-doc-cover{border-bottom:4px solid #B0854C}
.ex-tbl th{background:#131A2C;color:#EFE3C8;letter-spacing:.5px}
.ex-tbl td{border-bottom:.5px solid #E4D9C4;color:#242D42}
.ex-tbl tbody tr:nth-child(even) td{background:#FAF5EC}
.ex-obra-page{background:#fff}
.ex-obra-page h2{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#131A2C;border-color:#B0854C!important}
`

// ── EXEC_CSS_OPUS: acabamento máximo. Navy profundo + dourado quente, tipografia serifada,
// tabelas com fio dourado, espaçamento enxuto (aproveita folha) e faixa de escopo na capa.
const EXEC_CSS_OPUS = EXEC_CSS_PREMIUM + `
.ex-doc{font-family:'EB Garamond','Georgia',serif;color:#20252E}
.ex-sec{padding:20px 34px 20px;border-bottom:1px solid #ECEAE3}
.ex-sec h2{color:#0D1B2A;border-bottom:2px solid #B08D57;font-size:17.5px}
.ex-sec-num{color:#B08D57}
.ex-amb{color:#0D1B2A;border-left:2px solid #B08D57;font-size:12.5px}
.ex-tbl th{background:#0D1B2A;color:#EBD9B8;letter-spacing:.4px;border-bottom:2px solid #B08D57}
.ex-tbl td{border-bottom:1px solid #EDEBE4;color:#242B36}
.ex-tbl tr:nth-child(even) td{background:#FBFAF7}
.ex-p{color:#2A303B}
.ex-cover{background:#fff;color:#0D1B2A;border-bottom:3px solid #B08D57;padding:60px 40px 36px}
.ex-cover-top{color:#6A5A3A;letter-spacing:3.5px}
.ex-cover-tag{color:#B08D57;letter-spacing:5px}
.ex-cover-title{color:#0D1B2A;font-size:34px}
.ex-cover-client{border-color:#0D1B2A}
.ex-cc-name{color:#0D1B2A}
.ex-cover-scope{display:flex;justify-content:center;margin:28px auto 0;max-width:600px;border-top:1px solid #E4DCC8;border-bottom:1px solid #E4DCC8}
.ex-cover-scope>div{flex:1;padding:13px 6px;border-left:1px solid #EDE6D6}
.ex-cover-scope>div:first-child{border-left:none}
.ex-scope-n{font-family:'EB Garamond',serif;font-size:25px;font-weight:600;color:#0D1B2A;line-height:1}
.ex-scope-l{font-size:8.5px;letter-spacing:.8px;text-transform:uppercase;color:#8A7C5E;margin-top:5px}
/* planta + tabela na MESMA folha: figura compacta que deixa espaço pra tabela embaixo */
.ex-opus-fig{break-inside:avoid;page-break-inside:avoid;margin:4px 0 8px}
.ex-opus-fig .ex-plant img,.ex-opus-fig img{max-height:112mm!important}
@media print{ .ex-sec{padding:15px 26px 15px} .ex-opus-fig .ex-plant img,.ex-opus-fig img{max-height:108mm!important} }
`

const btnPrimary={background:'#0EA5E9',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}
const btnGhost={background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}
const inputStyle={flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'8px 12px',color:'#fff',fontSize:13,fontFamily:'inherit'}
const inputDark={width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:8}
const lbl={fontSize:10,color:'rgba(255,255,255,0.4)',display:'block',marginBottom:3}

export default function ProjetoExecutivo(props){
  return (
    <ExecErrorBoundary onReset={()=>{}}>
      <ProjetoExecutivoInner {...props}/>
    </ExecErrorBoundary>
  )
}

