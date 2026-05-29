import { useState } from 'react'

const fmt  = v => 'R$\u202f'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const pct  = (a,b) => b>0?Math.round(a/b*100):0
const pC   = p => p>=40?'var(--green)':p>=20?'var(--amber)':'var(--red)'

function getFloors(p){const f=p?.floors;if(!f)return[];if(typeof f==='string'){try{return JSON.parse(f)}catch{return []}}return Array.isArray(f)?f:[]}
function revenue(p){return getFloors(p).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)+(Number(p?.labor)||0)}
function equipCost(p){return getFloors(p).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]))).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)}
function travel(proj){
  const km=Number(proj?.travel_km)||0,v=Number(proj?.travel_visits)||5
  const fuel=Number(proj?.fuel_price)||6.5,cons=Number(proj?.fuel_consumption)||8
  return km>0?km*2*v/cons*fuel:0
}
function hoursC(proj){return((proj?.labor_hours_actual||proj?.labor_hours_estimated||0))*(proj?.hourly_rate||150)}
function thirdC(proj){return(proj?.third_party_costs||[]).reduce((s,t)=>s+(t.total||t.days*t.daily_rate||0),0)}
function opCost(proj){return travel(proj)+hoursC(proj)+thirdC(proj)}

export default function Financial({ proposals=[], projects=[] }) {
  const [tab, setTab]   = useState('overview')
  const [period, setPeriod] = useState('all')
  const [selProjId, setSelProjId] = useState('')  // '' = all

  const now = new Date()
  const inPeriod = p => {
    const d = new Date(p.created_at||0)
    if(period==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    if(period==='quarter') return d>=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1)
    if(period==='year') return d.getFullYear()===now.getFullYear()
    return true
  }

  const fp       = proposals.filter(inPeriod)
  const approved = fp.filter(p=>p.status==='approved')
  const sent     = fp.filter(p=>p.status==='sent')

  // Per-proposal financial data merged with linked project costs
  const enriched = approved.map(p=>{
    const proj = projects.find(pr=>pr.proposal_id===p.id)
    const rev  = revenue(p)
    const ec   = equipCost(p)
    const tr   = travel(proj)
    const hr   = hoursC(proj)
    const td   = thirdC(proj)
    const op   = tr+hr+td
    const total_cost = ec+op
    const profit = rev-total_cost
    const mg = pct(profit,rev)
    return { p, proj, rev, ec, tr, hr, td, op, total_cost, profit, mg }
  })

  const filtered = selProjId ? enriched.filter(e=>e.p.id===Number(selProjId)) : enriched

  // Aggregates
  const totalRev    = filtered.reduce((s,e)=>s+e.rev,0)
  const totalEquip  = filtered.reduce((s,e)=>s+e.ec,0)
  const totalTravel = filtered.reduce((s,e)=>s+e.tr,0)
  const totalHours  = filtered.reduce((s,e)=>s+e.hr,0)
  const totalThird  = filtered.reduce((s,e)=>s+e.td,0)
  const totalOp     = filtered.reduce((s,e)=>s+e.op,0)
  const totalCost   = filtered.reduce((s,e)=>s+e.total_cost,0)
  const totalProfit = filtered.reduce((s,e)=>s+e.profit,0)
  const totalMg     = pct(totalProfit,totalRev)
  const pipeline    = sent.reduce((s,p)=>s+revenue(p),0)
  const convRate    = fp.length>0?pct(approved.length,fp.length):0

  const TABS = [
    {k:'overview',l:'Visão Geral',i:'ti-layout-dashboard'},
    {k:'by_project',l:'Por Projeto',i:'ti-layout-kanban'},
    {k:'proposals_list',l:'Propostas',i:'ti-file-text'},
  ]
  const PERIODS = [{v:'month',l:'Mês'},{v:'quarter',l:'Trimestre'},{v:'year',l:'Ano'},{v:'all',l:'Tudo'}]

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <div style={{background:'var(--accent)',borderRadius:8,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-coin" style={{color:'#fff',fontSize:17}} aria-hidden/>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:'var(--text1)'}}>Controle Financeiro</div>
          </div>
          <div style={{fontSize:12,color:'var(--text3)',marginLeft:44}}>Receitas · Margens · Custos · Horas · Deslocamento · Terceiros</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--text3)'}}>Período:</span>
          {PERIODS.map(o=><button key={o.v} onClick={()=>setPeriod(o.v)}
            className={period===o.v?'btn primary':'btn'} style={{fontSize:11,padding:'4px 10px'}}>{o.l}</button>)}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Receita Total',v:fmt(totalRev),sub:`${filtered.length} projetos aprovados`,icon:'ti-trending-up',c:'var(--green)'},
          {l:'Lucro Líquido',v:fmt(totalProfit),sub:'após todos os custos',icon:'ti-pig-money',c:totalProfit>=0?'var(--green)':'var(--red)'},
          {l:'Margem Real',v:`${totalMg}%`,sub:'equip+desl+horas+3ºs',icon:'ti-percentage',c:pC(totalMg)},
          {l:'Pipeline',v:fmt(pipeline),sub:`${sent.length} propostas enviadas`,icon:'ti-clock',c:'var(--accent)'},
          {l:'Conversão',v:`${convRate}%`,sub:`${approved.length}/${fp.length} propostas`,icon:'ti-target',c:convRate>=40?'var(--green)':convRate>=20?'var(--amber)':'var(--red)'},
        ].map((k,i)=>(
          <div key={i} style={{background:'var(--surf)',borderRadius:8,padding:'14px 16px',border:'1px solid var(--border)',borderLeft:`3px solid ${k.c}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,fontWeight:500,lineHeight:1.3}}>{k.l}</div>
              <i className={`ti ${k.icon}`} style={{fontSize:15,color:k.c,opacity:0.45}} aria-hidden/>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',marginBottom:16}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'10px 16px',fontSize:12,border:'none',background:'none',cursor:'pointer',fontFamily:'inherit',
              color:tab===t.k?'var(--accent)':'var(--text2)',fontWeight:tab===t.k?600:400,
              borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1,
              display:'flex',alignItems:'center',gap:6}}>
            <i className={`ti ${t.i}`} style={{fontSize:13}} aria-hidden/>{t.l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

          {/* P&L */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title"><i className="ti ti-report-money" style={{marginRight:6}} aria-hidden/>P&L Consolidado</div></div>
            <div style={{padding:'12px 16px'}}>
              {[
                {l:'Receita (equipamentos + MO)',v:totalRev,c:'var(--green)',bold:false},
                {l:'(-) Custo de equipamentos',  v:-totalEquip, c:'var(--amber)'},
                {l:'(-) Deslocamento total',      v:-totalTravel,c:'var(--amber)'},
                {l:'(-) Horas internas',          v:-totalHours, c:'rgba(124,58,237,0.8)'},
                {l:'(-) Mão de obra terceiros',   v:-totalThird, c:'var(--amber)'},
                {l:'= Lucro líquido',             v:totalProfit, c:totalProfit>=0?'var(--green)':'var(--red)',bold:true},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                  <span style={{color:'var(--text2)',fontWeight:r.bold?600:400}}>{r.l}</span>
                  <span style={{fontWeight:r.bold?700:500,fontSize:r.bold?15:12,color:r.c}}>{fmt(Math.abs(r.v))}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:10,fontSize:13,fontWeight:700}}>
                <span>Margem real</span>
                <span style={{fontSize:22,color:pC(totalMg)}}>{totalMg}%</span>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title"><i className="ti ti-chart-pie" style={{marginRight:6}} aria-hidden/>Composição dos custos</div></div>
            <div style={{padding:'12px 16px'}}>
              {[
                {l:'Equipamentos',v:totalEquip,c:'var(--amber)'},
                {l:'Deslocamento',v:totalTravel,c:'#7C3AED'},
                {l:'Horas internas',v:totalHours,c:'var(--accent)'},
                {l:'Terceiros',v:totalThird,c:'var(--red)'},
              ].map((r,i)=>{
                const p = pct(r.v, totalCost)
                return <div key={i} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                    <span style={{fontWeight:500}}>{r.l}</span>
                    <span style={{color:r.c,fontWeight:600}}>{fmt(r.v)} <span style={{color:'var(--text3)',fontWeight:400}}>({p}%)</span></span>
                  </div>
                  <div style={{background:'var(--border)',borderRadius:4,height:8}}>
                    <div style={{background:r.c,borderRadius:4,height:8,width:`${p}%`,transition:'width .4s'}}/>
                  </div>
                </div>
              })}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:10,display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{fontWeight:600}}>Total custos</span>
                <span style={{fontWeight:700,color:'var(--red)'}}>{fmt(totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Funil */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title"><i className="ti ti-filter" style={{marginRight:6}} aria-hidden/>Funil de propostas</div></div>
            <div style={{padding:'12px 16px'}}>
              {[
                {l:'Rascunhos',n:fp.filter(p=>p.status==='draft').length,v:fp.filter(p=>p.status==='draft').reduce((s,p)=>s+revenue(p),0),c:'var(--text3)'},
                {l:'Enviados',n:sent.length,v:pipeline,c:'var(--accent)'},
                {l:'Aprovados',n:approved.length,v:totalRev,c:'var(--green)'},
                {l:'Recusados',n:fp.filter(p=>p.status==='rejected').length,v:fp.filter(p=>p.status==='rejected').reduce((s,p)=>s+revenue(p),0),c:'var(--red)'},
              ].map((r,i)=>{
                const p = totalRev>0?Math.min(100,Math.round(r.v/totalRev*100)):0
                return <div key={i} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                    <span style={{fontWeight:500}}>{r.l} <span style={{color:'var(--text3)',fontWeight:400}}>({r.n})</span></span>
                    <span style={{fontWeight:600,color:r.c}}>{fmt(r.v)}</span>
                  </div>
                  <div style={{background:'var(--border)',borderRadius:4,height:8}}>
                    <div style={{background:r.c,borderRadius:4,height:8,width:`${p}%`,transition:'width .4s'}}/>
                  </div>
                </div>
              })}
            </div>
          </div>

          {/* Horas e deslocamento summary */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title"><i className="ti ti-clock" style={{marginRight:6}} aria-hidden/>Operacional consolidado</div></div>
            <div style={{padding:'12px 16px'}}>
              {enriched.length===0
                ? <div style={{textAlign:'center',padding:'20px 0',color:'var(--text3)',fontSize:12}}>Nenhum projeto aprovado no período</div>
                : enriched.map((e,i)=>{
                  const proj = e.proj
                  const hrs = proj?.labor_hours_actual||proj?.labor_hours_estimated||0
                  const km  = Number(proj?.travel_km)||0
                  const vis = proj?.travel_visits||5
                  return <div key={i} style={{padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                    <div style={{fontWeight:500,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'var(--accent)',fontFamily:'monospace'}}>{e.p.code}</span>
                      <span style={{color:pC(e.mg),fontWeight:700}}>{e.mg}%</span>
                    </div>
                    <div style={{display:'flex',gap:16,color:'var(--text3)'}}>
                      {hrs>0&&<span><i className="ti ti-clock" style={{marginRight:3}} aria-hidden/>{hrs}h</span>}
                      {km>0&&<span><i className="ti ti-car" style={{marginRight:3}} aria-hidden/>{km}km × {vis}x</span>}
                      {e.td>0&&<span><i className="ti ti-users" style={{marginRight:3}} aria-hidden/>{fmt(e.td)}</span>}
                      {!proj&&<span style={{color:'var(--amber)'}}>sem custos registrados</span>}
                    </div>
                  </div>
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── BY PROJECT ── */}
      {tab==='by_project' && (
        <div>
          {/* Filter */}
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16}}>
            <span style={{fontSize:12,fontWeight:500,color:'var(--text2)',flexShrink:0}}>Projeto:</span>
            <select value={selProjId} onChange={e=>setSelProjId(e.target.value)}
              style={{flex:1,maxWidth:380,fontSize:12,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg)'}}>
              <option value="">Todos os projetos aprovados ({enriched.length})</option>
              {enriched.map((e,i)=><option key={i} value={e.p.id}>
                {e.p.code} — {e.p.client_name} ({e.mg}% margem)
              </option>)}
            </select>
            {selProjId&&<button className="btn" style={{fontSize:11}} onClick={()=>setSelProjId('')}>
              <i className="ti ti-x" aria-hidden/>Ver todos
            </button>}
          </div>

          {filtered.length===0&&<div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>Nenhum projeto aprovado no período</div>}

          {filtered.map((e,pi)=>(
            <div key={pi} className="section" style={{marginBottom:16}}>
              <div className="sec-hdr" style={{background:'var(--surf)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span className="mono" style={{fontWeight:700,color:'var(--accent)',fontSize:13}}>{e.p.code}</span>
                  <span style={{fontWeight:600}}>{e.p.client_name}</span>
                  {e.proj&&<span className="badge b-blue" style={{fontSize:10}}>{e.proj.phase}</span>}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:pC(e.mg)}}>{e.mg}% margem real</div>
              </div>
              <div style={{padding:'14px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:14}}>
                  {/* Revenue */}
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:500}}>Receita</div>
                    {[
                      {l:'Equipamentos',v:e.rev-(Number(e.p.labor)||0)},
                      {l:'Mão de obra (proposta)',v:Number(e.p.labor)||0},
                    ].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                      <span style={{color:'var(--text2)'}}>{r.l}</span>
                      <span style={{color:'var(--accent)',fontWeight:500}}>{fmt(r.v)}</span>
                    </div>)}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,fontWeight:700}}>
                      <span>Total receita</span><span style={{color:'var(--green)'}}>{fmt(e.rev)}</span>
                    </div>
                  </div>
                  {/* Costs */}
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:500}}>Custos</div>
                    {[
                      {l:'Equipamentos',v:e.ec,c:'var(--amber)'},
                      {l:`Deslocamento (${e.proj?.travel_visits||5} visitas)`,v:e.tr,c:'var(--amber)',sub:e.proj?`${Number(e.proj.travel_km)||0}km ida × 2`:'sem registro'},
                      {l:`Hora interna (${e.proj?.labor_hours_actual||e.proj?.labor_hours_estimated||0}h)`,v:e.hr,c:'rgba(124,58,237,0.8)',sub:e.proj?`R$${e.proj?.hourly_rate||150}/h`:''},
                      {l:`Terceiros (${(e.proj?.third_party_costs||[]).length} reg.)`,v:e.td,c:'var(--red)'},
                    ].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                      <div><span style={{color:'var(--text2)'}}>{r.l}</span>{r.sub&&<div style={{fontSize:10,color:'var(--text3)'}}>{r.sub}</div>}</div>
                      <span style={{color:r.c,fontWeight:500,flexShrink:0}}>{fmt(r.v)}</span>
                    </div>)}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:13,fontWeight:700}}>
                      <span>Total custos</span><span style={{color:'var(--red)'}}>{fmt(e.total_cost)}</span>
                    </div>
                  </div>
                </div>
                {/* Result bar */}
                <div style={{background:e.mg>=30?'rgba(22,163,74,0.06)':'rgba(220,38,38,0.06)',
                  border:`1px solid ${e.mg>=30?'var(--green)':'var(--red)'}`,
                  borderRadius:6,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:3}}>Lucro líquido do projeto</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      {e.proj
                        ? `${e.proj?.labor_hours_actual||e.proj?.labor_hours_estimated||0}h trabalhadas · ${e.proj?.travel_visits||5} visitas · ${(e.proj?.third_party_costs||[]).length} terceiros`
                        : <span style={{color:'var(--amber)'}}>Registre custos em Projetos → aba Custos</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:26,fontWeight:700,color:pC(e.mg)}}>{fmt(e.profit)}</div>
                    <div style={{fontSize:13,color:pC(e.mg),fontWeight:600}}>{e.mg}% margem real</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROPOSALS LIST ── */}
      {tab==='proposals_list' && (
        <div className="section">
          <table className="tbl">
            <thead><tr><th>Código</th><th>Cliente</th><th>Data</th><th>Status</th>
              <th style={{textAlign:'right'}}>Receita</th><th style={{textAlign:'right'}}>Custo equip.</th>
              <th style={{textAlign:'right'}}>Custo op.</th><th style={{textAlign:'right'}}>Lucro</th><th style={{textAlign:'right'}}>Mg%</th></tr></thead>
            <tbody>
              {fp.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((p,i)=>{
                const proj=projects.find(pr=>pr.proposal_id===p.id)
                const rev=revenue(p),ec=equipCost(p),op=opCost(proj),profit2=rev-ec-op,mg2=pct(profit2,rev)
                const CLS={draft:'b-gray',sent:'b-blue',approved:'b-green',rejected:'b-red'}
                const LBL={draft:'Rascunho',sent:'Enviado',approved:'Aprovado',rejected:'Recusado'}
                return <tr key={i}>
                  <td className="mono" style={{fontWeight:600}}>{p.code||`#${p.id}`}</td>
                  <td>{p.client_name}</td>
                  <td style={{fontSize:11,color:'var(--text3)'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):'—'}</td>
                  <td><span className={`badge ${CLS[p.status]||'b-gray'}`} style={{fontSize:10}}>{LBL[p.status]||p.status}</span></td>
                  <td style={{textAlign:'right',color:'var(--accent)',fontWeight:500}}>{fmt(rev)}</td>
                  <td style={{textAlign:'right',color:'var(--amber)'}}>{ec?fmt(ec):'—'}</td>
                  <td style={{textAlign:'right',color:'rgba(124,58,237,0.8)'}}>{op?fmt(op):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:500,color:profit2>=0?'var(--green)':'var(--red)'}}>{ec?fmt(profit2):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:pC(mg2)}}>{ec?`${mg2}%`:'—'}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
