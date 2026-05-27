import { useState } from 'react'
import { saveProject, deleteProject, addAnnotation } from '../db/supabase.js'

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

export default function Projects({ projects, clients, onRefresh, currentUser }) {
  const [sel, setSel] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(newProj())
  const [tab, setTab] = useState('overview')
  const [note, setNote] = useState('')
  const [newRoom, setNewRoom] = useState('')

  const active = projects.filter(p=>p.phase!=='done')
  const done = projects.filter(p=>p.phase==='done')
  const proj = sel ? projects.find(p=>p.id===sel) : null

  function upd(patch){ if(!proj) return; saveProject({...proj,...patch}); onRefresh() }

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
    upd({purchase_list:[...(proj.purchase_list||[]),{item:'',code:'',qty:1,unit_price:0,supplier:'',arrival_date:'',arrived:false,buy_link:''}]})
  }

  function updItem(i,patch){
    upd({purchase_list:proj.purchase_list.map((x,j)=>j===i?{...x,...patch}:x)})
  }

  function handleCreate(){
    const cl = clients.find(c=>c.id===Number(form.client_id))
    const p={...form, client_name: cl ? `${cl.name1} & ${cl.name2}` : form.client_name}
    saveProject(p); setShowNew(false); onRefresh()
  }

  const TABS=[
    {key:'overview',label:'Visão geral',icon:'ti-layout-dashboard'},
    {key:'measurement',label:'Medição & Cabos',icon:'ti-ruler'},
    {key:'project2',label:'Projeto & Planta',icon:'ti-map'},
    {key:'purchase',label:'Compras',icon:'ti-shopping-cart'},
    {key:'installation',label:'Instalação',icon:'ti-tool'},
    {key:'notes',label:'Anotações',icon:'ti-pencil'},
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
        <div style={{borderBottom:'1px solid var(--border)',display:'flex',background:'var(--bg)',flexShrink:0}}>
          {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'9px 13px',border:'none',background:'transparent',cursor:'pointer',fontSize:11.5,color:tab===t.key?'var(--accent)':'var(--text2)',borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`,display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',fontWeight:tab===t.key?500:400}}>
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
    </>
  )
}
