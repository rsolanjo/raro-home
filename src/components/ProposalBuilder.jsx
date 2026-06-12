import { openProposalPDF } from './proposalPDF.js'
import { LOGO_COVER, LOGO_DARK } from '../logos.js'
import { useState, useEffect, useCallback } from 'react'
import { saveProposal, getCatalog, getStockWithReservations, getCatalogCategories,
         generateProposalCode, auditedSave, checkProposalStock, checkPINSession, setPINSession, verifyPIN, addAuditLog } from '../db/supabase.js'
import PINModal from './PINModal.jsx'
import PlantaIA from './PlantaIA.jsx'
import PlantaEditor from './PlantaEditor.jsx'

// ── Pitch bank ─────────────────────────────────────────────
const PITCHES = {
  cpd:['O cérebro que conecta e protege cada detalhe da sua casa.','Central única que gerencia automação, câmeras e rede.'],
  sala:['Cinema, som e conforto no ritmo da sua rotina.','6 cenas automáticas — tudo a um toque ou pelo WhatsApp.'],
  gourmet:['Churrasqueira, coifa e som no automático — o espaço já sabe.','Receba com elegância: clima e trilha sonora programados.'],
  cozinha:['Automação e eficiência no coração da casa.'],
  jantar:['A luz certa para cada refeição, sem ajuste manual.'],
  suite:['Clima, automação e entretenimento no ritmo de quem mora.'],
  suíte:['Clima, automação e entretenimento no ritmo de quem mora.'],
  wc:['Automação que transforma o banho num ritual personalizado.'],
  banheiro:['Atmosfera perfeita em cada visita, sem apertar nada.'],
  quarto:['Boa noite e bom dia com um único toque.'],
  escada:['Segurança e automação a cada transição entre os andares.'],
  corredor:['Automação invisível que funciona sem você precisar pensar.'],
  varanda:['A varanda que se transforma com a hora do dia.'],
  churrasqueira:['Coifa, grelha e som integrados — só falta a carne.'],
  home:['Cinema em casa com automação de última geração.'],
  closet:['Organização e automação integradas no closet.'],
}
const COMMON_ROOMS = [
  'CPD / Central de Automação','Sala de Estar','Sala de Jantar','Gourmet',
  'Cozinha','Área de Serviço','Corredor Externo','Escada','Corredor Interno',
  'Banheiro Social','Quarto','Suíte Master','Suíte Casal','WC','Varanda',
  'Churrasqueira','Home Theater','Escritório','Lavabo','Closet','Piscina',
]
const ICONS = ['◉','◈','◇','◆','▣','□','▷','⊞','▸','○','◎','◐','★','◑','▲']
const FLOOR_NAMES = ['Primeiro','Segundo','Terceiro','Quarto','Quinto','Sexto']

function parse(s){
  if(s===null||s===undefined||s==='') return 0
  if(typeof s==='number') return isNaN(s)?0:s
  let str=String(s).trim().replace(/[R$\s\u202f]/g,'')
  const hasDot=str.includes('.'), hasComma=str.includes(',')
  if(hasDot&&hasComma){ str=str.replace(/\./g,'').replace(',','.') }
  else if(hasComma){ str=str.replace(',','.') }
  str=str.replace(/[^0-9.\-]/g,'')
  const n=parseFloat(str); return isNaN(n)?0:n
}
function fmt(v){ const n=typeof v==='number'?v:parse(v); return 'R$\u202f'+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function mkRoom(){ return{id:Date.now()+Math.random(),name:'',icon:'◈',highlight:false,pitch:'',price:'',items:[]} }
function mkFloor(n){ return{id:Date.now()+Math.random(),name:n||'Primeiro Pavimento',rooms:[]} }

// ── TEST HOUSE GENERATOR ───────────────────────────────────
function makeRooms(rows){ return rows.map(([n,icon,hl,items,price,pitch])=>({id:Date.now()+Math.random(),name:n,icon,highlight:hl,items:items.filter(Boolean),price:String(price||0),pitch:pitch||''})) }
function makeFloor(name, rooms){ return {id:Date.now()+Math.random(),name,rooms:makeRooms(rooms)} }
function templateLinear2q(catalog){
  const I=c=>{const x=catalog.find(i=>i.code===c);return x?{name:x.name,code:x.code,qty:'1',cost_price:x.cost_price||0,sale_price:x.sale_price||0,category:x.category||'',pitch:x.pitch||''}:null}
  return [makeFloor('Primeiro Pavimento',[
    ['CPD / Central de Automação','◉',true,[I('QAGPM2')],1040,'O cérebro inteligente da sua automação.'],
    ['Sala de Estar','◈',false,[I('QAT42Z3B'),I('QAIRZM2')],1958,'Cinema, som e conforto no ritmo da sua rotina.'],
    ['Sala de Jantar','◇',false,[I('QAT42Z2B')],528,'A luz certa para cada refeição.'],
    ['Gourmet','◆',true,[I('QAT42Z3B-PT'),I('QARZ2LR'),I('QAIRZM2')],1902,'Churrasqueira, coifa e som — o espaço já sabe.'],
    ['Suíte Master','◉',false,[I('QAT42Z3B'),I('QARZ2LR'),I('QAIRZM2')],2244,'A suíte mais conectada da casa.'],
    ['Suíte 2','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1716,'Conforto e automação em cada detalhe.'],
    ['WC Master','○',false,[I('QAT42Z2B-PT')],528,'Automação discreta.'],
    ['Corredor','▷',false,[I('QAT42Z1B-PT')],440,'Automação de passagem.'],
  ])]
}
function templateLinear3q(catalog){
  const I=c=>{const x=catalog.find(i=>i.code===c);return x?{name:x.name,code:x.code,qty:'1',cost_price:x.cost_price||0,sale_price:x.sale_price||0,category:x.category||'',pitch:x.pitch||''}:null}
  return [makeFloor('Primeiro Pavimento',[
    ['CPD / Central de Automação','◉',true,[I('QAGPM2'),I('QASG8')],2020,'O cérebro que conecta e protege cada detalhe.'],
    ['Sala de Estar','◈',false,[I('QAT44Z6B'),I('QAIRZM2')],1386,'Cinema, som e conforto no ritmo da sua rotina.'],
    ['Sala de Jantar','◇',false,[I('QAT42Z3B')],572,'A luz certa para cada refeição.'],
    ['Gourmet','◆',true,[I('QAT42Z3B-PT'),I('QARZ2LR'),I('QAIRZM2')],2140,'Churrasqueira, coifa e som — o espaço já sabe.'],
    ['Suíte Master','◉',false,[I('QAT42Z3B'),I('QARZ2LR'),I('QAIRZM2')],2866,'A suíte mais conectada da casa.'],
    ['Suíte 2','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Clima, automação e entretenimento.'],
    ['Suíte 3','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Conforto e automação em cada detalhe.'],
    ['WC Master','○',false,[I('QAT42Z2B-PT')],648,'Design e automação no banheiro privativo.'],
    ['Corredor','▷',false,[I('QAT42Z1B-PT')],440,'Automação de passagem.'],
  ])]
}
function template2pav3q(catalog){
  const I=c=>{const x=catalog.find(i=>i.code===c);return x?{name:x.name,code:x.code,qty:'1',cost_price:x.cost_price||0,sale_price:x.sale_price||0,category:x.category||'',pitch:x.pitch||''}:null}
  return [
    makeFloor('Primeiro Pavimento',[
      ['CPD / Central de Automação','◉',true,[I('QAGPM2'),I('QASG8'),I('QACD5')],7580,'O cérebro que conecta e protege cada detalhe da sua casa.'],
      ['Sala de Estar','◈',false,[I('QAT44Z6B'),I('QAIRZM2')],1386,'Cinema, som e conforto no ritmo da sua rotina.'],
      ['Sala de Jantar','◇',false,[I('QAT42Z3B')],572,'A luz certa para cada refeição.'],
      ['Gourmet','◆',true,[I('QAT42Z3B-PT'),I('QARZ2LR'),I('QAIRZM2')],2140,'Churrasqueira, coifa e som — o espaço já sabe.'],
    ]),
    makeFloor('Segundo Pavimento',[
      ['Suíte Master','◉',false,[I('QAT42Z3B'),I('QARZ2LR'),I('QAIRZM2')],2866,'A suíte mais conectada da casa.'],
      ['Suíte 2','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Clima, automação e entretenimento.'],
      ['Suíte 3','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Conforto e automação em cada detalhe.'],
      ['WC Master','○',false,[I('QAT42Z2B-PT')],648,'Design e automação no banheiro privativo.'],
      ['Corredor','▷',false,[I('QAT42Z1B-PT')],440,'Automação de passagem.'],
    ]),
  ]
}
function templateEduardoRegina(catalog){
  const I=(code,qty=1)=>{const x=catalog.find(i=>i.code===code);return x?{name:x.name,code:x.code,qty:String(qty),cost_price:x.cost_price||0,sale_price:x.sale_price||0,category:x.category||'',pitch:x.pitch||''}:null}
  return [makeFloor('Único Pavimento',[
    ['CPD / Central de Automação','◉',true,[I('QAGPM2'),I('QASG8'),I('QACD5',3)],7580,'O cérebro que conecta e protege cada detalhe do apartamento.'],
    ['Estar','◈',true,[I('QAT44Z6B'),I('QAIRZM2'),I('QARZ2LR')],2060,'Iluminação, ar-condicionado e som — controlados por voz ou toque.'],
    ['Jantar','◇',false,[I('QAT42Z3B')],572,'A luz certa para cada refeição.'],
    ['Cozinha','◆',false,[I('QAT42Z2B')],528,'Praticidade automatizada no coração do lar.'],
    ['Área de Serviço','◈',false,[I('QAT42Z1B')],220,'Automação discreta nos bastidores.'],
    ['Área Externa','◈',true,[I('QAT42Z2B-PT'),I('QARZ2LR'),I('QACD5')],1350,'Câmera 5MP, iluminação e conforto no terraço.'],
    ['Suíte Master','◉',true,[I('QAT42Z3B',2),I('QARZ2LR',2),I('QAIRZM2')],2866,'A suíte mais conectada do apartamento.'],
    ['Suíte','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Clima, automação e entretenimento.'],
    ['Quarto','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Conforto e automação em cada detalhe.'],
    ['W.C. Master','○',false,[I('QAT42Z2B-PT')],528,'Automação elegante no banheiro privativo.'],
    ['W.C.','○',false,[I('QAT42Z1B-PT')],220,'Automação discreta.'],
    ['Lavabo','○',false,[I('QAT42Z1B-PT')],220,'Iluminação automatizada.'],
    ['Circulação','▷',false,[I('QAT42Z1B-PT')],220,'Controle de passagem.'],
  ])]
}

function template2pavGourmet(catalog){
  const I=(c,q=1)=>{const x=catalog.find(i=>i.code===c);return x?{name:x.name,code:x.code,qty:String(q),cost_price:x.cost_price||0,sale_price:x.sale_price||0,category:x.category||'',pitch:x.pitch||''}:null}
  return [
    makeFloor('Primeiro Pavimento',[
      ['CPD / Central de Automação','◉',true,[I('QAGPM2'),I('QASG8'),I('QACD5',4)],7580,'O cérebro que conecta e protege cada detalhe da sua casa.'],
      ['Sala de Estar','◈',false,[I('QAT44Z6B'),I('QAIRZM2')],1386,'Cinema, som e conforto no ritmo da sua rotina.'],
      ['Sala de Jantar','◇',false,[I('QAT42Z3B')],572,'A luz certa para cada refeição.'],
      ['Gourmet Premium','◆',true,[I('QAT42Z3B-PT',2),I('QARZ2LR'),I('QAIRZM2')],2140,'Churrasqueira, coifa, som e telão — o espaço definitivo.'],
      ['Área Externa','◈',true,[I('QAT42Z2B-PT'),I('QARZ2LR')],1200,'Som ambiente e iluminação por smartphone.'],
    ]),
    makeFloor('Segundo Pavimento',[
      ['Suíte Master','◉',false,[I('QAT42Z3B'),I('QARZ2LR'),I('QAIRZM2')],2866,'A suíte mais conectada da casa.'],
      ['Suíte 2','◉',false,[I('QAT42Z2B'),I('QARZ2LR'),I('QAIRZM2')],1589,'Clima, automação e entretenimento.'],
      ['WC Master','○',false,[I('QAT42Z2B-PT')],648,'Design e automação no banheiro privativo.'],
      ['Corredor','▷',false,[I('QAT42Z1B-PT')],440,'Automação de passagem.'],
    ]),
  ]
}

// ── PDF BUILDER ────────────────────────────────────────────
const PDF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;background:#F5FAFF;margin:0 auto;display:flex;flex-direction:column;page-break-after:always}
.page-last{page-break-after:auto}
@media print{.no-print{display:none!important}}

/* ── PALETA AZUL ── */
/* --ink:     #060B1A  */
/* --ink2:    #1E3A5F  */
/* --mid:     #3D5A80  */
/* --accent:  #0EA5E9  */
/* --accentdk:#0369A1  */
/* --accentlt:#38BDF8  */
/* --bg:      #F5FAFF  */
/* --bg2:     #E8F4FF  */
/* --border:  #C8DEFF  */

/* ── TYPE ── */
.serif{font-family:'DM Serif Display',serif}
.sans{font-family:'DM Sans',sans-serif}

/* ══════════════════════
   COVER PAGE
   ══════════════════════ */
.cov-top{background:#060B1A;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.cov-ey{font-size:6.5px;letter-spacing:3px;color:rgba(56,189,248,0.6);text-transform:uppercase;font-family:'DM Sans',sans-serif}
.cov-si{font-family:'DM Serif Display',serif;font-size:10px;font-style:italic;color:rgba(240,246,255,0.6)}
.cov-right{font-size:6px;color:rgba(56,189,248,0.3);text-align:right;line-height:1.9;font-family:'DM Sans',sans-serif}

.logo-zone{background:#F5FAFF;padding:20px 28px 14px;display:flex;flex-direction:column;align-items:center;flex-shrink:0;border-bottom:0.5px solid #C8DEFF}
.logo-zone img{height:140px;width:auto;display:block}
.logo-tagline{font-size:9px;letter-spacing:6px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;font-weight:300;margin-top:12px;margin-bottom:2px}
.logo-orn{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:9px}
.lo-l{width:44px;height:0.5px;background:#0EA5E9}
.lo-l-r{width:44px;height:0.5px;background:linear-gradient(to left,transparent,#0EA5E9)}
.lo-d{width:4px;height:4px;background:#0EA5E9;transform:rotate(45deg)}

/* ── HERO ── */
.hero{padding:14px 28px 10px;text-align:center;flex-shrink:0;background:#F5FAFF;border-bottom:0.5px solid #C8DEFF}
.hero-ey{font-size:6.5px;letter-spacing:5px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:8px}
.hero-h{font-family:'DM Serif Display',serif;font-size:28px;color:#060B1A;line-height:1.2;margin-bottom:8px}
.hero-h em{font-style:italic;color:#0EA5E9}
.hero-lead{font-size:11px;color:#3D5A80;line-height:1.85;font-weight:300;font-style:italic;font-family:'DM Sans',sans-serif;max-width:440px;margin:0 auto}

/* ── CLIENT BANNER ── */
.client-banner{background:#060B1A;padding:11px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.cb-name{font-family:'DM Serif Display',serif;font-size:17px;color:#F0F6FF;letter-spacing:0.5px}
.cb-id{font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:2px;color:#38BDF8;text-transform:uppercase;margin-top:2px}
.cb-right{text-align:right}
.cb-bairro{font-family:'DM Serif Display',serif;font-size:11px;color:rgba(240,246,255,0.6);font-style:italic}
.cb-date{font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:1px;color:rgba(56,189,248,0.3);margin-top:3px}

/* ── QUEM SOMOS 2×2 ── */
.quem{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#C8DEFF;flex-shrink:0}
.qc{background:#F5FAFF;padding:10px 14px}
.qc.lft{border-left:2.5px solid #0EA5E9}
.qi{font-size:12px;color:#0EA5E9;margin-bottom:3px;display:block}
.qt{font-family:'DM Serif Display',serif;font-size:14px;color:#060B1A;margin-bottom:4px}
.qb{font-size:10px;color:#3D5A80;line-height:1.7;font-weight:300;font-family:'DM Sans',sans-serif}

/* ── TESTIMONIALS ── */
.testi-section{flex:1;display:flex;flex-direction:column;min-height:0}
.testi-lbl{font-size:8px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;padding:14px 28px 8px;background:#E8F4FF;flex-shrink:0;font-family:'DM Sans',sans-serif;border-top:2px solid #0EA5E9;font-weight:500}
.testi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;padding:8px 28px 14px;background:#F5FAFF}
.testi{background:#fff;border:0.5px solid #C8DEFF;border-radius:6px;padding:12px 13px;display:flex;flex-direction:column;border-top:2px solid #0EA5E9}
.tq{font-family:'DM Serif Display',serif;font-size:11px;color:#060B1A;font-style:italic;line-height:1.65;margin-bottom:9px;flex:1}
.tq-stars{display:flex;gap:2px;margin-bottom:6px}
.tq-star{width:7px;height:7px;background:#FBBF24;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.testi-author{display:flex;align-items:center;gap:7px;border-top:0.5px solid #C8DEFF;padding-top:7px;margin-top:auto}
.testi-av{width:20px;height:20px;border-radius:50%;background:#0EA5E9;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;font-family:'DM Sans',sans-serif}
.tn{font-family:'DM Sans',sans-serif;font-size:8.5px;font-weight:600;color:#0369A1;letter-spacing:1px;text-transform:uppercase}
.tc{font-family:'DM Sans',sans-serif;font-size:8px;color:#6B8CAE;margin-top:2px;font-weight:300}

/* ── CONTACT STRIP (cover) ── */
.contact-strip{background:#060B1A;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-top:1px solid rgba(14,165,233,0.15)}
.cs-name{font-family:'DM Serif Display',serif;font-size:14px;color:#F0F6FF;letter-spacing:0.5px}
.cs-phone{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:#38BDF8;margin-top:1px}
.cs-r{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.cs-item{display:flex;align-items:center;gap:5px}
.cs-ic{font-size:10px;color:#0EA5E9}
.cs-tx{font-family:'DM Sans',sans-serif;font-size:8.5px;color:#F0F6FF}
.cs-tx-s{font-family:'DM Sans',sans-serif;font-size:7.5px;color:#38BDF8}
.valid-strip{background:#030712;padding:4px 28px;text-align:center;font-size:5.5px;letter-spacing:1.5px;color:rgba(56,189,248,0.2);text-transform:uppercase;font-family:'DM Sans',sans-serif;flex-shrink:0}

/* ══════════════════════
   ROOM PAGES
   ══════════════════════ */
.phdr{background:#060B1A;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.phdr-brand{font-size:9px;letter-spacing:5px;color:#F0F6FF;font-weight:400;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.phdr-sub{font-size:5.5px;letter-spacing:2px;color:#38BDF8;text-transform:uppercase;margin-top:1px;font-family:'DM Sans',sans-serif}
.phdr-right{font-size:7px;letter-spacing:1px;color:#38BDF8;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.grule{height:2px;background:linear-gradient(to right,#0EA5E9 0%,#38BDF8 30%,transparent 65%);flex-shrink:0}

.page-client{background:#E8F4FF;padding:5px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid #C8DEFF;flex-shrink:0}
.pc-name{font-family:'DM Serif Display',serif;font-size:10px;color:#060B1A;letter-spacing:0.5px}
.pc-id{font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:2px;color:#0EA5E9;text-transform:uppercase}
.pc-bairro{font-family:'DM Sans',sans-serif;font-size:7px;color:#6B8CAE;font-style:italic}

/* ── ROOM CARDS ── */
.fl-section-hdr{background:linear-gradient(135deg,#060B1A 0%,#0a1628 100%);border-radius:4px;padding:10px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border-left:4px solid #0EA5E9}
.fl-section-hdr-inner{display:flex;align-items:center;gap:8px;padding-bottom:4px;border-bottom:1px solid #C8DEFF}
.fl-section-label{font-size:6px;letter-spacing:4px;color:#0EA5E9;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.fl-section-name{font-family:'DM Serif Display',serif;font-size:15px;color:#060B1A;letter-spacing:0.5px}

.rooms-3col{flex:1;padding:4px 6px;display:flex;flex-direction:column;gap:0;overflow:hidden}
.fl-block{display:flex;flex-direction:column;margin-bottom:2px}
.fl-block-grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:6px 8px;flex:1}

.fl-block-grid .room,.rooms-3col .room{background:#fff;border:0.5px solid #C8DEFF;border-radius:4px;padding:8px 10px;display:flex;flex-direction:column;border-left:2.5px solid #C8DEFF;overflow:hidden;min-height:0}
.fl-block-grid .room.hl,.rooms-3col .room.hl{border-left-color:#0EA5E9}
.fl-block-grid .room.pad,.rooms-3col .room.pad{background:transparent;border-color:transparent}

.fl-block-grid .rh,.rooms-3col .rh{display:flex;align-items:flex-start;gap:5px;margin-bottom:4px}
.fl-block-grid .ri,.rooms-3col .ri{font-size:12px;color:#0EA5E9;flex-shrink:0;margin-top:1px}
.fl-block-grid .rn,.rooms-3col .rn{font-family:'DM Serif Display',serif;font-size:13px;font-weight:400;color:#060B1A;line-height:1.2}

.fl-block-grid .items-table,.rooms-3col .items-table{width:100%;border-collapse:collapse;margin-bottom:3px}
.fl-block-grid .it-name,.rooms-3col .it-name{font-size:9px;color:#1e3a5f;font-weight:400;padding:2px 0;line-height:1.45;width:62%;font-family:'DM Sans',sans-serif}
.fl-block-grid .it-code,.rooms-3col .it-code{font-size:6.5px;color:#6B8CAE;text-align:center;width:26%;font-family:'DM Sans',sans-serif}
.fl-block-grid .it-qty,.rooms-3col .it-qty{font-size:7px;color:#0EA5E9;font-weight:600;text-align:right;width:12%;font-family:'DM Sans',sans-serif}

.fl-block-grid .rp,.rooms-3col .rp{font-family:'DM Serif Display',serif;font-style:italic;font-size:10px;color:#1E3A5F;line-height:1.55;margin-top:6px;padding-top:5px;border-top:0.5px solid #C8DEFF}

.fl-block-grid .rv,.rooms-3col .rv{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;padding-top:4px;border-top:0.5px solid #C8DEFF;flex-shrink:0}
.fl-block-grid .rvl,.rooms-3col .rvl{font-size:6px;letter-spacing:2px;color:#6B8CAE;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.fl-block-grid .rvv,.rooms-3col .rvv{font-family:'DM Serif Display',serif;font-size:13px;color:#060B1A}

.subtotals-bar{background:#060B1A;padding:6px 24px;display:flex;justify-content:flex-end;align-items:center;gap:20px;flex-shrink:0}
.sub-item{font-size:7px;color:#6B8CAE;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px}
.sub-item strong{color:#F0F6FF;font-size:13px;font-family:'DM Serif Display',serif;font-weight:400}

/* ── PAGE FOOTER ── */
.pftr{border-top:0.5px solid #C8DEFF;padding:5px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#F5FAFF}
.pftr-brand{font-size:6px;letter-spacing:2px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.pftr-n{font-family:'DM Serif Display',serif;font-size:10px;color:#0EA5E9}

/* ══════════════════════
   TOTALS PAGE
   ══════════════════════ */
.tot-body{padding:16px 24px 0;flex-shrink:0}
.tot-ey{font-size:7px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:10px}

.pav-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#C8DEFF;margin-bottom:10px}.pb-full{grid-column:1/-1}.pr-grid-full{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0}
.pb{background:#E8F4FF;padding:10px 12px}
.pb-title{font-size:6.5px;letter-spacing:2px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid #C8DEFF}
.pr{display:flex;justify-content:space-between;align-items:baseline;padding:2px 0}
.prn{font-size:8.5px;color:#3D5A80;font-weight:300;font-family:'DM Sans',sans-serif}
.prv{font-family:'DM Serif Display',serif;font-size:13px;color:#060B1A}
.psub{display:flex;justify-content:space-between;margin-top:5px;padding-top:5px;border-top:0.5px solid #0EA5E9}
.psl{font-size:6px;letter-spacing:1.5px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.psv{font-family:'DM Serif Display',serif;font-size:12px;color:#060B1A;font-weight:400}

.tr{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#E8F4FF;border-left:2.5px solid #C8DEFF}
.tr+.tr{border-top:0.5px solid #C8DEFF}
.tr.main{background:#060B1A;border-left-color:#0EA5E9;margin-top:2px;padding:12px}
.tl{font-size:10px;color:#3D5A80;font-weight:300;font-family:'DM Sans',sans-serif}
.tl.main{color:#38BDF8;letter-spacing:2px;text-transform:uppercase;font-size:7px;font-weight:400;font-family:'DM Sans',sans-serif}
.tv{font-family:'DM Serif Display',serif;font-size:18px;color:#060B1A}
.tv.main{font-size:26px;color:#F0F6FF}

/* ── SIGNATURE ── */
.sig-section{padding:14px 24px 0;flex-shrink:0}
.sig-ey{font-size:6.5px;letter-spacing:3px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:18px;padding-top:14px;border-top:0.5px solid #C8DEFF}
.sig-grid{display:grid;grid-template-columns:1fr 20px 1fr}
.sf{display:flex;flex-direction:column}
.sl{height:0.5px;background:#C8DEFF;margin-bottom:5px}
.slabel{font-size:6px;letter-spacing:2px;color:#6B8CAE;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.sig-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}

/* ── CLOSING ── */
.closing{padding:14px 24px 0;text-align:center;flex-shrink:0}
.cl-t{font-family:'DM Serif Display',serif;font-size:15px;color:#060B1A;margin-bottom:8px}
.cl-contacts{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
.cl-item{font-size:9px;font-weight:500;color:#0369A1;font-family:'DM Sans',sans-serif}

/* ── ADMIN INDICATOR ── */
.it-name .admin-cost{color:#7C3AED;font-size:4.5px}
`

function buildPDF(data, adminMode=false){
  const{client_name,proposal_code,neighborhood,floors,labor,date_str,itemFontSize=9,client_phone1,client_phone2}=data
  const fmt=v=>'R$\u202f'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const equipTotal=(floors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parse(r.price),s),0)
  const grandTotal=equipTotal+parse(labor)
  const laborVal=parse(labor)
  const iFS=Math.max(9,itemFontSize||9)

  // ── helpers ──────────────────────────────────────────────────
  const pageHeader=()=>`<div class="phdr"><div><div class="phdr-brand">RARO HOME</div><div class="phdr-sub">Casa · Tecnologia · Lazer</div></div><div class="phdr-right">${proposal_code}</div></div><div class="grule"></div>`
  const pageFooter=n=>`<div class="pftr"><div class="pftr-brand">RARO Home — Proposta Técnica${adminMode?' · VERSÃO ADMIN':''}</div><div class="pftr-n">${n}</div></div>`
  const clientMini=()=>`<div class="page-client"><div><div class="pc-name">${client_name}</div></div><div style="display:flex;gap:14px;align-items:center"><div class="pc-bairro">${neighborhood}</div><div class="pc-id">${proposal_code}</div></div></div>`
  const contactStrip=()=>`<div class="contact-strip"><div><div class="cs-name">Rogério Silva</div><div class="cs-phone">+55 21 98170-9009</div></div><div class="cs-r"><div class="cs-item"><span class="cs-ic">@</span><span class="cs-tx">contato@rarohome.com.br</span></div><div class="cs-item"><span class="cs-ic">☆</span><span class="cs-tx-s">@rarohome</span></div><div class="cs-item"><span class="cs-ic">◉</span><span class="cs-tx-s">www.rarohome.com.br</span></div></div></div>`

  // ── CAPA (idêntica à versão anterior) ────────────────────────
  const cover=`<div class="page" style="page-break-after:always">
    <div class="cov-top">
      <div><div class="cov-ey">Documento exclusivo e confidencial</div><div class="cov-si">Proposta técnica exclusiva</div></div>
      <div class="cov-right">Válido por 30 dias · ${date_str}</div>
    </div>
    <div class="logo-zone">
      <img src="${LOGO_COVER}" alt="RARO Home" style="height:140px;width:auto;display:block"/>
      <div class="logo-tagline">C A S A · T E C N O L O G I A · L A Z E R</div>
      <div class="logo-orn"><div class="lo-l-r"></div><div class="lo-d"></div><div class="lo-l"></div></div>
    </div>
    <div class="hero">
      <div class="hero-ey">P R O P O S T A T É C N I C A E X C L U S I V A</div>
      <div class="hero-h">O espaço que você merece.<br/><em>Criado com exclusividade</em> para você.</div>
      <div class="hero-lead">Da automação ao gourmet de luxo — entregamos projetos completos com qualidade, exclusividade e atenção a cada detalhe da sua vida.</div>
    </div>
    <div class="client-banner">
      <div><div class="cb-name">${client_name}</div><div class="cb-id">${proposal_code}</div></div>
      <div class="cb-right"><div class="cb-bairro">${neighborhood}</div><div class="cb-date">${date_str}</div></div>
    </div>
    <div class="quem">
      <div class="qc lft"><span class="qi">◈</span><div class="qt">Quem Somos</div><div class="qb">Criamos experiências únicas para quem vive com estilo. Cada projeto é exclusivo, desenvolvido com atenção obsessiva aos detalhes e ao que há de melhor no mercado.</div></div>
      <div class="qc lft"><span class="qi">◆</span><div class="qt">O que Entregamos</div><div class="qb">Áreas gourmet de luxo, churrasqueiras e coifas exclusivas, chopeiras, telão de LED externo, móveis externos premium, som ambiente, WiFi em toda a casa — e tudo automatizado por voz, toque ou WhatsApp.</div></div>
      <div class="qc lft"><span class="qi">◇</span><div class="qt">Tecnologia de Ponta</div><div class="qb">Zigbee · Matter · Tuya. Compatível com Alexa, Google Home e Apple HomeKit. Câmeras 4K com inteligência artificial.</div></div>
      <div class="qc lft"><span class="qi">◉</span><div class="qt">RARO Experience</div><div class="qb">Você tem um consultor dedicado do projeto à entrega. Instalação profissional, treinamento personalizado e suporte contínuo via WhatsApp — sem terceiros, sem surpresas.</div></div>
    </div>
    <div class="testi-section">
      <div class="testi-lbl">★ O Q U E N O S S O S C L I E N T E S D I Z E M</div>
      <div class="testi-grid">
        <div class="testi"><div class="tq-stars">${'<div class="tq-star"></div>'.repeat(5)}</div><div class="tq">"A casa cuida de tudo. Hoje o WhatsApp me avisa de qualquer coisa."</div><div class="testi-author"><div class="testi-av">CM</div><div><div class="tn">Carlos M.</div><div class="tc">Barra da Tijuca, RJ</div></div></div></div>
        <div class="testi"><div class="tq-stars">${'<div class="tq-star"></div>'.repeat(5)}</div><div class="tq">"Receber visitas ficou outro nível. Ligo o som e o gourmet com uma mensagem."</div><div class="testi-author"><div class="testi-av">FR</div><div><div class="tn">Fernanda R.</div><div class="tc">Recreio, RJ</div></div></div></div>
        <div class="testi"><div class="tq-stars">${'<div class="tq-star"></div>'.repeat(5)}</div><div class="tq">"A segurança me deu paz de espírito. Acesso as câmeras 4K de qualquer lugar."</div><div class="testi-author"><div class="testi-av">R&amp;</div><div><div class="tn">Ricardo &amp; Ana L.</div><div class="tc">Itaipava, RJ</div></div></div></div>
        <div class="testi"><div class="tq-stars">${'<div class="tq-star"></div>'.repeat(5)}</div><div class="tq">"Internet em 100% dos cômodos. Som integrado na sala, gourmet e varanda."</div><div class="testi-author"><div class="testi-av">MF</div><div><div class="tn">Marcelo F.</div><div class="tc">Niterói, RJ</div></div></div></div>
      </div>
    </div>
    ${contactStrip()}
    <div class="valid-strip">© R A R O H O M E · ${client_name} · ${proposal_code} · V Á L I D O P O R 3 0 D I A S</div>
  </div>`

  // ── room card (layout vertical, fontes grandes) ───────────────
  const FORD={'Primeiro':'1º','Segundo':'2º','Terceiro':'3º','Quarto':'4º','Quinto':'5º'}
  const roomCard=r=>{
    const hl=r.highlight?' hl':''
    const rows=(r.items||[]).filter(i=>i.name).map(i=>{
      const qty=parseInt(i.qty)||1
      if(adminMode){
        const sale=(i.sale_price||0)*qty, cost=(i.cost_price||0)*qty
        const m=cost>0?Math.round((sale-cost)/cost*100):null
        return `<tr style="border-bottom:0.5px solid #EDE9FE">
          <td style="font-size:10px;color:#1E3A5F;padding:3px 4px;font-family:'DM Sans',sans-serif">${i.name}</td>
          <td style="font-size:9.5px;color:#7C3AED;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif;white-space:nowrap">${sale>0?fmt(sale):'—'}</td>
          <td style="font-size:9px;color:#E8956A;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif;white-space:nowrap">${cost>0?fmt(cost):'—'}</td>
          <td style="font-size:9.5px;color:#0EA5E9;font-weight:700;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif">${qty}</td>
          ${m!==null?`<td style="font-size:9px;color:#059669;font-weight:600;text-align:right;padding:3px 4px">${m}%</td>`:'<td></td>'}
        </tr>`
      }
      return `<tr><td class="it-name">${i.name}</td><td class="it-code">${i.code||''}</td><td class="it-qty">${qty>1?qty:''}</td></tr>`
    }).join('')
    const thead=adminMode?`<tr style="background:#F3F0FF"><th style="font-size:7.5px;color:#7C3AED;padding:3px 4px;text-align:left;font-family:'DM Sans',sans-serif">Item</th><th style="font-size:7.5px;color:#7C3AED;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif">Venda</th><th style="font-size:7.5px;color:#E8956A;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif">Custo</th><th style="font-size:7.5px;color:#0EA5E9;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif">Qtd</th><th style="font-size:7.5px;color:#059669;text-align:right;padding:3px 4px;font-family:'DM Sans',sans-serif">Mg%</th></tr>`:''
    const items=rows?`<table class="items-table" style="${adminMode?'border:0.5px solid #DDD6FE;overflow:hidden':''}">${thead}${rows}</table>`:''
    const pitch=r.pitch&&!adminMode?`<div class="rp">${r.pitch}</div>`:''
    const roomTotal=adminMode?(()=>{
      const cost=(r.items||[]).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
      const sale=parse(r.price), mg=cost>0?Math.round((sale-cost)/cost*100):0
      return `<div style="display:flex;justify-content:space-between;margin-top:5px;padding-top:4px;border-top:1px solid #DDD6FE;flex-shrink:0">
        <div><div style="font-size:6px;letter-spacing:1px;color:#9CA3AF;text-transform:uppercase;font-family:'DM Sans',sans-serif">Custo</div><div style="font-size:12px;color:#E8956A;font-weight:600;font-family:'DM Sans',sans-serif">${fmt(cost)}</div></div>
        <div style="text-align:center"><div style="font-size:6px;letter-spacing:1px;color:#9CA3AF;text-transform:uppercase;font-family:'DM Sans',sans-serif">Margem</div><div style="font-size:12px;color:#7C3AED;font-weight:700;font-family:'DM Sans',sans-serif">${mg}%</div></div>
        <div style="text-align:right"><div style="font-size:6px;letter-spacing:1px;color:#9CA3AF;text-transform:uppercase;font-family:'DM Sans',sans-serif">Venda</div><div class="rvv">${fmt(sale)}</div></div>
      </div>`
    })():`<div class="rv"><div class="rvl">I N V E S T I M E N T O</div><div class="rvv">${fmt(parse(r.price))}</div></div>`
    return `<div class="room${hl}"><div class="rh"><span class="ri">${r.icon||'◈'}</span><div class="rn">${r.name}</div></div>${items}${pitch}${roomTotal}</div>`
  }

  // ── floor section header ──────────────────────────────────────
  const floorHdr=(fl,fi)=>{
    const w=fl.name.split(' ')[0]||''
    const ord=FORD[w]||`${fi+1}º`
    const label=(FORD[w]?w:w)+' Pavimento'
    return `<div class="fl-section-hdr"><div style="background:#0EA5E9;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:800;flex-shrink:0;font-family:'DM Sans',sans-serif">${ord}</div><div style="display:flex;flex-direction:column;gap:1px"><div style="font-size:12px;letter-spacing:3px;color:#0EA5E9;text-transform:uppercase;font-family:'DM Sans',sans-serif;font-weight:500">P A V I M E N T O</div><div class="fl-section-name">${label}</div></div></div>`
  }

  // ── build room pages: 2 cols, up to 12 rooms per page ─────────
  const ROOMS_PER_PAGE=10
  let roomPages=[], cur=[], curFlName=null, curFi=0
  ;(floors||[]).forEach((fl,fi)=>{
    ;(fl.rooms||[]).forEach(r=>{
      if(cur.length>=ROOMS_PER_PAGE){ roomPages.push({items:[...cur]}); cur=[] }
      cur.push({fl,fi,r})
    })
  })
  if(cur.length) roomPages.push({items:[...cur]})

  const roomPagesHtml=roomPages.map(({items},pageIdx)=>{
    // Group by floor preserving order
    const groups=[]
    let lastFl=null
    items.forEach(({fl,fi,r})=>{
      if(!lastFl||lastFl.name!==fl.name){ groups.push({fl,fi,cards:[]}); lastFl=fl }
      groups[groups.length-1].cards.push(r)
    })
    const blocks=groups.map(({fl,fi,cards})=>{
      const padded=[...cards]; if(padded.length%2!==0) padded.push(null)
      const grid=padded.map(r=>r?roomCard(r):'<div class="room pad"></div>').join('')
      return `<div class="fl-block">
        ${floorHdr(fl,fi)}
        <div class="fl-block-grid">${grid}</div>
      </div>`
    }).join('')
    const sub=groups.map(({fl,cards})=>{const s=cards.filter(Boolean).reduce((t,r)=>t+parse(r.price),0);return s>0?`<div class="sub-item">${fl.name}: <strong>${fmt(s)}</strong></div>`:''}).join('')
    return `<div class="page">${pageHeader()}${clientMini()}<div class="rooms-3col">${blocks}</div><div class="subtotals-bar">${sub}</div>${pageFooter(pageIdx+2)}</div>`
  })

  // ── admin summary ─────────────────────────────────────────────
  const adminSummary=adminMode?(`<div style="background:#3D1A6E;padding:10px 14px;border-radius:4px;margin-bottom:12px"><div style="font-size:8px;letter-spacing:2px;color:#C084FC;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:6px">Resumo Financeiro (Admin)</div><div style="display:flex;gap:20px;flex-wrap:wrap">`+(floors||[]).map(fl=>{const cT=(fl.rooms||[]).flatMap(r=>r.items||[]).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0),sT=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0),mg=cT>0?Math.round((sT-cT)/cT*100):0;return `<div style="font-size:10px;color:#E9D5FF;font-family:'DM Sans',sans-serif">${fl.name.replace(' Pavimento','')}: <b>${fmt(cT)}</b> custo · <b style="color:#C084FC">${fmt(sT)}</b> venda · <b style="color:#86EFAC">${mg}%</b></div>`}).join('')+'</div></div>'):'';

  // ── totals page ───────────────────────────────────────────────
  const isSingle=(floors||[]).length===1
  const pavBlocks=isSingle
    ?(()=>{const fl=(floors||[])[0],sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0);return `<div class="pb pb-full"><div class="pb-title">${fl.name}</div><div class="pr-grid-full">${(fl.rooms||[]).map(r=>`<div class="pr"><span class="prn">${r.name}</span><span class="prv">${fmt(parse(r.price))}</span></div>`).join('')}</div><div class="psub"><span class="psl">Subtotal</span><span class="psv">${fmt(sub)}</span></div></div>`})()
    :(floors||[]).map(fl=>{const sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0);return `<div class="pb"><div class="pb-title">${fl.name}</div>${(fl.rooms||[]).map(r=>`<div class="pr"><span class="prn">${r.name}</span><span class="prv">${fmt(parse(r.price))}</span></div>`).join('')}<div class="psub"><span class="psl">Subtotal</span><span class="psv">${fmt(sub)}</span></div></div>`}).join('')

  const totalPage=`<div class="page page-last">
    ${pageHeader()}${clientMini()}
    <div class="tot-body">
      <div class="tot-ey">R E S U M O D O I N V E S T I M E N T O</div>
      ${adminSummary}
      <div class="pav-grid">${pavBlocks}</div>
      <div class="tr"><span class="tl">Equipamentos — ${(floors||[]).length} Pavimento${(floors||[]).length>1?'s':''}</span><span class="tv">${fmt(equipTotal)}</span></div>
      <div class="tr"><span class="tl">Mão de Obra — Instalação e Programação</span><span class="tv">${fmt(laborVal)}</span></div>
      <div class="tr main"><span class="tl main">I N V E S T I M E N T O T O T A L D O P R O J E T O</span><span class="tv main">${fmt(grandTotal)}</span></div>
    </div>
    <div class="sig-section" style="margin-top:20px">
      <div class="sig-ey">A P R O V A Ç Ã O E A S S I N A T U R A</div>
      <div class="sig-grid"><div class="sf"><div class="sl"></div><div class="slabel">C L I E N T E — N O M E E A S S I N A T U R A</div></div><div></div><div class="sf"><div class="sl"></div><div class="slabel">R A R O H O M E</div></div></div>
      <div class="sig-date-grid"><div class="sf"><div class="sl" style="max-width:120px"></div><div class="slabel">D A T A</div></div><div class="sf"><div class="sl" style="max-width:120px"></div><div class="slabel">D A T A</div></div></div>
    </div>
    <div class="closing" style="margin-top:16px"><div class="cl-t">Pronto para transformar sua residência?</div><div class="cl-contacts"><span class="cl-item">☎ +55 21 98170-9009</span><span class="cl-item">@ contato@rarohome.com.br</span><span class="cl-item">☆ @rarohome</span><span class="cl-item">◉ www.rarohome.com.br</span></div></div>
    <div style="flex:1;min-height:10px"></div>
    ${contactStrip()}
    <div class="valid-strip">© R A R O H O M E · ${client_name} · ${proposal_code} · V Á L I D O P O R 3 0 D I A S</div>
  </div>`

  // ── extra font overrides ──────────────────────────────────────
  const extraCSS=`
.it-name{font-size:${iFS}px!important;color:#1e3a5f!important;font-weight:400!important;padding:2.5px 0!important;line-height:1.5!important;width:62%!important;font-family:'DM Sans',sans-serif!important}
.it-code{font-size:${Math.max(7,iFS-2)}px!important;color:#6B8CAE!important;text-align:center!important;width:26%!important;font-family:'DM Sans',sans-serif!important}
.it-qty{font-size:${Math.max(8,iFS-1)}px!important;color:#0EA5E9!important;font-weight:700!important;text-align:right!important;width:12%!important;font-family:'DM Sans',sans-serif!important}
.rn{font-size:14px!important;color:#060B1A!important}
.rp{font-size:${Math.max(10,iFS)}px!important;color:#1E3A5F!important;line-height:1.55!important;font-family:'DM Serif Display',serif!important}
.rvl{font-size:7px!important;letter-spacing:2px!important}
.rvv{font-size:15px!important}
.prn{font-size:11px!important;color:#1E3A5F!important;font-weight:400!important}
.prv{font-size:14px!important}
.pb-title{font-size:9px!important;letter-spacing:2px!important;font-weight:500!important}
.psl{font-size:8px!important}
.psv{font-size:14px!important}
.tl{font-size:11px!important;color:#1E3A5F!important}
.tv{font-size:20px!important}
.tl.main{font-size:8px!important}
.tv.main{font-size:26px!important}`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Proposta RARO Home — ${client_name}${proposal_code?' — '+proposal_code:''}</title><style>${PDF_CSS}${extraCSS}</style></head><body>
<div class="no-print" style="position:sticky;top:0;z-index:99;background:${adminMode?'#4C1D95':'#060B1A'};color:#F0F6FF;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:12px">
  <span><strong>RARO Home</strong>${adminMode?' — VERSÃO ADMIN':''} — ${client_name} · ${proposal_code}</span>
  <button onclick="window.print()" style="background:#8C6D46;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">⬇ Salvar como PDF</button>
</div>
${cover}${roomPagesHtml.join('\n')}${totalPage}
</body></html>`
}


// ── COMPONENT ──────────────────────────────────────────────
export default function ProposalBuilder({ clients, onRefresh, editProposal, execSeed, onGenerateExec, isAdmin, currentUser }) {
  const [catalog, setCatalog] = useState([])
  const [mobilePanel, setMobilePanel] = useState('rooms') // 'rooms' | 'edit' (only affects mobile)
  const [stock,   setStock]   = useState([])
  const [cats,    setCats]    = useState([])

  useEffect(() => {
    getCatalog().then(c  => setCatalog(c  || []))
    getStockWithReservations().then(s => setStock(s || []))
    getCatalogCategories().then(c => setCats(c || []))
  }, [])

  // ── Enriquecer itens sem category (propostas antigas não tinham category salva) ──
  // Roda quando o catalog carrega E quando a proposta em edição muda.
  // Cruza cada item pelo code e preenche category se estiver vazia/genérica.
  const enrichFloors = useCallback((fs, cat) => {
    if (!cat?.length) return fs
    return fs.map(f => ({
      ...f,
      rooms: (f.rooms||[]).map(r => ({
        ...r,
        items: (r.items||[]).map(it => {
          if (it.category && it.category !== 'Outros' && it.category !== 'Outro' && it.category !== 'Sem categoria') return it
          const match = cat.find(c => c.code === it.code)
          if (match?.category) return { ...it, category: match.category }
          return it
        })
      }))
    }))
  }, [])

  useEffect(() => {
    if (!catalog.length) return
    setFloors(fs => enrichFloors(fs, catalog))
  }, [catalog, editProposal, enrichFloors]) // eslint-disable-line react-hooks/exhaustive-deps

  const init = editProposal
  // floors from Supabase may be a string or array
  const initFloors = (() => {
    // execSeed (vindo do Projeto Executivo) tem prioridade ao criar do zero
    if (!init && execSeed?.floors?.length) return execSeed.floors
    const f = init?.floors
    if (!f) return null
    if (typeof f === 'string') { try { return JSON.parse(f) } catch { return null } }
    return Array.isArray(f) ? f : null
  })()
  const [clientId,    setClientId]    = useState(init?.client_id||'')
  const [clientName,  setClientName]  = useState(init?.client_name || execSeed?.client_name || '')
  const [description, setDescription] = useState(init?.description||'')
  const [labor,       setLabor]       = useState(String(init?.labor??''))
  const [proposalCode,setProposalCode]= useState(init?.code||'')
  const [margin,      setMargin]      = useState(100)
  const [floors,      setFloors]      = useState(()=>
    initFloors?.length
      ? initFloors.map(f=>({...f,id:Date.now()+Math.random(),rooms:(f.rooms||[]).map(r=>({...r,id:Date.now()+Math.random()}))}))
      : [mkFloor('Primeiro Pavimento')]
  )
  const [cf, setCf] = useState(0)
  const [cr, setCr] = useState(()=> (!editProposal && execSeed?.floors?.[0]?.rooms?.length) ? 0 : -1)
  const [catFilter, setCatFilter] = useState('all')
  const [hiddenCateg, setHiddenCateg] = useState(new Set()) // categories hidden from proposal output
  const [catSearch, setCatSearch] = useState('')
  const [editingItemPrice, setEditingItemPrice] = useState(null)
  const [showPIN, setShowPIN]   = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const [stockWarnings, setStockWarnings] = useState([])
  const [saved, setSaved] = useState(!!init?.id)
  const [savedMsg, setSavedMsg] = useState('')
  const [sendTargets, setSendTargets] = useState({})
  const [customPhone, setCustomPhone] = useState('')
  const [sendEmail, setSendEmail] = useState('')

  // Modals
  const [showSaveModal,  setShowSaveModal]  = useState(false)
  const [showSendModal,  setShowSendModal]  = useState(false)
  const [laborInput,     setLaborInput]     = useState(String(init?.labor??''))
  const [savedProposal,  setSavedProposal]  = useState(init||null)

  const floor = floors[cf]
  const room  = floor?.rooms[cr]

  // Auto-check stock whenever floors change
  const warnings = checkProposalStock(floors)

  const updFloor = (fi,p) => setFloors(fs=>fs.map((f,i)=>i===fi?{...f,...p}:f))
  const updRoom  = p => setFloors(fs=>fs.map((f,i)=>i===cf?{...f,rooms:f.rooms.map((r,j)=>j===cr?{...r,...p}:r)}:f))
  const updItem  = (k,key,val) => updRoom({items:room.items.map((it,i)=>i===k?{...it,[key]:val}:it)})

  function addFloor(){ const n=FLOOR_NAMES[floors.length]||`${floors.length+1}º`; setFloors(fs=>[...fs,mkFloor(`${n} Pavimento`)]); setCf(floors.length); setCr(-1) }
  function addRoom(name=''){ const nr={...mkRoom(),name}; setFloors(fs=>fs.map((f,i)=>i===cf?{...f,rooms:[...f.rooms,nr]}:f)); setCr((floor?.rooms?.length)||0) }
  function removeRoom(){ setFloors(fs=>fs.map((f,i)=>i===cf?{...f,rooms:f.rooms.filter((_,j)=>j!==cr)}:f)); setCr(Math.max(0,cr-1)) }
  function addItemFromCatalog(item){
    const newItems = [...(room?.items||[]), {name:item.name,code:item.code,qty:'1',sale_price:item.sale_price,cost_price:item.cost_price}]
    const newPrice = newItems.reduce((s,it) => s + (it.sale_price||0) * (parseInt(it.qty)||1), 0)
    updRoom({items: newItems, price: String(newPrice)})
    if(!room?.pitch && item.pitch) updRoom({pitch:item.pitch})
  }
  function removeItem(k){
    const newItems = room.items.filter((_,i)=>i!==k)
    const newPrice = newItems.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1), 0)
    updRoom({items: newItems, price: newPrice > 0 ? String(newPrice) : room.price})
    setSaved(false)
  }

  function genPitch(){ if(!room) return; const key=Object.keys(PITCHES).find(k=>room.name.toLowerCase().includes(k)); const list=PITCHES[key||'sala']; updRoom({pitch:list[Math.floor(Math.random()*list.length)]}) }

  function loadTest(){ setFloors(generateTestHouse(catalog)); setCf(0); setCr(-1) }

  // Apply margin recalculation
  function applyMargin(m) {
    const pct = parseFloat(m) / 100
    if (isNaN(pct)) return
    setFloors(fs => fs.map(f => ({
      ...f,
      rooms: f.rooms.map(r => {
        // Update each item's sale_price based on its cost_price
        const updatedItems = (r.items||[]).map(it => {
          const cost = it.cost_price || catalog.find(c=>c.code===it.code)?.cost_price || 0
          if (!cost) return it
          return { ...it, sale_price: parseFloat((cost * (1 + pct)).toFixed(2)) }
        })
        // Room price = sum of all item sale_price * qty
        const newRoomPrice = updatedItems.reduce((s,it)=>
          s + (it.sale_price||0) * (parseInt(it.qty)||1), 0)
        return { ...r, items: updatedItems, price: newRoomPrice > 0 ? String(newRoomPrice) : r.price }
      })
    })))
    setMargin(parseFloat(m))
  }

  function genCode(){
    const cl=clients.find(c=>c.id===Number(clientId))
    if(cl){ setProposalCode(generateProposalCode(cl)); return }
    if(clientName){ const parts=clientName.trim().split(/[\s&]+/); const l1=(parts[0]||'X')[0].toUpperCase(); const l2=(parts[1]||parts[0]||'X')[0].toUpperCase(); setProposalCode(`${l1}${l2}-${String(Math.floor(1000+Math.random()*9000))}`) }
  }

  function stockStatus(code,qty){ if(!code) return null; const item=stock.find(s=>s.code===code); if(!item) return{type:'unknown',msg:'Não encontrado no estoque'}; const need=parseInt(qty)||1; const avail=item.available??item.qty; if(avail===0) return{type:'zero',msg:`Zerado (estoque: 0)`}; if(avail<need) return{type:'low',msg:`Insuficiente — disponível: ${avail} un.`}; return{type:'ok',msg:`Disponível: ${avail} un.`} }

  function buildProposalObject(status, laborValue){
    const cl=clients.find(c=>c.id===Number(clientId))
    const code=proposalCode||generateProposalCode(cl||{name1:clientName?.[0]||'X',name2:clientName?.split(' ')?.[1]?.[0]||'X'})
    return{
      ...(savedProposal||{}),
      client_id:clientId?Number(clientId):null,
      client_name:cl?`${cl.name1} & ${cl.name2}`:clientName,
      neighborhood:cl?`${cl.neighborhood}${cl.city?', '+cl.city:''}` : '',
      code,
      description,
      status,
      labor:parse(laborValue||labor),
      floors:floors.map(f=>({name:f.name,rooms:f.rooms.map(r=>({name:r.name,icon:r.icon,highlight:r.highlight,pitch:r.pitch,price:parse(r.price),items:(r.items||[]).filter(it=>it.name)}))})),
      valid_days:30,
      planta_data: plantaData,
      exec_doc: execDocData,
    }
  }

  function requirePIN(action) {
    if (checkPINSession()) { Promise.resolve(action()).catch(console.error); return }
    setPinAction(()=>()=>Promise.resolve(action()).catch(console.error))
    setShowPIN(true)
  }

  const [isSaving, setIsSaving] = useState(false)
  const [showPlantaIA, setShowPlantaIA] = useState(false)
  const [showPlantaEditor, setShowPlantaEditor] = useState(false)
  const [plantaData, setPlantaData] = useState(()=> savedProposal?.planta_data || execSeed?.planta_data || null)
  const [execDocData] = useState(()=> savedProposal?.exec_doc || execSeed?.exec_doc || null)
  const [pdfFontSize, setPdfFontSize] = useState(9) // matches buildPDF minimum

  async function handleSaveConfirm(){
    if (isSaving) return
    setIsSaving(true)
    try {
      const p = buildProposalObject('draft', laborInput)
      if (!p.code) p.code = generateProposalCode({name1:p.client_name?.[0]||'X', name2:'X'})
      const before = savedProposal ? {...savedProposal} : null
      const saved2 = await saveProposal(p)
      if (!saved2) throw new Error('Supabase retornou vazio — verifique a conexão')
      setSavedProposal(saved2)
      setProposalCode(saved2.code||p.code)
      setLabor(laborInput)
      setSaved(true)
      try { await auditedSave('orçamentos', before ? 'update' : 'create', saved2, currentUser?.name, before) } catch(e){}
      setShowSaveModal(false)
      onRefresh()
      setSavedMsg('✓ Proposta salva!')
      setTimeout(()=>setSavedMsg(''), 3000)
    } catch(err) {
      console.error('Erro ao salvar proposta:', err)
      alert('Erro ao salvar: ' + (err.message||'Verifique o console F12'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSend(via){
    if(!savedProposal?.id){ alert('Salve a proposta primeiro.'); return }
    const cl=clients.find(c=>c.id===Number(clientId))
    const p=buildProposalObject('sent',labor)
    p.id=savedProposal.id; p.code=proposalCode
    await saveProposal(p); setSavedProposal(p)
    await auditedSave('orçamentos','status_change',p,currentUser?.name,{status:'draft'})
    onRefresh()
    if(via==='whatsapp1'&&cl?.phone1){ const msg=encodeURIComponent(`Olá ${cl.name1}! Segue a proposta RARO Home ${proposalCode}. Qualquer dúvida estou à disposição! Rogério.`); window.open(`https://wa.me/${cl.phone1.replace(/\D/g,'').replace(/^(?!55)/,'55')}?text=${msg}`,'_blank') }
    if(via==='whatsapp2'&&cl?.phone2){ const msg=encodeURIComponent(`Olá ${cl.name2}! Segue a proposta RARO Home ${proposalCode}. Qualquer dúvida estou à disposição! Rogério.`); window.open(`https://wa.me/${cl.phone2.replace(/\D/g,'').replace(/^(?!55)/,'55')}?text=${msg}`,'_blank') }
    setShowSendModal(false)
  }

  function openPDF(admin=false, preview=false){
    try {
      const previewCode = proposalCode || 'PRÉVIA'
      const cl = clients.find(c=>c.id===Number(clientId))
      // Filter out hidden categories; recalculate r.price from visible items so totals are correct
      const floorsFiltered = hiddenCateg.size === 0 ? floors : floors.map(f=>({...f,
        rooms: f.rooms.map(r=>{
          const visItems=(r.items||[]).filter(it=>!hiddenCateg.has(it.category||'Sem categoria'))
          const visPrice=visItems.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
          return {...r, items:visItems, price:String(visPrice)}
        })
      }))
      const html = buildPDF({
        catalog,
        client_name: cl ? `${cl.name1} & ${cl.name2}` : clientName,
        proposal_code: previewCode,
        neighborhood: cl ? `${cl.neighborhood}${cl.city?', '+cl.city:''}` : '',
        date_str: new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
        floors: floorsFiltered, labor:parse(labor), margin, itemFontSize:pdfFontSize,
        client_phone1: cl?.phone1, client_phone2: cl?.phone2
      }, admin)
      // Try window.open with blob
      try {
        const blob = new Blob([html], {type:'text/html;charset=utf-8'})
        const url  = URL.createObjectURL(blob)
        const w    = window.open(url, '_blank')
        if (w) { setTimeout(() => URL.revokeObjectURL(url), 10000); return }
        URL.revokeObjectURL(url)
      } catch(e) {}
      // Fallback: write directly
      const w2 = window.open('', '_blank')
      if (w2) { w2.document.open(); w2.document.write(html); w2.document.close(); return }
      // Last resort: download
      const blob2 = new Blob([html], {type:'text/html;charset=utf-8'})
      const url2  = URL.createObjectURL(blob2)
      const a     = document.createElement('a')
      a.href = url2; a.download = `proposta-${previewCode}.html`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url2), 5000)
    } catch(err) {
      console.error('openPDF error:', err)
      alert('Erro ao gerar proposta: ' + err.message)
    }
  }

  // equipTotal: when categories are hidden, recalculate from items excluding hidden cats
  const equipTotal = hiddenCateg.size === 0
    ? floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parse(r.price),s),0)
    : floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>{
        const visibleItems=(r.items||[]).filter(it=>!hiddenCateg.has(it.category||'Sem categoria'))
        const visibleTotal=visibleItems.reduce((is,it)=>is+(it.sale_price||0)*(parseInt(it.qty)||1),0)
        return rs + (visibleItems.length ? visibleTotal : 0)
      },s),0)
  const grandTotal=equipTotal+parse(labor)
  const selClient=clients.find(c=>c.id===Number(clientId))
  const filteredCatalog=catalog.filter(c=>{
    const matchCat=catFilter==='all'||c.category===catFilter
    const q=catSearch.trim().toLowerCase()
    const matchSearch=!q||(c.name.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)||(c.category||'').toLowerCase().includes(q))
    return matchCat&&matchSearch
  })

  function calcRoomTotal(){ if(!room) return; const total=(room.items||[]).reduce((s,it)=>{ const cp=catalog.find(c=>c.code===it.code); return s+((cp?.sale_price||0)*(parseInt(it.qty)||1)) },0); if(total>0) updRoom({price:String(total)}) }

  return (
    <>
      {execSeed?.floors?.length && !editProposal && (
        <div style={{background:'rgba(124,58,237,0.12)',borderBottom:'1px solid #7C3AED',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text1)'}}>
          <i className="ti ti-brain" style={{color:'#7C3AED',fontSize:18}} aria-hidden/>
          <div style={{flex:1}}>
            <div>Itens importados do <b>Projeto Executivo</b>. Revise os preços e clique em <b>"Salvar proposta"</b> para gravar.</div>
            {/* ITEM 5: Import verification */}
            {(()=>{
              const execItems = execSeed?.markers?.length || 0
              const proposalItems = floors.flatMap(f=>(f.rooms||[]).flatMap(r=>r.items||[])).length
              const execRooms = [...new Set((execSeed?.markers||[]).map(m=>m.room).filter(Boolean))].length
              const proposalRooms = floors.flatMap(f=>f.rooms||[]).length
              const execFloors = execSeed?.floors?.length || 0
              const proposalFloors = floors.length
              const ok = proposalItems===execItems && proposalRooms===execRooms
              if(!execItems) return null
              return <div style={{marginTop:4,display:'flex',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:10,background:proposalItems===execItems?'rgba(22,163,74,0.12)':'rgba(220,38,38,0.12)',color:proposalItems===execItems?'#16A34A':'#DC2626',padding:'1px 6px',borderRadius:4,display:'flex',alignItems:'center',gap:3}}>
                  {proposalItems===execItems?'✓':'⚠'} Itens: {proposalItems}/{execItems}
                </span>
                <span style={{fontSize:10,background:proposalRooms>=execRooms?'rgba(22,163,74,0.12)':'rgba(220,38,38,0.12)',color:proposalRooms>=execRooms?'#16A34A':'#DC2626',padding:'1px 6px',borderRadius:4,display:'flex',alignItems:'center',gap:3}}>
                  {proposalRooms>=execRooms?'✓':'⚠'} Cômodos: {proposalRooms}/{execRooms}
                </span>
                <span style={{fontSize:10,background:proposalFloors>=execFloors?'rgba(22,163,74,0.12)':'rgba(220,38,38,0.12)',color:proposalFloors>=execFloors?'#16A34A':'#DC2626',padding:'1px 6px',borderRadius:4,display:'flex',alignItems:'center',gap:3}}>
                  {proposalFloors>=execFloors?'✓':'⚠'} Pavimentos: {proposalFloors}/{execFloors}
                </span>
                {!ok&&<span style={{fontSize:10,color:'var(--amber)'}}>Verifique se todos os itens foram importados corretamente.</span>}
              </div>
            })()}
          </div>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-title">
          <i className="ti ti-file-invoice" aria-hidden/>
          {editProposal?`Editar #${editProposal.id}`:'Nova proposta'}
          {proposalCode&&<span style={{fontSize:11,color:'var(--accent)',marginLeft:8,fontFamily:'monospace',fontWeight:600}}>{proposalCode}</span>}
          {!saved&&<span style={{fontSize:10,color:'var(--amber)',marginLeft:8}}>(não salvo)</span>}
          {savedMsg&&<span style={{fontSize:11,color:'var(--green)',marginLeft:8,fontWeight:500}}>{savedMsg}</span>}
        </div>
        <div className="topbar-acts">
          {execDocData && (
            <button className="btn" style={{fontSize:11,borderColor:'#0369A1',color:'#0369A1',gap:6}}
              onClick={()=>{
                const w=window.open('','_blank')
                w.document.write(`<html><head><title>Projeto Executivo RARO Home — ${savedProposal?.client_name||clientName||'Cliente'}${savedProposal?.code?' — '+savedProposal.code:''}</title><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"></head><body style="margin:0">${execDocData}<button onclick="window.print()" style="position:fixed;top:10px;right:10px;background:#0EA5E9;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600">Salvar PDF</button></body></html>`)
                w.document.close()
              }} title="Ver o Projeto Executivo salvo">
              <i className="ti ti-file-text" aria-hidden/>Ver Projeto Executivo
            </button>
          )}
          {editProposal && onGenerateExec && false && (
            <button className="btn" style={{fontSize:11,borderColor:'#7C3AED',color:'#7C3AED',gap:6}}
              onClick={()=>onGenerateExec(editProposal)} title="Gerar/Regerar Projeto Executivo">
              <i className="ti ti-brain" aria-hidden/>{execDocData?'Regerar Executivo':'Gerar Projeto Executivo'}
            </button>
          )}
          {plantaData?.image && (
            <button className="btn" style={{fontSize:11,borderColor:'#059669',color:'#059669',gap:6}}
              onClick={()=>setShowPlantaEditor(true)} title="Abrir editor de planta">
              <i className="ti ti-map-pin" aria-hidden/>Editor Planta
            </button>
          )}
          <select style={{fontSize:11,padding:'4px 8px',border:'1px solid #7C3AED',borderRadius:5,color:'#7C3AED',background:'var(--bg)',cursor:'pointer'}}
            value="" onChange={e=>{
              if(!e.target.value) return
              const templates={l2q:templateLinear2q,l3q:templateLinear3q,p2p3q:template2pav3q,p2pg:template2pavGourmet,eduardo:templateEduardoRegina}
              const fn=templates[e.target.value]
              if(fn){ setFloors(fn(catalog)); setCf(0); setCr(-1) }
              e.target.value=""
            }}>
            <option value="">📐 Template...</option>
            <option value="l2q">Linear 2 quartos</option>
            <option value="l3q">Linear 3 quartos</option>
            <option value="p2p3q">2 Pavimentos — 3 quartos</option>
            <option value="p2pg">2 Pavimentos — Gourmet Premium</option>
            <option value="eduardo">Apto. Eduardo & Regina — Copacabana (planta importada)</option>
          </select>
          <button className="btn" onClick={genPitch} disabled={!room} title={!room?"Selecione um cômodo primeiro":"Gerar pitch automático para o cômodo"}><i className="ti ti-wand" aria-hidden/>Pitch</button>
          {/* FONT SIZE CONTROLS for PDF */}
          <div style={{display:'flex',alignItems:'center',gap:3,background:'var(--surf)',border:'1px solid var(--border)',borderRadius:5,padding:'2px 6px'}}>
            <span style={{fontSize:9,color:'var(--text3)',letterSpacing:0.5}}>A</span>
            <button onClick={()=>setPdfFontSize(s=>Math.max(4,s-1))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:13,padding:'0 2px',fontWeight:700}} title="Diminuir fonte PDF">−</button>
            <span style={{fontSize:10,fontWeight:600,color:'var(--accent)',minWidth:20,textAlign:'center'}}>{pdfFontSize}</span>
            <button onClick={()=>setPdfFontSize(s=>Math.min(14,s+1))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:13,padding:'0 2px',fontWeight:700}} title="Aumentar fonte PDF">+</button>
            <span style={{fontSize:11,color:'var(--text3)',letterSpacing:0.5}}>A</span>
          </div>
          {/* SALVAR */}
          <button className="btn" onClick={()=>{ setLaborInput(labor); setShowSaveModal(true) }}>
            <i className="ti ti-device-floppy" aria-hidden/>Salvar proposta
          </button>
          {/* GERAR PROPOSTA PDF */}
          <button className="btn" title="Gerar PDF da proposta (com preço atualizado conforme categorias ocultas)"
            style={{gap:6, color:'#0369A1', borderColor:'#0369A1', position:'relative'}}
            onClick={()=>openPDF(false,false)}>
            <i className="ti ti-file-invoice" aria-hidden/>
            Gerar Proposta
            {hiddenCateg.size>0&&<span style={{position:'absolute',top:-5,right:-5,background:'#F59E0B',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}} title={`${hiddenCateg.size} categoria(s) oculta(s)`}>{hiddenCateg.size}</span>}
          </button>
          {/* ENVIAR */}
          <button className="btn primary" onClick={()=>{ setSendTargets({}); setCustomPhone(''); setSendEmail(''); setShowSendModal(true) }} disabled={!saved} title={!saved?'Salve a proposta primeiro':''}>
            <i className="ti ti-send" aria-hidden/>Enviar
          </button>
        </div>
      </div>

      <div className={`builder mp-${mobilePanel}`} style={{height:'calc(100% - 46px)',display:'flex',gap:0}}>
        {/* Mobile tab bar — só aparece no celular via CSS */}
        <div className="builder-mobile-tabs">
          <button className={mobilePanel==='rooms'?'active':''} onClick={()=>setMobilePanel('rooms')}>
            <i className="ti ti-list" aria-hidden/> Cômodos {floor?.rooms?.length?`(${floor.rooms.length})`:''}
          </button>
          <button className={mobilePanel==='edit'?'active':''} onClick={()=>setMobilePanel('edit')} disabled={!room}>
            <i className="ti ti-edit" aria-hidden/> {room?`Editar: ${room.name||'cômodo'}`:'Editar'}
          </button>
        </div>
        {/* ── STICKY MARGIN PANEL (right side) ── */}
        {(()=>{
          const allItems=floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[])
            .filter(it=>hiddenCateg.size===0||!hiddenCateg.has(it.category||'Sem categoria'))
            .map(it=>({...it,roomName:r.name,floorName:f.name,qty:parseInt(it.qty)||1}))))
          const projCost=allItems.reduce((s,it)=>s+(it.cost_price||0)*it.qty,0)
          const projSale=allItems.reduce((s,it)=>s+(it.sale_price||0)*it.qty,0)
          const projLucro=projSale-projCost
          const projPct=projCost>0?Math.round(projLucro/projCost*100):0
          if(!projCost&&!projSale) return null

          const byCat={}
          allItems.forEach(it=>{
            const cat=it.category||'Outro'
            if(!byCat[cat]) byCat[cat]={cost:0,sale:0,items:[]}
            byCat[cat].cost+=(it.cost_price||0)*it.qty
            byCat[cat].sale+=(it.sale_price||0)*it.qty
            byCat[cat].items.push(it)
          })

          const pC=p=>p>=50?'var(--green)':p>=20?'var(--amber)':'var(--red)'
          const lbl={fontSize:8,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:3,marginTop:8}

          return <div style={{width:230,flexShrink:0,background:'var(--surf)',borderLeft:'1px solid var(--border)',padding:'10px 10px',overflowY:'auto',display:'flex',flexDirection:'column',order:3}}>
            <div style={{fontSize:9,color:'var(--accent)',fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',borderBottom:'2px solid var(--accent)',paddingBottom:5,marginBottom:8}}>Margens ao vivo</div>

            {/* PROJETO */}
            <div style={{background:'rgba(14,165,233,0.08)',borderRadius:5,padding:'7px 8px',border:'1px solid rgba(14,165,233,0.2)',marginBottom:6}}>
              <div style={{fontSize:9,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1,marginBottom:4,fontWeight:600}}>Projeto total</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:1}}><span style={{color:'var(--text3)'}}>Venda</span><b style={{color:'var(--accent)'}}>{fmt(projSale)}</b></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:1}}><span style={{color:'var(--text3)'}}>Custo</span><b>{fmt(projCost)}</b></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}><span style={{color:'var(--text3)'}}>Lucro</span><b style={{color:projLucro>=0?'var(--green)':'var(--red)'}}>{fmt(projLucro)}</b></div>
              <div style={{textAlign:'right',fontSize:16,fontWeight:700,marginTop:3,color:pC(projPct)}}>{projPct}%</div>
            </div>

            {/* POR PAVIMENTO */}
            {floors.filter(f=>(f.rooms||[]).some(r=>parse(r.price)>0)).length>1&&<>
              <div style={lbl}>Por pavimento</div>
              {floors.filter(f=>(f.rooms||[]).some(r=>parse(r.price)>0)).map((f,fi)=>{
                const fC=(f.rooms||[]).flatMap(r=>(r.items||[]).filter(it=>hiddenCateg.size===0||!hiddenCateg.has(it.category||'Sem categoria'))).reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
                const fS=(f.rooms||[]).reduce((s,r)=>s+parse(r.price),0)
                const fP=fC>0?Math.round((fS-fC)/fC*100):0
                return <div key={fi} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:10,color:'var(--text2)',fontWeight:600}}>{f.name.replace(' Pavimento','Pav.')}</span>
                  <div style={{textAlign:'right'}}><div style={{fontSize:9,color:'var(--text3)'}}>{fmt(fS)}</div><b style={{fontSize:10,color:pC(fP)}}>{fP}%</b></div>
                </div>
              })}
            </>}

            {/* POR CÔMODO */}
            <div style={lbl}>Por cômodo</div>
            {floors.flatMap((f,fi)=>(f.rooms||[]).filter(r=>parse(r.price)>0).map((r,ri)=>{
              const rC=(r.items||[]).filter(it=>hiddenCateg.size===0||!hiddenCateg.has(it.category||'Sem categoria')).reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
              const rS=parse(r.price)
              const rP=rC>0?Math.round((rS-rC)/rC*100):0
              return <div key={`${fi}-${ri}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:10,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{r.icon} {r.name||'Sem nome'}</span>
                <b style={{fontSize:10,flexShrink:0,color:pC(rP),marginLeft:4}}>{rP}%</b>
              </div>
            }))}

            {/* POR CATEGORIA + ITENS */}
            <div style={lbl}>Por categoria</div>
            {Object.entries(byCat).sort((a,b)=>b[1].sale-a[1].sale).map(([cat,v])=>{
              const cP=v.cost>0?Math.round((v.sale-v.cost)/v.cost*100):0
              return <div key={cat}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0 2px',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:10,fontWeight:600,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{cat}</span>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:9,color:'var(--text3)'}}>{fmt(v.sale)}</div>
                    <b style={{fontSize:10,color:pC(cP)}}>{cP}%</b>
                  </div>
                </div>
                {v.items.map((it,ii)=>{
                  const iC=(it.cost_price||0)*it.qty
                  const iS=(it.sale_price||0)*it.qty
                  const iP=iC>0?Math.round((iS-iC)/iC*100):0
                  return <div key={ii} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1px 0 1px 10px',borderBottom:'1px solid rgba(200,222,255,0.05)'}}>
                    <span style={{fontSize:9,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:155}}>
                      {it.qty>1&&<span style={{color:'var(--accent)',marginRight:2,fontSize:8}}>{it.qty}×</span>}{it.name}
                    </span>
                    <b style={{fontSize:9,flexShrink:0,color:pC(iP),marginLeft:3}}>{iP}%</b>
                  </div>
                })}
              </div>
            })}
          </div>
        })()}
        {/* ── LEFT PANEL ── */}
        <div className="b-left">
          <div className="b-left-top">
            <div className="flabel" style={{marginBottom:5}}>Cliente</div>
            <select value={clientId} onChange={e=>{setClientId(e.target.value);setClientName('');setProposalCode('');setSaved(false)}} style={{marginBottom:8}}>
              <option value="">Selecionar cliente cadastrado</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name1} & {c.name2} — {c.neighborhood}</option>)}
            </select>
            {!clientId&&<input value={clientName} onChange={e=>{setClientName(e.target.value);setSaved(false)}} placeholder="Ou nome do cliente..." style={{marginBottom:8}}/>}

            {/* Proposal code */}
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              <div style={{flex:1}}>
                <div className="flabel" style={{marginBottom:3}}>ID da proposta {!saved&&<span style={{color:'var(--amber)',fontSize:9}}>(gerado ao salvar)</span>}</div>
                <input value={proposalCode} onChange={e=>setProposalCode(e.target.value)} placeholder="Gerado automaticamente ao salvar" style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:proposalCode?'var(--accent)':'var(--text3)'}} readOnly={!proposalCode}/>
              </div>
            </div>

            {/* Margin */}
            {isAdmin&&<div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 10px',marginBottom:8}}>
              <div className="flabel" style={{marginBottom:4}}>Margem de lucro<span style={{color:'var(--amber)',fontSize:9,marginLeft:4}}>(padrão 100%)</span></div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input type="number" min="0" max="300" value={margin}
                  onChange={e=>setMargin(Number(e.target.value))}
                  style={{width:80,textAlign:'center',fontWeight:600}}/>
                <button className="btn" style={{fontSize:10,padding:'3px 8px'}}
                  onClick={()=>requirePIN(()=>applyMargin(margin))}>
                  <i className="ti ti-lock" aria-hidden/>Aplicar
                </button>
                <span style={{fontSize:12}}>%</span>

              </div>
              <div style={{fontSize:10,color:'var(--amber)',marginTop:4}}>Lucro estimado: {fmt(equipTotal-floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>(rs+(r.items||[]).filter(it=>hiddenCateg.size===0||!hiddenCateg.has(it.category||'Sem categoria')).reduce((is,it)=>(is+(it.cost_price||0)*(parseInt(it.qty)||1)),0)),s),0))}</div>
            </div>}

            {/* WA buttons */}
            {selClient&&<div style={{padding:'7px 9px',background:'var(--surf)',borderRadius:6,border:'1px solid var(--border)',marginTop:4}}>
              <div style={{fontSize:9,fontWeight:600,color:'var(--accent)',marginBottom:5,textTransform:'uppercase',letterSpacing:0.5}}>{selClient.name1} & {selClient.name2}</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {selClient.phone1&&<a href={`https://wa.me/${selClient.phone1.replace(/\D/g,'').replace(/^(?!55)/,'55')}`} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 6px',color:'#16A34A',borderColor:'#16A34A'}}><i className="ti ti-brand-whatsapp" aria-hidden/>WA {selClient.name1}</button></a>}
                {selClient.phone2&&<a href={`https://wa.me/${selClient.phone2.replace(/\D/g,'').replace(/^(?!55)/,'55')}`} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 6px',color:'#16A34A',borderColor:'#16A34A'}}><i className="ti ti-brand-whatsapp" aria-hidden/>WA {selClient.name2}</button></a>}
                {selClient.wa_group_clients&&<a href={selClient.wa_group_clients} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 6px'}}><i className="ti ti-users" aria-hidden/>Grupo</button></a>}
                {selClient.wa_group_obra&&<a href={selClient.wa_group_obra} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 6px'}}><i className="ti ti-tool" aria-hidden/>Obra</button></a>}
              </div>
            </div>}
          </div>

          {/* Floor tabs */}
          <div className="floor-tabs">
            {floors.map((f,i)=><button key={f.id} className={`ftab${cf===i?' active':''}`} onClick={()=>{setCf(i);setCr(-1)}}>{i+1}º Pav</button>)}
            <button className="ftab" onClick={addFloor} style={{borderStyle:'dashed',color:'var(--accent)'}}>+</button>
          </div>
          <div style={{padding:'7px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
            <input value={floor?.name||''} onChange={e=>{updFloor(cf,{name:e.target.value});setSaved(false)}} style={{fontSize:12}} placeholder="Nome do pavimento"/>
          </div>
          {/* Ocultar categorias — faixa minúscula de chips */}
          {(()=>{
            const allCats=[...new Set((floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).map(it=>it.category||'Outros'))))]
            if(!allCats.length) return null
            return <div style={{padding:'3px 8px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
              <i className="ti ti-eye-off" style={{fontSize:9,color:'var(--text3)',flexShrink:0}} aria-hidden title="Ocultar categoria da proposta"/>
              {allCats.map(cat=>{
                const hidden=hiddenCateg.has(cat)
                return <button key={cat}
                  onClick={()=>{const s=new Set(hiddenCateg);if(hidden)s.delete(cat);else s.add(cat);setHiddenCateg(s);setSaved(false)}}
                  title={hidden?`Mostrar ${cat}`:`Ocultar ${cat} da proposta`}
                  style={{fontSize:8,padding:'0px 5px',borderRadius:6,border:'1px solid',cursor:'pointer',
                    fontFamily:'inherit',lineHeight:'16px',
                    borderColor:hidden?'#DC2626':'rgba(0,0,0,0.1)',
                    background:hidden?'rgba(220,38,38,0.07)':'transparent',
                    color:hidden?'#DC2626':'var(--text3)',
                    textDecoration:hidden?'line-through':'none'}}>
                  {cat}
                </button>
              })}
            </div>
          })()}
          <div className="room-list">
            {(floor?.rooms||[]).map((r,i)=><div key={r.id} className={`room-entry${cr===i?' active':''}`} onClick={()=>{setCr(i);setMobilePanel('edit')}}
              style={{position:'relative'}} title={r.name}>
              <div className="room-entry-name">{r.icon} {r.name||`Cômodo ${i+1}`}</div>
              <div className="room-entry-price">{r.price?fmt(parse(r.price)):'–'}</div>
              {/* Ações do cômodo: mover + fundir */}
              <div style={{position:'absolute',right:3,top:'50%',transform:'translateY(-50%)',display:'none',gap:3}}
                className="room-actions">
                {floors.length>1&&<select title="Mover para pavimento"
                  style={{fontSize:9,padding:'1px 2px',borderRadius:3,background:'var(--surf)',color:'var(--text2)',border:'1px solid var(--border)',cursor:'pointer',maxWidth:60}}
                  onChange={e=>{
                    const toFi=parseInt(e.target.value); if(isNaN(toFi)||toFi===cf) return
                    const roomToMove={...r, items:[...(r.items||[])]}
                    setFloors(fs=>fs.map((f,fi)=>{
                      if(fi===cf) return {...f,rooms:f.rooms.filter((_,ri)=>ri!==i)}
                      if(fi===toFi) return {...f,rooms:[...f.rooms,roomToMove]}
                      return f
                    })); setCr(-1); setSaved(false)
                  }}>
                  <option value="">↑ Mover</option>
                  {floors.map((f,fi)=>fi!==cf&&<option key={fi} value={fi}>{f.name}</option>)}
                </select>}
                <select title="Fundir com cômodo"
                  style={{fontSize:9,padding:'1px 2px',borderRadius:3,background:'var(--surf)',color:'var(--text2)',border:'1px solid var(--border)',cursor:'pointer',maxWidth:70}}
                  onChange={async e=>{
                    const ti=parseInt(e.target.value); if(isNaN(ti)||ti===i) return
                    const src2=floor.rooms[i], tgt2=floor.rooms[ti]
                    const msg=`Fundir "${src2.name}" (${(src2.items||[]).length} itens) EM "${tgt2.name}" (${(tgt2.items||[]).length} itens)?\n\nTotal após fusão: ${(src2.items||[]).length+(tgt2.items||[]).length} itens no cômodo "${tgt2.name}".\n\nEssa ação não pode ser desfeita.`
                    if(!window.confirm(msg)) return
                    // Audit log
                    try { await addAuditLog({type:'merge_rooms',user_name:currentUser?.name||'—',
                      before:JSON.stringify({room_src:src2.name,items_src:(src2.items||[]).map(it=>it.name+'×'+(it.qty||1)).join(', '),room_tgt:tgt2.name,items_tgt:(tgt2.items||[]).map(it=>it.name+'×'+(it.qty||1)).join(', ')}),
                      after:JSON.stringify({room_result:tgt2.name,total_items:(src2.items||[]).length+(tgt2.items||[]).length})
                    }) } catch(e){ console.warn('audit merge:',e) }
                    setFloors(fs=>fs.map((f,fi)=>{
                      if(fi!==cf) return f
                      const srcR=f.rooms[i], tgtR=f.rooms[ti]
                      const merged={...tgtR, items:[...(tgtR.items||[]),...(srcR.items||[])],
                        price:String(parse(tgtR.price)+parse(srcR.price))}
                      const newRooms=f.rooms.map((rx,ri)=>ri===ti?merged:rx).filter((_,ri)=>ri!==i)
                      return {...f, rooms:newRooms}
                    })); setCr(i>0?i-1:0); setSaved(false)
                  }}>
                  <option value="">⊕ Fundir</option>
                  {(floor?.rooms||[]).map((rx,ri)=>ri!==i&&<option key={ri} value={ri}>{rx.name}</option>)}
                </select>
                {/* ITEM 4: Separar cômodo — divide os itens em dois cômodos */}
                {(floor?.rooms?.[i]?.items?.length||0) > 1 && <button
                  title="Separar cômodo em dois"
                  onClick={async()=>{
                    const room2=floor.rooms[i]
                    const half=Math.ceil((room2.items||[]).length/2)
                    const nome=window.prompt(`Separar "${room2.name}" em dois.\nNome do NOVO cômodo (vai receber a segunda metade dos ${(room2.items||[]).length} itens):`, room2.name+' 2')
                    if(!nome?.trim()) return
                    const items1=(room2.items||[]).slice(0,half)
                    const items2=(room2.items||[]).slice(half)
                    const price1=items1.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                    const price2=items2.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                    const newRoom={...mkRoom(),name:nome.trim(),items:items2,price:String(price2)}
                    setFloors(fs=>fs.map((f,fi)=>fi!==cf?f:{...f,
                      rooms:[...f.rooms.slice(0,i),{...room2,items:items1,price:String(price1)},...f.rooms.slice(i+1),newRoom]
                    })); setSaved(false)
                    try { await addAuditLog({type:'split_room',user_name:currentUser?.name||'—',
                      before:JSON.stringify({room:room2.name,items:(room2.items||[]).length}),
                      after:JSON.stringify({room1:room2.name,items1:items1.length,room2:nome.trim(),items2:items2.length})
                    }) } catch(e){ console.warn('audit split:',e) }
                  }}
                  style={{background:'none',border:'1px solid rgba(14,165,233,0.3)',borderRadius:3,cursor:'pointer',color:'rgba(14,165,233,0.8)',padding:'1px 4px',fontSize:9,flexShrink:0}}>
                  ⊣ Split
                </button>}
              </div>
            </div>)}
            {(!floor?.rooms||floor.rooms.length===0)&&<div className="empty-state" style={{padding:18}}><i className="ti ti-home" style={{fontSize:20}} aria-hidden/><p>Nenhum cômodo</p></div>}
          </div>
          <div className="b-list-footer">
            <div style={{display:'flex',gap:6}}>
              <select onChange={e=>{if(e.target.value){addRoom(e.target.value);e.target.value='';setSaved(false)}}} style={{flex:1,fontSize:12,padding:'6px 8px'}}>
                <option value="">+ Cômodo comum...</option>
                {COMMON_ROOMS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              <button className="btn primary" style={{padding:'6px 10px',fontSize:11}} onClick={()=>{addRoom('');setSaved(false)}} title="Personalizado"><i className="ti ti-edit" aria-hidden/></button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="b-right">
          <button className="mobile-back-btn" onClick={()=>setMobilePanel('rooms')}>
            <i className="ti ti-arrow-left" aria-hidden/> Voltar aos cômodos
          </button>
          {!room&&<div className="empty-state"><i className="ti ti-mouse" aria-hidden/><p>Selecione ou adicione um cômodo à esquerda</p></div>}
          {room&&<div style={{maxWidth:560}}>

            {/* ── CATALOG SEARCH — topo fixo ── */}
            <div style={{marginBottom:14,padding:'10px 12px',background:'var(--surf)',border:'1px solid var(--border)',borderRadius:6}}>
              <div className="flabel" style={{marginBottom:8,fontSize:12}}>🔍 Buscar no catálogo</div>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                <input
                  value={catSearch}
                  onChange={e=>setCatSearch(e.target.value)}
                  placeholder="Digite nome, código ou categoria..."
                  style={{flex:1,fontSize:14,padding:'9px 13px',border:'1px solid var(--accent)',borderRadius:5,background:'var(--bg)',color:'var(--text1)',minWidth:0,fontFamily:'inherit',outline:'none'}}
                  autoComplete="off"
                />
                {catSearch&&<button onClick={()=>setCatSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:18,padding:'0 4px',flexShrink:0}}>✕</button>}
              </div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{width:'100%',fontSize:12,padding:'7px 10px',border:'1px solid var(--border)',borderRadius:5,background:'var(--bg)',marginBottom:6}}>
                <option value="all">Todas as categorias</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {catSearch&&<div style={{fontSize:10,color:'var(--text3)',marginBottom:6}}>{filteredCatalog.length} resultado(s) para "<b>{catSearch}</b>"</div>}
              <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:5,maxHeight:170,overflowY:'auto',marginTop:7}}>
                {filteredCatalog.length===0
                  ? <div style={{padding:'12px',textAlign:'center',fontSize:11,color:'var(--text3)'}}>Nenhum produto encontrado</div>
                  : filteredCatalog.map(ci=>{ const s=stock.find(sx=>sx.code===ci.code); const avail=s?(s.available??s.qty):null; const sClr=avail===null?'var(--text3)':avail===0?'var(--red)':avail<=2?'var(--amber)':'var(--green)'
                    return <div key={ci.id} onClick={()=>{addItemFromCatalog(ci);setSaved(false)}} style={{padding:'9px 13px',cursor:'pointer',fontSize:14,borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--accent-lt)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div>
                        <div style={{fontWeight:500}}>{ci.name}</div>
                        <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{ci.category} · <span className="mono">{ci.code}</span></div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                        <div style={{fontWeight:600,color:'var(--accent)',fontSize:12}}>R$ {Number(ci.sale_price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                        {isAdmin&&ci.cost_price>0&&<div style={{fontSize:9,color:'var(--text3)'}}>custo: R$ {Number(ci.cost_price).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>}
                        {avail!==null&&<div style={{fontSize:9,color:sClr}}>estoque: {avail}</div>}
                      </div>
                    </div>
                  })
                }
              </div>
            </div>

            <div className="form-row" style={{marginBottom:10}}>
              <div className="fg"><div className="flabel">Nome do cômodo</div><input value={room.name} onChange={e=>{updRoom({name:e.target.value});setSaved(false)}} placeholder="ex: Sala de Estar"/></div>
              <div className="fg" style={{maxWidth:70}}><div className="flabel">Ícone</div><select value={room.icon} onChange={e=>updRoom({icon:e.target.value})}>{ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}</select></div>
            </div>
            <div className="form-row full" style={{marginBottom:10}}>
              <div className="fg"><div className="flabel" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>Pitch<button className="btn" style={{fontSize:10,padding:'2px 7px'}} onClick={genPitch}><i className="ti ti-wand" aria-hidden/>Auto</button></div><input value={room.pitch} onChange={e=>updRoom({pitch:e.target.value})} placeholder="Frase de venda..."/></div>
            </div>

            {/* Items */}
            {(room.items||[]).length>0&&<div style={{marginBottom:10}}>
              <div style={{marginBottom:6}}>
                <div className="flabel">Itens adicionados</div>
              </div>
              {hiddenCateg.size>0 && (()=>{
                const hiddenItems=(room.items||[]).filter(it=>hiddenCateg.has(it.category||'Sem categoria'))
                if(!hiddenItems.length) return null
                return <div style={{fontSize:10,color:'#DC2626',background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:4,padding:'3px 8px',marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
                  <i className="ti ti-eye-off" style={{fontSize:11}} aria-hidden/>
                  {hiddenItems.length} item{hiddenItems.length>1?'s':''} oculto{hiddenItems.length>1?'s':''} neste cômodo
                  <span style={{marginLeft:'auto',color:'rgba(220,38,38,0.6)'}}>
                    {[...new Set(hiddenItems.map(it=>it.category))].join(', ')}
                  </span>
                </div>
              })()}
              <div style={{background:'var(--surf)',border:'1px solid var(--border)',borderRadius:6,padding:8}}>
                {room.items.map((it,k)=>{
                  // Visually dim (but still show) items from hidden categories
                  const isHidden=hiddenCateg.has(it.category||'Sem categoria')
                  const st=stockStatus(it.code,it.qty)
                  const qty=parseInt(it.qty)||1
                  const costUnit=it.cost_price||0
                  const saleUnit=it.sale_price||0
                  const lucroUnit=saleUnit-costUnit
                  const pct=costUnit>0?Math.round((saleUnit-costUnit)/costUnit*100):0

                  // live editing state per item
                  const isEditingThis=editingItemPrice===k
                  const liveMargin=isEditingThis&&editingItemPrice===k

                  return <div key={k} style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid var(--border)',opacity:isHidden?0.35:1,position:'relative'}}>
                    {isHidden&&<div style={{position:'absolute',top:0,right:0,fontSize:8,background:'#DC2626',color:'#fff',borderRadius:3,padding:'1px 4px',display:'flex',alignItems:'center',gap:2}}><i className="ti ti-eye-off" style={{fontSize:8}} aria-hidden/> oculto</div>}
                    {/* Row: name / code / qty / remove */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 72px 44px 24px',gap:5,marginBottom:6,alignItems:'center'}}>
                      <div style={{fontSize:14,fontWeight:500,lineHeight:1.3}}>{it.name}</div>
                      <div className="mono" style={{fontSize:10,color:'var(--text3)',textAlign:'center'}}>{it.code}</div>
                      <input value={it.qty} onChange={e=>{
                        const newQty=e.target.value
                        updItem(k,'qty',newQty)
                        const upd=room.items.map((x,i2)=>i2===k?{...x,qty:newQty}:x)
                        const np=upd.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                        if(np>0) updRoom({price:String(np),items:upd})
                        setSaved(false)
                      }} style={{textAlign:'center',fontSize:12,padding:'4px 5px'}}/>
                      <button onClick={()=>{removeItem(k);setSaved(false)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:13,padding:0}}>✕</button>
                    </div>

                    {/* Margin panel — all 4 fields editable */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,background:'var(--bg)',borderRadius:5,padding:'6px 8px'}}>
                      {/* Compra/un — read only */}
                      <div>
                        <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>Compra/un</div>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>R$ {costUnit.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                      </div>

                      {/* Venda/un — editável */}
                      <div>
                        <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>Venda/un <span style={{color:'var(--accent)',fontSize:8}}>✎</span></div>
                        <input
                          type="number" min="0" step="0.01"
                          value={it.sale_price||0}
                          onChange={e=>{
                            const nv=parseFloat(e.target.value)||0
                            const upd=room.items.map((x,i2)=>i2===k?{...x,sale_price:nv}:x)
                            const np=upd.reduce((s,x)=>s+(x.sale_price||0)*(parseInt(x.qty)||1),0)
                            updRoom({price:String(np),items:upd})
                            setSaved(false)
                          }}
                          style={{width:'100%',fontSize:11,fontWeight:600,color:'var(--accent)',padding:'2px 4px',border:'1px solid var(--border)',borderRadius:3,background:'var(--bg)'}}
                        />
                      </div>

                      {/* Lucro/un — calculado */}
                      <div>
                        <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>Lucro/un</div>
                        <div style={{fontSize:12,fontWeight:600,color:lucroUnit>=0?'var(--green)':'var(--red)'}}>R$ {lucroUnit.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                      </div>

                      {/* Margem % — editável, recalcula venda */}
                      <div>
                        <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>Margem % <span style={{color:'var(--accent)',fontSize:8}}>✎</span></div>
                        <div style={{display:'flex',alignItems:'center',gap:2}}>
                          <input
                            type="number" min="0" max="999" step="1"
                            value={pct}
                            onChange={e=>{
                              const newPct=parseFloat(e.target.value)||0
                              if(costUnit>0){
                                const newSale=parseFloat((costUnit*(1+newPct/100)).toFixed(2))
                                const upd=room.items.map((x,i2)=>i2===k?{...x,sale_price:newSale}:x)
                                const np=upd.reduce((s,x)=>s+(x.sale_price||0)*(parseInt(x.qty)||1),0)
                                updRoom({price:String(np),items:upd})
                                setSaved(false)
                              }
                            }}
                            style={{width:'100%',fontSize:11,fontWeight:700,padding:'2px 4px',border:'1px solid var(--border)',borderRadius:3,background:'var(--bg)',color:pct>=50?'var(--green)':pct>=20?'var(--amber)':'var(--red)'}}
                          />
                          <span style={{fontSize:10,color:'var(--text3)',flexShrink:0}}>%</span>
                        </div>
                      </div>
                    </div>

                    {/* Total line for qty > 1 */}
                    {qty>1&&<div style={{fontSize:10,color:'var(--text3)',marginTop:4,paddingLeft:2}}>
                      ×{qty} → compra <b>R$ {(costUnit*qty).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b> · venda <b style={{color:'var(--accent)'}}>R$ {(saleUnit*qty).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b> · lucro <b style={{color:'var(--green)'}}>R$ {(lucroUnit*qty).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b>
                    </div>}

                    {st&&<div style={{fontSize:10,color:st.type==='ok'?'var(--green)':st.type==='zero'?'var(--red)':'var(--amber)',marginTop:4,display:'flex',alignItems:'center',gap:3}}><i className={`ti ${st.type==='ok'?'ti-check':'ti-alert-triangle'}`} style={{fontSize:10}} aria-hidden/>{st.msg}</div>}
                  </div>
                })}

                {/* Room margin summary — respeita categorias ocultas */}
                {(()=>{
                  const visItems = hiddenCateg.size===0
                    ? (room.items||[])
                    : (room.items||[]).filter(it=>!hiddenCateg.has(it.category||'Sem categoria'))
                  const roomCost=visItems.reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
                  const roomSale=hiddenCateg.size===0
                    ? (parse(room.price)||visItems.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0))
                    : visItems.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                  const roomLucro=roomSale-roomCost
                  const roomPct=roomCost>0?Math.round(roomLucro/roomCost*100):0
                  const hiddenCount=(room.items||[]).length-visItems.length
                  return <div style={{marginTop:8,padding:'8px 10px',background:'rgba(14,165,233,0.07)',borderRadius:5,border:'1px solid rgba(14,165,233,0.25)'}}>
                    <div style={{fontSize:9,color:'var(--accent)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>Resumo do cômodo{hiddenCount>0?' (visível)':''}</span>
                      {hiddenCount>0&&<span style={{fontSize:8,color:'#DC2626',background:'rgba(220,38,38,0.08)',padding:'1px 5px',borderRadius:4}}><i className="ti ti-eye-off" style={{fontSize:8,marginRight:2}} aria-hidden/>{hiddenCount} item{hiddenCount>1?'s':''} oculto{hiddenCount>1?'s':''}</span>}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 80px',gap:6,alignItems:'end'}}>
                      <div><div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Custo</div><div style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>R$ {roomCost.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
                      <div><div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Venda</div><div style={{fontSize:12,fontWeight:600,color:'var(--accent)'}}>R$ {roomSale.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
                      <div><div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Lucro</div><div style={{fontSize:12,fontWeight:600,color:roomLucro>=0?'var(--green)':'var(--red)'}}>R$ {roomLucro.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
                      <div>
                        <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Margem % <span style={{color:'var(--accent)',fontSize:8}}>✎</span></div>
                        <div style={{display:'flex',alignItems:'center',gap:2}}>
                          <input
                            type="number" min="0" max="999" step="1"
                            value={roomPct}
                            onChange={e=>{
                              const newPct=parseFloat(e.target.value)||0
                              const upd=(room.items||[]).map(it=>{
                                if(!it.cost_price) return it
                                return {...it,sale_price:parseFloat((it.cost_price*(1+newPct/100)).toFixed(2))}
                              })
                              const np=upd.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                              updRoom({price:String(np),items:upd})
                              setSaved(false)
                            }}
                            style={{width:46,fontSize:11,fontWeight:700,padding:'2px 4px',border:'1px solid var(--border)',borderRadius:3,color:roomPct>=50?'var(--green)':roomPct>=20?'var(--amber)':'var(--red)'}}
                          />
                          <span style={{fontSize:10,color:'var(--text3)'}}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                })()}
              </div>
            </div>}

            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <input type="checkbox" id="hl" checked={room.highlight} onChange={e=>updRoom({highlight:e.target.checked})} style={{width:'auto',cursor:'pointer',accentColor:'var(--accent)'}}/>
              <label htmlFor="hl" style={{fontSize:12,color:'var(--text2)',cursor:'pointer'}}>Destaque — borda dourada no PDF</label>
            </div>
            {room.pitch&&<div className="pitch-card"><div className="pitch-label">Pitch</div><div className="pitch-text">"{room.pitch}"</div></div>}
            <button className="btn danger" style={{marginTop:14}} onClick={removeRoom}><i className="ti ti-trash" aria-hidden/>Remover cômodo</button>
          </div>}

          {/* Totals + Project Profit Summary */}
          <div style={{maxWidth:560,marginTop:24,borderTop:'1px solid var(--border)',paddingTop:18}}>
            <div className="flabel" style={{marginBottom:8}}>Resumo</div>
            {floors.map((f,fi)=>{ const sub=(f.rooms||[]).reduce((s,r)=>s+parse(r.price),0); return sub>0?<div key={fi} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:12,color:'var(--text2)'}}><span>{f.name}</span><span>{fmt(sub)}</span></div>:null })}
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:12,borderTop:'1px solid var(--border)',marginTop:6,alignItems:'center'}}>
              <span style={{color:'var(--text2)'}}>Mão de obra</span>
              <input value={labor} onChange={e=>{setLabor(e.target.value);setSaved(false)}} style={{width:140,textAlign:'right',fontSize:13,padding:'4px 8px',fontWeight:500}} placeholder="Preenchido ao salvar"/>
            </div>
            <div className="total-bar"><div className="total-label">Total</div><div className="total-value">{fmt(grandTotal)}</div></div>

            {/* Project profit — editável por margem global */}
            {(()=>{
              const projCost=floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.items||[])
                .filter(it=>hiddenCateg.size===0||!hiddenCateg.has(it.category||'Sem categoria'))
                .reduce((is,it)=>is+(it.cost_price||0)*(parseInt(it.qty)||1),0),s),0)
              const projSale=equipTotal
              const projLucro=projSale-projCost
              const projPct=projCost>0?Math.round(projLucro/projCost*100):0
              if(projCost===0) return null
              return <div style={{marginTop:10,padding:'10px 12px',background:'rgba(14,165,233,0.07)',border:'1px solid rgba(14,165,233,0.25)',borderRadius:6}}>
                <div style={{fontSize:9,color:'var(--accent)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Margem do Projeto — Equipamentos (sem M.O.)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 90px',gap:8,alignItems:'end'}}>
                  <div>
                    <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Custo total</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>{fmt(projCost)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Venda total</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--accent)'}}>{fmt(projSale)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Lucro</div>
                    <div style={{fontSize:13,fontWeight:600,color:projLucro>=0?'var(--green)':'var(--red)'}}>{fmt(projLucro)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>Margem % <span style={{color:'var(--accent)',fontSize:8}}>✎</span></div>
                    <div style={{display:'flex',alignItems:'center',gap:3}}>
                      <input
                        type="number" min="0" max="999" step="1"
                        value={projPct}
                        title="Altera margem de todos os itens do projeto"
                        onChange={e=>{
                          const newPct=parseFloat(e.target.value)||0
                          const newFloors=floors.map(f=>({...f,rooms:(f.rooms||[]).map(r=>{
                            const upd=(r.items||[]).map(it=>{
                              if(!it.cost_price) return it
                              return {...it,sale_price:parseFloat((it.cost_price*(1+newPct/100)).toFixed(2))}
                            })
                            const np=upd.reduce((s,it)=>s+(it.sale_price||0)*(parseInt(it.qty)||1),0)
                            return {...r,items:upd,price:np>0?String(np):r.price}
                          })}))
                          setFloors(newFloors)
                          setSaved(false)
                        }}
                        style={{width:52,fontSize:13,fontWeight:700,padding:'3px 5px',border:'1px solid var(--border)',borderRadius:4,color:projPct>=50?'var(--green)':projPct>=20?'var(--amber)':'var(--red)'}}
                      />
                      <span style={{fontSize:11,color:'var(--text3)'}}>%</span>
                    </div>
                  </div>
                </div>
                {floors.length>1&&<div style={{marginTop:8,borderTop:'1px solid var(--border)',paddingTop:8,display:'flex',flexWrap:'wrap',gap:'4px 16px'}}>
                  {floors.map((f,fi)=>{
                    const fCost=(f.rooms||[]).reduce((s,r)=>s+(r.items||[]).reduce((is,it)=>is+(it.cost_price||0)*(parseInt(it.qty)||1),0),0)
                    const fSale=(f.rooms||[]).reduce((s,r)=>s+parse(r.price),0)
                    const fPct=fCost>0?Math.round((fSale-fCost)/fCost*100):0
                    return fSale>0?<div key={fi} style={{fontSize:11,color:'var(--text2)'}}>
                      {f.name.replace(' Pavimento','Pav.')}: <b style={{color:fPct>=50?'var(--green)':fPct>=20?'var(--amber)':'var(--red)'}}>{fPct}%</b>
                    </div>:null
                  })}
                </div>}
              </div>
            })()}

            <div style={{marginTop:10}}><div className="flabel" style={{marginBottom:5}}>Descrição</div><input value={description} onChange={e=>{setDescription(e.target.value);setSaved(false)}} placeholder="ex: Automação completa — 2 pavimentos"/></div>
            {/* Stock warnings */}
            {warnings.length > 0 && (
              <div style={{marginTop:14,background:'rgba(220,38,38,0.05)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:6,padding:'10px 12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <i className="ti ti-alert-triangle" style={{color:'var(--red)',fontSize:14}} aria-hidden/>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--red)'}}>Estoque insuficiente — {warnings.length} item(s) precisam ser comprados</span>
                </div>
                {warnings.map((w,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'5px 0',borderTop:'0.5px solid rgba(220,38,38,0.15)',fontSize:11}}>
                    <div>
                      <div style={{fontWeight:500,color:'var(--ink)'}}>{w.name}</div>
                      <div style={{color:'var(--red)',fontSize:10,marginTop:1}}>{w.msg}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}>
                      <span className={`badge ${w.type==='zero'?'b-red':'b-amber'}`} style={{fontSize:9}}>
                        {w.type==='not_in_stock'?'Sem estoque':`Faltam ${w.shortage}`}
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{fontSize:10,color:'var(--text3)',marginTop:8,paddingTop:6,borderTop:'0.5px solid rgba(220,38,38,0.15)'}}>
                  ⚠ Se aprovado, esses itens precisarão ser comprados antes da instalação. Verifique em Relatórios → Compras pendentes.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SAVE MODAL ── */}
      {showSaveModal&&<div className="modal-overlay"><div className="modal" style={{width:580,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-device-floppy" style={{marginRight:6}} aria-hidden/>Salvar proposta</div>
          <button className="modal-close" onClick={()=>setShowSaveModal(false)}>×</button>
        </div>

        {/* Mão de obra */}
        <div style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',marginBottom:12}}>
          <div className="flabel" style={{marginBottom:6}}>Mão de obra — Instalação e Programação (R$)</div>
          <input type="number" value={laborInput} onChange={e=>setLaborInput(e.target.value)} placeholder="ex: 8000" autoFocus style={{fontSize:16,fontWeight:600,textAlign:'center'}}/>
        </div>

        {/* Margem global — só aplica com PIN explícito */}
        {isAdmin&&<div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
          <div className="flabel" style={{marginBottom:6}}>Forçar margem em todos os itens <span style={{fontSize:10,color:'var(--text3)',fontWeight:400}}>(padrão = preços do catálogo)</span></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="number" min="0" max="500" value={margin}
              onChange={e=>setMargin(Number(e.target.value))}
              style={{width:80,textAlign:'center',fontWeight:600,fontSize:16}}/>
            <span style={{fontSize:12,color:'var(--text3)'}}>%</span>
            <button className="btn primary" style={{fontSize:11,padding:'5px 14px'}}
              onClick={()=>requirePIN(()=>applyMargin(margin))}>
              <i className="ti ti-lock" aria-hidden/>Aplicar com PIN
            </button>
          </div>
          <div style={{fontSize:10,color:'var(--amber)',marginTop:4}}>Requer PIN — sobrescreve preços individuais</div>
        </div>}

        {/* Resumo margens por cômodo / categoria / pavimento */}
        {(()=>{
          const allItems=floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).map(it=>({...it,roomName:r.name,floorName:f.name,qty:parseInt(it.qty)||1}))))
          const projCost=allItems.reduce((s,it)=>s+(it.cost_price||0)*it.qty,0)
          // projSale = sum of room prices (updated by applyMargin)
          const projSale=floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parse(r.price),s),0)
          const projLucro=projSale-projCost
          const projPct=projCost>0?Math.round(projLucro/projCost*100):0
          const byCat={}
          // Use item.sale_price (updated by applyMargin) for category breakdown
          allItems.forEach(it=>{
            const cat=it.category||'Outros'
            if(!byCat[cat])byCat[cat]={cost:0,sale:0}
            byCat[cat].cost+=(it.cost_price||0)*it.qty
            byCat[cat].sale+=(it.sale_price||0)*it.qty
          })
          if(!projCost) return null
          return <div style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',marginBottom:12,fontSize:12}}>
            <div className="flabel" style={{marginBottom:8}}>Resumo de margens</div>
            {floors.length>1&&<>
              <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Por pavimento</div>
              {floors.map((f,fi)=>{
                const fItems=(f.rooms||[]).flatMap(r=>(r.items||[]).map(it=>({...it,qty:parseInt(it.qty)||1})))
                const fCost=fItems.reduce((s,it)=>s+(it.cost_price||0)*it.qty,0)
                const fSale=(f.rooms||[]).reduce((s,r)=>s+parse(r.price),0)
                const fPct=fCost>0?Math.round((fSale-fCost)/fCost*100):0
                return fSale>0?<div key={fi} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontWeight:500}}>{f.name}</span>
                  <span>{fmt(fSale)} · <b style={{color:fPct>=50?'var(--green)':fPct>=20?'var(--amber)':'var(--red)'}}>{fPct}%</b></span>
                </div>:null
              })}
            </>}
            <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginTop:8,marginBottom:4}}>Por cômodo</div>
            {floors.flatMap((f,fi)=>(f.rooms||[]).filter(r=>parse(r.price)>0).map((r,ri)=>{
              const rCost=(r.items||[]).reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
              const rSale=parse(r.price)
              const rPct=rCost>0?Math.round((rSale-rCost)/rCost*100):0
              return <div key={`${fi}-${ri}`} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',color:'var(--text2)'}}>
                <span>{r.icon} {r.name||'Sem nome'}</span>
                <span>{fmt(rSale)} · <b style={{color:rPct>=50?'var(--green)':rPct>=20?'var(--amber)':'var(--red)'}}>{rPct}%</b></span>
              </div>
            }))}
            <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginTop:8,marginBottom:4}}>Por categoria</div>
            {Object.entries(byCat).sort((a,b)=>b[1].sale-a[1].sale).map(([cat,v])=>{
              const pct=v.cost>0?Math.round((v.sale-v.cost)/v.cost*100):0
              return <div key={cat} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',color:'var(--text2)'}}>
                <span>{cat}</span>
                <span>{fmt(v.sale)} · <b style={{color:pct>=50?'var(--green)':pct>=20?'var(--amber)':'var(--red)'}}>{pct}%</b></span>
              </div>
            })}
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:13,marginTop:8,paddingTop:8,borderTop:'2px solid var(--border)'}}>
              <span>Total equipamentos</span>
              <span>{fmt(projSale)} · <span style={{color:projPct>=50?'var(--green)':projPct>=20?'var(--amber)':'var(--red)'}}>{projPct}% margem</span></span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4,color:'var(--text2)'}}>
              <span>+ Mão de obra</span><span>{laborInput?fmt(parse(laborInput)):'—'}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:14,marginTop:4,color:'var(--accent)',borderTop:'1px solid var(--border)',paddingTop:6}}>
              <span>Total geral</span><span>{fmt(projSale+parse(laborInput))}</span>
            </div>
          </div>
        })()}

        {warnings.length > 0 && (
          <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--red)',marginBottom:6}}><i className="ti ti-shopping-cart" aria-hidden/> {warnings.length} item(s) precisarão ser comprados</div>
            {warnings.slice(0,4).map((w,i)=><div key={i} style={{fontSize:10,color:'var(--red)',padding:'2px 0'}}>• {w.name}: {w.msg}</div>)}
            {warnings.length>4&&<div style={{fontSize:10,color:'var(--text3)'}}>... e mais {warnings.length-4}</div>}
          </div>
        )}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn" onClick={()=>setShowSaveModal(false)}>Cancelar</button>
          <button className="btn primary" onClick={handleSaveConfirm}
            disabled={isSaving||laborInput===''||laborInput===null||laborInput===undefined}
            style={{minWidth:130}}>
            {isSaving
              ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/>Salvando...</>
              : <><i className="ti ti-device-floppy" aria-hidden/>Salvar proposta</>}
          </button>
        </div>
      </div></div>}

      {/* ── SEND MODAL ── */}
      {showSendModal&&<div className="modal-overlay"><div className="modal" style={{width:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-brand-whatsapp" style={{marginRight:6,color:'#16A34A'}} aria-hidden/>Enviar proposta</div>
          <button className="modal-close" onClick={()=>setShowSendModal(false)}>×</button>
        </div>
        {!parse(labor)&&<div style={{background:'var(--red-lt)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:'var(--red)'}}>
          <i className="ti ti-alert-circle" aria-hidden/> Mão de obra não preenchida. Salve novamente com o valor.
        </div>}
        <div style={{marginBottom:14,padding:'8px 10px',background:'var(--surf)',borderRadius:6,fontSize:12,color:'var(--text2)',lineHeight:1.7}}>
          Proposta <b style={{color:'var(--accent)',fontFamily:'monospace'}}>{proposalCode}</b>
          {' · '}<b>{selClient?`${selClient.name1} & ${selClient.name2}`:clientName}</b>
          <br/>Total: <b style={{color:'var(--accent)'}}>{fmt(grandTotal)}</b>
        </div>

        {/* WhatsApp numbers from client */}
        <div className="flabel" style={{marginBottom:8}}>WhatsApp — selecione para quem enviar:</div>
        {(()=>{
          const phones = []
          if(selClient?.phone1) phones.push({label:`${selClient.name1}`,phone:selClient.phone1,key:'p1'})
          if(selClient?.phone2) phones.push({label:`${selClient.name2}`,phone:selClient.phone2,key:'p2'})
          return <>
            {phones.length===0&&<div style={{fontSize:12,color:'var(--text3)',marginBottom:12,padding:'8px 12px',background:'var(--surf)',borderRadius:6}}>
              Nenhum telefone cadastrado para este cliente.
            </div>}
            {phones.map(({label,phone,key})=>(
              <label key={key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',marginBottom:8,
                background:sendTargets[key]?'rgba(22,163,74,0.06)':'var(--bg)',
                borderColor:sendTargets[key]?'#16A34A':'var(--border)'}}>
                <input type="checkbox" checked={!!sendTargets[key]}
                  onChange={e=>setSendTargets(t=>({...t,[key]:e.target.checked}))}
                  style={{width:16,height:16,accentColor:'#16A34A',cursor:'pointer'}}/>
                <i className="ti ti-brand-whatsapp" style={{fontSize:18,color:'#16A34A'}} aria-hidden/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:13}}>{label}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{phone}</div>
                </div>
              </label>
            ))}
            {/* Custom WhatsApp field */}
            <div style={{marginBottom:10}}>
              <div className="flabel" style={{marginBottom:6}}>Outro número de WhatsApp:</div>
              <div style={{display:'flex',gap:8}}>
                <input value={customPhone} onChange={e=>setCustomPhone(e.target.value)}
                  placeholder="(21) 99999-9999"
                  style={{flex:1,fontSize:13}}/>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
                  <input type="checkbox" checked={!!sendTargets.custom&&!!customPhone}
                    onChange={e=>setSendTargets(t=>({...t,custom:e.target.checked}))}
                    style={{accentColor:'#16A34A',cursor:'pointer'}}
                    disabled={!customPhone}/>
                  Incluir
                </label>
              </div>
            </div>

            {/* Email field */}
            <div style={{marginBottom:4}}>
              <div className="flabel" style={{marginBottom:6}}>E-mail:</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input value={sendEmail} onChange={e=>setSendEmail(e.target.value)}
                  placeholder={selClient?.email || 'email@exemplo.com'}
                  type="email"
                  style={{flex:1,fontSize:13}}/>
                {(sendEmail||selClient?.email) && (
                  <button className="btn" style={{fontSize:11,color:'var(--accent)',borderColor:'var(--accent)'}}
                    onClick={()=>{
                      openPDF(false, false)
                      setTimeout(()=>{
                        const sub=encodeURIComponent('Proposta RARO Home — '+proposalCode)
                        const body=encodeURIComponent(`Olá!\n\nSegue a proposta RARO Home ${proposalCode}.\nO PDF foi baixado — anexe ao e-mail antes de enviar.\n\nQualquer dúvida estou à disposição!\nRogério | RARO Home\n(21) 98170-9009`)
                        window.open(`mailto:${sendEmail||selClient?.email}?subject=${sub}&body=${body}`)
                      },600)
                    }}>
                    <i className="ti ti-mail" aria-hidden/>Baixar PDF + Abrir e-mail
                  </button>
                )}
              </div>
            </div>
          </>
        })()}

        <div style={{borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
          {/* Send to selected WhatsApps */}
          <button className="btn primary" style={{background:'#16A34A',borderColor:'#16A34A',gap:8}}
            disabled={!Object.values(sendTargets).some(Boolean)||!parse(labor)}
            onClick={async ()=>{
              const cl=clients.find(c=>c.id===Number(clientId))
              const totalVal=(floors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)+parse(labor)
              const totalFmt=`R$ ${totalVal.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
              const msg=encodeURIComponent(`${cl?.name1||clientName}, sua casa vai ser outra. ✨\n\nA proposta RARO Home chegou:\n📋 *${proposalCode}* · 💰 *${totalFmt}*\n\nPDF em anexo — quando quiser conversar, é só chamar.\n\nRogério · RARO Home · (21) 98170-9009`)
              // 1. Download PDF automatically
              openPDF(false, false)
              await new Promise(r=>setTimeout(r,800))
              // 2. Open WhatsApp for each target
              if(sendTargets.p1&&cl?.phone1) window.open(`https://wa.me/${cl.phone1.replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^/,'55')}?text=${msg}`,'_blank')
              if(sendTargets.p2&&cl?.phone2) window.open(`https://wa.me/${cl.phone2.replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^/,'55')}?text=${msg}`,'_blank')
              if(sendTargets.custom&&customPhone) window.open(`https://wa.me/${customPhone.replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^/,'55')}?text=${msg}`,'_blank')
              handleSend('mark')
            }}>
            <i className="ti ti-brand-whatsapp" aria-hidden/>
            Baixar PDF + Enviar WA
          </button>
          <button className="btn" style={{gap:8}} onClick={()=>handleSend('mark')}>
            <i className="ti ti-check" aria-hidden/>Marcar como enviado (sem abrir WA)
          </button>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
          <button className="btn" onClick={()=>setShowSendModal(false)}>Fechar</button>
        </div>
      </div></div>}
      {showPlantaEditor && <PlantaEditor
        floors={floors}
        catalog={catalog}
        savedPlan={plantaData}
        clientPlants={(()=>{ const cl=clients.find(c=>c.id===Number(clientId)); return cl?{medidas:cl.planta_medidas,eletrica:cl.planta_eletrica}:null })()}
        onUpdateFloors={f=>{ setFloors(f); setCf(0); setCr(-1) }}
        onSavePlan={async (data)=>{
          setPlantaData(data)
          // Persiste junto da proposta se já existe
          if (savedProposal?.id) {
            const p = buildProposalObject(status||'draft', labor)
            p.id = savedProposal.id; p.planta_data = data
            const s = await saveProposal(p); setSavedProposal(s)
          }
        }}
        onClose={()=>setShowPlantaEditor(false)}
      />}
      {showPlantaIA && <PlantaIA
        catalog={catalog}
        onImport={(floors)=>{
          setFloors(floors.map(f=>({...f,id:Date.now()+Math.random(),rooms:(f.rooms||[]).map(r=>({...r,id:Date.now()+Math.random()}))})))
          setCf(0); setCr(-1)
        }}
        onClose={()=>setShowPlantaIA(false)}
      />}
      {showPIN&&<PINModal
        onSuccess={()=>{setShowPIN(false);const a=pinAction;setPinAction(null);if(a){Promise.resolve(a()).catch(e=>{console.error(e);alert('Erro: '+e.message)})}}}
        onCancel={()=>{setShowPIN(false);setPinAction(null)}}/>}
    </>
  )
}
