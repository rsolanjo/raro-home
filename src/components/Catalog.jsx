import { useState, useEffect } from 'react'
import { saveCatalogItem, deleteCatalogItem, getCatalogCategories, addCatalogCategory, deleteCatalogCategory, getCatalogSubcategories, saveCatalogSubcategory, deleteCatalogSubcategory, getProposals, checkPINSession, setPINSession, verifyPIN, addAuditLog } from '../db/supabase.js'
import { TAXONOMY, ALL_CATEGORIES, inferCategory } from '../taxonomy.js'
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
            <td style={{fontWeight:500}}>{c.name}<div style={{fontSize:10,color:'var(--text3)'}}>{c.category}{c.subcategory&&<span style={{color:'var(--accent)',marginLeft:4}}>/ {c.subcategory}</span>}</div></td>
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

  async function exportCatalog() {
    const rows = [['Código','Nome','Categoria','Custo (R$)','Venda (R$)','Margem%','Pitch','Link']]
    catalog.forEach(c => {
      const mg = c.cost_price>0?Math.round((c.sale_price-c.cost_price)/c.cost_price*100):0
      rows.push([c.code,c.name,c.category||'',c.cost_price||0,c.sale_price||0,`${mg}%`,c.pitch||'',c.buy_link||''])
    })
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`catalogo-raro-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(()=>URL.revokeObjectURL(url),2000)
  }
  const [editing, setEditing] = useState(null)
  const [showCatModal, setShowCatModal] = useState(false)
  const [catModalTab, setCatModalTab] = useState('cat') // 'cat' | 'sub'
  const [newCat, setNewCat] = useState('')
  const [newSubCat, setNewSubCat] = useState('')
  const [newSubForCat, setNewSubForCat] = useState('')
  const [showInlineNewSub, setShowInlineNewSub] = useState(false)
  const [inlineNewSubVal, setInlineNewSubVal] = useState('')
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

  const [subcategories, setSubcategories] = useState(TAXONOMY) // {cat:[subs]}

  useEffect(() => {
    getCatalogCategories().then(c => setCategories(c || []))
    getCatalogSubcategories().then(s => { if(Object.keys(s).length) setSubcategories(s) })
    getProposals().then(ps => setProposals((ps || []).filter(p=>p.status==='approved'||p.status==='sent')))
  }, [catalog])

  const filtered = catalog.filter(c=>
    (catFilter==='all'||c.category===catFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  )


  function openNew(){
    requirePIN(()=>{
      setEditing(null)
      setForm({code:'',name:'',category:'Automação',subcategory:'Keypad / Interruptor',cost_price:0,sale_price:0,pitch:'',buy_link:'',supplier_id:''})
      setShowModal(true)
    })
  }
  function openEdit(c){ requirePIN(()=>{ setEditing(c); setForm({...c}); setShowModal(true) }) }
  async function handleSave(){
    try {
      const sp = form.sale_price>0 ? Number(form.sale_price) : Number(form.cost_price)*2
      const item = {
        ...form,
        cost_price: Number(form.cost_price)||0,
        sale_price: sp||0,
        supplier_id: form.supplier_id && form.supplier_id !== '' ? Number(form.supplier_id) : null,
      }
      const before = editing ? catalog.find(c=>c.id===editing.id) : null
      const saved = await saveCatalogItem(item)
      await addAuditLog({
        module:'catalogo', action:editing?'update':'create',
        entity_id:saved?.id, entity_name:saved?.name||item.name,
        user_name:currentUser?.name||'Admin',
        before:before?`custo:${before.cost_price},venda:${before.sale_price}`:null,
        after:`custo:${item.cost_price},venda:${sp}`
      })
      setShowModal(false); onRefresh()
    } catch(err){ console.error(err); alert('Erro ao salvar: ' + err.message) }
  }
  function handleAddCat(){
    if(newCat.trim()) { addCatalogCategory(newCat.trim()); setNewCat(''); onRefresh() }
  }
  async function handleAddSubCat(cat, name){
    if(!cat||!name.trim()) return
    try {
      await saveCatalogSubcategory(cat, name.trim())
      setSubcategories(prev=>({...prev,[cat]:[...(prev[cat]||[]),name.trim()]}))
      setNewSubCat(''); setNewSubForCat('')
    } catch(e){ alert('Erro ao salvar subcategoria: '+e.message) }
  }
  async function handleDeleteSubCat(cat, name){
    try {
      await deleteCatalogSubcategory(cat, name)
      setSubcategories(prev=>({...prev,[cat]:(prev[cat]||[]).filter(s=>s!==name)}))
    } catch(e){ alert('Erro ao excluir: '+e.message) }
  }
  function genCode(){
    const prefix=(form.category||'X').slice(0,2).toUpperCase()
    const rand=Math.random().toString(36).slice(2,6).toUpperCase()
    f('code',prefix+'-'+rand)
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
              <div className="fg"><div className="flabel">Código</div>
              <div style={{display:'flex',gap:4}}>
                <input value={form.code} onChange={e=>f('code',e.target.value)} placeholder="ex: AT-K4X2" autoFocus style={{flex:1}}/>
                <button className="btn" type="button" title="Gerar código automático" style={{flexShrink:0,fontSize:11,padding:'4px 9px'}} onClick={genCode}><i className="ti ti-refresh" aria-hidden/>Auto</button>
              </div>
            </div>
              <div className="fg"><div className="flabel">Categoria</div>
                <select value={form.category} onChange={e=>{
                  const cat=e.target.value; f('category',cat)
                  const subs=subcategories[cat]||TAXONOMY[cat]||[]
                  if(subs.length) f('subcategory',subs[0])
                }}>
                  {ALL_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  {categories.filter(c=>!ALL_CATEGORIES.includes(c)).map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg"><div className="flabel" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>Subcategoria</span>
                  <button type="button" className="btn" style={{fontSize:10,padding:'1px 7px',height:20}} onClick={()=>{setShowInlineNewSub(v=>!v);setInlineNewSubVal('')}}>
                    <i className="ti ti-plus" aria-hidden/> Nova
                  </button>
                </div>
                {showInlineNewSub && (
                  <div style={{display:'flex',gap:4,marginBottom:5}}>
                    <input value={inlineNewSubVal} onChange={e=>setInlineNewSubVal(e.target.value)}
                      placeholder={`Nova subcategoria em ${form.category}...`}
                      style={{flex:1,fontSize:12,padding:'4px 8px'}}
                      onKeyDown={async e=>{if(e.key==='Enter'&&inlineNewSubVal.trim()){await handleAddSubCat(form.category,inlineNewSubVal);f('subcategory',inlineNewSubVal.trim());setShowInlineNewSub(false)}}}
                      autoFocus/>
                    <button className="btn primary" type="button" style={{fontSize:11,padding:'3px 8px'}} onClick={async()=>{if(inlineNewSubVal.trim()){await handleAddSubCat(form.category,inlineNewSubVal);f('subcategory',inlineNewSubVal.trim());setShowInlineNewSub(false)}}}>OK</button>
                  </div>
                )}
                <select value={form.subcategory||''} onChange={e=>f('subcategory',e.target.value)}>
                  <option value="">— nenhuma —</option>
                  {(subcategories[form.category]||TAXONOMY[form.category]||[]).map(s=><option key={s} value={s}>{s}</option>)}
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
              <button className="btn primary" onClick={()=>requirePIN(handleSave)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Categories + Subcategories modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal" style={{width:500}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="ti ti-tags" aria-hidden/> Categorias &amp; Subcategorias</div>
              <button className="modal-close" onClick={()=>setShowCatModal(false)}>×</button>
            </div>
            {/* Tabs */}
            <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',marginBottom:14}}>
              {[['cat','Categorias','ti-tag'],['sub','Subcategorias','ti-tags']].map(([id,label,icon])=>(
                <button key={id} onClick={()=>setCatModalTab(id)}
                  style={{flex:1,padding:'9px 0',fontSize:12,fontWeight:catModalTab===id?700:400,
                    border:'none',background:'none',cursor:'pointer',
                    color:catModalTab===id?'var(--accent)':'var(--text2)',
                    borderBottom:catModalTab===id?'2px solid var(--accent)':'2px solid transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                  <i className={`ti ${icon}`} aria-hidden/>{label}
                </button>
              ))}
            </div>

            {/* Aba Categorias */}
            {catModalTab==='cat' && <>
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nova categoria principal..." style={{flex:1}}
                  onKeyDown={e=>e.key==='Enter'&&handleAddCat()}/>
                <button className="btn primary" onClick={handleAddCat}><i className="ti ti-plus" aria-hidden/>Adicionar</button>
              </div>
              <div style={{maxHeight:300,overflowY:'auto'}}>
                {categories.map(c=>(
                  <div key={c} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderBottom:'0.5px solid var(--border)',fontSize:12}}>
                    <span style={{display:'flex',alignItems:'center',gap:7}}>
                      <i className="ti ti-tag" style={{color:'var(--text3)',fontSize:12}} aria-hidden/>{c}
                      <span style={{fontSize:10,color:'var(--text3)'}}>({(subcategories[c]||[]).length} sub)</span>
                    </span>
                    <button className="btn danger" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>{deleteCatalogCategory(c);onRefresh()}}>✕</button>
                  </div>
                ))}
              </div>
            </>}

            {/* Aba Subcategorias */}
            {catModalTab==='sub' && <>
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                <select value={newSubForCat} onChange={e=>setNewSubForCat(e.target.value)}
                  style={{flex:'0 0 180px',padding:'6px 8px',fontSize:12,border:'1px solid var(--border)',borderRadius:6}}>
                  <option value="">Escolha a categoria...</option>
                  {categories.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <input value={newSubCat} onChange={e=>setNewSubCat(e.target.value)} placeholder="Nome da subcategoria..." style={{flex:1,minWidth:140}}
                  onKeyDown={e=>{ if(e.key==='Enter'&&newSubForCat&&newSubCat.trim()){ handleAddSubCat(newSubForCat,newSubCat); setNewSubCat('') } }}/>
                <button className="btn primary" onClick={()=>{if(newSubForCat&&newSubCat.trim()){handleAddSubCat(newSubForCat,newSubCat);setNewSubCat('')}}}>
                  <i className="ti ti-plus" aria-hidden/>Adicionar
                </button>
              </div>
              <div style={{maxHeight:340,overflowY:'auto'}}>
                {categories.map(cat=>{
                  const subs=[...new Set([...(TAXONOMY[cat]||[]),...(subcategories[cat]||[])])]
                  if(!subs.length) return null
                  return (
                    <div key={cat} style={{marginBottom:12}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--accent)',padding:'4px 10px',background:'var(--surf)',borderRadius:4,marginBottom:4}}>
                        <i className="ti ti-tag" aria-hidden/> {cat}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,padding:'0 4px'}}>
                        {subs.map(sub=>(
                          <span key={sub} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,background:'var(--surf2,var(--surf))',
                            border:'1px solid var(--border)',borderRadius:12,padding:'3px 10px'}}>
                            {sub}
                            {!(TAXONOMY[cat]||[]).includes(sub)&&(
                              <button onClick={()=>handleDeleteSubCat(cat,sub)}
                                style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:12,lineHeight:1,padding:0}}
                                title="Remover">×</button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>}

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}>
              <button className="btn" onClick={()=>setShowCatModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Comparative modal */}
      
      {showPIN&&<PINModal
        onSuccess={()=>{setShowPIN(false);const a=pinAction;setPinAction(null);if(a){Promise.resolve(a()).catch(e=>{console.error(e);alert('Erro: '+e.message)})}}}
        onCancel={()=>{setShowPIN(false);setPinAction(null)}}/>}
    </>
  )
}
