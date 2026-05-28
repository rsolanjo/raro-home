import { useState } from 'react'
import { saveTool, deleteTool } from '../db/database.js'

const BUILTIN_ICONS = ['ti-robot','ti-wifi','ti-world','ti-tool','ti-phone','ti-mail','ti-brand-whatsapp','ti-calendar','ti-file','ti-chart-bar']

export default function Tools({ tools, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({name:'',description:'',link:'',icon:'ti-tool'})
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  function openNew()   { setEditing(null); setForm({name:'',description:'',link:'',icon:'ti-tool'}); setShowModal(true) }
  function openEdit(t) { setEditing(t); setForm({...t}); setShowModal(true) }
  function handleSave(){ saveTool(form); setShowModal(false); onRefresh() }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-tools" aria-hidden/>Ferramentas & Links rápidos</div>
        <div className="topbar-acts"><button className="btn primary" onClick={openNew}><i className="ti ti-plus" aria-hidden/>Nova ferramenta</button></div>
      </div>
      <div className="content">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
          {tools.map(t=>(
            <div key={t.id} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 18px 14px',display:'flex',flexDirection:'column',gap:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div style={{width:40,height:40,borderRadius:10,background:'var(--accent-lt)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className={`ti ${t.icon||'ti-tool'}`} style={{fontSize:20,color:'var(--accent)'}} aria-hidden/>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button className="btn" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>openEdit(t)}><i className="ti ti-edit" aria-hidden/></button>
                  <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>{if(confirm('Excluir?')){deleteTool(t.id);onRefresh()}}}><i className="ti ti-trash" aria-hidden/></button>
                </div>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{t.name}</div>
                <div style={{fontSize:11.5,color:'var(--text3)',lineHeight:1.5}}>{t.description}</div>
              </div>
              <a href={t.link} target="_blank" rel="noreferrer" style={{marginTop:'auto'}}>
                <button className="btn primary" style={{width:'100%',justifyContent:'center',fontSize:12}}>
                  <i className="ti ti-external-link" aria-hidden/>Abrir
                </button>
              </a>
            </div>
          ))}
          {tools.length===0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px 0',color:'var(--text3)'}}>Nenhuma ferramenta cadastrada</div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editing?'Editar ferramenta':'Nova ferramenta'}</div><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Nome</div><input value={form.name} onChange={e=>f('name',e.target.value)} autoFocus placeholder="ex: Claude AI"/></div>
              <div className="fg"><div className="flabel">Ícone</div>
                <select value={form.icon} onChange={e=>f('icon',e.target.value)}>
                  {BUILTIN_ICONS.map(ic=><option key={ic} value={ic}>{ic.replace('ti-','')}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Descrição</div><input value={form.description||''} onChange={e=>f('description',e.target.value)} placeholder="Para que serve..."/></div>
            </div>
            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Link</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.link||''} onChange={e=>f('link',e.target.value)} placeholder="https://..." style={{flex:1}}/>
                  {form.link && <a href={form.link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button></a>}
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
    </>
  )
}
