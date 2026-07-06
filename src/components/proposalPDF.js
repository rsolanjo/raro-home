import { getCatalog } from '../db/supabase.js'
import { openHtmlDoc, downloadHtmlDoc } from './openDoc.js'
// ── RARO Home — PDF Builder (shared) ─────────────────────
// Single source of truth for the proposal PDF

import { LOGO_COVER } from '../logos.js'
import { demoWatermark } from '../brand.js'

function parse(s){ return typeof s==='number'?s:parseFloat(String(s||'').replace(/[^\d.,-]/g,'').replace(',','.').replace(/\.(?=.*\.)/g,''))||0 }

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

.logo-zone{padding:20px 28px 14px;display:flex;flex-direction:column;align-items:center;flex-shrink:0;border-bottom:0.5px solid #C8DEFF}
.logo-zone img{height:160px;width:auto;display:block}
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

.pav-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#C8DEFF;margin-bottom:10px}
.pb-full{grid-column:1/-1}
.pb{background:#E8F4FF;padding:10px 12px}
.pb-title{font-size:7px;letter-spacing:2px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;font-weight:600;margin-bottom:4px;padding-bottom:5px;border-bottom:0.5px solid #C8DEFF}
.psub{display:flex;justify-content:space-between;margin-top:5px;padding-top:5px;border-top:1px solid #0EA5E9}
.psl{font-size:6px;letter-spacing:1.5px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;font-weight:600}
.psv{font-family:'DM Serif Display',serif;font-size:13px;color:#060B1A;font-weight:400}

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
      <img src="${LOGO_COVER}" alt="RARO Home" style="height:150px;width:auto;display:block;border-radius:10px"/>
      <div class="logo-tagline">C A S A · T E C N O L O G I A · L A Z E R</div>
      <div class="logo-orn"><div class="lo-l-r"></div><div class="lo-d"></div><div class="lo-l"></div></div>
    </div>
    <div class="hero">
      <div class="hero-ey">P R O P O S T A T É C N I C A E X C L U S I V A</div>
      <div class="hero-h"><em>${client_name}</em></div>
      <div class="hero-lead" style="margin-top:4px">Projeto exclusivo de automação residencial de alto padrão — criado especialmente para você.</div>
    </div>
    <div class="client-banner">
      <div><div class="cb-name" style="font-size:13px;letter-spacing:1px">${neighborhood}</div><div class="cb-id">${proposal_code}</div></div>
      <div class="cb-right"><div class="cb-bairro">${date_str}</div></div>
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
  // Helper: tabela de cômodos com 2 colunas por bloco, colunas limpas
  const roomsTable=(rooms)=>{
    const rows=rooms.map(r=>(
      `<tr style="border-bottom:0.5px solid #E8F4FF">`+
      `<td style="font-size:9px;color:#1E3A5F;padding:5px 8px 5px 0;width:60%">${r.name}</td>`+
      `<td style="font-size:12px;color:#060B1A;text-align:right;padding:5px 0;white-space:nowrap;font-weight:600">${fmt(parse(r.price))}</td>`+
      `</tr>`
    )).join('')
    return `<table style="width:100%;border-collapse:collapse;margin:4px 0">${rows}</table>`
  }
  const isSingle=(floors||[]).length===1
  const pavBlocks=isSingle
    ?(()=>{const fl=(floors||[])[0],sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0);return `<div class="pb pb-full"><div class="pb-title">${fl.name}</div>${roomsTable(fl.rooms||[])}<div class="psub"><span class="psl">Subtotal</span><span class="psv">${fmt(sub)}</span></div></div>`})()
    :(floors||[]).map(fl=>{const sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0);return `<div class="pb"><div class="pb-title">${fl.name}</div>${roomsTable(fl.rooms||[])}<div class="psub"><span class="psl">Subtotal</span><span class="psv">${fmt(sub)}</span></div></div>`}).join('')

  // ── por categoria ─────────────────────────────────────────────
  const catTotals={}
  ;(floors||[]).forEach(fl=>(fl.rooms||[]).forEach(r=>(r.items||[]).forEach(i=>{
    const cat=i.category||'Outros'
    catTotals[cat]=(catTotals[cat]||0)+(i.sale_price||0)*(parseInt(i.qty)||1)
  })))
  const catEntries=Object.entries(catTotals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
  const CAT_COLORS={'Segurança':'#DC2626','Sonorização':'#BE185D','Som':'#BE185D','Redes':'#0EA5E9','Rede':'#0EA5E9','Automação':'#059669','Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED','Outros':'#6B7280'}
  const catBlock=(()=>{
    if(!catEntries.length) return ''
    const fsans='DM Sans,sans-serif', fserif='DM Serif Display,serif'
    const cards=catEntries.map(([cat,val])=>{
      const c=CAT_COLORS[cat]||'#6B7280'
      return `<div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:0.5px solid #C8DEFF;border-radius:4px;padding:8px 11px;border-left:3px solid ${c}">` +
        `<div style="font-size:7px;letter-spacing:1.5px;color:${c};text-transform:uppercase;font-family:${fsans};font-weight:500">${cat}</div>` +
        `<div style="font-family:${fserif};font-size:13px;color:#060B1A">${fmt(val)}</div>` +
        `</div>`
    }).join('')
    return `<div style="margin:8px 0 10px">` +
      `<div style="font-size:7px;letter-spacing:3px;color:#0369A1;text-transform:uppercase;font-family:${fsans};font-weight:500;padding:8px 0 6px;border-top:0.5px solid #C8DEFF">P O R &nbsp; C A T E G O R I A</div>` +
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${cards}</div>` +
      `</div>`
  })()

  const totalPage=`<div class="page page-last">
    ${pageHeader()}${clientMini()}
    <div class="tot-body">
      <div class="tot-ey">R E S U M O D O I N V E S T I M E N T O</div>
      ${adminSummary}
      <div class="pav-grid">${pavBlocks}</div>
      ${catBlock}
      <div class="tr"><span class="tl">Equipamentos — ${(floors||[]).length} Pavimento${(floors||[]).length>1?'s':''}</span><span class="tv">${fmt(equipTotal)}</span></div>
      <div class="tr"><span class="tl">Mão de Obra — Instalação e Programação</span><span class="tv">${fmt(laborVal)}</span></div>
      <div class="tr main"><span class="tl main">I N V E S T I M E N T O T O T A L D O P R O J E T O</span><span class="tv main">${fmt(grandTotal)}</span></div>
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

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>RARO Home — ${client_name} — ${proposal_code}</title><style>${PDF_CSS}${extraCSS}</style></head><body>${demoWatermark()}
<div class="no-print" style="position:sticky;top:0;z-index:99;background:${adminMode?'#4C1D95':'#060B1A'};color:#F0F6FF;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:12px">
  <span><strong>RARO Home</strong>${adminMode?' — VERSÃO ADMIN':''} — ${client_name} · ${proposal_code}</span>
  <button onclick="window.print()" style="background:#8C6D46;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">⬇ Salvar como PDF</button>
</div>
${cover}${roomPagesHtml.join('\n')}${totalPage}
</body></html>`
}



export async function openProposalPDF(proposal, adminMode=false) {
  try {
    const catalog = await getCatalog()
    const floors = (() => {
      const f = proposal.floors
      if (!f) return []
      if (typeof f === 'string') { try { return JSON.parse(f) } catch { return [] } }
      return Array.isArray(f) ? f : []
    })()
    const html = buildPDF({
      catalog,
      client_name:   proposal.client_name || proposal.clientName || '—',
      proposal_code: proposal.code || `#${proposal.id}`,
      neighborhood:  proposal.neighborhood || '',
      date_str:      new Date().toLocaleDateString('pt-BR', {month:'long',year:'numeric'}),
      floors,
      labor:         Number(proposal.labor) || 0,
      itemFontSize:  Number(proposal.itemFontSize) || 9,
      client_phone1: proposal.client_phone1 || '',
      client_phone2: proposal.client_phone2 || '',
    }, adminMode)

    const fname = `proposta-${(proposal.code||proposal.id||'raro').toString().replace(/[\\/:*?"<>|]/g,'')}${adminMode?'-ADMIN':''}.html`
    // _download e visualizar usam o mesmo fluxo: abre com auto-print para gerar PDF
    openHtmlDoc(html, fname)
  } catch(err) {
    console.error('openProposalPDF error:', err)
    alert('Erro ao gerar PDF: ' + err.message)
  }
}
