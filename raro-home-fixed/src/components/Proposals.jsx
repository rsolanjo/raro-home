import { openProposalPDF } from './proposalPDF.js'
import { useState } from 'react'
import { saveProposal, deleteProposal, getProposals, auditedSave } from '../db/database.js'

const STATUS = {
  draft:    { label:'Rascunho',   cls:'b-gray' },
  sent:     { label:'Enviado',    cls:'b-blue' },
  approved: { label:'Aprovado',   cls:'b-green' },
  waiting:  { label:'Aguardando', cls:'b-amber' },
  rejected: { label:'Recusado',   cls:'b-red' },
}
const STATUS_NOTE = {
  sent:     '📦 Itens do estoque serão reservados',
  approved: '✅ Itens serão baixados definitivamente do estoque',
  rejected: '🔓 Reservas serão liberadas',
  draft:    '🔓 Reservas serão liberadas',
}

export default function Proposals({ proposals, onRefresh, onEdit, onNew, currentUser, onViewPDF }) {
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [confirm,  setConfirm]  = useState(null)
  const [sortCol,  setSortCol]  = useState('id')
  const [sortDir,  setSortDir]  = useState('desc')
  const [showComp, setShowComp] = useState(false)

  // ── Sort ──────────────────────────────────────────────────
  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  function SortIcon({ col }) {
    if (sortCol !== col) return <i className="ti ti-selector" style={{fontSize:11,opacity:.4}} aria-hidden/>
    return <i className={`ti ti-sort-${sortDir==='asc'?'ascending':'descending'}`} style={{fontSize:11,color:'var(--accent)'}} aria-hidden/>
  }

  function fmtTotal(p) {
    const eq = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((s,r)=>s+(r.price||0),0)
    return eq + (p.labor||0)
  }

  const sorted = [...proposals]
    .filter(p => filter==='all' || p.status===filter)
    .filter(p => !search ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.code||'').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => {
      let av, bv
      if (sortCol==='id')          { av=a.id;              bv=b.id }
      else if (sortCol==='client') { av=a.client_name||''; bv=b.client_name||'' }
      else if (sortCol==='value')  { av=fmtTotal(a);       bv=fmtTotal(b) }
      else if (sortCol==='date')   { av=a.created_at||'';  bv=b.created_at||'' }
      else if (sortCol==='status') { av=a.status||'';      bv=b.status||'' }
      else                         { av=a.id;              bv=b.id }
      const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv))
      return sortDir==='asc' ? cmp : -cmp
    })

  // ── Comparative data ──────────────────────────────────────
  const roomAvgs = {}
  proposals.filter(p=>p.status==='approved'||p.status==='sent').forEach(p => {
    ;(p.floors||[]).forEach(fl => {
      ;(fl.rooms||[]).forEach(r => {
        if (!r.name || !r.price) return
        const key = r.name.toLowerCase().trim()
        if (!roomAvgs[key]) roomAvgs[key] = { total:0, count:0, name:r.name, vals:[] }
        roomAvgs[key].total += r.price
        roomAvgs[key].count += 1
        roomAvgs[key].vals.push(r.price)
      })
    })
  })
  const avgs = Object.values(roomAvgs)
    .map(r=>({...r, avg:Math.round(r.total/r.count), min:Math.min(...r.vals), max:Math.max(...r.vals)}))
    .sort((a,b)=>b.avg-a.avg)

  function requestStatusChange(p, status) { setConfirm({ proposal:p, newStatus:status }) }
  function confirmChange() {
    if (!confirm) return
    const before = proposals.find(p=>p.id===confirm.proposal.id)
    saveProposal({ ...confirm.proposal, status:confirm.newStatus })
    auditedSave('orçamentos','status_change',{...confirm.proposal,status:confirm.newStatus},currentUser?.name,before)
    setConfirm(null); onRefresh()
  }
  function handleDelete() {
    if (!confirm) return
    auditedSave('orçamentos','delete',confirm.proposal,currentUser?.name)
    deleteProposal(confirm.proposal.id)
    setConfirm(null); onRefresh()
  }

  const counts = Object.fromEntries(Object.keys(STATUS).map(s=>[s,proposals.filter(p=>p.status===s).length]))

  const ThSort = ({ col, children }) => (
    <th onClick={()=>toggleSort(col)} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
      <span style={{display:'flex',alignItems:'center',gap:4}}>{children}<SortIcon col={col}/></span>
    </th>
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-file-invoice" aria-hidden/>Orçamentos</div>
        <div className="topbar-acts">
          <button className="btn" onClick={()=>setShowComp(true)}>
            <i className="ti ti-chart-bar" aria-hidden/>Comparativo
          </button>
          <button className="btn primary" onClick={onNew}>
            <i className="ti ti-plus" aria-hidden/>Novo orçamento
          </button>
        </div>
      </div>

      <div className="content">
        {/* Filter pills */}
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          {[['all',`Todos (${proposals.length})`], ...Object.entries(STATUS).map(([k,s])=>[k,`${s.label} (${counts[k]||0})`])].map(([k,label])=>(
            <button key={k} onClick={()=>setFilter(k)}
              style={{padding:'5px 12px',borderRadius:20,border:'1px solid var(--border)',
                background:filter===k?'var(--accent)':'var(--bg)',
                color:filter===k?'#fff':'var(--text2)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar cliente, ID..." style={{marginLeft:'auto',width:200,padding:'5px 9px',fontSize:12}}/>
        </div>

        <div className="section">
          <table className="tbl">
            <thead>
              <tr>
                <ThSort col="id">ID</ThSort>
                <ThSort col="client">Cliente</ThSort>
                <th>Descrição</th>
                <ThSort col="value">Valor total</ThSort>
                <ThSort col="date">Data</ThSort>
                <ThSort col="status">Status</ThSort>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'var(--text3)'}}>Nenhum orçamento</td></tr>}
              {sorted.map(p=>{
                const s = STATUS[p.status]||STATUS.draft
                const total = fmtTotal(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="mono" style={{fontWeight:600,fontSize:12}}>{p.code||`#${p.id}`}</div>
                      <div className="sub">#{p.id}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:500}}>{p.client_name}</div>
                      <div className="sub">{(p.floors||[]).length} pav · {(p.floors||[]).flatMap(f=>f.rooms||[]).length} cômodos</div>
                    </td>
                    <td style={{color:'var(--text2)',fontSize:12}}>{p.description||'—'}</td>
                    <td style={{color:total>0?'var(--accent)':'var(--text3)',fontWeight:total>0?500:400}}>
                      {total>0 ? `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                    </td>
                    <td className="mono" style={{fontSize:11}}>
                      {p.created_at ? new Date(p.created_at+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                    </td>
                    <td>
                      <select value={p.status} onChange={e=>requestStatusChange(p,e.target.value)}
                        style={{fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,cursor:'pointer',fontFamily:'inherit'}}>
                        {Object.entries(STATUS).map(([v,{label}])=><option key={v} value={v}>{label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <button className="btn" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>onEdit(p)} title="Editar"><i className="ti ti-edit" aria-hidden/></button>
                        <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'var(--accent)',borderColor:'var(--accent)'}}
                          onClick={()=>{ if(onViewPDF) onViewPDF(p,false); else openProposalPDF(p,false) }} title="Visualizar proposta">
                          <i className="ti ti-eye" aria-hidden/>Ver
                        </button>
                        <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'#7C3AED',borderColor:'#7C3AED'}}
                          onClick={()=>{ if(onViewPDF) onViewPDF(p,true); else openProposalPDF(p,true) }} title="Ver versão admin">
                          <i className="ti ti-shield" aria-hidden/>Admin
                        </button>
                        <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'var(--green)',borderColor:'var(--green)'}}
                          onClick={()=>{ if(onViewPDF) onViewPDF(p,false,'download'); else { const r={...p}; r._download=true; openProposalPDF(r,false) } }} title="Gerar PDF para download">
                          <i className="ti ti-download" aria-hidden/>PDF
                        </button>
                        <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>setConfirm({proposal:p,newStatus:'__delete__'})} title="Excluir"><i className="ti ti-trash" aria-hidden/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Stock legend */}
        <div style={{background:'var(--surf)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--border)',fontSize:11,color:'var(--text2)'}}>
          <span>📝 <b>Rascunho:</b> sem reserva &nbsp;·&nbsp; </span>
          <span>📦 <b>Enviado:</b> itens reservados &nbsp;·&nbsp; </span>
          <span>✅ <b>Aprovado:</b> baixa do estoque &nbsp;·&nbsp; </span>
          <span>❌ <b>Recusado:</b> reserva liberada</span>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="modal-overlay">
          <div className="modal" style={{width:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{confirm.newStatus==='__delete__'?'Excluir orçamento?':'Confirmar mudança'}</div>
              <button className="modal-close" onClick={()=>setConfirm(null)}>×</button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:500,marginBottom:8}}>{confirm.proposal.client_name} · {confirm.proposal.code||`#${confirm.proposal.id}`}</div>
              {confirm.newStatus==='__delete__'
                ? <div style={{background:'var(--red-lt)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--red)'}}>
                    Esta ação não pode ser desfeita. Reservas de estoque serão liberadas.
                  </div>
                : <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span className={`badge ${STATUS[confirm.proposal.status]?.cls}`}>{STATUS[confirm.proposal.status]?.label}</span>
                      <i className="ti ti-arrow-right" style={{fontSize:14,color:'var(--text3)'}} aria-hidden/>
                      <span className={`badge ${STATUS[confirm.newStatus]?.cls}`}>{STATUS[confirm.newStatus]?.label}</span>
                    </div>
                    {STATUS_NOTE[confirm.newStatus] && (
                      <div style={{background:'var(--surf)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--text2)'}}>
                        {STATUS_NOTE[confirm.newStatus]}
                      </div>
                    )}
                  </div>}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setConfirm(null)}>Cancelar</button>
              {confirm.newStatus==='__delete__'
                ? <button className="btn danger" onClick={handleDelete}>Excluir</button>
                : <button className="btn primary" onClick={confirmChange}>Confirmar</button>}
            </div>
          </div>
        </div>
      )}

      {/* Comparative modal */}
      {showComp && (
        <div className="modal-overlay">
          <div className="modal" style={{width:560,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-chart-bar" style={{marginRight:6}} aria-hidden/>Comparativo — Média por cômodo</div>
              <button className="modal-close" onClick={()=>setShowComp(false)}>×</button>
            </div>
            {avgs.length===0
              ? <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)'}}>Nenhum orçamento enviado ainda. Os dados aparecem conforme você salvar propostas.</div>
              : <table className="tbl">
                  <thead><tr><th>Cômodo</th><th>Média</th><th>Menor</th><th style={{fontSize:10}}>Proposta (menor)</th><th>Maior</th><th style={{fontSize:10}}>Proposta (maior)</th><th>Qtd.</th></tr></thead>
                  <tbody>
                    {avgs.map(r=>{
                      // Find which proposals contain min and max values
                      let minProp=null, maxProp=null
                      proposals.filter(p=>p.status==='approved'||p.status==='sent').forEach(p=>{
                        ;(p.floors||[]).forEach(fl=>{
                          ;(fl.rooms||[]).forEach(rm=>{
                            if(rm.name?.toLowerCase()===r.name.toLowerCase()&&rm.price>0){
                              if(!minProp||rm.price<minProp.price) minProp={price:rm.price,code:p.code||`#${p.id}`,client:p.client_name}
                              if(!maxProp||rm.price>maxProp.price) maxProp={price:rm.price,code:p.code||`#${p.id}`,client:p.client_name}
                            }
                          })
                        })
                      })
                      return <tr key={r.name}>
                        <td style={{fontWeight:500}}>{r.name}</td>
                        <td style={{color:'var(--accent)',fontWeight:600}}>R$ {r.avg.toLocaleString('pt-BR')}</td>
                        <td style={{color:'var(--green)',fontWeight:600}}>R$ {r.min.toLocaleString('pt-BR')}</td>
                        <td style={{fontSize:10}}>
                          {minProp&&<div>
                            <span className="mono" style={{color:'var(--green)',fontSize:11,fontWeight:600}}>{minProp.code}</span>
                            <div style={{color:'var(--text3)',fontSize:10}}>{minProp.client}</div>
                          </div>}
                        </td>
                        <td style={{color:'var(--amber)',fontWeight:600}}>R$ {r.max.toLocaleString('pt-BR')}</td>
                        <td style={{fontSize:10}}>
                          {maxProp&&<div>
                            <span className="mono" style={{color:'var(--amber)',fontSize:11,fontWeight:600}}>{maxProp.code}</span>
                            <div style={{color:'var(--text3)',fontSize:10}}>{maxProp.client}</div>
                          </div>}
                        </td>
                        <td style={{color:'var(--text3)',fontSize:12}}>{r.count}</td>
                      </tr>
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}
    </>
  )
}
