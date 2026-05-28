// ─── RARO Home — banco local v6 ───────────────────────────
const KEY = 'raro_home_v6'
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null }catch{return null} }
function save(db){ try{ localStorage.setItem(KEY,JSON.stringify(db)) }catch(e){ console.error(e) } }

// ── DEFAULT CATALOG ──────────────────────────────────────
const DEFAULT_CATALOG = [
  // Keypads Prata
  {id:1,code:'QAT42Z1B',name:'Keypad Premium Zigbee 1 Botão Prata',category:'Interruptor',cost_price:220,sale_price:440,pitch:'Acionamento único e discreto na cor prata',buy_link:'',supplier_id:1},
  {id:2,code:'QAT42Z2B',name:'Keypad Premium Zigbee 2 Botões Prata',category:'Interruptor',cost_price:264,sale_price:528,pitch:'2 cenas integradas ao WhatsApp',buy_link:'',supplier_id:1},
  {id:3,code:'QAT42Z3B',name:'Keypad Premium Zigbee 3 Botões Prata',category:'Interruptor',cost_price:286,sale_price:572,pitch:'3 cenas automáticas — jantar, cinema, noite',buy_link:'',supplier_id:1},
  {id:4,code:'QAT44Z6B',name:'Keypad Premium Zigbee 4×4 6 Botões Prata',category:'Interruptor',cost_price:385,sale_price:770,pitch:'6 cenas de automação — total controle da sala',buy_link:'',supplier_id:1},
  // Keypads Preto
  {id:5,code:'QAT42Z1B-PT',name:'Keypad Premium Zigbee 1 Botão Preto',category:'Interruptor',cost_price:220,sale_price:440,pitch:'Acionamento único e discreto na cor preta',buy_link:'',supplier_id:1},
  {id:6,code:'QAT42Z2B-PT',name:'Keypad Premium Zigbee 2 Botões Preto',category:'Interruptor',cost_price:264,sale_price:528,pitch:'2 cenas integradas ao WhatsApp',buy_link:'',supplier_id:1},
  {id:7,code:'QAT42Z3B-PT',name:'Keypad Premium Zigbee 3 Botões Preto',category:'Interruptor',cost_price:286,sale_price:572,pitch:'3 cenas automáticas — design embutido preto',buy_link:'',supplier_id:1},
  {id:8,code:'QAT44Z6B-PT',name:'Keypad Premium Zigbee 4×4 6 Botões Preto',category:'Interruptor',cost_price:385,sale_price:770,pitch:'6 cenas — cinema, jantar, leitura, noite',buy_link:'',supplier_id:1},
  // Módulos
  {id:9,code:'QACZ1LR',name:'Módulo Cortina Zigbee Long Range',category:'Automação',cost_price:132,sale_price:264,pitch:'Automação de cortinas sem fio',buy_link:'',supplier_id:1},
  {id:10,code:'QASZ24R',name:'Sensor Zigbee mmWave 24Ghz Teto',category:'Sensor de Presença',cost_price:308,sale_price:616,pitch:'Detecção de presença de alta precisão no teto',buy_link:'',supplier_id:1},
  {id:11,code:'QASZ2',name:'Sensor Zigbee de Porta',category:'Sensor de Presença',cost_price:94,sale_price:188,pitch:'Automação de abertura e fechamento',buy_link:'',supplier_id:1},
  {id:12,code:'QAIRZPRO',name:'Hub IR Zigbee Teto Embutir',category:'IR / Controle AV',cost_price:308,sale_price:616,pitch:'TV, AC e coifa num único ponto embutido no teto',buy_link:'',supplier_id:1},
  {id:13,code:'QAIRZM2',name:'Hub IR Zigbee Matter',category:'IR / Controle AV',cost_price:308,sale_price:616,pitch:'TV, AC e coifa num único ponto de mesa',buy_link:'',supplier_id:1},
  {id:14,code:'QARZDC1LR',name:'Módulo Zigbee 1CH Long Range',category:'Automação',cost_price:121,sale_price:242,pitch:'Automação de 1 carga sem fio',buy_link:'',supplier_id:1},
  {id:15,code:'QARZ2LR',name:'Módulo Zigbee 2CH Long Range',category:'Automação',cost_price:132,sale_price:264,pitch:'Automação de 2 cargas sem fio',buy_link:'',supplier_id:1},
  {id:16,code:'QARZ3LR',name:'Módulo Zigbee 3CH Long Range',category:'Automação',cost_price:154,sale_price:308,pitch:'Automação de 3 cargas sem fio',buy_link:'',supplier_id:1},
  {id:17,code:'QARZ4LR',name:'Módulo Zigbee 4CH Long Range',category:'Automação',cost_price:176,sale_price:352,pitch:'Automação de 4 cargas sem fio',buy_link:'',supplier_id:1},
  {id:18,code:'QARZDC3LR',name:'Módulo Zigbee 3CH 12V Contato Seco',category:'Automação',cost_price:165,sale_price:330,pitch:'Automação por contato seco — portões e motores',buy_link:'',supplier_id:1},
  {id:19,code:'QAGPM2',name:'Gateway Zigbee Matter Wi-Fi Cabeado PoE',category:'CPD / Rack',cost_price:520,sale_price:1040,pitch:'Cérebro da automação — controle total de qualquer lugar',buy_link:'',supplier_id:1},
  // Tomadas e acessórios Prata
  {id:20,code:'QAMT20B',name:'Tomada 20A Prata',category:'Tomada',cost_price:24,sale_price:48,pitch:'Tomada de alta corrente para equipamentos premium',buy_link:'',supplier_id:1},
  {id:21,code:'QAMLB',name:'Módulo Cego Prata',category:'Tomada',cost_price:11,sale_price:16.5,pitch:'Acabamento elegante na cor prata',buy_link:'',supplier_id:1},
  {id:22,code:'QAM42B',name:'Placa 4×2 Prata',category:'Tomada',cost_price:32,sale_price:48,pitch:'Placa de acabamento 4×2 prata',buy_link:'',supplier_id:1},
  {id:23,code:'QAMP2B',name:'Pulsador Microswitch 2CH Prata',category:'Interruptor',cost_price:38,sale_price:76,pitch:'Acionamento manual discreto 2 canais prata',buy_link:'',supplier_id:1},
  // Tomadas e acessórios Preto
  {id:24,code:'QAMT20B-PT',name:'Tomada 20A Preto',category:'Tomada',cost_price:24,sale_price:36,pitch:'Tomada de alta corrente design preto',buy_link:'',supplier_id:1},
  {id:25,code:'QAML',name:'Módulo Cego Preto',category:'Tomada',cost_price:11,sale_price:16.5,pitch:'Acabamento elegante na cor preta',buy_link:'',supplier_id:1},
  {id:26,code:'QAM42',name:'Placa 4×2 Preto',category:'Tomada',cost_price:32,sale_price:48,pitch:'Placa de acabamento 4×2 preta',buy_link:'',supplier_id:1},
  {id:27,code:'QAMP2',name:'Pulsador Microswitch 2CH Preto',category:'Interruptor',cost_price:38,sale_price:57,pitch:'Acionamento manual discreto 2 canais preto',buy_link:'',supplier_id:1},
  // Tomadas completas
  {id:28,code:'TOMRR1PT',name:'Tomada Completa Preta 1',category:'Tomada',cost_price:67,sale_price:100.5,pitch:'Tomada completa design preto',buy_link:'',supplier_id:1},
  {id:29,code:'TOMRR2PT',name:'Tomada Completa Preta 2',category:'Tomada',cost_price:80,sale_price:120,pitch:'Tomada dupla completa design preto',buy_link:'',supplier_id:1},
  {id:30,code:'TOMRR1PR',name:'Tomada Completa Prata 1',category:'Tomada',cost_price:67,sale_price:100.5,pitch:'Tomada completa design prata',buy_link:'',supplier_id:1},
  {id:31,code:'TOMRR2PR',name:'Tomada Completa Prata 2',category:'Tomada',cost_price:80,sale_price:120,pitch:'Tomada dupla completa design prata',buy_link:'',supplier_id:1},
  {id:32,code:'QAMUSB',name:'Módulo USB A+C Preto',category:'Tomada',cost_price:90,sale_price:180,pitch:'Carregamento embutido na parede',buy_link:'',supplier_id:1},
  {id:33,code:'QAMUSBB',name:'Módulo USB A+C Prata',category:'Tomada',cost_price:90,sale_price:180,pitch:'Carregamento embutido na parede — prata',buy_link:'',supplier_id:1},
  // Rede Ubiquiti
  {id:34,code:'UDM-SE',name:'Dream Machine Special Edition',category:'CPD / Rack',cost_price:2999,sale_price:4499,pitch:'Roteador enterprise — cérebro da rede',buy_link:'',supplier_id:2},
  {id:35,code:'USW-24-POE',name:'Switch USW-24-POE (95W)',category:'CPD / Rack',cost_price:3129,sale_price:4699,pitch:'Switch gerenciável 24 portas PoE',buy_link:'',supplier_id:2},
  {id:36,code:'AP-U6-PLUS',name:'Access Point U6+',category:'WiFi / Rede',cost_price:829,sale_price:1249,pitch:'Wi-Fi 6 — cobertura total sem pontos cegos',buy_link:'',supplier_id:2},
  {id:37,code:'UVC-G5-DOME',name:'Câmera Dome G5 Interna',category:'Segurança / CFTV',cost_price:1099,sale_price:1649,pitch:'Câmera dome 4K interna com IA',buy_link:'',supplier_id:2},
  {id:38,code:'UVC-G5-BULLET',name:'Câmera G5 Bullet Externa MIC',category:'Segurança / CFTV',cost_price:789,sale_price:1189,pitch:'Câmera externa 4K com microfone',buy_link:'',supplier_id:2},
  {id:39,code:'HD-4TB',name:'HD 4TB para NVR',category:'Segurança / CFTV',cost_price:800,sale_price:1200,pitch:'Armazenamento 24h para câmeras',buy_link:'',supplier_id:2},
  {id:40,code:'PP-CAT6-24',name:'Patch Panel CAT6 24 portas',category:'CPD / Rack',cost_price:527,sale_price:791,pitch:'Organização profissional da rede',buy_link:'',supplier_id:3},
  {id:41,code:'CAB-CAT6-300',name:'Cabo UTP CAT6 300m',category:'Cabos / Cabeamento',cost_price:1070,sale_price:1605,pitch:'Cabo estruturado CAT6 para toda a casa',buy_link:'',supplier_id:3},
  {id:42,code:'KS-CAT6',name:'Keystone CAT6',category:'Cabos / Cabeamento',cost_price:25,sale_price:38,pitch:'Conector modular CAT6',buy_link:'',supplier_id:3},
  {id:43,code:'RACK-16U',name:'Mini Rack 16U',category:'CPD / Rack',cost_price:1500,sale_price:2250,pitch:'Rack profissional para CPD residencial',buy_link:'',supplier_id:3},
  {id:44,code:'PC-20CM',name:'Patch Cord 20cm',category:'Cabos / Cabeamento',cost_price:7.8,sale_price:12,pitch:'Patchcord curto para patch panel',buy_link:'',supplier_id:3},
  {id:45,code:'NBK-700VA',name:'Nobreak 700VA 120V',category:'CPD / Rack',cost_price:500,sale_price:750,pitch:'Proteção de energia para o CPD',buy_link:'',supplier_id:3},
  // Som
  {id:46,code:'RXV4A',name:'Receiver Yamaha RX-V4A 5.2CH',category:'Som Ambiente',cost_price:4749,sale_price:7124,pitch:'Amplificador AV 5.2 canais com Dolby Atmos',buy_link:'',supplier_id:4},
  {id:47,code:'JBL-260CSA',name:'Caixa JBL Stage 260CSA',category:'Som Ambiente',cost_price:749,sale_price:1124,pitch:'Caixa acústica de alta fidelidade',buy_link:'',supplier_id:4},
  {id:48,code:'JBL-260W',name:'Caixa JBL Stage 260W',category:'Som Ambiente',cost_price:799,sale_price:1199,pitch:'Caixa acústica traseira/surround',buy_link:'',supplier_id:4},
  {id:49,code:'JBL-220P',name:'Subwoofer JBL Stage 220P 12"',category:'Som Ambiente',cost_price:3419,sale_price:5129,pitch:'Subwoofer ativo 12" para graves precisos',buy_link:'',supplier_id:4},
  {id:50,code:'FMR4',name:'Amplificador Frahm FMR 4',category:'Som Ambiente',cost_price:9000,sale_price:13500,pitch:'Amplificador multicanal para gourmet',buy_link:'',supplier_id:4},
  {id:51,code:'JBL-280W',name:'Caixa JBL Stage 280W',category:'Som Ambiente',cost_price:799,sale_price:1199,pitch:'Caixa embutida de alta performance',buy_link:'',supplier_id:4},
  // CFTV QA
  {id:52,code:'QASG8',name:'Gravador NVR 8CH 4K PoE Smart Search',category:'Segurança / CFTV',cost_price:990,sale_price:1980,pitch:'Gravação 4K 24h com busca inteligente',buy_link:'',supplier_id:1},
  {id:53,code:'QACD5',name:'Câmera Dome 5MP PoE Onvif Áudio',category:'Segurança / CFTV',cost_price:435,sale_price:870,pitch:'Visão noturna 4K e áudio bidirecional',buy_link:'',supplier_id:1},
]

const DEFAULT_CATEGORIES = [
  'CPD / Rack','Iluminação','Interruptor','Tomada',
  'IR / Controle AV','Sensor de Presença','WiFi / Rede',
  'Cabos / Cabeamento','Churrasqueira','Coifa',
  'Som Ambiente','Segurança / CFTV','Automação','Elétrica','Outro'
]

function init(){
  const ex=load()
  if(ex&&ex._version===6) return ex
  const db={
    _version:6,
    _nextId:{clients:2,proposals:2,projects:2,stock:2,catalog:54,suppliers:7,tools:11,annotations:2,admins:3,categories:DEFAULT_CATEGORIES.length+1},
    admins:[
      {id:1,name:'Admin',gmail:'admin@admin.com',role:'admin'},
      {id:2,name:'Rogério',gmail:'rss@gmail.com',role:'admin'},
    ],
    catalog_categories:DEFAULT_CATEGORIES,
    clients:[],
    proposals:[],
    projects:[],
    stock:[],
    catalog:DEFAULT_CATALOG,
    suppliers:[
      {id:1,name:'QA Tech',contact:'(11) 99999-0001',site:'https://qatech.com.br',ml_link:'https://www.mercadolivre.com.br/loja/qatech',avg_delivery_days:5,categories:'Automação Zigbee, CFTV, Gateways',notes:'Fornecedor principal de automação QA Pro. Prazo médio 5 dias úteis.'},
      {id:2,name:'Ubiquiti / WI-Tek',contact:'(11) 4003-0001',site:'https://ui.com',ml_link:'https://www.mercadolivre.com.br/loja/ubiquiti',avg_delivery_days:7,categories:'Roteadores, Switches PoE, APs, Câmeras 4K',notes:'UniFi Network — UDM SE, U6+, G5 Dome e Bullet. Revendedor WI-Tek.'},
      {id:3,name:'Furukawa / Soho',contact:'(41) 3317-7000',site:'https://furukawa.com.br',ml_link:'',avg_delivery_days:10,categories:'Cabo CAT6, Patch Panel, Rack, Keystone',notes:'Cabeamento estruturado certificado. Série Soho para residencial.'},
      {id:4,name:'JBL / Yamaha',contact:'0800-555-1234',site:'https://br.jbl.com',ml_link:'https://www.mercadolivre.com.br/loja/jbl',avg_delivery_days:14,categories:'Caixas de som, Subwoofer, Receivers AV',notes:'Som ambiente e home theater. Linha Stage para instalação.'},
      {id:5,name:'Intelbras',contact:'0800 704 2767',site:'https://intelbras.com.br',ml_link:'https://www.mercadolivre.com.br/loja/intelbras',avg_delivery_days:7,categories:'Câmeras CFTV, DVR/NVR, Nobreak, Rack',notes:'CFTV alternativo e equipamentos de infraestrutura.'},
      {id:6,name:'LVR Grills & Coifas',contact:'(35) 98459-7952',site:'https://lvrgrills.com.br',ml_link:'',avg_delivery_days:21,categories:'Coifas inox 304, Churrasqueiras, Braseiros, Grill',notes:'Parceiro para área gourmet. Fabricação sob medida.'},
    ],
    tools:[
      {id:1,name:'Claude AI',description:'Assistente de IA para projetos, propostas e textos',link:'https://claude.ai',icon:'ti-robot'},
      {id:2,name:'Ubiquiti UniFi',description:'Mapa de calor WiFi, configuração de APs e câmeras',link:'https://unifi.ui.com',icon:'ti-wifi'},
      {id:3,name:'RARO Home Site',description:'Site oficial da empresa',link:'https://rarohome.com.br',icon:'ti-world'},
      {id:4,name:'QA Tech Shop',description:'Fornecedor principal — automação QA Pro',link:'https://qatech.com.br',icon:'ti-shopping-cart'},
      {id:5,name:'Tuya Smart Platform',description:'Plataforma de automação Zigbee/Matter',link:'https://iot.tuya.com',icon:'ti-cpu'},
      {id:6,name:'WhatsApp Web',description:'Atendimento e grupos de clientes',link:'https://web.whatsapp.com',icon:'ti-brand-whatsapp'},
      {id:7,name:'Canva',description:'Criação de apresentações e materiais visuais',link:'https://canva.com',icon:'ti-palette'},
      {id:8,name:'Google Drive',description:'Armazenamento de plantas, projetos e documentos',link:'https://drive.google.com',icon:'ti-brand-google-drive'},
      {id:9,name:'Mercado Livre',description:'Busca e compra de equipamentos',link:'https://www.mercadolivre.com.br',icon:'ti-shopping-bag'},
      {id:10,name:'VR Fundiçoes',description:'Fornecedor de coifas e gourmet em inox',link:'https://vrfundicoes.com.br',icon:'ti-flame'},
    ],
    reservations:[],
    stock_log:[],
    audit_log:[],
  }
  save(db); return db
}

export function getDB(){ return init() }
function nid(db,t){ const id=db._nextId[t]||1; db._nextId[t]=id+1; save(db); return id }

// ── ADMINS ──
export function getAdmins(){ return getDB().admins }
export function saveAdmin(a){ const db=getDB(); if(a.id) db.admins=db.admins.map(x=>x.id===a.id?a:x); else{a.id=nid(db,'admins');db.admins.push(a)} save(db);return a }
export function deleteAdmin(id){ const db=getDB(); db.admins=db.admins.filter(x=>x.id!==id); save(db) }

// ── CATALOG CATEGORIES ──
export function getCatalogCategories(){ return getDB().catalog_categories||[] }
export function addCatalogCategory(name){ const db=getDB(); if(!db.catalog_categories) db.catalog_categories=[]; if(!db.catalog_categories.includes(name)) db.catalog_categories.push(name); save(db) }
export function deleteCatalogCategory(name){ const db=getDB(); db.catalog_categories=(db.catalog_categories||[]).filter(c=>c!==name); save(db) }

// ── CLIENTS ──
export function getClients(){ return getDB().clients }
export function saveClient(c){ const db=getDB(); if(c.id) db.clients=db.clients.map(x=>x.id===c.id?c:x); else{c.id=nid(db,'clients');c.created_at=new Date().toISOString().slice(0,10);db.clients.push(c)} save(db);return c }
export function deleteClient(id){ const db=getDB(); db.clients=db.clients.filter(x=>x.id!==id); save(db) }

// ── PROPOSAL CODE ──
export function generateProposalCode(client){
  const n1=(client?.name1||'X')[0].toUpperCase()
  const n2=(client?.name2||'X')[0].toUpperCase()
  const num=String(Math.floor(1000+Math.random()*9000))
  return `${n1}${n2}-${num}`
}

// ── PROPOSALS ──
export function getProposals(){ return getDB().proposals }
export function saveProposal(p){
  const db=getDB()
  if(p.id) db.proposals=db.proposals.map(x=>x.id===p.id?p:x)
  else{ p.id=nid(db,'proposals'); p.created_at=new Date().toISOString().slice(0,10); if(!p.code) p.code=generateProposalCode({name1:p.client_name?.[0]||'X',name2:p.client_name?.split(' ')?.[1]?.[0]||'X'}); db.proposals.push(p) }
  if(p.status==='sent'||p.status==='approved'){
    const items=(p.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1}))))
    reserveStock(p.id,items,p.code||`#${p.id}`,p.client_name)
  }
  if(p.status==='rejected'||p.status==='draft') releaseReservation(p.id)
  if(p.status==='approved') applyStockDeduction(p)
  save(db); return p
}
export function deleteProposal(id){ const db=getDB(); db.proposals=db.proposals.filter(x=>x.id!==id); releaseReservation(id); save(db) }

// ── PROJECTS ──
export function getProjects(){ return getDB().projects }
export function saveProject(p){ const db=getDB(); if(p.id) db.projects=db.projects.map(x=>x.id===p.id?p:x); else{p.id=nid(db,'projects');p.created_at=new Date().toISOString().slice(0,10);p.annotations=[];p.rooms_config=[];p.purchase_list=[];db.projects.push(p)} save(db);return p }
export function deleteProject(id){ const db=getDB(); db.projects=db.projects.filter(x=>x.id!==id); save(db) }
export function addAnnotation(projectId,text,author){ const db=getDB(); const p=db.projects.find(x=>x.id===projectId); if(!p) return; if(!p.annotations) p.annotations=[]; const ann={id:Date.now(),text,author,date:new Date().toISOString()}; p.annotations.push(ann); save(db); return ann }

// ── STOCK ──
export function getStock(){ return getDB().stock }
export function saveStockItem(s){ const db=getDB(); if(s.id) db.stock=db.stock.map(x=>x.id===s.id?s:x); else{s.id=nid(db,'stock');db.stock.push(s)} save(db);return s }
export function deleteStockItem(id){ const db=getDB(); db.stock=db.stock.filter(x=>x.id!==id); save(db) }

// ── CATALOG ──
export function getCatalog(){ return getDB().catalog }
export function saveCatalogItem(c){ const db=getDB(); if(c.id) db.catalog=db.catalog.map(x=>x.id===c.id?c:x); else{c.id=nid(db,'catalog');db.catalog.push(c)} save(db);return c }
export function deleteCatalogItem(id){ const db=getDB(); db.catalog=db.catalog.filter(x=>x.id!==id); save(db) }

// ── SUPPLIERS ──
export function getSuppliers(){ return getDB().suppliers }
export function saveSupplier(s){ const db=getDB(); if(s.id) db.suppliers=db.suppliers.map(x=>x.id===s.id?s:x); else{s.id=nid(db,'suppliers');db.suppliers.push(s)} save(db);return s }
export function deleteSupplier(id){ const db=getDB(); db.suppliers=db.suppliers.filter(x=>x.id!==id); save(db) }

// ── TOOLS ──
export function getTools(){ return getDB().tools }
export function saveTool(t){ const db=getDB(); if(t.id) db.tools=db.tools.map(x=>x.id===t.id?t:x); else{t.id=nid(db,'tools');db.tools.push(t)} save(db);return t }
export function deleteTool(id){ const db=getDB(); db.tools=db.tools.filter(x=>x.id!==id); save(db) }

// ── RESERVATIONS ──
export function reserveStock(proposalId,items,proposalCode,clientName){ const db=getDB(); if(!db.reservations) db.reservations=[]; db.reservations=db.reservations.filter(r=>r.proposal_id!==proposalId); items.forEach(item=>db.reservations.push({proposal_id:proposalId,proposal_code:proposalCode,client_name:clientName,code:item.code,qty:item.qty,reserved_at:new Date().toISOString()})); save(db) }
export function releaseReservation(proposalId){ const db=getDB(); if(db.reservations) db.reservations=db.reservations.filter(r=>r.proposal_id!==proposalId); save(db) }
export function getReservations(){ return getDB().reservations||[] }
export function getStockWithReservations(){ const db=getDB(); const res=db.reservations||[]; return (db.stock||[]).map(item=>{ const reserved=res.filter(r=>r.code===item.code).reduce((s,r)=>s+r.qty,0); const reservedBy=res.filter(r=>r.code===item.code).map(r=>`${r.proposal_code} (${r.client_name})`).join(', '); return{...item,reserved,available:Math.max(0,item.qty-reserved),reserved_by:reservedBy} }) }
function applyStockDeduction(proposal){ const db=getDB(); const items=(proposal.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1})))); items.forEach(item=>{ const s=db.stock.find(x=>x.code===item.code); if(s) s.qty=Math.max(0,s.qty-item.qty) }); if(!db.stock_log) db.stock_log=[]; db.stock_log.unshift({action:'saida_aprovacao',code:'MULTI',name:`Aprovação proposta ${proposal.code||'#'+proposal.id}`,qty:items.length,qty_before:'—',qty_after:'—',author:'Sistema',note:`Proposta ${proposal.code} aprovada — ${proposal.client_name}`,date:new Date().toISOString()}); save(db) }

// ── STOCK LOG ──
export function addStockLog(entry){ const db=getDB(); if(!db.stock_log) db.stock_log=[]; db.stock_log.unshift({...entry,id:Date.now(),date:new Date().toISOString()}); if(db.stock_log.length>300) db.stock_log=db.stock_log.slice(0,300); save(db) }
export function getStockLog(){ return getDB().stock_log||[] }

// ── PIN ──
const PIN_KEY='raro_pin_session'; const ADMIN_PIN='123'
export function verifyPIN(pin){ return pin===ADMIN_PIN }
export function setPINSession(){ localStorage.setItem(PIN_KEY,JSON.stringify({at:Date.now()})) }
export function checkPINSession(){ try{ const s=JSON.parse(localStorage.getItem(PIN_KEY)||'null'); return s&&(Date.now()-s.at<4*60*60*1000) }catch{return false} }
export function clearPINSession(){ localStorage.removeItem(PIN_KEY) }

// ── AUDIT LOG ──
export function addAuditLog(entry){ const db=getDB(); if(!db.audit_log) db.audit_log=[]; db.audit_log.unshift({id:Date.now()+Math.random(),date:new Date().toISOString(),...entry}); if(db.audit_log.length>500) db.audit_log=db.audit_log.slice(0,500); save(db) }
export function getAuditLog(filters={}){ const db=getDB(); let log=db.audit_log||[]; if(filters.module) log=log.filter(l=>l.module===filters.module); if(filters.user) log=log.filter(l=>l.user===filters.user); return log.slice(0,filters.limit||200) }
export function auditedSave(module,action,entity,user,before=null){ addAuditLog({module,action,entity_id:entity?.id,entity_name:entity?.name||entity?.client_name||entity?.code||String(entity?.id||''),user,before:before?JSON.stringify(before).slice(0,300):null,after:entity?JSON.stringify(entity).slice(0,300):null}) }

// ── CLIENT COMPLETENESS ──
export function getIncompleteClients(){ return getDB().clients.filter(c=>!c.phone1||!c.neighborhood||!c.housing_type||!c.email) }

// ── AUTO TASKS ──
export function getAutoTasks(){ const db=getDB(); const tasks=[]; const NEXT={visit:{label:'Fazer medição',type:'Medição'},measurement:{label:'Criar projeto e mapa de calor',type:'Projeto'},project:{label:'Fechar orçamento com o cliente',type:'Orçamento'},budget:{label:'Comprar material listado',type:'Compras'},purchase:{label:'Iniciar instalação',type:'Instalação'},installation:{label:'Configurar cômodos e testar',type:'Configuração'},config:{label:'Entrega e treinamento ao cliente',type:'Entrega'}}; db.projects.filter(p=>p.phase!=='done').forEach(p=>{ const next=NEXT[p.phase]; if(next) tasks.push({id:`proj_${p.id}`,title:next.label,client_name:p.client_name,project_id:p.id,type:next.type,deadline:p.deadline,status:'pending',auto:true}); ;(p.purchase_list||[]).filter(i=>!i.arrived).forEach(item=>tasks.push({id:`buy_${p.id}_${item.code}`,title:`Receber: ${item.item} (×${item.qty})`,client_name:p.client_name,project_id:p.id,type:'Compras',deadline:item.arrival_date,status:'pending',auto:true})); const notDone=(p.rooms_config||[]).filter(r=>!r.delivered); if(notDone.length>0&&(p.phase==='installation'||p.phase==='config')) tasks.push({id:`rooms_${p.id}`,title:`Configurar ${notDone.length} cômodo(s): ${notDone.slice(0,2).map(r=>r.name).join(', ')}${notDone.length>2?'...':''}`,client_name:p.client_name,project_id:p.id,type:'Configuração',deadline:p.deadline,status:'pending',auto:true}) }); return tasks }

// ── BACKUP ──
export function exportBackup(){ const db=getDB(); const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`rarohome-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url) }
export function importBackup(json){ try{ const db=JSON.parse(json); save(db); return true }catch{return false} }

// ── STOCK vs PROPOSAL CHECK ──
export function checkProposalStock(floors) {
  const db = getDB()
  const stock = db.stock || []
  const reservations = db.reservations || []
  const itemMap = {}
  ;(floors || []).forEach(fl => {
    ;(fl.rooms || []).forEach(r => {
      ;(r.items || []).filter(i => i.code).forEach(i => {
        const qty = parseInt(i.qty) || 1
        itemMap[i.code] = (itemMap[i.code] || 0) + qty
      })
    })
  })
  const warnings = []
  Object.entries(itemMap).forEach(([code, needed]) => {
    const s = stock.find(x => x.code === code)
    if (!s) {
      const cat = db.catalog?.find(c => c.code === code)
      warnings.push({ code, name: cat?.name || code, needed, available: 0, type: 'not_in_stock', msg: 'Não cadastrado no estoque — precisa comprar' })
    } else {
      const reserved = reservations.filter(r => r.code === code).reduce((s, r) => s + r.qty, 0)
      const available = Math.max(0, s.qty - reserved)
      if (available < needed) {
        warnings.push({ code, name: s.name, needed, available, shortage: needed - available, type: available === 0 ? 'zero' : 'insufficient', msg: available === 0 ? `Zerado — precisa comprar ${needed} un.` : `Estoque insuficiente — disponível: ${available}, faltam: ${needed - available} un.`, buy_link: s.buy_link })
      }
    }
  })
  return warnings
}
