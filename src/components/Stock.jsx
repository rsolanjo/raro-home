import PINModal from './PINModal.jsx'
import { useState, useEffect } from 'react'
import { saveStockItem, deleteStockItem, getStockWithReservations,
         getStockLog, addStockLog, addAuditLog, checkPINSession, verifyPIN, setPINSession } from '../db/supabase.js'

const CABLE_MAP = {
  'PC-AZL':{ color:'#2563EB', label:'Dados' },
  'PC-AMA':{ color:'#D97706', label:'AP' },
  'PC-BRN':{ color:'#9CA3AF', label:'Câmera' },
  'PC-VRM':{ color:'#DC2626', label:'Uplink' },
}

export default function Stock({ stock: rawStock, suppliers, onRefresh, currentUser }) {
  const [stock, setStock] = useState(rawStock || [])
  const [log, setLog]     = useState([])
  const [showPIN, setShowPIN]   = useState(false)
  const [pinAction, setPinAction] = useState(null)

  useEffect(() => {
    getStockWithReservations().then(s => setStock(s || []))
  }, [rawStock])

  useEffect(() => {
    getStockLog().then(l => setLog(l || []))
  }, [])

  const [search, setSearch]       = useState('')
  const [tab, setTab]             = useState('items')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [staged, setStaged] = useState({})
  const [form, setForm] = useState({
    code:'', name:'', category:'Automação', qty:0, min_qty:2,
    cost_price:0, unit_price:0, buy_link:'', supplier_id:''
  })

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const filtered = stock.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = stock.reduce((s,i)=>s+(i.qty*(i.unit_price||0)),0)
  const critical   = stock.filter(s=>s.qty>0&&s.qty<=s.min_qty).length
  const zeroed     = stock.filter(s=>s.qty===0).length
  const reserved   = stock.filter(s=>(s.reserved||0)>0).length

  function openNew() { requirePIN(()=>{ setEditing(null); setForm({code:'',name:'',category:'Automação',qty:0,min_qty:2,cost_price:0,unit_price:0,buy_link:'',supplier_id:''}); setShowModal(true) }) }
  function openEdit(s) { requirePIN(()=>{ setEditing(s); setForm({...s}); setShowModal(true) }) }

  function requirePIN(action) {
    if (checkPINSession()) { action(); return }
    setPinAction(()=>action)
    setShowPIN(true)
  }

  async function handleSave() {
    const prev = editing ? stock.find(s=>s.id===editing.id) : null
    const newItem = {...form, qty:Number(form.qty), min_qty:Number(form.min_qty), cost_price:Number(form.cost_price||0), unit_price:Number(form.unit_price)}
    await saveStockItem(newItem)
    const action = editing ? 'update' : 'create'
    // Stock log — always record with before/after
    if (prev && (prev.qty !== newItem.qty || prev.cost_price !== newItem.cost_price || prev.unit_price !== newItem.unit_price)) {
      const delta = newItem.qty - (prev.qty||0)
      const noteparts = []
      if (prev.qty !== newItem.qty) noteparts.push(`qtd: ${prev.qty}→${newItem.qty}`)
      if (prev.cost_price !== newItem.cost_price) noteparts.push(`custo: R$${prev.cost_price}→R$${newItem.cost_price}`)
      if (prev.unit_price !== newItem.unit_price) noteparts.push(`venda: R$${prev.unit_price}→R$${newItem.unit_price}`)
      await addStockLog({
        action: delta>0?'entrada':delta<0?'saida':'ajuste',
        code:newItem.code, name:newItem.name,
        qty:Math.abs(delta||0), qty_before:prev.qty, qty_after:newItem.qty,
        author:currentUser?.name||'Sistema',
        note:`Edição manual — ${noteparts.join(', ')}`,
        snapshot: JSON.stringify(prev),
      })
    } else if (!prev) {
      await addStockLog({ action:'cadastro', code:newItem.code, name:newItem.name, qty:newItem.qty, qty_before:0, qty_after:newItem.qty, author:currentUser?.name||'Sistema', note:'Novo item cadastrado' })
    }
    await addAuditLog({ module:'estoque', action, entity_id:newItem.id, entity_name:`${newItem.code} — ${newItem.name}`, user_name:currentUser?.name||'Sistema', after:JSON.stringify(newItem).slice(0,300), before:prev?JSON.stringify(prev).slice(0,300):null })
    setShowModal(false); onRefresh()
    getStockWithReservations().then(s => setStock(s || []))
    getStockLog().then(l => setLog(l || []))
  }

  // Staged qty input change — just updates local state
  function setQty(id, val) {
    setStaged(s=>({...s,[id]:val}))
  }

  // Commit qty change directly (no PIN)
  async function commitQty(item) {
    const newQty = parseInt(staged[item.id] ?? item.qty)
    if (isNaN(newQty) || newQty === item.qty) { clearStage(item.id); return }
    const qtyBefore = item.qty
    const qtyAfter  = Math.max(0, newQty)
    const delta     = qtyAfter - qtyBefore
    await saveStockItem({...item, qty: qtyAfter})
    await addStockLog({
      action: delta>0 ? 'entrada' : 'saida',
      code: item.code, name: item.name,
      qty: Math.abs(delta), qty_before: qtyBefore, qty_after: qtyAfter,
      author: currentUser?.name || 'Sistema',
      note: `${qtyBefore} → ${qtyAfter} (${delta>0?'+':''}${delta})`,
      snapshot: JSON.stringify({...item, qty: qtyBefore}),
    })
    await addAuditLog({
      module: 'estoque', action: 'update',
      entity_id: item.id, entity_name: `${item.code} — ${item.name}`,
      user_name: currentUser?.name || 'Sistema',
      before: `Qtd: ${qtyBefore}`, after: `Qtd: ${qtyAfter}`,
    })
    clearStage(item.id)
    onRefresh()
  }

  function clearStage(id) { setStaged(s=>{ const n={...s}; delete n[id]; return n }) }

  function exportLog() {
    const rows = [['Data/Hora','Ação','Código','Produto','Antes','Depois','Diferença','Autor','Nota']]
    log.forEach(l => {
      rows.push([
        new Date(l.date).toLocaleString('pt-BR'),
        l.action||'',
        l.code||'',
        l.name||'',
        l.qty_before ?? '',
        l.qty_after ?? '',
        l.qty !== undefined ? (l.action==='saida'?'-':'+') + l.qty : '',
        l.author||'',
        l.note||''
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `raro-estoque-log-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    setTimeout(()=>URL.revokeObjectURL(url), 3000)
  }

  function handleDelete(s) {
    if(!confirm(`Excluir "${s.name}"?`)) return
    requirePIN(()=>{
      addStockLog({ action:'exclusao', code:s.code, name:s.name, qty:s.qty, qty_before:s.qty, qty_after:0, author:currentUser?.name||'Sistema', note:'Item excluído do estoque' })
      addAuditLog({ module:'estoque', action:'delete', entity_id:s.id, entity_name:`${s.code} — ${s.name}`, user_name:currentUser?.name||'Sistema', before:`qty:${s.qty}` })
      deleteStockItem(s.id); onRefresh()
    })
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-box" aria-hidden/>Controle de Estoque</div>
        <div className="topbar-acts">
          <button className="btn" onClick={()=>setTab(tab==='items'?'log':'items')}>
            <i className={`ti ti-${tab==='items'?'history':'box'}`} aria-hidden/>
            {tab==='items'?'Ver log':'Ver estoque'}
          </button>
          {tab==='log'&&<button className="btn" onClick={exportLog} title="Exportar log como CSV">
            <i className="ti ti-download" aria-hidden/>Exportar log
          </button>}
          <button className="btn primary" onClick={openNew}><i className="ti ti-plus" aria-hidden/>Novo item</button>
        </div>
      </div>

      <div className="content">
        <div className="metrics">
          <div className="met"><div className="met-label">Total de itens</div><div className="met-val">{rawStock.length}</div></div>
          <div className="met"><div className="met-label">Valor em estoque</div><div className="met-val blue">R$ {Math.round(totalValue).toLocaleString('pt-BR')}</div></div>
          <div className="met">
            <div className="met-label">Crítico / Zerado</div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <span className="met-val amber" style={{fontSize:18}}>{critical}</span>
              <span style={{color:'var(--text3)',fontSize:16,alignSelf:'flex-end',paddingBottom:1}}>/</span>
              <span className="met-val red" style={{fontSize:18}}>{zeroed}</span>
            </div>
          </div>
          <div className="met">
            <div className="met-label">Reservados (propostas)</div>
            <div className="met-val" style={{color:'#0369A1'}}>{reserved}</div>
            <div className="met-sub" style={{color:'#0369A1',fontSize:10}}>itens com reserva ativa</div>
          </div>
        </div>


        {tab==='items' && (
          <div className="section">
            <div className="sec-hdr">
              <div className="sec-title">Itens em estoque</div>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar código ou nome..." style={{width:220,padding:'5px 9px',fontSize:12}}/>
            </div>
            <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Código</th><th>Produto</th><th>Cat.</th>
                  <th>Quantidade</th><th>Reserv.</th><th>Disponível</th>
                  <th>Mín.</th><th>Custo</th><th>Preço Venda</th><th>Nível</th><th>Status</th>
                  <th>Compra</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s=>{
                  const avail   = s.available ?? s.qty
                  const clr     = avail===0?'var(--red)':avail<=s.min_qty?'var(--amber)':'var(--green)'
                  const cable   = CABLE_MAP[s.code]
                  const hasRes  = (s.reserved||0)>0
                  const isStaged = staged[s.id] !== undefined
                  const stagedVal = staged[s.id] ?? String(s.qty)

                  return (
                    <tr key={s.id} style={{background:hasRes?'#F0F9FF':isStaged?'rgba(250,204,21,0.06)':'transparent'}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          {cable&&<div style={{width:8,height:8,borderRadius:2,background:cable.color,flexShrink:0}}/>}
                          <span className="mono">{s.code}</span>
                        </div>
                      </td>
                      <td style={{fontWeight:500,fontSize:12}}>{s.name}</td>
                      <td><span className="badge b-gray" style={{fontSize:10}}>{s.category}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <input
                            type="number" min="0"
                            value={stagedVal}
                            onChange={e=>setQty(s.id, e.target.value)}
                            style={{width:60,textAlign:'center',fontSize:13,padding:'4px 6px',fontWeight:600,
                              border:`1.5px solid ${isStaged?'var(--amber)':'var(--border)'}`,
                              borderRadius:4,background:isStaged?'rgba(250,204,21,0.08)':'var(--bg)'}}
                          />
                          {isStaged && (
                            <button
                              onClick={()=>commitQty(s)}
                              style={{background:'var(--green)',border:'none',color:'#fff',borderRadius:4,padding:'4px 9px',fontSize:11,cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>
                              <i className="ti ti-device-floppy" style={{fontSize:12}} aria-hidden/>Salvar
                            </button>
                          )}
                          {isStaged && (
                            <button onClick={()=>clearStage(s.id)}
                              style={{background:'none',border:'1px solid var(--border)',color:'var(--text3)',borderRadius:4,padding:'3px 6px',fontSize:11,cursor:'pointer'}}>
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{textAlign:'center'}}>
                        {hasRes
                          ? <span className="badge" style={{background:'#F0F9FF',color:'#0369A1',fontSize:10}}>{s.reserved} res.</span>
                          : <span style={{color:'var(--text3)',fontSize:11}}>—</span>}
                      </td>
                      <td style={{color:clr,fontWeight:600,textAlign:'center'}}>{avail}</td>
                      <td style={{color:'var(--text3)',textAlign:'center'}}>{s.min_qty}</td>
                      <td style={{color:'var(--text3)',fontWeight:400,fontSize:11,textAlign:'center'}}>
                        {s.cost_price?`R$ ${Number(s.cost_price).toLocaleString('pt-BR')}`:
                        <span style={{color:'var(--text3)',fontSize:10}}>—</span>}
                      </td>
                      <td style={{color:'var(--accent)',fontWeight:500,fontSize:12}}>
                        R$ {Number(s.unit_price||0).toLocaleString('pt-BR')}
                        {s.cost_price>0&&<div style={{fontSize:9,color:'var(--green)',fontWeight:600}}>{Math.round((s.unit_price-s.cost_price)/s.cost_price*100)}% margem</div>}
                      </td>
                      <td>
                        <div className="stk-bar">
                          <div className="stk-fill" style={{width:`${Math.min(100,Math.round(avail/Math.max(s.min_qty,1)*100))}%`,background:clr}}/>
                        </div>
                      </td>
                      <td>
                        {avail===0
                          ? <span className="badge b-red" style={{fontSize:10}}>Zerado</span>
                          : avail<=s.min_qty
                            ? <span className="badge b-amber" style={{fontSize:10}}>Crítico</span>
                            : <span className="badge b-green" style={{fontSize:10}}>OK</span>}
                      </td>
                      <td>
                        {s.buy_link
                          ? <a href={s.buy_link} target="_blank" rel="noreferrer">
                              <button className="btn" style={{fontSize:10,padding:'3px 7px',color:'var(--accent)'}}>
                                <i className="ti ti-external-link" aria-hidden/>Comprar
                              </button>
                            </a>
                          : <span style={{fontSize:10,color:'var(--text3)'}}>—</span>}
                      </td>
                      <td>
                        <div style={{display:'flex',gap:3}}>
                          <button className="btn" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>openEdit(s)}>
                            <i className="ti ti-edit" aria-hidden/>
                          </button>
                          <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>handleDelete(s)}>
                            <i className="ti ti-trash" aria-hidden/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length===0 && (
                  <tr><td colSpan={12} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum item encontrado</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab==='log' && (
          <div className="section">
            <div className="sec-hdr"><div className="sec-title"><i className="ti ti-history" aria-hidden/>Log de movimentações</div></div>
            <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead>
                <tr><th>Data/Hora</th><th>Ação</th><th>Produto</th><th>Antes → Depois</th><th>Autor</th><th>Nota</th><th>Reverter</th></tr>
              </thead>
              <tbody>
                {log.length===0 && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhuma movimentação registrada</td></tr>
                )}
                {log.map((l,i)=>{
                  const clr = l.action==='entrada'?'var(--green)':l.action==='saida'?'var(--red)':'var(--text3)'
                  const icon = l.action==='entrada'?'ti-arrow-down':l.action==='saida'?'ti-arrow-up':'ti-dots'
                  return (
                    <tr key={i}>
                      <td className="mono" style={{fontSize:10}}>
                        {new Date(l.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td>
                        <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:clr,fontWeight:500}}>
                          <i className={`ti ${icon}`} style={{fontSize:11}} aria-hidden/>{l.action}
                        </span>
                      </td>
                      <td style={{fontSize:12,fontWeight:500}}>{l.name}<div className="mono" style={{fontSize:10,color:'var(--text3)'}}>{l.code}</div></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                          <span style={{fontWeight:600,color:'var(--text2)'}}>{l.qty_before ?? '—'}</span>
                          <i className="ti ti-arrow-right" style={{fontSize:10,color:'var(--text3)'}} aria-hidden/>
                          <span style={{fontWeight:700,color:clr}}>{l.qty_after ?? '—'}</span>
                        </div>
                        <div style={{fontSize:10,color:clr,fontWeight:500}}>{l.qty !== undefined ? `${l.action==='saida'?'-':'+'}${l.qty}` : ''}</div>
                      </td>
                      <td style={{fontSize:11,color:'var(--accent)',fontWeight:500}}>{l.author||'—'}</td>
                      <td style={{fontSize:11,color:'var(--text3)'}}>{l.note||'—'}</td>
                      <td>
                        {l.snapshot && l.qty_before !== undefined && (
                          <button className="btn" style={{fontSize:10,padding:'3px 8px',color:'var(--amber)',borderColor:'var(--amber)'}}
                            onClick={()=>{
                              if(!window.confirm(`Reverter "${l.name}" para ${l.qty_before} unidades?`)) return
                              
                                try {
                                  const snap = JSON.parse(l.snapshot)
                                  saveStockItem({...snap, qty: l.qty_before})
                                  addStockLog({
                                    action:'reversao', code:l.code, name:l.name,
                                    qty:Math.abs(l.qty_after - l.qty_before),
                                    qty_before:l.qty_after, qty_after:l.qty_before,
                                    author:currentUser?.name||'Sistema',
                                    note:`Reversão: ${l.qty_after} → ${l.qty_before}`,
                                  })
                                  addAuditLog({ module:'estoque', action:'reversao', entity_name:`${l.code} — ${l.name}`, user_name:currentUser?.name||'Sistema', before:`Qtd: ${l.qty_after}`, after:`Qtd: ${l.qty_before}` })
                                  onRefresh()
                                } catch(e) { alert('Erro ao reverter: ' + e.message) }
                              }}>
                            <i className="ti ti-history" aria-hidden/>Reverter
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* PIN Modal */}


      {/* Edit/New Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing?'Editar item':'Novo item de estoque'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Código</div>
                <input value={form.code} onChange={e=>f('code',e.target.value)} placeholder="ex: QAGPM2" autoFocus/>
              </div>
              <div className="fg"><div className="flabel">Categoria</div>
                <select value={form.category} onChange={e=>f('category',e.target.value)}>
                  <option>CPD / Rack</option><option>Automação</option><option>Interruptor</option>
                  <option>Tomada</option><option>IR / Controle AV</option><option>Sensor de Presença</option>
                  <option>WiFi / Rede</option><option>Cabos / Cabeamento</option><option>Som Ambiente</option>
                  <option>Segurança / CFTV</option><option>Elétrica</option><option>Outro</option>
                </select>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Nome do produto</div>
                <input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Nome completo"/>
              </div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Quantidade atual</div>
                <input type="number" min="0" value={form.qty} onChange={e=>f('qty',e.target.value)}/>
              </div>
              <div className="fg"><div className="flabel">Quantidade mínima</div>
                <input type="number" min="0" value={form.min_qty} onChange={e=>f('min_qty',e.target.value)}/>
              </div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Preço de custo/compra (R$)</div>
                <input type="number" min="0" step="0.01" value={form.cost_price||0} onChange={e=>f('cost_price',e.target.value)} placeholder="0,00"/>
              </div>
              <div className="fg"><div className="flabel">Preço de venda (R$)</div>
                <input type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>f('unit_price',e.target.value)}/>
              </div>
              <div className="fg"><div className="flabel">Fornecedor</div>
                <select value={form.supplier_id||''} onChange={e=>f('supplier_id',Number(e.target.value))}>
                  <option value="">—</option>
                  {(suppliers||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Link de compra</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.buy_link||''} onChange={e=>f('buy_link',e.target.value)}
                    placeholder="https://..." style={{flex:1}}/>
                  {form.buy_link&&<a href={form.buy_link} target="_blank" rel="noreferrer">
                    <button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button>
                  </a>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave}>
                <i className="ti ti-device-floppy" aria-hidden/>Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      {showPIN && <PINModal
        onSuccess={()=>{ setShowPIN(false); if(pinAction){ pinAction(); setPinAction(null) } }}
        onCancel={()=>{ setShowPIN(false); setPinAction(null) }} />}
    </>
  )
}
