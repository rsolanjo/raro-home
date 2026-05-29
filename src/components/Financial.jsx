import { useState, useEffect } from 'react'

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

function calcTravelCost(proj) {
  const km = proj.travel_km || 0
  const visits = proj.travel_visits || 5
  const fuel = proj.fuel_price || 6.50
  const cons = proj.fuel_consumption || 8
  if (!km) return 0
  return (km * 2 * visits / cons * fuel)
}
function calcHoursCost(proj) {
  const hours = proj.labor_hours_actual || proj.labor_hours_estimated || 0
  return hours * (proj.hourly_rate || 150)
}
function calcThirdPartyCost(proj) {
  return (proj.third_party_costs||[]).reduce((s,t)=>s+(t.total||t.days*t.daily_rate||0),0)
}
function calcProjectOpCost(proj) {
  return calcTravelCost(proj) + calcHoursCost(proj) + calcThirdPartyCost(proj)
}

function calcTotal(p) {
  const fl = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
  return fl.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0) + (Number(p.labor)||0)
}
function calcCost(p) {
  const fl = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
  return fl.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]))).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
}

export default function Financial({ proposals=[], projects=[], suppliers=[] }) {
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState('all')
  // Labor costs (terceiros) stored locally per session
  const [laborCosts, setLaborCosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('raro_labor_costs')||'[]') } catch { return [] }
  })
  const [showAddCost, setShowAddCost] = useState(false)
  const [newCost, setNewCost] = useState({date:'',description:'',person:'',days:1,daily_rate:400,total:0,project_id:''})

  const saveCost = (costs) => { setLaborCosts(costs); localStorage.setItem('raro_labor_costs', JSON.stringify(costs)) }

  const now = new Date()
  const filterDate = p => {
    const d = new Date(p.created_at||0)
    if(period==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    if(period==='quarter') return d>=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1)
    if(period==='year') return d.getFullYear()===now.getFullYear()
    return true
  }

  const fp = proposals.filter(filterDate)
  const approved = fp.filter(p=>p.status==='approved')
  const sent     = fp.filter(p=>p.status==='sent')
  const revenue  = approved.reduce((s,p)=>s+calcTotal(p),0)
  const costEquip    = approved.reduce((s,p)=>s+calcCost(p),0)
  const costLabor    = laborCosts.filter(filterDate).reduce((s,c)=>s+(c.total||c.days*c.daily_rate||0),0)
  // Project-linked operational costs
  const approvedProjects = projects.filter(proj=>{
    const linked=approved.find(p=>p.id===proj.proposal_id)
    return !!linked
  })
  const costTravel   = approvedProjects.reduce((s,proj)=>s+calcTravelCost(proj),0)
  const costHours    = approvedProjects.reduce((s,proj)=>s+calcHoursCost(proj),0)
  const costThird    = approvedProjects.reduce((s,proj)=>s+calcThirdPartyCost(proj),0)
  const totalCost    = costEquip + costLabor + costTravel + costHours + costThird
  const profit       = revenue - totalCost
  const margin       = revenue>0?Math.round(profit/revenue*100):0
  const pipeline = sent.reduce((s,p)=>s+calcTotal(p),0)
  const convRate = fp.length>0?Math.round(approved.length/fp.length*100):0

  const TABS = [{k:'overview',l:'Visão Geral',i:'ti-layout-dashboard'},{k:'proposals',l:'Propostas',i:'ti-file-text'},{k:'projects_detail',l:'Por Projeto',i:'ti-layout-kanban'},{k:'costs',l:'Custos Terceiros',i:'ti-users'},{k:'margin',l:'Margens',i:'ti-percentage'}]
  const PERIODS = [{v:'month',l:'Mês'},{v:'quarter',l:'Trimestre'},{v:'year',l:'Ano'},{v:'all',l:'Tudo'}]

  const pC = p => p>=40?'var(--green)':p>=20?'var(--amber)':'var(--red)'

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:'var(--text1)',display:'flex',alignItems:'center',gap:8}}>
            <div style={{background:'var(--accent)',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-coin" style={{color:'#fff',fontSize:16}} aria-hidden/>
            </div>
            Controle Financeiro
          </div>
          <div style={{fontSize:12,color:'var(--text3)',marginTop:4,marginLeft:40}}>Receitas · Margens · Custos · Pipeline</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--text3)',marginRight:4}}>Período:</span>
          {PERIODS.map(o=><button key={o.v} onClick={()=>setPeriod(o.v)}
            className={period===o.v?'btn primary':'btn'}
            style={{fontSize:11,padding:'4px 10px'}}>
            {o.l}</button>)}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Receita Aprovada',v:fmt(revenue),sub:`${approved.length} projetos`,icon:'ti-trending-up',c:'var(--green)'},
          {l:'Lucro Líquido',v:fmt(profit),sub:'após todos os custos',icon:'ti-pig-money',c:profit>=0?'var(--green)':'var(--red)'},
          {l:'Margem Total',v:`${margin}%`,sub:'custos completos',icon:'ti-percentage',c:pC(margin)},
          {l:'Pipeline',v:fmt(pipeline),sub:`${sent.length} enviados`,icon:'ti-clock',c:'var(--accent)'},
          {l:'Conversão',v:`${convRate}%`,sub:`${approved.length}/${fp.length} propostas`,icon:'ti-target',c:convRate>=40?'var(--green)':convRate>=20?'var(--amber)':'var(--red)'},
        ].map((k,i)=>(
          <div key={i} style={{background:'var(--surf)',borderRadius:8,padding:'14px 16px',border:'1px solid var(--border)',borderLeft:`3px solid ${k.c}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,fontWeight:500}}>{k.l}</div>
              <i className={`ti ${k.icon}`} style={{fontSize:15,color:k.c,opacity:0.5}} aria-hidden/>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',marginBottom:16}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'10px 16px',fontSize:12,border:'none',background:'none',cursor:'pointer',
              color:tab===t.k?'var(--accent)':'var(--text2)',fontFamily:'inherit',fontWeight:tab===t.k?600:400,
              borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1,
              display:'flex',alignItems:'center',gap:6}}>
            <i className={`ti ${t.i}`} style={{fontSize:13}} aria-hidden/>{t.l}
          </button>
        ))}
      </div>

      <div style={{padding:'20px 0'}}>

      {/* OVERVIEW */}
      {tab==='overview' && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Funil */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-filter" style={{marginRight:6}} aria-hidden/>Funil de propostas</div></div>
          <div style={{padding:'12px 16px'}}>
            {[
              {l:'Rascunhos',n:fp.filter(p=>p.status==='draft').length,v:fp.filter(p=>p.status==='draft').reduce((s,p)=>s+calcTotal(p),0),c:'var(--text3)'},
              {l:'Enviados',n:sent.length,v:pipeline,c:'var(--accent)'},
              {l:'Aprovados',n:approved.length,v:revenue,c:'var(--green)'},
              {l:'Recusados',n:fp.filter(p=>p.status==='rejected').length,v:fp.filter(p=>p.status==='rejected').reduce((s,p)=>s+calcTotal(p),0),c:'var(--red)'},
            ].map((row,i)=>{
              const pct=revenue>0?Math.min(100,Math.round(row.v/revenue*100)):0
              return <div key={i} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                  <span style={{fontWeight:500}}>{row.l} <span style={{color:'var(--text3)',fontWeight:400}}>({row.n})</span></span>
                  <span style={{fontWeight:600,color:row.c}}>{fmt(row.v)}</span>
                </div>
                <div style={{background:'var(--border)',borderRadius:4,height:8}}>
                  <div style={{background:row.c,borderRadius:4,height:8,width:`${pct}%`,transition:'width .4s'}}/>
                </div>
              </div>
            })}
          </div>
        </div>

        {/* P&L */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-report-money" style={{marginRight:6}} aria-hidden/>P&L — Resultado</div></div>
          <div style={{padding:'12px 16px'}}>
            {[
              {l:'Receita (projetos aprovados)',v:revenue,c:'var(--green)'},
              {l:'(-) Custo equipamentos',v:-costEquip,c:'var(--amber)'},
              {l:'(-) Deslocamento (projetos)',v:-costTravel,c:'var(--amber)'},
              {l:'(-) Hora interna RARO',v:-costHours,c:'rgba(124,58,237,0.8)'},
              {l:'(-) Terceiros (projetos)',v:-costThird,c:'var(--amber)'},
              {l:'(-) Outros custos mão de obra',v:-costLabor,c:'var(--amber)'},
              {l:'= Lucro líquido',v:profit,c:profit>=0?'var(--green)':'var(--red)',bold:true},
            ].map((row,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                <span style={{color:'var(--text2)',fontWeight:row.bold?600:400}}>{row.l}</span>
                <span style={{fontWeight:row.bold?700:500,fontSize:row.bold?15:12,color:row.c}}>{fmt(Math.abs(row.v))}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,fontSize:14,fontWeight:700}}>
              <span>Margem líquida</span>
              <span style={{fontSize:20,color:pC(margin)}}>{margin}%</span>
            </div>
          </div>
        </div>

        {/* Projetos em andamento */}
        <div className="section" style={{gridColumn:'1/-1'}}>
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-layout-kanban" style={{marginRight:6}} aria-hidden/>Projetos em andamento</div></div>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Fase</th><th>Prazo</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
            <tbody>
              {projects.filter(p=>p.phase!=='done').slice(0,6).map((p,i)=>{
                const PHASE={visit:'Visita',measurement:'Medição',project:'Projeto',budget:'Orçamento',purchase:'Compras',installation:'Instalação',config:'Configuração'}
                const linked = proposals.find(pr=>pr.id===p.proposal_id)
                return <tr key={i}>
                  <td style={{fontWeight:500}}>{p.client_name}</td>
                  <td><span className="badge b-blue" style={{fontSize:10}}>{PHASE[p.phase]||p.phase}</span></td>
                  <td style={{fontSize:11,color:p.deadline&&new Date(p.deadline)<new Date()?'var(--red)':'var(--text3)'}}>{p.deadline||'—'}</td>
                  <td style={{textAlign:'right',fontWeight:500,color:'var(--accent)'}}>{linked?fmt(calcTotal(linked)):'—'}</td>
                </tr>
              })}
              {!projects.filter(p=>p.phase!=='done').length && <tr><td colSpan={4} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum projeto em andamento</td></tr>}
            </tbody>
          </table>
        </div>
      </div>}

      {/* PROPOSALS TABLE */}
      {tab==='proposals' && <div className="section">
        <div className="sec-hdr">
          <div className="sec-title">Propostas — {period==='all'?'Todas':period==='month'?'Este mês':period==='quarter'?'Trimestre':'Este ano'}</div>
        </div>
        <table className="tbl">
          <thead><tr><th>Código</th><th>Cliente</th><th>Data</th><th>Status</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Custo</th><th style={{textAlign:'right'}}>Lucro</th><th style={{textAlign:'right'}}>Mg%</th></tr></thead>
          <tbody>
            {fp.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((p,i)=>{
              const rev=calcTotal(p),cost=calcCost(p),profit2=rev-cost,mg=rev>0?Math.round(profit2/rev*100):0
              const CLS={draft:'b-gray',sent:'b-blue',approved:'b-green',rejected:'b-red'}
              const LBL={draft:'Rascunho',sent:'Enviado',approved:'Aprovado',rejected:'Recusado'}
              return <tr key={i}>
                <td className="mono" style={{fontWeight:600}}>{p.code||`#${p.id}`}</td>
                <td>{p.client_name}</td>
                <td style={{fontSize:11,color:'var(--text3)'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):'—'}</td>
                <td><span className={`badge ${CLS[p.status]||'b-gray'}`} style={{fontSize:10}}>{LBL[p.status]||p.status}</span></td>
                <td style={{textAlign:'right',fontWeight:500,color:'var(--accent)'}}>{fmt(rev)}</td>
                <td style={{textAlign:'right',color:'var(--text2)'}}>{cost?fmt(cost):'—'}</td>
                <td style={{textAlign:'right',fontWeight:500,color:profit2>=0?'var(--green)':'var(--red)'}}>{cost?fmt(profit2):'—'}</td>
                <td style={{textAlign:'right',fontWeight:700,color:pC(mg)}}>{cost?`${mg}%`:'—'}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>}

      {/* LABOR COSTS — terceiros */}
      {tab==='costs' && <div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:16}}>
          {[
            {l:'Total gasto (período)',v:fmt(costLabor),c:'var(--amber)',i:'ti-users'},
            {l:'Diárias registradas',v:laborCosts.filter(filterDate).length,c:'var(--accent)',i:'ti-calendar'},
            {l:'Impacto na margem',v:`-${revenue>0?Math.round(costLabor/revenue*100):0}%`,c:'var(--red)',i:'ti-trending-down'},
          ].map((k,i)=>(
            <div key={i} className="met" style={{borderTop:`3px solid ${k.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div className="met-label">{k.l}</div>
                <i className={`ti ${k.i}`} style={{color:k.c,opacity:.5,fontSize:16}} aria-hidden/>
              </div>
              <div className="met-val" style={{color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>
        <div className="section">
          <div className="sec-hdr">
            <div className="sec-title"><i className="ti ti-users" style={{marginRight:6}} aria-hidden/>Custos com mão de obra / terceiros</div>
            <button className="btn primary" style={{fontSize:11}} onClick={()=>{setNewCost({date:new Date().toISOString().slice(0,10),description:'',person:'',days:1,daily_rate:400,total:0,project_id:''});setShowAddCost(true)}}>
              <i className="ti ti-plus" aria-hidden/>Registrar custo
            </button>
          </div>
          <table className="tbl">
            <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th style={{textAlign:'center'}}>Dias</th><th style={{textAlign:'right'}}>Diária</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
            <tbody>
              {laborCosts.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum custo registrado</td></tr>}
              {laborCosts.map((cost,i)=>(
                <tr key={i}>
                  <td style={{fontSize:11,color:'var(--text3)'}}>{cost.date?new Date(cost.date+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                  <td style={{fontWeight:500}}>{cost.description}</td>
                  <td>{cost.person}</td>
                  <td style={{textAlign:'center'}}>{cost.days}</td>
                  <td style={{textAlign:'right'}}>{fmt(cost.daily_rate)}</td>
                  <td style={{textAlign:'right',fontWeight:600,color:'var(--amber)'}}>{fmt(cost.total||cost.days*cost.daily_rate)}</td>
                  <td><button className="btn danger" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>saveCost(laborCosts.filter((_,j)=>j!==i))}><i className="ti ti-trash" aria-hidden/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {laborCosts.length>0&&<div style={{padding:'8px 14px',background:'var(--surf)',borderTop:'1px solid var(--border)',fontSize:12,display:'flex',gap:20}}>
            <span>Total: <b style={{color:'var(--amber)'}}>{fmt(laborCosts.reduce((s,c)=>s+(c.total||c.days*c.daily_rate),0))}</b></span>
            <span>Registros: <b>{laborCosts.length}</b></span>
          </div>}
        </div>
        {showAddCost&&<div className="modal-overlay">
          <div className="modal" style={{width:500}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-users" style={{marginRight:6}} aria-hidden/>Registrar custo com terceiro</div>
              <button className="modal-close" onClick={()=>setShowAddCost(false)}>×</button>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Proposta vinculada</div>
                <select value={newCost.proposal_code||''} onChange={e=>{
                  const p=proposals.find(p=>p.code===e.target.value)
                  const proj=p?projects.find(j=>j.proposal_id===p.id):null
                  setNewCost(x=>({...x,proposal_code:e.target.value,project_id:proj?.id||'',project_name:proj?.client_name||''}))
                }} style={{fontSize:12}}>
                  <option value="">— Selecione —</option>
                  {proposals.filter(p=>p.status==='approved').map(p=><option key={p.id} value={p.code}>{p.code} — {p.client_name}</option>)}
                </select>
              </div>
              <div className="fg"><div className="flabel">Projeto</div>
                <input value={newCost.project_name||''} readOnly style={{opacity:0.6,fontSize:12}} placeholder="Vinculado à proposta"/>
              </div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Data</div>
                <input type="date" value={newCost.date} onChange={e=>setNewCost(p=>({...p,date:e.target.value}))}/></div>
              <div className="fg"><div className="flabel">Fornecedor / Pessoa</div>
                <select value={newCost.person||''} onChange={e=>setNewCost(p=>({...p,person:e.target.value}))} style={{fontSize:12}}>
                  <option value="">— Selecione ou digite —</option>
                  {suppliers.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="__manual__">✏️ Outro (digitar)</option>
                </select>
                {newCost.person==='__manual__'&&<input className="mt-4" value={newCost.personManual||''} onChange={e=>setNewCost(p=>({...p,personManual:e.target.value}))} placeholder="Nome da pessoa/empresa" style={{marginTop:6,fontSize:12}}/>}
              </div>
            </div>
            <div className="form-row full">
              <div className="fg"><div className="flabel">Descrição do serviço</div>
                <input value={newCost.description} onChange={e=>setNewCost(p=>({...p,description:e.target.value}))} placeholder="ex: Passagem de cabo CAT6 — 2 andares"/></div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Nº de diárias</div>
                <input type="number" min="0.5" step="0.5" value={newCost.days} onChange={e=>setNewCost(p=>({...p,days:Number(e.target.value),total:Number(e.target.value)*p.daily_rate}))}/></div>
              <div className="fg"><div className="flabel">Valor por diária (R$)</div>
                <input type="number" value={newCost.daily_rate} onChange={e=>setNewCost(p=>({...p,daily_rate:Number(e.target.value),total:p.days*Number(e.target.value)}))}/></div>
              <div className="fg"><div className="flabel">Total (R$)</div>
                <input type="number" value={newCost.total||newCost.days*newCost.daily_rate} onChange={e=>setNewCost(p=>({...p,total:Number(e.target.value)}))}/></div>
            </div>
            <div style={{background:'var(--surf)',borderRadius:5,padding:'8px 12px',marginBottom:12,fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'var(--text3)'}}>{newCost.proposal_code&&`Proposta: ${newCost.proposal_code}`}</span>
              <b style={{color:'var(--amber)',fontSize:15}}>{fmt(newCost.total||newCost.days*newCost.daily_rate)}</b>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setShowAddCost(false)}>Cancelar</button>
              <button className="btn primary" disabled={!newCost.description||(newCost.person!=='__manual__'?!newCost.person:!newCost.personManual)} onClick={()=>{
                const person=newCost.person==='__manual__'?newCost.personManual:newCost.person
                saveCost([...laborCosts,{...newCost,person,total:newCost.total||newCost.days*newCost.daily_rate}])
                setShowAddCost(false)
              }}>Registrar</button>
            </div>
          </div>
        </div>}
      </div>}

      {/* PER-PROJECT ANALYSIS */}
      {tab==='projects_detail' && <div>
        {approved.length===0?<div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>Nenhum projeto aprovado no período</div>:(
          approved.map((p,pi)=>{
            const fl=Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
            const equip=fl.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
            const labor=Number(p.labor)||0
            const revenue2=equip+labor
            const equipCost=fl.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]))).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
            const proj=projects.find(pr=>pr.proposal_id===p.id)
            const travel=proj?calcTravelCost(proj):0
            const hours=proj?calcHoursCost(proj):0
            const third=proj?calcThirdPartyCost(proj):0
            const totalCost=equipCost+travel+hours+third
            const profit2=revenue2-totalCost
            const mg=revenue2>0?Math.round(profit2/revenue2*100):0
            return <div key={pi} className="section" style={{marginBottom:16}}>
              <div className="sec-hdr" style={{background:'var(--surf)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span className="mono" style={{fontWeight:700,color:'var(--accent)'}}>{p.code}</span>
                  <span style={{fontWeight:600}}>{p.client_name}</span>
                  <span className="badge b-green" style={{fontSize:10}}>Aprovado</span>
                  {proj&&<span className="badge b-blue" style={{fontSize:10}}>{proj.phase}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:pC(mg)}}>{mg}% margem</div>
              </div>
              <div style={{padding:'14px 16px'}}>
                {/* Revenue vs costs breakdown */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Receita</div>
                    {[
                      {l:'Equipamentos',v:equip,c:'var(--accent)'},
                      {l:'Mão de obra (proposta)',v:labor,c:'var(--accent)'},
                      {l:'Total receita',v:revenue2,c:'var(--green)',bold:true},
                    ].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                      <span style={{color:'var(--text2)',fontWeight:r.bold?600:400}}>{r.l}</span>
                      <span style={{color:r.c,fontWeight:r.bold?700:500}}>{fmt(r.v)}</span>
                    </div>)}
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Custos</div>
                    {[
                      {l:'Custo equipamentos',v:equipCost,c:'var(--amber)'},
                      {l:'Deslocamento',v:travel,c:'var(--amber)',sub:proj?`${proj.travel_km||0}km × ${proj.travel_visits||5} visitas`:'sem projeto'},
                      {l:'Hora interna',v:hours,c:'rgba(124,58,237,0.8)',sub:proj?`${proj.labor_hours_actual||proj.labor_hours_estimated||0}h × R$${proj.hourly_rate||150}/h`:''},
                      {l:'Terceiros',v:third,c:'var(--amber)',sub:proj?`${(proj.third_party_costs||[]).length} registros`:''},
                      {l:'Total custos',v:totalCost,c:'var(--red)',bold:true},
                    ].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                      <div><span style={{color:'var(--text2)',fontWeight:r.bold?600:400}}>{r.l}</span>{r.sub&&<div style={{fontSize:10,color:'var(--text3)'}}>{r.sub}</div>}</div>
                      <span style={{color:r.c,fontWeight:r.bold?700:500,flexShrink:0}}>{fmt(r.v)}</span>
                    </div>)}
                  </div>
                </div>
                {/* Result */}
                <div style={{background:mg>=30?'rgba(22,163,74,0.06)':'rgba(220,38,38,0.06)',border:`1px solid ${mg>=30?'var(--green)':'var(--red)'}`,borderRadius:6,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>Lucro líquido do projeto</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      {proj&&`Visitas: ${proj.travel_visits||5} · Horas: ${proj.labor_hours_actual||proj.labor_hours_estimated||0}h · Terceiros: ${(proj.third_party_costs||[]).length}`}
                      {!proj&&'Projeto ainda não vinculado — adicione custos em Projetos'}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:24,fontWeight:700,color:pC(mg)}}>{fmt(profit2)}</div>
                    <div style={{fontSize:13,color:pC(mg),fontWeight:600}}>{mg}% margem real</div>
                  </div>
                </div>
              </div>
            </div>
          })
        )}
      </div>}

      {/* MARGIN ANALYSIS */}
      {tab==='margin' && <div className="section">
        <div className="sec-hdr"><div className="sec-title">Análise de margens — projetos aprovados</div></div>
        {!approved.length?<div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>Nenhum projeto aprovado no período</div>:(
          <table className="tbl">
            <thead><tr><th>Proposta</th><th>Cliente</th><th style={{textAlign:'right'}}>Equip.</th><th style={{textAlign:'right'}}>M.Obra</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Custo</th><th style={{textAlign:'right'}}>Lucro</th><th style={{textAlign:'right'}}>Mg%</th></tr></thead>
            <tbody>
              {approved.map((p,i)=>{
                const fl=Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                const equip=fl.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
                const labor=Number(p.labor)||0,total=equip+labor,cost=calcCost(p),profit2=total-cost
                const mg=total>0?Math.round(profit2/total*100):0
                return <tr key={i}>
                  <td className="mono" style={{fontWeight:600}}>{p.code}</td>
                  <td>{p.client_name}</td>
                  <td style={{textAlign:'right'}}>{fmt(equip)}</td>
                  <td style={{textAlign:'right'}}>{fmt(labor)}</td>
                  <td style={{textAlign:'right',fontWeight:600,color:'var(--accent)'}}>{fmt(total)}</td>
                  <td style={{textAlign:'right',color:'var(--amber)'}}>{cost?fmt(cost):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:600,color:profit2>=0?'var(--green)':'var(--red)'}}>{cost?fmt(profit2):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:700,fontSize:14,color:pC(mg)}}>{cost?`${mg}%`:'—'}</td>
                </tr>
              })}
            </tbody>
          </table>
        )}
      </div>}
      </div>
    </div>
  )
}
