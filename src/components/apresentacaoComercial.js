import { LOGO_DARK } from '../logos.js'

// Logo com o fundo trocado para combinar EXATAMENTE com o fundo do documento (#0A0F16)
const LOGO_DOC = (()=>{
  try {
    const b64 = LOGO_DARK.split(',')[1]
    const svg = (typeof atob!=='undefined' ? atob(b64) : Buffer.from(b64,'base64').toString('utf8'))
      .replace(/fill="#101828"/i, 'fill="#0A0F16"')  // fundo do rect = fundo do doc
    const enc = (typeof btoa!=='undefined' ? btoa(svg) : Buffer.from(svg,'utf8').toString('base64'))
    return 'data:image/svg+xml;base64,' + enc
  } catch(e) { return LOGO_DARK }
})()

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
 * Gera o HTML da apresentação comercial.
 * @param {object} opts
 * @param {string} opts.clientName - "Eduardo & Regina"
 * @param {string} opts.neighborhood - "Copacabana, Rio de Janeiro"
 * @param {string} opts.code - "ER-9685"
 * @param {Array}  opts.floors - floors da proposta [{name, rooms:[{name, items:[{category,name,sale_price,qty}]}]}]
 * @param {number} opts.execValue - valor do Projeto Executivo (ex: 3000)
 */
export function buildApresentacaoComercial({ clientName, neighborhood, code, floors, execValue }) {
  // ── Agregações por categoria e por cômodo (excluindo itens do rack) ──
  const catTotals = {}
  const roomRows = [] // { floor, room, qty, byCat:{cat:val} }
  let excludedTotal = 0       // soma dos itens de rack excluídos (venda)
  const excludedNames = {}    // { nome: valor } para detalhar no popup

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
        qty += (parseInt(it.qty)||1)
        byCat[cat] = (byCat[cat]||0) + val
        catTotals[cat] = (catTotals[cat]||0) + val
      })
      roomRows.push({ floor: fl.name, room: r.name, qty, byCat })
    })
  })

  // Ordem fixa de categorias para a tabela 3 (as principais)
  const TABLE3_CATS = ['Automação','Redes','Sonorização','Segurança']
  // Normaliza Rede→Redes e Som→Sonorização nas chaves
  const norm = c => (c==='Rede'?'Redes': c==='Som'?'Sonorização': c)
  const catTotalsNorm = {}
  Object.entries(catTotals).forEach(([c,v])=>{ const n=norm(c); catTotalsNorm[n]=(catTotalsNorm[n]||0)+v })

  // Ordena categorias por valor desc para a tabela 2
  const catEntries = Object.entries(catTotalsNorm).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])

  // ── Tabela 2: compilado por categoria ──
  const cat2Rows = catEntries.map(([cat,val])=>{
    const c = CAT_COLORS[cat]||'#6B7280'
    return `<tr>
      <td style="padding:13px 18px"><span style="display:inline-flex;align-items:center;gap:10px"><span style="width:10px;height:10px;border-radius:50%;background:${c}"></span><span style="font-weight:500;color:#E2E8F0">${cat}</span></span></td>
      <td style="padding:13px 18px;text-align:right;font-family:'Cinzel',serif;font-size:1.05rem;color:#C9A268">${fmt(val)}</td>
    </tr>`
  }).join('')

  // ── Tabela 3: pavimento | cômodo | qtd | 4 categorias ──
  const t3 = (room) => {
    const g = (k) => {
      // soma considerando normalização
      let s = 0
      Object.entries(room.byCat).forEach(([c,v])=>{ if(norm(c)===k) s+=v })
      return s
    }
    return { auto:g('Automação'), rede:g('Redes'), som:g('Sonorização'), seg:g('Segurança') }
  }
  const cell = (v) => v>0 ? `<td style="padding:10px 12px;text-align:right;font-size:.82rem;color:#CBD5E1">${fmt(v)}</td>` : `<td style="padding:10px 12px;text-align:right;color:#475569">·</td>`
  const cat3Rows = roomRows.map(r=>{
    const t = t3(r)
    return `<tr>
      <td style="padding:10px 12px;font-size:.8rem;color:#94A3B8">${r.floor}</td>
      <td style="padding:10px 12px;font-weight:500;color:#E2E8F0">${r.room}</td>
      <td style="padding:10px 12px;text-align:center;color:#94A3B8">${r.qty}</td>
      ${cell(t.auto)}${cell(t.rede)}${cell(t.som)}${cell(t.seg)}
    </tr>`
  }).join('')

  // total geral (todas as categorias visíveis)
  const grandTotal = catEntries.reduce((s,[,v])=>s+v,0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Apresentação Comercial · RARO Home · ${clientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
:root{--bg-dark:#0A0F16;--bg-panel:#131A26;--bg-panel2:#0E1622;--text-main:#E2E8F0;--text-muted:#94A3B8;--accent-gold:#C9A268;--accent-gold-hi:#E8CFA0;--accent-blue:#0EA5E9;--line:rgba(201,162,104,0.18);--font-title:'Cinzel',serif;--font-body:'Montserrat',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg-dark);color:var(--text-main);font-family:var(--font-body);line-height:1.6;-webkit-font-smoothing:antialiased}
.container{max-width:1180px;margin:0 auto;padding:0 40px}
h1,h2,h3{font-family:var(--font-title);font-weight:600}
h2{font-size:2.3rem;color:var(--accent-gold);margin-bottom:.5rem;text-align:center;letter-spacing:.5px}
.highlight{color:var(--accent-blue)}
.section-sub{text-align:center;color:var(--text-muted);font-size:1.05rem;max-width:760px;margin:0 auto 3rem}

/* ── Capa / Header ── */
header{padding:70px 0 56px;border-bottom:1px solid var(--line);text-align:center;background:var(--bg-dark)}
header .logo-img{width:130px;height:auto;margin:0 auto 6px;display:block;border-radius:10px}
.brand-name{font-family:var(--font-title);font-size:2.6rem;letter-spacing:14px;color:var(--accent-gold);margin-bottom:6px}
.brand-tag{font-size:.72rem;letter-spacing:5px;color:var(--accent-blue);text-transform:uppercase;margin-bottom:30px}
.client-card{display:inline-block;border:1px solid var(--line);border-radius:14px;padding:20px 44px;margin-top:8px;background:rgba(19,26,38,0.5)}
.client-card .ttl{font-size:.7rem;letter-spacing:3px;color:var(--text-muted);text-transform:uppercase}
.client-card .nm{font-family:var(--font-title);font-size:2rem;color:var(--text-main);margin:4px 0}
.client-card .meta{font-size:.85rem;color:var(--text-muted);letter-spacing:1px}

.section-padding{padding:70px 0}

/* ── Experiência ── */
.experience-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.experience-text p{font-size:1.08rem;margin-bottom:18px}
.management-features{list-style:none;margin-top:26px}
.management-features li{display:flex;align-items:flex-start;margin-bottom:18px;font-size:1rem}
.management-features i{color:var(--accent-blue);font-size:1.4rem;margin-right:15px;margin-top:3px;width:26px;text-align:center}
.viz-panel{background:linear-gradient(165deg,#131F32,#0B1320);border:1px solid var(--line);border-radius:18px;padding:30px;box-shadow:0 24px 60px rgba(0,0,0,0.45)}
.viz-row{display:flex;align-items:center;gap:14px;background:rgba(226,232,240,0.03);border:1px solid rgba(148,163,184,0.1);border-radius:12px;padding:14px 16px;margin-bottom:11px}
.viz-row .ic{width:40px;height:40px;border-radius:10px;background:rgba(201,162,104,0.1);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--accent-gold-hi);font-size:1.1rem;flex-shrink:0}
.viz-row b{display:block;font-size:.95rem;color:var(--text-main);font-family:var(--font-body)}
.viz-row span{font-size:.8rem;color:var(--text-muted)}
.viz-row .st{margin-left:auto;font-size:.7rem;letter-spacing:1px;color:#4ADE80;text-transform:uppercase}
.viz-led{width:7px;height:7px;border-radius:50%;background:#4ADE80;box-shadow:0 0 8px #4ADE80}

/* ── Diferencial ── */
.diferencial-section{padding:70px 0;border-top:1px solid var(--line)}
.diferencial-intro{text-align:center;color:var(--text-muted);max-width:820px;margin:0 auto 3rem;font-size:1.05rem}
.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px}
.comp-card{border-radius:16px;padding:30px;border:1px solid var(--line)}
.comp-card.pro{background:linear-gradient(165deg,rgba(201,162,104,0.08),rgba(19,26,38,0.6));border-color:rgba(201,162,104,0.4)}
.comp-card.retail{background:var(--bg-panel2);border-color:rgba(148,163,184,0.15)}
.comp-card h3{font-size:1.2rem;color:var(--text-main);margin-bottom:6px;display:flex;align-items:center;gap:10px}
.comp-card.pro h3 i{color:var(--accent-gold)}.comp-card.retail h3 i{color:#EF4444}
.comp-list{list-style:none;margin-top:18px}
.comp-list li{font-size:.92rem;margin-bottom:14px;padding-left:22px;position:relative;color:var(--text-muted)}
.comp-list li::before{content:"";position:absolute;left:0;top:9px;width:7px;height:7px;border-radius:50%}
.comp-card.pro .comp-list li::before{background:var(--accent-gold)}
.comp-card.retail .comp-list li::before{background:#EF4444}
.comp-list strong{color:var(--text-main)}

/* ── Investimento (pág 2) ── */
.invest-section{padding:70px 0;border-top:1px solid var(--line);background:radial-gradient(100% 80% at 50% 0%,rgba(14,165,233,0.05),transparent 55%)}
.t-block{margin-bottom:46px}
.t-head{font-family:var(--font-title);font-size:1.4rem;color:var(--accent-gold);margin-bottom:6px;display:flex;align-items:center;gap:12px}
.t-head .n{width:30px;height:30px;border-radius:50%;background:rgba(201,162,104,0.12);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:.9rem;color:var(--accent-gold-hi)}
.t-desc{color:var(--text-muted);font-size:.98rem;margin-bottom:20px;max-width:880px}
table{width:100%;border-collapse:collapse;background:var(--bg-panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}
thead th{background:rgba(201,162,104,0.08);color:var(--accent-gold);font-family:var(--font-body);font-weight:600;font-size:.74rem;letter-spacing:1.5px;text-transform:uppercase;padding:13px 14px;text-align:left;border-bottom:1px solid var(--line)}
tbody tr{border-bottom:1px solid rgba(148,163,184,0.08)}
tbody tr:last-child{border-bottom:none}

/* destaque valor do projeto */
.exec-card{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;background:linear-gradient(135deg,rgba(201,162,104,0.12),rgba(19,26,38,0.5));border:1px solid rgba(201,162,104,0.4);border-radius:16px;padding:28px 32px}
.exec-card .left{flex:1;min-width:260px}
.exec-card .left h3{font-size:1.25rem;color:var(--text-main);margin-bottom:8px}
.exec-card .left p{color:var(--text-muted);font-size:.95rem}
.exec-card .price{text-align:right}
.exec-card .price .lbl{font-size:.7rem;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase}
.exec-card .price .v{font-family:var(--font-title);font-size:2.4rem;color:var(--accent-gold-hi);line-height:1.1}
.exec-includes{list-style:none;margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.exec-includes li{display:flex;gap:10px;align-items:flex-start;font-size:.92rem;color:var(--text-muted)}
.exec-includes i{color:var(--accent-blue);margin-top:3px}
.exec-includes strong{color:var(--text-main);font-weight:500}

.grand{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:16px 20px;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:10px}
.grand .l{font-size:.78rem;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase}
.grand .v{font-family:var(--font-title);font-size:1.5rem;color:var(--accent-gold-hi)}
.note{font-size:.8rem;color:var(--text-muted);margin-top:10px;font-style:italic}

footer{padding:50px 0;text-align:center;border-top:1px solid var(--line);margin-top:30px}
footer .brand-name{font-size:1.7rem;letter-spacing:8px;margin-bottom:8px}
footer p{color:var(--text-muted);font-size:.9rem}

@media(max-width:880px){
  .experience-grid,.comparison-grid{grid-template-columns:1fr;gap:30px}
  .exec-includes{grid-template-columns:1fr}
  .container{padding:0 22px}
  h2{font-size:1.8rem}
  table{font-size:.82rem}
  thead th{padding:10px 8px;font-size:.62rem}
}
@media print{body{background:#fff}.section-padding,.invest-section,.diferencial-section{break-inside:avoid}.no-print{display:none!important}}
.actionbar{position:fixed;top:18px;right:18px;z-index:999;display:flex;gap:10px}
.actionbar button{display:inline-flex;align-items:center;gap:8px;background:var(--accent-gold);color:#0A0F16;border:none;border-radius:100px;padding:11px 20px;font-family:var(--font-body);font-weight:600;font-size:.85rem;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.4);transition:all .25s}
.actionbar button:hover{background:var(--accent-gold-hi);transform:translateY(-1px)}
.actionbar button i{font-size:.95rem}
</style>
</head>
<body>

<!-- Barra de ações (não imprime) -->
<div class="actionbar no-print">
  <button onclick="window.print()" title="Salvar como PDF"><i class="fa-solid fa-file-pdf"></i> Salvar PDF</button>
  <button onclick="baixarHTML()" title="Baixar arquivo HTML"><i class="fa-solid fa-code"></i> Baixar HTML</button>
</div>
<script>
function baixarHTML(){
  var doc='<!DOCTYPE html>'+document.documentElement.outerHTML;
  var bar=doc.match(/<div class=\"actionbar[\\s\\S]*?<\\/script>/);
  if(bar) doc=doc.replace(bar[0],'');
  var blob=new Blob([doc],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='apresentacao-raro-${(clientName||'cliente').replace(/[^a-zA-Z0-9]/g,'-').toLowerCase()}.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href)},5000);
}
</script>

<!-- ══════════ PÁGINA 1 — INSTITUCIONAL ══════════ -->
<header>
  <div class="container">
    <img class="logo-img" src="${LOGO_DOC}" alt="RARO Home"/>
    <div class="brand-name">RARO HOME</div>
    <div class="brand-tag">Casa · Tecnologia · Lazer</div>
    <div class="client-card">
      <div class="ttl">Apresentação Comercial · Preparada para</div>
      <div class="nm">${clientName}</div>
      <div class="meta">${neighborhood||''}${code?' · '+code:''}</div>
    </div>
  </div>
</header>

<main class="container">
  <!-- A Experiência RARO -->
  <section class="section-padding">
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
        <div style="font-size:.7rem;letter-spacing:3px;color:var(--text-muted);text-transform:uppercase;margin-bottom:16px">Painel · Sua casa em tempo real</div>
        <div class="viz-row"><div class="ic"><i class="fa-solid fa-lightbulb"></i></div><div><b>Iluminação &amp; Cenas</b><span>Receber · Jantar · Cinema · Boa noite</span></div><span class="st"><span class="viz-led"></span></span></div>
        <div class="viz-row"><div class="ic"><i class="fa-solid fa-music"></i></div><div><b>Som Multiroom</b><span>Sala · Gourmet · Varanda</span></div><span class="st"><span class="viz-led"></span></span></div>
        <div class="viz-row"><div class="ic"><i class="fa-solid fa-video"></i></div><div><b>Câmeras 4K</b><span>Gravação contínua · acesso remoto</span></div><span class="st"><span class="viz-led"></span></span></div>
        <div class="viz-row"><div class="ic"><i class="fa-solid fa-wifi"></i></div><div><b>Rede Wi-Fi estável</b><span>Sinal forte e estável em todo o imóvel</span></div><span class="st"><span class="viz-led"></span></span></div>
      </div>
    </div>
  </section>

  <!-- Diferencial -->
  <section class="diferencial-section">
    <h2>O Nosso Maior <span class="highlight">Diferencial</span></h2>
    <p class="diferencial-intro">Muitos clientes nos questionam: <em>"Por que o investimento em uma automação profissional é diferente de comprar interruptores de varejo na internet?"</em> A resposta está na segurança, na estabilidade e na durabilidade do seu patrimônio.</p>
    <div class="comparison-grid">
      <div class="comp-card pro">
        <h3><i class="fa-solid fa-microchip"></i> Automação Profissional RARO</h3>
        <p style="margin-bottom:16px;color:var(--text-muted)">A escolha para projetos de alto padrão.</p>
        <ul class="comp-list">
          <li><strong>Suporte de Alta Carga:</strong> módulos com relés robustos que suportam a carga real de lustres, fitas LED de potência e motores pesados sem queimar.</li>
          <li><strong>Rede Independente (Zigbee/Matter):</strong> comunicação ultrarrápida via malha própria. Se a internet cair, a sua casa continua funcionando.</li>
          <li><strong>Wi-Fi Livre e Rápido:</strong> os interruptores não usam o seu roteador. Seu Wi-Fi fica 100% livre para TVs 4K e smartphones.</li>
          <li><strong>Design Premium e Customizável:</strong> keypads com acabamento impecável e módulos sob medida (USB na cabeceira, cenas personalizadas).</li>
        </ul>
      </div>
      <div class="comp-card retail">
        <h3><i class="fa-solid fa-triangle-exclamation"></i> Soluções de Varejo (DIY)</h3>
        <p style="margin-bottom:16px;color:var(--text-muted)">Interruptores comuns de baixo custo, focados no público leigo.</p>
        <ul class="comp-list">
          <li><strong>Risco de Sobrecarga:</strong> relés baratos que frequentemente "colam" ou queimam com o pico de iluminações modernas.</li>
          <li><strong>Dependência do Wi-Fi:</strong> cada interruptor disputa espaço no roteador. Se a internet oscila, você não acende uma lâmpada pelo celular.</li>
          <li><strong>Lentidão e Travamentos:</strong> múltiplos dispositivos no Wi-Fi residencial geram atraso frustrante ao apertar um botão.</li>
          <li><strong>Design Plástico:</strong> acabamentos comuns, incompatíveis com um projeto arquitetônico de alto padrão.</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ══════════ PÁGINA 2 — INVESTIMENTO ══════════ -->
  <section class="invest-section">
    <h2>O Seu <span class="highlight">Investimento</span></h2>
    <p class="section-sub">Transparência total. Veja abaixo o valor do projeto executivo e uma estimativa de investimento por categoria para preparar a sua casa.</p>

    <!-- Tabela 1: Valor do Projeto Executivo -->
    <div class="t-block">
      <div class="t-head"><span class="n">1</span> Valor do Projeto</div>
      <div class="t-desc">Preparar a sua casa para receber a automação mais moderna do mercado começa por um <strong>projeto executivo de engenharia</strong>: o documento que garante que cada ponto, cabo e medida estejam corretos antes da obra. Além do projeto, você conta com um <strong>acompanhamento adicional na sua obra</strong>, garantindo que tudo seja executado conforme o planejado.</div>
      <div class="exec-card">
        <div class="left">
          <h3>Projeto Executivo de Automação + Acompanhamento</h3>
          <p>Engenharia completa da sua casa inteligente, pronta para o arquiteto e o eletricista executarem sem dúvidas.</p>
        </div>
        <div class="price">
          <div class="lbl">Valor</div>
          <div class="v">${fmt(execValue)}</div>
        </div>
      </div>
      <ul class="exec-includes">
        <li><i class="fa-solid fa-check"></i><div><strong>Planta de pontos numerada</strong>: posição exata e altura de cada equipamento.</div></li>
        <li><i class="fa-solid fa-check"></i><div><strong>Tabelas de cabos e metragens</strong>: rede, som e elétrica, do rack até cada ponto.</div></li>
        <li><i class="fa-solid fa-check"></i><div><strong>Checklists de obra e instalação</strong>: para o eletricista, o arquiteto e a nossa equipe.</div></li>
        <li><i class="fa-solid fa-check"></i><div><strong>Acompanhamento na obra</strong>: diário com foto de cada ponto antes de fechar a parede.</div></li>
        <li><i class="fa-solid fa-check"></i><div><strong>Detalhamento do RACK / CPD</strong>: o cérebro da casa, dimensionado para o seu projeto.</div></li>
        <li><i class="fa-solid fa-check"></i><div><strong>Cronograma por fases</strong>: do projeto à entrega, com você acompanhando cada etapa.</div></li>
      </ul>
    </div>

    <!-- Tabela 2: compilado por categoria -->
    <div class="t-block">
      <div class="t-head"><span class="n">2</span> Estimativa de Investimento por Categoria</div>
      <div class="t-desc">Um compilado de valores aproximados por categoria, para você dimensionar o investimento de cada frente da sua casa inteligente.</div>
      <table>
        <thead><tr><th>Categoria</th><th style="text-align:right">Valor aproximado</th></tr></thead>
        <tbody>${cat2Rows || '<tr><td colspan="2" style="padding:16px;text-align:center;color:#475569">Sem itens para exibir</td></tr>'}</tbody>
      </table>
    </div>

    <!-- Tabela 3: por cômodo -->
    <div class="t-block">
      <div class="t-head"><span class="n">3</span> Detalhamento por Ambiente</div>
      <div class="t-desc">Valores aproximados distribuídos por cômodo e por categoria, para você visualizar onde está cada parte do investimento.</div>
      <table>
        <thead><tr>
          <th>Pavimento</th><th>Cômodo</th><th style="text-align:center">Qtd Itens</th>
          <th style="text-align:right">Automação</th><th style="text-align:right">Redes</th>
          <th style="text-align:right">Sonorização</th><th style="text-align:right">Segurança</th>
        </tr></thead>
        <tbody>${cat3Rows || '<tr><td colspan="7" style="padding:16px;text-align:center;color:#475569">Sem itens para exibir</td></tr>'}</tbody>
      </table>
      <div class="grand"><span class="l">Total aproximado em equipamentos</span><span class="v">${fmt(grandTotal)}</span></div>
    </div>
  </section>
</main>

<footer>
  <div class="container">
    <div class="brand-name">RARO HOME</div>
    <p>A excelência mora nos detalhes.</p>
    <p style="margin-top:14px;font-size:.85rem">(21) 98170-9009 · contato@rarohome.com.br · www.rarohome.com.br</p>
  </div>
</footer>

</body>
</html>`

  return { html, excludedTotal, excludedNames, grandTotal }
}
