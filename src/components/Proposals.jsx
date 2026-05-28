import { openProposalPDF } from './proposalPDF.js'
import { useState } from 'react'
import { saveProposal, deleteProposal, getProposals, auditedSave, saveProject, getProjects } from '../db/supabase.js'

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

export default function Proposals({ proposals, onRefresh, onEdit, onNew, currentUser, onViewPDF, clients=[] }) {
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [changeReq, setChangeReq] = useState(null)
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

  function requestStatusChange(p, status) { setChangeReq({ proposal:p, newStatus:status }) }
  async function confirmChange() {
    if (!changeReq) return
    try {
    const before = proposals.find(p=>p.id===changeReq.proposal.id)
    const updated = { ...changeReq.proposal, status:changeReq.newStatus }
    const saved = await saveProposal(updated)
    if (!saved) throw new Error('Supabase não retornou o registro salvo')
    await auditedSave('orçamentos','status_change',saved,currentUser?.name,before)
    // Auto-create project when proposal is approved
    if (changeReq.newStatus === 'approved') {
      try {
        const existingProjects = await getProjects()
        const alreadyExists = existingProjects.some(p=>p.proposal_id===changeReq.proposal.id)
        if (!alreadyExists) {
          await saveProject({
            client_id: changeReq.proposal.client_id,
            client_name: changeReq.proposal.client_name,
            description: changeReq.proposal.description || `Proposta ${changeReq.proposal.code}`,
            type: 'residencial',
            phase: 'visit',
            proposal_id: changeReq.proposal.id,
            proposal_code: changeReq.proposal.code,
            notes: `Projeto criado automaticamente a partir da proposta ${changeReq.proposal.code}`,
          })
        }
      } catch(e) { console.error('Error creating project:', e) }
    }
    setChangeReq(null); onRefresh()
    } catch(err) { console.error('Erro ao confirmar mudança:', err); alert('Erro: ' + err.message) }
  }
  function handleDelete() {
    if (!changeReq) return
    auditedSave('orçamentos','delete',changeReq.proposal,currentUser?.name)
    deleteProposal(changeReq.proposal.id)
    setChangeReq(null); onRefresh()
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
                        {/* Action buttons - with client phone lookup */}
                        {(()=>{
                          const cl = clients.find(c=>c.id===Number(p.client_id))
                          const pWithPhones = { ...p,
                            client_phone1: cl?.phone1||'',
                            client_phone2: cl?.phone2||'',
                            itemFontSize: 7,
                            floors: Array.isArray(p.floors) ? p.floors : (typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
                          }
                          const phone1 = cl?.phone1?.replace(/\D/g,'').replace(/^(?!55)/,'55')
                          const phone2 = cl?.phone2?.replace(/\D/g,'').replace(/^(?!55)/,'55')
                          const waGroup = cl?.wa_group_clients || ''
                          const floors = Array.isArray(pWithPhones.floors) ? pWithPhones.floors : []
                          const equipTotal = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
                          const total = equipTotal + (Number(p.labor)||0)
                          const totalFmt = total>0?`R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'a confirmar'
                          const msg = encodeURIComponent(`Olá ${cl?.name1||p.client_name}! Tudo bem?\n\nSegue sua proposta RARO Home:\n📋 *${p.code||'#'+p.id}*\n💰 *${totalFmt}*\n\nO PDF da proposta foi enviado em anexo nesta conversa.\n\nQualquer dúvida, estou à disposição! 🏠\n\n— Rogério | RARO Home\n📱 (21) 98170-9009`)
                          return <>
                            <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'var(--accent)',borderColor:'var(--accent)'}}
                              onClick={()=>openProposalPDF(pWithPhones,false)} title="Visualizar proposta">
                              <i className="ti ti-eye" aria-hidden/>Ver
                            </button>
                            <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'#7C3AED',borderColor:'#7C3AED'}}
                              onClick={()=>openProposalPDF(pWithPhones,true)} title="Ver versão admin">
                              <i className="ti ti-shield" aria-hidden/>Admin
                            </button>
                            <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'var(--green)',borderColor:'var(--green)'}}
                              onClick={()=>{ openProposalPDF({...pWithPhones,_download:true},false) }} title="Gerar PDF">
                              <i className="ti ti-download" aria-hidden/>PDF
                            </button>
                            {/* WhatsApp send buttons */}
                            {phone1&&<button className="btn" style={{fontSize:11,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}} title={`Baixar PDF e abrir WA para ${cl?.name1}`}
                              onClick={async ()=>{
                                await openProposalPDF({...pWithPhones,_download:true},false)
                                setTimeout(()=>window.open(`https://wa.me/${phone1}?text=${msg}`,'_blank'),1200)
                              }}>
                              <i className="ti ti-brand-whatsapp" aria-hidden/>WA1
                            </button>}
                            {phone2&&<button className="btn" style={{fontSize:11,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}} title={`Baixar PDF e abrir WA para ${cl?.name2}`}
                              onClick={async ()=>{
                                await openProposalPDF({...pWithPhones,_download:true},false)
                                setTimeout(()=>window.open(`https://wa.me/${phone2}?text=${msg}`,'_blank'),1200)
                              }}>
                              <i className="ti ti-brand-whatsapp" aria-hidden/>WA2
                            </button>}
                            {waGroup&&<a href={waGroup} target="_blank" rel="noreferrer">
                              <button className="btn" style={{fontSize:11,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}} title="Enviar para grupo do cliente">
                                <i className="ti ti-brand-whatsapp" aria-hidden/>Grupo
                              </button>
                            </a>}
                            <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>setChangeReq({proposal:p,newStatus:'__delete__'})} title="Excluir"><i className="ti ti-trash" aria-hidden/></button>
                          </>
                        })()}
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
      {changeReq && (
        <div className="modal-overlay">
          <div className="modal" style={{width:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{changeReq.newStatus==='__delete__'?'Excluir orçamento?':'Confirmar mudança'}</div>
              <button className="modal-close" onClick={()=>setChangeReq(null)}>×</button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:500,marginBottom:8}}>{changeReq.proposal.client_name} · {changeReq.proposal.code||`#${changeReq.proposal.id}`}</div>
              {changeReq.newStatus==='__delete__'
                ? <div style={{background:'var(--red-lt)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--red)'}}>
                    Esta ação não pode ser desfeita. Reservas de estoque serão liberadas.
                  </div>
                : <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span className={`badge ${STATUS[changeReq.proposal.status]?.cls}`}>{STATUS[changeReq.proposal.status]?.label}</span>
                      <i className="ti ti-arrow-right" style={{fontSize:14,color:'var(--text3)'}} aria-hidden/>
                      <span className={`badge ${STATUS[changeReq.newStatus]?.cls}`}>{STATUS[changeReq.newStatus]?.label}</span>
                    </div>
                    {STATUS_NOTE[changeReq.newStatus] && (
                      <div style={{background:'var(--surf)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--text2)'}}>
                        {STATUS_NOTE[changeReq.newStatus]}
                      </div>
                    )}
                  </div>}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setChangeReq(null)}>Cancelar</button>
              {changeReq.newStatus==='__delete__'
                ? <button className="btn danger" onClick={handleDelete}>Excluir</button>
                : <button className="btn primary" onClick={confirmChange}>Confirmar</button>}
            </div>
          </div>
        </div>
      )}

      {/* Comparative modal */}
      {showComp && (
        <div className="modal-overlay">
          <div className="modal" style={{width:700,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-chart-bar" style={{marginRight:6}} aria-hidden/>Comparativo de Margens e Itens</div>
              <button className="modal-close" onClick={()=>setShowComp(false)}>×</button>
            </div>
            {(()=>{
              const approved = proposals.filter(p=>p.status==='approved'||p.status==='sent')
              if(!approved.length) return <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)'}}>Nenhum orçamento enviado ainda.</div>

              // Build item frequency and margin map
              const itemMap = {}
              approved.forEach(p=>{
                ;(p.floors||[]).forEach(fl=>{
                  ;(fl.rooms||[]).forEach(r=>{
                    ;(r.items||[]).forEach(it=>{
                      if(!it.code) return
                      if(!itemMap[it.code]) itemMap[it.code]={name:it.name,code:it.code,category:it.category||'Outro',count:0,totalQty:0,costs:[],margins:[],proposals:[]}
                      const qty=parseInt(it.qty)||1
                      itemMap[it.code].count++
                      itemMap[it.code].totalQty+=qty
                      if(it.cost_price>0&&it.sale_price>0){
                        itemMap[it.code].costs.push(it.cost_price)
                        const m=Math.round((it.sale_price-it.cost_price)/it.cost_price*100)
                        itemMap[it.code].margins.push(m)
                      }
                      itemMap[it.code].proposals.push(p.code||`#${p.id}`)
                    })
                  })
                })
              })

              // Proposal margin summary
              const propMargins = approved.map(p=>{
                const allItems=(p.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[])))
                const cost=allItems.reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
                const sale=(p.floors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)
                const pct=cost>0?Math.round((sale-cost)/cost*100):0
                return {code:p.code||`#${p.id}`,client:p.client_name,sale,cost,pct,status:p.status}
              }).sort((a,b)=>b.pct-a.pct)

              const sortedItems = Object.values(itemMap).sort((a,b)=>b.count-a.count)
              const pC=p=>p>=50?'var(--green)':p>=20?'var(--amber)':'var(--red)'

              return <>
                {/* Per-proposal margin */}
                <div className="flabel" style={{marginBottom:8}}>Margem por proposta</div>
                <table className="tbl" style={{marginBottom:20}}>
                  <thead><tr><th>Código</th><th>Cliente</th><th>Venda equip.</th><th>Custo</th><th>Lucro</th><th>Margem</th><th>Status</th></tr></thead>
                  <tbody>
                    {propMargins.map((p,i)=><tr key={i}>
                      <td className="mono" style={{fontWeight:600}}>{p.code}</td>
                      <td>{p.client}</td>
                      <td style={{color:'var(--accent)',fontWeight:500}}>R$ {Math.round(p.sale).toLocaleString('pt-BR')}</td>
                      <td style={{color:'var(--text2)'}}>R$ {Math.round(p.cost).toLocaleString('pt-BR')}</td>
                      <td style={{color:p.pct>=0?'var(--green)':'var(--red)',fontWeight:500}}>R$ {Math.round(p.sale-p.cost).toLocaleString('pt-BR')}</td>
                      <td><b style={{color:pC(p.pct),fontSize:13}}>{p.pct}%</b></td>
                      <td><span className={`badge ${p.status==='approved'?'b-green':'b-blue'}`} style={{fontSize:10}}>{p.status==='approved'?'Aprovado':'Enviado'}</span></td>
                    </tr>)}
                  </tbody>
                </table>

                {/* Item frequency + margin */}
                <div className="flabel" style={{marginBottom:8}}>Itens mais usados e suas margens</div>
                <table className="tbl">
                  <thead><tr><th>Produto</th><th>Cód.</th><th>Categoria</th><th style={{textAlign:'center'}}>Propostas</th><th style={{textAlign:'center'}}>Qtd total</th><th>Margem média</th><th>Custo médio</th></tr></thead>
                  <tbody>
                    {sortedItems.map((it,i)=>{
                      const avgM=it.margins.length?Math.round(it.margins.reduce((s,m)=>s+m,0)/it.margins.length):null
                      const avgC=it.costs.length?Math.round(it.costs.reduce((s,c)=>s+c,0)/it.costs.length):null
                      return <tr key={i}>
                        <td style={{fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</td>
                        <td className="mono" style={{fontSize:10}}>{it.code}</td>
                        <td style={{fontSize:11,color:'var(--text3)'}}>{it.category}</td>
                        <td style={{textAlign:'center',fontWeight:600,color:'var(--accent)'}}>{it.count}</td>
                        <td style={{textAlign:'center',fontWeight:600}}>{it.totalQty}</td>
                        <td>{avgM!==null?<b style={{color:pC(avgM)}}>{avgM}%</b>:<span style={{color:'var(--text3)',fontSize:10}}>—</span>}</td>
                        <td style={{color:'var(--text2)'}}>{avgC?`R$ ${avgC.toLocaleString('pt-BR')}`:'—'}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </>
            })()}
          </div>
        </div>
      )}
    </>
  )
}
