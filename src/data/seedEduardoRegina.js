// Seed do Projeto Executivo Eduardo & Regina (Copacabana/RJ)
// Gerado a partir do PDF "Projeto Executivo RARO Home — Eduardo & Regina"
// Usado pelo botão "Importar projeto Eduardo & Regina" na tela de Orçamentos.
import { LOGO_EXEC } from '../logos.js'

const EXEC_CSS=`
.ex-doc{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5}
.ex-doc *{box-sizing:border-box}
.ex-cover{background:linear-gradient(160deg,#F5FAFF 0%,#E8F2FC 100%);color:#0D1420;padding:60px 40px;text-align:center;position:relative;border-bottom:3px solid #0EA5E9;page-break-after:always}
.ex-cover-top{font-size:10px;letter-spacing:3px;color:#6B8CAE;text-transform:uppercase;margin-bottom:30px}
.ex-cover-tag{font-size:10px;letter-spacing:4px;color:#0EA5E9;margin:6px 0 40px}
.ex-cover-title{font-family:'DM Serif Display',Georgia,serif;font-size:34px;line-height:1.15;margin-bottom:16px;color:#0D1420}
.ex-cover-sub{font-size:13px;color:#456;line-height:1.7;margin-bottom:40px}
.ex-cover-client{background:#fff;border:1px solid #cfe3f5;border-radius:10px;padding:20px;margin:0 auto;max-width:380px;box-shadow:0 2px 10px rgba(14,165,233,0.08)}
.ex-cc-name{font-size:20px;font-weight:700;color:#0D1420}
.ex-cc-meta{font-size:11px;color:#6B8CAE;margin-top:4px}
.ex-cover-foot{margin-top:40px;font-size:9px;color:#8fa3b8}
.ex-sec{padding:24px 40px;border-bottom:1px solid #eef;page-break-inside:avoid}
.ex-sec h2{font-family:'DM Serif Display',Georgia,serif;font-size:18px;color:#060B1A;margin-bottom:14px;padding-bottom:7px;border-bottom:2px solid #0EA5E9}
.ex-amb{font-size:13px;color:#0369A1;font-weight:700;margin:16px 0 6px;background:#EFF6FF;padding:6px 10px;border-radius:5px;page-break-after:avoid}
.ex-tbl{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:11px}
.ex-tbl th{background:#060B1A;color:#fff;padding:7px 9px;text-align:left;font-size:10px;font-weight:600}
.ex-tbl td{padding:6px 9px;border-bottom:1px solid #eef2f7;vertical-align:top}
.ex-tbl tr:nth-child(even) td{background:#f7fafc}
.ex-ul{margin:6px 0 6px 18px}
.ex-ul li{margin-bottom:5px}
.ex-p{font-size:12px;line-height:1.6;color:#374151}
`

const esc=s=>(s==null?'':String(s))
const T=(rows,cols)=>`<table class="ex-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
const sec=(title,inner)=>inner?`<div class="ex-sec"><h2>${title}</h2>${inner}</div>`:''
const list=arr=>arr&&arr.length?`<ul class="ex-ul">${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''

const premissas=[
 'CPD/Rack instalado no armário da TV na parede inferior da sala de estar',
 'Todos os keypads recebem fase+neutro 2,5mm² direto do quadro',
 'Keypads de entrada a 1,10m, keypads de cabeceira a 0,70m (conforme pontuado)',
 'Câmeras e Access Points alimentados via PoE pelo Dream Machine SE / switch no rack',
 'Som ambiente recebe 2×1,5mm² do amplificador no rack',
 'Hubs IR recebem apenas alimentação AC (sem cabeamento estruturado)',
 'Sensores mmWave no teto a 2,70m (alimentação AC)',
 'Pontos RJ45 para TV a 1,20m, para mesa a 0,30m',
 'Módulo cortina a 2,70m com ponto elétrico',
 'Subwoofer no chão, caixas de som embutidas no teto a 2,70m',
]

const rackItems=[
 {u:'U1-U2',equip:'Dream Machine SE',funcao:'Roteador principal, controller UniFi, gateway Zigbee, gravação integrada, 8 portas PoE',watts:'33W'},
 {u:'U3-U4',equip:'Switch PoE+ 16 portas',funcao:'Alimentação adicional de APs e câmeras via PoE',watts:'~120W'},
 {u:'U5',equip:'Amplificador multicanal 8 zonas',funcao:'Som ambiente (5 canais estar + 2 jantar + sub)',watts:'200W'},
 {u:'U6-U7',equip:'Patch Panel 24 portas Cat6',funcao:'Organização dos cabos estruturados',watts:'—'},
 {u:'U8',equip:'Organizador horizontal',funcao:'Gestão de cabos',watts:'—'},
 {u:'U9',equip:'Régua energia 8 tomadas filtrada',funcao:'Alimentação dos equipamentos',watts:'—'},
]
const rackDetalhe=[
 'Rack 12U embutido no armário TV com porta frontal ventilada',
 'Tomada 110V dedicada 20A do quadro (disjuntor exclusivo)',
 'Ventilação forçada (2 fans topo) com termostato',
 'Iluminação LED interna para manutenção',
 'Bandeja deslizante para equipamentos ativos',
 'Espaço inferior para subwoofer (fora do rack)',
]

const modulosTeto=[
 {ambiente:'Estar',itens:['M1 — 5 spots LED (forro gesso)','Módulo Cortina #20 (forro, 2,70m)','5× Caixa JBL 260CSA #21-25 (teto, 2,70m)','Hub IR #29 (teto sobre AC, 2,70m)','Sensor mmWave #33 (teto centro, 2,70m)']},
 {ambiente:'Jantar',itens:['M2 — Lustre + spots (forro gesso)','Access Point #1 (teto centro, 2,70m)','2× Caixa JBL 260CSA #27-28 (teto, 2,70m)','Hub IR #30 (teto sobre AC, 2,70m)']},
 {ambiente:'Cozinha',itens:['M3 — Spots LED bancada + geral (forro gesso)','Sensor mmWave #32 (teto centro, 2,70m)']},
 {ambiente:'Suíte Master',itens:['Access Point #3 (corredor, teto 2,70m)','Sensor mmWave #34 no WC (teto centro)']},
 {ambiente:'Suíte 2',itens:['Hub IR #46 Pro (teto sobre AC, 2,70m embutir)']},
 {ambiente:'Quarto',itens:['Hub IR #31 (teto sobre AC, 2,70m)']},
 {ambiente:'Lavabo / WC Social / WC Serviço',itens:['M4-M7 — Spots/LED teto','Sensores mmWave #18, #42 (teto centro)']},
 {ambiente:'Circulação',itens:['Access Point #2 (teto centro, 2,70m)']},
]

const pontos=[
 {ambiente:'Estar (8,00×6,20m)',linhas:[
  {ponto:'#19',equip:'Keypad 6 botões Zigbee',parede:'entrada ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~8m'},
  {ponto:'#6',equip:'2× Keystone Cat6',parede:'inferior (TV/rack) junto rack',dist:'0,50m',alt:'—',caixa:'4×4',cabo:'Cat6 patch 1m'},
  {ponto:'#20',equip:'Módulo Cortina Zigbee',parede:'superior centro',dist:'2,70m teto',alt:'2,70m',caixa:'4×2 mod forro',cabo:'110V AC'},
  {ponto:'#21-25',equip:'5× Caixa JBL 260CSA',parede:'teto distribuídas',dist:'espaçadas',alt:'2,70m',caixa:'embutir forro',cabo:'2×1,5mm² ~10m'},
  {ponto:'#26',equip:'Subwoofer JBL 220P',parede:'chão extremidade móvel TV',dist:'junto rack',alt:'0,00m',caixa:'tomada',cabo:'2×1,5mm² 2m'},
  {ponto:'#29',equip:'Hub IR Zigbee',parede:'superior direita teto sobre AC',dist:'—',alt:'2,70m',caixa:'4×2 mod forro',cabo:'110V AC'},
  {ponto:'#33',equip:'Sensor mmWave teto',parede:'teto central centro',dist:'—',alt:'2,70m',caixa:'mod forro',cabo:'110V AC'},
 ]},
 {ambiente:'Jantar (4,50×3,80m)',linhas:[
  {ponto:'#1',equip:'Access Point U6+',parede:'teto entre mesa e poltrona',dist:'centro',alt:'2,70m',caixa:'embutir mod forro',cabo:'Cat6 ~12m PoE'},
  {ponto:'#27-28',equip:'2× Caixa JBL 260CSA',parede:'teto entre mesa e poltrona',dist:'espaçadas',alt:'2,70m',caixa:'embutir forro',cabo:'2×1,5mm² ~14m'},
  {ponto:'#30',equip:'Hub IR Zigbee',parede:'superior direita teto sobre AC',dist:'—',alt:'2,70m',caixa:'4×2 mod forro',cabo:'110V AC'},
  {ponto:'#39',equip:'Keypad 2 botões Zigbee',parede:'circulação início sala jantar',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~10m'},
 ]},
 {ambiente:'Cozinha/Copa',linhas:[
  {ponto:'#4',equip:'Câmera Dome G5',parede:'canto inferior esquerdo quina',dist:'—',alt:'2,50m',caixa:'sobrepor',cabo:'Cat6 ~6m PoE'},
  {ponto:'#7',equip:'Keystone Cat6',parede:'divisória geladeiras',dist:'0,20m',alt:'1,10m',caixa:'4×4',cabo:'Cat6 ~5m'},
  {ponto:'#8',equip:'Keystone Cat6',parede:'ilha esquerda bancada lateral pia',dist:'—',alt:'0,80m',caixa:'4×4',cabo:'Cat6 ~8m'},
  {ponto:'#14',equip:'Keypad 2 botões Zigbee',parede:'entrada ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~6m'},
  {ponto:'#32',equip:'Sensor mmWave teto',parede:'teto central centro',dist:'—',alt:'2,70m',caixa:'mod forro',cabo:'110V AC'},
 ]},
 {ambiente:'Lavabo',linhas:[
  {ponto:'#18',equip:'Sensor mmWave teto',parede:'teto central centro',dist:'—',alt:'2,70m',caixa:'mod forro',cabo:'110V AC'},
  {ponto:'#37',equip:'Keypad 2 botões Zigbee',parede:'interna',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~9m'},
 ]},
 {ambiente:'Despensa / A.S. / W.C. Serviço',linhas:[
  {ponto:'#36',equip:'Keypad 1 botão Zigbee',parede:'entrada despensa',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~7m'},
  {ponto:'#35',equip:'Keypad 1 botão Zigbee',parede:'entrada A.S.',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~10m'},
  {ponto:'#38',equip:'Keypad 1 botão Zigbee',parede:'interna W.C. Serviço',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~11m'},
 ]},
 {ambiente:'Circulação Horizontal',linhas:[
  {ponto:'#2',equip:'Access Point U6+',parede:'teto entre área externa e suíte 2',dist:'centro',alt:'2,70m',caixa:'embutir mod forro',cabo:'Cat6 ~18m PoE'},
  {ponto:'#40',equip:'Keypad 2 botões Zigbee',parede:'final corredor',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~16m'},
  {ponto:'#41',equip:'Keypad 2 botões Zigbee',parede:'circulação vertical final',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~17m'},
 ]},
 {ambiente:'W.C. Social (compartilhado)',linhas:[
  {ponto:'#42',equip:'Sensor mmWave teto',parede:'teto central centro',dist:'—',alt:'2,70m',caixa:'mod forro',cabo:'110V AC'},
  {ponto:'#43',equip:'Keypad 2 botões Zigbee',parede:'entre duas portas',dist:'centro',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~15m'},
 ]},
 {ambiente:'Suíte Master',linhas:[
  {ponto:'#3',equip:'Access Point U6+',parede:'corredor frente banheiro teto',dist:'centro corredor',alt:'2,70m',caixa:'embutir mod forro',cabo:'Cat6 ~22m PoE'},
  {ponto:'#9',equip:'Keystone Cat6',parede:'oposta cama (TV)',dist:'centro',alt:'1,20m',caixa:'4×4',cabo:'Cat6 ~20m'},
  {ponto:'#15',equip:'Keypad 3 botões Zigbee',parede:'entrada ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~18m'},
  {ponto:'#51',equip:'Keypad 1 botão (cabeceira D) + USB + tomada',parede:'cabeceira direita',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~19m'},
  {ponto:'#52',equip:'Keypad 1 botão (cabeceira E) + USB + tomada',parede:'cabeceira esquerda',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~20m'},
 ]},
 {ambiente:'W.C. Suíte Master',linhas:[
  {ponto:'#34',equip:'Sensor mmWave teto',parede:'teto central centro',dist:'—',alt:'2,70m',caixa:'mod forro',cabo:'110V AC'},
  {ponto:'#53',equip:'Keypad 2 botões Zigbee',parede:'interna',dist:'0,15m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~21m'},
 ]},
 {ambiente:'Suíte 2',linhas:[
  {ponto:'#10',equip:'Keystone Cat6',parede:'oposta cama (TV)',dist:'centro',alt:'1,20m',caixa:'4×4',cabo:'Cat6 ~16m'},
  {ponto:'#11',equip:'2× Keystone Cat6 (escritório)',parede:'canto superior direito',dist:'0,30m',alt:'0,30m',caixa:'4×4 dupla',cabo:'Cat6 ~18m'},
  {ponto:'#16',equip:'Keypad 3 botões Zigbee',parede:'entrada ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~14m'},
  {ponto:'#44',equip:'Keypad 1 botão (cabeceira D) + USB + tomada',parede:'cabeceira direita',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~15m'},
  {ponto:'#45',equip:'Keypad 1 botão (cabeceira E) + USB + tomada',parede:'cabeceira esquerda',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~16m'},
  {ponto:'#46',equip:'Hub IR Zigbee Pro',parede:'superior teto sobre AC',dist:'—',alt:'2,70m',caixa:'embutir mod forro',cabo:'110V AC'},
 ]},
 {ambiente:'Quarto',linhas:[
  {ponto:'#12',equip:'Keystone Cat6',parede:'oposta cama (TV)',dist:'centro',alt:'1,20m',caixa:'4×4',cabo:'Cat6 ~17m'},
  {ponto:'#13',equip:'2× Keystone Cat6 (escritório)',parede:'canto superior direito',dist:'0,30m',alt:'0,30m',caixa:'4×4 dupla',cabo:'Cat6 ~19m'},
  {ponto:'#17',equip:'Keypad 2 botões Zigbee',parede:'entrada ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~16m'},
  {ponto:'#47',equip:'Keypad 1 botão (cabeceira E) + USB + tomada',parede:'cabeceira esquerda',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~17m'},
  {ponto:'#48',equip:'Keypad 1 botão (cabeceira D) + USB + tomada',parede:'cabeceira direita',dist:'0,20m',alt:'0,70m',caixa:'4×4 + NEUTRO',cabo:'2,5mm² ~18m'},
  {ponto:'#31',equip:'Hub IR Zigbee',parede:'direita teto sobre AC',dist:'—',alt:'2,70m',caixa:'4×2 mod forro',cabo:'110V AC'},
 ]},
 {ambiente:'A. Externa (superior direita)',linhas:[
  {ponto:'#5',equip:'Câmera Bullet G5 MIC',parede:'superior colada parede suíte 2 quina',dist:'—',alt:'2,80m',caixa:'sobrepor externa',cabo:'Cat6 blindado ~20m PoE'},
  {ponto:'#49',equip:'Keypad 2 botões Zigbee',parede:'saída suíte master ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO IP65',cabo:'2,5mm² ~22m'},
  {ponto:'#50',equip:'Keypad 2 botões Zigbee',parede:'saída circulação ao lado porta',dist:'0,15m',alt:'1,10m',caixa:'4×4 + NEUTRO IP65',cabo:'2,5mm² ~18m'},
 ]},
]

const cabosRede=[
 {id:'CAT-01',origem:'DM SE p.1',destino:'AP #1 Jantar',tipo:'CAT6 U/UTP',metros:'8',cor:'Azul',pp:'P01',etiqueta:'AP-JANTAR'},
 {id:'CAT-02',origem:'DM SE p.2',destino:'AP #2 Circulação',tipo:'CAT6 U/UTP',metros:'18',cor:'Azul',pp:'P02',etiqueta:'AP-CIRC'},
 {id:'CAT-03',origem:'DM SE p.3',destino:'AP #3 Suíte Master',tipo:'CAT6 U/UTP',metros:'22',cor:'Azul',pp:'P03',etiqueta:'AP-MASTER'},
 {id:'CAT-04',origem:'DM SE p.4',destino:'Câmera #4 Dome Estar',tipo:'CAT6 U/UTP',metros:'6',cor:'Vermelho',pp:'P04',etiqueta:'CAM-DOME'},
 {id:'CAT-05',origem:'DM SE p.5',destino:'Câmera #5 Bullet Externa',tipo:'CAT6 FTP Ext',metros:'25',cor:'Vermelho',pp:'P05',etiqueta:'CAM-EXT'},
 {id:'CAT-06',origem:'Switch p.1',destino:'Keystone #6 TV Estar',tipo:'CAT6 U/UTP',metros:'2',cor:'Verde',pp:'P06',etiqueta:'TV-ESTAR'},
 {id:'CAT-07',origem:'Switch p.2',destino:'Keystone #7 Geladeiras',tipo:'CAT6 U/UTP',metros:'14',cor:'Verde',pp:'P07',etiqueta:'COZ-GEL'},
 {id:'CAT-08',origem:'Switch p.3',destino:'Keystone #8 Ilha Cozinha',tipo:'CAT6 U/UTP',metros:'16',cor:'Verde',pp:'P08',etiqueta:'COZ-ILHA'},
 {id:'CAT-09',origem:'Switch p.4',destino:'Keystone #9 TV Suíte Master',tipo:'CAT6 U/UTP',metros:'24',cor:'Verde',pp:'P09',etiqueta:'TV-MASTER'},
 {id:'CAT-10',origem:'Switch p.5',destino:'Keystone #10 TV Suíte 2',tipo:'CAT6 U/UTP',metros:'20',cor:'Verde',pp:'P10',etiqueta:'TV-SUITE2'},
 {id:'CAT-11',origem:'Switch p.6',destino:'Keystone #11 Escritório Suíte 2 (1)',tipo:'CAT6 U/UTP',metros:'21',cor:'Amarelo',pp:'P11',etiqueta:'ESC-S2-A'},
 {id:'CAT-11B',origem:'Switch p.7',destino:'Keystone #11 Escritório Suíte 2 (2)',tipo:'CAT6 U/UTP',metros:'21',cor:'Amarelo',pp:'P12',etiqueta:'ESC-S2-B'},
 {id:'CAT-12',origem:'Switch p.8',destino:'Keystone #12 TV Quarto',tipo:'CAT6 U/UTP',metros:'19',cor:'Verde',pp:'P13',etiqueta:'TV-QUARTO'},
 {id:'CAT-13',origem:'Switch p.9',destino:'Keystone #13 Escritório Quarto (1)',tipo:'CAT6 U/UTP',metros:'20',cor:'Amarelo',pp:'P14',etiqueta:'ESC-QT-A'},
 {id:'CAT-13B',origem:'Switch p.10',destino:'Keystone #13 Escritório Quarto (2)',tipo:'CAT6 U/UTP',metros:'20',cor:'Amarelo',pp:'P15',etiqueta:'ESC-QT-B'},
]

const cabosSom=[
 {id:'SOM-01',origem:'Amplificador s.1',destino:'Caixa #21 Estar',tipo:'2×1,5mm²',metros:'5',etiqueta:'SOM-21'},
 {id:'SOM-02',origem:'Amplificador s.2',destino:'Caixa #22 Estar',tipo:'2×1,5mm²',metros:'6',etiqueta:'SOM-22'},
 {id:'SOM-03',origem:'Amplificador s.3',destino:'Caixa #23 Estar',tipo:'2×1,5mm²',metros:'7',etiqueta:'SOM-23'},
 {id:'SOM-04',origem:'Amplificador s.4',destino:'Caixa #24 Estar',tipo:'2×1,5mm²',metros:'8',etiqueta:'SOM-24'},
 {id:'SOM-05',origem:'Amplificador s.5',destino:'Caixa #25 Estar',tipo:'2×1,5mm²',metros:'9',etiqueta:'SOM-25'},
 {id:'SOM-06',origem:'Amplificador sub',destino:'Subwoofer #26 Estar',tipo:'2×1,5mm²',metros:'3',etiqueta:'SOM-SUB'},
 {id:'SOM-07',origem:'Amplificador s.6',destino:'Caixa #27 Jantar',tipo:'2×1,5mm²',metros:'10',etiqueta:'SOM-27'},
 {id:'SOM-08',origem:'Amplificador s.7',destino:'Caixa #28 Jantar',tipo:'2×1,5mm²',metros:'11',etiqueta:'SOM-28'},
]

const cabosEletPorComodo=[
 {comodo:'Estar',itens:[
  {id:'ELT-01',equip:'Módulo Cortina #20',tipo:'fase+neutro',fios:'2×2,5mm²',origem:'Quadro luz C1',destino:'forro 2,70m',metros:'8',obs:''},
  {id:'ELT-02',equip:'Hub IR #29',tipo:'AC 110V',fios:'2×2,5mm²',origem:'Quadro luz C2',destino:'teto sobre AC',metros:'9',obs:'só alimentação'},
  {id:'ELT-06',equip:'Rack CPD (tomada exclusiva)',tipo:'fase+neutro+terra',fios:'3×4mm²',origem:'Quadro luz disj. 20A',destino:'nicho rack',metros:'5',obs:'disjuntor dedicado'},
 ]},
 {comodo:'Jantar',itens:[
  {id:'ELT-03',equip:'Hub IR #30',tipo:'AC 110V',fios:'2×2,5mm²',origem:'Quadro luz C3',destino:'teto sobre AC',metros:'12',obs:'só alimentação'},
 ]},
 {comodo:'Quarto',itens:[
  {id:'ELT-04',equip:'Hub IR #31',tipo:'AC 110V',fios:'2×2,5mm²',origem:'Quadro luz C4',destino:'teto sobre AC',metros:'18',obs:'só alimentação'},
 ]},
 {comodo:'Suíte 2',itens:[
  {id:'ELT-05',equip:'Hub IR #46',tipo:'AC 110V',fios:'2×2,5mm²',origem:'Quadro luz C5',destino:'teto sobre AC',metros:'20',obs:'só alimentação'},
 ]},
]

const alimKeypads=[
 {id:'KEY-01',destino:'Keypad #14 Cozinha',cota:'1,10m',comodo:'Cozinha',metros:'15'},
 {id:'KEY-02',destino:'Keypad #15 Suíte Master',cota:'1,10m',comodo:'Suíte Master',metros:'22'},
 {id:'KEY-03',destino:'Keypad #16 Suíte 2',cota:'1,10m',comodo:'Suíte 2',metros:'18'},
 {id:'KEY-04',destino:'Keypad #17 Quarto',cota:'1,10m',comodo:'Quarto',metros:'16'},
 {id:'KEY-05',destino:'Keypad #19 Estar',cota:'1,10m',comodo:'Estar',metros:'6'},
 {id:'KEY-06',destino:'Keypad #35 Área Serviço',cota:'1,10m',comodo:'Área Serviço',metros:'20'},
 {id:'KEY-07',destino:'Keypad #36 Despensa',cota:'1,10m',comodo:'Despensa',metros:'18'},
 {id:'KEY-08',destino:'Keypad #37 Lavabo',cota:'1,10m',comodo:'Lavabo',metros:'10'},
 {id:'KEY-09',destino:'Keypad #38 WC Serviço',cota:'1,10m',comodo:'WC Serviço',metros:'22'},
 {id:'KEY-10',destino:'Keypad #39 Circulação início',cota:'1,10m',comodo:'Circulação',metros:'8'},
 {id:'KEY-11',destino:'Keypad #40 Circulação final H',cota:'1,10m',comodo:'Circulação',metros:'20'},
 {id:'KEY-12',destino:'Keypad #41 Circulação final V',cota:'1,10m',comodo:'Circulação',metros:'19'},
 {id:'KEY-13',destino:'Keypad #43 WC Social',cota:'1,10m',comodo:'WC Social',metros:'17'},
 {id:'KEY-14',destino:'Keypad #44 cabeceira D Suíte 2',cota:'0,70m',comodo:'Suíte 2',metros:'19'},
 {id:'KEY-15',destino:'Keypad #45 cabeceira E Suíte 2',cota:'0,70m',comodo:'Suíte 2',metros:'19'},
 {id:'KEY-16',destino:'Keypad #47 cabeceira E Quarto',cota:'0,70m',comodo:'Quarto',metros:'17'},
 {id:'KEY-17',destino:'Keypad #48 cabeceira D Quarto',cota:'0,70m',comodo:'Quarto',metros:'17'},
 {id:'KEY-18',destino:'Keypad #49 Área Externa (Master)',cota:'1,10m',comodo:'Área Externa',metros:'24'},
 {id:'KEY-19',destino:'Keypad #50 Área Externa (Circ.)',cota:'1,10m',comodo:'Área Externa',metros:'22'},
 {id:'KEY-20',destino:'Keypad #51 cabeceira D Suíte Master',cota:'0,70m',comodo:'Suíte Master',metros:'23'},
 {id:'KEY-21',destino:'Keypad #52 cabeceira E Suíte Master',cota:'0,70m',comodo:'Suíte Master',metros:'23'},
 {id:'KEY-22',destino:'Keypad #53 WC Suíte Master',cota:'1,10m',comodo:'WC Suíte Master',metros:'25'},
]

const modulos=[
 {id:'M1',funcao:'Iluminação estar',carga:'5 spots LED',ambiente:'Estar'},
 {id:'M2',funcao:'Iluminação jantar',carga:'Lustre + spots',ambiente:'Jantar'},
 {id:'M3',funcao:'Iluminação cozinha',carga:'Spots LED bancada + geral',ambiente:'Cozinha'},
 {id:'M4',funcao:'Iluminação lavabo',carga:'Spots LED',ambiente:'Lavabo'},
 {id:'M5',funcao:'Iluminação despensa',carga:'LED',ambiente:'Despensa'},
 {id:'M6',funcao:'Iluminação área serviço',carga:'LED',ambiente:'A.S.'},
 {id:'M7',funcao:'Iluminação WC serviço',carga:'LED',ambiente:'W.C.'},
]

const banheirosSensores=[
 {ambiente:'Lavabo',ponto:'Sensor mmWave #18',obs:'luz automática'},
 {ambiente:'Cozinha',ponto:'Sensor mmWave #32',obs:'luz automática'},
 {ambiente:'WC Social',ponto:'Sensor mmWave #42',obs:'luz automática'},
 {ambiente:'WC Suíte Master',ponto:'Sensor mmWave #34',obs:'luz automática'},
 {ambiente:'Estar',ponto:'Sensor mmWave #33',obs:'presença / cenas'},
]

const resumoCabos=[
 {tipo:'CAT6 U/UTP interno',metros_total:'275'},
 {tipo:'CAT6 FTP externo',metros_total:'25'},
 {tipo:'Cabo Som 2×1,5mm²',metros_total:'62'},
 {tipo:'Cabo Elétrico 2,5mm² (keypads)',metros_total:'420'},
 {tipo:'Cabo Elétrico 2,5mm² (módulos/hubs)',metros_total:'49'},
 {tipo:'Cabo Elétrico 4mm² (rack)',metros_total:'5'},
]

const pecas=[
 {item:'Access Point U6+',qtd:'3'},{item:'Câmera G5 Dome interna',qtd:'1'},
 {item:'Câmera G5 Bullet externa MIC',qtd:'1'},{item:'Keystone CAT6',qtd:'13'},
 {item:'Keypad Zigbee 1 botão',qtd:'9'},{item:'Keypad Zigbee 2 botões',qtd:'10'},
 {item:'Keypad Zigbee 3 botões',qtd:'2'},{item:'Keypad Zigbee 6 botões 4x4',qtd:'1'},
 {item:'Sensor mmWave 24GHz teto',qtd:'5'},{item:'Hub IR Zigbee Matter parede',qtd:'3'},
 {item:'Hub IR Zigbee PRO teto',qtd:'1'},{item:'Módulo Cortina Zigbee LR',qtd:'1'},
 {item:'Caixa JBL Stage 260CSA',qtd:'7'},{item:'Subwoofer JBL Stage 220P 12pol',qtd:'1'},
 {item:'Dream Machine SE',qtd:'1'},{item:'Switch PoE+ 16 portas',qtd:'1'},
 {item:'Patch Panel 24 portas CAT6',qtd:'1'},{item:'Rack 19pol 12U',qtd:'1'},
 {item:'Régua energia 8 tomadas filtrada',qtd:'1'},{item:'Organizador cabo horizontal 1U',qtd:'2'},
 {item:'Amplificador multicanal 8 zonas',qtd:'1'},{item:'Tomada USB cabeceira',qtd:'18'},
 {item:'Tomada comum cabeceira',qtd:'18'},{item:'Caixa 4x4 polegadas embutir',qtd:'45'},
 {item:'Eletroduto 3/4 polegadas',qtd:'150m'},{item:'Patch cord CAT6 sortidos',qtd:'25'},
]

const checklistObra=[
 '1. Passar eletroduto 3/4" em todas as paredes antes do revestimento',
 '2. Deixar caixa 4×4 em CADA keypad com NEUTRO chegando (obrigatório)',
 '3. Em CADA cabeceira de cama: 2 caixas 4×4 (keypad+USB) + 1 ponto de tomada por lado',
 '4. Eletroduto seco 3/4" do rack até o forro para câmeras e APs',
 '5. Passe de cabo CAT6 do rack até cada AP no teto antes de fechar o forro',
 '6. Tomada 110V 20A dedicada + aterramento no nicho do rack',
 '7. Prever vão de 19pol + ventilação no armário da TV para o rack 12U',
 '8. Sangria no teto para cada caixa de som embutida (7 caixas + sub)',
 '9. Ponto de força no forro para o módulo de cortina do Estar',
 '10. Deixar fio-guia em todos os eletrodutos',
 '11. Identificar todos os circuitos no quadro de luz',
 '12. Marcar com fita todos os 53 pontos antes de rebocar',
]
const checklistRaro=[
 '1. Conferir neutro chegando em 100% das caixas de keypad',
 '2. Testar continuidade de cada um dos cabos CAT6',
 '3. Crimpar e etiquetar o patch panel conforme tabela (seção 6)',
 '4. Energizar Dream Machine SE e configurar Wi-Fi (3 APs)',
 '5. Parear os 22 keypads e o módulo de cortina (Zigbee)',
 '6. Configurar cenas por ambiente e cabeceiras',
 '7. Testar cobertura Wi-Fi em todos os cômodos',
 '8. Testar som por zona (Estar 5 + Jantar 2 + sub)',
 '9. Configurar e testar as 2 câmeras no app',
 '10. Treinar Eduardo & Regina no app RARO Home',
]
const riscos=[
 'Neutro ausente nas caixas pode danificar keypads — conferir antes de instalar',
 'Câmera externa #5: usar cabo CAT6 FTP blindado e caixa IP65',
 'Forro de gesso dificulta passagem de cabo após fechado — confirmar todos os pontos antes',
]

export const SEED_MARKERS=[
 {n:1,id:'W1',name:'Access Point U6+',code:'',room:'Jantar',x:27,y:46,note:'teto centro 2,70m'},
 {n:2,id:'W2',name:'Access Point U6+',code:'',room:'Circulação',x:62,y:34,note:'teto centro 2,70m'},
 {n:3,id:'W3',name:'Access Point U6+',code:'',room:'Suíte Master',x:80,y:56,note:'corredor teto 2,70m'},
 {n:4,id:'C1',name:'Câmera Dome G5 Interna',code:'',room:'Cozinha',x:6,y:57,note:'canto 2,50m'},
 {n:5,id:'C2',name:'Câmera G5 Bullet Externa MIC',code:'',room:'A. Externa',x:70,y:8,note:'quina 2,80m externa'},
 {n:6,id:'K1',name:'2× Keystone CAT6',code:'',room:'Estar',x:14,y:58,note:'TV/rack 0,50m'},
 {n:7,id:'K2',name:'Keystone CAT6',code:'',room:'Cozinha',x:29,y:37,note:'1,10m'},
 {n:8,id:'K3',name:'Keystone CAT6',code:'',room:'Cozinha',x:35,y:30,note:'ilha 0,80m'},
 {n:9,id:'K4',name:'Keystone CAT6',code:'',room:'Suíte Master',x:96,y:45,note:'TV 1,20m'},
 {n:10,id:'K5',name:'Keystone CAT6',code:'',room:'Suíte 2',x:60,y:23,note:'TV 1,20m'},
 {n:11,id:'K6',name:'2× Keystone CAT6',code:'',room:'Suíte 2',x:66,y:5,note:'escritório 0,30m'},
 {n:12,id:'K7',name:'Keystone CAT6',code:'',room:'Quarto',x:70,y:48,note:'TV 1,20m'},
 {n:13,id:'K8',name:'2× Keystone CAT6',code:'',room:'Quarto',x:78,y:33,note:'escritório 0,30m'},
 {n:14,id:'KP1',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Cozinha',x:34,y:20,note:'entrada 1,10m'},
 {n:15,id:'KP2',name:'Keypad Premium Zigbee 3 Botões Prata',code:'',room:'Suíte Master',x:67,y:64,note:'entrada 1,10m'},
 {n:16,id:'KP3',name:'Keypad Premium Zigbee 3 Botões Prata',code:'',room:'Suíte 2',x:60,y:16,note:'entrada 1,10m'},
 {n:17,id:'KP4',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Quarto',x:65,y:31,note:'entrada 1,10m'},
 {n:18,id:'P1',name:'Sensor Zigbee mmWave 24Ghz Teto',code:'',room:'Lavabo',x:49,y:50,note:'teto centro'},
 {n:19,id:'KP5',name:'Keypad Premium Zigbee 4x4 6 Botões Prata',code:'',room:'Estar',x:20,y:21,note:'entrada 1,10m'},
 {n:20,id:'M1',name:'Módulo Cortina Zigbee Long Range',code:'',room:'Estar',x:5,y:9,note:'forro 2,70m'},
 {n:21,id:'S1',name:'Caixa JBL Stage 260CSA',code:'',room:'Estar',x:8,y:22,note:'teto 2,70m'},
 {n:22,id:'S2',name:'Caixa JBL Stage 260CSA',code:'',room:'Estar',x:17,y:53,note:'teto 2,70m'},
 {n:23,id:'S3',name:'Caixa JBL Stage 260CSA',code:'',room:'Estar',x:12,y:53,note:'teto 2,70m'},
 {n:24,id:'S4',name:'Caixa JBL Stage 260CSA',code:'',room:'Estar',x:18,y:22,note:'teto 2,70m'},
 {n:25,id:'S5',name:'Caixa JBL Stage 260CSA',code:'',room:'Estar',x:8,y:53,note:'teto 2,70m'},
 {n:26,id:'SUB',name:'Subwoofer JBL Stage 220P 12pol',code:'',room:'Estar',x:14,y:63,note:'chão junto rack'},
 {n:27,id:'S6',name:'Caixa JBL Stage 260CSA',code:'',room:'Jantar',x:27,y:53,note:'teto 2,70m'},
 {n:28,id:'S7',name:'Caixa JBL Stage 260CSA',code:'',room:'Jantar',x:41,y:53,note:'teto 2,70m'},
 {n:29,id:'IR1',name:'Hub IR Zigbee Matter',code:'',room:'Estar',x:20,y:6,note:'teto sobre AC'},
 {n:30,id:'IR2',name:'Hub IR Zigbee Matter',code:'',room:'jantar',x:44,y:36,note:'teto sobre AC'},
 {n:31,id:'IR3',name:'Hub IR Zigbee Matter',code:'',room:'Quarto',x:77,y:31,note:'teto sobre AC'},
 {n:32,id:'P2',name:'Sensor Zigbee mmWave 24Ghz Teto',code:'',room:'cozinha',x:32,y:27,note:'teto centro'},
 {n:33,id:'P3',name:'Sensor Zigbee mmWave 24Ghz Teto',code:'',room:'Estar',x:24,y:28,note:'teto centro'},
 {n:34,id:'P4',name:'Sensor Zigbee mmWave 24Ghz Teto',code:'',room:'WC suite master',x:82,y:45,note:'teto centro'},
 {n:35,id:'KP6',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Area de Serviço',x:44,y:14,note:'entrada 1,10m'},
 {n:36,id:'KP7',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Despensa',x:50,y:32,note:'entrada 1,10m'},
 {n:37,id:'KP8',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Lavabo',x:46,y:55,note:'interna 1,10m'},
 {n:38,id:'KP9',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'WC servico',x:53,y:46,note:'interna 1,10m'},
 {n:39,id:'KP10',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Circulação',x:45,y:61,note:'início jantar 1,10m'},
 {n:40,id:'KP11',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Circulação',x:60,y:62,note:'final corredor 1,10m'},
 {n:41,id:'KP12',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'Circulação',x:62,y:25,note:'circ. vertical 1,10m'},
 {n:42,id:'P5',name:'Sensor Zigbee mmWave 24Ghz Teto',code:'',room:'wc social',x:57,y:48,note:'teto centro'},
 {n:43,id:'KP13',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'wc social',x:59,y:39,note:'entre portas 1,10m'},
 {n:44,id:'KP14',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Suíte 2',x:53,y:25,note:'cabeceira D 0,70m + USB + tomada'},
 {n:45,id:'KP15',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Suíte 2',x:53,y:16,note:'cabeceira E 0,70m + USB + tomada'},
 {n:46,id:'IR4',name:'Hub IR Zigbee Teto Embutir',code:'',room:'Suite2',x:52,y:7,note:'teto sobre AC'},
 {n:47,id:'KP16',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Quarto',x:72,y:31,note:'cabeceira E 0,70m + USB + tomada'},
 {n:48,id:'KP17',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Quarto',x:67,y:24,note:'cabeceira D 0,70m + USB + tomada'},
 {n:49,id:'KP18',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'A. Externa',x:91,y:14,note:'saída Master 1,10m IP65'},
 {n:50,id:'KP19',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'A. Externa',x:66,y:18,note:'saída circ. 1,10m IP65'},
 {n:51,id:'KP20',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Suíte Master',x:87,y:34,note:'cabeceira D 0,70m + USB + tomada'},
 {n:52,id:'KP21',name:'Keypad Premium Zigbee 1 Botão Prata',code:'',room:'Suíte Master',x:87,y:46,note:'cabeceira E 0,70m + USB + tomada'},
 {n:53,id:'KP22',name:'Keypad Premium Zigbee 2 Botões Prata',code:'',room:'WC suite master',x:84,y:49,note:'interna 0,70m'},
]

function buildSeedExecHtml(){
  const hoje='09/06/2026'
  const cliente='Eduardo & Regina'
  const RC=['#0EA5E9','#16A34A','#7C3AED','#D97706','#DC2626','#0891B2']
  const rackVisual=`
<div style="margin:12px 0 20px;border:2px solid #1e293b;border-radius:8px;overflow:hidden;max-width:560px">
  <div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center">
    <span>RACK 12U — CPD (Sala de Estar)</span>
    <span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">8 portas DM SE · 5 dispositivos PoE</span>
  </div>
  ${rackItems.map((r,i)=>`
  <div style="display:flex;align-items:stretch;border-bottom:1px solid #e2e8f0;min-height:32px">
    <div style="background:${RC[i%RC.length]};color:#fff;font-size:10px;font-weight:700;width:56px;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:4px">${esc(r.u)}</div>
    <div style="flex:1;background:${i%2===0?'#f8fafc':'#fff'};padding:6px 12px;display:flex;align-items:center;gap:12px">
      <div style="font-size:11px;font-weight:600;color:#0D1420;min-width:200px">${esc(r.equip)}</div>
      <div style="font-size:10px;color:#64748b;flex:1">${esc(r.funcao)}</div>
      ${r.watts&&r.watts!=='—'?`<div style="font-size:9px;color:#94a3b8;background:#f1f5f9;padding:2px 6px;border-radius:4px;white-space:nowrap">${esc(r.watts)}</div>`:''}
    </div>
  </div>`).join('')}
  <div style="background:#f1f5f9;padding:8px 14px;display:flex;gap:20px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#16A34A"></div><span style="font-size:10px;color:#374151">APs: <b>3</b></span></div>
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#DC2626"></div><span style="font-size:10px;color:#374151">Câmeras: <b>2</b></span></div>
    <div style="display:flex;align-items:center;gap:6px;background:#FEF3C7;padding:3px 8px;border-radius:4px"><span style="font-size:10px;color:#92400E">Switch PoE+ 16p incluído (folga p/ expansão)</span></div>
  </div>
</div>`

  const modulosTetoHtml=modulosTeto.map(mt=>`
<div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid">
  <div style="background:#0369A1;color:#fff;padding:6px 12px;font-size:12px;font-weight:700">${esc(mt.ambiente)}</div>
  <div style="padding:8px 12px;background:#fff">
    ${mt.itens.map(it=>`<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151"><span style="color:#0EA5E9">&#9656;</span>${esc(it)}</div>`).join('')}
  </div>
</div>`).join('')

  const pontosHtml=pontos.map(a=>`<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T(a.linhas.map(l=>`<tr><td><b>${esc(l.ponto)}</b></td><td>${esc(l.equip)}</td><td>${esc(l.parede)}</td><td>${esc(l.dist)}</td><td>${esc(l.alt)}</td><td>${esc(l.caixa)}</td><td>${esc(l.cabo)}</td></tr>`).join(''),['Ponto','Equip.','Parede ref.','Dist.','Alt.','Caixa','Cabo'])}`).join('')

  const colorHex={Azul:'#0EA5E9',Amarelo:'#D97706',Verde:'#16A34A',Vermelho:'#DC2626'}
  const cabosRedeHtml=T(cabosRede.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td><span style="background:${colorHex[r.cor]||'#374151'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${esc(r.cor)}</span></td><td style="font-family:monospace;font-size:10px;background:#F0F9FF;color:#0369A1"><b>${esc(r.pp)}</b></td><td style="font-family:monospace;font-size:10px;font-weight:700;color:#0D1420">${esc(r.etiqueta)}</td></tr>`).join(''),['ID','Origem','Destino','Tipo','Metros','Cor Cabo','Porta PP','Etiqueta'])

  const cabosSomHtml=T(cabosSom.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td style="font-family:monospace;font-size:10px">${esc(r.etiqueta)}</td></tr>`).join(''),['ID','Origem','Destino','Tipo','Metros','Etiqueta'])

  const cabosEletHtml=cabosEletPorComodo.map(c=>`<h3 class="ex-amb">${esc(c.comodo)}</h3>${T(c.itens.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.equip)}</td><td>${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.fios)}</td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.metros)}m</td><td style="color:#6B7280;font-size:10px">${esc(r.obs)}</td></tr>`).join(''),['ID','Equipamento','Tipo','Fios','Origem','Destino','m','Obs'])}`).join('')

  const alimHtml=T(alimKeypads.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>Quadro luz</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">2×2,5mm² F+N</td></tr>`).join(''),['ID','Origem','Destino (Keypad)','Cota','Cômodo','m','Fios'])

  const modulosHtml=T(modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.carga)}</td><td>${esc(r.ambiente)}</td></tr>`).join(''),['ID','Função','Carga','Ambiente'])
  const banhHtml=T(banheirosSensores.map(r=>`<tr><td><b>${esc(r.ambiente)}</b></td><td>${esc(r.ponto)}</td><td>${esc(r.obs)}</td></tr>`).join(''),['Ambiente','Ponto','Observação'])
  const resumoHtml=T(resumoCabos.map(r=>`<tr><td><b>${esc(r.tipo)}</b></td><td>${esc(r.metros_total)}m</td></tr>`).join(''),['Tipo de cabo','Metragem total'])
  const pecasHtml=T(pecas.map(r=>`<tr><td>${esc(r.item)}</td><td>${esc(r.qtd)}</td></tr>`).join(''),['Item','Qtd'])

  const byRoom={}; const geral={}
  SEED_MARKERS.forEach(m=>{
    const r=m.room||'Geral'; const key=m.name||'Item'
    if(!byRoom[r]) byRoom[r]={}
    byRoom[r][key]=(byRoom[r][key]||0)+1
    geral[key]=(geral[key]||0)+1
  })
  let itensComodoHtml=''
  Object.entries(byRoom).forEach(([room,items])=>{
    const total=Object.values(items).reduce((s,q)=>s+q,0)
    itensComodoHtml+=`<h3 class="ex-amb">${esc(room)} — ${total} item(ns)</h3>`+T(
      Object.entries(items).map(([nm,q])=>`<tr><td>${esc(nm)}</td><td><span style="color:#16A34A;font-weight:600">Catálogo</span></td><td><b>${q}</b></td></tr>`).join(''),['Item','Origem','Qtd'])
  })
  const totalGeralHtml=T(
    Object.entries(geral).sort((a,b)=>b[1]-a[1]).map(([nm,q])=>`<tr><td>${esc(nm)}</td><td>Catálogo</td><td><b>${q}</b></td></tr>`).join('')
    +`<tr style="background:#060B1A"><td style="color:#fff;font-weight:700">TOTAL GERAL</td><td></td><td style="color:#fff;font-weight:700">${Object.values(geral).reduce((s,q)=>s+q,0)}</td></tr>`,
    ['Item','Origem','Qtd total'])

  const totalPontos=SEED_MARKERS.length
  const roomCounts=Object.entries(byRoom).map(([r,items])=>({room:r,qty:Object.values(items).reduce((s,q)=>s+q,0)})).sort((a,b)=>b.qty-a.qty)
  const maxRoom=Math.max(1,...roomCounts.map(r=>r.qty))
  const bc=['#0EA5E9','#7C3AED','#16A34A','#D97706','#DC2626','#0891B2','#DB2777','#65A30D']
  const g1=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">Distribuição de Pontos por Ambiente (${totalPontos} total)</div>
    ${roomCounts.map((r,i)=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="width:130px;font-size:11px;text-align:right;color:#456;flex-shrink:0">${esc(r.room)}</div>
      <div style="flex:1;background:#eef2f7;border-radius:4px;height:20px"><div style="width:${Math.round(r.qty/maxRoom*100)}%;background:${bc[i%bc.length]};height:100%;border-radius:4px;min-width:24px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;color:#fff;font-size:10px;font-weight:700">${r.qty}</div></div></div>`).join('')}
  </div>`

  const tipos={}
  SEED_MARKERS.forEach(m=>{
    let t='Outro'; const n=m.name.toLowerCase()
    if(n.includes('keypad'))t='Keypad'; else if(n.includes('câmera'))t='Câmera'; else if(n.includes('access point'))t='Access Point'
    else if(n.includes('caixa')||n.includes('subwoofer'))t='Som'; else if(n.includes('hub ir'))t='Hub IR'
    else if(n.includes('sensor'))t='Sensor'; else if(n.includes('keystone'))t='Keystone'; else if(n.includes('módulo'))t='Módulo'
    tipos[t]=(tipos[t]||0)+1
  })
  const tc={'Keypad':'#059669','Câmera':'#DC2626','Access Point':'#0E7490','Som':'#BE185D','Hub IR':'#D97706','Sensor':'#16A34A','Keystone':'#6366F1','Módulo':'#7C3AED','Outro':'#374151'}
  const g2=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">Tipos de Equipamento</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${Object.entries(tipos).sort((a,b)=>b[1]-a[1]).map(([t,q])=>`<div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;min-width:130px"><div style="width:32px;height:32px;border-radius:50%;background:${tc[t]||'#374151'};color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${q}</div><span style="font-size:12px;color:#374151;font-weight:500">${t}</span></div>`).join('')}</div>
  </div>`

  const maxM=Math.max(1,...resumoCabos.map(r=>parseInt(r.metros_total)||0))
  const cc=['#0EA5E9','#16A34A','#D97706','#DC2626','#7C3AED','#0E7490']
  const g3=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">Metragem de Cabeamento por Tipo</div>
    ${resumoCabos.map((r,i)=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><div style="width:180px;font-size:10px;text-align:right;color:#456;flex-shrink:0">${esc(r.tipo)}</div><div style="flex:1;background:#eef2f7;border-radius:4px;height:20px"><div style="width:${Math.round((parseInt(r.metros_total)||0)/maxM*100)}%;background:${cc[i%cc.length]};height:100%;border-radius:4px;min-width:30px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-size:10px;font-weight:700">${r.metros_total}m</div></div></div>`).join('')}
  </div>`

  const fases=['Infraestrutura / Eletroduto','Passagem de cabos','Instalação de equipamentos','Configuração e cenas','Testes e entrega']
  const fdesc=['Eletrodutos, caixas 4×4, cabeceiras, nicho do rack','CAT6, elétrico keypads, som, cabos câmeras/APs','Rack, DM SE, keypads, câmeras, sensores','Parear Zigbee, cenas, app, cabeceiras','Wi-Fi, som por zona, câmeras, treinamento']
  const fdur=['2 sem','1 sem','2 sem','1 sem','3 dias']
  const g4=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-size:12px;font-weight:700;margin-bottom:14px;color:#0D1420">Fases do Projeto</div>
    ${fases.map((f,i)=>`<div style="display:flex;gap:14px"><div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0"><div style="width:32px;height:32px;border-radius:50%;background:${bc[i%bc.length]};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</div>${i<fases.length-1?'<div style="width:2px;flex:1;background:#dde6f0;min-height:28px"></div>':''}</div><div style="padding-bottom:22px;padding-top:4px;flex:1"><div style="font-size:12px;font-weight:700;color:#0D1420">${f}</div><div style="font-size:10px;color:#64748b;margin-top:2px">${fdesc[i]}</div><div style="display:inline-block;background:${bc[i%bc.length]}22;color:${bc[i%bc.length]};font-size:10px;font-weight:600;padding:1px 8px;border-radius:8px;margin-top:4px">${fdur[i]}</div></div></div>`).join('')}
  </div>`

  return `<style>${EXEC_CSS}</style>
<div class="ex-doc">
  <div class="ex-cover">
    <div class="ex-cover-top">DOCUMENTO TÉCNICO · PROJETO EXECUTIVO</div>
    <img src="${LOGO_EXEC}" alt="RARO HOME" style="width:150px;max-width:50%;margin:0 auto 8px;display:block;border-radius:8px"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">Projeto Executivo de Automação</div>
    <div class="ex-cover-sub">Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${cliente}</div><div class="ex-cc-meta">${hoje} · RARO Home</div></div>
    <div class="ex-cover-foot">RARO Home · contato@rarohome.com.br · (21) 98170-9009</div>
  </div>
  ${sec('1. Premissas Confirmadas', list(premissas))}
  ${sec('3. Detalhe do RACK / CPD', list(rackDetalhe)+rackVisual)}
  ${sec('4. Módulos e Caixas de Teto — por Cômodo', modulosTetoHtml)}
  ${sec('5. Keypads, Câmeras e Pontos de Parede', pontosHtml)}
  ${sec('6. Cabos de Rede — Patch Panel e Etiquetas', cabosRedeHtml)}
  ${sec('7. Cabos de Som — Amplificador no RACK', cabosSomHtml)}
  ${sec('8. Cabos Elétricos — por Cômodo', cabosEletHtml)}
  ${sec('9. Alimentação dos Keypads (Fase + Neutro)', alimHtml)}
  ${sec('10. Módulos e Cargas (iluminação + cortinas)', modulosHtml)}
  ${sec('11. Banheiros, Circulação e Sensores', banhHtml)}
  ${sec('12. Resumo Geral de Cabeamento', resumoHtml)}
  ${sec('14. Lista Completa de Peças', pecasHtml)}
  ${sec('15. Checklist de Obra — para o Arquiteto / Eletricista', list(checklistObra))}
  ${sec('16. Checklist de Instalação — Equipe RARO Home', list(checklistRaro))}
  ${sec('17. Pontos de Atenção e Riscos', list(riscos))}
  ${sec('18. Fotos no Diário de Obra', '<p class="ex-p">O mestre de obra deve fotografar cada ponto pelo número antes de fechar a parede, registrando no app RARO Home. Assim cada foto fica atrelada ao ponto correspondente.</p>')}
  ${sec('19. Itens por Cômodo e Total Geral', itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml)}
  ${sec('20. Gráficos e Linha do Tempo do Projeto', g1+g2+g3+g4)}
</div>`
}

export const SEED_EXEC_DOC = buildSeedExecHtml()

export function buildSeedFloors(){
  const roomMap={}
  SEED_MARKERS.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
  return [{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
    name, items:items.map(m=>({name:m.name,code:m.code||'',qty:'1',cost_price:0,sale_price:0,category:''})),
    price:'0'
  }))}]
}

export const SEED_PROPOSAL = {
  client_name: 'Eduardo & Regina',
  neighborhood: 'Copacabana, Rio de Janeiro',
  code: 'ER-2026',
  description: 'Projeto Executivo de Automação — Copacabana/RJ',
  status: 'draft',
  labor: 0,
  valid_days: 30,
  floors: buildSeedFloors(),
  planta_data: { image: null, markers: SEED_MARKERS },
  exec_doc: SEED_EXEC_DOC,
}
