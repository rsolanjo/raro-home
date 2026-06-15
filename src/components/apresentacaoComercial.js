import { LOGO_COVER } from '../logos.js'

// Categorias/itens do RACK que NÃO entram na apresentação comercial
const RACK_EXCLUDE_CATS = new Set(['CPD', 'CPD / Rack', 'CPD/Rack', 'Rack'])
const RACK_EXCLUDE_NAME = /(dream\s*machine|amplificad|switch|rack\b|patch\s*panel|nobreak|no-break|dio\b|nvr\b|receiver|controladora|cloud\s*key|poe)/i

function isRackItem(it){
  const cat = (it.category||'').trim()
  if (RACK_EXCLUDE_CATS.has(cat)) return true
  if (RACK_EXCLUDE_NAME.test(it.name||'')) return true
  return false
}

const CAT_COLORS = {
  'Segurança':'#DC2626','Sonorização':'#BE185D','Som':'#BE185D',
  'Redes':'#0EA5E9','Rede':'#0EA5E9','Automação':'#059669',
  'Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED',
  'CPD / Rack':'#7C3AED','Outros':'#6B7280'
}

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

/**
 * Gera o HTML da apresentação comercial (paleta clara/azul da proposta).
 * Retorna { html, excludedTotal, excludedNames, grandTotal }
 */
export function buildApresentacaoComercial({ clientName, neighborhood, code, floors, execValue, laborByCat, laborTotal, plantaImage }) {
  laborByCat = laborByCat || {}
  laborTotal = laborTotal || 0
  const catTotals = {}
  const catCounts = {}
  const roomRows = []
  let excludedTotal = 0
  const excludedNames = {}

  ;(floors||[]).forEach(fl => {
    ;(fl.rooms||[]).forEach(r => {
      ;(r.items||[]).forEach(it => {
        if (it.name && isRackItem(it)) {
          const val = (it.sale_price||0) * (parseInt(it.qty)||1)
          excludedTotal += val
          excludedNames[it.name] = (excludedNames[it.name]||0) + val
        }
      })
    })
  })

  ;(floors||[]).forEach(fl => {
    ;(fl.rooms||[]).forEach(r => {
      const visItems = (r.items||[]).filter(it => it.name && !isRackItem(it))
      if (!visItems.length) return
      const byCat = {}
      let qty = 0
      visItems.forEach(it => {
        const cat = it.category || 'Outros'
        const val = (it.sale_price||0) * (parseInt(it.qty)||1)
        const q = (parseInt(it.qty)||1)
        qty += q
        byCat[cat] = (byCat[cat]||0) + val
        catTotals[cat] = (catTotals[cat]||0) + val
        catCounts[cat] = (catCounts[cat]||0) + q
      })
      roomRows.push({ floor: fl.name, room: r.name, qty, byCat })
    })
  })

  const norm = c => (c==='Rede'?'Redes': c==='Som'?'Sonorização': c)
  const catTotalsNorm = {}
  Object.entries(catTotals).forEach(([c,v])=>{ const n=norm(c); catTotalsNorm[n]=(catTotalsNorm[n]||0)+v })
  const catCountsNorm = {}
  Object.entries(catCounts).forEach(([c,v])=>{ const n=norm(c); catCountsNorm[n]=(catCountsNorm[n]||0)+v })
  // mão de obra por categoria, normalizada
  const laborNorm = {}
  Object.entries(laborByCat).forEach(([c,v])=>{ const n=norm(c); laborNorm[n]=(laborNorm[n]||0)+parseFloat(v||0) })
  const catEntries = Object.entries(catTotalsNorm).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])

  const cat2Rows = catEntries.map(([cat,val])=>{
    const c = CAT_COLORS[cat]||'#6B7280'
    const mo = laborNorm[cat]||0
    const subtotal = val + mo
    const q = catCountsNorm[cat]||0
    return `<tr>
      <td style="padding:11px 16px;border-bottom:0.5px solid #E8F4FF"><span style="display:inline-flex;align-items:center;gap:10px"><span style="width:10px;height:10px;border-radius:50%;background:${c}"></span><span style="font-weight:500;color:#1E3A5F">${cat}</span></span></td>
      <td style="padding:11px 16px;text-align:center;color:#6B8CAE;border-bottom:0.5px solid #E8F4FF">${q}</td>
      <td style="padding:11px 16px;text-align:right;color:#1E3A5F;border-bottom:0.5px solid #E8F4FF">${fmt(val)}</td>
      <td style="padding:11px 16px;text-align:right;color:#6B8CAE;border-bottom:0.5px solid #E8F4FF">${mo>0?fmt(mo):'·'}</td>
      <td style="padding:11px 16px;text-align:right;font-family:'DM Serif Display',serif;font-size:1.02rem;color:#060B1A;border-bottom:0.5px solid #E8F4FF">${fmt(subtotal)}</td>
    </tr>`
  }).join('')

  // Colunas dinâmicas da tabela 3: só as categorias principais que existem nos dados
  const T3_ALL = ['Automação','Redes','Sonorização','Segurança']
  const t3cats = T3_ALL.filter(k => (catTotalsNorm[k]||0) > 0)
  const t3val = (room,k) => { let s=0; Object.entries(room.byCat).forEach(([c,v])=>{ if(norm(c)===k) s+=v }); return s }
  const cell = (v) => v>0
    ? `<td style="padding:9px 12px;text-align:right;font-size:.82rem;color:#1E3A5F;border-bottom:0.5px solid #E8F4FF">${fmt(v)}</td>`
    : `<td style="padding:9px 12px;text-align:right;color:#B9CCE0;border-bottom:0.5px solid #E8F4FF">·</td>`
  const cat3Rows = roomRows.map(r=>{
    return `<tr>
      <td style="padding:9px 12px;font-size:.8rem;color:#6B8CAE;border-bottom:0.5px solid #E8F4FF">${r.floor}</td>
      <td style="padding:9px 12px;font-weight:500;color:#060B1A;border-bottom:0.5px solid #E8F4FF">${r.room}</td>
      <td style="padding:9px 12px;text-align:center;color:#6B8CAE;border-bottom:0.5px solid #E8F4FF">${r.qty}</td>
      ${t3cats.map(k=>cell(t3val(r,k))).join('')}
    </tr>`
  }).join('')
  const cat3Header = `<th>Pavimento</th><th>Cômodo</th><th style="text-align:center">Qtd Itens</th>`
    + t3cats.map(k=>`<th style="text-align:right">${k}</th>`).join('')
  const cat3ColCount = 3 + t3cats.length

  const grandTotal = catEntries.reduce((s,[,v])=>s+v,0)
  const totalProposta = grandTotal + laborTotal + parseFloat(execValue||0)
  const safeName = (clientName||'cliente').replace(/[^a-zA-Z0-9]/g,'-').toLowerCase()

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Apresentação Comercial · RARO Home · ${clientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
:root{--ink:#060B1A;--ink2:#1E3A5F;--accent:#0EA5E9;--accentdk:#0369A1;--bg:#F5FAFF;--bg2:#E8F4FF;--border:#C8DEFF;--muted:#6B8CAE;--gold:#C9A268}
*{box-sizing:border-box;margin:0;padding:0}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#EAF2FB;color:var(--ink2);font-family:'DM Sans',sans-serif;font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased}
.doc{max-width:210mm;margin:0 auto;background:var(--bg);box-shadow:0 10px 40px rgba(0,0,0,0.12)}
h1,h2,h3{font-family:'DM Serif Display',serif;font-weight:400}
.highlight{color:var(--accent)}

.topbar{background:var(--ink);padding:11px 40px;display:flex;justify-content:space-between;align-items:center}
.topbar .brand{font-family:'DM Serif Display',serif;font-size:1.05rem;letter-spacing:4px;color:#F0F6FF}
.topbar .code{font-size:.7rem;letter-spacing:2px;color:#8FB4D8;font-family:'DM Sans',monospace}

.logo-zone{background:var(--bg);padding:30px 40px 22px;text-align:center;border-bottom:0.5px solid var(--border)}
.logo-zone img{width:120px;height:auto;margin:0 auto 4px;display:block}
.logo-tagline{font-size:9px;letter-spacing:6px;color:var(--accentdk);text-transform:uppercase;font-weight:300}

.client-banner{background:var(--ink);padding:16px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.client-banner .nm{font-family:'DM Serif Display',serif;font-size:1.5rem;color:#F0F6FF}
.client-banner .ttl{font-size:.62rem;letter-spacing:3px;color:var(--accent);text-transform:uppercase;margin-bottom:2px}
.client-banner .meta{font-size:.82rem;color:#8FB4D8;text-align:right}

.container{padding:0 40px}
.section{padding:46px 0;border-bottom:0.5px solid var(--border)}
h2{font-size:2rem;color:var(--accentdk);text-align:center;margin-bottom:.4rem}
.section-sub{text-align:center;color:var(--muted);font-size:1rem;max-width:760px;margin:0 auto 2.4rem}

.experience-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center;margin-top:1.4rem}
.experience-text p{font-size:1rem;margin-bottom:16px;color:var(--ink2)}
.management-features{list-style:none;margin-top:22px}
.management-features li{display:flex;align-items:flex-start;margin-bottom:16px;font-size:.95rem}
.management-features i{color:var(--accent);font-size:1.25rem;margin-right:14px;margin-top:3px;width:24px;text-align:center}
.management-features strong{color:var(--ink)}
.viz-panel{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px}
.viz-panel .vh{font-size:.66rem;letter-spacing:3px;color:var(--accentdk);text-transform:uppercase;margin-bottom:14px}
.viz-row{display:flex;align-items:center;gap:13px;background:#fff;border:0.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:9px}
.viz-row .ic{width:38px;height:38px;border-radius:9px;background:rgba(14,165,233,0.08);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--accentdk);font-size:1rem;flex-shrink:0}
.viz-row b{display:block;font-size:.9rem;color:var(--ink);font-weight:600}
.viz-row span{font-size:.76rem;color:var(--muted)}
.viz-led{width:7px;height:7px;border-radius:50%;background:#059669;margin-left:auto}

.diferencial-intro{text-align:center;color:var(--muted);max-width:820px;margin:0 auto 2.2rem;font-size:1rem}

.sol-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:1.4rem}
.sol-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:24px 26px}
.sol-card .sol-ic{font-size:1.5rem;margin-bottom:12px}
.sol-card h3{font-size:1.08rem;color:var(--ink);margin-bottom:8px}
.sol-card p{font-size:.9rem;color:var(--muted);line-height:1.65}
.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.comp-card{border-radius:14px;padding:26px;border:1px solid var(--border);background:#fff}
.comp-card.pro{background:linear-gradient(165deg,#fff,var(--bg2));border-color:var(--accent)}
.comp-card.retail{background:#FBFCFE}
.comp-card h3{font-size:1.1rem;color:var(--ink);margin-bottom:6px;display:flex;align-items:center;gap:10px}
.comp-card.pro h3 i{color:var(--accent)}.comp-card.retail h3 i{color:#EF4444}
.comp-sub{font-size:.85rem;color:var(--muted);margin-bottom:14px}
.comp-list{list-style:none}
.comp-list li{font-size:.88rem;margin-bottom:12px;padding-left:20px;position:relative;color:var(--ink2)}
.comp-list li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%}
.comp-card.pro .comp-list li::before{background:var(--accent)}
.comp-card.retail .comp-list li::before{background:#EF4444}
.comp-list strong{color:var(--ink)}

.t-block{margin-bottom:38px}
.t-head{font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--accentdk);margin-bottom:6px;display:flex;align-items:center;gap:12px}
.t-head .n{width:30px;height:30px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.85rem;color:var(--accentdk);font-family:'DM Sans',sans-serif;font-weight:600;flex-shrink:0}
.t-desc{color:var(--muted);font-size:.95rem;margin-bottom:18px;max-width:880px}
.t-desc strong{color:var(--ink2)}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden}
thead th{background:var(--bg2);color:var(--accentdk);font-family:'DM Sans',sans-serif;font-weight:600;font-size:.68rem;letter-spacing:1.2px;text-transform:uppercase;padding:12px 12px;text-align:left;border-bottom:1px solid var(--border)}

.exec-card{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;background:linear-gradient(135deg,var(--bg2),#fff);border:1px solid var(--accent);border-radius:14px;padding:26px 30px}
.exec-card .left{flex:1;min-width:260px}
.exec-card .left h3{font-size:1.15rem;color:var(--ink);margin-bottom:6px}
.exec-card .left p{color:var(--muted);font-size:.92rem}
.exec-card .price .lbl{font-size:.66rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase;text-align:right}
.exec-card .price .v{font-family:'DM Serif Display',serif;font-size:2.2rem;color:var(--accentdk);line-height:1.1;text-align:right}
.exec-includes{list-style:none;margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:11px}
.exec-includes li{display:flex;gap:10px;align-items:flex-start;font-size:.9rem;color:var(--muted)}
.exec-includes i{color:var(--accent);margin-top:3px}
.exec-includes strong{color:var(--ink2);font-weight:600}

.grand{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:15px 20px;background:var(--bg2);border:1px solid var(--border);border-radius:10px}
.grand .l{font-size:.74rem;letter-spacing:2px;color:var(--accentdk);text-transform:uppercase;font-weight:600}
.grand .v{font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--ink)}

footer{padding:40px;text-align:center;background:var(--ink)}
footer .brand{font-family:'DM Serif Display',serif;font-size:1.4rem;letter-spacing:6px;color:#F0F6FF;margin-bottom:6px}
footer p{color:#8FB4D8;font-size:.85rem}
footer .gold{color:var(--gold)}

.actionbar{position:fixed;top:18px;right:18px;z-index:999;display:flex;gap:10px}
.actionbar button{display:inline-flex;align-items:center;gap:8px;background:var(--accentdk);color:#fff;border:none;border-radius:100px;padding:11px 20px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:.85rem;cursor:pointer;box-shadow:0 8px 24px rgba(3,105,161,0.3);transition:all .25s}
.actionbar button:hover{background:var(--accent);transform:translateY(-1px)}
.actionbar button i{font-size:.95rem}

@media(max-width:880px){.experience-grid,.comparison-grid,.sol-grid{grid-template-columns:1fr;gap:20px}.exec-includes{grid-template-columns:1fr}.container{padding:0 22px}h2{font-size:1.6rem}table{font-size:.8rem}thead th{padding:9px 7px;font-size:.6rem}}
@media print{
  @page{size:A4;margin:12mm}
  body{background:#fff}
  .doc{box-shadow:none;max-width:none}
  .no-print{display:none!important}
  .section{break-inside:avoid}
  .t-block{break-inside:avoid}
  .comp-card{break-inside:avoid}
}
</style>
</head>
<body>

<div class="actionbar no-print">
  <button onclick="window.print()" title="Salvar como PDF"><i class="fa-solid fa-file-pdf"></i> Salvar PDF</button>
  <button onclick="baixarHTML()" title="Baixar arquivo HTML"><i class="fa-solid fa-code"></i> Baixar HTML</button>
</div>
<script>
function baixarHTML(){
  var clone=document.documentElement.cloneNode(true);
  var bar=clone.querySelector('.actionbar'); if(bar) bar.remove();
  var scr=[].slice.call(clone.querySelectorAll('script')); scr.forEach(function(s){s.remove()});
  var doc='<!DOCTYPE html>'+clone.outerHTML;
  var blob=new Blob([doc],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='apresentacao-raro-${safeName}.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href)},5000);
}
</script>

<div class="doc">

  <div class="topbar">
    <div><span class="brand">RARO HOME</span></div>
    <div class="code">${code||''}</div>
  </div>

  <div class="logo-zone">
    <img src="${LOGO_COVER}" alt="RARO Home"/>
    <div class="logo-tagline">Casa · Tecnologia · Lazer</div>
  </div>

  <div class="client-banner">
    <div><div class="ttl">Apresentação Comercial · Preparada para</div><div class="nm">${clientName}</div></div>
    <div class="meta">${neighborhood||''}</div>
  </div>

  <div class="container">

    <section class="section">
      <h2>A Experiência <span class="highlight">RARO</span></h2>
      <div class="experience-grid">
        <div class="experience-text">
          <p>A verdadeira automação residencial de alto padrão deve ser invisível, intuitiva e à prova de falhas. Na RARO Home, não instalamos apenas tecnologia: entregamos um <strong>sistema centralizado de gestão inteligente</strong> para a sua residência.</p>
          <p>Esqueça a necessidade de abrir dezenas de aplicativos diferentes. Integramos toda a sua casa em um ecossistema único, seguro e de altíssima performance.</p>
          <ul class="management-features">
            <li><i class="fa-brands fa-whatsapp"></i><div><strong>Controle Absoluto via WhatsApp:</strong><br>Acione cenas, verifique luzes esquecidas acesas ou libere acessos conversando diretamente com a sua casa.</div></li>
            <li><i class="fa-solid fa-mobile-screen-button"></i><div><strong>Painel de Gestão Exclusivo:</strong><br>Interfaces elegantes sob medida, acessíveis de qualquer lugar do mundo com resposta em tempo real.</div></li>
            <li><i class="fa-solid fa-shield-halved"></i><div><strong>Estabilidade de Nível Corporativo:</strong><br>Foco em estabilidade contínua. O sistema é projetado para nunca deixar você no escuro.</div></li>
          </ul>
        </div>
        <div class="viz-panel">
          <div class="vh">Painel · Sua casa em tempo real</div>
          <div class="viz-row"><div class="ic"><i class="fa-solid fa-lightbulb"></i></div><div><b>Iluminação &amp; Cenas</b><span>Receber · Jantar · Cinema · Boa noite</span></div><span class="viz-led"></span></div>
          <div class="viz-row"><div class="ic"><i class="fa-solid fa-music"></i></div><div><b>Som Multiroom</b><span>Sala · Gourmet · Varanda</span></div><span class="viz-led"></span></div>
          <div class="viz-row"><div class="ic"><i class="fa-solid fa-video"></i></div><div><b>Câmeras 4K</b><span>Gravação contínua · acesso remoto</span></div><span class="viz-led"></span></div>
          <div class="viz-row"><div class="ic"><i class="fa-solid fa-wifi"></i></div><div><b>Rede Wi-Fi estável</b><span>Sinal forte e estável em todo o imóvel</span></div><span class="viz-led"></span></div>
        </div>
      </div>
    </section>

    ${plantaImage ? `<section class="section">
      <h2>A Sua <span class="highlight">Planta</span></h2>
      <p class="section-sub">O projeto pensado para o seu imóvel, com cada ambiente preparado para a automação.</p>
      <div style="text-align:center"><img src="${plantaImage}" alt="Planta do projeto" style="max-width:100%;max-height:560px;border:1px solid var(--border);border-radius:12px;background:#fff;padding:8px"/></div>
    </section>` : ''}

    <section class="section">
      <h2>Soluções <span class="highlight">Integradas</span></h2>
      <p class="section-sub">Cada frente da sua casa conversa com as outras, em um único sistema pensado para o seu dia a dia.</p>
      <div class="sol-grid">
        <div class="sol-card">
          <div class="sol-ic" style="color:#0EA5E9"><i class="fa-solid fa-wifi"></i></div>
          <h3>Rede &amp; Wi-Fi de Alta Performance</h3>
          <p>Wi-Fi de altíssima velocidade, totalmente gerenciável e com cobertura completa em todo o imóvel, da suíte à área externa. Rede dimensionada por mapa de calor para nunca deixar você na mão, com a mesma estabilidade de redes corporativas.</p>
        </div>
        <div class="sol-card">
          <div class="sol-ic" style="color:#DC2626"><i class="fa-solid fa-video"></i></div>
          <h3>Câmeras Integradas à Automação</h3>
          <p>Câmeras 4K que não ficam isoladas: integram-se ao sistema de automação. Uma câmera pode acender a luz externa ao detectar movimento, disparar uma cena ou avisar você no WhatsApp. Segurança que conversa com a casa inteira.</p>
        </div>
        <div class="sol-card">
          <div class="sol-ic" style="color:#BE185D"><i class="fa-solid fa-music"></i></div>
          <h3>Som Ambiente Multiroom</h3>
          <p>O som certo para cada momento: a trilha imersiva de um filme na sala, a música ambiente no jantar, o clima na área gourmet. Zonas independentes que tocam juntas ou separadas, integradas às cenas de iluminação com um toque.</p>
        </div>
        <div class="sol-card">
          <div class="sol-ic" style="color:#059669"><i class="fa-solid fa-house-signal"></i></div>
          <h3>Automação &amp; Cenas</h3>
          <p>Iluminação, cortinas, climatização e ambientes que respondem a um toque, à sua voz ou ao horário. Cenas como "Cinema", "Jantar" ou "Boa noite" acionam tudo de uma vez, deixando a casa exatamente do jeito que você quer.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>O Nosso Maior <span class="highlight">Diferencial</span></h2>
      <p class="diferencial-intro">Muitos clientes nos questionam: <em>"Por que o investimento em uma automação profissional é diferente de comprar interruptores de varejo na internet?"</em> A resposta está na segurança, na estabilidade e na durabilidade do seu patrimônio.</p>
      <div class="comparison-grid">
        <div class="comp-card pro">
          <h3><i class="fa-solid fa-microchip"></i> Automação Profissional RARO</h3>
          <div class="comp-sub">A escolha para projetos de alto padrão.</div>
          <ul class="comp-list">
            <li><strong>Suporte de Alta Carga:</strong> módulos com relés robustos que suportam a carga real de lustres, fitas LED de potência e motores pesados sem queimar.</li>
            <li><strong>Rede Independente (Zigbee/Matter):</strong> comunicação ultrarrápida via malha própria. Se a internet cair, a sua casa continua funcionando.</li>
            <li><strong>Wi-Fi Livre e Rápido:</strong> os interruptores não usam o seu roteador. Seu Wi-Fi fica livre para TVs 4K e smartphones.</li>
            <li><strong>Design Premium e Customizável:</strong> keypads com acabamento sob medida, em harmonia com a arquitetura, e módulos personalizados (USB na cabeceira, cenas exclusivas).</li>
          </ul>
        </div>
        <div class="comp-card retail">
          <h3><i class="fa-solid fa-triangle-exclamation"></i> Soluções de Varejo (DIY)</h3>
          <div class="comp-sub">Interruptores comuns de baixo custo, focados no público leigo.</div>
          <ul class="comp-list">
            <li><strong>Risco de Sobrecarga:</strong> relés baratos que frequentemente "colam" ou queimam com o pico de iluminações modernas.</li>
            <li><strong>Dependência do Wi-Fi:</strong> cada interruptor disputa espaço no roteador. Se a internet oscila, você não acende uma lâmpada pelo celular.</li>
            <li><strong>Lentidão e Travamentos:</strong> múltiplos dispositivos no Wi-Fi residencial geram atraso frustrante ao apertar um botão.</li>
            <li><strong>Acabamento Genérico:</strong> peças de prateleira sem padronização visual, que destoam de um projeto de interiores pensado nos detalhes.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section" style="border-bottom:none">
      <h2>O Seu <span class="highlight">Investimento</span></h2>
      <p class="section-sub">Transparência total. Veja abaixo o valor do projeto executivo e uma estimativa de investimento por categoria para preparar a sua casa.</p>

      <div class="t-block">
        <div class="t-head"><span class="n">1</span> Valor do Projeto</div>
        <div class="t-desc">Preparar a sua casa para receber a automação mais moderna do mercado começa por um <strong>projeto executivo de engenharia</strong>: o documento que garante que cada ponto, cabo e medida estejam corretos antes da obra. Além do projeto, você conta com um <strong>acompanhamento adicional na sua obra</strong>, garantindo que tudo seja executado conforme o planejado.</div>
        <div class="exec-card">
          <div class="left">
            <h3>Projeto Executivo de Automação + Acompanhamento</h3>
            <p>Engenharia completa da sua casa inteligente, pronta para o arquiteto e o eletricista executarem sem dúvidas.</p>
          </div>
          <div class="price"><div class="lbl">Valor</div><div class="v">${fmt(execValue)}</div></div>
        </div>
        <ul class="exec-includes">
          <li><i class="fa-solid fa-check"></i><div><strong>Planta de pontos numerada:</strong> posição exata e altura de cada equipamento.</div></li>
          <li><i class="fa-solid fa-check"></i><div><strong>Tabelas de cabos e metragens:</strong> rede, som e elétrica, do rack até cada ponto.</div></li>
          <li><i class="fa-solid fa-check"></i><div><strong>Checklists de obra e instalação:</strong> para o eletricista, o arquiteto e a nossa equipe.</div></li>
          <li><i class="fa-solid fa-check"></i><div><strong>Acompanhamento na obra:</strong> diário com foto de cada ponto antes de fechar a parede.</div></li>
          <li><i class="fa-solid fa-check"></i><div><strong>Detalhamento do RACK / CPD:</strong> o cérebro da casa, dimensionado para o seu projeto.</div></li>
          <li><i class="fa-solid fa-check"></i><div><strong>Cronograma por fases:</strong> do projeto à entrega, com você acompanhando cada etapa.</div></li>
        </ul>
      </div>

      <div class="t-block">
        <div class="t-head"><span class="n">2</span> Estimativa de Investimento por Categoria</div>
        <div class="t-desc">Um compilado de valores aproximados por categoria, separando os equipamentos da mão de obra de instalação e programação, para você dimensionar cada frente da sua casa inteligente.</div>
        <table>
          <thead><tr><th>Categoria</th><th style="text-align:center">Itens</th><th style="text-align:right">Equipamentos</th><th style="text-align:right">Mão de obra</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${cat2Rows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#B9CCE0">Sem itens para exibir</td></tr>'}</tbody>
        </table>
      </div>

      <div class="t-block">
        <div class="t-head"><span class="n">3</span> Detalhamento por Ambiente</div>
        <div class="t-desc">Valores aproximados distribuídos por cômodo e por categoria, para você visualizar onde está cada parte do investimento.</div>
        <table>
          <thead><tr>${cat3Header}</tr></thead>
          <tbody>${cat3Rows || `<tr><td colspan="${cat3ColCount}" style="padding:16px;text-align:center;color:#B9CCE0">Sem itens para exibir</td></tr>`}</tbody>
        </table>
        <div class="grand"><span class="l">Total aproximado em equipamentos</span><span class="v">${fmt(grandTotal)}</span></div>
      </div>

      <div class="t-block">
        <div class="t-head"><span class="n">4</span> Resumo do Investimento Total</div>
        <div class="t-desc">O investimento completo para preparar e equipar a sua casa inteligente, somando equipamentos, mão de obra de instalação e o projeto executivo com acompanhamento.</div>
        <table>
          <tbody>
            <tr><td style="padding:12px 18px;color:#1E3A5F;border-bottom:0.5px solid #E8F4FF">Equipamentos (aproximado)</td><td style="padding:12px 18px;text-align:right;color:#060B1A;border-bottom:0.5px solid #E8F4FF">${fmt(grandTotal)}</td></tr>
            <tr><td style="padding:12px 18px;color:#1E3A5F;border-bottom:0.5px solid #E8F4FF">Mão de obra · Instalação e Programação</td><td style="padding:12px 18px;text-align:right;color:#060B1A;border-bottom:0.5px solid #E8F4FF">${fmt(laborTotal)}</td></tr>
            <tr><td style="padding:12px 18px;color:#1E3A5F;border-bottom:0.5px solid #E8F4FF">Projeto Executivo + Acompanhamento</td><td style="padding:12px 18px;text-align:right;color:#060B1A;border-bottom:0.5px solid #E8F4FF">${fmt(execValue)}</td></tr>
          </tbody>
        </table>
        <div class="grand" style="background:var(--ink);border-color:var(--ink);margin-top:12px"><span class="l" style="color:var(--accent)">Investimento Total da Proposta</span><span class="v" style="color:#F0F6FF">${fmt(totalProposta)}</span></div>
      </div>
    </section>

  </div>

  <footer>
    <div class="brand">RARO HOME</div>
    <p class="gold">A excelência mora nos detalhes.</p>
    <p style="margin-top:12px">(21) 98170-9009 · contato@rarohome.com.br · www.rarohome.com.br</p>
  </footer>

</div>
</body>
</html>`

  return { html, excludedTotal, excludedNames, grandTotal }
}
