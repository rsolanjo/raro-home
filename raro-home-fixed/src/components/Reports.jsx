import { useState } from 'react'
import { getAuditLog, checkProposalStock, getProposals } from '../db/database.js'

const PHASE_LABEL = {
  visit:'Visita', measurement:'Medição', project:'Projeto',
  budget:'Orçamento', purchase:'Compras', installation:'Instalação',
  config:'Configuração', done:'Concluído'
}
const NEXT_STEP = {
  visit:'Agendar medição no local',
  measurement:'Criar projeto e mapa de calor WiFi',
  project:'Fechar orçamento com o cliente',
  budget:'Comprar material listado',
  purchase:'Iniciar instalação no endereço',
  installation:'Configurar cômodos e testar',
  config:'Realizar entrega e treinamento',
  done:'Projeto concluído ✓'
}

export default function Reports({ projects, proposals, stock, clients, currentUser }) {
  const [tab, setTab] = useState('status')
  const [auditFilter, setAuditFilter] = useState({ module:'all', user:'all' })
  const [selectedClients, setSelectedClients] = useState([]) // [] = all
  const [clientDropOpen, setClientDropOpen] = useState(false)

  const allClientNames = [...new Set([
    ...projects.map(p=>p.client_name),
    ...proposals.map(p=>p.client_name),
  ])].filter(Boolean).sort()

  function toggleClient(name) {
    setSelectedClients(prev =>
      prev.includes(name) ? prev.filter(x=>x!==name) : [...prev, name]
    )
  }

  const auditLog = getAuditLog({ limit: 200 })
  const activeProjects = projects.filter(p => p.phase !== 'done')

  // ── Pending purchases across all projects ──
  const allPendingPurchases = projects.flatMap(p =>
    (p.purchase_list || []).filter(i => !i.arrived).map(i => ({
      ...i,
      project_client: p.client_name,
      project_id: p.id
    }))
  )

  // ── Pending rooms (not delivered) ──
  const allPendingRooms = projects
    .filter(p => p.phase === 'installation' || p.phase === 'config')
    .flatMap(p =>
      (p.rooms_config || []).filter(r => !r.delivered).map(r => ({
        ...r, project_client: p.client_name, project_id: p.id
      }))
    )

  // ── Unanswered proposals (sent > 7 days ago) ──
  const unanswered = proposals.filter(p => {
    if (p.status !== 'sent') return false
    const days = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return days > 7
  })

  // ── Critical stock ──
  const criticalStock = stock.filter(s => s.qty <= s.min_qty)

  // ── Filter helpers ──
  const filterByClient = arr => selectedClients.length===0 ? arr : arr.filter(x=>selectedClients.includes(x.client_name))
  const filteredProjects = filterByClient(activeProjects)
  const filteredProposals = filterByClient(proposals.filter(p=>p.status==='approved'||p.status==='sent'))
  const filteredPendingPurchases = selectedClients.length===0 ? allPendingPurchases : allPendingPurchases.filter(x=>selectedClients.includes(x.project_client))
  const filteredUnanswered = selectedClients.length===0 ? unanswered : unanswered.filter(x=>selectedClients.includes(x.client_name))

  // ── Client overview with all proposals ──
  const clientOverview = clients.map(c => {
    const cProposals = proposals.filter(p => p.client_id === c.id)
    const cProject   = projects.find(p => p.client_id === c.id && p.phase !== 'done')
    return { client: c, proposals: cProposals, activeProject: cProject }
  }).filter(x => x.proposals.length > 0 || x.activeProject)

  // ── PDF Export ──
  function exportLog(moduleFilter='all') {
    const rows = [['Data/Hora','Módulo','Ação','Item','Antes','Depois','Usuário']]
    const data = moduleFilter === 'all'
      ? auditLog
      : auditLog.filter(l => l.module === moduleFilter)
    data.forEach(l => {
      rows.push([
        new Date(l.date).toLocaleString('pt-BR'),
        l.module || '',
        l.action || '',
        l.entity_name || '',
        l.before || '',
        l.after || '',
        l.user || ''
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    const label = moduleFilter === 'all' ? 'completo' : moduleFilter
    a.download = `raro-log-${label}-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  function exportPDF() {
    const date = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
    const html = buildReportPDF({ activeProjects, allPendingPurchases, allPendingRooms, unanswered, criticalStock, date, selectedClients })
    const blob = new Blob([html], {type:'text/html;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.target = '_blank'; a.rel = 'noopener'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const TABS = [
    { key:'status',    label:'Status por cliente',    icon:'ti-users' },
    { key:'pending',   label:'Pendências',             icon:'ti-alert-circle' },
    { key:'purchases', label:'Compras pendentes',      icon:'ti-shopping-cart' },
    { key:'audit',     label:'Log de auditoria',       icon:'ti-history' },
  ]

  const allUsers = [...new Set(auditLog.map(l => l.user).filter(Boolean))]
  const allModules = [...new Set(auditLog.map(l => l.module).filter(Boolean))]
  const filteredAudit = auditLog.filter(l =>
    (auditFilter.module === 'all' || l.module === auditFilter.module) &&
    (auditFilter.user === 'all' || l.user === auditFilter.user)
  )

  const ACTION_COLOR = {
    create: 'var(--green)', update: 'var(--accent)', delete: 'var(--red)',
    login: '#7C3AED', logout: '#6B7280', status_change: 'var(--amber)'
  }
  const ACTION_ICON = {
    create:'ti-plus', update:'ti-edit', delete:'ti-trash',
    login:'ti-login', logout:'ti-logout', status_change:'ti-refresh'
  }

  return (
    <>
      {clientDropOpen && <div style={{position:'fixed',inset:0,zIndex:40}} onClick={()=>setClientDropOpen(false)}/>}
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-chart-bar" aria-hidden/>Relatórios</div>
        <div className="topbar-acts" style={{gap:8}}>
          {/* Multi-client selector */}
          <div style={{position:'relative'}}>
            <button className="btn" onClick={()=>setClientDropOpen(o=>!o)} style={{minWidth:160,justifyContent:'space-between',gap:8}}>
              <span style={{fontSize:12}}>
                {selectedClients.length===0
                  ? 'Todos os clientes'
                  : selectedClients.length===1
                    ? selectedClients[0].split(' ')[0]
                    : `${selectedClients.length} clientes`}
              </span>
              <i className={`ti ti-chevron-${clientDropOpen?'up':'down'}`} style={{fontSize:12}} aria-hidden/>
            </button>
            {clientDropOpen && (
              <div style={{position:'absolute',top:'100%',right:0,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,boxShadow:'0 4px 16px rgba(0,0,0,0.15)',zIndex:50,minWidth:220,maxHeight:280,overflowY:'auto',marginTop:4}}>
                <div style={{padding:'6px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'var(--text3)'}}>Filtrar clientes</span>
                  {selectedClients.length>0&&<button style={{fontSize:10,background:'none',border:'none',cursor:'pointer',color:'var(--accent)'}} onClick={()=>setSelectedClients([])}>Limpar</button>}
                </div>
                {allClientNames.map(name=>(
                  <div key={name} onClick={()=>toggleClient(name)}
                    style={{padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,background:selectedClients.includes(name)?'var(--accent-lt)':'transparent',fontSize:12}}
                    onMouseEnter={e=>!selectedClients.includes(name)&&(e.currentTarget.style.background='var(--surf)')}
                    onMouseLeave={e=>!selectedClients.includes(name)&&(e.currentTarget.style.background='transparent')}>
                    <div style={{width:14,height:14,border:`1.5px solid ${selectedClients.includes(name)?'var(--accent)':'var(--border)'}`,borderRadius:3,background:selectedClients.includes(name)?'var(--accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {selectedClients.includes(name)&&<i className="ti ti-check" style={{fontSize:9,color:'#fff'}} aria-hidden/>}
                    </div>
                    <span style={{color:selectedClients.includes(name)?'var(--accent-dk)':'var(--text)'}}>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn primary" onClick={exportPDF}>
            <i className="ti ti-download" aria-hidden/>Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{borderBottom:'1px solid var(--border)',display:'flex',background:'var(--bg)',flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{padding:'10px 16px',border:'none',background:'transparent',cursor:'pointer',
              fontSize:12,color:tab===t.key?'var(--accent)':'var(--text2)',
              borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`,
              display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',fontWeight:tab===t.key?500:400}}>
            <i className={`ti ${t.icon}`} aria-hidden/>{t.label}
            {t.key==='pending' && (unanswered.length+allPendingRooms.length) > 0 &&
              <span style={{background:'var(--red-lt)',color:'var(--red)',fontSize:9,padding:'1px 5px',borderRadius:8,fontWeight:600}}>
                {unanswered.length+allPendingRooms.length}
              </span>}
          </button>
        ))}
      </div>

      <div className="content">

        {/* STATUS POR CLIENTE */}
        {tab==='status' && <>
          <div style={{marginBottom:14,display:'flex',gap:10,flexWrap:'wrap'}}>
            <div className="met" style={{flex:1,minWidth:140}}>
              <div className="met-label">Projetos ativos</div>
              <div className="met-val blue">{activeProjects.length}</div>
            </div>
            <div className="met" style={{flex:1,minWidth:140}}>
              <div className="met-label">Orçamentos sem resposta (+7d)</div>
              <div className="met-val amber">{unanswered.length}</div>
            </div>
            <div className="met" style={{flex:1,minWidth:140}}>
              <div className="met-label">Compras pendentes</div>
              <div className="met-val" style={{color:'var(--accent)'}}>{allPendingPurchases.length}</div>
            </div>
            <div className="met" style={{flex:1,minWidth:140}}>
              <div className="met-label">Estoque crítico</div>
              <div className="met-val red">{criticalStock.length}</div>
            </div>
          </div>

          <div className="section">
            <div className="sec-hdr"><div className="sec-title">Próximos passos por cliente</div></div>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Fase atual</th><th>Próximo passo</th><th>Prazo</th><th>Compras</th><th>Cômodos</th><th>Situação</th></tr></thead>
              <tbody>
                {filteredProjects.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum projeto ativo</td></tr>}
                {filteredProjects.map(p=>{
                  const pendBuy = (p.purchase_list||[]).filter(i=>!i.arrived).length
                  const pendRooms = (p.rooms_config||[]).filter(r=>!r.delivered).length
                  const totalRooms = (p.rooms_config||[]).length
                  const overdue = p.deadline && new Date(p.deadline) < new Date()
                  const hasPending = pendBuy > 0 || pendRooms > 0
                  return <tr key={p.id}>
                    <td>
                      <div style={{fontWeight:600}}>{p.client_name}</div>
                      <div className="sub">{p.description}</div>
                    </td>
                    <td><span className="badge b-blue" style={{fontSize:10}}>{PHASE_LABEL[p.phase]||p.phase}</span></td>
                    <td style={{fontSize:12,color:'var(--text2)',maxWidth:200}}>{NEXT_STEP[p.phase]}</td>
                    <td style={{color:overdue?'var(--red)':'var(--text2)',fontWeight:overdue?500:400,fontSize:12}}>
                      {p.deadline ? new Date(p.deadline+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}
                      {overdue && ' ⚠'}
                    </td>
                    <td>
                      {pendBuy>0
                        ? <span className="badge b-amber" style={{fontSize:10}}>{pendBuy} item(s)</span>
                        : <span className="badge b-green" style={{fontSize:10}}>OK</span>}
                    </td>
                    <td style={{fontSize:12}}>
                      {totalRooms>0 ? `${totalRooms-pendRooms}/${totalRooms}` : '—'}
                    </td>
                    <td>
                      {hasPending
                        ? <span className="badge b-amber" style={{fontSize:10}}>Pendências</span>
                        : <span className="badge b-green" style={{fontSize:10}}>Em dia</span>}
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>

          {/* Client proposal history */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title">Histórico de orçamentos por cliente</div></div>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Orçamentos</th><th>Total aprovado</th></tr></thead>
              <tbody>
                {clientOverview.map(({client,proposals:cProps})=>{
                  const approved = cProps.filter(p=>p.status==='approved')
                  const totalApproved = approved.reduce((s,p)=>{
                    const eq=(p.floors||[]).flatMap(f=>f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),0)
                    return s+eq+(p.labor||0)
                  },0)
                  return <tr key={client.id}>
                    <td style={{fontWeight:500}}>{client.name1} & {client.name2}<div className="sub">{client.neighborhood}</div></td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {cProps.map(p=>{
                          const s = {draft:'b-gray',sent:'b-blue',approved:'b-green',rejected:'b-red',waiting:'b-amber'}[p.status]||'b-gray'
                          return <span key={p.id} className={`badge ${s}`} style={{fontSize:10}}>
                            {p.code||`#${p.id}`}
                          </span>
                        })}
                      </div>
                    </td>
                    <td style={{color:'var(--accent)',fontWeight:500}}>
                      {totalApproved>0 ? `R$ ${Math.round(totalApproved).toLocaleString('pt-BR')}` : '—'}
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* PENDÊNCIAS */}
        {tab==='pending' && <>
          {unanswered.length>0 && (
            <div className="section" style={{marginBottom:14}}>
              <div className="sec-hdr" style={{background:'var(--amber-lt)'}}>
                <div className="sec-title" style={{color:'var(--amber)'}}><i className="ti ti-clock" aria-hidden/>Orçamentos sem resposta há mais de 7 dias</div>
              </div>
              <table className="tbl">
                <thead><tr><th>ID</th><th>Cliente</th><th>Valor</th><th>Enviado em</th><th>Dias aguardando</th></tr></thead>
                <tbody>
                  {unanswered.map(p=>{
                    const days = Math.floor((Date.now()-new Date(p.created_at).getTime())/86400000)
                    const total = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((s,r)=>s+(r.price||0),0)+(p.labor||0)
                    return <tr key={p.id}>
                      <td className="mono">{p.code||`#${p.id}`}</td>
                      <td style={{fontWeight:500}}>{p.client_name}</td>
                      <td style={{color:'var(--accent)',fontWeight:500}}>R$ {Math.round(total).toLocaleString('pt-BR')}</td>
                      <td style={{fontSize:12,color:'var(--text2)'}}>{p.created_at}</td>
                      <td><span style={{color:'var(--amber)',fontWeight:600}}>{days} dias</span></td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          )}

          {allPendingRooms.length>0 && (
            <div className="section" style={{marginBottom:14}}>
              <div className="sec-hdr"><div className="sec-title"><i className="ti ti-home" aria-hidden/>Cômodos pendentes de entrega</div></div>
              <table className="tbl">
                <thead><tr><th>Cliente</th><th>Cômodo</th><th>Instalado</th><th>Configurado</th><th>Testado</th><th>Entregue</th></tr></thead>
                <tbody>
                  {allPendingRooms.map((r,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:500}}>{r.project_client}</td>
                      <td>{r.name}</td>
                      {['installed','configured','tested','delivered'].map(f=>(
                        <td key={f} style={{textAlign:'center'}}>
                          {r[f]
                            ? <span style={{color:'var(--green)',fontSize:14}}>✓</span>
                            : <span style={{color:'var(--red)',fontSize:14}}>✗</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {criticalStock.length>0 && (
            <div className="section">
              <div className="sec-hdr" style={{background:'var(--red-lt)'}}>
                <div className="sec-title" style={{color:'var(--red)'}}><i className="ti ti-box" aria-hidden/>Estoque crítico ou zerado</div>
              </div>
              <table className="tbl">
                <thead><tr><th>Código</th><th>Produto</th><th>Qtd. atual</th><th>Mínimo</th><th>Link de compra</th></tr></thead>
                <tbody>
                  {criticalStock.map(s=>(
                    <tr key={s.id}>
                      <td className="mono">{s.code}</td>
                      <td>{s.name}</td>
                      <td style={{color:s.qty===0?'var(--red)':'var(--amber)',fontWeight:600}}>{s.qty}</td>
                      <td style={{color:'var(--text3)'}}>{s.min_qty}</td>
                      <td>
                        {s.buy_link
                          ? <a href={s.buy_link} target="_blank" rel="noreferrer">
                              <button className="btn" style={{fontSize:10,padding:'3px 7px'}}>Comprar</button>
                            </a>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {unanswered.length===0 && allPendingRooms.length===0 && criticalStock.length===0 && (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>
              <i className="ti ti-check" style={{fontSize:32,display:'block',marginBottom:10,color:'var(--green)'}} aria-hidden/>
              Nenhuma pendência crítica no momento 🎉
            </div>
          )}
        </>}

        {/* COMPRAS PENDENTES */}
        {tab==='purchases' && (
          <>
          {/* Items that need to be bought for sent/draft proposals */}
          {(() => {
            const allProposals = getProposals().filter(p=>p.status==='sent'||p.status==='approved')
            const propWarnings = allProposals.flatMap(p => {
              const w = checkProposalStock(p.floors||[])
              return w.map(item=>({...item, proposal_code:p.code, client_name:p.client_name, proposal_status:p.status}))
            })
            return propWarnings.length > 0 ? (
              <div className="section" style={{marginBottom:14,borderColor:'rgba(220,38,38,0.3)'}}>
                <div className="sec-hdr" style={{background:'rgba(220,38,38,0.05)'}}>
                  <div className="sec-title" style={{color:'var(--red)'}}><i className="ti ti-shopping-cart" aria-hidden/>Itens a comprar — orçamentos enviados/aprovados</div>
                </div>
                <table className="tbl">
                  <thead><tr><th>Proposta</th><th>Cliente</th><th>Produto</th><th>Código</th><th>Precisa</th><th>Disponível</th><th>Status</th></tr></thead>
                  <tbody>
                    {propWarnings.map((w,i)=>(
                      <tr key={i}>
                        <td className="mono">{w.proposal_code}</td>
                        <td style={{fontWeight:500}}>{w.client_name}</td>
                        <td>{w.name}</td>
                        <td className="mono" style={{fontSize:10}}>{w.code}</td>
                        <td style={{textAlign:'center',fontWeight:600,color:'var(--accent)'}}>{w.needed}</td>
                        <td style={{textAlign:'center',color:w.available===0?'var(--red)':'var(--amber)',fontWeight:600}}>{w.available}</td>
                        <td><span className={`badge ${w.type==='zero'?'b-red':'b-amber'}`} style={{fontSize:10}}>{w.type==='zero'?'Zerado':'Insuficiente'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null
          })()}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title">Lista de compras pendentes por projeto</div></div>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Item</th><th>Código</th><th>Qtd</th><th>Fornecedor</th><th>Prev. chegada</th><th>Link</th></tr></thead>
              <tbody>
                {filteredPendingPurchases.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhuma compra pendente</td></tr>}
                {filteredPendingPurchases.map((it,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{it.project_client}</td>
                    <td>{it.item}</td>
                    <td className="mono">{it.code}</td>
                    <td style={{textAlign:'center',fontWeight:600}}>{it.qty}</td>
                    <td style={{color:'var(--text2)',fontSize:12}}>{it.supplier||'—'}</td>
                    <td style={{fontSize:12,color:'var(--text2)'}}>
                      {it.arrival_date ? new Date(it.arrival_date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}
                    </td>
                    <td>
                      {it.buy_link
                        ? <a href={it.buy_link} target="_blank" rel="noreferrer">
                            <button className="btn" style={{fontSize:10,padding:'3px 7px',color:'var(--accent)'}}>Comprar</button>
                          </a>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* AUDIT LOG */}
        {tab==='audit' && (
          <div className="section">
            <div className="sec-hdr">
              <div className="sec-title"><i className="ti ti-history" aria-hidden/>Log de auditoria</div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <select value={auditFilter.module} onChange={e=>setAuditFilter(f=>({...f,module:e.target.value}))}
                  style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border)',borderRadius:5}}>
                  <option value="all">Todos os módulos</option>
                  {allModules.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
                <select value={auditFilter.user} onChange={e=>setAuditFilter(f=>({...f,user:e.target.value}))}
                  style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border)',borderRadius:5}}>
                  <option value="all">Todos os usuários</option>
                  {allUsers.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <button className="btn" style={{fontSize:11,color:'var(--accent)',borderColor:'var(--accent)',gap:5}}
                  onClick={()=>exportLog(auditFilter.module)}>
                  <i className="ti ti-download" aria-hidden/>
                  Exportar {auditFilter.module==='all'?'tudo':auditFilter.module}
                </button>
              </div>
            </div>
            <table className="tbl">
              <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Módulo</th><th>Ação</th><th>Entidade</th><th>Detalhe</th></tr></thead>
              <tbody>
                {filteredAudit.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhuma atividade registrada</td></tr>}
                {filteredAudit.map((l,i)=>{
                  const clr = ACTION_COLOR[l.action]||'var(--text3)'
                  const icon = ACTION_ICON[l.action]||'ti-dots'
                  return <tr key={i}>
                    <td className="mono" style={{fontSize:10}}>{new Date(l.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                    <td style={{fontWeight:500,color:'var(--accent)',fontSize:12}}>{l.user||'—'}</td>
                    <td><span className="badge b-gray" style={{fontSize:10}}>{l.module||'—'}</span></td>
                    <td><span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:clr,fontWeight:500}}>
                      <i className={`ti ${icon}`} style={{fontSize:11}} aria-hidden/>{l.action}
                    </span></td>
                    <td style={{fontSize:12}}>{l.entity_name||l.entity_id||'—'}</td>
                    <td style={{fontSize:10,color:'var(--text3)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {l.after ? l.after.slice(0,80)+'...' : '—'}
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Report PDF builder ─────────────────────────────────────
function buildReportPDF({ activeProjects, allPendingPurchases, allPendingRooms, unanswered, criticalStock, date, selectedClients=[] }) {
  const PHASE_LABEL = { visit:'Visita', measurement:'Medição', project:'Projeto', budget:'Orçamento', purchase:'Compras', installation:'Instalação', config:'Configuração', done:'Concluído' }
  const NEXT_STEP = { visit:'Agendar medição', measurement:'Criar projeto e mapa de calor', project:'Fechar orçamento', budget:'Comprar material', purchase:'Iniciar instalação', installation:'Configurar e testar', config:'Entrega e treinamento', done:'Concluído' }

  const section = (title, content) => `
    <div style="margin-bottom:20px;border:0.5px solid #C8DEFF;border-radius:3px;overflow:hidden">
      <div style="background:#060B1A;padding:7px 14px">
        <div style="font-size:7px;letter-spacing:3px;color:#38BDF8;text-transform:uppercase;font-family:'DM Sans',sans-serif">${title}</div>
      </div>
      <div style="background:#F5FAFF;padding:0">${content}</div>
    </div>`

  const tbl = (headers, rows) => `
    <table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif">
      <thead><tr>${headers.map(h=>`<th style="font-size:7px;letter-spacing:1px;text-transform:uppercase;color:#6B8CAE;font-weight:400;padding:5px 10px;text-align:left;border-bottom:0.5px solid #C8DEFF;background:#E8F4FF">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r,i)=>`<tr style="border-bottom:0.5px solid #C8DEFF;background:${i%2===0?'#F5FAFF':'#fff'}">${r.map(c=>`<td style="padding:7px 10px;font-size:8px;color:#060B1A">${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`

  const statusContent = activeProjects.length
    ? tbl(
        ['Cliente','Fase','Próximo passo','Prazo','Compras pend.','Situação'],
        activeProjects.map(p => {
          const pend = (p.purchase_list||[]).filter(i=>!i.arrived).length
          const overdue = p.deadline && new Date(p.deadline) < new Date()
          return [
            `<strong>${p.client_name}</strong><br><span style="color:#9E9690;font-size:6.5px">${p.description}</span>`,
            PHASE_LABEL[p.phase]||p.phase,
            NEXT_STEP[p.phase]||'—',
            p.deadline ? `<span style="color:${overdue?'#B42318':'#3A3530'}">${new Date(p.deadline+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>` : '—',
            pend > 0 ? `<span style="color:#92540B;font-weight:500">${pend} item(s)</span>` : '<span style="color:#0A7E5A">OK</span>',
            pend > 0 ? '<span style="color:#92540B">Pendências</span>' : '<span style="color:#0A7E5A">Em dia</span>'
          ]
        })
      )
    : '<div style="padding:14px;font-size:11px;color:#9E9690;text-align:center">Nenhum projeto ativo</div>'

  const purchaseContent = allPendingPurchases.length
    ? tbl(
        ['Cliente','Item','Cód.','Qtd','Fornecedor','Prev.chegada'],
        allPendingPurchases.map(it => [
          it.project_client, it.item,
          `<span style="font-family:monospace;font-size:6.5px">${it.code||'—'}</span>`,
          `<strong>${it.qty}</strong>`, it.supplier||'—',
          it.arrival_date ? new Date(it.arrival_date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'
        ])
      )
    : '<div style="padding:14px;font-size:11px;color:#0A7E5A;text-align:center">Nenhuma compra pendente ✓</div>'

  const unansweredContent = unanswered.length
    ? tbl(
        ['ID','Cliente','Valor','Enviado em','Dias'],
        unanswered.map(p => {
          const days = Math.floor((Date.now()-new Date(p.created_at).getTime())/86400000)
          const total = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((s,r)=>s+(r.price||0),0)+(p.labor||0)
          return [
            p.code||`#${p.id}`, `<strong>${p.client_name}</strong>`,
            `R$ ${Math.round(total).toLocaleString('pt-BR')}`, p.created_at,
            `<span style="color:#92540B;font-weight:500">${days} dias</span>`
          ]
        })
      )
    : '<div style="padding:14px;font-size:11px;color:#0A7E5A;text-align:center">Nenhum orçamento sem resposta ✓</div>'

  const stockContent = criticalStock.length
    ? tbl(
        ['Código','Produto','Qtd','Mínimo'],
        criticalStock.map(s => [
          `<span style="font-family:monospace">${s.code}</span>`, s.name,
          `<span style="color:${s.qty===0?'#B42318':'#92540B'};font-weight:600">${s.qty}</span>`,
          s.min_qty
        ])
      )
    : '<div style="padding:14px;font-size:11px;color:#0A7E5A;text-align:center">Estoque OK ✓</div>'

  const clientFilter = selectedClients && selectedClients.length > 0 ? ` · Filtrado: ${selectedClients.join(', ')}` : ''
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>RARO Home — Relatório ${date}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#F5FAFF;color:#060B1A;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:11px}
@media print{.no-print{display:none!important}}
</style>
</head><body>
<div class="no-print" style="background:#060B1A;color:#F0F6FF;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:12px;margin-bottom:16px;border-radius:6px">
  <span><strong>RARO Home</strong> — Relatório ${date}${clientFilter}</span>
  <button onclick="window.print()" style="background:#0EA5E9;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif">⬇ Salvar como PDF</button>
</div>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #060B1A">
  <div>
    <div style="font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#060B1A;letter-spacing:2px">RARO HOME</div>
    <div style="font-size:7px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-top:2px">Relatório de Gestão</div>
  </div>
  <div style="text-align:right;font-family:'DM Sans',sans-serif">
    <div style="font-size:11px;color:#3D5A80">${date}</div>
    <div style="font-size:8px;color:#6B8CAE;margin-top:2px">rarohome.com.br</div>
  </div>
</div>

${section('Status dos projetos — próximos passos por cliente', statusContent)}
${section('Compras pendentes', purchaseContent)}
${section('Orçamentos aguardando resposta', unansweredContent)}
${section('Estoque crítico', stockContent)}

</body></html>`
}
