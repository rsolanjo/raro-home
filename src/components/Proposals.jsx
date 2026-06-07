import Contract from './Contract.jsx'

function ContractSendModal({ proposal, clients, onClose }) {
  const [targets, setTargets] = useState({})
  const [custom, setCustom]   = useState('')
  const [email, setEmail]     = useState('')
  const cl = clients?.find(x=>x.id===Number(proposal?.client_id))
  const floors = (() => {
    const f = proposal?.floors
    if(!f) return []
    if(typeof f==='string'){try{return JSON.parse(f)}catch{return []}}
    return Array.isArray(f)?f:[]
  })()
  const total = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)+(Number(proposal?.labor)||0)
  const totalFmt = `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const norm = p => p.replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^(?!55)/,'55')
  const msg = encodeURIComponent(`${cl?.name1||proposal?.client_name}, o contrato do seu projeto está pronto para assinatura. 📄\n\n📋 *${proposal?.code}* · 💰 *${totalFmt}*\n\nAssinatura e dúvidas: só chamar!\n— Rogério · RARO Home · (21) 98170-9009`)
  if(!proposal) return null

  // Build phone options from client — always show even if empty
  const phoneOptions = [
    cl?.phone1 && {key:'p1', label:`${cl.name1||'Cliente 1'}`, phone:cl.phone1, hint:'cadastrado'},
    cl?.phone2 && {key:'p2', label:`${cl.name2||'Cliente 2'}`, phone:cl.phone2, hint:'cadastrado'},
  ].filter(Boolean)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:480}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="ti ti-file-contract" style={{marginRight:6,color:'#059669'}} aria-hidden/>
            Enviar Contrato
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Proposal info */}
        <div style={{marginBottom:14,padding:'10px 12px',background:'var(--surf)',borderRadius:6,fontSize:12,color:'var(--text2)',lineHeight:1.8}}>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <div>
              Contrato <b style={{color:'var(--accent)',fontFamily:'monospace'}}>{proposal.code}</b>
              {' · '}<b>{proposal.client_name}</b>
            </div>
            <b style={{color:'var(--accent)'}}>{totalFmt}</b>
          </div>
        </div>

        {/* Info */}
        <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
          <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
          Baixe o contrato antes de enviar e anexe na conversa do WhatsApp.
        </div>

        {/* WhatsApp from client */}
        <div className="flabel" style={{marginBottom:8}}>
          <i className="ti ti-brand-whatsapp" style={{color:'#16A34A',marginRight:4}} aria-hidden/>
          WhatsApp — contatos do cliente:
        </div>
        {phoneOptions.length===0 && (
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:10,padding:'8px 12px',background:'var(--surf)',borderRadius:6}}>
            <i className="ti ti-alert-circle" style={{marginRight:4,color:'var(--amber)'}} aria-hidden/>
            Nenhum telefone cadastrado para este cliente — use o campo abaixo.
          </div>
        )}
        {phoneOptions.map(({key,label,phone,hint})=>(
          <label key={key} style={{
            display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            border:'1px solid',borderRadius:6,cursor:'pointer',marginBottom:8,
            background:targets[key]?'rgba(22,163,74,0.06)':'var(--bg)',
            borderColor:targets[key]?'#16A34A':'var(--border)'
          }}>
            <input type="checkbox" checked={!!targets[key]}
              onChange={e=>setTargets(t=>({...t,[key]:e.target.checked}))}
              style={{width:16,height:16,accentColor:'#16A34A',cursor:'pointer'}}/>
            <i className="ti ti-brand-whatsapp" style={{fontSize:18,color:'#16A34A',flexShrink:0}} aria-hidden/>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{label}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{phone}</div>
            </div>
            <span style={{fontSize:10,color:'var(--green)',background:'rgba(22,163,74,0.1)',padding:'2px 6px',borderRadius:10}}>{hint}</span>
          </label>
        ))}

        {/* Manual phone */}
        <div style={{marginBottom:12,padding:'10px 12px',border:'1px dashed var(--border)',borderRadius:6}}>
          <div className="flabel" style={{marginBottom:6}}>Adicionar outro número manualmente:</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="(21) 99999-9999" style={{flex:1,fontSize:13}}
              onKeyDown={e=>{ if(e.key==='Enter'&&custom){ setTargets(t=>({...t,custom:true})) }}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              <input type="checkbox"
                checked={!!targets.custom&&!!custom}
                onChange={e=>setTargets(t=>({...t,custom:e.target.checked}))}
                disabled={!custom}
                style={{accentColor:'#16A34A',width:15,height:15}}/>
              <span>Incluir</span>
            </label>
          </div>
        </div>

        {/* Email */}
        <div style={{marginBottom:14}}>
          <div className="flabel" style={{marginBottom:6}}>
            <i className="ti ti-mail" style={{marginRight:4}} aria-hidden/>E-mail:
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input
              value={email||''}
              onChange={e=>setEmail(e.target.value)}
              placeholder={cl?.email||'email@exemplo.com'}
              type="email"
              style={{flex:1,fontSize:13}}/>
            {(email||cl?.email) && (
              <button className="btn" style={{fontSize:11,color:'var(--accent)',borderColor:'var(--accent)',flexShrink:0}}
                onClick={()=>{
                  const addr = email||cl?.email
                  const sub=encodeURIComponent(`Contrato RARO Home — ${proposal.code}`)
                  const body=encodeURIComponent(`Olá ${cl?.name1||proposal.client_name}!\n\nSegue o contrato do projeto RARO Home.\nO PDF está em anexo para assinatura.\nDúvidas: (21) 98170-9009\n— Rogério | RARO Home`)
                  window.open(`mailto:${addr}?subject=${sub}&body=${body}`)
                }}>
                <i className="ti ti-mail" aria-hidden/>Abrir e-mail
              </button>
            )}
          </div>
          {cl?.email&&!email&&<div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>E-mail cadastrado: {cl.email}</div>}
        </div>

        {/* Action buttons */}
        <div style={{borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
          <button className="btn primary"
            style={{background:'#16A34A',borderColor:'#16A34A',gap:8,justifyContent:'center'}}
            disabled={!Object.values(targets).some(Boolean)}
            title={Object.values(targets).some(Boolean)?'Enviar para os selecionados':'Selecione ao menos um número'}
            onClick={()=>{
              if(targets.p1&&cl?.phone1) window.open(`https://wa.me/${norm(cl.phone1)}?text=${msg}`,'_blank')
              if(targets.p2&&cl?.phone2) window.open(`https://wa.me/${norm(cl.phone2)}?text=${msg}`,'_blank')
              if(targets.custom&&custom) window.open(`https://wa.me/${norm(custom)}?text=${msg}`,'_blank')
              onClose()
            }}>
            <i className="ti ti-brand-whatsapp" aria-hidden/>
            Enviar contrato via WhatsApp {Object.values(targets).filter(Boolean).length>0&&`(${Object.values(targets).filter(Boolean).length})`}
          </button>
          <button className="btn" style={{gap:8,justifyContent:'center'}} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

import { openProposalPDF } from './proposalPDF.js'
import React, { useState } from 'react'
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

export default function Proposals({ proposals, onRefresh, onEdit, onNew, onNewExec, currentUser, onViewPDF, clients=[] }) {
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [changeReq, setChangeReq] = useState(null)
  const [contractProposal, setContractProposal] = useState(null)
  const [sendContractProposal, setSendContractProposal] = useState(null)
  const [contractsGenerated, setContractsGenerated] = useState(() => {
    try { return JSON.parse(localStorage.getItem('raro_contracts_generated')||'{}') } catch { return {} }
  })
  function markContractGenerated(proposalId) {
    const updated = {...contractsGenerated, [proposalId]: true}
    setContractsGenerated(updated)
    localStorage.setItem('raro_contracts_generated', JSON.stringify(updated))
  }
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
  async function handleDelete() {
    if (!changeReq) return
    try {
      await deleteProposal(changeReq.proposal.id)
      await auditedSave('orçamentos','delete',changeReq.proposal,currentUser?.name)
    } catch(err) { console.error(err) }
    setChangeReq(null)
    onRefresh()
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
            <i className="ti ti-plus" aria-hidden/>Novo
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
                            {p.status==='approved'&&<>
                              <button className="btn" style={{fontSize:11,padding:'3px 7px',borderColor:'#059669',color:'#059669'}}
                                onClick={()=>setContractProposal(p)} title="Abrir contrato">
                                <i className="ti ti-file-contract" aria-hidden/>Contrato
                              </button>
                              <button
                                className={`btn${contractsGenerated[p.id]?' primary':''}`}
                                style={{fontSize:11,padding:'3px 7px',
                                  ...(contractsGenerated[p.id]
                                    ?{background:'#059669',color:'#fff',borderColor:'#059669'}
                                    :{opacity:0.45,cursor:'not-allowed',borderColor:'#059669',color:'#059669'})}}
                                disabled={!contractsGenerated[p.id]}
                                title={contractsGenerated[p.id]?'Enviar contrato':'Salve o contrato primeiro (botão na página do contrato)'}
                                onClick={()=>contractsGenerated[p.id]&&setSendContractProposal(p)}>
                                <i className="ti ti-send" aria-hidden/>Enviar
                              </button>
                            </>}
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
          <div className="modal" style={{width:'min(96vw,1100px)',height:'90vh',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            
            {/* Fixed header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{fontSize:15,fontWeight:600,color:'var(--text1)',display:'flex',alignItems:'center',gap:8}}>
                <i className="ti ti-chart-bar" style={{color:'var(--accent)'}} aria-hidden/>
                Comparativo de Margens e Itens
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" style={{fontSize:11}} onClick={()=>{
                  const el=document.getElementById('comp-table-content')
                  if(!el) return
                  const html='<html><head><title>Comparativo RARO Home</title><style>body{font-family:sans-serif;font-size:11px;padding:20px;color:#111}h3{margin:18px 0 6px;font-size:13px;color:#0369A1}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#f0f6ff;padding:7px 10px;text-align:left;font-size:11px;color:#0369A1;border-bottom:2px solid #C8DEFF}td{padding:6px 10px;border-bottom:1px solid #eee;font-size:11px}tr:hover td{background:#fafbff}</style></head><body>'+el.innerHTML+'</body></html>'
                  const blob=new Blob([html],{type:'text/html'})
                  const url=URL.createObjectURL(blob)
                  const w=window.open(url,'_blank')
                  if(w) setTimeout(()=>w.print(),500)
                }}>
                  <i className="ti ti-printer" aria-hidden/>Exportar
                </button>
                <button className="modal-close" onClick={()=>setShowComp(false)}>×</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div id="comp-table-content" style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
              {(()=>{
                const approved = proposals.filter(p=>p.status==='approved'||p.status==='sent')
                if(!approved.length) return (
                  <div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)'}}>
                    <i className="ti ti-chart-bar" style={{fontSize:32,display:'block',marginBottom:8,opacity:0.3}} aria-hidden/>
                    Nenhum orçamento enviado ainda.
                  </div>
                )

                const itemMap = {}
                approved.forEach(p=>{
                  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                  floors.forEach(fl=>{
                    ;(fl.rooms||[]).forEach(r=>{
                      ;(r.items||[]).forEach(it=>{
                        if(!it.code) return
                        if(!itemMap[it.code]) itemMap[it.code]={name:it.name,code:it.code,category:it.category||'Outro',count:0,totalQty:0,costs:[],margins:[]}
                        const qty=parseInt(it.qty)||1
                        itemMap[it.code].count++
                        itemMap[it.code].totalQty+=qty
                        if(it.cost_price>0&&it.sale_price>0){
                          itemMap[it.code].costs.push(it.cost_price)
                          itemMap[it.code].margins.push(Math.round((it.sale_price-it.cost_price)/it.cost_price*100))
                        }
                      })
                    })
                  })
                })

                const propMargins = approved.map(p=>{
                  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                  const allItems=floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[])))
                  const cost=allItems.reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
                  const sale=floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)
                  const pct=cost>0?Math.round((sale-cost)/cost*100):0
                  return {code:p.code||`#${p.id}`,client:p.client_name,sale,cost,pct,status:p.status}
                }).sort((a,b)=>b.pct-a.pct)

                const sortedItems = Object.values(itemMap).sort((a,b)=>b.count-a.count)
                const pC=p=>p>=50?'var(--green)':p>=20?'var(--amber)':'var(--red)'
                const fmt=v=>'R$\u202f'+Math.round(v).toLocaleString('pt-BR')

                return <>
                  {/* Section 1 — Margin per proposal */}
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>
                      Margem por proposta
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Código</th><th>Cliente</th>
                          <th style={{textAlign:'right'}}>Venda</th>
                          <th style={{textAlign:'right'}}>Custo</th>
                          <th style={{textAlign:'right'}}>Lucro</th>
                          <th style={{textAlign:'right'}}>Margem</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propMargins.map((p,i)=>(
                          <tr key={i}>
                            <td className="mono" style={{fontWeight:600}}>{p.code}</td>
                            <td style={{fontWeight:500}}>{p.client}</td>
                            <td style={{textAlign:'right',color:'var(--accent)',fontWeight:500}}>{fmt(p.sale)}</td>
                            <td style={{textAlign:'right',color:'var(--text2)'}}>{fmt(p.cost)}</td>
                            <td style={{textAlign:'right',fontWeight:500,color:p.pct>=0?'var(--green)':'var(--red)'}}>{fmt(p.sale-p.cost)}</td>
                            <td style={{textAlign:'right'}}>
                              <b style={{color:pC(p.pct),fontSize:14}}>{p.pct}%</b>
                            </td>
                            <td><span className={`badge ${p.status==='approved'?'b-green':'b-blue'}`} style={{fontSize:10}}>{p.status==='approved'?'Aprovado':'Enviado'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2 — Items frequency + margin */}
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>
                      Itens mais utilizados e margens
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Produto</th><th>Código</th><th>Categoria</th>
                          <th style={{textAlign:'center'}}>Nº propostas</th>
                          <th style={{textAlign:'center'}}>Qtd total</th>
                          <th style={{textAlign:'right'}}>Margem média</th>
                          <th style={{textAlign:'right'}}>Custo médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map((it,i)=>{
                          const avgM=it.margins.length?Math.round(it.margins.reduce((s,m)=>s+m,0)/it.margins.length):null
                          const avgC=it.costs.length?Math.round(it.costs.reduce((s,c)=>s+c,0)/it.costs.length):null
                          return <tr key={i}>
                            <td style={{fontWeight:500}}>{it.name}</td>
                            <td className="mono" style={{fontSize:10,color:'var(--text3)'}}>{it.code}</td>
                            <td style={{fontSize:11,color:'var(--text3)'}}>{it.category}</td>
                            <td style={{textAlign:'center',fontWeight:700,color:'var(--accent)'}}>{it.count}</td>
                            <td style={{textAlign:'center',fontWeight:600}}>{it.totalQty}</td>
                            <td style={{textAlign:'right'}}>
                              {avgM!==null
                                ? <b style={{color:pC(avgM),fontSize:13}}>{avgM}%</b>
                                : <span style={{color:'var(--text3)'}}>—</span>}
                            </td>
                            <td style={{textAlign:'right',color:'var(--text2)'}}>
                              {avgC?`R$ ${avgC.toLocaleString('pt-BR')}`:'—'}
                            </td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              })()}
            </div>
          </div>
        </div>
      )}
      {sendContractProposal && <ContractSendModal
        proposal={sendContractProposal}
        clients={clients}
        onClose={()=>setSendContractProposal(null)}
      />}
      {contractProposal && <Contract
        proposal={contractProposal}
        clients={clients}
        onClose={()=>setContractProposal(null)}
        onGenerated={(p)=>{ markContractGenerated(p.id) }}
        onSend={(p)=>{ setContractProposal(null); setSendContractProposal(p) }}
      />}
    </>
  )
}