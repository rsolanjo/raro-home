
const RJ_DIST = {
  'campo grande':0,'senador vasconcelos':4,'cosmos':6,'santa cruz':12,'paciência':15,
  'guaratiba':18,'barra de guaratiba':22,'pedra de guaratiba':24,'sepetiba':20,
  'bangu':10,'padre miguel':12,'realengo':14,'deodoro':16,'marechal hermes':18,
  'cascadura':20,'madureira':22,'turiaçu':21,'rocha miranda':23,'engenho de dentro':34,
  'barra da tijuca':38,'recreio':40,'vargem grande':36,'vargem pequena':34,
  'jacarepaguá':30,'curicica':28,'pechincha':26,'taquara':24,'praça seca':26,
  'botafogo':45,'flamengo':47,'catete':47,'glória':48,'santa teresa':48,
  'centro':46,'lapa':45,'copacabana':50,'ipanema':52,'leblon':54,'gávea':50,
  'urca':52,'humaitá':48,'laranjeiras':46,'tijuca':40,'vila isabel':38,
  'são cristóvão':44,'penha':38,'olaria':40,'ilha do governador':48,
  'niterói':55,'icaraí':57,'itaipava':110,'petrópolis':120,'teresópolis':140,
  'nova iguaçu':25,'duque de caxias':35,'nilópolis':28,'belford roxo':25,
}
// Base RARO: Estr. da Cachamorra, 2011 - Campo Grande, RJ. Distâncias de IDA (km) aproximadas.
function guessKm(neighborhood='') {
  if(!neighborhood) return null
  // normaliza: minúsculas, sem acento, sem ", rio de janeiro - rj", sem CEP
  let key = neighborhood.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\d{5}-?\d{3}/g,'')
    .replace(/-?\s*(rio de janeiro|rj|brasil)\.?/g,'')
    .replace(/[,\-–].*$/,'')   // corta tudo após vírgula/traço (pega só o bairro)
    .trim()
  if(!key) return null
  // match exato primeiro
  const norm = s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  for(const [k,v] of Object.entries(RJ_DIST)){ if(norm(k)===key) return v }
  // depois match parcial (bairro contém a chave ou vice-versa)
  for(const [k,v] of Object.entries(RJ_DIST)){ const kn=norm(k); if(key.includes(kn)||kn.includes(key)) return v }
  return null
}
function calcTravelCost(km, visits, fuelPrice, consumption) {
  if(!km||!visits||!fuelPrice||!consumption) return 0
  return (km * 2 * visits / consumption * fuelPrice)
}

import { useState, useEffect, useRef } from 'react'
import { saveProject, deleteProject, addAnnotation } from '../db/supabase.js'
import DiarioObra from './DiarioObra.jsx'

const PHASES = [
  { key:'visit',       label:'Visita',      color:'#7C3AED', icon:'ti-map-pin' },
  { key:'measurement', label:'Medição',     color:'#EA580C', icon:'ti-ruler' },
  { key:'project',     label:'Projeto',     color:'#1A56DB', icon:'ti-pencil' },
  { key:'budget',      label:'Orçamento',   color:'#0A7E5A', icon:'ti-file-invoice' },
  { key:'purchase',    label:'Compras',     color:'#92540B', icon:'ti-shopping-cart' },
  { key:'installation',label:'Instalação',  color:'#1A56DB', icon:'ti-tool' },
  { key:'config',      label:'Configuração',color:'#7C3AED', icon:'ti-settings' },
  { key:'done',        label:'Concluído',   color:'#0A7E5A', icon:'ti-check' },
]
const CABLE_COLORS = {
  rj45:     { label:'RJ45 Dados',  color:'#2563EB' },
  electric: { label:'Elétrico',    color:'#DC2626' },
  hdmi:     { label:'HDMI',        color:'#7C3AED' },
  fiber:    { label:'Fibra',       color:'#D97706' },
}
const newProj = () => ({
  client_id:'', client_name:'', description:'', type:'Automação completa',
  phase:'visit', in_obra:false, deadline:'', area_m2:'',
  visit_date:'', visit_notes:'', measurement_date:'',
  cables:{rj45:0,electric:0,hdmi:0,fiber:0,other:''},
  cable_paths:'', plant_link:'', heatmap_link:'', heatmap_notes:'', ir_map:'',
  purchase_list:[], rooms_config:[], annotations:[], notes:'',
})

export default function Projects({ projects, clients, proposals=[], catalog=[], suppliers=[], onRefresh, currentUser }) {
  const [sel, setSel] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(newProj())
  const [tab, setTab] = useState('overview')
  const [note, setNote] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({item:'',code:'',qty:1,unit_price:0,supplier:'',arrival_date:'',arrived:false,buy_link:'',source:'catalog'})
  const [localCosts, setLocalCosts] = useState(null)

  const active = projects.filter(p=>p.phase!=='done')
  const done = projects.filter(p=>p.phase==='done')
  const proj = sel ? projects.find(p=>p.id===sel) : null

  // ── useEffect: init localCosts when proj or tab changes ──────────────────
  useEffect(() => {
    if (proj && tab === 'costs') {
      setLocalCosts({
        travel_km: proj.travel_km ?? '',
        travel_visits: proj.travel_visits ?? 5,
        fuel_price: proj.fuel_price ?? 6.50,
        fuel_consumption: proj.fuel_consumption ?? 8,
        labor_hours_estimated: proj.labor_hours_estimated ?? 0,
        labor_hours_actual: proj.labor_hours_actual ?? 0,
        hourly_rate: proj.hourly_rate ?? 150,
        third_party_costs: proj.third_party_costs || [],
      })
    }
  }, [sel, tab]) // re-init when switching project or entering costs tab

  const costs = (tab === 'costs' && localCosts) ? localCosts : (proj || {})
  // bairro vem do cliente cadastrado (não do projeto). Calcula a ida a partir da base RARO (Campo Grande).
  const projClient = proj ? clients.find(c=>c.id===Number(proj.client_id)) : null
  const projBairro = projClient?.neighborhood || proj?.neighborhood || ''

  // Save costs explicitly
  async function saveCosts() {
    if (!proj || !localCosts) return
    try {
      await saveProject({...proj, ...localCosts})
      onRefresh()
    } catch(e) { console.error('saveCosts:', e); alert('Erro ao salvar: '+e.message) }
  }

  // upd: for non-costs tabs, save immediately
  async function upd(patch) {
    if(!proj) return
    try { await saveProject({...proj,...patch}); onRefresh() } catch(e){ console.error('upd:',e) }
  }

  function phaseIdx(k){ return PHASES.findIndex(p=>p.key===k) }

  function advance(){
    const phases = PHASES.map(p=>p.key)
    const i = phases.indexOf(proj.phase)
    if(i < phases.length-1) upd({phase: phases[i+1]})
  }

  function addNote(){
    if(!note.trim()||!proj) return
    addAnnotation(proj.id, note.trim(), currentUser?.name||'Sistema')
    setNote(''); onRefresh()
  }

  function addRoom(){
    if(!newRoom.trim()||!proj) return
    const rooms=[...(proj.rooms_config||[]),{name:newRoom.trim(),installed:false,configured:false,tested:false,delivered:false,notes:''}]
    upd({rooms_config:rooms}); setNewRoom('')
  }

  function toggleRoom(i,f){
    const rooms=proj.rooms_config.map((r,j)=>j===i?{...r,[f]:!r[f]}:r)
    upd({rooms_config:rooms})
  }

  function addItem(){
    setNewItem({item:'',code:'',qty:1,unit_price:0,supplier:'',arrival_date:'',arrived:false,buy_link:'',source:'catalog'}); setShowAddItem(true)
  }

  function updItem(i,patch){
    upd({purchase_list:proj.purchase_list.map((x,j)=>j===i?{...x,...patch}:x)})
  }

  async function handleCreate(){
    try {
      const cl = clients.find(c=>c.id===Number(form.client_id))
      const p={...form, client_name: cl ? `${cl.name1} & ${cl.name2}` : form.client_name}
      await saveProject(p)
      setShowNew(false); onRefresh()
    } catch(err){ console.error(err); alert('Erro ao criar projeto: ' + err.message) }
  }

  const TABS=[
    {key:'overview',label:'Visão geral',icon:'ti-layout-dashboard'},
    {key:'measurement',label:'Medição & Cabos',icon:'ti-ruler'},
    {key:'project2',label:'Projeto & Planta',icon:'ti-map'},
    {key:'purchase',label:'Compras',icon:'ti-shopping-cart'},
    {key:'installation',label:'Instalação',icon:'ti-tool'},
    {key:'diario',label:'Diário de Obra',icon:'ti-camera'},
    {key:'notes',label:'Anotações',icon:'ti-pencil'},
    {key:'costs',label:'Custos',icon:'ti-coin'},
  ]

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <i className="ti ti-layout-kanban" aria-hidden />
          Projetos{proj && <><span style={{color:'var(--text3)',margin:'0 8px'}}>/</span>{proj.client_name}</>}
        </div>
        <div className="topbar-acts">
          {proj && <>
            <button className="btn" onClick={()=>setSel(null)}><i className="ti ti-arrow-left" aria-hidden />Voltar</button>
            {proj.phase!=='done' && <button className="btn primary" onClick={advance}><i className="ti ti-chevron-right" aria-hidden />Avançar fase</button>}
          </>}
          {!proj && <button className="btn primary" onClick={()=>{setForm(newProj());setShowNew(true)}}><i className="ti ti-plus" aria-hidden />Novo projeto</button>}
        </div>
      </div>

      {/* LIST */}
      {!proj && <div className="content">
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">Projetos ativos ({active.length})</div></div>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Tipo</th><th>Fases</th><th>Em obra</th><th>Prazo</th><th></th></tr></thead>
            <tbody>
              {active.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum projeto ativo</td></tr>}
              {active.map(p=>{
                const ci=phaseIdx(p.phase)
                return <tr key={p.id}>
                  <td><div style={{fontWeight:500}}>{p.client_name}</div><div className="sub">{p.description}</div></td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{p.type}</td>
                  <td><div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
                    {PHASES.map((ph,i)=><span key={ph.key} style={{padding:'2px 5px',borderRadius:3,fontSize:9,fontWeight:500,background:i<ci?'var(--green-lt)':i===ci?'var(--accent-lt)':'var(--surf2)',color:i<ci?'var(--green)':i===ci?'var(--accent-dk)':'var(--text3)'}}>{ph.label}</span>)}
                  </div></td>
                  <td><span className={`badge ${p.in_obra?'b-green':'b-gray'}`} style={{fontSize:10}}>{p.in_obra?'Sim':'Não'}</span></td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{p.deadline ? new Date(p.deadline+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}</td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button className="btn" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>{setSel(p.id);setTab('overview')}}><i className="ti ti-eye" aria-hidden />Abrir</button>
                    <button className="btn" style={{fontSize:11,padding:'3px 8px',borderColor:'var(--amber)',color:'var(--amber)'}} onClick={()=>{setSel(p.id);setTab('costs')}} title="Ver custos do projeto">
                      <i className="ti ti-coin" aria-hidden />Custos
                    </button>
                    <button className="btn danger" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>{if(confirm('Excluir?')){deleteProject(p.id);onRefresh()}}}><i className="ti ti-trash" aria-hidden /></button>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        {done.length>0 && <div className="section">
          <div className="sec-hdr"><div className="sec-title">Concluídos ({done.length})</div></div>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Descrição</th><th>Tipo</th><th></th></tr></thead>
            <tbody>{done.map(p=><tr key={p.id}>
              <td style={{fontWeight:500}}>{p.client_name}</td>
              <td style={{color:'var(--text2)'}}>{p.description}</td>
              <td><span className="badge b-green" style={{fontSize:10}}>{p.type}</span></td>
              <td><button className="btn" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>{setSel(p.id);setTab('overview')}}><i className="ti ti-eye" aria-hidden /></button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>}

      {/* DETAIL */}
      {proj && <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {/* Phase bar */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'8px 20px',display:'flex',gap:3,alignItems:'center',flexShrink:0,overflowX:'auto'}}>
          {PHASES.map((ph,i)=>{
            const ci=phaseIdx(proj.phase); const done2=i<ci; const cur=i===ci
            return <div key={ph.key} style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 9px',borderRadius:5,background:done2?'var(--green-lt)':cur?'var(--accent-lt)':'transparent',border:`1px solid ${done2?'var(--green)':cur?'var(--accent)':'var(--border)'}`,fontSize:11,fontWeight:cur?600:400,color:done2?'var(--green)':cur?'var(--accent-dk)':'var(--text3)'}}>
                <i className={`ti ${ph.icon}`} style={{fontSize:11}} aria-hidden />{ph.label}
                {done2 && <i className="ti ti-check" style={{fontSize:9}} aria-hidden />}
              </div>
              {i<PHASES.length-1 && <span style={{color:'var(--text3)',fontSize:11}}>›</span>}
            </div>
          })}
          <div style={{marginLeft:'auto',flexShrink:0}}>
            <span className={`badge ${proj.in_obra?'b-green':'b-gray'}`} style={{fontSize:10,cursor:'pointer'}} onClick={()=>upd({in_obra:!proj.in_obra})}>
              {proj.in_obra?'🏗 Em obra':'⏸ Não em obra'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="proj-tabs-scroll" style={{borderBottom:'1px solid var(--border)',display:'flex',background:'var(--bg)',flexShrink:0,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'9px 13px',border:'none',background:'transparent',cursor:'pointer',fontSize:11.5,color:tab===t.key?'var(--accent)':'var(--text2)',borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`,display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',fontWeight:tab===t.key?500:400,whiteSpace:'nowrap',flexShrink:0}}>
            <i className={`ti ${t.icon}`} aria-hidden />{t.label}
          </button>)}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20}}>

          {/* OVERVIEW */}
          {tab==='overview' && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Dados do projeto</div></div>
              <div style={{padding:14}}>
                {[['Cliente',proj.client_name],['Descrição',proj.description],['Tipo',proj.type],['Área',proj.area_m2?`${proj.area_m2} m²`:'—'],['Prazo',proj.deadline||'—']].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,borderBottom:'0.5px solid var(--border)',padding:'5px 0',marginBottom:4}}><span style={{color:'var(--text3)'}}>{l}</span><span style={{fontWeight:500}}>{v}</span></div>)}
                <div style={{marginTop:10}}>
                  <div className="flabel" style={{marginBottom:4}}>Observações gerais</div>
                  <textarea value={proj.notes||''} onChange={e=>upd({notes:e.target.value})} rows={3} placeholder="Notas gerais..." />
                </div>
              </div>
            </div>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Configuração por cômodo</div></div>
              <div style={{padding:'8px 0'}}>
                {/* Auto-populate from approved proposal */}
                {proj.proposal_id && !(proj.rooms_config||[]).length && (()=>{
                  const linkedProposal = proposals?.find(p=>p.id===proj.proposal_id)
                  if (!linkedProposal) return null
                  const pFloors = Array.isArray(linkedProposal.floors) ? linkedProposal.floors
                    : (typeof linkedProposal.floors==='string'?JSON.parse(linkedProposal.floors||'[]'):[])
                  const allRooms = pFloors.flatMap(f=>(f.rooms||[]).map(r=>r.name)).filter(Boolean)
                  if (!allRooms.length) return null
                  return <div style={{margin:'0 14px 10px',background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',fontSize:12}}>
                    <div style={{fontWeight:500,marginBottom:6,color:'var(--amber)'}}>
                      <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
                      {allRooms.length} cômodos da proposta aprovada disponíveis
                    </div>
                    <button className="btn primary" style={{fontSize:11}} onClick={()=>{
                      const rooms = allRooms.map(name=>({name,installed:false,configured:false,tested:false,delivered:false,notes:''}))
                      upd({rooms_config:rooms})
                    }}>
                      <i className="ti ti-wand" aria-hidden/>Importar cômodos da proposta
                    </button>
                  </div>
                })()}
                <div style={{padding:'0 14px 8px',display:'flex',gap:6}}>
                  <input value={newRoom} onChange={e=>setNewRoom(e.target.value)} placeholder="Adicionar cômodo..." style={{flex:1,fontSize:12}} onKeyDown={e=>e.key==='Enter'&&addRoom()} />
                  <button className="btn primary" style={{fontSize:11}} onClick={addRoom}><i className="ti ti-plus" aria-hidden /></button>
                </div>
                <table className="tbl" style={{fontSize:11}}>
                  <thead><tr><th>Cômodo</th><th style={{textAlign:'center'}}>Inst.</th><th style={{textAlign:'center'}}>Config.</th><th style={{textAlign:'center'}}>Testado</th><th style={{textAlign:'center'}}>Entregue</th></tr></thead>
                  <tbody>
                    {!(proj.rooms_config||[]).length && <tr><td colSpan={5} style={{textAlign:'center',padding:12,color:'var(--text3)'}}>Adicione cômodos acima</td></tr>}
                    {(proj.rooms_config||[]).map((r,i)=><tr key={i}>
                      <td style={{fontWeight:500}}>{r.name}</td>
                      {['installed','configured','tested','delivered'].map(f=><td key={f} style={{textAlign:'center'}}>
                        <input type="checkbox" checked={r[f]} onChange={()=>toggleRoom(i,f)} style={{accentColor:'var(--accent)',width:'auto',cursor:'pointer'}} />
                      </td>)}
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>}

          {/* MEASUREMENT */}
          {tab==='measurement' && <div style={{maxWidth:640}}>
            <div className="section" style={{marginBottom:14}}>
              <div className="sec-hdr"><div className="sec-title">Visita & Medição</div></div>
              <div style={{padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="fg"><div className="flabel">Data da visita</div><input type="date" value={proj.visit_date||''} onChange={e=>upd({visit_date:e.target.value})} /></div>
                <div className="fg"><div className="flabel">Data da medição</div><input type="date" value={proj.measurement_date||''} onChange={e=>upd({measurement_date:e.target.value})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><div className="flabel">Notas da visita</div><textarea value={proj.visit_notes||''} onChange={e=>upd({visit_notes:e.target.value})} rows={3} placeholder="Observações da visita técnica..." /></div>
              </div>
            </div>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Metragem de cabos</div></div>
              <div style={{padding:14}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  {Object.entries(CABLE_COLORS).map(([k,{label,color}])=><div key={k} className="fg">
                    <div className="flabel" style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:10,height:10,borderRadius:2,background:color,flexShrink:0}} />{label} (m)
                    </div>
                    <input type="number" min="0" value={proj.cables?.[k]||0} onChange={e=>upd({cables:{...proj.cables,[k]:Number(e.target.value)}})} />
                  </div>)}
                </div>
                <div className="fg" style={{marginBottom:12}}>
                  <div className="flabel">Outros cabos</div>
                  <input value={proj.cables?.other||''} onChange={e=>upd({cables:{...proj.cables,other:e.target.value}})} placeholder="ex: HDMI 4K 10m x2..." />
                </div>
                <div className="fg">
                  <div className="flabel">Caminho identificado dos cabos</div>
                  <textarea value={proj.cable_paths||''} onChange={e=>upd({cable_paths:e.target.value})} rows={4} placeholder="ex: CPD → Rack sala → parede sul → corredor → suíte master..." />
                </div>
                <div style={{background:'var(--surf)',borderRadius:6,padding:'10px 14px',marginTop:12,display:'flex',gap:16,flexWrap:'wrap'}}>
                  {Object.entries(CABLE_COLORS).map(([k,{label,color}])=><div key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                    <div style={{width:8,height:8,borderRadius:2,background:color}} />
                    <span style={{color:'var(--text2)'}}>{label}:</span>
                    <span style={{fontWeight:600}}>{proj.cables?.[k]||0}m</span>
                  </div>)}
                </div>
              </div>
            </div>
          </div>}

          {/* PROJECT */}
          {tab==='project2' && <div style={{maxWidth:640}}>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Planta & Mapa de calor</div></div>
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:12}}>
                <div className="fg">
                  <div className="flabel">Link da planta (Google Drive / PDF)</div>
                  <div style={{display:'flex',gap:8}}>
                    <input value={proj.plant_link||''} onChange={e=>upd({plant_link:e.target.value})} placeholder="https://drive.google.com/..." style={{flex:1}} />
                    {proj.plant_link && <a href={proj.plant_link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden />Abrir</button></a>}
                  </div>
                </div>
                <div className="fg">
                  <div className="flabel" style={{display:'flex',alignItems:'center',gap:6}}>
                    <i className="ti ti-wifi" style={{color:'var(--accent)'}} aria-hidden />Link Ubiquiti — Mapa de calor WiFi
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <input value={proj.heatmap_link||''} onChange={e=>upd({heatmap_link:e.target.value})} placeholder="Cole o link do projeto no Ubiquiti..." style={{flex:1}} />
                    <a href="https://unifi.ui.com" target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden />Abrir Ubiquiti</button></a>
                    {proj.heatmap_link && <a href={proj.heatmap_link} target="_blank" rel="noreferrer"><button className="btn primary" style={{fontSize:11}}><i className="ti ti-eye" aria-hidden />Ver mapa</button></a>}
                  </div>
                </div>
                <div className="fg"><div className="flabel">Notas do mapa de calor</div><textarea value={proj.heatmap_notes||''} onChange={e=>upd({heatmap_notes:e.target.value})} rows={3} placeholder="Cobertura por andar, pontos cegos, posição dos APs..." /></div>
                <div className="fg"><div className="flabel">Mapa de IR por cômodo</div><textarea value={proj.ir_map||''} onChange={e=>upd({ir_map:e.target.value})} rows={4} placeholder="ex: Sala: Hub IR norte → TV + AC / Suíte: Hub IR teto → TV + AC split..." /></div>
              </div>
            </div>
          </div>}

          {/* PURCHASES */}
          {tab==='purchase' && <div>
            <div style={{marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:13,fontWeight:500}}>Lista de compras</div>
              <button className="btn primary" style={{fontSize:11}} onClick={addItem}><i className="ti ti-plus" aria-hidden />Adicionar item</button>
            </div>
            <div className="section">
              <table className="tbl">
                <thead><tr><th>Item</th><th>Código</th><th>Qtd</th><th>Preço</th><th>Fornecedor</th><th>Prev. chegada</th><th style={{textAlign:'center'}}>Chegou?</th><th>Link compra</th></tr></thead>
                <tbody>
                  {!(proj.purchase_list||[]).length && <tr><td colSpan={8} style={{textAlign:'center',padding:16,color:'var(--text3)'}}>Nenhum item</td></tr>}
                  {(proj.purchase_list||[]).map((it,i)=><tr key={i}>
                    <td><input value={it.item} onChange={e=>updItem(i,{item:e.target.value})} style={{fontSize:12,padding:'3px 6px'}} placeholder="Item..." /></td>
                    <td><input value={it.code} onChange={e=>updItem(i,{code:e.target.value})} style={{fontSize:11,padding:'3px 6px',width:85}} placeholder="Código" /></td>
                    <td><input type="number" value={it.qty} onChange={e=>updItem(i,{qty:Number(e.target.value)})} style={{width:52,textAlign:'center',fontSize:12,padding:'3px 5px'}} /></td>
                    <td><input type="number" value={it.unit_price} onChange={e=>updItem(i,{unit_price:Number(e.target.value)})} style={{width:88,fontSize:12,padding:'3px 6px'}} /></td>
                    <td><input value={it.supplier} onChange={e=>updItem(i,{supplier:e.target.value})} style={{fontSize:11,padding:'3px 6px',width:100}} placeholder="Fornecedor" /></td>
                    <td><input type="date" value={it.arrival_date||''} onChange={e=>updItem(i,{arrival_date:e.target.value})} style={{fontSize:11,padding:'3px 6px'}} /></td>
                    <td style={{textAlign:'center'}}><input type="checkbox" checked={it.arrived} onChange={e=>updItem(i,{arrived:e.target.checked})} style={{accentColor:'var(--green)',cursor:'pointer',width:'auto'}} /></td>
                    <td>
                      <div style={{display:'flex',gap:3}}>
                        <input value={it.buy_link||''} onChange={e=>updItem(i,{buy_link:e.target.value})} style={{fontSize:10,padding:'3px 5px',width:75}} placeholder="URL..." />
                        {it.buy_link && <a href={it.buy_link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 6px'}}><i className="ti ti-external-link" aria-hidden /></button></a>}
                      </div>
                    </td>
                  </tr>)}
                </tbody>
              </table>
              {(proj.purchase_list||[]).length>0 && <div style={{padding:'8px 14px',background:'var(--surf)',borderTop:'1px solid var(--border)',display:'flex',gap:20,fontSize:12,flexWrap:'wrap'}}>
                <span style={{color:'var(--text2)'}}>Total: <b>{proj.purchase_list.length} itens</b></span>
                <span>Chegaram: <b style={{color:'var(--green)'}}>{proj.purchase_list.filter(i=>i.arrived).length}</b></span>
                <span>Pendentes: <b style={{color:'var(--amber)'}}>{proj.purchase_list.filter(i=>!i.arrived).length}</b></span>
                <span>Valor: <b style={{color:'var(--accent)'}}>R$ {proj.purchase_list.reduce((s,i)=>s+(i.qty*(i.unit_price||0)),0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b></span>
              </div>}
            </div>
          </div>}

          {/* INSTALLATION */}
          {tab==='installation' && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Status por cômodo</div></div>
              <table className="tbl" style={{fontSize:11}}>
                <thead><tr><th>Cômodo</th><th style={{textAlign:'center'}}>Inst.</th><th style={{textAlign:'center'}}>Config.</th><th style={{textAlign:'center'}}>Testado</th><th style={{textAlign:'center'}}>Entregue</th></tr></thead>
                <tbody>
                  {!(proj.rooms_config||[]).length && <tr><td colSpan={5} style={{textAlign:'center',padding:12,color:'var(--text3)'}}>Sem cômodos — adicione na aba Visão Geral</td></tr>}
                  {(proj.rooms_config||[]).map((r,i)=><tr key={i}>
                    <td style={{fontWeight:500}}>{r.name}</td>
                    {['installed','configured','tested','delivered'].map(f=><td key={f} style={{textAlign:'center'}}><input type="checkbox" checked={r[f]} onChange={()=>toggleRoom(i,f)} style={{accentColor:'var(--accent)',width:'auto',cursor:'pointer'}} /></td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="section">
              <div className="sec-hdr"><div className="sec-title">Progresso</div></div>
              <div style={{padding:14}}>
                {['installed','configured','tested','delivered'].map(f=>{
                  const total=(proj.rooms_config||[]).length
                  const done2=(proj.rooms_config||[]).filter(r=>r[f]).length
                  const pct=total?Math.round(done2/total*100):0
                  const lbl={installed:'Instalados',configured:'Configurados',tested:'Testados',delivered:'Entregues'}
                  return total ? <div key={f} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                      <span style={{color:'var(--text2)'}}>{lbl[f]}</span>
                      <span style={{fontWeight:500}}>{done2}/{total} ({pct}%)</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:'var(--surf2)',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:pct===100?'var(--green)':'var(--accent)',width:`${pct}%`,transition:'width 0.3s'}} />
                    </div>
                  </div> : null
                })}
                {!(proj.rooms_config||[]).length && <div style={{color:'var(--text3)',fontSize:12,textAlign:'center',padding:'20px 0'}}>Sem cômodos cadastrados</div>}
              </div>
            </div>
          </div>}

          {/* NOTES */}

          {/* COSTS */}
          {tab==='costs' && <div>
            {/* Save bar */}
            <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
              <span style={{color:'var(--amber)'}}><i className="ti ti-pencil" style={{marginRight:4}} aria-hidden/>Edite os campos e clique em Salvar</span>
              <button className="btn primary" style={{fontSize:11,background:'var(--amber)',borderColor:'var(--amber)'}} onClick={saveCosts}>
                <i className="ti ti-device-floppy" aria-hidden/>Salvar custos
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

              {/* Deslocamento */}
              <div className="section">
                <div className="sec-hdr"><div className="sec-title"><i className="ti ti-car" style={{marginRight:6}} aria-hidden/>Deslocamento</div></div>
                <div style={{padding:'12px 16px'}}>
                  <div className="form-row" style={{marginBottom:10}}>
                    <div className="fg">
                      <div className="flabel">Bairro do cliente</div>
                      <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>
                        {(()=>{const km=guessKm(projBairro);return km!==null?`🗺 Estimativa: ${km} km de Campo Grande`:''})()}
                      </div>
                      <input value={projBairro} readOnly style={{opacity:0.6,fontSize:11}} placeholder="—"/>
                    </div>
                    <div className="fg">
                      <div className="flabel">Distância (km) — ida</div>
                      <input type="number" min="0" step="1"
                        value={costs.travel_km!==undefined&&costs.travel_km!==''?costs.travel_km:guessKm(projBairro)||''}
                        onChange={e=>setLocalCosts(lc=>({...lc,travel_km:e.target.value}))}
                        placeholder={guessKm(projBairro)||'ex: 38'}/>
                    </div>
                  </div>
                  <div className="form-row" style={{marginBottom:10}}>
                    <div className="fg"><div className="flabel">Nº de visitas</div>
                      <input type="number" min="1" value={costs.travel_visits??5} onChange={e=>setLocalCosts(lc=>({...lc,travel_visits:Number(e.target.value)}))}/></div>
                    <div className="fg"><div className="flabel">Km/litro do carro</div>
                      <input type="number" min="1" step="0.5" value={costs.fuel_consumption??8} onChange={e=>setLocalCosts(lc=>({...lc,fuel_consumption:Number(e.target.value)}))}/></div>
                  </div>
                  <div className="form-row" style={{marginBottom:10}}>
                    <div className="fg"><div className="flabel">Preço do litro (R$)</div>
                      <input type="number" min="1" step="0.01" value={costs.fuel_price??6.50} onChange={e=>setLocalCosts(lc=>({...lc,fuel_price:Number(e.target.value)}))}/></div>
                    <div className="fg">
                      <div className="flabel">Custo total estimado</div>
                      <div style={{padding:'8px 12px',background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:5,fontSize:15,fontWeight:700,color:'var(--amber)',textAlign:'center'}}>
                        {(()=>{
                          const km=Number(costs.travel_km)||guessKm(projBairro)||0
                          const cost=calcTravelCost(km,(costs.travel_visits||5),(costs.fuel_price||6.50),(costs.fuel_consumption||8))
                          return `R$ ${cost.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
                        })()}
                      </div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:4,textAlign:'center'}}>
                        {(()=>{
                          const km=Number(costs.travel_km)||guessKm(projBairro)||0
                          const v=proj.travel_visits||5,c2=proj.fuel_consumption||8
                          return `${km}km × 2 × ${v} visitas ÷ ${c2}km/l × R$${proj.fuel_price||6.50}/l`
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horas internas */}
              <div className="section">
                <div className="sec-hdr"><div className="sec-title"><i className="ti ti-clock" style={{marginRight:6}} aria-hidden/>Horas internas RARO</div></div>
                <div style={{padding:'12px 16px'}}>
                  <div className="form-row" style={{marginBottom:10}}>
                    <div className="fg"><div className="flabel">Horas estimadas</div>
                      <input type="number" min="0" step="0.5" value={costs.labor_hours_estimated??0} onChange={e=>setLocalCosts(lc=>({...lc,labor_hours_estimated:Number(e.target.value)}))}/></div>
                    <div className="fg"><div className="flabel">Horas realizadas</div>
                      <input type="number" min="0" step="0.5" value={costs.labor_hours_actual??0} onChange={e=>setLocalCosts(lc=>({...lc,labor_hours_actual:Number(e.target.value)}))}/></div>
                  </div>
                  <div className="form-row" style={{marginBottom:10}}>
                    <div className="fg"><div className="flabel">Valor hora (R$)</div>
                      <input type="number" min="0" step="10" value={costs.hourly_rate??150} onChange={e=>setLocalCosts(lc=>({...lc,hourly_rate:Number(e.target.value)}))}/></div>
                    <div className="fg">
                      <div className="flabel">Custo hora total</div>
                      <div style={{padding:'8px 12px',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:5,fontSize:15,fontWeight:700,color:'#7C3AED',textAlign:'center'}}>
                        {`R$ ${(((costs.labor_hours_actual||costs.labor_hours_estimated||0))*((costs.hourly_rate||150))).toLocaleString('pt-BR',{minimumFractionDigits:2})}`}
                      </div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:4,textAlign:'center'}}>
                        {`${(costs.labor_hours_actual||costs.labor_hours_estimated||0)}h × R$${(costs.hourly_rate||150)}/h`}
                      </div>
                    </div>
                  </div>
                  <div style={{background:'var(--surf)',borderRadius:5,padding:'8px 12px',fontSize:11,color:'var(--text3)',marginTop:4}}>
                    <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
                    Progresso: {proj.labor_hours_actual||0}h de {proj.labor_hours_estimated||0}h estimadas
                    {(costs.labor_hours_estimated||0)>0&&<span style={{marginLeft:6,color:proj.labor_hours_actual>proj.labor_hours_estimated?'var(--red)':'var(--green)'}}>
                      ({Math.round(((proj.labor_hours_actual||0)/proj.labor_hours_estimated)*100)}%)
                    </span>}
                  </div>
                </div>
              </div>

              {/* Terceiros linkados ao projeto */}
              <div className="section" style={{gridColumn:'1/-1'}}>
                <div className="sec-hdr">
                  <div className="sec-title"><i className="ti ti-users" style={{marginRight:6}} aria-hidden/>Mão de obra terceiros</div>
                  <button className="btn primary" style={{fontSize:11}} onClick={()=>{
                    const current=costs.third_party_costs||[]
                    setLocalCosts(lc=>({...lc,third_party_costs:[...current,{date:new Date().toISOString().slice(0,10),person:'',description:'',days:1,daily_rate:400,total:400}]}))
                  }}><i className="ti ti-plus" aria-hidden/>Adicionar</button>
                </div>
                <table className="tbl">
                  <thead><tr><th>Data</th><th>Pessoa</th><th>Serviço</th><th style={{textAlign:'center'}}>Dias</th><th style={{textAlign:'right'}}>Diária</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
                  <tbody>
                    {!(costs.third_party_costs||[]).length&&<tr><td colSpan={7} style={{textAlign:'center',padding:16,color:'var(--text3)'}}>Nenhum terceiro registrado</td></tr>}
                    {(costs.third_party_costs||[]).map((tp,ti)=>(
                      <tr key={ti}>
                        <td><input type="date" value={tp.date||''} style={{fontSize:11,padding:'2px 5px'}}
                          onChange={e=>{const arr=[...(costs.third_party_costs||[])];arr[ti]={...arr[ti],date:e.target.value};setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}/></td>
                        <td>
                          <select style={{fontSize:11,padding:'2px 5px',width:110,marginBottom:tp.personManual?3:0}}
                            value={tp.supplier_id||''}
                            onChange={e=>{
                              const arr=[...(costs.third_party_costs||[])]
                              if(e.target.value==='__manual__'){
                                arr[ti]={...arr[ti],supplier_id:'__manual__',person:''}
                              } else {
                                const sup=suppliers.find(s=>String(s.id)===e.target.value)
                                arr[ti]={...arr[ti],supplier_id:e.target.value,person:sup?.name||'',personManual:undefined}
                              }
                              setLocalCosts(lc=>({...lc,third_party_costs:arr}))
                            }}>
                            <option value="">— Fornecedor —</option>
                            {(suppliers||[]).map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
                            <option value="__manual__">✏️ Outro...</option>
                          </select>
                          {(tp.supplier_id==='__manual__'||!tp.supplier_id)&&<input
                            value={tp.person||''} placeholder="Nome manual..."
                            style={{fontSize:11,padding:'2px 6px',width:110,display:'block'}}
                            onChange={e=>{const arr=[...(costs.third_party_costs||[])];arr[ti]={...arr[ti],person:e.target.value};setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}/>}
                        </td>
                        <td><input value={tp.description||''} placeholder="Serviço..." style={{fontSize:11,padding:'2px 6px',width:140}}
                          onChange={e=>{const arr=[...(costs.third_party_costs||[])];arr[ti]={...arr[ti],description:e.target.value};setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}/></td>
                        <td style={{textAlign:'center'}}><input type="number" value={tp.days||1} min="0.5" step="0.5" style={{width:52,textAlign:'center',fontSize:11,padding:'2px 4px'}}
                          onChange={e=>{const arr=[...(costs.third_party_costs||[])];arr[ti]={...arr[ti],days:Number(e.target.value),total:Number(e.target.value)*(arr[ti].daily_rate||0)};setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}/></td>
                        <td style={{textAlign:'right'}}><input type="number" value={tp.daily_rate||400} style={{width:80,textAlign:'right',fontSize:11,padding:'2px 4px'}}
                          onChange={e=>{const arr=[...(costs.third_party_costs||[])];arr[ti]={...arr[ti],daily_rate:Number(e.target.value),total:(arr[ti].days||1)*Number(e.target.value)};setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}/></td>
                        <td style={{textAlign:'right',fontWeight:600,color:'var(--amber)',fontSize:13}}>R$ {((tp.total||tp.days*tp.daily_rate)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td><button className="btn danger" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>{const arr=(costs.third_party_costs||[]).filter((_,j)=>j!==ti);setLocalCosts(lc=>({...lc,third_party_costs:arr}))}}>
                          <i className="ti ti-trash" aria-hidden/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(costs.third_party_costs||[]).length>0&&<div style={{padding:'8px 14px',background:'var(--surf)',borderTop:'1px solid var(--border)',fontSize:12,display:'flex',gap:20}}>
                  <span>Total terceiros: <b style={{color:'var(--amber)'}}>R$ {(costs.third_party_costs||[]).reduce((s,t)=>s+(t.total||t.days*t.daily_rate||0),0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b></span>
                </div>}
              </div>

              {/* Resumo de custos */}
              <div className="section" style={{gridColumn:'1/-1'}}>
                <div className="sec-hdr"><div className="sec-title"><i className="ti ti-report-money" style={{marginRight:6}} aria-hidden/>Resumo de custos do projeto</div></div>
                <div style={{padding:'12px 16px'}}>
                  {(()=>{
                    const km=Number(costs.travel_km)||guessKm(projBairro)||0
                    const travel=calcTravelCost(km,(costs.travel_visits||5),(costs.fuel_price||6.50),(costs.fuel_consumption||8))
                    const hours=((costs.labor_hours_actual||costs.labor_hours_estimated||0))*((costs.hourly_rate||150))
                    const third=(costs.third_party_costs||[]).reduce((s,t)=>s+(t.total||t.days*t.daily_rate||0),0)
                    const linkedProp=proposals?.find(p=>p.id===proj.proposal_id)
                    // custo da API Anthropic gravado ao gerar o Projeto Executivo
                    const aiCost = (()=>{ let a=linkedProp?.exec_api_cost; if(typeof a==='string'){try{a=JSON.parse(a)}catch{a=null}} return Number(a?.brl)||0 })()
                    const total=travel+hours+third+aiCost
                    const revenue=linkedProp?(()=>{const fl=Array.isArray(linkedProp.floors)?linkedProp.floors:(typeof linkedProp.floors==='string'?JSON.parse(linkedProp.floors||'[]'):[]);return fl.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)+(Number(linkedProp.labor)||0)})():0
                    const equipCost=linkedProp?(()=>{const fl=Array.isArray(linkedProp.floors)?linkedProp.floors:(typeof linkedProp.floors==='string'?JSON.parse(linkedProp.floors||'[]'):[]);return fl.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]))).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)})():0
                    const totalCost=equipCost+total
                    const profit=revenue-totalCost
                    const margin=revenue>0?Math.round(profit/revenue*100):null
                    return <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
                      {[
                        {l:'Deslocamento',v:travel,c:'var(--amber)',i:'ti-car'},
                        {l:'Hora interna',v:hours,c:'#7C3AED',i:'ti-clock'},
                        {l:'Terceiros',v:third,c:'var(--amber)',i:'ti-users'},
                        {l:'Custo IA (executivo)',v:aiCost,c:'#0EA5E9',i:'ti-robot'},
                        {l:'Total operacional',v:total,c:'var(--red)',i:'ti-coins',bold:true},
                        {l:'Lucro estimado',v:profit,c:profit>=0?'var(--green)':'var(--red)',i:'ti-trending-up',bold:true,sub:margin!==null?`${margin}% margem`:revenue===0?'sem proposta vinculada':''},
                      ].map((k,ki)=>(
                        <div key={ki} style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',borderTop:`3px solid ${k.c}`}}>
                          <div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}><i className={`ti ${k.i}`} style={{marginRight:3}} aria-hidden/>{k.l}</div>
                          <div style={{fontSize:k.bold?16:14,fontWeight:k.bold?700:500,color:k.c}}>R$ {Number(k.v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                          {k.sub&&<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{k.sub}</div>}
                        </div>
                      ))}
                    </div>
                  })()}
                </div>
              </div>

            </div>
          </div>}
          {tab==='diario' && <DiarioObra proj={proj} onRefresh={onRefresh} currentUser={currentUser} />}

          {tab==='notes' && <div style={{maxWidth:640}}>
            <div style={{marginBottom:14,display:'flex',gap:8}}>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Nova anotação..." style={{flex:1,resize:'vertical'}} />
              <button className="btn primary" style={{alignSelf:'flex-end'}} onClick={addNote}><i className="ti ti-send" aria-hidden />Salvar</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[...(proj.annotations||[])].reverse().map(a=><div key={a.id} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',borderLeft:'3px solid var(--accent)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:11,fontWeight:600,color:'var(--accent)'}}>{a.author}</span>
                  <span style={{fontSize:10,color:'var(--text3)'}}>{new Date(a.date).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <div style={{fontSize:12.5,lineHeight:1.6}}>{a.text}</div>
              </div>)}
              {!(proj.annotations||[]).length && <div style={{color:'var(--text3)',fontSize:12,textAlign:'center',padding:'24px 0'}}>Nenhuma anotação ainda</div>}
            </div>
          </div>}
        </div>
      </div>}

      {/* NEW MODAL */}
      {showNew && <div className="modal-overlay">
        <div className="modal" style={{width:520}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><div className="modal-title">Novo projeto</div><button className="modal-close" onClick={()=>setShowNew(false)}>×</button></div>
          <div className="form-row">
            <div className="fg"><div className="flabel">Cliente</div>
              <select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                <option value="">Selecionar...</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name1} & {c.name2} — {c.neighborhood}</option>)}
              </select>
            </div>
            <div className="fg"><div className="flabel">Fase inicial</div>
              <select value={form.phase} onChange={e=>setForm({...form,phase:e.target.value})}>
                {PHASES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row full" style={{marginBottom:12}}>
            <div className="fg"><div className="flabel">Descrição</div><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="ex: Casa · 3 pavimentos" autoFocus /></div>
          </div>
          <div className="form-row">
            <div className="fg"><div className="flabel">Tipo</div>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option>Automação completa</option><option>Automação + CFTV</option><option>Só CFTV</option><option>Rede estruturada</option><option>Parcial</option>
              </select>
            </div>
            <div className="fg"><div className="flabel">Previsão</div><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="fg"><div className="flabel">Área (m²)</div><input type="number" value={form.area_m2} onChange={e=>setForm({...form,area_m2:e.target.value})} placeholder="ex: 280" /></div>
            <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:18}}>
              <input type="checkbox" id="inobra" checked={form.in_obra} onChange={e=>setForm({...form,in_obra:e.target.checked})} style={{width:'auto',accentColor:'var(--accent)',cursor:'pointer'}} />
              <label htmlFor="inobra" style={{fontSize:12,cursor:'pointer'}}>Em obra no momento</label>
            </div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
            <button className="btn" onClick={()=>setShowNew(false)}>Cancelar</button>
            <button className="btn primary" onClick={handleCreate}>Criar projeto</button>
          </div>
        </div>
      </div>}
      {showAddItem && (
        <div className="modal-overlay">
          <div className="modal" style={{width:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-shopping-cart-plus" style={{marginRight:6}} aria-hidden/>Adicionar item à lista de compras</div>
              <button className="modal-close" onClick={()=>setShowAddItem(false)}>×</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button className={`btn${newItem.source==='catalog'?' primary':''}`} style={{fontSize:11}} onClick={()=>setNewItem(p=>({...p,source:'catalog'}))}>Do catálogo</button>
              <button className={`btn${newItem.source==='manual'?' primary':''}`} style={{fontSize:11}} onClick={()=>setNewItem(p=>({...p,source:'manual'}))}>Manual</button>
            </div>
            {newItem.source==='catalog' ? (
              <div className="fg" style={{marginBottom:10}}>
                <div className="flabel">Selecionar do catálogo</div>
                <select value={newItem.code} onChange={e=>{
                  const cat=catalog?.find(ci=>ci.code===e.target.value)
                  if(cat) setNewItem(p=>({...p,code:cat.code,item:cat.name,unit_price:cat.sale_price||0}))
                  else setNewItem(p=>({...p,code:e.target.value}))
                }} style={{width:'100%',fontSize:13}}>
                  <option value="">— Selecione —</option>
                  {(catalog||[]).map(ci=><option key={ci.id} value={ci.code}>{ci.name} ({ci.code}) — R$ {(ci.sale_price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-row full" style={{marginBottom:10}}>
                <div className="fg">
                  <div className="flabel">Descrição do item</div>
                  <input value={newItem.item} onChange={e=>setNewItem(p=>({...p,item:e.target.value}))} placeholder="ex: Cabo CAT6 300m..." autoFocus/>
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="fg"><div className="flabel">Qtd</div>
                <input type="number" min="1" value={newItem.qty} onChange={e=>setNewItem(p=>({...p,qty:e.target.value}))} style={{width:70}}/></div>
              <div className="fg"><div className="flabel">Preço unit. (R$)</div>
                <input type="number" value={newItem.unit_price} onChange={e=>setNewItem(p=>({...p,unit_price:e.target.value}))}/></div>
              <div className="fg"><div className="flabel">Fornecedor</div>
                <input value={newItem.supplier} onChange={e=>setNewItem(p=>({...p,supplier:e.target.value}))} placeholder="ex: QA Tech"/></div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Previsão chegada</div>
                <input type="date" value={newItem.arrival_date||''} onChange={e=>setNewItem(p=>({...p,arrival_date:e.target.value}))}/></div>
              <div className="fg"><div className="flabel">Link de compra</div>
                <input value={newItem.buy_link||''} onChange={e=>setNewItem(p=>({...p,buy_link:e.target.value}))} placeholder="URL..."/></div>
            </div>
            {newItem.item&&<div style={{background:'var(--surf)',borderRadius:5,padding:'6px 10px',fontSize:12,marginBottom:10,color:'var(--text2)'}}>
              Total: <b style={{color:'var(--accent)'}}>R$ {((Number(newItem.qty)||1)*(Number(newItem.unit_price)||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b>
            </div>}
            <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
              <button className="btn" onClick={()=>setShowAddItem(false)}>Fechar</button>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={confirmAddItem} disabled={!newItem.item}>
                  <i className="ti ti-plus" aria-hidden/>Adicionar + manter aberto
                </button>
                <button className="btn primary" onClick={()=>{confirmAddItem();setShowAddItem(false)}} disabled={!newItem.item}>
                  <i className="ti ti-check" aria-hidden/>Adicionar e fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
