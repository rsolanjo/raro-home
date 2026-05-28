import { useState } from 'react'
import { saveSupplier, deleteSupplier } from '../db/database.js'

export default function Suppliers({ suppliers, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({name:'',contact:'',site:'',ml_link:'',avg_delivery_days:5,categories:'',notes:''})
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  function openNew()   { setEditing(null); setForm({name:'',contact:'',site:'',ml_link:'',avg_delivery_days:5,categories:'',notes:''}); setShowModal(true) }
  function openEdit(s) { setEditing(s); setForm({...s}); setShowModal(true) }
  function handleSave(){ saveSupplier(form); setShowModal(false); onRefresh() }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-truck" aria-hidden/>Fornecedores</div>
        <div className="topbar-acts"><button className="btn primary" onClick={openNew}><i className="ti ti-plus" aria-hidden/>Novo fornecedor</button></div>
      </div>
      <div className="content">
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">{suppliers.length} fornecedores cadastrados</div></div>
          <table className="tbl">
            <thead><tr><th>Fornecedor</th><th>Contato</th><th>Categorias</th><th>Prazo médio</th><th>Links</th><th></th></tr></thead>
            <tbody>
              {suppliers.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum fornecedor</td></tr>}
              {suppliers.map(s=>(
                <tr key={s.id}>
                  <td style={{fontWeight:500}}>{s.name}</td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{s.contact}</td>
                  <td><span className="badge b-gray" style={{fontSize:10}}>{s.categories||'—'}</span></td>
                  <td style={{fontSize:12}}>{s.avg_delivery_days ? `${s.avg_delivery_days} dias` : '—'}</td>
                  <td>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {s.site && <a href={s.site} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 7px'}}><i className="ti ti-world" aria-hidden/>Site</button></a>}
                      {s.ml_link && <a href={s.ml_link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:10,padding:'3px 7px',color:'#F59E0B',borderColor:'#F59E0B'}}><i className="ti ti-external-link" aria-hidden/>Mercado Livre</button></a>}
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:3}}>
                      <button className="btn" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>openEdit(s)}><i className="ti ti-edit" aria-hidden/></button>
                      <button className="btn danger" style={{fontSize:11,padding:'3px 7px'}} onClick={()=>{if(confirm('Excluir?')){deleteSupplier(s.id);onRefresh()}}}><i className="ti ti-trash" aria-hidden/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editing?'Editar fornecedor':'Novo fornecedor'}</div><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Nome</div><input value={form.name} onChange={e=>f('name',e.target.value)} autoFocus/></div>
            </div>
            <div className="form-row">
              <div className="fg"><div className="flabel">Contato (telefone / email)</div><input value={form.contact} onChange={e=>f('contact',e.target.value)}/></div>
              <div className="fg"><div className="flabel">Prazo médio (dias)</div><input type="number" min="1" value={form.avg_delivery_days} onChange={e=>f('avg_delivery_days',Number(e.target.value))}/></div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Categorias fornecidas</div><input value={form.categories||''} onChange={e=>f('categories',e.target.value)} placeholder="ex: Automação, CFTV, Rede"/></div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Site</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.site||''} onChange={e=>f('site',e.target.value)} placeholder="https://..." style={{flex:1}}/>
                  {form.site && <a href={form.site} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button></a>}
                </div>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Link Mercado Livre</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.ml_link||''} onChange={e=>f('ml_link',e.target.value)} placeholder="https://www.mercadolivre.com.br/loja/..." style={{flex:1}}/>
                  {form.ml_link && <a href={form.ml_link} target="_blank" rel="noreferrer"><button className="btn" style={{fontSize:11,color:'#F59E0B',borderColor:'#F59E0B'}}><i className="ti ti-external-link" aria-hidden/>Ver loja</button></a>}
                </div>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Notas</div><textarea value={form.notes||''} onChange={e=>f('notes',e.target.value)} rows={2} placeholder="Observações..."/></div>
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
