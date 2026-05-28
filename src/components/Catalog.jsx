import { useState, useEffect } from 'react'
import { saveCatalogItem, deleteCatalogItem, getCatalogCategories, addCatalogCategory, deleteCatalogCategory, getProposals, checkPINSession, setPINSession, verifyPIN, addAuditLog } from '../db/supabase.js'
import PINModal from './PINModal.jsx'

const CABLE_COLORS = { 'PC-AZL':'#2563EB','PC-AMA':'#D97706','PC-BRN':'#9CA3AF','PC-VRM':'#DC2626' }

function CatalogTable({ items, onEdit, isAdmin, onDelete, onQuickPrice }) {
  if (!items.length) return <div style={{padding:'16px',textAlign:'center',color:'var(--text3)',fontSize:12}}>Nenhum produto encontrado</div>
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Código</th><th>Produto</th>
          {isAdmin && <><th>Custo</th><th>Venda <span style={{fontSize:8,color:'var(--text3)',fontWeight:400}}>✎ clique</span></th><th>Margem</th></>}
          {!isAdmin && <th>Preço</th>}
          <th>Pitch</th><th></th>
        </tr>
      </thead>
      <tbody>
        {items.map(c=>{
          const cable = CABLE_COLORS[c.code]
          const cp = c.cost_price||0
          const sp = c.sale_price||0
          const pct = cp>0 ? Math.round((sp-cp)/cp*100) : null
          return <tr key={c.id}>
            <td>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                {cable&&<div style={{width:8,height:8,borderRadius:2,background:cable,flexShrink:0}}/>}
                <span className="mono">{c.code}</span>
              </div>
            </td>
            <td style={{fontWeight:500}}>{c.name}<div style={{fontSize:10,color:'var(--text3)'}}>{c.category}</div></td>
            {isAdmin && <>
              <td style={{color:'var(--text2)',fontSize:12}}>R$ {cp.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              <td>
                <span
                  onClick={()=>{
                    const novo = prompt(`Novo preço de venda para "${c.name}":`, sp)
                    if(novo!==null && !isNaN(parseFloat(novo))) onQuickPrice(c.id, cp, parseFloat(novo))
                  }}
                  style={{cursor:'pointer',color:'var(--accent)',fontWeight:500,padding:'2px 6px',borderRadius:3,border:'1px dashed transparent',fontSize:12}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}
                  title="Clique para editar preço de venda">
                  R$ {sp.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </span>
              </td>
              <td>
                {pct!==null && <div style={{display:'flex',alignItems:'center',gap:3}}>
                  <button
                    onClick={()=>{ const np=Math.max(0,(pct||0)-5); onQuickPrice(c.id,cp,parseFloat((cp*(1+np/100)).toFixed(2))) }}
                    title="−5% margem"
                    style={{background:'var(--red)',color:'#fff',border:'none',borderRadius:3,width:20,height:20,fontSize:13,cursor:'pointer',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontSize:11,fontWeight:700,minWidth:38,textAlign:'center',color:pct>=50?'var(--green)':pct>=20?'var(--amber)':'var(--red)'}}>{pct}%</span>
                  <button
                    onClick={()=>{ const np=(pct||0)+5; onQuickPrice(c.id,cp,parseFloat((cp*(1+np/100)).toFixed(2))) }}
                    title="+5% margem"
                    style={{background:'var(--green)',color:'#fff',border:'none',borderRadius:3,width:20,height:20,fontSize:13,cursor:'pointer',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                </div>}
              </td>
            </>}
            {!isAdmin && <td style={{color:'var(--accent)',fontWeight:500}}>R$ {sp.toLocaleString('pt-BR')}</td>}
            <td style={{fontSize:11,fontStyle:'italic',color:'var(--text3)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.pitch||'—'}</td>
            <td>
              <div style={{display:'flex',gap:3}}>
                <button className="btn" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>onEdit(c)}><i className="ti ti-edit" aria-hidden/></button>
                <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>{if(confirm('Excluir produto?'))onDelete(c.id)}}><i className="ti ti-trash" aria-hidden/></button>
              </div>
            </td>
          </tr>
        })}
      </tbody>
    </table>
  )
}

export default function Catalog({ catalog, suppliers, onRefresh, isAdmin, currentUser }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showComparative, setShowComparative] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [form, setForm] = useState({code:'',name:'',category:'Interruptor',cost_price:0,sale_price:0,pitch:'',buy_link:'',supplier_id:''})
  const [categories, setCategories] = useState([])
  const [proposals, setProposals] = useState([])
  const [showPIN, setShowPIN]   = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  function requirePIN(action) {
    if (checkPINSession()) { Promise.resolve(action()).catch(console.error); return }
    setPinAction(()=>()=>Promise.resolve(action()).catch(console.error))
    setShowPIN(true)
  }

  useEffect(() => {
    getCatalogCategories().then(c => setCategories(c || []))
    getProposals().then(ps => setProposals((ps || []).filter(p=>p.status==='approved'||p.status==='sent')))
  }, [catalog])

  const filtered = catalog.filter(c=>
    (catFilter==='all'||c.category===catFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  )

  const roomAvgs = {}
  proposals.forEach(p=>{
    ;(p.floors||[]).forEach(fl=>{
      ;(fl.rooms||[]).forEach(r=>{
        if(!r.name||!r.price) return
        const key=r.name.toLowerCase().trim()
        if(!roomAvgs[key]) roomAvgs[key]={total:0,count:0,name:r.name}
        roomAvgs[key].total+=r.price; roomAvgs[key].count+=1
      })
    })
  })
  const avgs=Object.values(roomAvgs).map(r=>({...r,avg:Math.round(r.total/r.count)})).sort((a,b)=>b.avg-a.avg)

  function openNew(){
    setEditing(null)
    setForm({code:'',name:'',category:'Interruptor',cost_price:0,sale_price:0,pitch:'',buy_link:'',supplier_id:''})
    setShowModal(true)
  }
  function openEdit(c){ setEditing(c); setForm({...c}); setShowModal(true) }
  function handleSave(){
    const sp = form.sale_price>0 ? Number(form.sale_price) : Number(form.cost_price)*2
    saveCatalogItem({...form, cost_price:Number(form.cost_price), sale_price:sp})
    setShowModal(false); onRefresh()
  }
  function handleAddCat(){
    if(newCat.trim()) { addCatalogCategory(newCat.trim()); setNewCat(''); onRefresh() }
  }

  // Group by category for display
  const byCategory = {}
  filtered.forEach(c=>{
    if(!byCategory[c.category]) byCategory[c.category]=[]
    byCategory[c.category].push(c)
  })

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-list-details" aria-hidden/>Catálogo de Produtos</div>
        <div className="topbar-acts">
          <button className="btn" onClick={()=>setShowCatModal(true)}><i className="ti ti-tag" aria-hidden/>Categorias</button>
          <button className="btn" onClick={()=>setShowComparative(true)}><i className="ti ti-chart-bar" aria-hidden/>Comparativo</button>
          <button className="btn primary" onClick={openNew}><i className="ti ti-plus" aria-hidden/>Novo produto</button>
        </div>
      </div>
      <div className="content">
        {/* Cable legend */}
        <div className="section" style={{marginBottom:12}}>
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-palette" aria-hidden/>Patchcord CAT6 — Mapa de cores</div></div>
          <div style={{padding:'8px 16px',display:'flex',gap:10,flexWrap:'wrap'}}>
            {[['PC-AZL','#2563EB','Dados'],['PC-AMA','#D97706','AP / Access Point'],['PC-BRN','#9CA3AF','Câmera'],['PC-VRM','#DC2626','Uplink']].map(([c,color,l])=>(
              <div key={c} style={{display:'flex',alignItems:'center',gap:6,background:'var(--surf)',borderRadius:5,padding:'5px 10px',border:'1px solid var(--border)'}}>
                <div style={{width:12,height:12,borderRadius:2,background:color,boxShadow:'0 1px 2px rgba(0,0,0,.15)'}}/>
                <span style={{fontSize:11,fontWeight:500}}>{l}</span>
                <span className="mono" style={{fontSize:10}}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto..." style={{flex:1,minWidth:200,padding:'6px 10px',fontSize:12}}/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:'6px 10px',fontSize:12,border:'1px solid var(--border)',borderRadius:6}}>
            <option value="all">Todas as categorias</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Grouped by category */}
        {catFilter==='all'
          ? Object.entries(byCategory).map(([cat,items])=>(
              <div key={cat} className="section" style={{marginBottom:12}}>
                <div className="sec-hdr">
                  <div className="sec-title"><i className="ti ti-tag" aria-hidden/>{cat}</div>
                  <span style={{fontSize:11,color:'var(--text3)'}}>{items.length} produto(s)</span>
                </div>
                <CatalogTable items={items} onEdit={openEdit} isAdmin={isAdmin} suppliers={suppliers} onDelete={id=>{deleteCatalogItem(id);onRefresh()}} onQuickPrice={(id,cp,sp)=>requirePIN(async ()=>{const item=catalog.find(c=>c.id===id);if(item){const before={...item};await saveCatalogItem({...item,cost_price:cp,sale_price:sp});await addAuditLog({module:'catalogo',action:'price_update',entity_id:id,entity_name:item.name,user_name:currentUser?.name||'Admin',before:`custo:${before.cost_price},venda:${before.sale_price}`,after:`custo:${cp},venda:${sp}`});onRefresh()}})} />
              </div>
            ))
          : <div className="section">
              <CatalogTable items={filtered} onEdit={openEdit} isAdmin={isAdmin} suppliers={suppliers} onDelete={id=>{deleteCatalogItem(id);onRefresh()}} onQuickPrice={(id,cp,sp)=>requirePIN(async ()=>{const item=catalog.find(c=>c.id===id);if(item){const before={...item};await saveCatalogItem({...item,cost_price:cp,sale_price:sp});await addAuditLog({module:'catalogo',action:'price_update',entity_id:id,entity_name:item.name,user_name:currentUser?.name||'Admin',before:`custo:${before.cost_price},venda:${before.sale_price}`,after:`custo:${cp},venda:${sp}`});onRefresh()}})} />
            </div>
        }
        {filtered.length===0 && <div style={{textAlign:'center',padding:'32px 0',color:'var(--text3)'}}>Nenhum produto encontrado</div>}
      </div>

      {/* Edit/New modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{width:540}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing?'Editar produto':'Novo produto'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Código</div><input value={form.code} onChange={e=>f('code',e.target.value)} placeholder="ex: QAGPM2" autoFocus/></div>
              <div className="fg"><div className="flabel">Categoria</div>
                <select value={form.category} onChange={e=>f('category',e.target.value)}>
                  {categories.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Nome do produto</div><input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Nome completo"/></div>
            </div>
            {isAdmin && (
              <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'10px 12px',marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:600,color:'var(--amber)',letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>
                  <i className="ti ti-lock" style={{marginRight:4}} aria-hidden/>Preços — visível apenas para admins
                </div>
                <div className="form-row">
                  <div className="fg">
                    <div className="flabel">Preço de custo (R$)</div>
                    <input type="number" min="0" step="0.01" value={form.cost_price}
                      onChange={e=>{ f('cost_price',e.target.value); if(!form.sale_price||form.sale_price===form.cost_price*2) f('sale_price',Number(e.target.value)*2) }}/>
                  </div>
                  <div className="fg">
                    <div className="flabel">Preço de venda (R$) <span style={{fontSize:9,color:'var(--text3)'}}>default: custo × 2</span></div>
                    <input type="number" min="0" step="0.01" value={form.sale_price} onChange={e=>f('sale_price',e.target.value)}/>
                  </div>
                </div>
                {form.cost_price>0 && (
                  <div style={{fontSize:11,color:'var(--amber)',marginTop:4}}>
                    Margem: {Math.round(((form.sale_price-form.cost_price)/form.cost_price)*100)}% 
                    &nbsp;·&nbsp; Lucro por unidade: R$ {(form.sale_price-form.cost_price).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                  </div>
                )}
              </div>
            )}
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Pitch de venda</div><input value={form.pitch||''} onChange={e=>f('pitch',e.target.value)} placeholder="Frase de venda..."/></div>
            </div>
            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Link de compra</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.buy_link||''} onChange={e=>f('buy_link',e.target.value)} placeholder="https://..." style={{flex:1}}/>
                  {form.buy_link&&<a href={form.buy_link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button></a>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Categories modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal" style={{width:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Gerenciar Categorias</div>
              <button className="modal-close" onClick={()=>setShowCatModal(false)}>×</button>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nova categoria..." style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&handleAddCat()}/>
              <button className="btn primary" onClick={handleAddCat}><i className="ti ti-plus" aria-hidden/>Adicionar</button>
            </div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              {categories.map(c=>(
                <div key={c} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderBottom:'0.5px solid var(--border)',fontSize:12}}>
                  <span><i className="ti ti-tag" style={{marginRight:6,color:'var(--text3)',fontSize:12}} aria-hidden/>{c}</span>
                  <button className="btn danger" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>{deleteCatalogCategory(c);onRefresh()}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
              <button className="btn" onClick={()=>setShowCatModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Comparative modal */}
      {showComparative && (
        <div className="modal-overlay">
          <div className="modal" style={{width:540,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-chart-bar" style={{marginRight:6}} aria-hidden/>Comparativo — Média por cômodo</div>
              <button className="modal-close" onClick={()=>setShowComparative(false)}>×</button>
            </div>
            {avgs.length===0
              ? <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)'}}>Nenhum orçamento enviado ainda</div>
              : <table className="tbl">
                  <thead><tr><th>Cômodo</th><th>Média</th><th>Menor</th><th>Maior</th><th>Qtd.</th></tr></thead>
                  <tbody>
                    {avgs.map(r=>{
                      const vals=proposals.flatMap(p=>(p.floors||[]).flatMap(f=>(f.rooms||[]).filter(rm=>rm.name?.toLowerCase()===r.name.toLowerCase()).map(rm=>rm.price||0))).filter(v=>v>0)
                      return <tr key={r.name}>
                        <td style={{fontWeight:500}}>{r.name}</td>
                        <td style={{color:'var(--accent)',fontWeight:600}}>R$ {r.avg.toLocaleString('pt-BR')}</td>
                        <td style={{color:'var(--green)',fontSize:12}}>R$ {(Math.min(...vals)||0).toLocaleString('pt-BR')}</td>
                        <td style={{color:'var(--amber)',fontSize:12}}>R$ {(Math.max(...vals)||0).toLocaleString('pt-BR')}</td>
                        <td style={{color:'var(--text3)',fontSize:12}}>{r.count}</td>
                      </tr>
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}
      {showPIN&&<PINModal
        onSuccess={()=>{setShowPIN(false);if(pinAction){pinAction();setPinAction(null)}}}
        onCancel={()=>{setShowPIN(false);setPinAction(null)}}/>}
    </>
  )
}
