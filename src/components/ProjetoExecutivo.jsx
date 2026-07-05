import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TAXONOMY, inferCategory, genItemId } from '../taxonomy.js'
import { LOGO_EXEC } from '../logos.js'
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

// ─────────────────────────────────────────────────────────────────────────
// SÍMBOLOS ELÉTRICOS — padrão ABNT NBR 5444 (representação em planta baixa)
// Cada símbolo é um <g> SVG desenhado num espaço ~20×20 centrado em (0,0).
// ─────────────────────────────────────────────────────────────────────────
const ELE_SYMBOLS = {
  // Tomada baixa (até 0,30m) — círculo com meia-lua preenchida + 2 traços (NBR 5444)
  tomada_baixa: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="0" y1="-11" x2="0" y2="-7" stroke="#111" stroke-width="1.3"/>`,
  // Tomada média/alta (1,30m+) — igual com 3 traços de altura
  tomada_media: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="-2.5" y1="-11" x2="-2.5" y2="-7" stroke="#111" stroke-width="1.1"/><line x1="2.5" y1="-11" x2="2.5" y2="-7" stroke="#111" stroke-width="1.1"/>`,
  tomada_alta: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="-4" y1="-11" x2="-4" y2="-7" stroke="#111" stroke-width="1.1"/><line x1="0" y1="-11" x2="0" y2="-7" stroke="#111" stroke-width="1.1"/><line x1="4" y1="-11" x2="4" y2="-7" stroke="#111" stroke-width="1.1"/>`,
  // Tomada de piso — círculo com X dentro
  tomada_piso: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#111" stroke-width="1.2"/><line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5" stroke="#111" stroke-width="1.2"/>`,
  tomada_teto: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="0" y1="7" x2="0" y2="11" stroke="#111" stroke-width="1.3"/><text x="0" y="-1.5" font-size="5.5" font-weight="700" text-anchor="middle" fill="#fff">T</text>`,
  keystone_teto: `<rect x="-7" y="-7" width="14" height="14" rx="2" fill="#fff" stroke="#111" stroke-width="1.2"/><circle cx="0" cy="0" r="3.5" fill="none" stroke="#111" stroke-width="1.1"/><line x1="0" y1="7" x2="0" y2="11" stroke="#111" stroke-width="1.2"/><text x="0" y="-9" font-size="5" text-anchor="middle" fill="#111">KS</text>`,
  keystone_alto: `<rect x="-6.5" y="-6.5" width="13" height="13" rx="2" fill="#fff" stroke="#2563EB" stroke-width="1.3"/><circle cx="0" cy="0" r="3" fill="none" stroke="#2563EB" stroke-width="1.1"/><line x1="0" y1="-10.5" x2="0" y2="-6.5" stroke="#2563EB" stroke-width="1.2"/>`,
  keystone_baixo: `<rect x="-6.5" y="-6.5" width="13" height="13" rx="2" fill="#fff" stroke="#2563EB" stroke-width="1.3"/><circle cx="0" cy="0" r="3" fill="none" stroke="#2563EB" stroke-width="1.1"/><line x1="0" y1="6.5" x2="0" y2="10.5" stroke="#2563EB" stroke-width="1.2"/>`,
  ponto_som_teto: `<circle r="7" fill="#fff" stroke="#BE185D" stroke-width="1.4"/><circle r="3" fill="#BE185D"/><line x1="0" y1="7" x2="0" y2="11" stroke="#BE185D" stroke-width="1.3"/>`,
  ponto_som_parede: `<circle r="7" fill="#fff" stroke="#BE185D" stroke-width="1.4"/><circle r="3" fill="#BE185D"/><line x1="0" y1="-11" x2="0" y2="-7" stroke="#BE185D" stroke-width="1.3"/>`,
  ponto_som_piso: `<rect x="-7" y="-7" width="14" height="14" fill="#fff" stroke="#BE185D" stroke-width="1.4"/><circle r="3" fill="#BE185D"/>`,
  ponto_energia_piso: `<rect x="-7" y="-7" width="14" height="14" fill="#fff" stroke="#16A34A" stroke-width="1.4"/><line x1="-4" y1="0" x2="4" y2="0" stroke="#16A34A" stroke-width="1.3"/><line x1="0" y1="-4" x2="0" y2="4" stroke="#16A34A" stroke-width="1.3"/>`,
  ponto_energia_parede: `<circle r="7" fill="#fff" stroke="#16A34A" stroke-width="1.5"/><line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#16A34A" stroke-width="1.3"/><line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#16A34A" stroke-width="1.3"/><line x1="0" y1="-11" x2="0" y2="-7" stroke="#16A34A" stroke-width="1.2"/>`,
  interruptor_4: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3.5" font-size="7.5" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S4</text>`,
  // Ponto de energia no teto (fase+neutro) — círculo com cruz (símbolo de ponto de luz/saída no teto, NBR)
  ponto_energia_teto: `<circle r="7" fill="#fff" stroke="#16A34A" stroke-width="1.5"/><line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#16A34A" stroke-width="1.3"/><line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#16A34A" stroke-width="1.3"/>`,
  // Interruptor simples — letra S (representação usual em planta)
  interruptor_simples: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3" font-size="7.5" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S1</text>`,
  // Interruptor paralelo (three-way) — S com traço
  interruptor_paralelo: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3" font-size="7.5" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S2</text>`,
  // Interruptor intermediário (four-way)
  interruptor_intermediario: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3" font-size="7.5" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S3</text>`,
  interruptor_6: `<circle r="7.5" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3" font-size="7" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S6</text>`,
  // Ponto de luz no teto — círculo com 4 traços (luminária)
  ponto_luz: `<circle r="6.5" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-9" y1="0" x2="-6.5" y2="0" stroke="#111" stroke-width="1.1"/><line x1="6.5" y1="0" x2="9" y2="0" stroke="#111" stroke-width="1.1"/><line x1="0" y1="-9" x2="0" y2="-6.5" stroke="#111" stroke-width="1.1"/><line x1="0" y1="6.5" x2="0" y2="9" stroke="#111" stroke-width="1.1"/><circle r="2" fill="#111"/>`,
  // Arandela (luz de parede) — meio círculo
  arandela: `<path d="M-7 6 A7 7 0 0 1 7 6 Z" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-9" y1="6" x2="9" y2="6" stroke="#111" stroke-width="1.3"/>`,
  arandela_teto: `<circle r="6.5" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-9" y1="0" x2="-6.5" y2="0" stroke="#111" stroke-width="1.1"/><line x1="6.5" y1="0" x2="9" y2="0" stroke="#111" stroke-width="1.1"/><circle r="2" fill="#fff" stroke="#111" stroke-width="1"/>`,
  prumada: `<circle r="8" fill="#fff" stroke="#7C3AED" stroke-width="1.6"/><path d="M0 -5 L0 5 M-3 -2 L0 -5 L3 -2 M-3 2 L0 5 L3 2" fill="none" stroke="#7C3AED" stroke-width="1.4" stroke-linecap="round"/>`,
  caixa_conduite: `<rect x="-8" y="-8" width="16" height="16" fill="#fff" stroke="#1E3A8A" stroke-width="1.6" stroke-dasharray="2,1"/><line x1="-8" y1="0" x2="8" y2="0" stroke="#1E3A8A" stroke-width="1.2"/><line x1="0" y1="-8" x2="0" y2="8" stroke="#1E3A8A" stroke-width="1.2"/>`,
  modulo_cabeceira: `<rect x="-11" y="-7" width="22" height="14" rx="2" fill="#fff" stroke="#111" stroke-width="1.2"/><circle cx="-6" cy="0" r="3" fill="none" stroke="#111" stroke-width="1"/><line x1="-7.5" y1="-1.5" x2="-4.5" y2="1.5" stroke="#111" stroke-width="0.9"/><line x1="-7.5" y1="1.5" x2="-4.5" y2="-1.5" stroke="#111" stroke-width="0.9"/><rect x="-1" y="-3" width="3" height="6" rx="1" fill="none" stroke="#111" stroke-width="0.9"/><text x="7" y="2.5" font-size="5.5" text-anchor="middle" font-weight="700" fill="#0891B2">USB</text>`,
  // Quadro de distribuição (QDL)
  quadro: `<rect x="-10" y="-7" width="20" height="14" fill="#fff" stroke="#111" stroke-width="1.5"/><line x1="-10" y1="-2.5" x2="10" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="-5" y1="-7" x2="-5" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="0" y1="-7" x2="0" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="5" y1="-7" x2="5" y2="-2.5" stroke="#111" stroke-width="1"/>`,
  // Genérico
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
  interruptor_simples:{label:'S1', tipo:'Interruptor 1 tecla'},
  interruptor_paralelo:{label:'S2', tipo:'Interruptor 2 teclas'},
  interruptor_intermediario:{label:'S3', tipo:'Interruptor 3 teclas'},
  interruptor_4:{label:'S4', tipo:'Interruptor 4 teclas'},
  interruptor_6:{label:'S6', tipo:'Interruptor / Keypad 6 teclas'},
  modulo_cabeceira:{label:'MOD', tipo:'Módulo cabeceira (tomada+interruptor+2 USB)'},
  keystone_alto:{label:'KS-M', tipo:'Keystone parede média (1,10m) CAT6'},
  keystone_teto:{label:'KS-T', tipo:'Keystone de teto (rede)'},
  keystone_baixo:{label:'KS-B', tipo:'Keystone baixo (0,30m) CAT6'},
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
function classifyEle(m){
  // 1) tipo elétrico definido manualmente (dropdown no marcador) tem prioridade
  if(m.eleType && ELE_TYPE_INFO[m.eleType]) return { sym:m.eleType, ...ELE_TYPE_INFO[m.eleType] }
  if(m.eleType==='nenhum') return null  // marcado explicitamente como "não é elétrico"
  // 2) senão, infere pelo nome/nota
  const n=((m.name||'')+' '+(m.note||'')).toLowerCase()
  if(/keystone.*teto|teto.*keystone/.test(n)) return {sym:'keystone_teto', label:'KS-T', tipo:'Keystone de teto (rede)'}
  if(/keystone.*alto|keystone.*banca|keystone.*1[,.]?10/.test(n)) return {sym:'keystone_alto', label:'KS-A', tipo:'Keystone alto/bancada (1,10m)'}
  if(/keystone.*baixo|keystone.*0[,.]?30/.test(n)) return {sym:'keystone_baixo', label:'KS-B', tipo:'Keystone baixo (0,30m)'}
  if(/ponto.*energia.*teto|energia.*teto.*fase|fase.*neutro.*teto/.test(n)) return {sym:'ponto_energia_teto', label:'⊕', tipo:'Ponto de energia no teto'}
  if(/ponto.*som.*teto|som.*teto|caixa.*embutida.*som|teto.*som/.test(n)) return {sym:'ponto_som_teto', label:'♪T', tipo:'Ponto de som (teto)'}
  if(/modulo.*cabeceira|cabeceira|tomada.*usb|usb.*tomada/.test(n)) return {sym:'modulo_cabeceira', label:'MOD', tipo:'Módulo cabeceira (tomada+interruptor+2 USB)'}
  if(/caixa.*conduite|conduite.*caixa|caixa.*passagem|caixa.*deriva|junction/.test(n)) return {sym:'caixa_conduite', label:'CX', tipo:'Caixa de conduíte (passagem/derivação)'}
  if(/prumada|shaft|descida.*andar|descida.*pavimento|coluna.*vertical/.test(n)) return {sym:'prumada', label:'⇵', tipo:'Prumada (descida entre pavimentos)'}
  if(/quadro|qdl|qd |distribui/.test(n)) return {sym:'quadro', label:'QDL', tipo:'Quadro de Distribuição'}
  if(/interruptor.*(intermedi|four)/.test(n)) return {sym:'interruptor_intermediario', label:'S3', tipo:'Interruptor 3 teclas'}
  if(/interruptor.*(paralel|three|hotel)|paralelo/.test(n)) return {sym:'interruptor_paralelo', label:'S2', tipo:'Interruptor 2 teclas'}
  // keypad: detecta nº de botões/teclas (ex: "Keypad 2 botões" → interruptor 2 teclas)
  if(/keypad|botão|botões|botoes|tecla|interruptor/.test(n)){
    const mb=n.match(/(\d+)\s*(bot|tecla|gang)/)
    const nb=mb?parseInt(mb[1]):1
    if(nb>=6) return {sym:'interruptor_6', label:'S6', tipo:`Interruptor/Keypad ${nb} teclas`}
    if(nb>=3) return {sym:'interruptor_intermediario', label:`S${nb}`, tipo:`Interruptor/Keypad ${nb} teclas`}
    if(nb===2) return {sym:'interruptor_paralelo', label:'S2', tipo:'Interruptor/Keypad 2 teclas'}
    return {sym:'interruptor_simples', label:'S', tipo:'Interruptor / Keypad'}
  }
  if(/tomada.*teto|tomada de teto/.test(n)) return {sym:'tomada_teto', label:'TUG-T', tipo:'Tomada de teto'}
  if(/tomada.*piso|tomada.*ch[ãa]o/.test(n)) return {sym:'tomada_piso', label:'TUG-P', tipo:'Tomada de piso'}
  if(/tomada.*(alta|1[,.]80|2[,.]00|for[çc]a)/.test(n)) return {sym:'tomada_alta', label:'TUG-A', tipo:'Tomada alta (1,80m)'}
  if(/tomada.*(m[ée]dia|1[,.]10|1[,.]30|banca|0[,.]90)/.test(n)) return {sym:'tomada_media', label:'TUG-M', tipo:'Tomada média (1,10m)'}
  if(/tomada/.test(n)) return {sym:'tomada_baixa', label:'TUG-B', tipo:'Tomada baixa (0,30m)'}
  if(/ponto.*el[ée]tric|ponto.*energia|ponto.*for[çc]a/.test(n)){
    if(/teto|forro/.test(n)) return {sym:'ponto_energia_teto', label:'⊕T', tipo:'Ponto elétrica no teto'}
    if(/piso|ch[ãa]o/.test(n)) return {sym:'ponto_energia_piso', label:'⊕P', tipo:'Ponto elétrica no piso'}
    return {sym:'ponto_energia_parede', label:'⊕', tipo:'Ponto elétrica na parede'}
  }
  if(/arandela.*teto|arandela de teto/.test(n)) return {sym:'arandela_teto', label:'L', tipo:'Arandela de teto'}
  if(/arandela/.test(n)) return {sym:'arandela', label:'L', tipo:'Arandela de parede'}
  if(/luz|luminária|luminaria|spot|lustre|plafon|ponto de luz/.test(n)) return {sym:'ponto_luz', label:'L', tipo:'Ponto de luz'}
  return null  // não é elétrico → não entra na planta elétrica
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
// Cor = categoria (6 cores). Selo do cabo (R/S/E) vem de cableFamily.
const CAT_COLOR = { keypad:'#16A34A', ap:'#F59E0B', camera:'#DC2626', som:'#7C3AED', energia:'#111827', sensor:'#EA580C' }
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
function isPontoEletrico(m){ const c=classifyEle(m); return !!(c && ELE_SYMS_SET.has(c.sym)) }

function mountOf(m){
  const a=((m&&m.altura)||'').toLowerCase()
  if(a){ if(a==='teto'||a==='forro') return 'teto'; if(a==='piso'||a==='chao'||a==='chão') return 'chao'; return 'parede' }
  if(m && (m.mount==='teto'||m.mount==='parede'||m.mount==='chao')) return m.mount
  const n=(((m&&m.name)||'')+' '+((m&&m.note)||'')).toLowerCase()
  const sym=classifyEle(m)?.sym||''
  if(sym==='tomada_piso' || sym==='ponto_energia_piso' || sym==='ponto_som_piso' || /\bpiso\b|ch[ãa]o|subwoofer|\bsub\b/.test(n)) return 'chao'
  if(['tomada_teto','keystone_teto','ponto_som_teto','ponto_energia_teto','ponto_luz','arandela_teto'].includes(sym)) return 'teto'
  if(/teto|forro|c[âa]mera|dome|bullet|access point|\bap\b|wi-?fi|spot|lustre|plafon|luminári|luminari|sensor|presen[çc]a|mmwave|proje(tor|ção|cao)|caixa (ac[uú]stica|de som|som)|alto-?falante|speaker|\bir\b|infraverm|receptor ir/.test(n)) return 'teto'
  return 'parede'
}
// Altura fina (5 níveis). Manual (m.altura) tem prioridade; senão infere a partir do plano + tipo.
function alturaOf(m){
  const man=((m&&(m.altura||m.mount))||'').toLowerCase()
  if(man==='piso'||man==='chao'||man==='chão') return 'piso'
  if(man==='baixa') return 'baixa'
  if(man==='media'||man==='média') return 'media'
  if(man==='alta') return 'alta'
  if(man==='teto'||man==='forro') return 'teto'
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
  if(type==='eletrica') return { k:'ele',  L:'E', nome:'Elétrico', cor:'#16A34A' }
  if(type==='som')      return { k:'som',  L:'S', nome:'Som',      cor:'#BE185D' }
  return { k:'rede', L:'R', nome:'Rede/Dados', cor:'#2563EB' } // dados, ap, câmera, uplink, fibra, hdmi...
}

// Desenha o pin como SVG (forma + borda branca + número). Reutilizável no editor e nas plantas geradas.
function pinShapeSVG({ mount='parede', alt='', color='#374151', label='', size=22, sel=false }){
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
function drawPin(m, { size=20, color='#374151', idLabel='', badgeFam=null }={}){
  const col = catColorOf(m) || color
  const core = pinShapeSVG({ mount:mountOf(m), alt:alturaOf(m), color:col, label:String(m.n??''), size })
  const badge = badgeFam
    ? `<div style="position:absolute;top:-6px;right:-7px;min-width:12px;height:12px;padding:0 1px;border-radius:6px;background:${badgeFam.cor};color:#fff;font-size:8px;font-weight:800;line-height:12px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${badgeFam.L}</div>`
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
  return `<div style="display:flex;flex-wrap:wrap;gap:14px 16px;align-items:center;margin-top:10px;padding:11px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Cor · categoria</span>
    ${cat(CAT_COLOR.keypad,'Keypad')} ${cat(CAT_COLOR.ap,'Access Point')} ${cat(CAT_COLOR.camera,'Câmera')} ${cat(CAT_COLOR.som,'Som')} ${cat(CAT_COLOR.energia,'Ponto de energia')} ${cat(CAT_COLOR.sensor,'Sensor mmW')}
    <span style="width:100%;height:1px;background:#E2E8F0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Forma · local e altura</span>
    ${frm('piso','Chão')} ${frm('baixa','Parede 0,30')} ${frm('media','Parede 1,10')} ${frm('alta','Parede 1,80')} ${frm('teto','Teto')}
    <span style="width:100%;height:1px;background:#E2E8F0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#94A3B8;text-transform:uppercase;width:100%">Selo · cabo</span>
    ${cab('#16A34A','E','Elétrica')} ${cab('#BE185D','S','Som')} ${cab('#2563EB','R','Rede/Dados')}
    <span style="font-size:9px;color:#94A3B8;width:100%;line-height:1.5">Três leituras num pin: a <b>cor</b> diz o que é, a <b>forma</b> diz onde instalar (triângulo teto, círculo parede com o tracinho na altura, quadrado chão), o <b>selo</b> diz o cabo. O número ao lado é a altura em metros.</span>
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

function ProjetoExecutivoInner({ catalog=[], clients=[], preClient, fromProposal, onSaveToProposal, onClose, currentUser }) {
  // planta_data pode vir como objeto OU string JSON (do Supabase) — normaliza
  const initPlanta = (()=>{ let pd=fromProposal?.planta_data; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const initPlantaCliente = (()=>{ let pd=fromProposal?.planta_cliente; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const [step, setStep] = useState(()=> (initPlanta?.markers?.length || initPlanta?.image) ? 'editor' : 'upload')
  const [bgImage, setBgImage] = useState(()=> initPlanta?.image || null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState(()=> initPlanta?.markers || [])
  const [history, setHistory] = useState([])   // pilha de estados anteriores de markers (undo)
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
  // snapshot para undo (chamar ANTES de alterar markers)
  const pushHistory = () => setHistory(h=>[...h.slice(-29), markers])
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
  const [catFilter, setCatFilter] = useState('')
  const [subcatFilter, setSubcatFilter] = useState('')
  const [editorSearch, setEditorSearch] = useState('')         // busca nos markers na planta
  const [filterRooms, setFilterRooms] = useState(new Set())   // cômodos selecionados (vazio = todos)
  const [filterCateg, setFilterCateg] = useState(new Set())   // categorias selecionadas (vazio = todas)
  const [filterItem, setFilterItem] = useState('')            // filtra mapa por nome de item (resumo)
  const [showRackModal, setShowRackModal] = useState(false)
  const [rackEquip, setRackEquip] = useState([])   // [{code,name,qty,u}]
  // gerador de ID único e monotônico (evita colisão de Date.now() em cliques rápidos)
  const _uidSeq = React.useRef(0)
  const uniqId = (pref='')=> pref + Date.now().toString(36) + '-' + (++_uidSeq.current).toString(36) + Math.random().toString(36).slice(2,6)
  const [execDoc, setExecDoc] = useState(()=> fromProposal?.exec_doc || null)         // versão Completa (HTML)
  const [execDocObra, setExecDocObra] = useState(()=> fromProposal?.exec_doc_obra || null) // versão Obra/Pedreiro (HTML)
  const [execDocEletrica, setExecDocEletrica] = useState(()=> fromProposal?.exec_doc_eletrica || null) // versão Elétrica (HTML)
  const [execDocConduites, setExecDocConduites] = useState(()=> fromProposal?.exec_doc_conduites || null) // relatório de conduítes (HTML)
  const [execMode, setExecMode] = useState('completo') // 'completo' | 'obra' | 'eletrica'
  const [showHeatmap, setShowHeatmap] = useState(true)  // mostrar mapa de calor de Wi-Fi no executivo
  const [showIds, setShowIds] = useState(false)  // códigos nos pinos DO EDITOR (para trabalhar)
  const [showIdsPdf, setShowIdsPdf] = useState(false)  // códigos nas plantas DO RELATÓRIO/PDF (default: limpo)
  const [filterLevels, setFilterLevels] = useState(()=>new Set())   // filtro por nível: piso/baixa/media/alta/teto (vazio = todos)
  const [showCabo, setShowCabo] = useState(true)   // mostrar a legenda de cabo (E/S/R) ao lado do pin
  const [showLegenda, setShowLegenda] = useState(true) // incluir o bloco de legenda (formas + cabos) nas plantas geradas
  // ── Filtros do relatório (ocultar coisas na GERAÇÃO, sem apagar nada do projeto) ──
  const [pdfFiltersOpen, setPdfFiltersOpen] = useState(false)
  const [showPdfOpts, setShowPdfOpts] = useState(false)  // painel de opções na hora de gerar o PDF
  const [hideFams, setHideFams] = useState(new Set())      // famílias de cabo fora do PDF (dados, som, camera...)
  const [hideCats, setHideCats] = useState(new Set())      // categorias de equipamento fora das plantas do PDF
  const [hidePdfConduites, setHidePdfConduites] = useState(false) // tirar todos os conduítes do PDF
  const [pageOrient, setPageOrient] = useState('original') // orientação da PLANTA no documento: 'original' | 'paisagem' | 'retrato' — o app gira a imagem e converte pins/cabos
  const [rotBg, setRotBg] = useState(null) // planta girada 90° (gerada em canvas quando necessário)
  const [plantPct, setPlantPct] = useState(100) // largura da planta nas páginas do documento (%) — ajustável na tela
  const [execData, setExecData] = useState(()=> fromProposal?.planta_data?.exec_data || null) // dados crus da IA — persistidos p/ reconstruir o documento com as opções atuais
  const [execVersao, setExecVersao] = useState('nova') // 'nova' (premium) | 'antiga' (clássico cyan)
  const [execProgress, setExecProgress] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [addItem, setAddItem] = useState(null)
  const [addMode, setAddMode] = useState(false)
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
        // fallback: grade arbitrária
        const cx=fbIdx%cols, cy=Math.floor(fbIdx/cols); fbIdx++
        const cellW=92/cols, cellH=88/rows
        baseX = 4+cellW*cx+3; baseY = 6+cellH*cy+6
        spreadX = (cellW-6)/Math.max(1,icols-0); spreadY = (cellH-10)/Math.max(1,irows)
      }
      room.items.forEach((it,ii)=>{
        const ix=ii%icols, iy=Math.floor(ii/icols)
        const sub = inferCategory(it.name, it.category||'').sub || ''
        const newId = genItemId(it.room||'', sub, mk)
        mk.push({uid:Date.now()+Math.random(), n:n++, id:newId, code:it.code, name:it.name, room:it.room, note:'',
          x:Math.min(96,Math.max(3, baseX+ix*spreadX)),
          y:Math.min(94,Math.max(4, baseY+iy*spreadY)),
          cost:it.cost, sale:it.sale, category:it.category})
      })
    })
    return mk
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
      setBgImage(url)
      // mantém o step atual (editor) e os markers — não reinicia
    }
    reader.readAsDataURL(f)
  }

  // ETAPA 1: IA identifica cômodos com posições (x,y %) na imagem
  async function startRooms(imgUrl){
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
      return [...ms,{uid:uniqId('mk'),n:ms.length+1,id:newId,code:addItem.code,name:addItem.name,
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

  // ── Undo / Limpar / Recomeçar ──
  function undo(){
    setHistory(h=>{ if(!h.length) return h; const prev=h[h.length-1]; setMarkers(prev); return h.slice(0,-1) })
  }
  // pede senha 456 + confirmação para ações destrutivas
  function confirmarComSenha(mensagem){
    const senha = window.prompt(`${mensagem}\n\n⚠ Ação destrutiva. Digite a senha para confirmar:`)
    if(senha===null) return false   // cancelou
    if(senha.trim()!=='456'){ alert('Senha incorreta. Ação cancelada.'); return false }
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
      if((e.ctrlKey||e.metaKey)&&e.key==='z'&&step==='editor'){ e.preventDefault(); undo() }
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
  const CABLE_LABELS  = { dados:'Dados', ap:'AP / Access Point', camera:'Câmera', uplink:'Uplink', hdmi:'HDMI', som:'Som', eletrica:'Elétrica', fibra:'Fibra Óptica', conduite_dados:'Conduíte DADOS', conduite_eletrica:'Conduíte ELÉTRICA' }
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
    fibra:    { spec:'Fibra óptica (drop/ONT)', uso:'Internet operadora → ONT/Modem', conector:'SC/APC' },
    conduite_dados:    { spec:'Eletroduto 3/4" (dados)', uso:'Conduíte compartilhado de DADOS', conector:'Caixa 4×4 / 4×2' },
    conduite_eletrica: { spec:'Eletroduto 3/4"–1" (elétrica)', uso:'Conduíte compartilhado de ELÉTRICA', conector:'Caixa 4×4' },
  }
  const mk = uid => markers.find(m=>m.uid===uid)
  // adivinha o tipo de cabo pela natureza dos itens conectados
  function guessCableType(from, to){
    const n=(from?.name+' '+to?.name).toLowerCase()
    if(/uplink|gateway|dream machine|provedor|ont|modem/.test(n)) return 'uplink'
    if(/som|caixa ac[uú]stica|caixa de som|amplificador|receiver|subwoofer|sub /.test(n)) return 'som'
    if(/tv|hdmi|tel[aã]o|projetor|matriz de v[ií]deo/.test(n)) return 'hdmi'
    if(/sensor|presen[çc]a|mmwave|infraverm|receptor ir/.test(n)) return 'eletrica'
    if(/keypad|interruptor|tomada|m[óo]dulo|cortina|hub ir|quadro|qdl|pulsador|pulsante/.test(n)) return 'eletrica'
    return 'dados'
  }
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
    const caixaDe  = m => isKeypad(m) ? '4×4 + NEUTRO' : isTomada(m) ? '4×2' : isModulo(m)||isCortina(m) ? 'forro' : '—'
    const caboDe   = m => isKeypad(m) ? '3×2,5mm² (F+N+T)' : isTomada(m) ? '3×2,5mm²' : isCam(m)||isAP(m) ? 'CAT6 PoE' : isSom(m) ? '2×1,5mm²' : isCortina(m)||isModulo(m) ? '2×2,5mm² (F+N)' : 'CAT6'

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
    const rack_cable_table = cablesUnificados().filter(c=>!c.free).map((c,i)=>{
      const from=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid)
      const mt=cableMeters(c)
      const dev = from?.name||'Rack'
      _portaSeq[dev] = (_portaSeq[dev]||0)+1
      return { porta_patch:`P${String(i+1).padStart(2,'0')}`, device_origem:dev, porta_origem:String(_portaSeq[dev]),
        destino:(to?.name||'—')+(c._via?` · ${c._via}`:''), tipo:(CABLE_SPEC[c.type]?.spec)||'CAT6',
        metros: mt!=null?String(mt):'—',
        etiqueta:`${(to?.code||to?.name||'PT')}`.toUpperCase().slice(0,16), cor:'' }
    })

    // cabos de som
    const cabos_som = markers.filter(isSom).map((m,i)=>{
      const cab=(cables||[]).find(c=>c.toUid===m.uid||c.fromUid===m.uid)
      const mt=cab?cableMeters(cab):null
      return { id:`SOM-${String(i+1).padStart(2,'0')}`, origem:'Amplificador no Rack', destino:`${m.name} (${m.room||''})`,
        tipo:'2×1,5mm²', metros: mt!=null?String(mt):'—', etiqueta:`SOM-${i+1}` }
    })

    // alimentação keypads
    const alim_keypads = markers.filter(isKeypad).map((m,i)=>({ id:`KEY-${String(i+1).padStart(2,'0')}`,
      origem:'Quadro QDL — disj. dedicado', destino:`${m.name} ${m.room||''}`, cota:alturaDe(m),
      comodo:m.room||'—', metros:'—', fios:'3×2,5mm² (F+N+T)' }))

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
      premissas:[
        'Documento montado manualmente a partir dos pontos posicionados na planta.',
        'Todo cabeamento estruturado CAT6 sai do rack/CPD até cada ponto.',
        'Keypads SEMPRE com fase + neutro + terra do quadro (neutro obrigatório).',
        precisaSwitch?`APs + Câmeras = ${totalPoe} → adicionar Switch PoE+ (Dream Machine SE tem 8 portas).`:`Dream Machine SE comporta os ${totalPoe} dispositivos PoE.`,
      ],
      rack_config:{ dream_machine_portas:8, aps, cameras:cams, precisa_switch:precisaSwitch, switch_portas:precisaSwitch?16:0 },
      rack_items,
      rack_detalhe: rackMarker ? ['Rack embutido em armário ventilado','Tomada 110V dedicada para a régua filtrada','Fibra do provedor direto na porta WAN do Dream Machine SE'] : [],
      rack_cable_table,
      pontos,
      cabos_eletricos_por_comodo,
      cabos_som,
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
  function generateExecManual(){
    if(!markers.length){ alert('Posicione ao menos um item na planta antes de gerar.'); return }
    try {
      const data = buildExecDataFromMarkers()
      setExecData(data)
      const full = buildExecHtml(data,'completo')
      const obra = buildExecHtml(data,'obra')
      const eletrica = buildExecHtml(data,'eletrica')
      const conduites = buildExecHtml(data,'conduites')
      setExecDoc(full); setExecDocObra(obra); setExecDocEletrica(eletrica); setExecDocConduites(conduites)
      setExecMode('completo')
      setStep('exec')
      if(fromProposal?.id){
        import('../db/supabase.js').then(({saveProposal})=>{
          saveProposal({ ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, exec_doc_conduites:conduites, planta_data:{image:bgImage,markers,cables,scale:plantScale,calibSamples,imgRatio,folgaPct,exec_data:data} }).catch(e=>console.warn('Auto-save manual falhou:',e.message))
        })
      }
    } catch(err){
      console.error('generateExecManual error:', err)
      alert('Não consegui gerar o documento sem IA: '+(err?.message||err)+'\n\nVerifique se os pontos têm cômodo definido e tente de novo.')
    }
  }

  async function generateExec(){
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
      setStep('exec')
      setExecProgress('')

      // AUTO-SAVE se veio de proposta
      if(fromProposal?.id){
        try{
          const { saveProposal } = await import('../db/supabase.js')
          const updated = { ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, exec_doc_conduites:conduites, planta_data:{image:bgImage,markers,cables,scale:plantScale,calibSamples,imgRatio,folgaPct,exec_data:data} }
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
  function buildExecHtml(d, mode='completo', versao){
    const { bg:bgImage, mks:markers, cbs:cables, ratio:imgRatio } = _docView()
    // Traçado dos cabos na visão do documento: as PONTAS vêm destes markers (girados quando a planta gira)
    const cablePolyPoints = c => {
      if(c.free) return c.points||[]
      const f=markers.find(m=>m.uid===c.fromUid), t=markers.find(m=>m.uid===c.toUid)
      return (f&&t) ? [{x:f.x,y:f.y}, ...(c.points||[]), {x:t.x,y:t.y}] : []
    }
    // ── LEGENDA MESTRE (decisão 3): símbolo técnico NBR + pino da planta lado a lado,
    // só dos tipos presentes no projeto. Mesma legenda em todos os documentos.
    const legendaMestreHtml = (()=>{
      const vistos=new Map()
      markers.forEach(m=>{ const c=classifyEle(m); if(c && !vistos.has(c.sym)) vistos.set(c.sym,{sym:c.sym,tipo:(ELE_TYPE_INFO[c.sym]?.tipo)||c.tipo||'',m}) })
      const NIVL={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}
      const linhas=[...vistos.values()].map(u=>{ const alt=alturaOf(u.m)
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 7px;border:1px solid #E2E8F0;border-radius:6px;background:#fff">
          <svg viewBox="-12 -14 24 32" width="20" height="26">${ELE_SYMBOLS[u.sym]||ELE_SYMBOLS.generico}</svg>
          <span style="width:20px;height:20px;display:inline-block;flex-shrink:0">${pinShapeSVG({mount:mountOf(u.m),alt,color:catColorOf(u.m)||'#64748B',label:'',size:20})}</span>
          <span style="font-size:9.5px;color:#334155;line-height:1.3"><b>${String(u.tipo).replace(/</g,'&lt;')}</b><br><span style="color:#94A3B8">${NIVL[alt]||''}</span></span>
        </div>` }).join('')
      return pontosLegenda() + (linhas?`<div style="margin-top:8px;padding:10px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#64748B;margin-bottom:7px">Legenda mestre · símbolo técnico (NBR) + pino da planta · tipos usados neste projeto</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:5px">${linhas}</div>
      </div>`:'')
    })()
    const _ver = versao || execVersao
    const isObra = mode==='obra'
    const _prem = _ver==='nova'
    // Tema do miolo do documento: no premium acompanha a casca (navy + dourado);
    // no clássico, cyan. NÃO mexe em cor que é dado (cabo, categoria, gráfico, telas de app).
    const _fable = _ver==='fable'
    const TH = _fable
      ? { rule:'#B0854C', pin:'#131A2C', accent:'#B0854C' }
      : _prem
      ? { rule:'#1A2740', pin:'#1A2740', accent:'#9C7B45' }
      : { rule:'#0EA5E9', pin:'#0EA5E9', accent:'#0EA5E9' }
    // Número de capítulo: premium/fable = algarismo dourado inline (estilizado pelo CSS .ex-sec-num);
    // clássico = bolinha cyan inline.
    const _capNum = n => (_prem||_fable)
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
      // bitola/fios por tipo — elétrica 1,5mm²
      const fiosDe = sym => /tomada/.test(sym)?'3×1,5mm² (F+N+T)':/interruptor/.test(sym)?'2×1,5mm² (retorno)':/luz|arandela|energia/.test(sym)?'2×1,5mm²':sym==='quadro'?'alimentação geral':'—'
      // ── símbolos como SVG individuais (cada um num quadradinho que NÃO distorce) ──
      // tomadas ficam menores (costumam ser muitas); demais maiores
      const symPxDe = sym => /tomada/.test(sym) ? 21 : 30
      const syms = eleMarks.map(({m,cls})=>{
        const SYM_PX = symPxDe(cls.sym)
        // tensão: 110/220 a partir da nota do ponto
        const volt = /tomada/.test(cls.sym) ? ((/220/.test(m.note||'')?'220V':/110|127/.test(m.note||'')?'110V':'')) : ''
        return `
        <div style="position:absolute;left:${m.x}%;top:${m.y}%;width:${SYM_PX}px;height:${SYM_PX}px;transform:translate(-50%,-50%);z-index:3">
          <svg viewBox="-12 -14 24 30" width="${SYM_PX}" height="${SYM_PX}" style="overflow:visible">
            ${ELE_SYMBOLS[cls.sym]||ELE_SYMBOLS.generico}
            <circle cx="10" cy="-10" r="6.5" fill="${TH.pin}" stroke="#fff" stroke-width="1.2"/>
            <text x="10" y="-7.5" font-size="8" text-anchor="middle" font-weight="800" fill="#fff">${m.n}</text>
          </svg>
          ${volt?`<div style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);font-size:6.5px;font-weight:800;color:#fff;background:${volt==='220V'?'#DC2626':'#0891B2'};padding:0 3px;border-radius:5px;white-space:nowrap">${volt}</div>`:''}
          <div style="position:absolute;left:50%;top:${SYM_PX-3}px;transform:translateX(-50%);font-size:7.5px;font-weight:700;color:#0D1420;white-space:nowrap;background:rgba(255,255,255,0.8);padding:0 2px;border-radius:2px">${esc(cls.label)}</div>
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
      const ELETR_T = new Set(['eletrica','conduite_eletrica'])
      const listaGeral = T(eleMarks.map(({m,cls})=>{
        const cab=(cables||[]).find(c=>(c.toUid===m.uid||c.fromUid===m.uid) && ELETR_T.has(c.type||''))
        const cond = cab ? (CABLE_CONDUITE[cab.type] ? 'compartilhado' : 'exclusivo') : '—'
        const mt = cab?cableMeters(cab):null
        const origem = cab ? (markers.find(x=>x.uid===(cab.fromUid===m.uid?cab.toUid:cab.fromUid))?.name||'Quadro') : (qdl?'Quadro QDL':'—')
        const cx = m.caixaTipo || caixaPadrao(cls.sym) || '—'
        return `<tr>
          <td style="text-align:center">${pin(m.n,undefined,m)}</td>
          <td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td>
          <td>${esc(cls.tipo)}</td>
          <td style="font-size:11px">${esc(m.room||'—')}</td>
          <td style="font-weight:700">${esc(m.note&&/\d/.test(m.note)?m.note:altPadrao(cls.sym))}</td>
          <td style="text-align:center;font-weight:600">${esc(cx)}</td>
          <td style="font-size:10.5px">${esc(fiosDe(cls.sym))}</td>
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
      const cargaRows = Object.entries(byRoomCarga).map(([r,c])=>{
        const va=c.tom*VA_TUG+c.luz*VA_LUZ
        return `<tr><td><b>${esc(r)}</b></td><td style="text-align:center">${c.tom||'—'}</td><td style="text-align:center">${c.int||'—'}</td><td style="text-align:center">${c.luz||'—'}</td><td style="text-align:right">${va} VA</td></tr>`
      }).join('')
      const totalVA = Object.values(byRoomCarga).reduce((s,c)=>s+(c.tom*VA_TUG+c.luz*VA_LUZ),0)
      const cargaTbl = cargaRows ? `<table class="ex-tbl"><thead><tr><th>Cômodo</th><th style="text-align:center">Tomadas</th><th style="text-align:center">Interrup.</th><th style="text-align:center">Pts Luz</th><th style="text-align:right">Carga estimada</th></tr></thead><tbody>${cargaRows}<tr style="background:#0D1420;color:#fff"><td colspan="4"><b>Demanda total estimada</b></td><td style="text-align:right"><b>${totalVA} VA</b></td></tr></tbody></table>
        <p class="ex-p" style="font-size:9.5px;color:#94A3B8;margin-top:4px">Estimativa simplificada (TUG ${VA_TUG}VA · ponto de luz ${VA_LUZ}VA). Dimensionamento final por engenheiro eletricista (ART/NBR 5410).</p>` : ''
      // checklist elétrico
      const checklistEle = `<ul class="ex-ul">
        <li>Conferir NEUTRO chegando em 100% das caixas de interruptor/keypad.</li>
        <li>Circuitos de tomada e iluminação SEPARADOS no quadro QDL.</li>
        <li>Aterramento (fio terra verde) em todas as tomadas.</li>
        <li>Eletroduto de dados e de elétrica em conduítes SEPARADOS (nunca no mesmo).</li>
        <li>Identificar cada disjuntor no QDL conforme a lista geral acima.</li>
        <li>Testar todos os pontos antes do fechamento das paredes.</li>
      </ul>`
      const head = `<div style="background:#0D1420;color:#38BDF8;font-size:12px;font-weight:700;padding:9px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>PLANTA ELÉTRICA — Símbolos ABNT NBR 5444</span><span style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:400">${eleMarks.length} pontos${qdl?' · QDL':''}</span></div>`
      // imagem com proporção REAL (padding-bottom = ratio), símbolos como HTML que NÃO distorcem
      const fig = `<div style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
        <div style="position:relative;width:100%;padding-bottom:${(ratio*100).toFixed(1)}%">
          <img src="${bgImage}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:grayscale(0.3) contrast(0.95) brightness(1.04)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${dutos}</svg>
          ${syms}
        </div></div>`
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Planta Elétrica (ABNT NBR 5444)</h2>` : `<h2>Planta Elétrica (ABNT NBR 5444)</h2>`
      // resumo de caixas de embutir (lista de compra do eletricista)
      const cxCount={}; eleMarks.forEach(({m,cls})=>{ const cx=m.caixaTipo||caixaPadrao(cls.sym); if(cx) cxCount[cx]=(cxCount[cx]||0)+1 })
      const cxResumo = Object.keys(cxCount).length ? `<h3 class="ex-amb" style="margin-top:16px">Caixas de Embutir — Resumo</h3>
        ${T(Object.entries(cxCount).sort().map(([cx,n])=>`<tr><td style="font-weight:700;text-align:center">${esc(cx)}</td><td style="text-align:center">${n}</td><td style="font-size:10px;color:#64748B">${cx==='4x4'?'Keypad 6 teclas / 4+ módulos':cx==='4x2'?'Interruptores e tomadas (1–3 módulos)':cx==='octogonal'?'Pontos de teto':''}</td></tr>`).join(''),['Caixa','Qtd','Uso'])}` : ''
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Pontos elétricos com símbolos normalizados (ABNT NBR 5444), em proporção real da planta. Mostra apenas os pontos elétricos (tomadas, interruptores, iluminação, quadro).</p>
        ${head}${fig}${legenda}
        <h3 class="ex-amb" style="margin-top:18px">Lista Geral — Todos os Pontos Elétricos</h3>${listaGeral}
        ${cxResumo}
        <h3 class="ex-amb" style="margin-top:16px">Quadro de Cargas — estimativa por cômodo</h3>${cargaTbl}
        <h3 class="ex-amb" style="margin-top:16px">Checklist Elétrico</h3>${checklistEle}
      </div>`
    }

    // ── MAPA DE CALOR Wi-Fi — propagação aproximada dos APs (paredes de concreto) ──
    // Modelo simples: cada AP irradia um gradiente radial. Concreto atenua forte,
    // então o raio "bom" é curto. Gera mancha verde→amarelo→vermelho + aviso de zonas mortas.
    function buildHeatmap(numFn){
      const aps = markers.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
      if(!bgImage || aps.length===0) return ''  // sem AP no projeto → não mostra mapa de calor
      // raios em % da largura da planta (aprox.). Concreto: cobertura útil menor.
      // forte ~ até 14%, médio ~ 22%, fraco ~ 30% do lado da imagem.
      const R_FORTE=14, R_MEDIO=22, R_FRACO=30
      const grads = aps.map((m,i)=>`
        <radialgradient id="ap${i}" cx="${m.x}%" cy="${m.y}%" r="${R_FRACO}%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#16A34A" stop-opacity="0.55"/>
          <stop offset="${(R_FORTE/R_FRACO*100).toFixed(0)}%" stop-color="#84CC16" stop-opacity="0.40"/>
          <stop offset="${(R_MEDIO/R_FRACO*100).toFixed(0)}%" stop-color="#FACC15" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#DC2626" stop-opacity="0.16"/>
        </radialgradient>`).join('')
      const manchas = aps.map((m,i)=>`<circle cx="${m.x}" cy="${m.y}" r="${R_FRACO}" fill="url(#ap${i})"/>`).join('')
      const pinos = aps.map((m,i)=>`<g transform="translate(${m.x},${m.y})">
        <circle r="2.2" fill="#0E7490" stroke="#fff" stroke-width="0.7"/>
        <text x="0" y="-3.2" font-size="3" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="#0E7490">AP${i+1}</text></g>`).join('')

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

      const head = `<div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>COBERTURA Wi-Fi — Propagação aproximada</span><span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${aps.length} AP${aps.length!==1?'s':''} · paredes de concreto</span></div>`
      const fig = `<div style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
        <div style="position:relative;width:100%">
          <img src="${bgImage}" style="width:100%;display:block;filter:grayscale(0.5) brightness(1.05)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><defs>${grads}</defs>${manchas}${pinos}</svg>
        </div></div>`
      const legenda = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:#334155">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#16A34A;opacity:.7"></span>Sinal forte</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#FACC15;opacity:.7"></span>Sinal médio</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#DC2626;opacity:.7"></span>Sinal fraco / borda</span>
      </div>`
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Cobertura Wi-Fi (Mapa de Calor)</h2>` : `<h2>Cobertura Wi-Fi (Mapa de Calor)</h2>`
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Estimativa visual do alcance dos Access Points considerando <b>paredes de concreto</b> (alta atenuação). A mancha verde indica sinal forte; amarelo, médio; vermelho, sinal fraco na borda. É uma aproximação — a cobertura real depende de mobiliário, espelhos e interferências.</p>
        ${head}${fig}${legenda}${aviso}</div>`
    }

    const cliente=projectInfo.client||fromProposal?.client_name||'Cliente'
    const hoje=new Date().toLocaleDateString('pt-BR')
    const T=(rows,cols)=>`<table class="ex-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
    const esc=s=>(s==null?'':String(s))
    // ── Número do pino na planta — para cruzar tabela ↔ planta ──
    // Mesma linguagem da planta: forma pelo local de instalação (○ parede △ teto □ chão), cor pela categoria.
    const pin=(n,color=TH.pin,m=null)=>{
      if(m){
        const pino=pinShapeSVG({mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||color,label:String(m.n??n),size:22})
        const fam=cableFamily(m.cableType||guessCableType(m,m))
        return `<span style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><span style="width:22px;height:22px;display:inline-block">${pino}</span><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:4px;background:${fam.cor};color:#fff;font-size:8px;font-weight:800;border:1px solid #fff" title="${fam.nome}">${fam.L}</span></span>`
      }
      return `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:800;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);vertical-align:middle">${n}</span>`
    }
    // versão fiel à planta: recebe o próprio marker
    const pinMk = m => { if(!m) return ''
      const cor=catColorOf(m)||(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c
      return `<span style="display:inline-flex;vertical-align:middle">${pinShapeSVG({mount:mountOf(m),alt:alturaOf(m),color:cor,label:String(m.n??''),size:20})}</span>` }
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

    // Planta com marcadores
    let planta=''
    if(bgImage){
      const dots=markers.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        const f=cableFamily(m.cableType||guessCableType(m,m))
        const badge=showCabo?`<div style="position:absolute;top:-6px;right:-7px;min-width:12px;height:12px;padding:0 1px;border-radius:6px;background:${f.cor};color:#fff;font-size:8px;font-weight:800;line-height:12px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:22px;height:22px">${pinShapeSVG({mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||st.c,label:String(m.n??''),size:22})}${badge}</div>`}).join('')
      planta=`<div class="ex-sec"><h2>Planta de Pontos</h2><div class="ex-plant" style="position:relative;display:inline-block;max-width:100%"><img src="${bgImage}" style="max-width:100%;display:block;border:1px solid #ddd;border-radius:6px"/>${dots}</div>${showLegenda?legendaMestreHtml:""}</div>`
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
        <td style="text-align:center">${(()=>{ const num=(String(r.destino).match(/#(\d+)/)||[])[1]; const m=num?markers.find(x=>String(x.n)===num):null; return m?pin(m.n,undefined,m):'—' })()}</td>
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
    const _temWifi = showHeatmap && markers.some(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
    return `<style>${_ver==='fable'?EXEC_CSS_FABLE:_ver==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>
<div class="ex-doc">
  <!-- CAPA -->
  <div class="ex-cover">
    <div class="ex-cover-top">${_eletr?(_temWifi?'DOCUMENTO TÉCNICO · ELÉTRICA E Wi-Fi':'DOCUMENTO TÉCNICO · ELÉTRICA'):isObra?'DOCUMENTO DE OBRA · INFRAESTRUTURA':'DOCUMENTO TÉCNICO · PROJETO EXECUTIVO'}</div>
    <img src="${LOGO_EXEC}" alt="RARO HOME" style="width:170px;max-width:50%;margin:0 auto 8px;display:block"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">${_eletr?(_temWifi?'Planta Elétrica e Cobertura Wi-Fi':'Planta Elétrica'):isObra?'Plano de Obra — Cabos e Infraestrutura':'Projeto Executivo de Automação'}</div>
    <div class="ex-cover-sub">${_eletr?(_temWifi?'Símbolos ABNT NBR 5444 · Quadro de cargas · Mapa de calor Wi-Fi<br>Pontos elétricos e cobertura aproximada':'Símbolos ABNT NBR 5444 · Quadro de cargas<br>Pontos e circuitos elétricos'):isObra?'Caminho dos cabos · Metragens · Alturas · Caixas 4×4<br>Guia direto para o eletricista e o pedreiro':'Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto'}</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · RARO Home</div></div>
    <div class="ex-cover-foot">RARO Home · contato@rarohome.com.br · (21) 98170-9009</div>
  </div>

  ${(()=>{ if(isObra||_eletr) return ''
    if(bgImage){
      const dots=markers.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        const f=cableFamily(m.cableType||guessCableType(m,m))
        const badge=showCabo?`<div style="position:absolute;top:-6px;right:-7px;min-width:13px;height:13px;padding:0 1px;border-radius:7px;background:${f.cor};color:#fff;font-size:8.5px;font-weight:800;line-height:13px;text-align:center;border:1.5px solid #fff;font-family:'DM Sans',sans-serif">${f.L}</div>`:''
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:24px;height:24px">${pinShapeSVG({mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||st.c,label:String(m.n??''),size:24})}${badge}</div>`}).join('')
      return `<div class="ex-sec"><h2>Planta de Pontos</h2><div class="ex-plant" style="position:relative;display:inline-block;max-width:100%"><img src="${bgImage}" style="max-width:100%;display:block;border:1px solid #D1E6F8;border-radius:6px"/>${dots}</div>${showLegenda?legendaMestreHtml:""}</div>`
    }
    return ''
  })()}

  ${(()=>{ if(isObra||_eletr) return ''
    const NIV={piso:'chão',baixa:'0,30 m',media:'1,10 m',alta:'1,80 m',teto:'teto'}
    const LOC={teto:'Teto',chao:'Piso',parede:'Parede'}
    const byRoom={}
    markers.filter(m=>!isRackItem(m.name,m.code)&&!hideCats.has(equipType(m.name))).forEach(m=>{ const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
    const rooms=Object.entries(byRoom)
    if(!rooms.length) return ''
    const th='style="text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700"'
    const td='style="font-size:11px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B"'
    const simb=(m)=>{ const pino=pinShapeSVG({mount:mountOf(m),alt:alturaOf(m),color:catColorOf(m)||'#64748B',label:String(m.n??''),size:24}); const fam=cableFamily(m.cableType||guessCableType(m,m))
      return `<span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;width:24px;height:24px">${pino}</span><span style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:4px;background:${fam.cor};color:#fff;font-size:8.5px;font-weight:800;border:1px solid #fff" title="${fam.nome}">${fam.L}</span></span>` }
    return `<div class="ex-sec"><h2>Posição e Altura dos Pontos</h2>
      <p style="font-size:10.5px;color:#64748B;margin:-4px 0 10px">Conferência para a obra. Cada ponto com seu símbolo: <b>cor</b> = categoria, <b>forma</b> = local (△ teto, ○ parede, □ chão), <b>tracinho</b> = altura, <b>selo</b> = cabo (E elétrica, R rede, S som).</p>
      ${rooms.map(([amb,ms])=>`
        <div style="font-size:12px;font-weight:700;color:#0369A1;margin:12px 0 4px">${amb} <span style="font-weight:400;color:#94A3B8">· ${ms.length} ${ms.length===1?'ponto':'pontos'}</span></div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th ${th} style="width:70px;text-align:center;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">Ponto</th><th ${th} style="width:70px;text-align:left;font-size:9px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;padding:5px 8px;border-bottom:1.5px solid #CBD5E1;font-weight:700">ID</th><th ${th}>Item</th><th ${th}>Local</th><th ${th}>Altura</th><th ${th}>Sistema</th></tr></thead>
          <tbody>${ms.map(m=>{ const fam=cableFamily(m.cableType||guessCableType(m,m)); return `<tr><td ${td} style="text-align:center;padding:4px 8px;border-bottom:.5px solid #E2E8F0">${simb(m)}</td><td ${td} style="font-family:monospace;font-size:10px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#475569">${m.id||m.code||('#'+m.n)}</td><td ${td}>${m.name||'—'}</td><td ${td}>${LOC[mountOf(m)]||'—'}</td><td ${td} style="font-weight:600;font-size:11px;padding:5px 8px;border-bottom:.5px solid #E2E8F0;color:#1E293B">${NIV[alturaOf(m)]||'—'}</td><td ${td} style="font-weight:600;color:${fam.cor}">${fam.nome}</td></tr>`}).join('')}</tbody>
        </table>`).join('')}
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

    // ── Tabela Automação (Interruptores, Tomadas, Sensores, Hub IR, Módulos) ──
    const tblAutomacao = (d.tabela_automacao||[]).length
      ? T((d.tabela_automacao||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Automação'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.funcao)}</td><td style="font-size:10px">${esc(r.protocolo||'Zigbee')}</td><td style="text-align:center;font-size:10px;font-weight:600">${(()=>{ const m=_findMk(r.id,r.equip); const cx=m?(m.caixaTipo||caixaPadrao(classifyEle(m)?.sym)):''; return cx?esc(cx):'—' })()}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Função','Protocolo','Caixa','Posição/Altura','Obs'])
      : ''

    // ── Tabela Segurança (Câmeras, Sensores de Alarme) ────────────────────────
    const tblSeguranca = (d.tabela_seguranca||[]).length
      ? T((d.tabela_seguranca||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Segurança'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.resolucao||'—')}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px">${esc(r.angulo||'—')}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Resolução','Tipo','Posição','Ângulo','Obs'])
      : ''

    // ── Tabela Som Ambiente ────────────────────────────────────────────────────
    const tblSom = (d.tabela_som||[]).length
      ? T((d.tabela_som||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Sonorização'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.zona)}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.saida_amplif)}</td><td style="font-size:10px">${esc(r.cabo)}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Zona','Tipo','Saída Amplif.','Cabo','Obs'])
      : ''

    // ── Tabela Devices no Teto (APs, Câmeras, Caixas de Som, Sensores) ────────
    const tblTeto = (d.tabela_teto||[]).length
      ? T((d.tabela_teto||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor(r.categoria||'Redes'),_findMk(r.id,r.equip))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.instalacao)}</td><td style="font-family:monospace;font-size:10px">${esc(r.origem)}</td><td style="font-size:10px">${esc(r.cabo)}</td><td style="font-size:10px">${esc(r.metros)}m</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Posição Teto','Vem de / Origem','Cabo','m','Obs'])
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
        return `<tr>${pinCell(m.id,m.code,m.n)}<td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td><td>${esc(m.name)}</td><td style="font-size:11px">${esc(m.room||'—')}</td><td style="font-size:11px">${esc(classifyEle(m)?.tipo||'—')}</td><td style="text-align:right">${mt!=null?mt+'m':'—'}</td><td style="font-size:10px;color:#D97706">${esc(m.note||'')}</td></tr>` }).join(''),
        ['Nº','ID','Item','Cômodo','Tipo','Cabo','Obs'])}
    ` : ''
    const plantaTeto = (bgImage && tetoMarkers.length) ? (() => {
      const ratio=imgRatio||0.66
      const dots=tetoMarkers.map(m=>{
        const color=(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c
        const badgeFam=showCabo?cableFamily(m.cableType||guessCableType(m,m)):null
        return drawPin({...m,mount:'teto'},{size:20,color,idLabel:showIdsPdf?esc(m.id||m.code||''):'',badgeFam})
      }).join('')
      const cabosLinha=(cables||[]).filter(c=>!c.free&&tetoMarkers.some(m=>m.uid===c.fromUid||m.uid===c.toUid)).map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''; return `<path d="${pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')}" fill="none" stroke="${c.color||'#0891B2'}" stroke-dasharray="4,2.5" vector-effect="non-scaling-stroke" style="stroke-width:2px"/>`}).join('')
      return `<div class="ex-sec ex-breakable"><h2>Planta — Itens no Teto</h2>
        <p class="ex-p" style="margin-bottom:8px">Pontos aéreos (teto/forro): câmeras, access points, sensores, luzes, som embutido e pontos elétricos de teto. Cabos em tracejado passam pelo forro.</p>
        <div class="ex-plant" style="border:1px solid #CBD5E1;border-radius:8px;overflow:hidden">
          <img src="${bgImage}" style="filter:grayscale(0.4)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${cabosLinha}</svg>${dots}
        </div>${tblTetoSec}</div>`
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
        if(t==='conduite_eletrica'||t==='eletrica') return 'Elétrica'
        if(t==='som') return 'Som'
        if(t==='conduite_dados'||t==='dados'||t==='ap'||t==='camera'||t==='uplink'||t==='hdmi'||t==='fibra') return 'Dados'
        return 'Dados'
      }
      const famColor = { 'Elétrica':'#EAB308','Som':'#BE185D','Dados':'#1E3A8A' }
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
        // só marca os itens que têm cabos dentro dos conduítes desta família
        const chavesNestaFam = new Set(conduites.map(c=>chaveConduite(c)))
        // usa match amplo (todas as variantes de chave)
        const cabosNaFam = cabosNoConduite.filter(c=>conduites.some(cond=>
          c.conduite===chaveConduite(cond)||c.conduite===cond.id||c.conduite===(cond.label||'').trim()||(cond._chave&&c.conduite===cond._chave)
        ))
        const uidsNaFam = new Set(); cabosNaFam.forEach(c=>{uidsNaFam.add(c.fromUid);uidsNaFam.add(c.toUid)})
        // pins de itens: só quem tem cabo nesta família de conduítes
        const itemDots = markers.filter(m=>uidsNaFam.has(m.uid)||isRackItem(m.name,m.code)).map(m=>{
          const isR=isRackItem(m.name||'',m.code||'')
          if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
            <div style="width:16px;height:16px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
          </div>`
          return drawPin(m,{size:16,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c})
        }).join('')
        // caixas
        const caixaDots = caixasConduite.map(m=>`
          <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
            <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
            ${m.n?`<div style="position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:6.5px;color:#1E3A8A;white-space:nowrap">#${m.n}</div>`:''}
          </div>`).join('')
        // só linhas dos conduítes livres (sem os cabos normais)
        const lines = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          const col = c.color||CABLE_PALETTE[c.type]||corLinha
          const dashP=({teto:'',piso:'4,2',parede:'2,2'})[c.passagem||'parede']
          return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" ${dashP?`stroke-dasharray="${dashP}"`:''} style="stroke-width:5px" vector-effect="non-scaling-stroke"/>`}).join('')
        const condLabels = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          const idLabel=c.conduiteId||(c.label?c.label.slice(0,8):''); if(!idLabel)return''
          const mid=pts[Math.floor(pts.length/2)]
          return `<div style="position:absolute;left:${mid.x}%;top:${mid.y}%;transform:translate(-50%,-50%);z-index:5;background:${c.color||col};color:#fff;font-size:9px;font-weight:800;font-family:monospace;padding:1px 5px;border-radius:7px;border:1px solid #fff;white-space:nowrap">${esc(idLabel)}</div>`}).join('')
        return `<div style="position:relative;width:100%;padding-bottom:${(ratio*100).toFixed(1)}%;border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;margin-top:8px">
          <img src="${bgImage}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:grayscale(0.4)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${lines}</svg>${itemDots}${caixaDots}${condLabels}
        </div>`
      }
      // ── TABELA por conduíte: lista os cabos dentro ──
      const tabela = conduites => {
        if(!conduites.length) return ''
        const rows = conduites.map(cond=>{
          const chave = chaveConduite(cond)
          const cabos = cabosDoConduite(cond)
          const mt = cableMeters(cond); const mtTxt = mt?Math.round(mt)+'m':'—'
          const n = cabos.length
          const bitola = n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"'
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
            <td style="text-align:center;vertical-align:top;font-weight:700">${n>0?bitola:'—'}</td>
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
          const sp=CABLE_SPEC[c.type]||{spec:'3×2,5mm²'}
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
        const allDots = markers.filter(m=>!hideCats.has(equipType(m.name))).map(m=>{
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
          const badgeFam=showCabo?cableFamily(m.cableType||guessCableType(m,m)):null
          return drawPin(m,{size:18,color,idLabel,badgeFam})
        }).join('')
        return `<div class="ex-plant">
          <img src="${bgImage}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>${allDots}
        </div>${showLegenda?legendaMestreHtml:''}`
      })() : ''

      // ── planta de CABOS de uma família (só itens dessa família + rack) ──
      const pagePlantaCabos = (t, arr, col)=>{
        if(!bgImage) return ''
        const condW = 2.4
        const uids = new Set(); arr.forEach(c=>{ uids.add(c.fromUid); uids.add(c.toUid) })
        // só itens da família + rack (não todos os itens da planta)
        const dots = markers.filter(m=> uids.has(m.uid) && (isRackItem(m.name,m.code) || isItemDaFamilia(m,t) || uids.has(m.uid))).map(m=>{
          const isR=isRackItem(m.name||'',m.code||'')
          if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
            <div style="width:20px;height:20px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
            ${showIdsPdf?`<div style="position:absolute;left:50%;top:22px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:8px;white-space:nowrap;font-family:monospace;font-weight:600">${esc(m.id||m.code||m.name||'')}</div>`:''}
          </div>`
          return drawPin(m,{size:20,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c,idLabel:showIdsPdf?esc(m.id||m.code||m.name||''):''})
        }).join('')
        const lines = arr.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:${condW}px" vector-effect="non-scaling-stroke"/>` }).join('')
        return `<div class="ex-plant">
          <img src="${bgImage}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${lines}</svg>${dots}
        </div>`
      }

      // ── planta de CONDUÍTES de uma família ──
      const pagePlantaConduites = (conduites, col)=>{
        if(!bgImage || !conduites.length) return ''
        const cabosNaoCond = (cables||[]).filter(c=>!c.free && c.conduite && conduites.some(cond=>
          c.conduite===(cond.conduiteId||(cond.label||'').trim()||cond.id)||c.conduite===cond.id||(cond._chave&&c.conduite===cond._chave)
        ))
        const uidsNaFam = new Set(); cabosNaoCond.forEach(c=>{uidsNaFam.add(c.fromUid);uidsNaFam.add(c.toUid)})
        const dots = markers.filter(m=>uidsNaFam.has(m.uid)||isRackItem(m.name,m.code)).map(m=>{
          const isR=isRackItem(m.name||'',m.code||'')
          if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
            <div style="width:18px;height:18px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
          </div>`
          return drawPin(m,{size:18,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c})
        }).join('')
        const caixaDots = markers.filter(m=>classifyEle(m)?.sym==='caixa_conduite').map(m=>`
          <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
            <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
          </div>`).join('')
        const lines = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          const dashP=({teto:'',piso:'4,2',parede:'2,2'})[c.passagem||'parede']
          return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" ${dashP?`stroke-dasharray="${dashP}"`:''} style="stroke-width:5px" vector-effect="non-scaling-stroke"/>`}).join('')
        const condLabels = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          const idLabel=c.conduiteId||(c.label||'').slice(0,6)||''; if(!idLabel)return''
          const mid=pts[Math.floor(pts.length/2)]
          return `<div style="position:absolute;left:${mid.x}%;top:${mid.y}%;transform:translate(-50%,-50%);z-index:5;background:${c.color||col};color:#fff;font-size:9px;font-weight:800;font-family:monospace;padding:1px 5px;border-radius:7px;border:1px solid #fff;white-space:nowrap">${esc(idLabel)}</div>`}).join('')
        return `<div class="ex-plant">
          <img src="${bgImage}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px;filter:grayscale(0.3)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${lines}</svg>${dots}${caixaDots}${condLabels}
        </div>`
      }

      // ── planta COMPLETA (cabos + conduítes sobrepostos) ──
      const pagePlantaCompleta = (cabos, conduites, col, catFiltro)=>{
        if(!bgImage) return ''
        const uids = new Set(); cabos.forEach(c=>{uids.add(c.fromUid);uids.add(c.toUid)})
        const dots = markers.filter(m=>isRackItem(m.name,m.code)||(uids.has(m.uid)&&(!catFiltro||equipType(m.name)===catFiltro))).map(m=>{
          const isR=isRackItem(m.name||'',m.code||'')
          if(isR) return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
            <div style="width:20px;height:20px;border-radius:5px;background:#4C1D95;color:#C4B5FD;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7C3AED">R</div>
            ${showIdsPdf?`<div style="position:absolute;left:50%;top:22px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:8px;white-space:nowrap;font-family:monospace;font-weight:600">${esc(m.id||m.code||m.name||'')}</div>`:''}
          </div>`
          const badgeFam=showCabo?cableFamily(m.cableType||guessCableType(m,m)):null
          return drawPin(m,{size:20,color:(EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro).c,idLabel:showIdsPdf?esc(m.id||m.code||m.name||''):'',badgeFam})
        }).join('')
        const caixaDots = markers.filter(m=>classifyEle(m)?.sym==='caixa_conduite').map(m=>`
          <div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:4">
            <div style="width:16px;height:16px;background:#fff;border:2px solid #1E3A8A;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1E3A8A">CX</div>
          </div>`).join('')
        const linesCabos = cabos.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:2px;opacity:0.8" vector-effect="non-scaling-stroke"/>`}).join('')
        const linesCond = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${c.color||col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:5px;opacity:0.5" vector-effect="non-scaling-stroke"/>`}).join('')
        const condLabelsC = conduites.map(c=>{ const pts=cablePolyPoints(c); if(pts.length<2)return''
          const idLabel=c.conduiteId||(c.label||'').slice(0,6)||''; if(!idLabel)return''
          const mid=pts[Math.floor(pts.length/2)]
          return `<div style="position:absolute;left:${mid.x}%;top:${mid.y}%;transform:translate(-50%,-50%);z-index:5;background:${c.color||col};color:#fff;font-size:8.5px;font-weight:800;font-family:monospace;padding:1px 4px;border-radius:6px;border:1px solid #fff;white-space:nowrap;opacity:0.85">${esc(idLabel)}</div>`}).join('')
        return `<div class="ex-plant">
          <img src="${bgImage}" style="width:100%;display:block;border:1px solid #ccc;border-radius:6px"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${linesCabos}${linesCond}</svg>${dots}${caixaDots}${condLabelsC}
        </div>`
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
            <td style="text-align:right;font-weight:700">${mt!=null?mt+'m':'—'}</td>
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
          const n=cabosD.length, bitola=n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"'
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

        return `<div class="ex-obra-page" style="page-break-before:${idx===0?'auto':'always'}">
          <div style="break-inside:avoid;page-break-inside:avoid">
          <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid ${col};padding-bottom:8px;margin-bottom:10px;break-after:avoid;page-break-after:avoid">
            <div style="width:30px;height:30px;border-radius:8px;background:${col};display:flex;align-items:center;justify-content:center"><span style="width:18px;height:4px;background:#fff;border-radius:2px"></span></div>
            <div><div style="font-size:20px;font-weight:800;color:#0D1420">${lb}</div>
            <div style="font-size:12px;color:#64748B">${arr.length} cabo(s) · ${sp.spec} · ${sp.conector}${totM>0?` · total ~${Math.round(totM)}m`:''}${conduitesFamilia.length?` · ${conduitesFamilia.length} conduíte(s)`:''}</div></div>
          </div>
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
          const n=cabosD.length, bitola=n<=6?'3/4"':n<=10?'1"':n<=16?'1.1/4"':'1.1/2"'
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
      const obraPosAlt = (()=>{ const byRoom={}
        markers.filter(m=>!isRackItem(m.name,m.code)).forEach(m=>{ const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
        const rooms=Object.entries(byRoom); if(!rooms.length) return ''
        return `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Posição e Altura dos Pontos</h2>
          <p class="ex-p" style="color:#6B7280">Onde cada ponto é instalado e em que altura. Cor = categoria, forma = local (△ teto, ○ parede, □ chão), selo = cabo.</p>`+
          rooms.map(([amb,ms])=>`<h3 class="ex-amb">${esc(amb)} · ${ms.length} ${ms.length===1?'ponto':'pontos'}</h3>`+
            T(ms.map(m=>`<tr><td style="text-align:center">${pin(m.n,undefined,m)}</td><td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||('#'+m.n))}</b></td><td>${esc(m.name||'')}</td><td>${LOCL[mountOf(m)]||'—'}</td><td style="font-weight:700">${NIVL[alturaOf(m)]||'—'}</td></tr>`).join(''),['Ponto','ID','Item','Local','Altura'])).join('')+`</div>`
      })()
      const obraListaEle = (()=>{ const els=markers.filter(isPontoEletrico); if(!els.length) return ''
        return `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Pontos Elétricos — Caixas e Alturas</h2>
          <p class="ex-p" style="color:#6B7280">Qual caixa embutir e em que altura, por ponto. A planta com símbolos NBR está no documento Planta Elétrica (A3).</p>`+
          T(els.map(m=>{ const cls=classifyEle(m); const cx=m.caixaTipo||caixaPadrao(cls.sym)||'—'
            return `<tr><td style="text-align:center">${pin(m.n,undefined,m)}</td><td style="font-family:monospace;font-size:10px"><b>${esc(m.id||m.code||'')}</b></td><td>${esc(cls.tipo)}</td><td>${esc(m.room||'—')}</td><td style="text-align:center;font-weight:700">${esc(cx)}</td><td style="font-weight:700">${NIVL[alturaOf(m)]||'—'}</td></tr>`}).join(''),['Nº','ID','Tipo','Cômodo','Caixa','Altura'])+`</div>`
      })()
      const obraQuant = (()=>{
        const caixas={}; markers.filter(isPontoEletrico).forEach(m=>{ const cx=m.caixaTipo||caixaPadrao(classifyEle(m).sym); if(cx) caixas[cx]=(caixas[cx]||0)+1 })
        const fams={}; cablesUnificados(cables,markers).filter(c=>!c.free).forEach(c=>{ const f=cableFamily(c.type||'dados'); const mt=cableMeters(c)||0; fams[f.nome]=(fams[f.nome]||0)+mt })
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
      // ── Decisão 5: checklists e alimentação dos keypads migram do Executivo pra cá ──
      const obraChecklists = `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Checklists de Obra e Instalação</h2>
        <h3 class="ex-amb">Checklist de Obra — Arquiteto / Eletricista</h3>${list(d.checklist_obra)}
        <h3 class="ex-amb" style="margin-top:16px">Checklist de Instalação — Equipe RARO Home</h3>${list(d.checklist_raro)}</div>`
      const obraAlim = (d.alim_keypads||[]).length ? `<div class="ex-obra-page" style="page-break-before:always"><h2 style="border-bottom:3px solid #0D1420;padding-bottom:8px">Alimentação dos Keypads (Fase + Neutro)</h2>`+
        T(d.alim_keypads.map(r=>`<tr>${pinCell(r.destino,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">${esc(r.fios||'2x1,5mm²')}</td></tr>`).join(''),['Nº','ID','Origem','Destino (Keypad)','Altura','Cômodo','m','Fios'])+`</div>` : ''
      const obraSections = [
        `<div class="ex-sec" style="border:none"><h2 style="border:none;margin-bottom:4px">Plano de Obra</h2>
          <p class="ex-p" style="color:#6B7280">Para impressão em A3. Cada tópico tem: planta dos cabos + tabela, planta dos conduítes + tabela, e visão completa sobreposta.</p>
          ${showLegenda?legendaMestreHtml:''}</div>`,
        obraPosAlt,
        obraListaEle,
        obraQuant,
        ...(categoriaPaginas.length?categoriaPaginas:[`<p class="ex-p" style="color:#B45309">⚠ Nenhum cabo desenhado na planta. Use o modo "Cabos" no editor.</p>`]),
        paginaRestantes,
        plantaTeto ? `<div class="ex-obra-page" style="page-break-before:always">${plantaTeto.replace('<div class="ex-sec ex-breakable">','<div>')}</div>` : '',
        obraAlim,
        obraChecklists,
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
    const cap = t => `<div class="ex-sec ex-breakable" style="page-break-before:always"><h2 style="border-bottom:3px solid ${TH.rule};padding-bottom:8px;margin-bottom:12px">${_capNum(++_cap)}${t}</h2>`

    // ── gera os conteúdos de Obra e Conduítes inline (sem duplicação) ──
    let obraInline = '', conduitesInline = ''
    try {
      const obraFull = buildExecHtml(d,'obra')
      const condFull = buildExecHtml(d,'conduites')
      const extrair = html => { const i=html.indexOf('<div class="ex-obra-page"'); const j=html.lastIndexOf('</div>'); return (i>=0)?html.slice(i, j):'' }
      obraInline = extrair(obraFull)
      conduitesInline = extrair(condFull)
    } catch(e){ console.warn('inline obra/cond:',e) }

    return [
    // 1. PREMISSAS — o que o projeto entrega
    d.premissas?.length ? cap('Premissas e Escopo do Projeto') + list(d.premissas) + '</div>' : '',

    // 2-4. SISTEMAS na ordem do valor percebido pelo contratante
    (tblAutomacao||pontosHtml) ? cap('Automação — Interruptores, Keypads e Módulos') + (tblAutomacao||pontosHtml) + '</div>' : '',
    tblSom ? cap('Som Ambiente — Zonas e Caixas') + tblSom + '</div>' : '',
    tblSeguranca ? cap('Segurança — Câmeras e Sensores') + tblSeguranca + '</div>' : '',

    // 5. REDE / RACK
    hasRack && (d.rack_detalhe||rackItems.length) ? cap('Rack / CPD — Equipamentos e Portas') + (list(d.rack_detalhe)+(rackEquipTable?`<h3 class="ex-amb">Equipamentos do Rack</h3>${rackEquipTable}`:'')+rackVisual+(rackCableTableHtml?`<h3 class="ex-amb" style="margin-top:20px">Tabela de Portas — Cabos de Rede</h3>${rackCableTableHtml}`:'')) + '</div>' : '',

    // 6. PLANTA ELÉTRICA (NBR) e MAPA WI-FI
    buildPlantaEletrica(()=>_capNum(++_cap)),
    (()=>{ const aps=markers.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
      return (showHeatmap && aps.length) ? (()=>{_cap++; return buildHeatmap(()=>_capNum(_cap))})() : '' })(),

    // 6. TETO
    plantaTeto ? cap('Planta de Teto — Itens sobre Forro e Laje') + plantaTeto.replace('<div class="ex-sec ex-breakable"><h2>Planta — Itens no Teto</h2>','') + '</div>' : '',

    // 7. INFRA: conduítes aqui; o detalhamento de cabeamento vive no Plano de Obra (anexo), sem duplicar
    (conduitesInline && !hidePdfConduites) ? cap('Cabeamento e Conduítes') + `<p class="ex-p" style="margin-bottom:10px">Detalhamento de cada conduíte com cabos dentro, bitola estimada e percurso. As plantas de cabeamento por família (Dados, Som, Elétrica), com tabelas de execução, estão no <b>Plano de Obra</b>, anexo deste documento.</p>` + conduitesInline + '</div>' : `<div class="ex-sec ex-breakable" style="page-break-before:always"><h2 style="border-bottom:3px solid ${TH.rule};padding-bottom:8px;margin-bottom:12px">${_capNum(++_cap)}Cabeamento e Conduítes</h2><p class="ex-p">As plantas de cabeamento por família (Dados, Som, Elétrica), com tabelas de execução, estão no <b>Plano de Obra</b>, anexo deste documento.</p></div>`,

    // 8. EQUIPAMENTOS E PEÇAS
    cap('Equipamentos por Cômodo e Lista de Peças') +
    (itensComodoHtml ? itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml : '') +
    ((d.pecas||[]).length?'<h3 class="ex-amb" style="margin-top:16px">Lista Completa de Peças</h3>' + T(d.pecas.map(r=>`<tr><td>${esc(r.item)}</td><td style="text-align:center"><b>${esc(r.qtd)}</b></td></tr>`).join(''),['Item','Qtd']):'') + '</div>',

    // 9. GRÁFICOS E GESTÃO
    cap('Gráficos e Gestão do Projeto') + (grafico1 + grafico2 + grafico3 + grafico4) +
    (gestaoTxt ? '<h3 class="ex-amb" style="margin-top:18px">Gestão e Controle</h3>' + gestaoTxt : '') + '</div>',

    // 10. OBSERVAÇÕES E FOTOS
    (tblObservacoes||fotosTxt) ? cap('Observações e Fotos') +
    (tblObservacoes ? '<h3 class="ex-amb">Observações dos Pontos</h3>' + tblObservacoes : '') +
    (fotosTxt ? '<h3 class="ex-amb" style="margin-top:16px">Fotos no Diário de Obra</h3>' + fotosTxt : '') + '</div>' : '',



  ].filter(Boolean).join('\n') })()}
</div>`
  }

  function buildFullHtml(){
    const cliNome=(projectInfo.client||fromProposal?.client_name||'Cliente').replace(/[\\/:*?"<>|]/g,'')
    const codigo=(fromProposal?.code||'').replace(/[\\/:*?"<>|]/g,'')
    const nomeDoc = execMode==='obra' ? 'Plano de Obra' : execMode==='eletrica' ? 'Planta Elétrica' : execMode==='conduites' ? 'Conduites' : 'Projeto Executivo'
    const tituloPdf=`${nomeDoc} — RARO Home — ${cliNome}${codigo?' — '+codigo:''}`
    const _fresh = m => { if(!execData) return null; try{ return buildExecHtml(execData, m) }catch(e){ console.warn('rebuild export falhou:',e.message); return null } }
    const _full=_fresh('completo')||execDoc, _obra=_fresh('obra')||execDocObra,
          _ele=_fresh('eletrica')||execDocEletrica, _cond=_fresh('conduites')||execDocConduites
    const _plantSizeCss = plantPct!==100 ? ` .ex-plant img{max-width:${plantPct}%!important}` : ''
    let body, pageCss
    if(execMode==='completo'){
      pageCss='@page{size:A4;margin:12mm} .ex-plant img{max-height:250mm!important} @media print{.ex-doc-cover{margin:-12mm -12mm 0}}'+_plantSizeCss
      const quebraPag='<div style="break-before:page;page-break-before:always;height:0;margin:0;border:0"></div>'
      body = (_full||'') + (_obra ? quebraPag+_obra : '') + (_ele ? quebraPag+_ele : '')
    } else {
      const _isA3=(execMode==='obra'||execMode==='eletrica'||execMode==='conduites')
      pageCss = (_isA3 ? '@page{size:A3 landscape;margin:10mm} .ex-plant img{max-height:245mm!important}' : '@page{size:A4;margin:12mm} .ex-plant img{max-height:250mm!important}')+_plantSizeCss
      body = (execMode==='obra'?_obra:execMode==='eletrica'?_ele:execMode==='conduites'?_cond:_full)||''
    }
    const fontLink='<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,600;1,500&display=swap" rel="stylesheet">'
    const fluido='<style>.ex-sec,.ex-sec.ex-breakable,.ex-obra-page,.ex-doc-cover,.ex-cover{page-break-before:auto!important;page-break-inside:auto!important;break-before:auto!important;break-inside:auto!important;min-height:0!important}.ex-doc-cover,.ex-cover{margin:0!important}</style>'
    return `<html><head><title>${tituloPdf}</title><meta charset="utf-8">${fontLink}
      <style>${pageCss} body{margin:0}${execVersao==='fable'?EXEC_CSS_FABLE:execVersao==='nova'?EXEC_CSS_PREMIUM:EXEC_CSS}</style>${fluido}</head><body>
      ${body}
      </body></html>`
  }
  async function exportPdf(){
    const w=window.open('','_blank')
    if(!w){ alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.'); return }
    w.document.write(buildFullHtml())
    w.document.close(); setTimeout(()=>w.print(),700)
  }
  // preview ao vivo: regenera o HTML quando qualquer opção muda (só enquanto o painel está aberto)
  const pdfPreviewHtml = useMemo(()=> showPdfOpts ? buildFullHtml() : '',
    [showPdfOpts, showLegenda, showIdsPdf, pageOrient, plantPct, hideFams, hideCats, hidePdfConduites, execMode, execData, execVersao, rotBg, bgImage, markers, cables]) // eslint-disable-line

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
        const updated = { ...fromProposal, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, exec_doc_conduites:execDocConduites, planta_data:{image:bgImage,markers,cables,scale:plantScale,calibSamples,imgRatio,folgaPct,exec_data:execData}, exec_api_cost:apiCost }
        await saveProposal(updated)
        alert(`✅ Salvo no orçamento! A página vai atualizar.`)
        onClose && onClose()
        setTimeout(()=>{ try{ window.location.reload() }catch{} }, 200)  // item 5: refresh automático
        return
      }catch(e){ alert('Erro ao salvar: '+e.message); return }
    }
    if(onSaveToProposal) onSaveToProposal({ floors, planta_data:{image:bgImage,markers,cables,scale:plantScale,calibSamples,imgRatio,folgaPct,exec_data:execData}, client_name:projectInfo.client||selClient, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, exec_doc_conduites:execDocConduites, exec_api_cost:apiCost })
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
                <button disabled={rooms.length===0||loading} onClick={()=>{ setStep('chat'); startChat(bgImage, rooms) }}
                  style={{...btnPrimary,width:'100%',justifyContent:'center',gap:8,opacity:rooms.length===0?0.4:1}}>
                  <i className="ti ti-message-2" aria-hidden/>
                  Confirmar e ir para as perguntas ({rooms.length} cômodo{rooms.length!==1?'s':''})
                </button>
                <button onClick={()=>setStep('editor')} disabled={loading}
                  style={{...btnGhost,width:'100%',justifyContent:'center',marginTop:6,gap:6,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1'}}>
                  <i className="ti ti-hand-finger" aria-hidden/>Pular IA — editar na mão
                </button>
                <button onClick={()=>startRooms(bgImage)} disabled={loading}
                  style={{...btnGhost,width:'100%',justifyContent:'center',marginTop:6,fontSize:11}}>
                  <i className="ti ti-refresh" aria-hidden/>Reanalisar planta
                </button>
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
                {/* Atalhos elétricos — adicionar tomada/interruptor/luz com altura já definida */}
                <div style={{padding:'8px 10px',background:'#0a1020',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:.5,fontWeight:700,marginBottom:6}}>⚡ Atalhos: um clique posiciona com a altura padrão (ajustável depois)</div>
                  {[
                    {cat:'Tomadas', cor:'#F59E0B', itens:[
                      {label:'Baixa',sub:'0,30m',eleType:'tomada_baixa',name:'Tomada baixa',note:'H=0,30m'},
                      {label:'Média',sub:'1,30m',eleType:'tomada_alta',name:'Tomada média',note:'H=1,30m (bancada)'},
                      {label:'Alta',sub:'2,00m',eleType:'tomada_alta',name:'Tomada alta',note:'H=2,00m'},
                      {label:'Piso',sub:'caixa de piso',eleType:'tomada_piso',name:'Tomada de piso',note:'caixa de piso'},
                      {label:'Teto',sub:'projetor/AP',eleType:'tomada_teto',name:'Tomada de teto',note:'teto (projetor/AP)'},
                      {label:'Módulo cabeceira',sub:'tom+int+2 USB',eleType:'modulo_cabeceira',name:'Módulo de cabeceira (tomada + interruptor + 2 USB)',note:'cabeceira da cama'},
                    ]},
                    {cat:'Rede / Dados', cor:'#0EA5E9', itens:[
                      {label:'Keystone teto',sub:'CAT6',eleType:'keystone_teto',name:'Keystone de teto',note:'teto'},
                    ]},
                    {cat:'Interruptores', cor:'#16A34A', itens:[
                      {label:'Simples',sub:'1,10m',eleType:'interruptor_simples',name:'Interruptor simples',note:'H=1,10m'},
                      {label:'Paralelo',sub:'1,10m',eleType:'interruptor_paralelo',name:'Interruptor paralelo',note:'H=1,10m'},
                    ]},
                    {cat:'Iluminação', cor:'#CA8A04', itens:[
                      {label:'Ponto de luz',sub:'teto',eleType:'ponto_luz',name:'Ponto de luz (teto)',note:'teto'},
                      {label:'Arandela parede',sub:'2,20m',eleType:'arandela',name:'Arandela de parede',note:'H=2,20m'},
                      {label:'Arandela teto',sub:'teto',eleType:'arandela_teto',name:'Arandela de teto',note:'teto'},
                    ]},
                    {cat:'Som', cor:'#7C3AED', itens:[
                      {label:'Som teto',sub:'cabo 2×1,5',eleType:'ponto_som_teto',name:'Ponto de som (teto)',note:'teto (caixa embutida)'},
                    ]},
                    {cat:'Infraestrutura', cor:'#6B7280', itens:[
                      {label:'Quadro QDL',sub:'1,50m',eleType:'quadro',name:'Quadro de luz QDL',note:'H=1,50m'},
                      {label:'Prumada ↕',sub:'entre andares',eleType:'prumada',name:'Prumada (subida/descida entre andares)',note:'shaft/laje'},
                      {label:'Caixa conduíte',sub:'passagem',eleType:'caixa_conduite',name:'Caixa de conduíte',note:'caixa 4×4 passagem'},
                    ]},
                  ].map(g=>(
                    <div key={g.cat} style={{marginBottom:7}}>
                      <div style={{fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:g.cor,marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:g.cor,display:'inline-block'}}/>{g.cat}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {g.itens.map(b=>{
                          const active = addMode && addItem?.eleType===b.eleType && addItem?.name===b.name
                          return <button key={b.label} onClick={()=>{ setAddItem({code:'',name:b.name,note:b.note,eleType:b.eleType,category:'Automação'}); setAddMode(true) }}
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
                  ))}
                </div>
                {/* Busca + filtros de categoria — sticky */}
                <div style={{padding:'8px 10px',background:'#0a1020',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
                  <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Buscar no catálogo..."
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
                <button onClick={undo} disabled={!history.length} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:history.length?'#fff':'rgba(255,255,255,0.3)',cursor:history.length?'pointer':'default',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Desfazer (Ctrl+Z)">
                  <i className="ti ti-arrow-back-up" aria-hidden/>Desfazer
                </button>
                <button onClick={limparItens} style={{height:32,borderRadius:6,border:'1px solid #DC262688',background:'rgba(220,38,38,0.12)',color:'#FCA5A5',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Remover todos os itens">
                  <i className="ti ti-eraser" aria-hidden/>Limpar
                </button>
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
                <button onClick={e=>{e.stopPropagation();bgOnlyRef.current?.click()}} style={{height:32,borderRadius:6,border:'none',background:'#0EA5E9',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}><i className="ti ti-upload" aria-hidden/>{bgImage?'Trocar planta':'Carregar planta'}</button>
                <input ref={bgOnlyRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleBgOnly}/>
                <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>−</button>
                <span style={{color:'#fff',fontSize:11,display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>Math.min(3,z+0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>+</button>
              </div>
              <div ref={containerRef} style={{position:'relative',display:'block',margin:'0 auto',cursor:addMode?'crosshair':'default',width:bgImage?`${zoom*100}%`:`${Math.min(640*zoom,window.innerWidth*0.82)}px`,transformOrigin:'top center'}} onClick={onCanvasClick}>
                {bgImage ? <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false} onLoad={e=>{const im=e.target; if(im.naturalWidth)setImgRatio(im.naturalHeight/im.naturalWidth)}}/>
                  : <div style={{width:'100%',aspectRatio:'4/3',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px)',backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:10,position:'relative'}}>
                      <div style={{position:'absolute',top:10,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.45)',pointerEvents:'none'}}>Pontos posicionados — arraste para ajustar, ou carregue a planta.</div>
                    </div>}
                {/* ── Camada de CABOS (planta elétrica) ── */}
                {<svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:4,overflow:'visible'}} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {cables.map(c=>{
                    // conduítes livres: respeitam hideConduites; em modo edição, oculta TODOS exceto o selecionado
                    if(c.free && (hideConduites || (conduitEditMode && c.id!==selCable))) return null
                    if(!c.free && hideCables) return null
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
                        onMouseDown={e=>{e.stopPropagation(); setDragPoint({cableId:c.id,idx})}}
                        onTouchStart={e=>{e.stopPropagation(); setDragPoint({cableId:c.id,idx})}}
                        onDoubleClick={e=>{e.stopPropagation(); removeCablePoint(c.id,idx)}}
                        title="Arraste para curvar · duplo-clique remove ponto"
                        style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',zIndex:15,touchAction:'none',
                          width:c.free?16:18,height:c.free?16:18,borderRadius:c.free?3:'50%',background:'#fff',border:`3px solid ${c.color}`,cursor:'move',boxShadow:'0 1px 4px rgba(0,0,0,0.6)'}}/>
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
                  const isRack = isRackItem(m.name||'', m.code||'')
                  const _ele = classifyEle(m)
                  const isCaixaCond = _ele?.sym==='caixa_conduite'
                  const isQuadro = _ele?.sym==='quadro' || _ele?.sym==='prumada' || isCaixaCond
                  const visible = ((isRack||isQuadro) ? (matchS&&matchR&&matchI && !(isCaixaCond&&hideCaixas)) : (matchS&&matchR&&matchC&&matchI)) && matchL  // filtro de nível vale para todos
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
                      : (()=>{ const mount=mountOf(m); const fam=cableFamily(m.cableType||guessCableType(m,m))
                          return <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <div dangerouslySetInnerHTML={{__html: pinShapeSVG({mount, alt:alturaOf(m), color:catColorOf(m)||st.c, label:String(m.n??''), size:sel?26:22, sel})}}/>
                            {showCabo && <div title={`Cabo: ${fam.nome}`} style={{position:'absolute',top:-7,right:-9,minWidth:12,height:12,padding:'0 1px',borderRadius:6,background:fam.cor,color:'#fff',fontSize:8,fontWeight:800,lineHeight:'12px',textAlign:'center',border:'1.5px solid #fff',pointerEvents:'none',fontFamily:"'DM Sans',sans-serif",boxShadow:'0 1px 2px rgba(0,0,0,0.4)'}}>{fam.L}</div>}
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
                  {[['dados','Dados','#2563EB'],['ap','AP','#F59E0B'],['camera','Câm','#92400E'],['uplink','Uplk','#DC2626'],['hdmi','HDMI','#7C3AED'],['som','Som','#BE185D'],['eletrica','Elét','#16A34A'],['fibra','Fibra','#0D9488'],['conduite_dados','C.DADOS','#1E3A8A'],['conduite_eletrica','C.ELÉT','#EAB308']].map(([t,lb,col])=>(
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
                  <label style={lbl}>Tipo do ponto</label>
                  {(()=>{ const det=classifyEle({...m,eleType:undefined}); const detLabel=det?det.tipo:'não-elétrico (rede/dados/som)'
                    return <select value={m.eleType||'auto'} onChange={e=>{const v=e.target.value; setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,eleType:v==='auto'?undefined:v}:x))}} style={inputDark}>
                    <option value="auto">✨ Automático → {detLabel}</option>
                    <optgroup label="⚡ ELÉTRICA · Tomadas">
                      <option value="tomada_piso">Tomada Piso</option>
                      <option value="tomada_baixa">Tomada Baixa (0,30m)</option>
                      <option value="tomada_media">Tomada Média (1,10m)</option>
                      <option value="tomada_alta">Tomada Alta (1,80m)</option>
                      <option value="tomada_teto">Tomada Teto</option>
                    </optgroup>
                    <optgroup label="⚡ ELÉTRICA · Ponto de energia">
                      <option value="ponto_energia_teto">Ponto Elétrica Teto</option>
                      <option value="ponto_energia_piso">Ponto Elétrica Piso</option>
                      <option value="ponto_energia_parede">Ponto Elétrica Parede</option>
                    </optgroup>
                    <optgroup label="⚡ ELÉTRICA · Interruptores">
                      <option value="interruptor_simples">Interruptor 1</option>
                      <option value="interruptor_paralelo">Interruptor 2</option>
                      <option value="interruptor_intermediario">Interruptor 3</option>
                      <option value="interruptor_4">Interruptor 4</option>
                      <option value="interruptor_6">Interruptor / Keypad 6</option>
                      <option value="modulo_cabeceira">Módulo Cabeceira</option>
                    </optgroup>
                    <optgroup label="🔵 DADOS · selo R">
                      <option value="keystone_alto">Keystone Parede Média</option>
                      <option value="keystone_teto">Keystone Teto</option>
                    </optgroup>
                    <optgroup label="🔊 SOM · selo S">
                      <option value="ponto_som_teto">Ponto de Som Teto</option>
                      <option value="ponto_som_parede">Ponto de Som Parede Alta</option>
                      <option value="ponto_som_piso">Ponto de Som Piso</option>
                    </optgroup>
                    <optgroup label="Infraestrutura">
                      <option value="quadro">Quadro de luz (QDL)</option>
                      <option value="prumada">Prumada (entre andares)</option>
                      <option value="caixa_conduite">Caixa de conduíte</option>
                    </optgroup>
                    <option value="nenhum">— Não é elétrico (rede/dados/som)</option>
                  </select> })()}
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
                  <label style={lbl}>Cabo que chega neste ponto</label>
                  {(()=>{ const det=guessCableType(m,m); const detL=CABLE_LABELS[det]||det
                    return <select value={m.cableType||'auto'} onChange={e=>{const v=e.target.value; setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,cableType:v==='auto'?undefined:v}:x))}} style={{...inputDark,marginBottom:8}}>
                    <option value="auto">✨ Automático → {detL}</option>
                    {Object.entries(CABLE_LABELS).filter(([k])=>k!=='ap'&&k!=='camera').map(([k,v])=><option key={k} value={k}>{k==='dados'?'Dados (rede CAT6)':v} · {CABLE_SPEC[k]?.spec||''}</option>)}
                  </select> })()}
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
                  <button onClick={()=>{setMarkers(ms=>ms.filter(x=>x.uid!==m.uid).map((x,i)=>({...x,n:i+1})));setSelected(null)}} style={{...btnGhost,width:'100%',marginTop:10,color:'#FCA5A5',borderColor:'rgba(220,38,38,0.4)'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                </div>})() : (
                <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Resumo</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8}}>{markers.length} equipamentos posicionados</div>
                  {(filterRooms.size>0||filterCateg.size>0||editorSearch||filterItem)&&<div style={{marginTop:8,fontSize:11,color:'#38BDF8',background:'rgba(56,189,248,0.1)',padding:'6px 8px',borderRadius:5}}>
                    Visíveis: {markers.filter(m=>{const s=editorSearch.toLowerCase();return(!editorSearch||m.name?.toLowerCase().includes(s)||m.code?.toLowerCase().includes(s)||m.room?.toLowerCase().includes(s))&&(filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo'))&&(filterCateg.size===0||filterCateg.has(inferCategory(m.name||'').cat||'Outros'))&&(!filterItem||m.name===filterItem)}).length} / {markers.length}
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
              {[['completo','Completo','ti-file-text'],['obra','Obra','ti-tools'],['eletrica','Elétrica','ti-bolt'],['conduites','Conduítes','ti-route']].map(([m,label,icon])=>{
                const _stored = m==='obra'?execDocObra:m==='eletrica'?execDocEletrica:m==='conduites'?execDocConduites:execDoc
                let doc=_stored
                if(execData){ try{ doc=buildExecHtml(execData, m) }catch(e){ console.warn('re-render preview falhou, usando salvo:',e.message); doc=_stored } }
                if(doc && plantPct!==100) doc = `<style>.ex-plant img{max-width:${plantPct}%!important}.ex-plant{margin-left:auto;margin-right:auto}</style>` + doc
                return (
                <button key={m} onClick={()=>{
                  setExecMode(m)
                  // sempre regenera ao clicar — garante que reflete o estado atual da planta (cabos, conduítes, itens)
                  try{
                    const d=buildExecDataFromMarkers()
                    const full=buildExecHtml(d,'completo'), obra=buildExecHtml(d,'obra')
                    const eletrica=buildExecHtml(d,'eletrica'), conduites=buildExecHtml(d,'conduites')
                    setExecDoc(full); setExecDocObra(obra); setExecDocEletrica(eletrica); setExecDocConduites(conduites)
                  }catch(e){ console.warn('tab-regen:',e) }
                }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,fontSize:12.5,fontWeight:execMode===m?700:500,cursor:'pointer',opacity:doc?1:0.55,
                    border:`1.5px solid ${execMode===m?'#7C3AED':'#CBD5E1'}`,background:execMode===m?'#7C3AED':'#fff',color:execMode===m?'#fff':'#475569'}}>
                  <i className={`ti ${icon}`} aria-hidden/>{label}
                </button>
              )})}
              <span style={{width:1,height:22,background:'#E2E8F0',margin:'0 6px'}}/>
              <span style={{fontSize:12,color:'#475569',fontWeight:600,marginRight:2}}>Estilo:</span>
              {[['nova','Novo'],['antiga','Clássico'],['fable','Fable']].map(([v,label])=>(
                <button key={v} onClick={()=>{
                  setExecVersao(v)
                  try{
                    const d = execData || buildExecDataFromMarkers()
                    setExecDoc(buildExecHtml(d,'completo',v)); setExecDocObra(buildExecHtml(d,'obra',v))
                    setExecDocEletrica(buildExecHtml(d,'eletrica',v)); setExecDocConduites(buildExecHtml(d,'conduites',v))
                  }catch(e){ console.warn('versao-regen:',e) }
                }}
                  style={{padding:'7px 12px',borderRadius:8,fontSize:12.5,fontWeight:execVersao===v?700:500,cursor:'pointer',
                    border:`1.5px solid ${execVersao===v?'#9C7B45':'#CBD5E1'}`,background:execVersao===v?'#9C7B45':'#fff',color:execVersao===v?'#fff':'#475569'}}>
                  {label}
                </button>
              ))}
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
            <div style={{maxWidth:(execMode==='obra'||execMode==='eletrica'||execMode==='conduites')?1180:820,margin:'0 auto',background:'#fff',boxShadow:'0 2px 16px rgba(0,0,0,0.12)',transition:'max-width 0.2s'}}>
              {(()=>{ const cur = execMode==='obra'?execDocObra:execMode==='eletrica'?execDocEletrica:execMode==='conduites'?execDocConduites:execDoc
                const nome = execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':'Completa'
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
              const updated = { ...fromProposal, planta_data:{image:bgImage, markers, cables, scale:plantScale, imgRatio, folgaPct, exec_data:execData} }
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
          <button onClick={generateExecManual} disabled={loading} style={{...btnGhost,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1',gap:6}} title="Monta o documento a partir dos pontos posicionados, sem usar IA">
            <i className="ti ti-file-pencil" aria-hidden/> Gerar sem IA
          </button>
          <button onClick={generateExec} disabled={loading} style={{...btnPrimary,background:'#7C3AED'}}>
            <i className="ti ti-sparkles" aria-hidden/> {loading?(execProgress||'Gerando...'):(execDoc?'Regerar com IA':'Gerar com IA')}
          </button>
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
          <button onClick={()=>setShowPdfOpts(true)} style={btnPrimary} title="Abre as opções do documento antes de gerar."><i className="ti ti-file-download" aria-hidden/> Baixar PDF ({execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='conduites'?'Conduítes':'Completo'})</button>
        </div>
      )}
      {showPdfOpts && (()=>{
        const famList=['dados','som','eletrica','hdmi','uplink','fibra']
        const catList=[...new Set(markers.map(m=>equipType(m.name)))].sort()
        const modo = execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':execMode==='conduites'?'Conduítes':'Completo'
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
                  <div style={{fontSize:12.5,fontWeight:600,marginBottom:2}}>Filtros do relatório <span style={{fontWeight:400,color:'#94A3B8'}}>· {markers.length} {markers.length===1?'item':'itens'} no total</span></div>
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
.ex-plant img{width:auto!important;height:auto;max-width:100%;max-height:190mm;display:block;border:1px solid #CDD2DA;border-radius:6px}

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
.ex-plant img{width:auto!important;height:auto;max-width:100%;max-height:190mm;display:block;border:1px solid #CDD2DA;border-radius:6px}
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
.ex-doc{background:#FAF5EC;color:#1B2337;font-family:'Inter','DM Sans',system-ui,sans-serif}
.ex-sec{background:#FBF7EF;border-bottom:1px solid #E4D9C4}
.ex-sec h2{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#131A2C;font-weight:600}
.ex-sec-num{color:#B0854C;border-color:#B0854C}
.ex-amb{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#8A6A38;font-weight:600}
.ex-p{color:#3C4557}
.ex-cover{background:#131A2C;color:#F6EFDF;border-bottom:4px solid #B0854C}
.ex-cover-top{color:#8B93A8}
.ex-cover-tag{color:#B0854C}
.ex-cover-title{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#F6EFDF;font-weight:600}
.ex-cover-sub{color:#C9BFA6}
.ex-cover-client{background:#1B2337;border:1px solid #3A4258}
.ex-cc-name{color:#F6EFDF}
.ex-cc-meta{color:#9AA2B8}
.ex-cover-foot{color:#6F7890}
.ex-doc-cover{border-bottom:4px solid #B0854C}
.ex-tbl th{background:#131A2C;color:#EFE3C8;letter-spacing:.5px}
.ex-tbl td{border-bottom:.5px solid #E4D9C4;color:#242D42}
.ex-tbl tbody tr:nth-child(even) td{background:#F5EEDD}
.ex-obra-page{background:#FBF7EF}
.ex-obra-page h2{font-family:'Fraunces','DM Serif Display',Georgia,serif;color:#131A2C;border-color:#B0854C!important}
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
