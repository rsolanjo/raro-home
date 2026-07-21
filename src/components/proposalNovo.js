// ── RARO Home — Proposta (modelo NOVO) ───────────────────────────
// Mesmo dado do buildPDF clássico (floors/rooms/items/labor), visual no
// mold do Projeto Executivo: header escuro, paleta azul/ciano, cards
// auto-contidos com break-inside:avoid (fim da quebra de página doida),
// escalável para N pavimentos. SEM depoimentos fabricados.
import { LOGO_COVER } from '../logos.js'
import { brandLogoCover, brandName, brandTagline, brandPhone, brandEmail, brandSite, brandSocial, isDemo } from '../brand.js'

function parse(s){ return typeof s==='number'?s:parseFloat(String(s||'').replace(/[^\d.,-]/g,'').replace(',','.').replace(/\.(?=.*\.)/g,''))||0 }

const CAT_COLORS={'Segurança':'#DC2626','Sonorização':'#BE185D','Som':'#BE185D','Redes':'#0EA5E9','Rede':'#0EA5E9','Automação':'#059669','Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED','Iluminação':'#CA8A04','Outros':'#6B7280'}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
/* Topo/base pela @page; as LATERAIS ficam na .doc (padding). Motivo: o "Margens" do diálogo de
   impressão zera a margem lateral da @page e o conteúdo COLAVA no edge (Raphael). O padding da
   .doc vale em TODAS as páginas e NÃO depende desse ajuste — margem lateral garantida. */
@page{size:A4;margin:16mm 0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
/* A barra "Salvar como PDF" (no-print) é sticky na tela; SEM esta regra ela imprimia no meio
   das páginas do PDF (Raphael). Mesma regra dos outros documentos (executivo). */
@media print{.no-print{display:none!important}}
.doc{padding:0 16mm}
/* Na tela: vira uma folha A4 centrada (não cola nas bordas da janela, e já mostra a margem real). */
@media screen{
  body{background:#EEF2F7}
  .doc{max-width:210mm;margin:16px auto;padding:16mm;background:#fff;box-shadow:0 2px 18px rgba(11,24,48,.14)}
}
body{font-family:'DM Sans',sans-serif;color:#0B1830;font-size:11px;line-height:1.5}
.serif{font-family:'DM Serif Display',serif}
.mono{font-family:'DM Mono','SFMono-Regular',Menlo,monospace}

/* ── CAPA (sem depoimento) ── */
.cover{page-break-after:always;min-height:calc(297mm - 32mm);display:flex;flex-direction:column}
.cover-mid{flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 2px}
.cover-top{background:#0B1830;color:#fff;border-radius:10px;padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-start}
.cover-ey{font-size:8px;letter-spacing:3px;color:#38BDF8;text-transform:uppercase;font-weight:600}
.cover-logo{width:150px;height:auto;display:block;margin:8px 0 4px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.3))}
.cover-slogan{font-size:8px;letter-spacing:4px;color:rgba(226,240,255,.65);text-transform:uppercase;margin-top:6px}
.cover-planta{margin:20px 2px 0;padding:16px 0 0;border-top:1px solid rgba(226,240,255,.14)}
.cover-planta-lbl{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C9A268;font-weight:600;margin-bottom:10px}
.cover-planta-frame{border:1px solid rgba(201,162,104,.5);padding:8px;background:rgba(255,255,255,.03)}
.cover-planta-frame img{width:100%;max-height:230px;object-fit:contain;display:block}
.cover-planta-cap{font-size:9.5px;color:rgba(226,240,255,.6);margin-top:8px;font-style:italic}
.cover-meta{text-align:right;font-size:9px;color:rgba(226,240,255,.7);line-height:1.9}
.cover-hero{margin:0 2px}
.cover-kick{font-size:9px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;font-weight:600}
.cover-rule{width:44px;height:3px;background:#0EA5E9;border-radius:2px;margin:14px 0 4px}
.cover-h{font-family:'DM Serif Display',serif;font-size:44px;line-height:1.06;color:#0B1830;margin-top:6px}
.cover-h em{font-style:italic;color:#0369A1}
.cover-lead{font-size:12.5px;color:#3D5A80;margin-top:14px;max-width:540px;line-height:1.6}
.cover-band{margin-top:26px;display:flex;gap:12px;flex-wrap:wrap}
.cover-band .bd{background:#0B1830;color:#E4ECF7;border-radius:9px;padding:12px 18px;font-size:11px;display:flex;flex-direction:column;gap:2px}
.cover-band .bd b{font-family:'DM Serif Display',serif;font-size:22px;color:#38BDF8;font-weight:400}
.cover-band .bd.plain{background:#EEF6FF;color:#0B1830;border:1px solid #D1E6F8;justify-content:center;font-weight:500}

/* faixa institucional honesta (substitui os depoimentos) */
.inst{padding-top:18px}
.inst-lbl{font-size:8px;letter-spacing:3px;color:#0369A1;text-transform:uppercase;font-weight:600;border-top:1px solid #D1E6F8;padding-top:14px;margin-bottom:10px}
.inst-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.inst-card{background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:12px 14px}
.inst-card .ic{font-size:14px;color:#0EA5E9}
.inst-card .it{font-family:'DM Serif Display',serif;font-size:13px;color:#0B1830;margin:4px 0 3px}
.inst-card .ib{font-size:10px;color:#5A7599;line-height:1.5}

/* ── HEADER / FOOTER de página ── */
.phead{display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #0EA5E9;padding-bottom:6px;margin-bottom:12px;break-after:avoid}
.phead .brand{font-family:'DM Serif Display',serif;font-size:14px;color:#0B1830}
.phead .brand span{font-size:8px;letter-spacing:2px;color:#5A7599;text-transform:uppercase;display:block;font-family:'DM Sans',sans-serif;margin-top:1px}
.phead .code{font-size:9px;font-family:monospace;color:#0369A1;background:#EEF6FF;border:1px solid #D1E6F8;border-radius:5px;padding:4px 9px}

/* ── PAVIMENTO ── */
.floor{break-before:auto}
.floor-hd{display:flex;align-items:center;gap:10px;margin:14px 0 9px;break-after:avoid}
.floor-hd .num{width:30px;height:30px;border-radius:8px;background:#0B1830;color:#38BDF8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.floor-hd .lbl{font-size:8px;letter-spacing:3px;color:#0EA5E9;text-transform:uppercase;font-weight:600}
.floor-hd .nm{font-family:'DM Serif Display',serif;font-size:17px;color:#0B1830;line-height:1.1}
.rooms{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}

/* ── CÔMODO (card auto-contido, nunca quebra no meio) ── */
.room{flex:1 1 calc(50% - 5px);min-width:calc(50% - 5px);max-width:calc(50% - 5px);
  background:#fff;border:1px solid #D1E6F8;border-radius:9px;overflow:hidden;
  break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column}
.room.hl{border-color:#0EA5E9;box-shadow:inset 3px 0 0 #0EA5E9}
.room-hd{background:#0D1420;color:#E4ECF7;padding:8px 12px;display:flex;align-items:center;gap:8px}
.room-hd .ri{font-size:13px;color:#38BDF8}
.room-hd .rn{font-family:'DM Serif Display',serif;font-size:13.5px;line-height:1.15}
.room-bd{padding:9px 12px 10px}
.itbl{width:100%;border-collapse:collapse}
.itbl td{padding:3px 0;vertical-align:top;border-bottom:.5px solid #EEF4FB}
.itbl tr:last-child td{border-bottom:0}
.it-nm{font-size:10px;color:#22405F;width:64%;line-height:1.4}
.it-cd{font-size:8px;font-family:monospace;color:#7A96B4;text-align:center;width:24%}
.it-qt{font-size:9px;font-weight:700;color:#0EA5E9;text-align:right;width:12%}
.room-pitch{font-family:'DM Serif Display',serif;font-style:italic;font-size:11px;color:#22405F;line-height:1.5;margin-top:8px;padding-top:7px;border-top:.5px solid #E3EDF7}
.room-val{display:flex;justify-content:space-between;align-items:baseline;margin-top:9px;padding-top:8px;border-top:.5px solid #E3EDF7}
.room-val .l{font-size:7px;letter-spacing:2px;color:#7A96B4;text-transform:uppercase;font-weight:600}
.room-val .v{font-family:'DM Serif Display',serif;font-size:15px;color:#0B1830}
.room-cats{display:flex;flex-wrap:wrap;gap:3px;margin-top:8px;padding-top:7px;border-top:.5px solid #E3EDF7}
.rcat{display:inline-flex;align-items:center;gap:3px;font-size:7px;color:#22405F;background:#F7FBFF;border:.5px solid #D8E8F6;border-left-width:2px;border-radius:3px;padding:2px 5px}
.rcat span{font-weight:700;text-transform:uppercase;letter-spacing:.3px}
/* admin */
.room-adm{display:flex;justify-content:space-between;margin-top:9px;padding-top:8px;border-top:.5px solid #E3EDF7;font-size:9px}
.room-adm .a{color:#D97706}.room-adm .b{color:#7C3AED;font-weight:700}.room-adm .c{font-family:'DM Serif Display',serif;font-size:14px;color:#0B1830}

.floor-sub{margin:7px 0 4px;display:flex;justify-content:flex-end;gap:8px;font-size:10px;color:#5A7599}
.floor-sub b{color:#0B1830}

/* ── RESUMO ── */
.summary{break-before:always;padding-top:2px}
.sum-ey{font-size:9px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;font-weight:600;margin-bottom:12px}
.sum-cat{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin-bottom:14px}
.sum-cat .cc{background:#fff;border:1px solid #D1E6F8;border-radius:7px;padding:8px 11px;display:flex;justify-content:space-between;align-items:center}
.sum-cat .cc .k{font-size:7px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600}
.sum-cat .cc .val{font-family:'DM Serif Display',serif;font-size:13px;color:#0B1830}
.sum-pav{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
.sum-pav .pv{background:#fff;border:1px solid #D1E6F8;border-radius:7px;padding:9px 12px}
.sum-pav .pv .pn{font-size:8px;letter-spacing:1.5px;color:#5A7599;text-transform:uppercase;font-weight:600}
.sum-pav .pv .pvv{font-family:'DM Serif Display',serif;font-size:16px;color:#0B1830;margin-top:3px}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #E3EDF7}
.tot-row .tl{font-size:11px;color:#22405F}
.tot-row .tv{font-family:'DM Serif Display',serif;font-size:18px;color:#0B1830}
.tot-main{background:#0B1830;color:#fff;border-radius:9px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
.tot-main .tl{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#9FC4E8;font-weight:600}
.tot-main .tv{font-family:'DM Serif Display',serif;font-size:26px;color:#fff}
.sign{margin-top:22px;break-inside:avoid}
.sign-ey{font-size:8px;letter-spacing:3px;color:#0369A1;text-transform:uppercase;font-weight:600;margin-bottom:16px}
.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:34px}
.sign-f .ln{border-bottom:1.2px solid #0B1830;height:34px}
.sign-f .cap{font-size:8px;letter-spacing:2px;color:#5A7599;text-transform:uppercase;margin-top:6px;font-weight:600}
.contact{margin-top:22px;background:#EEF6FF;border:1px solid #D1E6F8;border-radius:9px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;break-inside:avoid}
.contact .nm{font-family:'DM Serif Display',serif;font-size:13px;color:#0B1830}
.contact .ph{font-size:10px;color:#0369A1;font-weight:600}
.contact .rt{font-size:9px;color:#5A7599;text-align:right;line-height:1.7}
.valid{margin-top:14px;text-align:center;font-size:7.5px;letter-spacing:2px;color:#7A96B4;text-transform:uppercase}
`

export function buildProposalNovo(data, adminMode=false){
  const { client_name, proposal_code, neighborhood, floors=[], labor, date_str, planta_image } = data
  const fmt = v => 'R$\u202f'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const equipTotal = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parse(r.price),s),0)
  const laborVal = parse(labor)
  const grandTotal = equipTotal + laborVal
  const nRooms = floors.reduce((s,f)=>s+(f.rooms||[]).filter(r=>parse(r.price)>0).length,0)
  const FORD={'Primeiro':'1º','Segundo':'2º','Terceiro':'3º','Quarto':'4º','Quinto':'5º','Sexto':'6º'}

  const head = () => `<div class="phead"><div class="brand">${brandName()}<span>${brandTagline()}</span></div><div class="code">${proposal_code}</div></div>`

  const roomCard = r => {
    const rows = (r.items||[]).filter(i=>i.name).map(i=>{
      const qty = parseInt(i.qty)||1
      return `<tr><td class="it-nm">${i.name}</td><td class="it-cd">${i.code||''}</td><td class="it-qt">${qty}</td></tr>`
    }).join('')
    const items = rows ? `<table class="itbl">${rows}</table>` : ''
    const pitch = (r.pitch && !adminMode) ? `<div class="room-pitch">${r.pitch}</div>` : ''
    const catBadges = (()=>{
      const bc={}; (r.items||[]).filter(i=>i.name).forEach(i=>{ const c=i.category||'Outros'; bc[c]=(bc[c]||0)+(i.sale_price||0)*(parseInt(i.qty)||1) })
      const ent=Object.entries(bc).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
      if(!ent.length) return ''
      return `<div class="room-cats">${ent.map(([cat,v])=>{
        const col=CAT_COLORS[cat]||'#6B7280'
        return `<span class="rcat" style="border-left-color:${col}"><span style="color:${col}">${cat}</span> ${fmt(v)}</span>`
      }).join('')}</div>`
    })()
    let foot
    if(adminMode){
      const cost=(r.items||[]).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
      const sale=parse(r.price), mg=cost>0?Math.round((sale-cost)/cost*100):0
      foot=`<div class="room-adm"><span class="a">custo ${fmt(cost)}</span><span class="b">${mg}%</span><span class="c">${fmt(sale)}</span></div>`
    } else {
      foot=`<div class="room-val"><span class="l">Investimento</span><span class="v">${fmt(parse(r.price))}</span></div>`
    }
    return `<div class="room${r.highlight?' hl':''}"><div class="room-hd"><span class="ri">${r.icon||'◈'}</span><span class="rn">${r.name||''}</span></div><div class="room-bd">${items}${pitch}${catBadges}${foot}</div></div>`
  }

  const floorBlock = (fl,fi) => {
    const rooms=(fl.rooms||[]).filter(r=>parse(r.price)>0)
    if(!rooms.length) return ''
    const w=(fl.name||'').split(' ')[0]||''
    const ord=FORD[w]||`${fi+1}º`
    const label=(fl.name||'').includes('Pavimento')?fl.name:`${fl.name||''}`.trim()||`${ord} Pavimento`
    const cards=rooms.map(roomCard).join('')
    const sub=rooms.reduce((s,r)=>s+parse(r.price),0)
    return `<div class="floor">
      <div class="floor-hd"><div class="num">${ord}</div><div><div class="lbl">Pavimento</div><div class="nm">${label}</div></div></div>
      <div class="rooms">${cards}</div>
      <div class="floor-sub">Subtotal ${label}: <b>${fmt(sub)}</b></div>
    </div>`
  }

  // por categoria (venda)
  const catTotals={}
  floors.forEach(fl=>(fl.rooms||[]).forEach(r=>(r.items||[]).forEach(i=>{
    const c=i.category||'Outros'; catTotals[c]=(catTotals[c]||0)+(i.sale_price||0)*(parseInt(i.qty)||1)
  })))
  const catEntries=Object.entries(catTotals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])
  const catBlock = catEntries.length ? `<div class="sum-cat">${catEntries.map(([c,v])=>{
    const col=CAT_COLORS[c]||'#6B7280'
    return `<div class="cc" style="border-left:3px solid ${col}"><span class="k" style="color:${col}">${c}</span><span class="val">${fmt(v)}</span></div>`
  }).join('')}</div>` : ''

  const pavBlock = `<div class="sum-pav">${floors.map((fl,fi)=>{
    const sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0); if(sub<=0) return ''
    const w=(fl.name||'').split(' ')[0]||''; const ord=FORD[w]||`${fi+1}º`
    return `<div class="pv"><div class="pn">${(fl.name||'').includes('Pavimento')?fl.name:`${ord} Pavimento`}</div><div class="pvv">${fmt(sub)}</div></div>`
  }).join('')}</div>`

  const cover = `<div class="cover">
    <div class="cover-top">
      <div>
        <div class="cover-ey">Proposta técnica exclusiva</div>
        <img class="cover-logo" src="${brandLogoCover()}" alt="${brandName()}"/>
        <div class="cover-slogan">Casa · Tecnologia · Lazer</div>
      </div>
      <div class="cover-meta">${date_str}<br/>Válido por 30 dias<br/><span class="mono">${proposal_code}</span></div>
    </div>
    <div class="cover-mid">
      <div class="cover-hero">
        <div class="cover-kick">Projeto de automação de alto padrão</div>
        <div class="cover-rule"></div>
        <div class="cover-h">Projeto <em>${client_name}</em></div>
        <div class="cover-lead">Um sistema pensado ambiente por ambiente, com equipamentos definidos e investimento aberto por cômodo.</div>
        <div class="cover-band">
          <div class="bd"><b>${nRooms}</b>ambiente${nRooms!==1?'s':''}</div>
          <div class="bd"><b>${floors.length}</b>pavimento${floors.length!==1?'s':''}</div>
          <div class="bd plain">${neighborhood||'—'}</div>
        </div>
      </div>
    </div>
    ${planta_image?`<div class="cover-planta">
      <div class="cover-planta-lbl">A planta do projeto</div>
      <div class="cover-planta-frame"><img src="${planta_image}" alt="Planta do projeto"/></div>
      <div class="cover-planta-cap">Cada ambiente pensado antes da obra. O detalhamento por cômodo vem nas próximas páginas.</div>
    </div>`:''}
    <div class="inst">
      <div class="inst-lbl">O que este projeto entrega</div>
      <div class="inst-grid">
        <div class="inst-card"><div class="ic">◈</div><div class="it">Projeto exclusivo</div><div class="ib">Desenhado ambiente a ambiente para esta casa, não um pacote pronto.</div></div>
        <div class="inst-card"><div class="ic">◆</div><div class="it">Tecnologia integrada</div><div class="ib">Zigbee, Matter e Tuya, compatível com Alexa, Google Home e Apple HomeKit.</div></div>
        <div class="inst-card"><div class="ic">◇</div><div class="it">Instalação profissional</div><div class="ib">Execução, programação e treinamento pela própria equipe, sem terceiros.</div></div>
        <div class="inst-card"><div class="ic">◉</div><div class="it">Suporte contínuo</div><div class="ib">Acompanhamento após a entrega, direto pelo WhatsApp.</div></div>
      </div>
    </div>
  </div>`

  const admBadge = adminMode ? ' · VERSÃO ADMIN' : ''
  const summary = `<div class="summary">
    ${head()}
    <div class="sum-ey">Resumo do investimento${admBadge}</div>
    ${pavBlock}
    ${catBlock}
    <div class="tot-row"><span class="tl">Equipamentos — ${floors.length} pavimento${floors.length>1?'s':''}</span><span class="tv">${fmt(equipTotal)}</span></div>
    <div class="tot-row"><span class="tl">Mão de obra — instalação e programação</span><span class="tv">${fmt(laborVal)}</span></div>
    <div class="tot-main"><span class="tl">Investimento total do projeto</span><span class="tv">${fmt(grandTotal)}</span></div>
    <div class="contact">
      <div><div class="nm">${brandName()}</div><div class="ph">${brandPhone()}${isDemo()?'':' · (21) 99627-8553'}</div></div>
      <div class="rt">${brandEmail()}<br/>${brandSocial()} · ${brandSite()}</div>
    </div>
    <div class="valid">© ${brandName()} · ${client_name} · ${proposal_code} · válido por 30 dias</div>
  </div>`

  const floorPages = floors.map(floorBlock).join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${brandName()} — ${client_name} — ${proposal_code}</title><style>${CSS}</style></head><body>
<div class="no-print" style="position:sticky;top:0;z-index:99;background:${adminMode?'#4C1D95':'#0B1830'};color:#F0F6FF;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:12px">
  <span><strong>${brandName()}</strong>${admBadge} — ${client_name} · ${proposal_code}</span>
  <button onclick="window.print()" style="background:#0EA5E9;color:#fff;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">⬇ Salvar como PDF</button>
</div>
<div class="doc">
${cover}
<div>${head()}${floorPages}</div>
${summary}
</div>
</body></html>`
}
