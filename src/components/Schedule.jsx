import { useState } from 'react'

const PHASE_COLORS = {
  visit:'#7C3AED', measurement:'#EA580C', project:'#1A56DB',
  budget:'#0A7E5A', purchase:'#92540B', installation:'#1A56DB',
  config:'#7C3AED', done:'#6B7280',
}
const PHASE_LABELS = {
  visit:'Visita', measurement:'Medição', project:'Projeto',
  budget:'Orçamento', purchase:'Compras', installation:'Instalação',
  config:'Configuração', done:'Concluído',
}

export default function Schedule({ projects }) {
  const [clientFilter, setClientFilter] = useState('all')
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
  const monthName = now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  const uniqueClients = [...new Set(projects.map(p=>p.client_name))]
  const filtered = projects.filter(p=>
    p.phase!=='done' && (clientFilter==='all' || p.client_name===clientFilter)
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-calendar-event" aria-hidden/>Cronograma</div>
        <div className="topbar-acts">
          <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)}
            style={{fontSize:12,padding:'5px 9px',borderRadius:5,border:'1px solid var(--border)'}}>
            <option value="all">Todos os clientes</option>
            {uniqueClients.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="content">
        <div className="section">
          <div className="sec-hdr">
            <div className="sec-title" style={{textTransform:'capitalize'}}>{monthName}</div>
          </div>
          <div style={{padding:'0 2px'}}>
            {/* Days header */}
            <div className="gantt-row" style={{background:'var(--surf)'}}>
              <div className="gantt-lbl" style={{fontSize:10,color:'var(--text3)'}}>Projeto</div>
              <div className="gantt-area" style={{display:'grid',gridTemplateColumns:`repeat(${daysInMonth},1fr)`}}>
                {Array.from({length:daysInMonth},(_,i)=>(
                  <div key={i} style={{
                    fontSize:9,
                    color: i===now.getDate()-1 ? 'var(--accent)' : 'var(--text3)',
                    textAlign:'center',
                    fontWeight: i===now.getDate()-1 ? 700 : 400,
                    background: i===now.getDate()-1 ? 'var(--accent-lt)' : 'transparent',
                    borderRadius:2,
                  }}>{(i+1)%5===1||i===0 ? i+1 : ''}</div>
                ))}
              </div>
            </div>

            {filtered.length===0 && (
              <div style={{padding:'20px 14px',textAlign:'center',color:'var(--text3)',fontSize:13}}>
                Nenhum projeto ativo para exibir
              </div>
            )}

            {filtered.map(p=>{
              const color = PHASE_COLORS[p.phase]||'#6B7280'
              let startPct=5, widthPct=40
              if (p.deadline) {
                const dl = new Date(p.deadline+'T12:00:00')
                if (dl.getMonth()===now.getMonth() && dl.getFullYear()===now.getFullYear()) {
                  const endDay = dl.getDate()
                  const w = Math.min(95, Math.round(endDay/daysInMonth*100))
                  startPct = Math.max(0, w-30)
                  widthPct = w-startPct
                }
              }
              const purchasePending = (p.purchase_list||[]).filter(i=>!i.arrived).length
              return <div key={p.id} className="gantt-row">
                <div className="gantt-lbl">
                  <div style={{fontWeight:500,fontSize:11.5}}>{p.client_name}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{p.description}</div>
                  {p.in_obra && <span style={{fontSize:9,background:'var(--green-lt)',color:'var(--green)',padding:'1px 4px',borderRadius:2}}>Em obra</span>}
                  {purchasePending>0 && <span style={{fontSize:9,background:'var(--amber-lt)',color:'var(--amber)',padding:'1px 4px',borderRadius:2,marginLeft:2}}>{purchasePending} compra(s)</span>}
                </div>
                <div className="gantt-area">
                  <div className="gantt-bar" style={{width:`${widthPct}%`,marginLeft:`${startPct}%`,background:color,fontSize:10}}>
                    {PHASE_LABELS[p.phase]}
                  </div>
                </div>
              </div>
            })}
          </div>
        </div>

        <div className="section">
          <div className="sec-hdr"><div className="sec-title">Detalhe dos projetos</div></div>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Fase</th><th>Em obra</th><th>Prazo</th><th>Compras pendentes</th><th>Cômodos entregues</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum projeto</td></tr>}
              {filtered.map(p=>{
                const totalRooms=(p.rooms_config||[]).length
                const deliveredRooms=(p.rooms_config||[]).filter(r=>r.delivered).length
                const pendingBuy=(p.purchase_list||[]).filter(i=>!i.arrived).length
                return <tr key={p.id}>
                  <td><div style={{fontWeight:500}}>{p.client_name}</div><div className="sub">{p.description}</div></td>
                  <td><span className="badge b-blue" style={{fontSize:10}}>{PHASE_LABELS[p.phase]}</span></td>
                  <td><span className={`badge ${p.in_obra?'b-green':'b-gray'}`} style={{fontSize:10}}>{p.in_obra?'Sim':'Não'}</span></td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{p.deadline?new Date(p.deadline+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'}):'—'}</td>
                  <td>{pendingBuy>0?<span className="badge b-amber" style={{fontSize:10}}>{pendingBuy} item(s)</span>:<span className="badge b-green" style={{fontSize:10}}>OK</span>}</td>
                  <td style={{fontSize:12}}>{totalRooms>0?`${deliveredRooms}/${totalRooms}`:'—'}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
